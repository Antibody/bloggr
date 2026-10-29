import { test, expect, type Page } from "@playwright/test";
const draft = {
  title: "A story worth sharing",
  htmlContent: "<p>A clear beginning for this story.</p>",
  date: "2020-01-01T12:00:00Z",
  seoDescription: "",
  seoKeywords: "",
  excerpt: "",
  coverImage: "",
  coverAlt: "",
  tags: [],
  authorName: "Alex",
};
function post(slug = "a-story") {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    slug,
    title: draft.title,
    content: "",
    published_at: draft.date,
    description: "",
    keywords: "",
    excerpt: "",
    cover_image: "",
    cover_alt: "",
    tags: [],
    author_name: "",
    status: "draft",
    version: 1,
    deleted_at: null,
    draft: { ...draft },
    updated_at: draft.date,
  };
}
async function workspace(page: Page, loseFirstCreate = false) {
  let current = post();
  let created = false;
  let failed = false;
  let conflict = false;
  let loseRename = false;
  const actions: string[] = [];
  let holdRead = false,
    holdRevision = false;
  let readRelease: (() => void) | undefined,
    revisionRelease: (() => void) | undefined;
  await page.route("**/blog/api/validate", (r) =>
    r.fulfill({
      json: { authorized: true, ready: true, ownerId: "fixture-owner" },
    }),
  );
  await page.route("**/api/admin/**", async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    const body = req.method() === "GET" ? null : req.postDataJSON();
    if (path === "/api/admin/posts" && req.method() === "GET")
      return route.fulfill({
        json: {
          posts: [current],
          totalPages: 1,
          currentPage: 1,
        },
      });
    if (path === "/api/admin/posts" && req.method() === "POST") {
      if (!created) {
        current = {
          ...post(body.slug || "new-story"),
          id: body.id,
          draft: body.draft,
          title: body.draft.title,
        };
        created = true;
      }
      if (loseFirstCreate && !failed) {
        failed = true;
        return route.abort("failed");
      }
      return route.fulfill({ json: { post: current } });
    }
    if (path.endsWith("/revisions"))
      return route.fulfill({
        json: {
          revisions: [
            {
              id: "22222222-2222-4222-8222-222222222222",
              created_at: draft.date,
              data: draft,
            },
          ],
        },
      });
    if (path.startsWith("/api/admin/posts/")) {
      if (req.method() === "GET" && holdRead)
        await new Promise<void>((resolve) => {
          readRelease = resolve;
        });
      if (body?.action === "revision" && holdRevision)
        await new Promise<void>((resolve) => {
          revisionRelease = resolve;
        });
      if (req.method() === "GET")
        return route.fulfill({ json: { post: current } });
      if (conflict || body.version !== current.version)
        return route.fulfill({
          status: 409,
          json: { error: "This post changed in another tab." },
        });
      actions.push(body.action);
      current = {
        ...current,
        version: current.version + 1,
        ...(body.draft ? { draft: body.draft, title: body.draft.title } : {}),
        ...(body.action === "publish" ? { status: "published" } : {}),
        ...(body.action === "rename" ? { slug: body.slug } : {}),
      };
      if (body.action === "rename" && loseRename) {
        loseRename = false;
        return route.abort("failed");
      }
      return route.fulfill({ json: { post: current } });
    }
    return route.fulfill({ json: { settings: {}, media: [] } });
  });
  return {
    getCurrent: () => current,
    loseRenameResponse: () => {
      loseRename = true;
    },
    holdRead: () => {
      holdRead = true;
    },
    releaseRead: () => {
      holdRead = false;
      readRelease?.();
    },
    holdRevision: () => {
      holdRevision = true;
    },
    releaseRevision: () => {
      holdRevision = false;
      revisionRelease?.();
    },
    actions,
    setConflict: () => {
      conflict = true;
    },
    editElsewhere: () => {
      current = {
        ...current,
        version: 2,
        draft: { ...current.draft, title: "External edit" },
      };
    },
    setPublished: () => {
      current.status = "published";
    },
  };
}
test("public pages fit phones, theme persists, and errors are usable", async ({
  page,
}) => {
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Bloggr", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.goto("/blog");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.getByLabel("Color theme").selectOption("dark");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.goto("/blog/login");
  await expect(
    page.getByRole("heading", { name: "Set up your workspace" }),
  ).toBeVisible();
});
test("phone editor remains visible and New post starts fresh after saving", async ({
  page,
}) => {
  const state = await workspace(page);
  await page.setViewportSize({ width: 390, height: 700 });
  await page.goto("/blog/admin");
  await page.getByRole("button", { name: "New post", exact: true }).click();
  await page.getByLabel("Post title").fill("My first draft");
  await page
    .getByRole("textbox", { name: "Post content" })
    .fill("A useful opening.");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect
    .poll(() => state.getCurrent().draft.title)
    .toBe("My first draft");
  await page.getByRole("button", { name: "← Posts", exact: true }).click();
  await page.getByRole("button", { name: "New post", exact: true }).click();
  await expect(page.getByLabel("Post title")).toHaveValue("");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 390, height: 450 });
  await page
    .getByRole("textbox", { name: "Post content" })
    .scrollIntoViewIfNeeded();
  await expect(
    page.getByRole("textbox", { name: "Post content" }),
  ).toBeInViewport();
});
test("creation response loss and retry saves the newest draft", async ({
  page,
}) => {
  const state = await workspace(page, true);
  await page.goto("/blog/admin");
  await page.getByRole("button", { name: "New post", exact: true }).click();
  await page.getByLabel("Post title").fill("First snapshot");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Retry save", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Post title").fill("Newest snapshot");
  await page.getByRole("button", { name: "Retry save", exact: true }).click();
  await expect
    .poll(() => state.getCurrent().draft.title)
    .toBe("Newest snapshot");
});
test("version conflicts preserve content and expose recovery actions", async ({
  page,
}) => {
  const state = await workspace(page);
  await page.goto("/blog/admin");
  await page.getByRole("button", { name: /A story worth sharing/ }).click();
  await page.getByLabel("Post title").fill("My local edit");
  state.setConflict();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Download my draft", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Post title")).toHaveValue("My local edit");
});
test("real endpoints fail closed without configuration and reject foreign writes", async ({
  request,
}) => {
  for (const path of [
    "/api/admin/posts",
    "/api/admin/settings",
    "/api/admin/media",
    "/api/admin/backup",
    "/blog/api/validate",
  ]) {
    const r = await request.get(path);
    expect([401, 403, 503]).toContain(r.status());
    expect(r.headers()["cache-control"]).toContain("no-store");
  }
  const response = await request.post("/api/admin/posts", {
    headers: { origin: "https://attacker.example" },
    data: { draft },
  });
  expect(response.status()).toBe(403);
  expect((await request.get("/robots.txt")).status()).toBe(200);
  expect((await request.get("/sitemap.xml")).status()).toBe(200);
});

