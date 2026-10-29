import Link from "next/link";
import type { Post, SiteSettings } from "@/lib/types";
export default function PostMeta({
  post,
  settings,
  minutes,
  authorSlug,
}: {
  post: Post;
  settings: SiteSettings;
  minutes?: number;
  authorSlug?: string;
}) {
  const date = new Date(post.published_at);
  return (
    <div className="post-meta">
      {post.author_name &&
        (authorSlug ? (
          <Link href={`/blog/author/${authorSlug}`}>{post.author_name}</Link>
        ) : (
          <span>{post.author_name}</span>
        ))}
      {!Number.isNaN(date.getTime()) && (
        <time dateTime={post.published_at}>
          {new Intl.DateTimeFormat(settings.locale, {
            dateStyle: "medium",
            timeZone: settings.timezone,
          }).format(date)}
        </time>
      )}
      {minutes && <span>{minutes} min read</span>}
    </div>
  );
}
