import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server'; 
import { cookies } from "next/headers"; // Keep cookies import, remove headers
import { sendTelemetryEvent } from '@/lib/telemetry'; // alias path for telemetry helper
import { performance } from 'perf_hooks'; // Import performance for timing

// Basic slugify function 
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text
}

interface CreatePostRequestBody {
  title?: string;
  htmlContent?: string;
  slug?: string;
  date?: string; 
  seoKeywords?: string;
  seoDescription?: string;
}

export async function POST(request: NextRequest) {
  const startTime = performance.now();
  let errorMessage: string | null = null;
  let supabaseTime: number | null = null;
  // Get host from request object instead of headers() helper
  const host = request.headers.get('host') || 'unknown';

  try {
    // Add await back to cookies() call
    const cookieStore = await cookies();
    const supabase = createSupabaseAdminClient(cookieStore); // Use admin client
    const body: CreatePostRequestBody = await request.json();
    const { title, htmlContent, slug: providedSlug, date, seoKeywords, seoDescription } = body;

    // Validate required fields (title, htmlContent, date)
    if (!title || !htmlContent || !date) {
      // Set error message before returning for telemetry
      errorMessage = "Missing title, content, or date";
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
    // Basic date validation 
    if (isNaN(Date.parse(date))) {
        // Set error message before returning for telemetry
        errorMessage = "Invalid date format provided. Expected ISO string.";
        return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // Generate slug from title if not provided, or use the provided one
    const slug = providedSlug ? slugify(providedSlug) : slugify(title);
    if (!slug) {
        // Set error message before returning for telemetry
        errorMessage = "Could not generate a valid slug from the title";
        return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // ## Insert into Supabase#####
    const supabaseStartTime = performance.now();
    const { data: insertedData, error: insertError } = await supabase
      .from('blog_posts')
      .insert([
        {
          title: title,
          slug: slug,
          published_at: date, // Use the date from the request body
          description: seoDescription || null, // Use null if undefined/empty string
          keywords: seoKeywords || null,       // Use null if undefined/empty string
          content: htmlContent,
          
        },
      ])
      .select('slug') // Select the slug back to confirm insertion
      .single(); // Expecting a single row insertion
    const supabaseEndTime = performance.now();
    supabaseTime = supabaseEndTime - supabaseStartTime;

    if (insertError) {
      errorMessage = `Supabase insert error: ${insertError.message}`;
      console.error(errorMessage, insertError);
      // Check for unique constraint violation (e.g., duplicate slug)
      if (insertError.code === '23505') { // PostgreSQL unique violation code
         // Set specific error message for telemetry
        errorMessage = "A post with this slug already exists.";
        return NextResponse.json({ error: errorMessage, details: insertError.message }, { status: 409 }); // Duplication Conflict
      }
       // Set the general error message for telemetry
      errorMessage = "Failed to save post to database";
      return NextResponse.json({ error: errorMessage, details: insertError.message }, { status: 500 });
    }

    console.log(`Blog post created successfully in Supabase. Slug: ${insertedData?.slug}`);

    // Trigger Vercel Deploy Hook if URL is set
    let rebuildMessage = '';
    const deployHookUrl = process.env.VERCEL_DEPLOY_HOOK_URL;
    if (deployHookUrl) {
      try {
        console.log('Triggering Vercel deploy hook...');
        // No need to wait for the fetch to complete
        fetch(deployHookUrl, { method: 'POST' });
        rebuildMessage = ' Vercel rebuild triggered.';
        console.log('Vercel deploy hook triggered successfully.');
      } catch (hookError) {
        console.error('Failed to trigger Vercel deploy hook:', hookError);
        rebuildMessage = ' Failed to trigger Vercel rebuild.'; // Inform frontend about failure
      }
    } else {
      console.warn('VERCEL_DEPLOY_HOOK_URL environment variable not set. Skipping rebuild trigger.');
    }

    // Return structured success response
    return NextResponse.json({
      success: true,
      slug: insertedData?.slug,
      operationStatus: 'created',
      rebuildStatus: rebuildMessage.trim() || (deployHookUrl ? 'skipped' : 'not configured') 
    });

  } catch (error) {
    errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    console.error('Error in create-post handler:', error);
    // Check if it's a JSON parsing error from request.json()
    if (error instanceof SyntaxError) {
        // Overwrite generic error message for telemetry
        errorMessage = "Invalid request body format.";
        return NextResponse.json({ success: false, error: errorMessage, details: error.message }, { status: 400 });
    }
     // Overwrite generic error message for telemetry
    errorMessage = "Internal Server Error processing create-post request.";
    return NextResponse.json({ success: false, error: "Internal Server Error", details: errorMessage }, { status: 500 });
  } finally {
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    // Send telemetry event regardless of success or failure
    // Ensure error message is captured correctly before sending
    await sendTelemetryEvent('blog_post_created', {
        domain: host,
        responseTime: responseTime,
        supabaseTime: supabaseTime, // Include Supabase-specific time if available
        error: errorMessage, // Will be null on success, or contain the specific error message
        
    });

    console.log(`Telemetry event sent for blog post creation. Response time: ${responseTime} ms, Supabase time: ${supabaseTime} ms`);
  }
}
