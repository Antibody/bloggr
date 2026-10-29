import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/blog/admin", "/blog/login", "/api/"],
    },
    sitemap: base ? `${base}/sitemap.xml` : undefined,
  };
}
