import { setTimeout as pause } from "node:timers/promises";

const relations = [
  ["blog_posts", "id,slug,author_id,cover_caption,search_document"],
  ["blog_post_drafts", "post_id,data"],
  ["blog_revisions", "id,post_id,data"],
  ["blog_settings", "id,data"],
  ["blog_members", "user_id,role"],
  ["blog_author_profiles", "user_id,slug,display_name"],
  ["blog_authors", "user_id,slug,display_name"],
  ["blog_redirects", "old_slug,post_id"],
  ["blog_media", "name,created_by,caption"],
];

/**
 * Wait for PostgREST to expose the migrated schema before any seed writes.
 * HEAD is unsafe here: the SDK can normalize a bodyless 404 into success.
 * @param {import("@supabase/supabase-js").SupabaseClient} db
 * @param {{ timeoutMs?: number, pollMs?: number }} options
 */
export async function waitForExampleSchema(
  db,
  { timeoutMs = 30_000, pollMs = 250 } = {},
) {
  const deadline = Date.now() + timeoutMs;
  let pending = "unknown";
  while (Date.now() < deadline) {
    let ready = true;
    for (const [table, columns] of relations) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        ready = false;
        break;
      }
      const result = await db
        .from(table)
        .select(columns)
        .limit(0)
        .abortSignal(AbortSignal.timeout(Math.min(5_000, remaining)))
        .retry(false);
      if (result.status === 200 && !result.error && Array.isArray(result.data))
        continue;
      pending = table;
      if (result.status === 401 || result.status === 403)
        throw new Error(
          `Local REST schema access denied for ${table} (HTTP ${result.status}).`,
        );
      ready = false;
      break;
    }
    if (ready) return;
    const remaining = deadline - Date.now();
    if (remaining > 0) await pause(Math.min(pollMs, remaining));
  }
  throw new Error(
    `The local REST schema cache did not become ready (${pending}).`,
  );
}
