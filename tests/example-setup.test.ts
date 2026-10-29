import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { waitForExampleSchema } from "../scripts/example-schema.mjs";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const client = (fetch: typeof globalThis.fetch) =>
  createClient("https://example.test", "test-key", {
    auth: { persistSession: false },
    global: { fetch },
  });

test("example waits for profiles even when media is ready and uses bounded GET probes", async () => {
  let profileChecks = 0;
  const seen = new Set<string>();
  const db = client(async (input, init) => {
    const url = new URL(String(input));
    const table = url.pathname.split("/").at(-1)!;
    seen.add(table);
    assert.equal(init?.method, "GET");
    assert.equal(url.searchParams.get("limit"), "0");
    assert(init?.signal);
    if (table === "blog_author_profiles" && ++profileChecks < 3)
      return json({ code: "PGRST205", message: "Schema cache is stale" }, 404);
    return json([]);
  });
  await waitForExampleSchema(db, { timeoutMs: 1_000, pollMs: 0 });
  assert.equal(profileChecks, 3);
  assert.equal(seen.size, 9);
  assert(seen.has("blog_media"));
  assert(seen.has("blog_members"));
  assert(seen.has("blog_authors"));
});

test("example rejects the bodyless 404 that the SDK normalizes into success", async () => {
  const db = client(async () => new Response(null, { status: 404 }));
  const misleading = await db.from("blog_media").select("name", { head: true });
  assert.equal(misleading.error, null);
  assert.equal(misleading.status, 204);
  await assert.rejects(
    waitForExampleSchema(db, { timeoutMs: 25, pollMs: 0 }),
    /schema cache did not become ready \(blog_posts\)/,
  );
});

test("example waits for new columns as well as tables", async () => {
  let checks = 0;
  const db = client(async (input) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith("/blog_posts")) {
      assert(url.searchParams.get("select")?.includes("search_document"));
      if (++checks === 1)
        return json({ code: "42703", message: "Column not loaded" }, 400);
    }
    return json([]);
  });
  await waitForExampleSchema(db, { timeoutMs: 1_000, pollMs: 0 });
  assert.equal(checks, 2);
});

test("permanent schema failure times out without logging response secrets", async () => {
  const db = client(async () =>
    json({ code: "PGRST205", message: "private-response-detail" }, 404),
  );
  await assert.rejects(waitForExampleSchema(db, { timeoutMs: 25, pollMs: 0 }), {
    message: "The local REST schema cache did not become ready (blog_posts).",
  });
});

test("schema readiness fails immediately when service access is denied", async () => {
  let checks = 0;
  const db = client(async () => {
    checks++;
    return json({ code: "42501", message: "Permission denied" }, 403);
  });
  await assert.rejects(waitForExampleSchema(db), /access denied.*HTTP 403/);
  assert.equal(checks, 1);
});

test("schema readiness aborts a stalled request at its deadline", async () => {
  let aborted = false;
  const db = client(
    async (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        const watchdog = setTimeout(
          () => reject(new Error("Request was not aborted")),
          1_000,
        );
        init?.signal?.addEventListener(
          "abort",
          () => {
            aborted = true;
            clearTimeout(watchdog);
            reject(init.signal?.reason);
          },
          { once: true },
        );
      }),
  );
  await assert.rejects(
    waitForExampleSchema(db, { timeoutMs: 25, pollMs: 0 }),
    /schema cache did not become ready/,
  );
  assert(aborted);
});