test("a lost creation retry never overwrites a newer server version", async ({
  page,
}) => {
  const state = await workspace(page, true);
  await page.goto("/blog/admin");
  await page.getByRole("button", { name: "New post", exact: true }).click();
  await page.getByLabel("Post title").fill("First snapshot");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Retry save", exact: true }),
  ).toBeVisible();
  state.editElsewhere();
  await page.getByLabel("Post title").fill("My recovered edit");
  await page.getByRole("button", { name: "Retry save", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Download my draft", exact: true }),
  ).toBeVisible();
  expect(state.getCurrent().draft.title).toBe("External edit");
  await expect(page.getByLabel("Post title")).toHaveValue("My recovered edit");
});
test("unpublishing first preserves current unsaved edits", async ({ page }) => {
  const state = await workspace(page);
  state.setPublished();
  await page.goto("/blog/admin");
  await page.getByRole("button", { name: /A story worth sharing/ }).click();
  await page.getByLabel("Post title").fill("Changed before unpublish");
  await page.getByText("Post settings", { exact: true }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Unpublish", exact: true }).click();
  await expect.poll(() => state.actions).toEqual(["save", "unpublish"]);
  expect(state.getCurrent().draft.title).toBe("Changed before unpublish");
});

test("reloading after a conflict locks editing and preserves the recovery snapshot", async ({
  page,
}) => {
  const state = await workspace(page);
  await page.goto("/blog/admin");
  await page.getByRole("button", { name: /A story worth sharing/ }).click();
  await page.getByLabel("Post title").fill("Do not lose this text");
  state.setConflict();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Load latest version", exact: true }),
  ).toBeVisible();
  state.holdRead();
  await page
    .getByRole("button", { name: "Load latest version", exact: true })
    .click();
  await expect(page.getByLabel("Post title")).toBeDisabled();
  await expect(
    page.getByRole("textbox", { name: "Post content" }),
  ).toHaveAttribute("contenteditable", "false");
  state.releaseRead();
  await page
    .getByRole("button", { name: "Use recovered draft", exact: true })
    .click();
  await expect(page.getByLabel("Post title")).toHaveValue(
    "Do not lose this text",
  );
});
test("revision replacement locks the composer until the operation completes", async ({
  page,
}) => {
  const state = await workspace(page);
  await page.goto("/blog/admin");
  await page.getByRole("button", { name: /A story worth sharing/ }).click();
  await page.getByText("Post settings", { exact: true }).click();
  await page
    .getByRole("button", { name: "Revision history", exact: true })
    .click();
  state.holdRevision();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Restore", exact: true }).click();
  await expect(page.getByLabel("Post title")).toBeDisabled();
  await expect(
    page.getByRole("textbox", { name: "Post content" }),
  ).toHaveAttribute("contenteditable", "false");
  state.releaseRevision();
  await expect(page.getByLabel("Post title")).toBeEnabled();
});

test("a lost rename response can reconcile the old address and preserve new text", async ({
  page,
}) => {
  const state = await workspace(page);
  await page.goto("/blog/admin");
  await page.getByRole("button", { name: /A story worth sharing/ }).click();
  await page.getByText("Post settings", { exact: true }).click();
  await page.getByLabel("New permalink", { exact: true }).fill("renamed-story");
  state.loseRenameResponse();
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Change permalink", exact: true })
    .click();
  await expect.poll(() => state.getCurrent().slug).toBe("renamed-story");
  await page.getByLabel("Post title").fill("Text kept after rename loss");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await page
    .getByRole("button", { name: "Load latest version", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Use recovered draft", exact: true })
    .click();
  await expect(page.getByLabel("Post title")).toHaveValue(
    "Text kept after rename loss",
  );
});
