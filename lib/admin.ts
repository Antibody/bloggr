import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "./supabase/server";
import { getSupabaseServerClient } from "./supabaseClient";
import { HttpError } from "./validation";
import {
  assertSameOrigin,
  assertAdminUser,
  boundedBody,
  isOwnerEmail,
  type WorkspaceActor,
} from "./access";
async function authenticatedUser(request?: Request) {
  if (request) assertSameOrigin(request);
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    !process.env.ADMIN_ALLOWED_EMAIL
  )
    throw new HttpError(
      503,
      "Configure Supabase and the owner email in environment settings.",
    );
  const auth = createSupabaseServerClient(await cookies());
  const {
    data: { user },
    error,
  } = await auth.auth.getUser();
  if (error || !user) throw new HttpError(401, "Please sign in.");
  return { auth, user };
}
export async function authorizeAdmin(request?: Request) {
  const { user } = await authenticatedUser(request);
  assertAdminUser(user, process.env.ADMIN_ALLOWED_EMAIL);
  return getSupabaseServerClient();
}
export async function authorizeWorkspace(request?: Request) {
  const { auth, user } = await authenticatedUser(request);
  let role: WorkspaceActor["role"] = "owner";
  if (!isOwnerEmail(user.email, process.env.ADMIN_ALLOWED_EMAIL)) {
    // This query uses the user's client and self-read RLS, before service access.
    const { data, error } = await auth
      .from("blog_members")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error || !data || !["editor", "author"].includes(data.role))
      throw new HttpError(403, "You do not have access to this publication.");
    role = data.role;
  }
  const actor: WorkspaceActor = { id: user.id, email: user.email || "", role };
  return { db: getSupabaseServerClient(), actor };
}
export function privateJson(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}
export function apiError(error: unknown) {
  if (error instanceof HttpError)
    return privateJson({ error: error.message }, error.status);
  console.error(
    "Admin operation failed",
    error instanceof Error ? error.name : "unknown",
  );
  return privateJson(
    {
      error:
        "Could not complete this operation. Check database setup and try again.",
    },
    500,
  );
}
export async function readJson(request: Request) {
  const raw = new TextDecoder().decode(await boundedBody(request, 600000));
  try {
    return JSON.parse(raw);
  } catch {
    throw new HttpError(400, "Invalid JSON.");
  }
}
