import {
  authorizeWorkspace,
  apiError,
  privateJson,
  readJson,
} from "@/lib/admin";
import { parseProfile } from "@/lib/profiles";
import { HttpError } from "@/lib/validation";
export async function GET(request: Request) {
  try {
    const { db, actor } = await authorizeWorkspace(request);
    const { data, error } = await db
      .from("blog_author_profiles")
      .select("user_id,slug,display_name,bio,avatar_url")
      .eq("user_id", actor.id)
      .maybeSingle();
    if (error) throw error;
    return privateJson({ profile: data, actor });
  } catch (e) {
    return apiError(e);
  }
}
export async function PUT(request: Request) {
  try {
    const { db, actor } = await authorizeWorkspace(request);
    const profile = parseProfile(await readJson(request));
    const { data, error } = await db
      .from("blog_author_profiles")
      .upsert({
        ...profile,
        user_id: actor.id,
        updated_at: new Date().toISOString(),
      })
      .select("user_id,slug,display_name,bio,avatar_url")
      .single();
    if (error?.code === "23505")
      throw new HttpError(409, "That author URL is already taken.");
    if (error) throw error;
    return privateJson({ profile: data });
  } catch (e) {
    return apiError(e);
  }
}
