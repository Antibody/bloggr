"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, errorMessage } from "./api";
import styles from "./workspace.module.css";
type Media = {
  name: string;
  url: string;
  created_at: string;
  alt: string;
  caption: string;
  inUse: boolean;
};
type Upload = { imageUrl: string; name: string; alt: string; caption: string };
export default function MediaLibrary({
  onSelect,
}: {
  onSelect?: (
    url: string,
    alt: string,
    caption?: string,
  ) => void | Promise<void>;
}) {
  const [items, setItems] = useState<Media[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [alt, setAlt] = useState("");
  const [caption, setCaption] = useState("");
  const [query, setQuery] = useState("");
  const [unused, setUnused] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [progress, setProgress] = useState<number | null>(null);
  const [retry, setRetry] = useState<File | null>(null);
  const loadVersion = useRef(0);
  const load = useCallback(async () => {
    const version = ++loadVersion.current;
    setLoading(true);
    try {
      const data = await api<{
        media: Media[];
        hasMore: boolean;
        total: number;
      }>(
        `/api/admin/media?${new URLSearchParams({ page: String(page), q: query, unused: String(unused) })}`,
      );
      if (version !== loadVersion.current) return;
      setItems(data.media);
      setHasMore(data.hasMore);
      setTotal(data.total);
    } catch (e) {
      if (version === loadVersion.current) setError(errorMessage(e));
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  }, [page, query, unused]);
  useEffect(() => {
    const version = loadVersion;
    const timer = setTimeout(() => void load(), 200);
    return () => {
      clearTimeout(timer);
      version.current++;
    };
  }, [load]);
  async function select(item: Pick<Media, "url" | "alt" | "caption">) {
    try {
      await onSelect?.(item.url, item.alt, item.caption);
    } catch (e) {
      setError(`Could not insert image: ${errorMessage(e)}`);
    }
  }
  async function upload(file?: File) {
    if (!file) return;
    if (
      !/^image\/(jpeg|png|webp|gif)$/.test(file.type) ||
      file.size > 5242880
    ) {
      setError("Choose a JPEG, PNG, WebP or GIF image up to 5 MB.");
      return;
    }
    setBusy(true);
    setError("");
    setProgress(0);
    setRetry(file);
    const body = new FormData();
    body.append("image", file);
    body.append("alt", alt);
    body.append("caption", caption);
    try {
      const data = await new Promise<Upload>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/admin/upload-image");
        xhr.timeout = 120000;
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable)
            setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onerror = () =>
          reject(new Error("Upload connection failed. Retry the upload."));
        xhr.ontimeout = () =>
          reject(
            new Error("Upload timed out. Reload the library before retrying."),
          );
        xhr.onload = () => {
          try {
            const data = JSON.parse(xhr.responseText);
            if (xhr.status < 200 || xhr.status >= 300)
              reject(new Error(data.error || "Upload failed."));
            else resolve(data);
          } catch {
            reject(new Error("Invalid upload response."));
          }
        };
        xhr.send(body);
      });
      setRetry(null);
      await load();
      if (onSelect)
        await select({
          url: data.imageUrl,
          alt: data.alt,
          caption: data.caption,
        });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }
  async function save(item: Media) {
    setBusy(true);
    setError("");
    try {
      await api("/api/admin/media", {
        method: "PATCH",
        body: JSON.stringify({
          name: item.name,
          alt: item.alt,
          caption: item.caption,
        }),
      });
      await load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function remove(item: Media) {
    if (
      !window.confirm(
        `Delete ${item.name}? This permanently deletes the unused image.`,
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      await api("/api/admin/media", {
        method: "DELETE",
        body: JSON.stringify({ name: item.name }),
      });
      await load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  function edit(name: string, key: "alt" | "caption", value: string) {
    setItems((old) =>
      old.map((item) =>
        item.name === name ? { ...item, [key]: value } : item,
      ),
    );
  }
  return (
    <div className={styles.stack}>
      <label>
        Upload description (alt text)
        <input
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
          maxLength={300}
          placeholder="Describe what the image shows"
        />
      </label>
      <label>
        Upload caption
        <input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          maxLength={500}
        />
      </label>
      <label>
        Upload image
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          disabled={busy}
          onChange={(e) => {
            void upload(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <span className={styles.hint}>
          JPEG, PNG, WebP or GIF, up to 5 MB. GIFs become still images.
        </span>
      </label>
      {progress !== null && (
        <div role="status">
          <progress max={100} value={progress} /> {progress}%{" "}
          {progress === 100 ? "Processing image…" : "Uploading…"}
        </div>
      )}
      {error && (
        <div className={styles.notice} role="alert">
          <p>{error}</p>
          <button
            disabled={busy}
            onClick={() => {
              setError("");
              void load();
            }}
          >
            Reload library
          </button>
          {retry && (
            <button disabled={busy} onClick={() => void upload(retry)}>
              Retry upload
            </button>
          )}
        </div>
      )}
      <label>
        Search media
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
        />
      </label>
      <label>
        <input
          type="checkbox"
          checked={unused}
          onChange={(e) => {
            setUnused(e.target.checked);
            setPage(1);
          }}
        />{" "}
        Show unused images only
      </label>
      {loading ? (
        <p role="status">Loading media…</p>
      ) : !items.length ? (
        <p className={styles.muted}>No images match this view.</p>
      ) : (
        <ul className={styles.mediaGrid}>
          {items.map((item) => (
            <li className={styles.mediaCard} key={item.name}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.url}
                alt={item.alt}
                loading="lazy"
                width={320}
                height={220}
              />
              <span className={styles.filename}>{item.name}</span>
              <label>
                Alt text
                <input
                  value={item.alt}
                  maxLength={300}
                  onChange={(e) => edit(item.name, "alt", e.target.value)}
                />
              </label>
              <label>
                Caption
                <input
                  value={item.caption}
                  maxLength={500}
                  onChange={(e) => edit(item.name, "caption", e.target.value)}
                />
              </label>
              <span className={styles.hint}>
                {item.inUse
                  ? "Used by publication or saved history"
                  : "Unused image"}
              </span>
              <div className={styles.actions}>
                <button disabled={busy} onClick={() => void save(item)}>
                  Save metadata
                </button>
                {onSelect ? (
                  <button disabled={busy} onClick={() => void select(item)}>
                    Use image
                  </button>
                ) : (
                  <a href={item.url} target="_blank" rel="noreferrer">
                    Open image
                  </a>
                )}
                <button
                  disabled={busy || item.inUse}
                  onClick={() => void remove(item)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className={styles.actions}>
        <button
          disabled={page === 1 || loading}
          onClick={() => setPage((value) => value - 1)}
        >
          Previous
        </button>
        <span>
          Page {page} · {total} images
        </span>
        <button
          disabled={!hasMore || loading}
          onClick={() => setPage((value) => value + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
