"use client";

{/* app/blog/BlogPageClient.tsx */}
import React, { useState, useEffect } from "react";
import Link from "next/link";
import BlogPostPreview from "./BlogPostPreview";
import { PostData } from "./page"; // Import the updated PostData type

interface BlogPageClientProps {
  postsData: PostData[]; //  includes 'content'
  totalPages: number;
  currentPage: number;
  blogTitle: string;
}

export default function BlogPageClient({
  postsData,
  totalPages,
  currentPage,
  blogTitle,
}: BlogPageClientProps) {
  // ## Theme State and Logic ##
  // Initialize state based on body class set by layout (or default to true if check fails)
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return document.body.classList.contains("dark-mode");
    }
    return true; // Default for SSR or if check fails initially
  });

  // Apply dark mode class to body on theme change
  useEffect(() => {
    if (typeof window !== "undefined") {
      document.body.classList.toggle("dark-mode", isDark);
    }
    // No localStorage persistence here to match app/page.tsx behavior
  }, [isDark]);

  // Toggle dark/light theme
  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };
  // --- End Theme State and Logic ---

  return (
    // Main container 
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "2rem",
        minHeight: "100vh",
        position: "relative", 
      }}
    >
      {/* Theme Toggle Button at top-right */}
      <button
        onClick={toggleTheme}
        style={{
          position: "absolute",
          top: "1rem",
          right: "1rem",
          background: "none",
          border: "none",
          cursor: "pointer",
          outline: "none",
          padding: 0,
          lineHeight: 0,
          color: isDark ? "#FFF" : "#333", 
          zIndex: 1000,
        }}
        aria-label={isDark ? "Activate Light Mode" : "Activate Dark Mode"}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          {isDark ? (
            // Sun icon
            <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM12 15c-1.65 0-3-1.35-3-3s1.35-3 3-3 3 1.35 3 3-1.35 3-3 3zM1 11h3v2H1zM11 1h2v3h-2zM11 20h2v3h-2zM4.22 5.64l1.42-1.42l1.41 1.41l-1.42 1.42zM16.95 18.36l1.42-1.42l1.41 1.41l-1.42 1.42zM20 11h3v2h-3zM3.51 18.36l1.41-1.41l1.42 1.42l-1.41 1.41zM16.95 5.64l1.41-1.41l1.42 1.42l-1.41 1.41z" />
          ) : (
            // Moon icon
            <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.62-.14 2.37-.36-1.36-.78-2.37-2.17-2.37-3.79 0-2.48 2.02-4.5 4.5-4.5 1.62 0 3.01 1.01 3.79 2.37.22-.75.36-1.54.36-2.37 0-4.97-4.03-9-9-9z" />
          )}
        </svg>
      </button>

      {/* Center the main blog title */}
      <h1 style={{ marginBottom: "2rem", textAlign: "center" }}>{blogTitle}</h1>

      {postsData.length === 0 ? (
        <p>No blog posts found.</p>
      ) : (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            maxWidth: "700px", 
            width: "100%", 
            margin: "0 auto", // Keep centered margin
          }}
        >
          {postsData.map((post) => (
            <BlogPostPreview
              key={post.slug}
              slug={post.slug}
              title={post.title}
              snippet={post.snippet ?? ""}
              date={post.date}
            >
              {/* Pass the actual content string as children */}
              {/* FullPostContent will be used inside BlogPostPreview to render this when expanded */}
              {post.content}
            </BlogPostPreview>
          ))}
        </ul>
      )}

      {/* Pagination  */}
      {totalPages > 1 && (
        <div
          className="pagination-controls" 
          style={{
            marginTop: "3rem", 
            display: "flex",
            justifyContent: "center", 
            alignItems: "center",
            gap: "1rem", 
            width: "80%", // Match content width
            maxWidth: "700px", // Match content max-width
            padding: "1rem 0", 
            borderTop: "1px solid rgba(128, 128, 128, 0.2)", // A subtle top border
          }}
        >
          {currentPage > 1 ? (
            <Link
              href={`/blog?page=${currentPage - 1}`}
              style={{
                textDecoration: "none", 
                padding: "0.5rem 1rem",
                border: "1px solid rgba(128, 128, 128, 0.3)",
                borderRadius: "4px",
                transition: "background-color 0.2s, border-color 0.2s",
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
              &larr; Previous
            </Link>
          ) : (
            <span
              style={{
                padding: "0.5rem 1rem",
                border: "1px solid transparent", 
                color: "#aaa",
                cursor: "not-allowed",
              }}
            >
              &larr; Previous
            </span>
          )}

          <span style={{ fontStyle: "italic", margin: "0 1rem" }}>
            Page {currentPage} of {totalPages}
          </span>

          {currentPage < totalPages ? (
            <Link
              href={`/blog?page=${currentPage + 1}`}
              style={{
                textDecoration: "none", 
                padding: "0.5rem 1rem",
                border: "1px solid rgba(128, 128, 128, 0.3)",
                borderRadius: "4px",
                transition: "background-color 0.2s, border-color 0.2s",
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
              Next &rarr;
            </Link>
          ) : (
            <span
              style={{
                padding: "0.5rem 1rem",
                border: "1px solid transparent", 
                color: "#aaa",
                cursor: "not-allowed",
              }}
            >
              Next &rarr;
            </span>
          )}
        </div>
      )}

      {/* Back to Home Link  */}
      <p style={{ marginTop: "1rem", textAlign: "center" }}>
        <Link
          href="/"
          style={{
            textDecoration: "none", 
            padding: "0.5rem 1rem",
            border: "1px solid rgba(128, 128, 128, 0.3)",
            borderRadius: "4px",
            transition: "background-color 0.2s, border-color 0.2s",
            display: "inline-block", // Needed for padding/border
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
          &larr; Back to Home
        </Link>
      </p>

      {/* Sticky Footer Snippet */}
          <footer
            style={{
              marginTop: "auto",
              fontSize: "0.8rem",
              textAlign: "right",
              width: "100%",
              padding: "1rem",
              color: isDark ? "#555" : "#ccc", // light grey in dark mode, darker grey in light mode
            }}
          >
            Powered by{" "}
            <Link
              href="https://bloggr.dev"
              target="_blank"
              rel="noopener"
              style={{ color: "inherit", textDecoration: "none" }} // inherit color for the link text
            >
              Bloggr
            </Link>
          </footer>
          {/* End Sticky Footer  */}
        </div>
      );
  }
