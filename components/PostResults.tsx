import Link from "next/link";
import RetryButton from "./RetryButton";
export default function PostResults({
  error,
  configured,
  empty,
  filtered = false,
}: {
  error: string | null;
  configured: boolean;
  empty: boolean;
  filtered?: boolean;
}) {
  if (!configured)
    return (
      <section className="notice">
        <span className="eyebrow">A new beginning</span>
        <h2>A space for stories.</h2>
        <p>
          This publication is getting ready. Check back for the first story.
        </p>
        <Link href="/blog/admin" className="text-link">
          Set up your publication →
        </Link>
      </section>
    );
  if (error)
    return (
      <section className="notice" role="alert">
        <h2>Stories couldn’t be loaded.</h2>
        <p>Please try again in a moment.</p>
        <RetryButton />
      </section>
    );
  if (empty)
    return (
      <section className="notice">
        <h2>
          {filtered
            ? "No matching stories."
            : "The first story is still to come."}
        </h2>
        <p>
          {filtered
            ? "Try a different search or explore all stories."
            : "Good things take a little time. Come back soon."}
        </p>
        {filtered && (
          <Link className="text-link" href="/blog">
            Clear filters →
          </Link>
        )}
      </section>
    );
  return null;
}
