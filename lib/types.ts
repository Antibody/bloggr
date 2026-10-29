export interface SiteSettings {
  title: string;
  description: string;
  accent: string;
  logo_url: string;
  locale: string;
  timezone: string;
  home_mode: "publication" | "landing";
  social_url: string;
  navigation?: { label: string; href: string }[];
  typography?: "editorial" | "modern" | "classic";
}
export interface PostDraft {
  title: string;
  htmlContent: string;
  date: string;
  seoDescription: string;
  seoKeywords: string;
  excerpt: string;
  coverImage: string;
  coverAlt: string;
  tags: string[];
  authorName: string;
  coverCaption?: string;
}
export interface Post {
  id: string;
  slug: string;
  title: string;
  content: string;
  published_at: string;
  description: string | null;
  keywords: string | null;
  excerpt: string;
  cover_image: string;
  cover_alt: string;
  tags: string[];
  author_name: string;
  author_id?: string | null;
  cover_caption?: string;
  status: "draft" | "published";
  version: number;
  deleted_at: string | null;
  draft?: PostDraft;
  updated_at: string;
}
export const emptyDraft = (): PostDraft => ({
  title: "",
  htmlContent: "",
  date: new Date().toISOString(),
  seoDescription: "",
  seoKeywords: "",
  excerpt: "",
  coverImage: "",
  coverAlt: "",
  tags: [],
  authorName: "",
  coverCaption: "",
});
