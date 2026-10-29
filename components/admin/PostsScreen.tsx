"use client";
import { useEffect, useState } from "react";
import type { Post } from "@/lib/types";
import { api, errorMessage } from "./api";
import styles from "./workspace.module.css";
export function postStatus(post: Post) {
  return post.deleted_at
    ? "Trash"
    : post.status === "draft"
      ? "Draft"
      : new Date(post.published_at).getTime() > Date.now()
        ? "Scheduled"
        : "Published";
}
export default function PostsScreen({
  onOpen,
}: {
  onOpen: (slug: string) => void;
}) {
  const [posts, setPosts] = useState<Post[]>([]),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState("all");
  const [page, setPage] = useState(1),
    [pages, setPages] = useState(1),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setError("");
      api<{ posts: Post[]; totalPages: number }>(
        `/api/admin/posts?${new URLSearchParams({ page: String(page), search, status })}`,
        { signal: controller.signal },
      )
        .then((data) => {
          setPosts(data.posts);
          setPages(Math.max(1, data.totalPages));
        })
        .catch((e) => {
          if (!controller.signal.aborted) setError(errorMessage(e));
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search, status, page, attempt]);
  return (
    <section>
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>Your publication</p>
          <h1>Posts</h1>
        </div>
        <button className={styles.primary} onClick={() => onOpen("")}>
          New post
        </button>
      </div>
      <div className={styles.filters}>
        <label>
          Search posts
          <input
            type="search"
            value={search}
            placeholder="Find a story…"
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <label>
          Status
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            {["all", "draft", "published", "scheduled", "trash"].map((s) => (
              <option key={s} value={s}>
                {s[0].toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </label>
      </div>
      {loading ? (
        <p role="status">Loading posts…</p>
      ) : error ? (
        <div className={styles.notice} role="alert">
          <p>{error}</p>
          <button onClick={() => setAttempt((n) => n + 1)}>Retry</button>
        </div>
      ) : !posts.length ? (
        <div className={styles.panel}>
          <h2>
            {search || status !== "all"
              ? "No matching posts"
              : "Your first story starts here"}
          </h2>
          <p>
            {search || status !== "all"
              ? "Try a different search or status."
              : "Create a draft. Publish when you are ready."}
          </p>
        </div>
      ) : (
        <ul className={styles.postList}>
          {posts.map((post) => (
            <li key={post.id}>
              <button
                className={styles.postRow}
                onClick={() => onOpen(post.slug)}
              >
                <span>
                  <strong>
                    {post.draft?.title || post.title || "Untitled post"}
                  </strong>
                  <span className={styles.postDetail}>
                    {new Date(
                      post.updated_at || post.published_at,
                    ).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    · /blog/{post.slug}
                  </span>
                </span>
                <span className={styles.badge}>{postStatus(post)}</span>
                <span aria-hidden="true">→</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {!error && !loading && pages > 1 && (
        <nav className={styles.pagination} aria-label="Post pages">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span>
            {page} / {pages}
          </span>
          <button
            disabled={page >= pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </nav>
      )}
    </section>
  );
}
