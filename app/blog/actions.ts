"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
type ActionResult = { error?: string; message?: string };
function configured() {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.ADMIN_ALLOWED_EMAIL
  );
}
export async function loginWithPassword(
  formData: FormData,
): Promise<ActionResult> {
  if (!configured())
    return {
      error:
        "The workspace is not configured yet. Connect Supabase and set the owner email in the server environment.",
    };
  const email = String(formData.get("email") || "").trim(),
    password = String(formData.get("password") || "");
  if (!email || !password) return { error: "Enter your email and password." };
  try {
    const client = createSupabaseServerClient(await cookies());
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });
    if (error)
      return {
        error:
          "Email or password is incorrect. Try again or reset your password.",
      };
    if (!data.user || !(await workspaceMember(client, data.user))) {
      await client.auth.signOut();
      return { error: "Email or password is incorrect." };
    }
  } catch {
    return { error: "Sign in is temporarily unavailable. Please try again." };
  }
  redirect("/blog/admin");
}
export async function logout() {
  if (configured()) {
    try {
      await createSupabaseServerClient(await cookies()).auth.signOut();
    } catch {
      /* Expired sessions can still return to sign-in. */
    }
  }
  redirect("/blog/login");
}
export async function requestPasswordReset(
  formData: FormData,
): Promise<ActionResult> {
  if (!configured())
    return {
      error:
        "Connect Supabase and configure the owner email before resetting a password.",
    };
  const email = String(formData.get("email") || "").trim();
  if (!email) return { error: "Enter your email address." };
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (!site)
    return {
      error:
        "Set NEXT_PUBLIC_SITE_URL and allow /blog/login as a redirect URL in Supabase before using password reset.",
    };
  const message =
    "If this account exists, a password reset link will arrive shortly.";
  try {
    const client = createSupabaseServerClient(await cookies());
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: new URL("/blog/login", site).href,
    });
    if (error)
      return {
        error:
          "The reset email could not be sent. Check the authentication email settings and try again.",
      };
    return { message };
  } catch {
    return {
      error: "Password reset is temporarily unavailable. Please try again.",
    };
  }
}
export async function updatePassword(
  formData: FormData,
): Promise<ActionResult> {
  if (!configured()) return { error: "The workspace is not configured yet." };
  const password = String(formData.get("password") || ""),
    confirmation = String(formData.get("confirmation") || ""),
    code = String(formData.get("code") || "");
  if (password.length < 12)
    return { error: "Use at least 12 characters for your new password." };
  if (password !== confirmation)
    return { error: "The passwords do not match." };
  try {
    const client = createSupabaseServerClient(await cookies());
    if (code) {
      const { error } = await client.auth.exchangeCodeForSession(code);
      if (error)
        return {
          error:
            "This reset link has expired or was already used. Request a new link and open it in the same browser.",
        };
    }
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user || !(await workspaceMember(client, user)))
      return { error: "Request a new password reset link to continue." };
    const { error } = await client.auth.updateUser({ password });
    if (error)
      return {
        error:
          "The password could not be updated. Request a new reset link and try again.",
      };
  } catch {
    return {
      error: "Password reset is temporarily unavailable. Please try again.",
    };
  }
  redirect("/blog/admin");
}

async function workspaceMember(
  client: ReturnType<typeof createSupabaseServerClient>,
  user: { id: string; email?: string },
) {
  if (
    user.email?.toLowerCase() === process.env.ADMIN_ALLOWED_EMAIL?.toLowerCase()
  )
    return true;
  const { data, error } = await client
    .from("blog_members")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  return !error && !!data && ["editor", "author"].includes(data.role);
}
