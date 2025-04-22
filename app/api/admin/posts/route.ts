import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseClient'; // Import Supabase server client

// Define the structure for post metadata to be returned
interface PostListItem {
  slug: string;
  title: string;
  date: string; // Keep date as string (ISO format from published_at)
}


export async function GET(_request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();

    // Fetch necessary fields from Supabase, ordered by published_at descending
    const { data, error } = await supabase
      .from('blog_posts')
      .select('slug, title, published_at')
      .order('published_at', { ascending: false });

    if (error) {
      console.error('Supabase fetch error:', error);
      return NextResponse.json({ error: "Failed to fetch posts from database", details: error.message }, { status: 500 });
    }

    // Map the data to the expected PostListItem structure
    // published_at is treated as a string 
    const postsData: PostListItem[] = data.map(post => ({
      slug: post.slug,
      title: post.title,
      date: post.published_at, 
    }));

    return NextResponse.json({ posts: postsData });

  } catch (error) {
    console.error('Error fetching posts:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ error: "Internal Server Error", details: errorMessage }, { status: 500 });
  }
}
