/* eslint-disable @next/next/no-img-element -- Draft media URLs come from the configured storage host. */
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { authorizeWorkspace } from "@/lib/admin";
import { assertPostAccess } from "@/lib/access";
import { HttpError } from "@/lib/validation";
import { sanitizeContent } from "@/lib/content";
import type { PostDraft } from "@/lib/types";
import styles from "@/components/admin/workspace.module.css";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Private draft preview",
  robots: { index: false, follow: false },
};
export default async function PreviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  let client;
  try {
    client = await authorizeWorkspace();
  } catch (error) {
    if (error instanceof HttpError && error.status === 401)
      redirect("/blog/login");
    return (
      <main id="main-content" className={styles.main}>
        <h1>Preview unavailable</h1>
        <p>
          Sign in with publication access and check workspace setup to preview
          this draft.
        </p>
        <Link href="/blog/admin">Back to workspace</Link>
      </main>
    );
  }
  const { slug } = await params;
  const { data: post, error } = await client.db
    .from("blog_posts")
    .select("id,author_id,status")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error("Unable to load draft preview.");
  if (!post) notFound();
  try {
    assertPostAccess(client.actor, post);
  } catch {
    notFound();
  }
  const { data, error: draftError } = await client.db
    .from("blog_post_drafts")
    .select("data")
    .eq("post_id", post.id)
    .maybeSingle();
  if (draftError) throw new Error("Unable to load draft preview.");
  if (!data) notFound();
  const draft = data.data as PostDraft;
  return (
    <div className={styles.workspace}>
      <main id="main-content" className={styles.preview}>
        <div className={styles.notice}>
          <strong>Private draft preview</strong>
          <p>This saved draft is visible only to authorized contributors.</p>
          <Link href="/blog/admin">Back to workspace</Link>
        </div>
        <article>
          <p className={styles.muted}>
            {new Date(draft.date).toLocaleDateString()}{" "}
            {draft.authorName && `· ${draft.authorName}`}
          </p>
          <h1>{draft.title || "Untitled post"}</h1>
          {draft.coverImage && (
            <figure>
              <img src={draft.coverImage} alt={draft.coverAlt} />
            </figure>
          )}
          <div
            className="prose"
            dangerouslySetInnerHTML={{
              __html: sanitizeContent(draft.htmlContent),
            }}
          />
        </article>
      </main>
    </div>
  );
}
