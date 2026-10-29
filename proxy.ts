import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
  const client = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(
        values: { name: string; value: string; options: CookieOptions }[],
      ) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });
  const {
    data: { user },
  } = await client.auth.getUser();
  let allowed =
    !!user &&
    !!process.env.ADMIN_ALLOWED_EMAIL &&
    user.email?.toLowerCase() === process.env.ADMIN_ALLOWED_EMAIL.toLowerCase();
  if (user && !allowed && request.nextUrl.pathname.startsWith("/blog/admin")) {
    const { data, error } = await client
      .from("blog_members")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    allowed = !error && !!data && ["editor", "author"].includes(data.role);
  }
  if (request.nextUrl.pathname.startsWith("/blog/admin") && !allowed) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/blog/login";
    redirect.search = "";
    const result = NextResponse.redirect(redirect);
    result.headers.set("Cache-Control", "private, no-store");
    response.cookies.getAll().forEach((c) => result.cookies.set(c));
    return result;
  }
  if (
    request.nextUrl.pathname.startsWith("/blog/admin") ||
    request.nextUrl.pathname.startsWith("/blog/preview")
  )
    response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = {
  matcher: [
    "/blog/admin/:path*",
    "/blog/preview/:path*",
    "/blog/login",
    "/blog/reset-password",
  ],
};
