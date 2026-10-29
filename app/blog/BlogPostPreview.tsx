import Image from "next/image";
import Link from "next/link";
import type { Post, SiteSettings } from "@/lib/types";
import PostMeta from "@/components/PostMeta";
export default function BlogPostPreview({
  post,
  settings,
  featured = false,
}: {
  post: Post;
  settings: SiteSettings;
  featured?: boolean;
}) {
  return (
    <article className={`story-card${featured ? " featured-story" : ""}`}>
      {post.cover_image && (
        <Link
          href={`/blog/${post.slug}`}
          tabIndex={-1}
          aria-hidden="true"
          className="story-cover"
        >
          <Image
            unoptimized
            src={post.cover_image}
            alt={post.cover_alt || ""}
            loading="lazy"
            width={960}
            height={600}
          />
        </Link>
      )}
      <div className="story-copy">
        {post.tags?.length > 0 && (
          <div className="eyebrow">{post.tags.slice(0, 2).join(" · ")}</div>
        )}
        <h2>
          <Link href={`/blog/${post.slug}`}>{post.title}</Link>
        </h2>
        {(post.excerpt || post.description) && (
          <p className="story-excerpt">{post.excerpt || post.description}</p>
        )}
        <PostMeta post={post} settings={settings} />
        <Link href={`/blog/${post.slug}`} className="read-link">
          Read article <span aria-hidden="true">↗</span>
          <span className="sr-only">: {post.title}</span>
        </Link>
      </div>
    </article>
  );
}
