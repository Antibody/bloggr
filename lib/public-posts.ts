import "server-only";
import { createClient } from "@supabase/supabase-js";
import { sanitizeContent } from "./content";
import type { Post } from "./types";
function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key
    ? createClient(url, key, { auth: { persistSession: false } })
    : null;
}
const fields =
  "id,slug,title,content,published_at,description,keywords,excerpt,cover_image,cover_alt,tags,author_name,status,version,deleted_at,updated_at,author_id,cover_caption";
const summaryFields =
  "id,slug,title,published_at,description,excerpt,cover_image,cover_alt,tags,author_name,author_id,cover_caption";
export async function getPublicTopics(): Promise<string[]> {
  const db = client();
  if (!db) return [];
  const { data, error } = await db.rpc("blog_public_topics");
  if (error) throw new Error("Topics could not be loaded.");
  return (data || []) as string[];
}
export async function getPublicPosts({
  page = 1,
  search = "",
  tag = "",
  author = "",
}: { page?: number; search?: string; tag?: string; author?: string } = {}) {
  const currentPage = Number.isSafeInteger(page) ? Math.max(1, page) : 1;
  const db = client();
  const empty = {
    posts: [] as Post[],
    totalPages: 0,
    currentPage,
    error: null as string | null,
    configured: !!db,
  };
  if (!db) return empty;
  try {
    let q = db
      .from("blog_posts")
      .select(summaryFields, { count: "exact" })
      .eq("status", "published")
      .is("deleted_at", null)
      .lte("published_at", new Date().toISOString())
      .order("published_at", { ascending: false })
      .order("id");
    if (search)
      q = q.textSearch("search_document", search.slice(0, 200), {
        type: "websearch",
        config: "simple",
      });
    if (author) q = q.eq("author_id", author);
    if (tag) q = q.contains("tags", [tag.slice(0, 40)]);
    const { data, error, count } = await q.range(
      (currentPage - 1) * 9,
      currentPage * 9 - 1,
    );
    if (error) throw error;
    return {
      ...empty,
      posts: (data || []).map((p) => ({ ...p, content: "" })) as Post[],
      totalPages: Math.ceil((count || 0) / 9),
    };
  } catch {
    return {
      ...empty,
      error: "Stories could not be loaded. Please try again.",
    };
  }
}
export async function getPublicPost(slug: string): Promise<Post | null> {
  const db = client();
  if (!db) return null;
  const { data, error } = await db
    .from("blog_posts")
    .select(fields)
    .eq("slug", slug)
    .eq("status", "published")
    .is("deleted_at", null)
    .lte("published_at", new Date().toISOString())
    .maybeSingle();
  if (error) throw new Error("This story could not be loaded.");
  return data
    ? ({ ...data, content: sanitizeContent(data.content) } as Post)
    : null;
}
export async function publicPostFeed(): Promise<Post[]> {
  const db = client();
  if (!db) return [];
  const { data, error } = await db
    .from("blog_posts")
    .select(fields)
    .eq("status", "published")
    .is("deleted_at", null)
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .limit(100);
  if (error) throw new Error("Stories could not be loaded.");
  return (data || []).map((p) => ({
    ...p,
    content: sanitizeContent(p.content),
  })) as Post[];
}

export interface PublicAuthor {
  user_id: string;
  slug: string;
  display_name: string;
  bio: string;
  avatar_url: string;
}
export async function getAuthorById(id: string): Promise<PublicAuthor | null> {
  const db = client();
  if (!db) return null;
  const { data, error } = await db
    .from("blog_authors")
    .select("user_id,slug,display_name,bio,avatar_url")
    .eq("user_id", id)
    .maybeSingle();
  if (error) throw new Error("Author profile could not be loaded.");
  return data;
}
export async function getAuthorBySlug(
  slug: string,
): Promise<PublicAuthor | null> {
  const db = client();
  if (!db) return null;
  const { data, error } = await db
    .from("blog_authors")
    .select("user_id,slug,display_name,bio,avatar_url")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error("Author profile could not be loaded.");
  return data;
}
export async function getPublicRedirect(slug: string): Promise<string | null> {
  const db = client();
  if (!db) return null;
  const { data, error } = await db
    .from("blog_redirects")
    .select("post_id")
    .eq("old_slug", slug)
    .maybeSingle();
  if (error) throw new Error("Redirect could not be loaded.");
  if (!data) return null;
  const { data: post, error: postError } = await db
    .from("blog_posts")
    .select("slug")
    .eq("id", data.post_id)
    .eq("status", "published")
    .is("deleted_at", null)
    .lte("published_at", new Date().toISOString())
    .maybeSingle();
  if (postError) throw new Error("Redirect could not be loaded.");
  return post?.slug || null;
}
export async function sitemapPosts(): Promise<
  Pick<Post, "slug" | "updated_at" | "published_at">[]
> {
  const db = client();
  if (!db) return [];
  const posts: Pick<Post, "slug" | "updated_at" | "published_at">[] = [];
  for (let page = 0; page < 50; page++) {
    const { data, error } = await db
      .from("blog_posts")
      .select("slug,updated_at,published_at")
      .eq("status", "published")
      .is("deleted_at", null)
      .lte("published_at", new Date().toISOString())
      .order("id")
      .range(page * 1000, page * 1000 + 999);
    if (error) throw new Error("Sitemap could not be loaded.");
    posts.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return posts;
}
