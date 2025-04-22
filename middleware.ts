import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  // Ensure environment variables are defined (needed for createServerClient)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Middleware Error: Missing Supabase URL or Anon Key environment variables.");
    // Allow request to proceed but log error, or redirect to an error page
    return res;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // If the cookie is set, update the response
          // This will refresh the session cookie
          req.cookies.set({ name, value, ...options });
          res = NextResponse.next({ // Create new response to apply cookie changes
            request: { headers: req.headers },
          });
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          // If the cookie is removed, update the response
          req.cookies.set({ name, value: '', ...options });
          res = NextResponse.next({ // Create new response to apply cookie changes
            request: { headers: req.headers },
          });
          res.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // Refresh session - important to keep the user logged in
  // getSession() will automatically refresh the session cookie if needed
  await supabase.auth.getSession();

  // ### Blog Admin Area Protection ---
  const requestedPath = req.nextUrl.pathname;

  if (requestedPath.startsWith('/blog/admin')) {
    console.log(`Middleware: Checking access for ${requestedPath}`);

    // Use getUser() for a validated user object
    const { data: { user }, error: getUserError } = await supabase.auth.getUser();
    const allowedEmail = process.env.ADMIN_ALLOWED_EMAIL;

    // Handle potential error during getUser()
    if (getUserError) {
        console.error(`Middleware: Error fetching user for ${requestedPath}:`, getUserError.message);
        // Decide how to handle - redirect to login or error page?
        const redirectUrl = req.nextUrl.clone();
        redirectUrl.pathname = '/blog/login';
        redirectUrl.searchParams.set('error', 'auth_error');
        return NextResponse.redirect(redirectUrl);
    }

    // If no authenticated user is found, redirect to the blog login page
    if (!user) {
      console.log(`Middleware: No authenticated user found for ${requestedPath}, redirecting to /blog/login`);
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = '/blog/login';
      redirectUrl.searchParams.set('redirectedFrom', requestedPath); // Add where the user came from
      return NextResponse.redirect(redirectUrl);
    }

    // Check if the ADMIN_ALLOWED_EMAIL environment variable is set
    if (!allowedEmail) {
        console.error('Middleware Error: ADMIN_ALLOWED_EMAIL environment variable not set.');
        // Redirect to home or an error page, as admin area is misconfigured
        const redirectUrl = req.nextUrl.clone();
        redirectUrl.pathname = '/'; // Redirect home
        redirectUrl.searchParams.set('error', 'config_error');
        return NextResponse.redirect(redirectUrl);
    }

    // Check if the logged-in user's email matches the allowed admin email
    if (user.email !== allowedEmail) {
      console.log(`Middleware: User email (${user.email}) does not match allowed admin email for ${requestedPath}. Redirecting.`);
      // Redirect unauthorized users (e.g., back to login or home page)
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = '/blog/login'; // Or perhaps '/'
      redirectUrl.searchParams.set('error', 'unauthorized');
      return NextResponse.redirect(redirectUrl);
    }

    console.log(`Middleware: User (${user.email}) authorized for ${requestedPath}`);
    // If user session exists and email matches, allow access to the admin area
  }

  // Return the response (potentially modified with new cookies)
  return res;
}

// Configure the middleware to run only for specific paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * We specifically want it to run for /blog/admin
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
    // Explicitly include /blog/admin if the negative lookahead isn't sufficient
    // '/blog/admin/:path*',
  ],
}