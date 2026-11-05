import { type CookieOptions, createServerClient as _createServerClient } from '@supabase/ssr';
import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies'; // Import the type

// Define a function that takes the actual cookie store object
export function createSupabaseServerClient(cookieStore: ReadonlyRequestCookies) {
  // Ensure environment variables are defined
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!supabaseAnonKey) {
    throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  // Use the original createServerClient from @supabase/ssr, passing the cookie store
  return _createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (_error) { 
        
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (_error) { 
          }
        },
      },
    }
  );
} 


export function createSupabaseAdminClient(cookieStore: ReadonlyRequestCookies) { 
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
        throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_URL");
    }
    if (!supabaseServiceRoleKey) {
        throw new Error("Missing environment variable: SUPABASE_SERVICE_ROLE_KEY. Required for admin actions.");
    }

    
    return _createServerClient(
        supabaseUrl,
        supabaseServiceRoleKey, 
        {
            auth: { // Specific auth options for service role
                persistSession: false, // Do not persist session for service role
                autoRefreshToken: false, // No need to refresh token for service role
                detectSessionInUrl: false, // Do not detect session from URL
            },
            cookies: { // Define cookie handlers using the passed cookieStore
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value, ...options });
                    } catch (_error) { /* Server Component handling */ } 
                },
                remove(name: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value: '', ...options });
                    } catch (_error) { /* Server Component handling */ } 
                },
            },
        }
    );
}
