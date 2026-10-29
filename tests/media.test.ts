import test from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  authorizeMedia,
  mediaName,
  mediaText,
  referencedMedia,
} from "../lib/media";

test("media mutation rejects traversal paths and oversized metadata", () => {
  for (const name of [
    "../other.webp",
    "a/b.webp",
    "https://example.com/a",
    null,
  ])
    assert.throws(() => mediaName(name), { status: 400 });
  assert.throws(() => mediaText("x".repeat(501), 500), { status: 400 });
  assert.throws(() => mediaText({}, 300), { status: 400 });
});
test("reference protection includes posts after page one and private drafts", async () => {
  const url = (name: string) => `https://storage.example/blog-images/${name}`;
  const db = {
    storage: {
      from: () => ({
        getPublicUrl: (name: string) => ({ data: { publicUrl: url(name) } }),
      }),
    },
    from: (table: string) => ({
      select: () => ({
        order: () => ({
          range: async (offset: number) => ({
            data:
              table === "blog_posts"
                ? offset === 0
                  ? Array.from({ length: 500 }, () => ({ content: "" }))
                  : [{ content: `<img src="${url("later.webp")}">` }]
                : [{ data: { coverImage: url("draft.webp") } }],
            error: null,
          }),
        }),
      }),
    }),
  } as unknown as SupabaseClient;
  assert.deepEqual(
    [
      ...(await referencedMedia(db, [
        "later.webp",
        "draft.webp",
        "unused.webp",
      ])),
    ].sort(),
    ["draft.webp", "later.webp"],
  );
});
test("authors cannot access another author's media or unattributed legacy files", async () => {
  for (const data of [null, { name: "image.webp", created_by: "other" }]) {
    const db = {
      from: () => ({
        select: () => ({
          eq: () => ({ maybeSingle: async () => ({ data, error: null }) }),
        }),
      }),
    } as unknown as SupabaseClient;
    await assert.rejects(
      authorizeMedia(
        db,
        { id: "author", role: "author", email: "a@example.com" },
        "image.webp",
      ),
      { status: 404 },
    );
  }
});

test("media rejects dot-only storage paths", () => {
  assert.throws(() => mediaName("."));
  assert.throws(() => mediaName(".."));
});
