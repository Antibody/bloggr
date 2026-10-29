"use client";
import Link from "next/link";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main id="main-content" className="shell status-page">
      <span className="eyebrow">A little interruption</span>
      <h1>This page couldn’t be loaded.</h1>
      <p>
        Please try again. Your next story will be here when the connection
        returns.
      </p>
      <div className="action-row">
        <button className="button primary" onClick={reset}>
          Try again
        </button>
        <Link className="button" href="/blog">
          All stories
        </Link>
      </div>
    </main>
  );
}
