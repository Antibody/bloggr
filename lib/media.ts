import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkspaceActor } from "./access";
import { HttpError } from "./validation";

export function mediaName(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^[-\w.]+$/.test(value) ||
    value.length > 255 ||
    value === "." ||
    value === ".."
  )
    throw new HttpError(400, "Choose a valid image.");
  return value;
}
export function mediaText(value: unknown, max: number): string {
  if (value == null) return "";
  if (typeof value !== "string" || value.length > max)
    throw new HttpError(400, `Image text must be at most ${max} characters.`);
  return value.trim();
}
export function mediaUrl(db: SupabaseClient, name: string) {
  return db.storage.from("blog-images").getPublicUrl(name).data.publicUrl;
}
export async function authorizeMedia(
  db: SupabaseClient,
  actor: WorkspaceActor,
  name: string,
) {
  const { data, error } = await db
    .from("blog_media")
    .select("*")
    .eq("name", name)
    .maybeSingle();
  if (error) throw error;
  if (
    (!data && actor.role !== "owner") ||
    (data && actor.role === "author" && data.created_by !== actor.id)
  )
    throw new HttpError(404, "Image not found.");
  if (!data) {
    const { data: files, error: listError } = await db.storage
      .from("blog-images")
      .list("", { search: name, limit: 100 });
    if (listError) throw listError;
    if (!files?.some((file) => file.id && file.name === name))
      throw new HttpError(404, "Image not found.");
  }
  return data;
}
// Scan every page: a later post or private draft must protect an image too.
export async function referencedMedia(db: SupabaseClient, names: string[]) {
  const used = new Set<string>();
  const urls = names.map((name) => [name, mediaUrl(db, name)] as const);
  for (const [table, columns, order] of [
    ["blog_posts", "content,cover_image", "id"],
    ["blog_post_drafts", "data", "post_id"],
    ["blog_settings", "data", "id"],
    ["blog_author_profiles", "avatar_url", "user_id"],
    ["blog_revisions", "data", "id"],
  ]) {
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await db
        .from(table)
        .select(columns)
        .order(order)
        .range(offset, offset + 499);
      if (error) throw error;
      for (const row of data || []) {
        const text = JSON.stringify(row);
        for (const [name, url] of urls) if (text.includes(url)) used.add(name);
      }
      if (!data || data.length < 500) break;
    }
  }
  return used;
}
