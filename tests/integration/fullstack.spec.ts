import { test, expect, type Page } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { decodeHTML } from "entities";
const accounts = JSON.parse(
  readFileSync(".bloggr-example.json", "utf8"),
) as Record<string, { id: string; email: string; password: string }>;
const origin = "http://127.0.0.1:3000";

const draft = (title: string) => ({
  title,
  htmlContent:
    "<p>A unique discoverywordpineapple inside the body.</p><h2>Begin</h2><p>Some text.</p><h2>Continue</h2><p>Some text.</p><h2>Finish</h2><p>Some text.</p>",
  date: "2020-01-01T12:00:00Z",
  seoDescription: "",
  seoKeywords: "",
  excerpt: "",
  coverImage: "",
  coverAlt: "",
  coverCaption: "",
  tags: ["Integration"],
  authorName: "Test writer",
});
async function signIn(page: Page, role: string) {
  await page.goto("/blog/login");
  await page.getByLabel("Email", { exact: true }).fill(accounts[role].email);
  await page
    .getByLabel("Password", { exact: true })
    .fill(accounts[role].password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/blog\/admin/);
  await expect(
    page.getByRole("heading", { name: "Posts", exact: true }),
  ).toBeVisible();
}
async function mutate(page: Page, path: string, data: unknown, method = "PUT") {
  return page.request.fetch(path, { method, headers: { origin }, data });
}
async function create(page: Page, title: string) {
  const response = await mutate(
    page,
    "/api/admin/posts",
    { id: randomUUID(), draft: draft(title) },
    "POST",
  );
  expect(
    response.status(),
    response.status() === 201 ? "" : await response.text(),
  ).toBe(201);
  return (await response.json()).post;
}

