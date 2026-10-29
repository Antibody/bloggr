import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main-content" className="shell status-page">
      <span className="eyebrow">404 · Page not found</span>
      <h1>This story isn’t here.</h1>
      <p>The address may have changed, or the story may not be published.</p>
      <Link className="button primary" href="/blog">
        Explore the stories →
      </Link>
    </main>
  );
}
