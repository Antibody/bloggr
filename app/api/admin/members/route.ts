import { authorizeAdmin, apiError, privateJson, readJson } from "@/lib/admin";
import { isOwnerEmail } from "@/lib/access";
import { HttpError } from "@/lib/validation";
function userId(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  )
    throw new HttpError(400, "Enter an existing Supabase user ID.");
  return value;
}
export async function GET(request: Request) {
  try {
    const db = await authorizeAdmin(request);
    const { data, error } = await db
      .from("blog_members")
      .select("user_id,role,created_at")
      .order("created_at")
      .limit(501);
    if (error) throw error;
    if (data.length > 500)
      throw new HttpError(
        413,
        "Use the database console to manage more than 500 contributors.",
      );
    const { data: profiles, error: profileError } = await db
      .from("blog_author_profiles")
      .select("user_id,display_name")
      .in(
        "user_id",
        data.map((member) => member.user_id),
      );
    if (profileError) throw profileError;
    return privateJson({
      members: data.map((member) => ({
        ...member,
        display_name:
          profiles.find((p) => p.user_id === member.user_id)?.display_name ||
          "Contributor",
      })),
    });
  } catch (e) {
    return apiError(e);
  }
}
export async function PUT(request: Request) {
  try {
    const db = await authorizeAdmin(request);
    const body = await readJson(request);
    const id = userId(body.user_id);
    if (!["editor", "author"].includes(body.role))
      throw new HttpError(400, "Choose editor or author.");
    const { data, error } = await db.auth.admin.getUserById(id);
    if (error || !data.user)
      throw new HttpError(
        404,
        "No account exists with that user ID. Create the account in Supabase first.",
      );
    if (isOwnerEmail(data.user.email, process.env.ADMIN_ALLOWED_EMAIL))
      throw new HttpError(400, "The configured owner role cannot be changed.");
    const { error: writeError } = await db
      .from("blog_members")
      .upsert({ user_id: id, role: body.role });
    if (writeError) throw writeError;
    return privateJson({ success: true });
  } catch (e) {
    return apiError(e);
  }
}
export async function DELETE(request: Request) {
  try {
    const db = await authorizeAdmin(request);
    const id = userId((await readJson(request)).user_id);
    const { data, error } = await db.auth.admin.getUserById(id);
    if (error || !data.user) throw new HttpError(404, "Account not found.");
    if (isOwnerEmail(data.user.email, process.env.ADMIN_ALLOWED_EMAIL))
      throw new HttpError(400, "The configured owner cannot be removed.");
    const { error: deleteError } = await db
      .from("blog_members")
      .delete()
      .eq("user_id", id);
    if (deleteError) throw deleteError;
    return privateJson({ success: true });
  } catch (e) {
    return apiError(e);
  }
}
