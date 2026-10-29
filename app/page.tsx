import Link from "next/link";
import Header, { Footer } from "@/components/Header";
import PostResults from "@/components/PostResults";
import BlogPostPreview from "./blog/BlogPostPreview";
import { getSiteSettings } from "@/lib/site";
import { getPublicPosts } from "@/lib/public-posts";
export const dynamic = "force-dynamic";
export default async function Home() {
  const [settings, result] = await Promise.all([
    getSiteSettings(),
    getPublicPosts({ page: 1 }),
  ]);
  return (
    <>
      <Header settings={settings} />
      <main id="main-content" className="shell page-main">
        <header className="home-intro">
          <span className="eyebrow">
            {settings.home_mode === "landing"
              ? "A home for your words"
              : "An independent publication"}
          </span>
          <h1>
            {settings.home_mode === "landing"
              ? "More room to read. More room to write."
              : settings.title}
          </h1>
          <p>{settings.description}</p>
          <Link
            href={settings.home_mode === "landing" ? "/blog/admin" : "/blog"}
            className="button primary"
          >
            {settings.home_mode === "landing"
              ? "Start writing"
              : "Explore the stories"}{" "}
            <span aria-hidden="true">↗</span>
          </Link>
        </header>
        {settings.home_mode === "landing" && (
          <section className="feature-grid" aria-label="Publishing with Bloggr">
            <div>
              <span className="eyebrow">01 · Write</span>
              <h2>Find your flow.</h2>
              <p>
                A focused editor with room to think, on your phone or at your
                desk.
              </p>
            </div>
            <div>
              <span className="eyebrow">02 · Publish</span>
              <h2>Make it yours.</h2>
              <p>Your words, your publication, your own space on the web.</p>
            </div>
            <div>
              <span className="eyebrow">03 · Read</span>
              <h2>Stay with the story.</h2>
              <p>
                Thoughtful typography and a quiet reading experience in light
                and dark.
              </p>
            </div>
          </section>
        )}
        <section aria-labelledby="latest-heading">
          <div className="section-heading">
            <h2 id="latest-heading">Latest stories</h2>
            <Link className="text-link" href="/blog">
              View all <span aria-hidden="true">→</span>
            </Link>
          </div>
          <PostResults {...result} empty={!result.posts.length} />
          {result.posts[0] && (
            <BlogPostPreview
              post={result.posts[0]}
              settings={settings}
              featured
            />
          )}
          <div className="story-grid">
            {result.posts.slice(1, 5).map((post) => (
              <BlogPostPreview key={post.id} post={post} settings={settings} />
            ))}
          </div>
        </section>
      </main>
      <Footer settings={settings} />
    </>
  );
}
