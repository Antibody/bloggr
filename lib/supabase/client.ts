import { createBrowserClient as _createBrowserClient } from '@supabase/ssr';

// Define a function to create a Supabase client for browser-side operations
export function createSupabaseBrowserClient() {
  // Ensure environment variables are defined
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!supabaseAnonKey) {
    throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  // Create and return the browser client instance

  return _createBrowserClient(supabaseUrl, supabaseAnonKey);
}

