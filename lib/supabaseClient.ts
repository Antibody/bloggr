import { createClient } from '@supabase/supabase-js';

// Ensure environment variables are defined
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_URL");
}
if (!supabaseAnonKey) {
  throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY");
}


// Client for browser-side operations (uses anon key)
export const supabaseBrowserClient = createClient(supabaseUrl, supabaseAnonKey);

// Client for server-side operations (uses service role key for elevated BD privileges)

export const getSupabaseServerClient = () => {
  if (!supabaseServiceRoleKey) {
    throw new Error("Missing environment variable: SUPABASE_SERVICE_ROLE_KEY. Required for server-side admin actions.");
  }
  
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
};


