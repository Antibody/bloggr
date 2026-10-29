import { assertPostAccess } from "@/lib/access";
import { NextRequest } from "next/server";
import { authorizeWorkspace, privateJson, apiError } from "@/lib/admin";
import { HttpError } from "@/lib/validation";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { db, actor } = await authorizeWorkspace(request);
    const { slug } = await params;
    const { data: post, error: postError } = await db
      .from("blog_posts")
      .select("id,author_id,status")
      .eq("slug", slug)
      .maybeSingle();
    if (postError) throw postError;
    if (!post) throw new HttpError(404, "Post not found.");
    assertPostAccess(actor, post);
    const { data, error } = await db
      .from("blog_revisions")
      .select("id,created_at,data")
      .eq("post_id", post.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return privateJson({ revisions: data });
  } catch (e) {
    return apiError(e);
  }
}
