// app/api/admin/posts/[slug]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server"; 
import { cookies } from "next/headers";
import { sendTelemetryEvent } from "@/lib/telemetry";
import { performance } from "perf_hooks";

// Define the structure for the full post data expected by the frontend
interface PostData {
  slug: string;
  title: string;
  date: string; // ISO format
  htmlContent: string;
  seoKeywords?: string;
  seoDescription?: string;
}

// ## GET Handler ###
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!slug) {
    return NextResponse.json({ error: "Missing slug parameter" }, { status: 400 });
  }

  try {
    // Await the cookies() call so that a proper cookie store is passed.
    const cookieStore = await cookies();
    const supabase = createSupabaseAdminClient(cookieStore);
    const { data, error } = await supabase
      .from("blog_posts")
      .select("slug, title, published_at, description, keywords, content")
      .eq("slug", slug)
      .single();

    if (error) {
      // Check if the error is because the post wasn't found
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Post not found" }, { status: 404 });
      }
      console.error("Supabase GET error:", error);
      return NextResponse.json(
        { error: "Failed to fetch post from database", details: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Map database fields to the frontend expected structure
    const postData: PostData = {
      slug: data.slug,
      title: data.title,
      date: data.published_at, // Map published_at to date
      htmlContent: data.content, // Map content to htmlContent
      seoDescription: data.description ?? undefined, // Use ?? for null/undefined check
      seoKeywords: data.keywords ?? undefined,       // Use ?? for null/undefined check
    };
    return NextResponse.json(postData);
  } catch (error) {
    console.error(`Error fetching post ${slug}:`, error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json(
      { error: "Internal Server Error", details: errorMessage },
      { status: 500 }
    );
  }
}

// ## PUT Handler (Update) ##
interface UpdatePostRequestBody {
  title?: string;
  date?: string; // Expecting ISO string format
  htmlContent?: string;
  seoKeywords?: string;
  seoDescription?: string;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const startTime = performance.now();
  let errorMessage: string | null = null;
  let supabaseTime: number | null = null;
  const host = request.headers.get("host") || "unknown";
  const { slug } = await params;

  if (!slug) {
    errorMessage = "Missing slug parameter";
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }

  try {
    // Await cookies() so that the proper cookie store is passed.
    const cookieStore = await cookies();
    const supabase = createSupabaseAdminClient(cookieStore);
    const body: UpdatePostRequestBody = await request.json();
    const { title, date, htmlContent, seoKeywords, seoDescription } = body;

    // Basic validation
    if (!title || !date || typeof htmlContent === "undefined") {
      errorMessage = "Missing title, date, or htmlContent";
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
    // Validate date format
    if (isNaN(Date.parse(date))) {
      errorMessage = "Invalid date format. Expected ISO string.";
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // --- Update in Supabase ---
    const supabaseStartTime = performance.now();
    const { data, error } = await supabase
      .from("blog_posts")
      .update({
        title: title,
        published_at: date,
        content: htmlContent,
        description: seoDescription || null,
        keywords: seoKeywords || null,
        updated_at: new Date().toISOString(), // Explicitly set updated_at
      })
      .eq("slug", slug)
      .select("slug") // Select slug to confirm update occurred
      .single();
    const supabaseEndTime = performance.now();
    supabaseTime = supabaseEndTime - supabaseStartTime;

    if (error) {
      if (error.code === "PGRST116") {
        errorMessage = "Post not found to update";
        return NextResponse.json({ error: errorMessage }, { status: 404 });
      }
      errorMessage = "Failed to update post in database";
      return NextResponse.json({ error: errorMessage, details: error.message }, { status: 500 });
    }

    if (!data) {
      errorMessage = "Post not found to update (no rows matched)";
      return NextResponse.json({ error: errorMessage }, { status: 404 });
    }

    console.log(`Blog post updated successfully in Supabase: ${slug}`);

    // Trigger Vercel Deploy Hook if URL is set (logic commented out)
    const _deployHookUrl = process.env.VERCEL_DEPLOY_HOOK_URL;
    const rebuildMessage = "";

    return NextResponse.json({
      success: true,
      slug: slug,
      operationStatus: "updated",
      rebuildStatus: rebuildMessage.trim() || (_deployHookUrl ? "skipped" : "not configured")
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      errorMessage = "Invalid request body format.";
      return NextResponse.json({ error: errorMessage, details: error.message }, { status: 400 });
    }
    errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ error: "Internal Server Error", details: errorMessage }, { status: 500 });
  } finally {
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    // Send telemetry event regardless of success or failure.
    await sendTelemetryEvent("blog_post_updated", {
      slug: slug,
      domain: host,
      responseTime: responseTime,
      supabaseTime: supabaseTime,
      error: errorMessage,
    });
  }
}

// --- DELETE Handler ---
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!slug) {
    return NextResponse.json({ error: "Missing slug parameter" }, { status: 400 });
  }

  try {
    const cookieStore = await cookies();
    const supabase = createSupabaseAdminClient(cookieStore);
    const { error, count } = await supabase
      .from("blog_posts")
      .delete()
      .eq("slug", slug);

    if (error) {
      console.error(`Supabase delete error for slug "${slug}":`, error);
      return NextResponse.json({ error: "Failed to delete post from database", details: error.message }, { status: 500 });
    }

    if (count === 0) {
      return NextResponse.json({ error: "Post not found to delete" }, { status: 404 });
    }

    console.log(`Blog post deleted successfully from Supabase: ${slug}`);
    const _deployHookUrl = process.env.VERCEL_DEPLOY_HOOK_URL;
    const rebuildMessage = "";

    return NextResponse.json({
      success: true,
      operationStatus: "deleted",
      message: `Post ${slug} deleted.${rebuildMessage}`,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ error: "Internal Server Error", details: errorMessage }, { status: 500 });
  }
}
