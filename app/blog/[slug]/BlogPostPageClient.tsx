//  app/blog/[slug]/BlogPostPageClient.tsx
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link'; // Import Link for Back to Blog link

//  PostContent is defined and exported from the server component 
interface PostContent {
  title: string;
  content: string; // HTML content
  published_at: string; // ISO date string
}

interface BlogPostPageClientProps {
  post: PostContent;
  slug: string; // Pass slug for potential future use 
}

export default function BlogPostPageClient({ post }: BlogPostPageClientProps) {
  //  Theme State and Logic 
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.body.classList.contains('dark-mode');
    }
    return true; // Default for SSR
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.body.classList.toggle("dark-mode", isDark);
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };
  //  End Theme State and Logic 

  return (
    // A wrapper div for positioning the theme button relative to the page
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Theme Toggle Button - Moved outside article, positioned top-right of the page */}
      <button
        onClick={toggleTheme}
        style={{
          position: "fixed", 
          top: "1rem", 
          right: "1rem",
          background: "none",
          border: "none",
          cursor: "pointer",
          outline: "none",
          padding: 0,
          lineHeight: 0,
          color: isDark ? "#FFF" : "#333", 
          zIndex: 999, 
        }}
        aria-label={isDark ? "Activate Light Mode" : "Activate Dark Mode"}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          {isDark ? (
            // Sun icon
            <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM12 15c-1.65 0-3-1.35-3-3s1.35-3 3-3 3 1.35 3 3-1.35 3-3 3zM1 11h3v2H1zM11 1h2v3h-2zM11 20h2v3h-2zM4.22 5.64l1.42-1.42l1.41 1.41l-1.42 1.42zM16.95 18.36l1.42-1.42l1.41 1.41l-1.42 1.42zM20 11h3v2h-3zM3.51 18.36l1.41-1.41l1.42 1.42l-1.41 1.41zM16.95 5.64l1.41-1.41l1.42 1.42l-1.41 1.41z"/>
          ) : (
            // Moon icon
            <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.62-.14 2.37-.36-1.36-.78-2.37-2.17-2.37-3.79 0-2.48 2.02-4.5 4.5-4.5 1.62 0 3.01 1.01 3.79 2.37.22-.75.36-1.54.36-2.37 0-4.97-4.03-9-9-9z"/>
          )}
        </svg>
      </button>

      
       {/* Sticky Footer Snippet */}
  
<div
  style={{
    position: "relative",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
  }}
>
  {/* Article content */}
  <article
    className="post-content prose dark:prose-invert py-8 px-4"
    style={{ width: "80%", margin: "0 auto" }}
  >
    {/* Center the post title */}
    <h1 style={{ textAlign: "center" }}>{post.title}</h1>

    {/* Display publish date */}
    <p
      className="text-sm text-gray-500 dark:text-gray-400"
      style={{ textAlign: "center" }}
    >
      Published on: {new Date(post.published_at).toLocaleDateString()}
    </p>

    <hr className="my-4" />

    {/* Render the fetched HTML content */}
    <div dangerouslySetInnerHTML={{ __html: post.content }} />

    {/* Back to Blog Link */}
    <p style={{ marginTop: "1rem", textAlign: "center" }}>
      <Link
        href="/blog"
        style={{
          textDecoration: "none",
          padding: "0.5rem 1rem",
          border: "1px solid rgba(128, 128, 128, 0.3)",
          borderRadius: "4px",
          transition: "background-color 0.2s, border-color 0.2s",
          display: "inline-block",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "rgba(128, 128, 128, 0.1)";
          e.currentTarget.style.borderColor = "rgba(128, 128, 128, 0.5)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent";
          e.currentTarget.style.borderColor = "rgba(128, 128, 128, 0.3)";
        }}
      >
        &larr; Back to Blog
      </Link>
    </p>
  </article>

  <style jsx global>{`
    /* Override globals.css to cap image height inside this article */
    .post-content img {
      max-height: 800px !important;
      width: auto;
      height: auto;
    }
  `}</style>

  {/* Sticky Footer – always at bottom-right */}
  <footer
    style={{
      marginTop: "auto",
      padding: "1rem",
      fontSize: "0.8rem",
      textAlign: "right",
      width: "100%",
      color: isDark ? "#ccc" : "#555",
    }}
  >
    Powered by{" "}
    <Link
      href="https://bloggr.dev"
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: "inherit", textDecoration: "none" }}
    >
      Bloggr
    </Link>
  </footer>
</div>


          {/* End Sticky Footer  */}

    </div> 
  );
}
