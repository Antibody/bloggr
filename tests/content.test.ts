import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeContent, slugify } from "../lib/content";
import { parseDraft, parseSettings, postSlug } from "../lib/validation";
test("rich text removes executable HTML and unsafe URL protocols", () => {
  const html = sanitizeContent(
    '<p onclick="evil()">Hello<script>evil()</script><a href="javascript:evil()">link</a><img src="data:image/svg+xml,test" onerror="evil()"><svg onload="evil()"></svg><iframe src="https://example.com"></iframe></p>',
  );
  assert(!/script|onclick|onerror|javascript:|data:|svg|iframe/i.test(html));
  assert(html.includes("Hello"));
  assert(
    sanitizeContent('<a href="https://example.com">ok</a>').includes(
      "https://example.com",
    ),
  );
});
test("draft saves allow empty writing but publishing validates real content", () => {
  const value = {
    title: "",
    htmlContent: "<p></p>",
    date: "2026-10-29T10:00:00Z",
  };
  assert.equal(parseDraft(value).title, "");
  assert.throws(() => parseDraft(value, true));
  assert.throws(() =>
    parseDraft(
      { ...value, title: "Test", htmlContent: "<script>text</script>" },
      true,
    ),
  );
  assert.throws(() => parseDraft({ ...value, date: "invalid" }));
  assert.throws(() =>
    parseDraft({ ...value, coverImage: "javascript:alert(1)" }),
  );
});
test("Unicode permalinks and settings are bounded", () => {
  assert.equal(slugify("Hyvää päivää, Helsinki!"), "hyvää-päivää-helsinki");
  assert.throws(() =>
    parseSettings({ title: "Blog", accent: "red", home_mode: "publication" }),
  );
  assert.throws(() =>
    parseSettings({
      title: "Blog",
      accent: "#245d48",
      home_mode: "publication",
      timezone: "invalid",
    }),
  );
});

test("article preparation builds unique safe anchors and preserves captions", async () => {
  const { prepareArticle } = await import("../lib/content");
  const result = prepareArticle(
    '<h2 id="bad" onclick="evil()">First &amp; second</h2><h3>First &amp; second</h3><figure><img src="https://example.com/image.webp" alt="View"><figcaption>Photo <em>credit</em><script>evil()</script></figcaption></figure>',
  );
  assert.deepEqual(result.toc, [
    { id: "section-1", text: "First & second", level: 2 },
    { id: "section-2", text: "First & second", level: 3 },
  ]);
  assert(result.html.includes('id="section-1"'));
  assert(result.html.includes("<figcaption>Photo"));
  assert(!result.html.includes("evil"));
});
test("publication customization validates navigation and typography", () => {
  const base = { title: "Blog", accent: "#245d48", home_mode: "publication" };
  assert.equal(
    parseSettings({
      ...base,
      typography: "modern",
      navigation: [{ label: "Stories", href: "/blog" }],
    }).typography,
    "modern",
  );
  assert.throws(() =>
    parseSettings({
      ...base,
      navigation: [{ label: "Bad", href: "//attacker.example" }],
    }),
  );
  assert.throws(() =>
    parseSettings({
      ...base,
      navigation: [{ label: "Bad", href: "javascript:alert(1)" }],
    }),
  );
  assert.throws(() =>
    parseSettings({
      ...base,
      navigation: [{ label: "Bad", href: "/\\attacker.example" }],
    }),
  );
  assert.throws(() =>
    parseSettings({ ...base, typography: "external-script" }),
  );
});

test("reserved application routes cannot be used as post permalinks", () => {
  for (const slug of [
    "admin",
    "login",
    "preview",
    "author",
    "api",
    "reset-password",
  ])
    assert.throws(() => postSlug(slug));
  assert.equal(postSlug("Hyvää päivää"), "hyvää-päivää");
});
test("local example HTTP image support is restricted to loopback", () => {
  const before = process.env.BLOGGR_LOCAL_EXAMPLE;
  process.env.BLOGGR_LOCAL_EXAMPLE = "1";
  try {
    assert(
      sanitizeContent('<img src="http://127.0.0.1:54321/image.webp">').includes(
        "src=",
      ),
    );
    assert(
      !sanitizeContent(
        '<img src="http://outside.example/image.webp">',
      ).includes("src="),
    );
  } finally {
    if (before === undefined) delete process.env.BLOGGR_LOCAL_EXAMPLE;
    else process.env.BLOGGR_LOCAL_EXAMPLE = before;
  }
});

test("mixed-case HTTP image URLs cannot bypass the local-host restriction", () => {
  const old = process.env.BLOGGR_LOCAL_EXAMPLE;
  process.env.BLOGGR_LOCAL_EXAMPLE = "1";
  try {
    assert(
      !sanitizeContent(
        '<img src="HTTP://outside.example/image.webp">',
      ).includes("src="),
    );
  } finally {
    if (old === undefined) delete process.env.BLOGGR_LOCAL_EXAMPLE;
    else process.env.BLOGGR_LOCAL_EXAMPLE = old;
  }
});
