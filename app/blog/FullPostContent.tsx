// app/blog/FullPostContent.tsx
// This is a synchronous Client Component to render HTML content

import React from 'react';

interface FullPostContentProps {
  htmlContent: string | null; // Accept HTML content directly
}

// Main component that renders the passed HTML
export default function FullPostContent({ htmlContent }: FullPostContentProps) {

  if (htmlContent === null || typeof htmlContent !== 'string') {
    // Handle case where content is missing or invalid
    // TODO: add want a more specific error message 
    return <p style={{ fontStyle: 'italic', color: '#888' }}>Full content not available.</p>;
  }

  // Render the fetched HTML content using dangerouslySetInnerHTML
  {/* !!! Using unsanitized dangerouslySetInnerHTML requires trusting the HTML source !!! */}
  return (
    <div className="prose dark:prose-invert max-w-none" // Keep prose classes for styling
         dangerouslySetInnerHTML={{ __html: htmlContent }} />
  );
}
