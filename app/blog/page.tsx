import Header, { Footer } from "@/components/Header";
import { getSiteSettings } from "@/lib/site";
import { getPublicPosts, getPublicTopics } from "@/lib/public-posts";
import BlogPageClient from "./BlogPageClient";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Stories",
  alternates: { canonical: "/blog" },
};
export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; tag?: string }>;
}) {
  const query = await searchParams;
  const search = typeof query.q === "string" ? query.q.slice(0, 200) : "";
  const tag = typeof query.tag === "string" ? query.tag.slice(0, 80) : "";
  const [settings, result, topics] = await Promise.all([
    getSiteSettings(),
    getPublicPosts({ page: Math.max(1, Number(query.page) || 1), search, tag }),
    getPublicTopics().catch(() => []),
  ]);
  return (
    <>
      <Header settings={settings} />
      <BlogPageClient
        {...result}
        settings={settings}
        search={search}
        tag={tag}
        topics={topics}
      />
      <Footer settings={settings} />
    </>
  );
}
