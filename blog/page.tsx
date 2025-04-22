// app/blog/page.tsx - Server Component
import React from "react";
// Link is not used directly here anymore, can be removed if not needed elsewhere
// import Link from "next/link";
import { createSupabaseServerClient } from "../../lib/supabase/server"; // Correct import path
import { headers, cookies } from "next/headers";
import BlogPageClient from "./BlogPageClient"; // Import the new client component

// Rename our custom page props interface to avoid conflicts and update searchParams type
interface BlogPageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Define the structure for post data fetched from Supabase
export interface PostData {
  slug: string;
  title: string;
  snippet: string | null;
  date: string;
  content: string | null; // Add content field
}

// Interface to type rows coming from Supabase (keep for getPosts)
interface SupabasePost {
  slug: string;
  title: string;
  content: string | null;
  published_at: string;
}

// Helper function to generate a plain text snippet from HTML content
function generateSnippetFromHtml(
  html: string | null | undefined,
  maxLength: number = 250
): string {
  if (!html) return "";

  // Remove HTML tags using a simple regex; may require refinement for complex HTML.
  let text = html.replace(/<[^>]+>/g, " ");
  text = text.replace(/\s+/g, " ").trim();

  if (text.length > maxLength) {
    const truncated = text.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(" ");
    return (lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated) + "...";
  }
  return text.length > 10 ? text : "";
}

// Define return type for getPosts (with pagination info)
interface GetPostsResult {
  posts: PostData[];
  totalPages: number;
  currentPage: number;
}

const POSTS_PER_PAGE = 10;

// Fetch posts from Supabase with pagination
async function getPosts(page: number = 1): Promise<GetPostsResult> {
  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient(cookieStore);

  const currentPage = Math.max(1, page);
  const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
  const endIndex = startIndex + POSTS_PER_PAGE - 1;

  try {
    // Fetch the total count of posts
    const { count, error: countError } = await supabase
      .from("blog_posts")
      .select("*", { count: "exact", head: true });
    if (countError) {
      console.error("Supabase count error (BlogIndexPage):", countError);
      throw new Error(`Failed to count posts: ${countError.message}`);
    }
    const totalCount = count ?? 0;
    const totalPages = Math.ceil(totalCount / POSTS_PER_PAGE);

    // Fetch posts for the current page - ensure 'content' is selected
    const { data, error: postsError } = await supabase
      .from("blog_posts")
      .select("slug, title, content, published_at") // Already selecting content, good.
      .order("published_at", { ascending: false })
      .range(startIndex, endIndex);
    if (postsError) {
      console.error("Supabase fetch error (BlogIndexPage):", postsError);
      throw new Error(`Failed to fetch posts: ${postsError.message}`);
    }

    // Map the fetched posts to our PostData structure
    const postsData: PostData[] =
      (((data as SupabasePost[] | null) ?? [])).map((post: SupabasePost) => ({
        slug: post.slug,
        title: post.title,
        snippet: generateSnippetFromHtml(post.content), // Generate snippet here
        date: post.published_at,
        content: post.content, // Pass the full content
      }));

    return {
      posts: postsData,
      totalPages: totalPages,
      currentPage: currentPage,
    };
  } catch (error) {
    console.error("Error fetching posts:", error);
    return { posts: [], totalPages: 0, currentPage: 1 };
  }
}

export default async function BlogIndexPage({
  searchParams,
}: BlogPageProps) {
  // Await the searchParams promise so its resolved value is used
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const page =
    typeof resolvedSearchParams.page === "string"
      ? parseInt(resolvedSearchParams.page, 10)
      : 1;
  const currentPage = isNaN(page) || page < 1 ? 1 : page;

  const { posts: postsData, totalPages } = await getPosts(currentPage);

  // --- Dynamic Title Logic ---
  let blogTitle = "Blog Posts";
try {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host");
  
  if (host) {
    // Extract hostname without port
    const hostname = host.split(':')[0];
    // List of allowed local hosts
    const isLocalHost = ['localhost', '127.0.0.1'].includes(hostname);

    if (!isLocalHost) {
      const domainName = host.replace(/^www\./i, "").split(".")[0];
      if (domainName) {
        const capitalizedName = 
          domainName.charAt(0).toUpperCase() + domainName.slice(1);
        blogTitle = `${capitalizedName}'s Blog`;
      }
    }
  }
} catch (error) {
  console.warn("Could not determine host for dynamic blog title:", error);
}
  // --- End Dynamic Title Logic ---

  // Render the client component, passing fetched data as props
  return (
    <BlogPageClient
      postsData={postsData}
      totalPages={totalPages}
      currentPage={currentPage}
      blogTitle={blogTitle}
    />
  );
}
