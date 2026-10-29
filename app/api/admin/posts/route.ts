import { NextRequest } from "next/server";
import {
  authorizeWorkspace,
  privateJson,
  apiError,
  readJson,
} from "@/lib/admin";
import { parseDraft, HttpError, postSlug } from "@/lib/validation";
import { adminPost, mutatePost } from "@/lib/post-admin";
import { randomUUID } from "node:crypto";
export async function GET(request: NextRequest) {
  try {
    const { db, actor } = await authorizeWorkspace(request);
    const p = request.nextUrl.searchParams;
    const page = Math.min(10000, Math.max(1, Number(p.get("page")) || 1));
    const status = p.get("status") || "all";
    let query = db
      .from("blog_posts")
      .select("*,blog_post_drafts!inner(data)", { count: "exact" })
      .order("updated_at", { ascending: false });
    if (actor.role === "author")
      query = query.eq("author_id", actor.id).eq("status", "draft");
    if (status === "trash") query = query.not("deleted_at", "is", null);
    else query = query.is("deleted_at", null);
    if (status === "draft") query = query.eq("status", "draft");
    if (status === "published")
      query = query
        .eq("status", "published")
        .lte("published_at", new Date().toISOString());
    if (status === "scheduled")
      query = query
        .eq("status", "published")
        .gt("published_at", new Date().toISOString());
    // Search private working titles without exposing drafts on public rows.
    const search = (p.get("search") || "").slice(0, 100).replace(/[%_\\]/g, "");
    if (search)
      query = query.ilike("blog_post_drafts.data->>title", "%" + search + "%");
    const { data, error, count } = await query.range(
      (page - 1) * 20,
      page * 20 - 1,
    );
    if (error) throw error;
    return privateJson({
      posts: (data || []).map(adminPost),
      totalPages: Math.ceil((count || 0) / 20),
      currentPage: page,
    });
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(request: NextRequest) {
  try {
    const { db, actor } = await authorizeWorkspace(request);
    const body = await readJson(request);
    const draft = parseDraft(body.draft || body);
    const id = body.id || randomUUID();
    if (
      typeof id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        id,
      )
    )
      throw new HttpError(400, "Invalid post ID.");
    const slug = postSlug(body.slug || draft.title || "untitled") + "";
    const post = await mutatePost(
      db,
      slug || "untitled-" + id.slice(0, 8),
      draft,
      "create",
      null,
      actor,
      id,
    );
    return privateJson({ post, success: true, slug: post.slug }, 201);
  } catch (e) {
    return apiError(e);
  }
}
