"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "./CaptionImage";
import type { WorkspaceRole } from "@/lib/access";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { emptyDraft, type Post, type PostDraft } from "@/lib/types";
import { api, ApiError, downloadJson, errorMessage } from "./api";
import EditorToolbar from "./EditorToolbar";
import MediaLibrary from "./MediaLibrary";
import { postStatus } from "./PostsScreen";
import styles from "./workspace.module.css";
type Recovery = {
  draft: PostDraft;
  id: string;
  slug: string;
  savedAt: string;
  version?: number;
};
type Revision = { id: string; created_at: string; data: PostDraft };
const serial = (draft: PostDraft) => JSON.stringify(draft);
const fromPost = (post: Post): PostDraft =>
  (post.draft ? { ...emptyDraft(), ...post.draft } : null) || {
    title: post.title,
    htmlContent: post.content,
    date: post.published_at,
    seoDescription: post.description || "",
    seoKeywords: post.keywords || "",
    excerpt: post.excerpt || "",
    coverImage: post.cover_image || "",
    coverAlt: post.cover_alt || "",
    coverCaption: post.cover_caption || "",
    tags: post.tags || [],
    authorName: post.author_name || "",
  };
function localDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
}
export default function PostEditor({
  slug,
  onBack,
  ownerId,
  role = "owner",
}: {
  slug: string | null;
  onBack: () => void;
  ownerId: string;
  role?: WorkspaceRole;
}) {
  const [draft, setDraft] = useState<PostDraft>(emptyDraft),
    [post, setPost] = useState<Post | null>(null),
    [ready, setReady] = useState(false);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [saveState, setSaveState] = useState("Unsaved changes"),
    [conflict, setConflict] = useState(false);
  const [recovery, setRecovery] = useState<Recovery | null>(null),
    [storageError, setStorageError] = useState(false),
    [baseline, setBaseline] = useState("");
  const [customSlug, setCustomSlug] = useState(""),
    [review, setReview] = useState(false),
    [media, setMedia] = useState(false),
    [revisions, setRevisions] = useState<Revision[] | null>(null),
    [preview, setPreview] = useState("");
  const [reviewTime, setReviewTime] = useState(0);
  const [replacing, setReplacing] = useState(false);
  const replacingRef = useRef(false);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const postRef = useRef<Post | null>(null),
    draftRef = useRef(draft),
    busyRef = useRef(false),
    idRef = useRef(""),
    slugRef = useRef("");
  const storageKey = `bloggr-draft:${ownerId}:${slug || "new"}`;
  const dirty = serial(draft) !== baseline;
  useEffect(() => {
    const input = titleRef.current;
    if (input) {
      input.style.height = "auto";
      input.style.height = input.scrollHeight + "px";
    }
  }, [draft.title, ready]);
  useEffect(() => {
    draftRef.current = draft;
    slugRef.current = customSlug;
  }, [draft, customSlug]);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: false,
        underline: false,
      }),
      Image,
      Link.configure({ openOnClick: false }),
      Underline,
      Placeholder.configure({ placeholder: "Start your story…" }),
    ],
    immediatelyRender: false,
    content: "",
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-label": "Post content",
        "aria-multiline": "true",
        "data-placeholder": "Start your story…",
      },
    },
    onUpdate: ({ editor: current }) => {
      if (replacingRef.current) return;
      setDraft((old) => ({ ...old, htmlContent: current.getHTML() }));
      setSaveState("Unsaved changes");
      setPreview("");
    },
  });
  useEffect(() => {
    editor?.setEditable(
      ready && !recovery && !post?.deleted_at && !replacing,
      false,
    );
  }, [editor, ready, recovery, post?.deleted_at, replacing]);
  const replaceDraft = useCallback(
    (next: PostDraft) => {
      setDraft(next);
      draftRef.current = next;
      editor?.commands.setContent(next.htmlContent, { emitUpdate: false });
    },
    [editor],
  );
  useEffect(() => {
    if (!editor) return;
    let active = true;
    async function load() {
      setError("");
      setReady(false);
      try {
        let local: Recovery | null = null;
        try {
          const value = localStorage.getItem(storageKey);
          if (value) {
            const parsed = JSON.parse(value);
            if (
              parsed.draft &&
              typeof parsed.draft.htmlContent === "string" &&
              typeof parsed.draft.title === "string"
            )
              local = parsed;
          }
        } catch {
          setStorageError(true);
        }
        const data = slug
          ? await api<{ post: Post }>(
              `/api/admin/posts/${encodeURIComponent(slug)}`,
            )
          : local?.slug
            ? await api<{ post: Post }>(
                `/api/admin/posts/${encodeURIComponent(local.slug)}`,
              )
            : null;
        if (!active) return;
        const saved = data?.post || null;
        if (saved && !local) {
          try {
            const idCopy = localStorage.getItem(
              `bloggr-draft:${ownerId}:id:${saved.id}`,
            );
            if (idCopy) {
              const parsed = JSON.parse(idCopy);
              if (
                parsed.draft &&
                typeof parsed.draft.htmlContent === "string" &&
                typeof parsed.draft.title === "string"
              )
                local = parsed;
            }
          } catch {
            setStorageError(true);
          }
        }
        const next = saved ? fromPost(saved) : emptyDraft();
        idRef.current = saved?.id || local?.id || crypto.randomUUID();
        postRef.current = saved;
        setPost(saved);
        replaceDraft(next);
        setBaseline(serial(next));
        setSaveState(saved ? "Saved" : "New draft");
        if (local && serial(local.draft) !== serial(next)) setRecovery(local);
        setReady(true);
      } catch (e) {
        if (active) setError(errorMessage(e));
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [editor, slug, storageKey, replaceDraft, ownerId]);
  useEffect(() => {
    if (!ready || recovery) return;
    const local: Recovery = {
      draft,
      id: idRef.current,
      slug: post?.slug || "",
      version: post?.version,
      savedAt: new Date().toISOString(),
    };
    try {
      const key = post?.slug
        ? `bloggr-draft:${ownerId}:${post.slug}`
        : storageKey;
      localStorage.setItem(key, JSON.stringify(local));
      localStorage.setItem(
        `bloggr-draft:${ownerId}:id:${idRef.current}`,
        JSON.stringify(local),
      );
      if (post?.slug && !slug) localStorage.removeItem(storageKey);
    } catch {
      queueMicrotask(() => setStorageError(true));
    }
  }, [draft, post, ready, recovery, storageKey, ownerId, slug]);
  useEffect(() => {
    const protect = (event: BeforeUnloadEvent) => {
      if (dirty || busy) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [dirty, busy]);
  const persist = useCallback(
    async (
      action:
        | "save"
        | "publish"
        | "unpublish"
        | "trash"
        | "restore"
        | "revision" = "save",
      revisionId?: string,
    ): Promise<Post | null> => {
      if (busyRef.current || conflict || recovery) return null;
      busyRef.current = true;
      if (action === "revision") {
        replacingRef.current = true;
        editor?.setEditable(false, false);
        setReplacing(true);
      }
      setBusy(true);
      setSaveState("Saving…");
      setError("");
      const snapshot = draftRef.current;
      try {
        let current = postRef.current;
        if (!current) {
          const created = await api<{ post: Post }>("/api/admin/posts", {
            method: "POST",
            body: JSON.stringify({
              draft: snapshot,
              id: idRef.current,
              ...(slugRef.current ? { slug: slugRef.current } : {}),
            }),
          });
          current = created.post;
          postRef.current = current;
          setPost(current);
          // A retried UUID may return an earlier committed create after its response was lost.
          // Confirm this exact snapshot before claiming it was saved.
          if (serial(fromPost(current)) !== serial(snapshot)) {
            if (current.version > 1)
              throw new ApiError(
                "This draft was updated after its first save. Your local text is preserved; load the latest version to choose which draft to keep.",
                409,
              );
            const confirmed = await api<{ post: Post }>(
              `/api/admin/posts/${encodeURIComponent(current.slug)}`,
              {
                method: "PUT",
                body: JSON.stringify({
                  draft: snapshot,
                  version: current.version,
                  action: "save",
                }),
              },
            );
            current = confirmed.post;
            postRef.current = current;
            setPost(current);
          }
        } else if (action !== "publish") {
          if (action !== "save" && action !== "restore") {
            const saved = await api<{ post: Post }>(
              `/api/admin/posts/${encodeURIComponent(current.slug)}`,
              {
                method: "PUT",
                body: JSON.stringify({
                  draft: snapshot,
                  version: current.version,
                  action: "save",
                }),
              },
            );
            current = saved.post;
            postRef.current = current;
            setPost(current);
          }
          const updated = await api<{ post: Post }>(
            `/api/admin/posts/${encodeURIComponent(current.slug)}`,
            {
              method: "PUT",
              body: JSON.stringify({
                draft: snapshot,
                version: current.version,
                action,
                revisionId,
              }),
            },
          );
          current = updated.post;
        }
        if (action === "publish") {
          const published = await api<{ post: Post }>(
            `/api/admin/posts/${encodeURIComponent(current.slug)}`,
            {
              method: "PUT",
              body: JSON.stringify({
                draft: snapshot,
                version: current.version,
                action,
              }),
            },
          );
          current = published.post;
        }
        postRef.current = current;
        setPost(current);
        if (action === "revision" || action === "restore") {
          const next = fromPost(current);
          replaceDraft(next);
          setBaseline(serial(next));
        } else setBaseline(serial(snapshot));
        setSaveState(
          action === "publish"
            ? new Date(current.published_at).getTime() > Date.now()
              ? "Scheduled"
              : "Published"
            : "Saved",
        );
        setConflict(false);
        setReview(false);
        setRevisions(null);
        return current;
      } catch (e) {
        setError(errorMessage(e));
        setSaveState("Save failed");
        if (e instanceof ApiError && e.status === 409 && postRef.current)
          setConflict(true);
        return null;
      } finally {
        busyRef.current = false;
        setBusy(false);
        setReplacing(false);
        replacingRef.current = false;
      }
    },
    [conflict, recovery, replaceDraft, editor],
  );
  useEffect(() => {
    if (
      !ready ||
      recovery ||
      conflict ||
      !dirty ||
      busy ||
      post?.deleted_at ||
      saveState === "Save failed"
    )
      return;
    const timer = setTimeout(() => void persist(), 1500);
    return () => clearTimeout(timer);
  }, [
    draft,
    dirty,
    ready,
    recovery,
    conflict,
    busy,
    post?.deleted_at,
    persist,
    saveState,
  ]);
  function change<K extends keyof PostDraft>(key: K, value: PostDraft[K]) {
    if (replacingRef.current) return;
    setDraft((old) => ({ ...old, [key]: value }));
    setSaveState("Unsaved changes");
    setPreview("");
  }
  async function back() {
    if (busy) return;
    if (dirty && !recovery) {
      const saved = await persist();
      if (
        !saved &&
        !window.confirm(
          "This draft could not be saved to the server. Leave the editor? Download a recovery copy first if browser storage is unavailable.",
        )
      )
        return;
    }
    onBack();
  }
  async function privatePreview() {
    const saved = await persist();
    if (saved)
      setPreview(
        `/blog/preview/${encodeURIComponent(saved.slug)}?v=${saved.version}`,
      );
  }
  async function reload() {
    if (!postRef.current || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setReplacing(true);
    replacingRef.current = true;
    editor?.setEditable(false, false);
    const local: Recovery = {
      draft: draftRef.current,
      id: idRef.current,
      slug: postRef.current.slug,
      savedAt: new Date().toISOString(),
    };
    try {
      const data = await api<{ post: Post }>(
        `/api/admin/posts/${encodeURIComponent(postRef.current.slug)}`,
      );
      postRef.current = data.post;
      setPost(data.post);
      replaceDraft(fromPost(data.post));
      setBaseline(serial(fromPost(data.post)));
      setRecovery(local);
      setConflict(false);
      setError("");
      setSaveState("Saved");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      busyRef.current = false;
      setBusy(false);
      setReplacing(false);
      replacingRef.current = false;
    }
  }
  async function renamePermalink() {
    if (!postRef.current || busyRef.current || recovery || conflict) return;
    const saved = await persist();
    if (!saved) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      const data = await api<{ post: Post }>(
        `/api/admin/posts/${encodeURIComponent(saved.slug)}`,
        {
          method: "PUT",
          body: JSON.stringify({
            action: "rename",
            slug: customSlug,
            version: saved.version,
          }),
        },
      );
      const oldKey = `bloggr-draft:${ownerId}:${saved.slug}`;
      postRef.current = data.post;
      setPost(data.post);
      setCustomSlug("");
      setSaveState(
        "Permalink updated. Previous links redirect to the new address.",
      );
      try {
        localStorage.removeItem(oldKey);
      } catch {
        setStorageError(true);
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  async function loadRevisions() {
    if (!post) return;
    try {
      const data = await api<{ revisions: Revision[] }>(
        `/api/admin/posts/${encodeURIComponent(post.slug)}/revisions`,
      );
      setRevisions(data.revisions);
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  function recover(useLocal: boolean) {
    if (useLocal && recovery) {
      replaceDraft(recovery.draft);
      setSaveState("Unsaved changes");
    }
    setRecovery(null);
  }
  const wordCount = draft.htmlContent
    .replace(/<[^>]*>/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const canPublish =
    role !== "author" &&
    !!draft.title.trim() &&
    (wordCount > 0 || draft.htmlContent.includes("<img"));
  return (
    <section className={styles.editorScreen}>
      <div className={styles.editorTop}>
        <button onClick={() => void back()} disabled={busy}>
          ← Posts
        </button>
        <p className={styles.saveStatus} role="status">
          {dirty && !busy && saveState !== "Save failed"
            ? "Unsaved changes"
            : saveState}
        </p>
        {post && <span className={styles.badge}>{postStatus(post)}</span>}
      </div>
      <h1 className={styles.editorHeading}>
        {post ? "Edit post" : "New post"}
      </h1>
      {error && (
        <div className={styles.notice} role="alert">
          <p>{error}</p>
          {conflict ? (
            <>
              <p>
                Another edit changed this post. Your text is still here.
                Download it, then load the latest version to choose which draft
                to keep.
              </p>
              <div className={styles.actions}>
                <button
                  onClick={() =>
                    downloadJson(
                      {
                        format: "bloggr-v1",
                        posts: [{ slug: post?.slug || customSlug, draft }],
                      },
                      "bloggr-draft-recovery.json",
                    )
                  }
                >
                  Download my draft
                </button>
                <button disabled={busy} onClick={() => void reload()}>
                  Load latest version
                </button>
              </div>
            </>
          ) : ready ? (
            <button onClick={() => void persist()} disabled={busy}>
              Retry save
            </button>
          ) : (
            <button onClick={onBack}>Return to posts</button>
          )}
        </div>
      )}
      {storageError && (
        <p className={styles.notice}>
          Browser recovery storage is unavailable. Save your draft before
          leaving, or download a recovery copy from Post settings.
        </p>
      )}
      {recovery && (
        <div className={styles.notice}>
          <h2>A recovered draft is available</h2>
          <p>
            There is a local copy from{" "}
            {new Date(recovery.savedAt).toLocaleString()}. Choose what to
            continue editing. Autosave is paused until you decide.
          </p>
          <div className={styles.actions}>
            <button onClick={() => recover(true)}>Use recovered draft</button>
            <button onClick={() => recover(false)}>Use server version</button>
            <button
              onClick={() =>
                downloadJson(
                  {
                    format: "bloggr-v1",
                    posts: [{ slug: recovery.slug, draft: recovery.draft }],
                  },
                  "bloggr-recovered-draft.json",
                )
              }
            >
              Download recovered draft
            </button>
          </div>
        </div>
      )}
      {!ready ? (
        !error && <p role="status">Loading draft…</p>
      ) : (
        <>
          {post?.deleted_at && (
            <div className={styles.notice}>
              <p>This post is in Trash and is hidden from readers.</p>
              <button
                disabled={busy || !!recovery}
                onClick={() => void persist("restore")}
              >
                Restore draft
              </button>
            </div>
          )}
          <fieldset
            className={styles.composer}
            disabled={!!post?.deleted_at || !!recovery || replacing}
          >
            <label className={styles.titleLabel}>
              Post title
              <textarea
                ref={titleRef}
                rows={1}
                className={styles.titleInput}
                maxLength={200}
                value={draft.title}
                onChange={(e) => change("title", e.target.value)}
                placeholder="Give your story a title"
              />
            </label>
            <EditorToolbar editor={editor} />
            <div
              className={styles.proseEditor}
              data-empty={editor?.isEmpty ? "true" : "false"}
            >
              <EditorContent editor={editor} />
            </div>
          </fieldset>
          <div className={styles.editorFoot}>
            <span className={styles.muted}>
              {wordCount} words · {Math.max(1, Math.ceil(wordCount / 220))} min
              read
            </span>
            <button
              disabled={busy || !!recovery || !!post?.deleted_at}
              aria-expanded={media}
              onClick={() => setMedia(!media)}
            >
              Insert image
            </button>
          </div>
          {media && !replacing && !recovery && !post?.deleted_at && (
            <section className={styles.panel}>
              <h2>Insert image</h2>
              <MediaLibrary
                onSelect={(url, alt, caption) => {
                  if (replacingRef.current || !editor?.isEditable) return;
                  editor
                    ?.chain()
                    .focus()
                    .setImage({ src: url, alt, caption } as {
                      src: string;
                      alt: string;
                    })
                    .run();
                  setMedia(false);
                }}
              />
            </section>
          )}
          <details className={styles.panel}>
            <summary>Post settings</summary>
            <div className={styles.stack}>
              <fieldset
                className={`${styles.stack} ${styles.composer}`}
                disabled={!!post?.deleted_at || !!recovery || replacing}
              >
                <label>
                  Permalink
                  <input
                    value={post?.slug || customSlug}
                    readOnly={!!post}
                    onChange={(e) => setCustomSlug(e.target.value)}
                    placeholder="Created from your title when first saved"
                  />
                  <span className={styles.hint}>
                    {post
                      ? "Change it below when needed; previous links keep working through redirects."
                      : "Optional. Letters from any language, numbers and hyphens are supported."}
                  </span>
                </label>
                {post && (
                  <div className={styles.stack}>
                    <label>
                      New permalink
                      <input
                        value={customSlug}
                        disabled={busy || !!recovery}
                        onChange={(e) => setCustomSlug(e.target.value)}
                        placeholder="New address for this story"
                      />
                    </label>
                    <button
                      disabled={busy || !!recovery || !customSlug.trim()}
                      onClick={() => {
                        if (
                          window.confirm(
                            "Change this permalink? Previous links will redirect.",
                          )
                        )
                          void renamePermalink();
                      }}
                    >
                      Change permalink
                    </button>
                  </div>
                )}
                <label>
                  Publication date and time
                  <input
                    type="datetime-local"
                    value={localDate(draft.date)}
                    onChange={(e) => {
                      if (e.target.value)
                        change("date", new Date(e.target.value).toISOString());
                    }}
                  />
                  <span className={styles.hint}>
                    Shown in your device’s time zone. A future time schedules
                    the post when you publish.
                  </span>
                </label>
                <label>
                  Excerpt
                  <textarea
                    rows={3}
                    maxLength={500}
                    value={draft.excerpt}
                    onChange={(e) => change("excerpt", e.target.value)}
                  />
                </label>
                <label>
                  Cover image URL
                  <input
                    type="url"
                    value={draft.coverImage}
                    placeholder="https://…"
                    onChange={(e) => change("coverImage", e.target.value)}
                  />
                </label>
                <details>
                  <summary>Choose cover from Media</summary>
                  <MediaLibrary
                    onSelect={(url, alt, caption) => {
                      if (replacingRef.current || !editor?.isEditable) return;
                      change("coverImage", url);
                      change("coverAlt", alt);
                      change("coverCaption", caption || "");
                    }}
                  />
                </details>
                <label>
                  Cover image description
                  <input
                    maxLength={300}
                    value={draft.coverAlt}
                    onChange={(e) => change("coverAlt", e.target.value)}
                  />
                </label>
                <label>
                  Cover caption
                  <input
                    maxLength={500}
                    value={draft.coverCaption || ""}
                    onChange={(e) => change("coverCaption", e.target.value)}
                  />
                </label>
                <label>
                  Topics (comma separated)
                  <input
                    value={draft.tags.join(", ")}
                    onChange={(e) =>
                      change(
                        "tags",
                        e.target.value.split(",").map((s) => s.trimStart()),
                      )
                    }
                  />
                  <span className={styles.hint}>
                    Up to 12 topics, each up to 40 characters.
                  </span>
                </label>
                <label>
                  Author name
                  <input
                    maxLength={100}
                    value={draft.authorName}
                    onChange={(e) => change("authorName", e.target.value)}
                  />
                </label>
                <label>
                  Search and social description
                  <textarea
                    rows={3}
                    maxLength={320}
                    value={draft.seoDescription}
                    onChange={(e) => change("seoDescription", e.target.value)}
                  />
                </label>
                <label>
                  SEO keywords (optional)
                  <input
                    maxLength={500}
                    value={draft.seoKeywords}
                    onChange={(e) => change("seoKeywords", e.target.value)}
                  />
                </label>
              </fieldset>
              <div className={styles.actions}>
                <button
                  onClick={() =>
                    downloadJson(
                      {
                        format: "bloggr-v1",
                        posts: [{ slug: post?.slug || customSlug, draft }],
                      },
                      "bloggr-draft.json",
                    )
                  }
                >
                  Download draft
                </button>
                {post && (
                  <>
                    <button
                      disabled={busy}
                      onClick={() => void loadRevisions()}
                    >
                      Revision history
                    </button>
                    {post.status === "published" && (
                      <button
                        disabled={busy || !!recovery}
                        onClick={() => {
                          if (
                            window.confirm(
                              "Unpublish this post? It will become a private draft.",
                            )
                          )
                            void persist("unpublish");
                        }}
                      >
                        Unpublish
                      </button>
                    )}
                    {!post.deleted_at && (
                      <button
                        className={styles.danger}
                        disabled={busy || !!recovery}
                        onClick={() => {
                          if (
                            window.confirm(
                              "Move this post to Trash? You can restore it later.",
                            )
                          )
                            void persist("trash");
                        }}
                      >
                        Move to Trash
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </details>
          {revisions && (
            <section className={styles.panel}>
              <h2>Revision history</h2>
              <p>
                Restoring changes the draft. Publish separately to update the
                public post.
              </p>
              {revisions.length ? (
                <ul className={styles.revisions}>
                  {revisions.map((revision) => (
                    <li key={revision.id}>
                      <span>
                        {new Date(revision.created_at).toLocaleString()} ·{" "}
                        {revision.data.title || "Untitled"}
                      </span>
                      <button
                        disabled={busy || !!recovery}
                        onClick={() => {
                          if (
                            window.confirm(
                              "Restore this revision? Download your current draft first if you want to keep a separate copy.",
                            )
                          )
                            void persist("revision", revision.id);
                        }}
                      >
                        Restore
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No revisions yet.</p>
              )}
              <button onClick={() => setRevisions(null)}>Close history</button>
            </section>
          )}
          {!post?.deleted_at && (
            <div className={styles.publishActions}>
              <button
                disabled={busy || !!recovery || conflict}
                onClick={() => void privatePreview()}
              >
                Preview
              </button>
              <button
                disabled={busy || !!recovery || conflict}
                onClick={() => void persist()}
              >
                Save draft
              </button>
              {role !== "author" && (
                <button
                  className={styles.primary}
                  disabled={busy || !!recovery || conflict}
                  aria-expanded={review}
                  onClick={() => {
                    setReviewTime(Date.now());
                    setReview(!review);
                  }}
                >
                  Publish…
                </button>
              )}
            </div>
          )}
          {preview && (
            <section className={styles.panel}>
              <h2>Private preview</h2>
              <p>
                This preview shows your saved draft. Only authorized
                contributors can open it.
              </p>
              <a href={preview} target="_blank" rel="noreferrer">
                Open preview in a new tab ↗
              </a>
            </section>
          )}
          {review && role !== "author" && (
            <section className={styles.panel}>
              <h2>Review publication</h2>
              <p>
                {new Date(draft.date).getTime() > reviewTime
                  ? `Scheduled for ${new Date(draft.date).toLocaleString()}.`
                  : "Publishing makes this draft visible to everyone immediately."}
              </p>
              <p className={styles.breakWord}>
                Permalink: /blog/
                {post?.slug || customSlug || "(created from your title)"}
              </p>
              <p>
                {post?.status === "published"
                  ? "This replaces the current public version with your saved edits."
                  : "You can unpublish or move the post to Trash later."}
              </p>
              {!canPublish && (
                <p role="alert">
                  Add a title and some content before publishing.
                </p>
              )}
              {draft.coverImage && !draft.coverAlt && (
                <p>
                  Add a description for your cover image if it conveys
                  information.
                </p>
              )}
              <div className={styles.actions}>
                <button
                  className={styles.primary}
                  disabled={busy || !canPublish}
                  onClick={() => void persist("publish")}
                >
                  {new Date(draft.date).getTime() > reviewTime
                    ? "Confirm schedule"
                    : "Confirm publish"}
                </button>
                <button onClick={() => setReview(false)}>Cancel</button>
              </div>
            </section>
          )}
        </>
      )}
    </section>
  );
}
