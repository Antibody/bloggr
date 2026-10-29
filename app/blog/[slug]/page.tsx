import Image from "next/image";
import ArticleToc from "@/components/ArticleToc";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import Header, { Footer } from "@/components/Header";
import PostMeta from "@/components/PostMeta";
import { getSiteSettings } from "@/lib/site";
import {
  getPublicPost,
  getPublicPosts,
  getAuthorById,
  getPublicRedirect,
} from "@/lib/public-posts";
import { readingMinutes, prepareArticle } from "@/lib/content";
import BlogPostPreview from "../BlogPostPreview";
import ShareArticle from "./BlogPostPageClient";
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublicPost(slug);
  if (!post) {
    const target = await getPublicRedirect(slug);
    if (target) permanentRedirect(`/blog/${encodeURIComponent(target)}`);
    notFound();
  }
  return {
    title: post.title,
    description: post.description || post.excerpt,
    keywords: post.keywords?.split(","),
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description || post.excerpt,
      publishedTime: post.published_at,
      authors: post.author_name ? [post.author_name] : undefined,
      images: post.cover_image
        ? [{ url: post.cover_image, alt: post.cover_alt }]
        : undefined,
    },
    twitter: {
      card: post.cover_image ? "summary_large_image" : "summary",
      title: post.title,
      description: post.description || post.excerpt,
      images: post.cover_image ? [post.cover_image] : undefined,
    },
  };
}
export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const [post, settings] = await Promise.all([
    getPublicPost(slug),
    getSiteSettings(),
  ]);
  if (!post) {
    const target = await getPublicRedirect(slug);
    if (target) permanentRedirect(`/blog/${encodeURIComponent(target)}`);
    notFound();
  }
  const [related, author] = await Promise.all([
    getPublicPosts({ tag: post.tags?.[0] }),
    post.author_id ? getAuthorById(post.author_id) : Promise.resolve(null),
  ]);
  const article = prepareArticle(post.content);
  return (
    <>
      <Header settings={settings} />
      <main id="main-content" className="shell article-main">
        <Link href="/blog" className="back-link">
          ← All stories
        </Link>
        <article className="reading-column">
          <header className="article-heading">
            {post.tags?.length > 0 && (
              <div className="topics">
                {post.tags.map((tag) => (
                  <Link
                    key={tag}
                    className="eyebrow"
                    href={`/blog?tag=${encodeURIComponent(tag)}`}
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            )}
            <h1>{post.title}</h1>
            {post.excerpt && <p className="article-deck">{post.excerpt}</p>}
            <PostMeta
              post={post}
              settings={settings}
              minutes={readingMinutes(post.content)}
              authorSlug={author?.slug}
            />
          </header>
          {post.cover_image && (
            <figure className="article-cover">
              <Image
                unoptimized
                src={post.cover_image}
                alt={post.cover_alt || ""}
                width={1200}
                height={750}
                fetchPriority="high"
                loading="eager"
              />
              {post.cover_caption && (
                <figcaption>{post.cover_caption}</figcaption>
              )}
            </figure>
          )}
          <ArticleToc headings={article.toc} />
          {article.html ? (
            <div
              className="prose"
              dangerouslySetInnerHTML={{ __html: article.html }}
            />
          ) : (
            <p className="muted">This story has no text.</p>
          )}
          {author && (
            <aside className="author-profile" aria-label="About the author">
              <h2>
                <Link href={`/blog/author/${author.slug}`}>
                  {author.display_name}
                </Link>
              </h2>
              {author.bio && <p className="author-bio">{author.bio}</p>}
              <Link className="text-link" href={`/blog/author/${author.slug}`}>
                More from {author.display_name} →
              </Link>
            </aside>
          )}
          <ShareArticle />
        </article>
        {related.posts.some((item) => item.id !== post.id) && (
          <section
            className="related-stories"
            aria-labelledby="related-heading"
          >
            <div className="section-heading">
              <h2 id="related-heading">Keep reading</h2>
              <Link className="text-link" href="/blog">
                All stories →
              </Link>
            </div>
            <div className="story-grid">
              {related.posts
                .filter((item) => item.id !== post.id)
                .slice(0, 2)
                .map((item) => (
                  <BlogPostPreview
                    key={item.id}
                    post={item}
                    settings={settings}
                  />
                ))}
            </div>
          </section>
        )}
      </main>
      <Footer settings={settings} />
    </>
  );
}
