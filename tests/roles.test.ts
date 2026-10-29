import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { assertPostAccess, type WorkspaceActor } from "../lib/access";
import { parseProfile } from "../lib/profiles";
const owner = "11111111-1111-4111-8111-111111111111";
const editor = "22222222-2222-4222-8222-222222222222";
const author = "33333333-3333-4333-8333-333333333333";
const other = "44444444-4444-4444-8444-444444444444";
const postId = "55555555-5555-4555-8555-555555555555";
const otherPostId = "66666666-6666-4666-8666-666666666666";
const draft = {
  title: "Private story",
  htmlContent: "<p>Working text</p>",
  date: "2020-01-01T00:00:00Z",
  seoDescription: "",
  seoKeywords: "",
  excerpt: "",
  coverImage: "",
  coverAlt: "",
  coverCaption: "Photo credit",
  tags: [],
  authorName: "Author",
};
test("authors can read only their own drafts; editors and owner manage all posts", () => {
  const actor: WorkspaceActor = {
    id: author,
    email: "author@example.com",
    role: "author",
  };
  assert.doesNotThrow(() =>
    assertPostAccess(actor, { author_id: author, status: "draft" }),
  );
  for (const post of [
    { author_id: other, status: "draft" },
    { author_id: author, status: "published" },
    { author_id: null, status: "draft" },
  ])
    assert.throws(() => assertPostAccess(actor, post), { status: 403 });
  for (const role of ["owner", "editor"] as const)
    assert.doesNotThrow(() =>
      assertPostAccess(
        { ...actor, role },
        { author_id: other, status: "published" },
      ),
    );
});
test("public profile validation bounds content and forbids unsafe avatar URLs", () => {
  const profile = {
    display_name: "Writer",
    slug: "writer",
    bio: "Words",
    avatar_url: "https://example.com/avatar.png",
  };
  assert.deepEqual(
    parseProfile({ ...profile, role: "owner", user_id: other }),
    profile,
  );
  for (const avatar_url of [
    "javascript:alert(1)",
    "data:image/png;base64,abc",
    "https://user:pass@example.com/a",
  ])
    assert.throws(() => parseProfile({ ...profile, avatar_url }), {
      status: 400,
    });
  assert.throws(() => parseProfile({ ...profile, slug: "../admin" }), {
    status: 400,
  });
  assert.throws(() => parseProfile({ ...profile, bio: "a".repeat(2001) }), {
    status: 400,
  });
});
test("contributor SQL guards ownership, role changes, idempotent creation, revisions, public profiles and atomic redirects", async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,email text);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      GRANT USAGE ON SCHEMA auth TO authenticated,service_role; GRANT SELECT ON auth.users TO service_role;
      CREATE SCHEMA storage;CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);CREATE TABLE storage.objects(id uuid,bucket_id text);ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
      INSERT INTO auth.users VALUES('${owner}','owner@example.com'),('${editor}','editor@example.com'),('${author}','author@example.com'),('${other}','other@example.com');`);
    for (const name of [
      "202610290001_publication.sql",
      "202610290002_contributors.sql",
      "202610290003_media_search.sql",
    ])
      await db.exec(
        (
          await readFile(
            new URL(`../supabase/migrations/${name}`, import.meta.url),
            "utf8",
          )
        ).replace("CREATE EXTENSION IF NOT EXISTS pgcrypto;", ""),
      );
    await db.exec(
      `INSERT INTO public.blog_members(user_id,role) VALUES('${editor}','editor'),('${author}','author'),('${other}','author'); INSERT INTO public.blog_author_profiles(user_id,slug,display_name,bio) VALUES('${author}','writer','Writer','Biography'); SET ROLE service_role;`,
    );
    const mutate = async (
      action: string,
      version: number | null,
      actorId = author,
      role = "author",
      slug = "story",
      id = postId,
      newSlug: string | null = null,
      revision: string | null = null,
    ) => {
      const result = await db.query<{
        post: {
          version: number;
          slug: string;
          status: string;
          author_id: string;
          cover_caption: string;
        };
      }>(
        "SELECT public.edit_blog_post($1,$2::jsonb,$3,$4,$5,$6,$7,$8,$9) AS post",
        [
          slug,
          JSON.stringify(draft),
          action,
          version,
          id,
          revision,
          actorId,
          role,
          newSlug,
        ],
      );
      return result.rows[0].post;
    };
    await assert.rejects(mutate("create", null, author, "author", "admin"), {
      code: "22023",
    });
    let post = await mutate("create", null);
    await assert.rejects(
      mutate("rename", 1, author, "author", "story", postId, "login"),
      { code: "22023" },
    );
    assert.equal(post.author_id, author);
    assert.equal((await mutate("create", null)).version, 1);
    await assert.rejects(mutate("create", null, other), { code: "42501" });
    await assert.rejects(mutate("publish", 1), { code: "42501" });
    await assert.rejects(mutate("save", 1, other), { code: "42501" });
    await assert.rejects(mutate("save", 1, author, "editor"), {
      code: "42501",
    });
    post = await mutate("save", 1);
    assert.equal(post.version, 2);
    post = await mutate("publish", 2, editor, "editor");
    assert.equal(post.cover_caption, "Photo credit");
    for (const action of ["save", "trash", "rename", "revision", "unpublish"])
      await assert.rejects(mutate(action, 3), { code: "42501" });
    post = await mutate(
      "rename",
      3,
      editor,
      "editor",
      "story",
      postId,
      "new-story",
    );
    assert.equal(post.slug, "new-story");
    await assert.rejects(
      mutate("rename", 3, editor, "editor", "new-story", postId, "stale"),
      { code: "40001" },
    );
    await assert.rejects(
      mutate("rename", 4, editor, "editor", "new-story", postId, "story"),
      { code: "23505" },
    );
    await assert.rejects(
      mutate("create", null, other, "author", "story", otherPostId),
      { code: "23505" },
    );
    post = await mutate(
      "rename",
      4,
      owner,
      "owner",
      "new-story",
      postId,
      "älykäs-tarina",
    );
    assert.equal(post.slug, "älykäs-tarina");
    await db.exec("RESET ROLE; SET ROLE anon;");
    assert.equal(
      (await db.query("SELECT * FROM public.blog_redirects")).rows.length,
      2,
    );
    assert.equal(
      (
        await db.query<{ display_name: string }>(
          "SELECT * FROM public.blog_authors",
        )
      ).rows[0].display_name,
      "Writer",
    );
    await assert.rejects(db.query("SELECT * FROM public.blog_members"));
    await assert.rejects(db.query("SELECT * FROM public.blog_author_profiles"));
    await assert.rejects(
      db.query("SELECT public.edit_blog_post('story','{}','save',1,NULL,NULL)"),
    );
    await db.exec(
      `RESET ROLE;SET ROLE authenticated;SET request.jwt.claim.sub='${author}';`,
    );
    assert.equal(
      (await db.query("SELECT * FROM public.blog_members")).rows.length,
      1,
    );
    await assert.rejects(
      db.exec(
        `UPDATE public.blog_members SET role='editor' WHERE user_id='${author}'`,
      ),
    );
    await assert.rejects(
      mutate("unpublish", 5, author, "owner", "älykäs-tarina"),
    );
    await db.exec("RESET ROLE; SET ROLE service_role");
    await mutate("unpublish", 5, owner, "owner", "älykäs-tarina");
    await db.exec("RESET ROLE; SET ROLE anon");
    assert.equal(
      (await db.query("SELECT * FROM public.blog_redirects")).rows.length,
      0,
    );
    await db.exec("RESET ROLE; SET ROLE service_role");
    await assert.rejects(
      db.query(
        "SELECT public.edit_blog_post('älykäs-tarina','{}','save',6,NULL,NULL)",
      ),
      { code: "42501" },
    );
    await mutate("create", null, other, "author", "other-story", otherPostId);
    const revisions = await db.query<{ id: string }>(
      "SELECT id FROM public.blog_revisions LIMIT 1",
    );
    await assert.rejects(
      mutate(
        "revision",
        1,
        other,
        "author",
        "other-story",
        otherPostId,
        null,
        revisions.rows[0].id,
      ),
      { code: "P0002" },
    );
    await db.exec(`DELETE FROM public.blog_members WHERE user_id='${author}'`);
    await assert.rejects(mutate("save", 6, author, "author", "älykäs-tarina"), {
      code: "42501",
    });
  } finally {
    await db.close();
  }
});
