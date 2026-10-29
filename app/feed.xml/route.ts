import { publicPostFeed } from "@/lib/public-posts";
import { getSiteSettings } from "@/lib/site";
export const dynamic = "force-dynamic";
const xml = (value: string) =>
  value.replace(
    /[<>&'\"]/g,
    (char) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        "'": "&apos;",
        '"': "&quot;",
      })[char]!,
  );
export async function GET(request: Request) {
  try {
    const [posts, site] = await Promise.all([
      publicPostFeed(),
      getSiteSettings(),
    ]);
    const base = (
      process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin
    ).replace(/\/$/, "");
    const body = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${xml(site.title)}</title><link>${xml(base)}</link><description>${xml(site.description)}</description><language>${xml(site.locale)}</language>${posts.map((post) => `<item><title>${xml(post.title)}</title><link>${xml(`${base}/blog/${post.slug}`)}</link><guid isPermaLink="true">${xml(`${base}/blog/${post.slug}`)}</guid><pubDate>${new Date(post.published_at).toUTCString()}</pubDate><description>${xml(post.excerpt || post.description || "")}</description>${post.tags.map((tag) => `<category>${xml(tag)}</category>`).join("")}</item>`).join("")}</channel></rss>`;
    return new Response(body, {
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response("Feed temporarily unavailable", { status: 503 });
  }
}
