"use client";
import { useEffect, useState } from "react";
import type { SiteSettings } from "@/lib/types";
import { api, downloadJson, errorMessage } from "./api";
import styles from "./workspace.module.css";
export default function SettingsScreen() {
  const [settings, setSettings] = useState<SiteSettings | null>(null),
    [error, setError] = useState(""),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false),
    [attempt, setAttempt] = useState(0);
  const [markdown, setMarkdown] = useState(""),
    [title, setTitle] = useState(""),
    [importStatus, setImportStatus] = useState("");
  useEffect(() => {
    let active = true;
    api<{ settings: SiteSettings }>("/api/admin/settings")
      .then((data) => {
        if (active) setSettings(data.settings);
      })
      .catch((e) => {
        if (active) setError(errorMessage(e));
      });
    return () => {
      active = false;
    };
  }, [attempt]);
  function update<K extends keyof SiteSettings>(
    key: K,
    value: SiteSettings[K],
  ) {
    setSettings((old) => old && { ...old, [key]: value });
    setStatus("Unsaved changes");
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await api<{ settings: SiteSettings }>(
        "/api/admin/settings",
        { method: "PUT", body: JSON.stringify(settings) },
      );
      setSettings(data.settings);
      setStatus("Settings saved. Reload the publication to see your changes.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function backup() {
    setBusy(true);
    setImportStatus("");
    try {
      const data = await api("/api/admin/backup");
      downloadJson(
        data,
        `bloggr-backup-${new Date().toISOString().slice(0, 10)}.json`,
      );
      setImportStatus("Backup downloaded.");
    } catch (e) {
      setImportStatus(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function importData(data: unknown) {
    setBusy(true);
    setImportStatus("");
    try {
      const result = await api<{ imported: number }>("/api/admin/backup", {
        method: "POST",
        body: JSON.stringify(data),
      });
      setImportStatus(
        `Imported ${result.imported} post(s) as drafts. Find them in Posts.`,
      );
      setMarkdown("");
    } catch (e) {
      setImportStatus(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function importFile(file?: File) {
    if (!file) return;
    if (file.size > 600000) {
      setImportStatus(
        "Choose a backup smaller than 600 KB (up to 20 posts per import).",
      );
      return;
    }
    try {
      await importData(JSON.parse(await file.text()));
    } catch {
      setImportStatus("This file is not valid JSON.");
    }
  }
  return (
    <section className={styles.settings}>
      <h1>Settings</h1>
      <p className={styles.muted}>Make this publication your own.</p>
      {error && (
        <div className={styles.notice} role="alert">
          <p>{error}</p>
          {!settings && (
            <button
              onClick={() => {
                setError("");
                setAttempt((n) => n + 1);
              }}
            >
              Retry
            </button>
          )}
        </div>
      )}
      {!settings ? (
        !error && <p role="status">Loading settings…</p>
      ) : (
        <form onSubmit={save} className={styles.stack}>
          <div className={styles.panel}>
            <h2>Publication identity</h2>
            <div className={styles.stack}>
              <label>
                Publication name
                <input
                  required
                  maxLength={100}
                  value={settings.title}
                  onChange={(e) => update("title", e.target.value)}
                />
              </label>
              <label>
                Description
                <textarea
                  rows={3}
                  maxLength={500}
                  value={settings.description}
                  onChange={(e) => update("description", e.target.value)}
                />
              </label>
              <label>
                Logo URL
                <input
                  type="url"
                  placeholder="https://…"
                  value={settings.logo_url}
                  onChange={(e) => update("logo_url", e.target.value)}
                />
              </label>
              <label>
                Accent color
                <input
                  type="color"
                  value={settings.accent}
                  onChange={(e) => update("accent", e.target.value)}
                />
                <span className={styles.hint}>
                  Used for decorative publication accents. Controls retain
                  accessible contrast.
                </span>
              </label>
              <label>
                Typography
                <select
                  value={settings.typography || "editorial"}
                  onChange={(e) =>
                    update(
                      "typography",
                      e.target.value as SiteSettings["typography"],
                    )
                  }
                >
                  <option value="editorial">
                    Editorial — serif stories, clean controls
                  </option>
                  <option value="modern">Modern — sans serif throughout</option>
                  <option value="classic">
                    Classic — traditional book typography
                  </option>
                </select>
              </label>
              <label>
                Social link
                <input
                  type="url"
                  placeholder="https://…"
                  value={settings.social_url}
                  onChange={(e) => update("social_url", e.target.value)}
                />
              </label>
            </div>
          </div>
          <div className={styles.panel}>
            <h2>Header navigation</h2>
            <p className={styles.hint}>
              Add up to six links in display order. Leave empty to show Stories.
              Use a path such as /blog or a full HTTPS URL.
            </p>
            <div className={styles.stack}>
              {(settings.navigation || []).map((link, index) => (
                <fieldset key={index} className={styles.stack}>
                  <legend>Link {index + 1}</legend>
                  <label>
                    Label
                    <input
                      required
                      maxLength={40}
                      value={link.label}
                      onChange={(e) =>
                        update(
                          "navigation",
                          (settings.navigation || []).map((item, i) =>
                            i === index
                              ? { ...item, label: e.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  </label>
                  <label>
                    Destination
                    <input
                      required
                      maxLength={500}
                      value={link.href}
                      placeholder="/blog"
                      onChange={(e) =>
                        update(
                          "navigation",
                          (settings.navigation || []).map((item, i) =>
                            i === index
                              ? { ...item, href: e.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  </label>
                  <div className={styles.actions}>
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => {
                        const links = [...(settings.navigation || [])];
                        [links[index - 1], links[index]] = [
                          links[index],
                          links[index - 1],
                        ];
                        update("navigation", links);
                      }}
                    >
                      Move up<span className="sr-only"> link {index + 1}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        update(
                          "navigation",
                          (settings.navigation || []).filter(
                            (_, i) => i !== index,
                          ),
                        )
                      }
                    >
                      Remove<span className="sr-only"> link {index + 1}</span>
                    </button>
                  </div>
                </fieldset>
              ))}
              <button
                type="button"
                disabled={(settings.navigation || []).length >= 6}
                onClick={() =>
                  update("navigation", [
                    ...(settings.navigation || []),
                    { label: "", href: "" },
                  ])
                }
              >
                Add navigation link
              </button>
            </div>
          </div>
          <div className={styles.panel}>
            <h2>Reading and regional settings</h2>
            <div className={styles.stack}>
              <label>
                Homepage
                <select
                  value={settings.home_mode}
                  onChange={(e) =>
                    update(
                      "home_mode",
                      e.target.value as SiteSettings["home_mode"],
                    )
                  }
                >
                  <option value="publication">
                    Publication — latest stories
                  </option>
                  <option value="landing">Bloggr introduction</option>
                </select>
              </label>
              <label>
                Language / locale
                <input
                  required
                  value={settings.locale}
                  placeholder="en-US"
                  onChange={(e) => update("locale", e.target.value)}
                />
              </label>
              <label>
                Publication time zone
                <input
                  required
                  value={settings.timezone}
                  placeholder="Europe/Helsinki"
                  onChange={(e) => update("timezone", e.target.value)}
                />
                <span className={styles.hint}>
                  Use an IANA name, such as Europe/Helsinki or America/New_York.
                </span>
              </label>
            </div>
          </div>
          <div className={styles.actions}>
            <button type="submit" className={styles.primary} disabled={busy}>
              {busy ? "Saving…" : "Save settings"}
            </button>
            <p role="status">{status}</p>
          </div>
        </form>
      )}
      <section className={styles.panel}>
        <h2>Backup and import</h2>
        <p>
          Export content and publication settings as JSON. Media files remain in
          your storage; download them separately from Media. Imports create
          private drafts and leave publication settings unchanged. Import up to
          20 posts at a time.
        </p>
        <div className={styles.stack}>
          <button disabled={busy} onClick={() => void backup()}>
            Download backup
          </button>
          <label>
            Import a Bloggr JSON backup
            <input
              type="file"
              accept="application/json,.json"
              disabled={busy}
              onChange={(e) => {
                void importFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          <details>
            <summary>Import Markdown</summary>
            <div className={styles.stack}>
              <label>
                Post title
                <input
                  value={title}
                  maxLength={200}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>
              <label>
                Markdown
                <textarea
                  rows={8}
                  value={markdown}
                  onChange={(e) => setMarkdown(e.target.value)}
                />
              </label>
              <button
                disabled={busy || !markdown.trim()}
                onClick={() => void importData({ markdown, title })}
              >
                Import as draft
              </button>
            </div>
          </details>
          <p role="status">{importStatus}</p>
        </div>
      </section>
    </section>
  );
}
