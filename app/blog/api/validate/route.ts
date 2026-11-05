import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "../../../../lib/supabase/server"; // This is a helper for DB handling
import { Pool } from "pg"; // For direct DB access for CREATE TABLE

// Helper delay function (ms in milliseconds) - Consider removing if not strictly needed
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function GET() {
  

  const cookieStore = await cookies(); // Await the cookie store

  // --- Authentication & Authorization Check ---
  // Create the Supabase client using the new helper and pass the cookie store
  const supabase = createSupabaseServerClient(cookieStore);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  const allowedEmail = process.env.ADMIN_ALLOWED_EMAIL;

  if (authError || !user) {
    const reason = authError ? authError.message : 'No user session';
    console.error(`Blog Admin Auth failed: ${reason}`);
    // TODO: Consider adding telemetry here 
    return NextResponse.json(
      { authorized: false, message: "Not authenticated" },
      { status: 401 }
    );
  }

  if (!allowedEmail) {
     console.error("ADMIN_ALLOWED_EMAIL environment variable is not set.");
     return NextResponse.json(
       { authorized: false, message: "Server configuration error: Admin email not set." },
       { status: 500 }
     );
  }

  if (user.email !== allowedEmail) {
     const reason = 'User email does not match ADMIN_ALLOWED_EMAIL';
     console.error(`Blog Admin Authorization failed: ${reason}`);
     // TODO: Consider adding telemetry here 
     return NextResponse.json(
       { authorized: false, message: "Not authorized" },
       { status: 403 }
     );
  }

  // ## Database Table Check & Creation ##

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL, // Ensure this is set in your .env
  });

  let setupMessage = "Blog database setup successful."; // Define message outside try block

  try {
    // Ensure the required uuid-ossp extension is enabled (needed for uuid_generate_v4())
  
    try {
        await pool.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
        console.log("uuid-ossp extension ensured.");
    } catch (extError: unknown) {
       
        const errorMessage = extError instanceof Error ? extError.message : String(extError);
        console.warn(`Could not ensure uuid-ossp extension (may already exist or lack permissions): ${errorMessage}`);
    }

    // ### Blog Posts Table, Trigger, and Index Setup ###
    // Create the trigger function (idempotent)
    await pool.query(`
      CREATE OR REPLACE FUNCTION public.update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = now();
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log("update_updated_at_column function ensured.");
    await delay(200); // Short delay to ensure exec before the next step

    // Create the blog_posts table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.blog_posts (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          title TEXT NOT NULL,
          slug TEXT UNIQUE,
          published_at TIMESTAMPTZ NOT NULL,
          description TEXT,
          keywords TEXT,
          content TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    console.log("blog_posts table ensured.");

    // --- Enable Row Level Security (RLS) and Policies ---
    await pool.query(`ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;`);
    console.log("RLS enabled for blog_posts table.");

    await pool.query(`ALTER TABLE public.blog_posts FORCE ROW LEVEL SECURITY;`);
    console.log("RLS forced for blog_posts table.");

    await pool.query(`DROP POLICY IF EXISTS "Allow public read access" ON public.blog_posts;`); // Add DROP IF EXISTS
    await pool.query(`
        CREATE POLICY "Allow public read access"
        ON public.blog_posts
        FOR SELECT
        USING (true);
    `);
    console.log("Public read policy ensured for blog_posts table.");


    const adminEmail = process.env.ADMIN_ALLOWED_EMAIL;
    if (adminEmail) {
        await pool.query(`DROP POLICY IF EXISTS "Allow admin full access" ON public.blog_posts;`); // Add DROP IF EXISTS
        await pool.query(`
            CREATE POLICY "Allow admin full access"
            ON public.blog_posts
            FOR ALL
            USING (auth.email() = '${adminEmail}')
            WITH CHECK (auth.email() = '${adminEmail}');
        `);
        console.log("Admin full access policy ensured for blog_posts table.");
    } else {
        console.warn("ADMIN_ALLOWED_EMAIL environment variable not set. Admin policy NOT created.");
    }


    // ## Trigger Creation (Idempotency) ##
    // Check if the trigger already exists
    const triggerExistsResult = await pool.query(`
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_blog_posts_updated_at';
    `);

    if (triggerExistsResult.rowCount === 0) {
        // Drop existing trigger first (belt-and-suspenders, though check should suffice)
        await pool.query(`DROP TRIGGER IF EXISTS update_blog_posts_updated_at ON public.blog_posts;`);
        console.log("Dropped existing update_blog_posts_updated_at trigger (if any).");
        await delay(100); // Shorter delay might be okay

        // Create the trigger only if it doesn't exist
        await pool.query(`
          CREATE TRIGGER update_blog_posts_updated_at
          BEFORE UPDATE ON public.blog_posts
          FOR EACH ROW
          EXECUTE PROCEDURE public.update_updated_at_column();
        `);
        console.log("update_blog_posts_updated_at trigger created.");
    } else {
        console.log("update_blog_posts_updated_at trigger already exists. Skipping creation.");
    }
    await delay(100); // Shorter delay is okay

    // Create the unique index on slug (idempotent) - This is fine
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.blog_posts(slug);`);
    console.log("idx_blog_posts_slug index ensured.");

    // ## Storage Bucket Setup ##
    await pool.query(`
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('blog-images', 'blog-images', true)
        ON CONFLICT (id) DO NOTHING;
    `);
    console.log("Storage bucket 'blog-images' ensured.");

    // ## Storage Object Policies #
    await pool.query(`DROP POLICY IF EXISTS "Public Read Access for blog-images" ON storage.objects;`);
    await pool.query(`
        CREATE POLICY "Public Read Access for blog-images"
        ON storage.objects
        FOR SELECT
        USING ( bucket_id = 'blog-images' );
    `);
    console.log("Public read policy for 'blog-images' bucket ensured.");

    //  Add admin write policy for storage if needed (using ADMIN_ALLOWED_EMAIL)
    await pool.query(`DROP POLICY IF EXISTS "Admin Write Access for blog-images" ON storage.objects;`); 
    if (adminEmail) {
        await pool.query(`
            CREATE POLICY "Admin Write Access for blog-images"
            ON storage.objects
            FOR ALL -- Corrected from FOR INSERT, UPDATE, DELETE
            USING ( bucket_id = 'blog-images' AND auth.email() = '${adminEmail}' )
            WITH CHECK ( bucket_id = 'blog-images' AND auth.email() = '${adminEmail}' );
        `); // Uncomment CREATE and fix syntax
        console.log("Admin write policy for 'blog-images' bucket ensured.");
    } else {
        console.warn("ADMIN_ALLOWED_EMAIL not set, skipping admin write policy for storage."); 
    }


    console.log(setupMessage); // Log final success

  } catch (sqlError: unknown) {
    setupMessage = "Error during blog database validation/setup"; // Update message on error
    console.error(`${setupMessage}:`, sqlError);
    const errorMessage = sqlError instanceof Error ? sqlError.message : String(sqlError);
    // No need for explicit rollback as we didn't start a transaction for these DDL commands
    return NextResponse.json(
      { authorized: false, message: setupMessage, details: errorMessage },
      { status: 500 }
    );
  } finally {
    try {
      await pool.end();
    } catch (poolError: unknown) {
      const errorMessage = poolError instanceof Error ? poolError.message : String(poolError);
      console.error("Error ending pool connection:", errorMessage);
      // TODO: Consider adding telemetry for pool error
    }
  }

  // If all checks passed (auth and DB setup)
  return NextResponse.json({ authorized: true, message: setupMessage }); // Include setup message on success
}
