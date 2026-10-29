import { sanitizeContent } from "@/lib/content";
export default function FullPostContent({
  htmlContent,
}: {
  htmlContent: string | null;
}) {
  return htmlContent ? (
    <div
      className="prose"
      dangerouslySetInnerHTML={{ __html: sanitizeContent(htmlContent) }}
    />
  ) : (
    <p className="muted">This story has no text.</p>
  );
}
