import { assertPostAccess } from "@/lib/access";
import { NextRequest } from "next/server";
import {
  authorizeWorkspace,
  privateJson,
  apiError,
  readJson,
} from "@/lib/admin";
import { parseDraft, versionOf, HttpError, postSlug } from "@/lib/validation";
import { adminPost, mutatePost, resolveAdminSlug } from "@/lib/post-admin";
type Context = { params: Promise<{ slug: string }> };
export async function GET(request: NextRequest, { params }: Context) {
  try {
    const { db, actor } = await authorizeWorkspace(request);
    const { slug } = await params;
    let { data, error } = await db
      .from("blog_posts")
      .select("*,blog_post_drafts(data)")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      const target = await resolveAdminSlug(db, slug);
      if (target !== slug)
        ({ data, error } = await db
          .from("blog_posts")
          .select("*,blog_post_drafts(data)")
          .eq("slug", target)
          .maybeSingle());
      if (error) throw error;
    }
    if (!data) throw new HttpError(404, "Post not found.");
    assertPostAccess(actor, data);
    return privateJson({ post: adminPost(data) });
  } catch (e) {
    return apiError(e);
  }
}
export async function PUT(request: NextRequest, { params }: Context) {
  try {
    const { db, actor } = await authorizeWorkspace(request);
    const { slug } = await params;
    const body = await readJson(request);
    const action = body.action || "save";
    if (
      ![
        "save",
        "publish",
        "unpublish",
        "trash",
        "restore",
        "revision",
        "rename",
      ].includes(action)
    )
      throw new HttpError(400, "Invalid action.");
    const draft = ["save", "publish"].includes(action)
      ? parseDraft(body.draft || body, action === "publish")
      : null;
    if (
      action === "revision" &&
      (typeof body.revisionId !== "string" ||
        !/^[0-9a-f-]{36}$/i.test(body.revisionId))
    )
      throw new HttpError(400, "Choose a valid revision.");
    const newSlug =
      action === "rename" && typeof body.slug === "string"
        ? postSlug(body.slug)
        : null;
    if (
      action === "rename" &&
      (!newSlug || newSlug !== body.slug || newSlug.length > 120)
    )
      throw new HttpError(
        400,
        "Use a permalink with lowercase letters, numbers, and hyphens (up to 120 characters).",
      );
    const post = await mutatePost(
      db,
      slug,
      draft,
      action,
      versionOf(body.version),
      actor,
      null,
      body.revisionId || null,
      newSlug,
    );
    return privateJson({ post, success: true, slug: post.slug });
  } catch (e) {
    return apiError(e);
  }
}
export async function DELETE(request: NextRequest, { params }: Context) {
  try {
    const { db, actor } = await authorizeWorkspace(request);
    const { slug } = await params;
    const body = await readJson(request);
    const post = await mutatePost(
      db,
      slug,
      null,
      "trash",
      versionOf(body.version),
      actor,
    );
    return privateJson({ post, success: true });
  } catch (e) {
    return apiError(e);
  }
}
