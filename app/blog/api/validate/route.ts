import { NextRequest } from "next/server";
import { authorizeWorkspace, apiError, privateJson } from "@/lib/admin";
export async function GET(request: NextRequest) {
  try {
    const { db, actor } = await authorizeWorkspace(request);
    const checks = await Promise.all([
      db.from("blog_posts").select("id,status,version,author_id").limit(1),
      db.from("blog_post_drafts").select("post_id").limit(1),
      db.from("blog_members").select("user_id,role").limit(1),
      db.from("blog_authors").select("user_id,slug").limit(1),
    ]);
    if (checks.some(({ error }) => error))
      return privateJson(
        {
          authorized: true,
          ready: false,
          error: "Run all publication migrations before using the workspace.",
        },
        503,
      );
    return privateJson({
      authorized: true,
      ready: true,
      ownerId: actor.id,
      actor,
    });
  } catch (e) {
    return apiError(e);
  }
}
