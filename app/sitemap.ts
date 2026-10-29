import type { MetadataRoute } from "next";
import { sitemapPosts } from "@/lib/public-posts";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (!base) return [];
  const posts = await sitemapPosts();
  return [
    { url: base },
    { url: `${base}/blog` },
    ...posts.map((post) => ({
      url: `${base}/blog/${post.slug}`,
      lastModified: new Date(post.updated_at || post.published_at),
    })),
  ];
}
