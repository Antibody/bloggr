import Link from "next/link";
import type { Post, SiteSettings } from "@/lib/types";
import BlogPostPreview from "./BlogPostPreview";
import PostResults from "@/components/PostResults";
export default function BlogPageClient({
  posts,
  settings,
  totalPages,
  currentPage,
  error,
  configured,
  search,
  tag,
  topics,
}: {
  posts: Post[];
  settings: SiteSettings;
  totalPages: number;
  currentPage: number;
  error: string | null;
  configured: boolean;
  search: string;
  tag: string;
  topics: string[];
}) {
  const href = (page: number, topic = tag) => {
    const query = new URLSearchParams();
    if (search) query.set("q", search);
    if (topic) query.set("tag", topic);
    if (page > 1) query.set("page", String(page));
    return `/blog${query.size ? `?${query}` : ""}`;
  };
  return (
    <main id="main-content" className="shell page-main">
      <header className="page-heading">
        <span className="eyebrow">The journal</span>
        <h1>Stories worth your time.</h1>
        <p>{settings.description}</p>
      </header>
      <form action="/blog" className="search-form" role="search">
        <label htmlFor="story-search" className="sr-only">
          Search stories
        </label>
        <input
          id="story-search"
          name="q"
          type="search"
          placeholder="Search stories"
          defaultValue={search}
        />
        {tag && <input type="hidden" name="tag" value={tag} />}
        <button type="submit" className="button">
          Search
        </button>
      </form>
      {topics.length > 0 && (
        <nav className="topics" aria-label="Filter by topic">
          <Link
            className={!tag ? "pill selected" : "pill"}
            href={href(1, "")}
            aria-current={!tag ? "page" : undefined}
          >
            All stories
          </Link>
          {topics.map((topic) => (
            <Link
              key={topic}
              href={href(1, topic)}
              className={tag === topic ? "pill selected" : "pill"}
              aria-current={tag === topic ? "page" : undefined}
            >
              {topic}
            </Link>
          ))}
        </nav>
      )}
      <PostResults
        error={error}
        configured={configured}
        empty={!posts.length}
        filtered={!!(search || tag)}
      />
      <div className="story-grid">
        {posts.map((post) => (
          <BlogPostPreview key={post.id} post={post} settings={settings} />
        ))}
      </div>
      {totalPages > 1 && (
        <nav className="pagination" aria-label="Story pages">
          {currentPage > 1 ? (
            <Link className="button" href={href(currentPage - 1)}>
              ← Newer
            </Link>
          ) : (
            <span />
          )}
          <span>
            Page {currentPage} of {totalPages}
          </span>
          {currentPage < totalPages ? (
            <Link className="button" href={href(currentPage + 1)}>
              Older →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </main>
  );
}
