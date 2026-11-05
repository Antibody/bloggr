'use server'; // Mark this file as containing Server Actions

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '../../lib/supabase/server'; // Import the new helper

// Define the structure for the return value (error message or success)
interface ActionResult {
  error?: string;
}

export async function loginWithPassword(formData: FormData): Promise<ActionResult> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const cookieStore = await cookies(); // Await the cookie store instance
  // Create the Supabase client using the new helper and pass the cookie store
  const supabase = createSupabaseServerClient(cookieStore);

  // Basic validation
  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  // Check against allowed admin email (server-side)
  const allowedEmail = process.env.ADMIN_ALLOWED_EMAIL;
  if (!allowedEmail) {
    console.error("Server Action Error: ADMIN_ALLOWED_EMAIL environment variable not set.");
    return { error: 'Server configuration error.' }; // Don't expose details to client
  }

  if (email !== allowedEmail) {
    console.warn(`Server Action Warning: Login attempt by non-admin email: ${email}`);
    return { error: 'Invalid credentials.' }; // Generic error for security
  }

  // Attempt to sign in with Supabase
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('Supabase Login Error:', error.message);
    return { error: `Login failed: ${error.message}` }; // Return specific Supabase error
  }

  // If login is successful, redirect to the admin page
  // This redirect happens server-side *after* the session cookie is set
  console.log('Server Action: Login successful, redirecting to /blog/admin');
  redirect('/blog/admin');

  // Note: redirect() throws an error to stop execution, so this part is technically unreachable,
  // but included for completeness / potential future modifications.
  // return {}; // Indicate success with no error
}