test("real owner session creates, previews, publishes, searches, renames, and unpublishes", async ({
  page,
  request,
}) => {
  await signIn(page, "owner");
  let post = await create(page, "Integration " + Date.now());
  const path = "/api/admin/posts/" + post.slug;
  expect((await request.get("/blog/" + post.slug)).status()).toBe(404);
  const preview = await page.request.get("/blog/preview/" + post.slug, {
    maxRedirects: 0,
  });
  expect(preview.status()).toBe(200);
  expect(preview.headers()["cache-control"]).toContain("no-store");
  expect(
    (
      await request.get("/blog/preview/" + post.slug, { maxRedirects: 0 })
    ).status(),
  ).not.toBe(200);
  let response = await mutate(page, path, {
    action: "publish",
    version: post.version,
    draft: post.draft,
  });
  expect(response.status()).toBe(200);
  post = (await response.json()).post;
  await page.goto("/blog/" + post.slug);
  await expect(
    page.getByRole("heading", { name: post.title, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "On this page" }),
  ).toBeVisible();
  const search = await request.get("/blog?q=discoverywordpineapple");
  expect(await search.text()).toContain(post.title);
  const privateDraft = { ...post.draft, title: "Private edit " + Date.now() };
  response = await mutate(page, path, {
    action: "save",
    version: post.version,
    draft: privateDraft,
  });
  expect(response.status()).toBe(200);
  post = (await response.json()).post;
  expect(await (await request.get("/blog/" + post.slug)).text()).not.toContain(
    privateDraft.title,
  );
  response = await mutate(page, path, {
    action: "save",
    version: post.version - 1,
    draft: privateDraft,
  });
  expect(response.status()).toBe(409);
  const renamed = "renamed-" + Date.now();
  response = await mutate(page, path, {
    action: "rename",
    slug: renamed,
    version: post.version,
  });
  expect(response.status()).toBe(200);
  post = (await response.json()).post;
  const redirect = await request.get(
    path.replace("/api/admin/posts/", "/blog/"),
    { maxRedirects: 0, headers: { "user-agent": "Googlebot" } },
  );
  expect(redirect.status()).toBe(308);
  expect(redirect.headers().location).toContain(renamed);
  const oldAdmin = await page.request.get(path);
  expect(oldAdmin.status()).toBe(200);
  expect((await oldAdmin.json()).post.slug).toBe(renamed);
  response = await mutate(page, "/api/admin/posts/" + renamed, {
    action: "unpublish",
    version: post.version,
  });
  expect(response.status()).toBe(200);
  expect((await request.get("/blog/" + renamed)).status()).toBe(404);
});
test("actual roles reject anonymous, outsiders, author escalation, cross-author reads and demotion", async ({
  browser,
  request,
}) => {
  expect((await request.get("/api/admin/posts")).status()).toBe(401);
  const owner = await browser.newPage(),
    author = await browser.newPage(),
    editor = await browser.newPage();
  try {
    await signIn(owner, "owner");
    await signIn(author, "author");
    await signIn(editor, "editor");
    const authorPost = await create(author, "Author " + Date.now());
    const ownerPost = await create(owner, "Owner " + Date.now());
    expect(
      (await author.request.get("/api/admin/posts/" + ownerPost.slug)).status(),
    ).toBe(403);
    expect(
      (
        await mutate(author, "/api/admin/posts/" + authorPost.slug, {
          action: "publish",
          version: authorPost.version,
          draft: authorPost.draft,
        })
      ).status(),
    ).toBe(403);
    expect((await author.request.get("/api/admin/settings")).status()).toBe(
      403,
    );
    expect((await editor.request.get("/api/admin/settings")).status()).toBe(
      403,
    );
    expect(
      (
        await mutate(editor, "/api/admin/posts/" + authorPost.slug, {
          action: "publish",
          version: authorPost.version,
          draft: authorPost.draft,
        })
      ).status(),
    ).toBe(200);
    expect(
      (
        await author.request.get("/api/admin/posts/" + authorPost.slug)
      ).status(),
    ).toBe(403);
    expect(
      (
        await mutate(
          owner,
          "/api/admin/members",
          { user_id: accounts.editor.id },
          "DELETE",
        )
      ).status(),
    ).toBe(200);
    expect((await editor.request.get("/api/admin/posts")).status()).toBe(403);
    expect(
      (
        await mutate(owner, "/api/admin/members", {
          user_id: accounts.editor.id,
          role: "editor",
        })
      ).status(),
    ).toBe(200);
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } },
    );
    expect(
      (await client.from("blog_post_drafts").select("*")).error,
    ).toBeTruthy();
    const { error } = await client.auth.signInWithPassword(accounts.author);
    expect(error).toBeNull();
    expect(
      (
        await client
          .from("blog_members")
          .upsert({ user_id: accounts.author.id, role: "editor" })
      ).error,
    ).toBeTruthy();
    expect(
      (
        await client
          .from("blog_posts")
          .update({ title: "Bypass" })
          .eq("id", authorPost.id)
      ).error,
    ).toBeTruthy();
  } finally {
    await owner.close();
    await author.close();
    await editor.close();
  }
});
test("real storage upload metadata captions and reference-aware deletion work", async ({
  page,
}) => {
  await signIn(page, "owner");
  const buffer = await sharp({
    create: { width: 32, height: 32, channels: 3, background: "#245d48" },
  })
    .png()
    .toBuffer();
  const response = await page.request.post("/api/admin/upload-image", {
    headers: { origin },
    multipart: {
      image: { name: "sample.png", mimeType: "image/png", buffer },
      alt: "Sample image",
      caption: "A tested caption",
    },
  });
  expect(response.status()).toBe(200);
  const media = await response.json();
  const image = await page.request.get(media.imageUrl);
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toContain("image/webp");
  const list = await page.request.get("/api/admin/media?q=" + media.name);
  expect((await list.json()).media[0].caption).toBe("A tested caption");
  let post = await create(page, "Media " + Date.now());
  post.draft.htmlContent = `<figure><img src="${media.imageUrl}" alt="Sample image"><figcaption>A tested caption</figcaption></figure>`;
  let saved = await mutate(page, "/api/admin/posts/" + post.slug, {
    action: "save",
    version: post.version,
    draft: post.draft,
  });
  expect(saved.status()).toBe(200);
  post = (await saved.json()).post;
  expect(
    (
      await mutate(page, "/api/admin/media", { name: media.name }, "DELETE")
    ).status(),
  ).toBe(409);
  const oldSettings = await (
    await page.request.get("/api/admin/settings")
  ).json();
  await mutate(page, "/api/admin/settings", {
    ...oldSettings.settings,
    logo_url: media.imageUrl,
  });
  saved = await mutate(page, "/api/admin/posts/" + post.slug, {
    action: "save",
    version: post.version,
    draft: { ...post.draft, htmlContent: "" },
  });
  expect(saved.status()).toBe(200);
  expect(
    (
      await mutate(page, "/api/admin/media", { name: media.name }, "DELETE")
    ).status(),
  ).toBe(409);
  await mutate(page, "/api/admin/settings", oldSettings.settings);
  expect(
    (
      await mutate(page, "/api/admin/media", { name: media.name }, "DELETE")
    ).status(),
  ).toBe(200);
  const invalid = await page.request.post("/api/admin/upload-image", {
    headers: { origin },
    multipart: {
      image: {
        name: "evil.png",
        mimeType: "image/png",
        buffer: Buffer.from("<script>bad</script>"),
      },
    },
  });
  expect(invalid.status()).toBe(400);
});
test("custom branding, typography, navigation and author archives render on phones", async ({
  page,
}) => {
  await signIn(page, "owner");
  const old = await (await page.request.get("/api/admin/settings")).json();
  try {
    expect(
      (
        await mutate(page, "/api/admin/settings", {
          ...old.settings,
          typography: "modern",
          navigation: [{ label: "Journal", href: "/blog" }],
        })
      ).status(),
    ).toBe(200);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page.locator("body")).toHaveAttribute(
      "data-typography",
      "modern",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("button", { name: /Menu|navigation/i }).click();
    await expect(
      page.getByRole("link", { name: "Journal", exact: true }),
    ).toBeVisible();
    await page.goto("/blog/author/owner");
    await expect(
      page.getByRole("heading", { name: "Alex Morgan", exact: true }),
    ).toBeVisible();
  } finally {
    await mutate(page, "/api/admin/settings", old.settings);
  }
});
test("recovery email arrives locally and password exchange works in the requesting browser", async ({
  page,
  request,
}) => {
  await page.goto("/blog/login");
  await page
    .getByRole("button", { name: "Forgot password?", exact: true })
    .click();
  await page.getByLabel("Email", { exact: true }).fill(accounts.owner.email);
  await page
    .getByRole("button", { name: "Send reset link", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    /reset link|recovery link/i,
  );
  let messageId = "";
  await expect
    .poll(
      async () => {
        const r = await request.get("http://127.0.0.1:54324/api/v1/messages");
        const messages = await r.json();
        messageId =
          messages.messages?.find((m: { To?: { Address: string }[] }) =>
            m.To?.some((t) => t.Address === accounts.owner.email),
          )?.ID || "";
        return !!messageId;
      },
      { timeout: 30000 },
    )
    .toBe(true);
  const mail = await (
    await request.get("http://127.0.0.1:54324/api/v1/message/" + messageId)
  ).json();
  const html = mail.HTML || mail.Text || "";
  const link = decodeHTML(
    html.match(/https?:\/\/[^"'<>\s]*\/auth\/v1\/verify[^"'<>\s]*/)?.[0] || "",
  );
  expect(!!link).toBe(true);
  await page.goto(link);
  await expect(
    page.getByRole("heading", { name: "Choose a new password", exact: true }),
  ).toBeVisible();
  const newPassword = randomUUID() + "aA!";
  await page.getByLabel("New password", { exact: true }).fill(newPassword);
  await page
    .getByLabel("Confirm new password", { exact: true })
    .fill(newPassword);
  await page
    .getByRole("button", { name: "Save new password", exact: true })
    .click();
  await expect(page).toHaveURL(/\/blog\/admin/);
  accounts.owner.password = newPassword;
  writeFileSync(
    ".bloggr-example.json",
    JSON.stringify(accounts, null, 2) + "\n",
    { mode: 0o600 },
  );
});

test("future publications stay private in lists, direct URLs, RSS, sitemap, and anonymous database reads", async ({
  page,
  request,
}) => {
  await signIn(page, "owner");
  const post = await create(page, "Scheduled " + Date.now());
  const response = await mutate(page, "/api/admin/posts/" + post.slug, {
    action: "publish",
    version: post.version,
    draft: { ...post.draft, date: "2099-01-01T00:00:00Z" },
  });
  expect(response.status()).toBe(200);
  expect((await request.get("/blog/" + post.slug)).status()).toBe(404);
  expect(await (await request.get("/feed.xml")).text()).not.toContain(
    post.slug,
  );
  expect(await (await request.get("/sitemap.xml")).text()).not.toContain(
    post.slug,
  );
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
  expect(
    (await client.from("blog_posts").select("id").eq("id", post.id)).data,
  ).toEqual([]);
});

test("all workspace screens fit a phone and the real editor publishes a captioned image", async ({
  page,
}, testInfo) => {
  await signIn(page, "owner");
  await page.setViewportSize({ width: 320, height: 700 });
  for (const tab of ["Posts", "Media", "Profile", "Settings", "Members"]) {
    await page
      .getByRole("navigation", { name: "Workspace" })
      .getByRole("button", { name: tab, exact: true })
      .click();
    await page.waitForTimeout(250);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page
    .getByRole("navigation", { name: "Workspace" })
    .getByRole("button", { name: "Posts", exact: true })
    .click();
  await page.getByRole("button", { name: "New post", exact: true }).click();
  const title = "Written on a phone " + Date.now();
  await page.getByLabel("Post title").fill(title);
  await page
    .getByRole("textbox", { name: "Post content" })
    .fill("A paragraph written through the actual editor.");
  await page.getByRole("button", { name: "Insert image", exact: true }).click();
  const library = page
    .getByRole("heading", { name: "Insert image", exact: true })
    .locator("..");
  await library
    .getByLabel("Search media", { exact: true })
    .fill("example-cover.webp");
  const card = library.locator("li").filter({ hasText: "example-cover.webp" });
  await card.getByRole("button", { name: "Use image", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Post content" }).locator("figcaption"),
  ).toHaveText("A little space for new ideas.");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await page.getByText("Post settings", { exact: true }).click();
  const slug = await page
    .getByRole("textbox", { name: /^Permalink/ })
    .inputValue();
  await page.getByRole("button", { name: "Publish…", exact: true }).click();
  await page
    .getByRole("button", { name: /Confirm publish|Confirm schedule/ })
    .click();
  await expect(
    page.getByRole("button", { name: /Confirm publish|Confirm schedule/ }),
  ).not.toBeVisible();
  await page.goto("/blog/" + slug);
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  await expect(page.locator("figcaption")).toHaveText(
    "A little space for new ideas.",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("captioned-article-mobile.png"),
    fullPage: true,
  });
});

test("JSON exports preserve published snapshots and JSON/Markdown imports remain private", async ({
  page,
}) => {
  await signIn(page, "owner");
  let post = await create(page, "Backup " + Date.now());
  let response = await mutate(page, "/api/admin/posts/" + post.slug, {
    action: "publish",
    version: post.version,
    draft: { ...post.draft, coverCaption: "Published credit" },
  });
  expect(response.status()).toBe(200);
  post = (await response.json()).post;
  response = await mutate(page, "/api/admin/posts/" + post.slug, {
    action: "save",
    version: post.version,
    draft: { ...post.draft, coverCaption: "Unpublished credit" },
  });
  expect(response.status()).toBe(200);
  const backup = await page.request.get("/api/admin/backup");
  expect(backup.status()).toBe(200);
  expect(backup.headers()["cache-control"]).toContain("no-store");
  const data = await backup.json();
  const entry = data.posts.find((p: { slug: string }) => p.slug === post.slug);
  expect(entry.published.cover_caption).toBe("Published credit");
  expect(entry.draft.coverCaption).toBe("Unpublished credit");
  expect(entry.published.author_id).toBe(accounts.owner.id);
  response = await mutate(
    page,
    "/api/admin/backup",
    { format: "bloggr-v1", posts: [entry] },
    "POST",
  );
  expect(response.status()).toBe(200);
  expect((await response.json()).imported).toBe(1);
  const matches = await (
    await page.request.get(
      "/api/admin/posts?search=" + encodeURIComponent(post.title),
    )
  ).json();
  expect(
    matches.posts.some(
      (p: { slug: string; status: string }) =>
        p.slug !== post.slug && p.status === "draft",
    ),
  ).toBe(true);
  const title = "Markdown " + Date.now();
  response = await mutate(
    page,
    "/api/admin/backup",
    { markdown: "# Heading\n\n<script>bad()</script>\nHello **world**", title },
    "POST",
  );
  expect(response.status()).toBe(200);
  const imported = await (
    await page.request.get(
      "/api/admin/posts?search=" + encodeURIComponent(title),
    )
  ).json();
  expect(imported.posts[0].status).toBe("draft");
  expect(imported.posts[0].draft.htmlContent).not.toContain("<script");
  expect(imported.posts[0].draft.htmlContent).toContain(
    "<strong>world</strong>",
  );
});
