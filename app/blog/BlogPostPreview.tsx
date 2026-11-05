'use client'; // Mark this as a Client Component

import React, { useState } from 'react'; // Removed Suspense import
import Link from 'next/link';
import FullPostContent from './FullPostContent'; // Import the simplified FullPostContent

interface BlogPostPreviewProps {
  slug: string;
  title: string;
  snippet: string;
  date: string; // Add date prop
  children: React.ReactNode; // Accept children prop
}

export default function BlogPostPreview({ slug, title, snippet, date, children }: BlogPostPreviewProps) { // Destructure date and children
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded); // Simply toggle the state
  };

  // Basic styling for the expanded content area
  const expandedContentStyle: React.CSSProperties = {
    marginTop: '1rem',
    paddingTop: '1rem',
    borderTop: '1px dashed #ccc',
  };

  return (
    <li style={{ marginBottom: '1.5rem', borderBottom: '1px solid #eee', paddingBottom: '1.5rem' }}>
      {/* Title links to the dedicated post page - Reverted alignment */}
      <h2 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' /* Removed textAlign: 'center' */ }}>
        {/* Modernized Link Style: Inherit color, remove underline */}
        <Link href={`/blog/${slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
          {title}
        </Link>
      </h2>
      {/* Display formatted date - Reverted alignment */}
      <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: '0.75rem' /* Removed textAlign: 'center' */ }}>
        {new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
      </p>

      {/* Initial Snippet */}
      {/* Always show snippet unless expanded */}
      {snippet && !isExpanded && (
        <p className="blog-snippet" style={{ margin: '0 0 0.5rem 0' /* Removed fixed color */ }}>
          {snippet}
        </p>
      )}

      {/* Read More / Read Less Button - Centered and Modernized */}
      <button
        onClick={handleToggleExpand}
        style={{
          cursor: 'pointer',
          background: 'none',
          border: 'none',
          color: 'inherit', // Use theme color
          // textDecoration: 'underline', // Remove underline
          padding: '0.25rem 0.5rem', // Add some padding
          fontSize: '0.9rem',
          display: 'block', // Make it block to center
          margin: '0.5rem auto 0', // Center button
          borderRadius: '4px', // Add slight rounding
          // Optional: Add subtle hover effect
          // transition: 'background-color 0.2s',
        }}
        // Add hover inline style (less ideal than CSS classes, but works)
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(128, 128, 128, 0.1)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        {isExpanded ? 'Read Less' : 'Read More'}
      </button>

      {/* Expanded Content Area - Conditionally render FullPostContent with children */}
      {isExpanded && (
        <div style={expandedContentStyle}>
          {/* Render FullPostContent directly, passing the content string (children) */}
          {/* Suspense wrapper removed */}
          <FullPostContent htmlContent={children as string | null} />
           {/* Add a second "Read Less" button at the bottom - Centered and Modernized */}
           <button
             onClick={handleToggleExpand}
             style={{
               cursor: 'pointer',
               background: 'none',
               border: 'none',
               color: 'inherit', // Use theme color
               // textDecoration: 'underline', // Remove underline
               padding: '0.25rem 0.5rem', // Add some padding
               fontSize: '0.9rem',
               marginTop: '1rem', // Add some space above
               display: 'block', // Make it block to center
               margin: '1rem auto 0', // Center button
               borderRadius: '4px', // Add slight rounding
             }}
             onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(128, 128, 128, 0.1)')}
             onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
           >
             Read Less
           </button>
         </div>
       )}
     </li>
  );
}
