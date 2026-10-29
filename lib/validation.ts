import { sanitizeContent, plainText, slugify } from "./content";
import type { PostDraft, SiteSettings } from "./types";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
function text(value: unknown, max: number, fallback = ""): string {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "string" || value.length > max)
    throw new HttpError(400, "A field is invalid or too long.");
  return value.trim();
}
export function safeUrl(value: unknown): string {
  const v = text(value, 2000);
  if (!v) return "";
  try {
    const u = new URL(v);
    if (
      (u.protocol !== "https:" &&
        !(
          process.env.BLOGGR_LOCAL_EXAMPLE === "1" &&
          u.protocol === "http:" &&
          ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname)
        )) ||
      u.username ||
      u.password
    )
      throw 0;
    return u.href;
  } catch {
    throw new HttpError(400, "Use a valid HTTPS URL.");
  }
}
export function parseDraft(value: unknown, publish = false): PostDraft {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new HttpError(400, "Invalid post.");
  const x = value as Record<string, unknown>;
  const title = text(x.title, 200);
  const htmlContent = sanitizeContent(text(x.htmlContent, 500000));
  if (
    publish &&
    (!title || (!plainText(htmlContent) && !htmlContent.includes("<img")))
  )
    throw new HttpError(400, "Add a title and content before publishing.");
  const date = text(x.date, 100);
  if (!date || !Number.isFinite(Date.parse(date)))
    throw new HttpError(400, "Choose a valid publication date.");
  if (x.tags !== undefined && (!Array.isArray(x.tags) || x.tags.length > 12))
    throw new HttpError(400, "Use up to 12 topics.");
  const tags = [
    ...new Set(
      ((x.tags || []) as unknown[]).map((t) => text(t, 40)).filter(Boolean),
    ),
  ];
  return {
    title,
    htmlContent,
    date: new Date(date).toISOString(),
    seoDescription: text(x.seoDescription, 320),
    seoKeywords: text(x.seoKeywords, 500),
    excerpt: text(x.excerpt, 500),
    coverImage: safeUrl(x.coverImage),
    coverAlt: text(x.coverAlt, 300),
    tags,
    authorName: text(x.authorName, 100),
    coverCaption: text(x.coverCaption, 500),
  };
}
export function parseSettings(value: unknown): SiteSettings {
  if (!value || typeof value !== "object")
    throw new HttpError(400, "Invalid settings.");
  const x = value as Record<string, unknown>;
  const title = text(x.title, 100);
  if (!title) throw new HttpError(400, "Publication name is required.");
  const accent = text(x.accent, 7);
  if (!/^#[0-9a-f]{6}$/i.test(accent))
    throw new HttpError(400, "Choose a valid accent color.");
  const locale = text(x.locale, 40) || "en";
  const timezone = text(x.timezone, 100) || "UTC";
  try {
    new Intl.DateTimeFormat(locale, { timeZone: timezone });
  } catch {
    throw new HttpError(400, "Invalid locale or time zone.");
  }
  if (!["publication", "landing"].includes(String(x.home_mode)))
    throw new HttpError(400, "Invalid homepage choice.");
  return {
    title,
    description: text(x.description, 500),
    accent,
    logo_url: safeUrl(x.logo_url),
    social_url: safeUrl(x.social_url),
    locale,
    timezone,
    home_mode: x.home_mode as SiteSettings["home_mode"],
    typography:
      x.typography === undefined
        ? "editorial"
        : ["editorial", "modern", "classic"].includes(String(x.typography))
          ? (x.typography as SiteSettings["typography"])
          : (() => {
              throw new HttpError(400, "Choose a valid typography preset.");
            })(),
    navigation: parseNavigation(x.navigation),
  };
}
export function versionOf(value: unknown): number {
  if (!Number.isSafeInteger(value) || Number(value) < 1)
    throw new HttpError(400, "A valid post version is required.");
  return Number(value);
}

function parseNavigation(value: unknown): { label: string; href: string }[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 6)
    throw new HttpError(400, "Use up to six navigation links.");
  return value.map((item) => {
    if (!item || typeof item !== "object")
      throw new HttpError(400, "Invalid navigation link.");
    const label = text(item.label, 40),
      href = text(item.href, 500);
    if (!label || !href)
      throw new HttpError(
        400,
        "Navigation links need a label and destination.",
      );
    if (
      href.startsWith("/") &&
      !href.startsWith("//") &&
      !/[\\\u0000-\u0020]/.test(href)
    )
      return { label, href };
    return { label, href: safeUrl(href) };
  });
}

export const reservedSlugs = new Set([
  "admin",
  "login",
  "api",
  "preview",
  "author",
  "reset-password",
]);
export function postSlug(value: unknown): string {
  if (typeof value !== "string" || value.length > 200)
    throw new HttpError(400, "Choose a valid permalink.");
  const slug = slugify(value);
  if (!slug || reservedSlugs.has(slug))
    throw new HttpError(
      400,
      "This address is reserved. Choose a different permalink.",
    );
  return slug;
}
