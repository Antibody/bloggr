import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
const id = "11111111-1111-4111-8111-111111111111";
const draft = (title: string, date = "2020-01-01T00:00:00Z") => ({
  title,
  htmlContent: "<p>Original body</p>",
  date,
  seoDescription: "",
  seoKeywords: "",
  excerpt: "",
  coverImage: "",
  coverAlt: "",
  tags: [],
  authorName: "Alex",
});
test("database lifecycle is atomic, draft-private, versioned, and time-gated", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;CREATE SCHEMA storage;CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);CREATE TABLE storage.objects(id uuid,bucket_id text);ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;GRANT USAGE ON SCHEMA storage TO anon,authenticated,service_role;GRANT ALL ON storage.objects,storage.buckets TO service_role;GRANT ALL ON storage.objects TO anon,authenticated;CREATE POLICY legacy_storage ON storage.objects FOR ALL USING(true) WITH CHECK(true);",
    );
    // PGlite has built-in gen_random_uuid but does not package pgcrypto.
    const sql = (
      await readFile(
        new URL(
          "../supabase/migrations/202610290001_publication.sql",
          import.meta.url,
        ),
        "utf8",
      )
    ).replace("CREATE EXTENSION IF NOT EXISTS pgcrypto;", "");
    await db.exec(sql);
    const mutate = async (
      action: string,
      version: number | null,
      data: unknown = draft("Private draft"),
    ) => {
      const r = await db.query<{ post: Record<string, unknown> }>(
        "SELECT public.edit_blog_post('story',$1::jsonb,$2,$3,$4,NULL) AS post",
        [JSON.stringify(data), action, version, id],
      );
      return r.rows[0].post;
    };
    await db.exec("SET ROLE service_role");
    let post = await mutate("create", null);
    assert.equal(post.version, 1);
    // Creation retry cannot produce duplicates or overwrite existing work.
    await mutate("create", null, draft("Should not overwrite"));
    await db.exec("RESET ROLE;SET ROLE anon");
    assert.equal(
      (await db.query("SELECT * FROM public.blog_posts")).rows.length,
      0,
    );
    await assert.rejects(db.query("SELECT * FROM public.blog_post_drafts"));
    await assert.rejects(
      db.query(
        "SELECT public.edit_blog_post('story','{}','publish',1,NULL,NULL)",
      ),
    );
    await assert.rejects(
      db.exec("INSERT INTO storage.objects(bucket_id) VALUES('blog-images')"),
    );
    await db.exec("RESET ROLE;SET ROLE service_role");
    post = await mutate("publish", 1, draft("Public story"));
    assert.equal(post.version, 2);
    post = await mutate("save", 2, draft("Secret revision"));
    assert.equal(post.title, "Public story");
    assert.equal((post.draft as { title: string }).title, "Secret revision");
    await assert.rejects(mutate("publish", 2, draft("Stale overwrite")));
    await db.exec("RESET ROLE;SET ROLE anon");
    const publicRows = await db.query<{ title: string }>(
      "SELECT * FROM public.blog_posts",
    );
    assert.equal(publicRows.rows[0].title, "Public story");
    assert(!JSON.stringify(publicRows.rows).includes("Secret revision"));
    await assert.rejects(
      db.exec("UPDATE public.blog_posts SET title='Bypass'"),
    );
    await db.exec("RESET ROLE;SET ROLE service_role");
    post = await mutate(
      "publish",
      3,
      draft("Scheduled", "2099-01-01T00:00:00Z"),
    );
    assert.equal(post.version, 4);
    await db.exec("RESET ROLE;SET ROLE anon");
    assert.equal(
      (await db.query("SELECT * FROM public.blog_posts WHERE slug='story'"))
        .rows.length,
      0,
    );
    await db.exec("RESET ROLE;SET ROLE service_role");
    post = await mutate("trash", 4);
    assert(post.deleted_at);
    post = await mutate("restore", 5);
    assert.equal(post.status, "draft");
    assert.equal(post.deleted_at, null);
    const revisions = await db.query<{ id: string }>(
      "SELECT id FROM public.blog_revisions ORDER BY created_at LIMIT 1",
    );
    const restored = await db.query<{ post: { draft: { title: string } } }>(
      "SELECT public.edit_blog_post('story',NULL,'revision',6,NULL,$1) AS post",
      [revisions.rows[0].id],
    );
    assert.equal(restored.rows[0].post.draft.title, "Public story");
  } finally {
    await db.close();
  }
});

test("migration upgrades legacy schema without losing existing posts", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;CREATE SCHEMA storage;CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);CREATE TABLE storage.objects(id uuid,bucket_id text);CREATE TABLE public.blog_posts(id uuid PRIMARY KEY,title text NOT NULL,slug text UNIQUE,content text NOT NULL,published_at timestamptz NOT NULL,description text,keywords text,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;CREATE POLICY old_public ON public.blog_posts FOR SELECT USING(true);CREATE POLICY old_admin ON public.blog_posts FOR ALL USING(true);INSERT INTO public.blog_posts(id,title,slug,content,published_at) VALUES('22222222-2222-4222-8222-222222222222','Existing story','old-url','<p>Keep me</p>','2020-01-01T00:00:00Z');",
    );
    const sql = (
      await readFile(
        new URL(
          "../supabase/migrations/202610290001_publication.sql",
          import.meta.url,
        ),
        "utf8",
      )
    ).replace("CREATE EXTENSION IF NOT EXISTS pgcrypto;", "");
    await db.exec(sql);
    await db.exec("SET ROLE anon");
    const old = await db.query<{
      id: string;
      slug: string;
      content: string;
      status: string;
    }>("SELECT * FROM public.blog_posts");
    assert.equal(old.rows[0].slug, "old-url");
    assert.equal(old.rows[0].content, "<p>Keep me</p>");
    assert.equal(old.rows[0].status, "published");
    await db.exec("RESET ROLE;SET ROLE service_role");
    const made = await db.query<{
      post: { published_at: string; status: string };
    }>(
      "SELECT public.edit_blog_post('new-url',$1::jsonb,'create',NULL,$2,NULL) AS post",
      [JSON.stringify(draft("New story")), id],
    );
    assert.equal(made.rows[0].post.status, "draft");
    assert(made.rows[0].post.published_at);
  } finally {
    await db.close();
  }
});
