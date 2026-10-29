import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Header, { Footer } from "@/components/Header";
import { getSiteSettings } from "@/lib/site";
import { getAuthorBySlug, getPublicPosts } from "@/lib/public-posts";
import BlogPostPreview from "../../BlogPostPreview";
export const dynamic = "force-dynamic";
type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
};
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const author = await getAuthorBySlug(slug);
  if (!author) return { title: "Author not found", robots: { index: false } };
  return {
    title: author.display_name,
    description: author.bio || `Stories by ${author.display_name}`,
    alternates: { canonical: `/blog/author/${author.slug}` },
  };
}
export default async function AuthorPage({ params, searchParams }: Props) {
  const [{ slug }, query, settings] = await Promise.all([
    params,
    searchParams,
    getSiteSettings(),
  ]);
  const author = await getAuthorBySlug(slug);
  if (!author) notFound();
  const result = await getPublicPosts({
    author: author.user_id,
    page: Number(query.page) || 1,
  });
  return (
    <>
      <Header settings={settings} />
      <main id="main-content" className="shell page-main">
        <Link href="/blog" className="back-link">
          ← All stories
        </Link>
        <header className="page-heading">
          {author.avatar_url && (
            <Image
              src={author.avatar_url}
              alt=""
              width={80}
              height={80}
              className="author-avatar"
              unoptimized
            />
          )}
          <p className="eyebrow">Author</p>
          <h1>{author.display_name}</h1>
          {author.bio && <p className="author-bio">{author.bio}</p>}
        </header>
        {result.error ? (
          <div className="notice" role="alert">
            <p>{result.error}</p>
            <Link href={`/blog/author/${author.slug}`} className="button">
              Try again
            </Link>
          </div>
        ) : (
          <>
            {result.posts.length ? (
              <div className="story-grid">
                {result.posts.map((post) => (
                  <BlogPostPreview
                    key={post.id}
                    post={post}
                    settings={settings}
                  />
                ))}
              </div>
            ) : (
              <p className="notice">No stories on this page.</p>
            )}
            {(result.totalPages > 1 || result.currentPage > 1) && (
              <nav
                className="pagination"
                aria-label="Author stories pagination"
              >
                {result.currentPage > 1 ? (
                  <Link
                    className="button"
                    href={`?page=${result.currentPage - 1}`}
                  >
                    ← Newer
                  </Link>
                ) : (
                  <span />
                )}
                <span>
                  Page {result.currentPage}
                  {result.totalPages > 0 ? ` of ${result.totalPages}` : ""}
                </span>
                {result.currentPage < result.totalPages ? (
                  <Link
                    className="button"
                    href={`?page=${result.currentPage + 1}`}
                  >
                    Older →
                  </Link>
                ) : (
                  <span />
                )}
              </nav>
            )}
          </>
        )}
      </main>
      <Footer settings={settings} />
    </>
  );
}
