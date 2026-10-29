import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkspaceActor } from "./access";
import type { Post } from "./types";
import { HttpError } from "./validation";
export function adminPost(row: Record<string, unknown>): Post {
  const nested = row.blog_post_drafts as
    | { data: unknown }
    | { data: unknown }[]
    | undefined;
  const draft =
    row.draft || (Array.isArray(nested) ? nested[0]?.data : nested?.data);
  const { blog_post_drafts: _nested, ...post } = row;
  return {
    ...post,
    draft,
    ...(draft ? { title: (draft as { title: string }).title } : {}),
  } as unknown as Post;
}

export async function resolveAdminSlug(
  db: SupabaseClient,
  slug: string,
): Promise<string> {
  const { data, error } = await db
    .from("blog_redirects")
    .select("post_id")
    .eq("old_slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) return slug;
  const { data: post, error: postError } = await db
    .from("blog_posts")
    .select("slug")
    .eq("id", data.post_id)
    .maybeSingle();
  if (postError) throw postError;
  return post?.slug || slug;
}

export async function mutatePost(
  db: SupabaseClient,
  slug: string,
  draft: unknown,
  action: string,
  version: number | null,
  actor: WorkspaceActor,
  id: string | null = null,
  revision: string | null = null,
  newSlug: string | null = null,
) {
  const parameters = {
    p_slug: slug,
    p_draft: draft,
    p_action: action,
    p_version: version,
    p_id: id,
    p_revision: revision,
    p_actor_id: actor.id,
    p_actor_role: actor.role,
    p_new_slug: newSlug,
  };
  let { data, error } = await db.rpc("edit_blog_post", parameters);
  if (error?.code === "P0002" && action !== "create") {
    const target = await resolveAdminSlug(db, slug);
    if (target !== slug)
      ({ data, error } = await db.rpc("edit_blog_post", {
        ...parameters,
        p_slug: target,
      }));
  }
  if (error) {
    if (error.code === "42501")
      throw new HttpError(
        403,
        "You do not have permission to change this post.",
      );
    if (error.code === "40001")
      throw new HttpError(
        409,
        "This post changed in another tab. Your local changes are preserved. Reload the latest version before saving.",
      );
    if (error.code === "23505")
      throw new HttpError(
        409,
        `That permalink is already taken. Try "${(newSlug || slug).slice(0, 105)}-${randomUUID().slice(0, 8)}".`,
      );
    if (error.code === "P0002")
      throw new HttpError(404, "Post or revision not found.");
    if (error.code === "22023")
      throw new HttpError(400, "This action is not available.");
    throw error;
  }
  return adminPost(data);
}
