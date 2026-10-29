import sanitizeHtml from "sanitize-html";
import { decodeHTML } from "entities";
export function sanitizeContent(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "p",
      "br",
      "h2",
      "h3",
      "h4",
      "strong",
      "em",
      "u",
      "s",
      "a",
      "ul",
      "ol",
      "li",
      "blockquote",
      "pre",
      "code",
      "hr",
      "img",
      "figure",
      "figcaption",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
    ],
    allowedAttributes: {
      a: ["href", "title"],
      img: ["src", "alt", "width", "height"],
      code: ["class"],
      th: ["colspan", "rowspan"],
      td: ["colspan", "rowspan"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: {
      img:
        process.env.BLOGGR_LOCAL_EXAMPLE === "1"
          ? ["https", "http"]
          : ["https"],
    },
    allowProtocolRelative: false,
    transformTags: {
      img: (tag, attrs) => {
        if (attrs.src && /^http:/i.test(attrs.src)) {
          try {
            const u = new URL(attrs.src);
            if (
              process.env.BLOGGR_LOCAL_EXAMPLE !== "1" ||
              !["127.0.0.1", "localhost", "[::1]"].includes(u.hostname) ||
              u.username ||
              u.password
            )
              delete attrs.src;
          } catch {
            delete attrs.src;
          }
        }
        return { tagName: tag, attribs: attrs };
      },
      a: (_tag, attrs) => ({
        tagName: "a",
        attribs: { ...attrs, rel: "noopener noreferrer" },
      }),
    },
  });
}
export function plainText(html: string): string {
  return decodeHTML(
    sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }),
  )
    .replace(/\s+/g, " ")
    .trim();
}
export function readingMinutes(html: string): number {
  return Math.max(1, Math.ceil(plainText(html).split(/\s+/).length / 220));
}
export function slugify(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/[\s-]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

export function prepareArticle(content: string): {
  html: string;
  toc: { id: string; text: string; level: number }[];
} {
  const toc: { id: string; text: string; level: number }[] = [];
  let count = 0;
  const html = sanitizeContent(content).replace(
    /<(h[234])(?:\s[^>]*)?>([\s\S]*?)<\/\1>/g,
    (_match, tag: string, inner: string) => {
      const id = "section-" + ++count;
      toc.push({ id, text: plainText(inner), level: Number(tag.slice(1)) });
      return `<${tag} id="${id}">${inner}</${tag}>`;
    },
  );
  return { html, toc };
}
