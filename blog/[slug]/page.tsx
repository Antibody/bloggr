// app/blog/[slug]/page.tsx
import React from 'react';
import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { cookies } from 'next/headers';
import type { Metadata, ResolvingMetadata } from 'next';
import BlogPostPageClient from './BlogPostPageClient'; // Import a client component

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Define the structure for the post data fetched from Supabase
interface PostContent {
  title: string;
  content: string; // HTML content
  published_at: string; // ISO date string
} 



// Fetch metadata from Supabase 

type MetadataProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any; // Use any type for params WITH disabled eslint rule from above
  // searchParams: { [key: string]: string | string[] | undefined }; // If needed
};

export async function generateMetadata(
  { params }: MetadataProps,
  _parent: ResolvingMetadata 
): Promise<Metadata> {
  // Await params to handle potential runtime promise behavior
  const resolvedParams = await params;
  const { slug } = resolvedParams;
  const cookieStore = await cookies(); // Await cookies

  try {
    const supabase = createSupabaseServerClient(cookieStore); // Create client
    const { data: postMetadata, error } = await supabase
      .from('blog_posts')
      .select('title, description, keywords') // Select metadata fields
      .eq('slug', slug)
      .single();

    if (error || !postMetadata) {
      console.error(`Failed to fetch metadata for slug "${slug}":`, error);
      // Return default metadata or trigger notFound if preferred
      return {
        title: 'Blog Post Not Found',
        description: 'Could not load metadata for this blog post.',
      };
    }

    // Construct metadata object for Next.js
    return {
      title: postMetadata.title || slug, // slug as a fallback title
      description: postMetadata.description || 'Default blog post description', 
      keywords: postMetadata.keywords?.split(',').map((k: string) => k.trim()) || [], 
     
    };
  } catch (error) {
    console.error(`Error generating metadata for slug "${slug}":`, error);
    return {
      title: 'Error Loading Post',
      description: 'There was an error loading metadata for this blog post.',
    };
  }
}



// ## Fetch Post Content Function 
async function getPostContent(slug: string): Promise<PostContent | null> {
  const cookieStore = await cookies(); // Await cookies
  try {
    const supabase = createSupabaseServerClient(cookieStore); // Create client
    const { data, error } = await supabase
      .from('blog_posts')
      .select('title, content, published_at') // Select content fields from "blog_posts" Supabase table
      .eq('slug', slug)
      .single();

    if (error) {
      console.error(`Supabase error fetching content for slug "${slug}":`, error);
      
      return null;
    }
    return data as PostContent; // Cast to expected type

  } catch (error) {
    console.error(`Error fetching post content for slug "${slug}":`, error);
    return null;
  }
}

// ##  BlogPostPage Component (Server)
// Adjust params type to be more flexible, similar to generateMetadata
export default async function BlogPostPage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  { params }: { params: any } // Use 'any' or a more specific Promise-like type if preferred
) {
  // Await params to handle potential runtime promise behavior, even if it resolves immediately here
  const resolvedParams = await params;
  const { slug } = resolvedParams;

  const post = await getPostContent(slug);

  if (!post) {
    notFound(); // Trigger 404 if post data couldn't be fetched
  }

  // Render the client component, passing fetched data and slug as props
  return <BlogPostPageClient post={post} slug={slug} />;
}


