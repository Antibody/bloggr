"use client";
import { useEffect, useState } from "react";
import type { AuthorProfile } from "@/lib/profiles";
import { api, errorMessage } from "./api";
import styles from "./workspace.module.css";
export default function ProfileScreen() {
  const [profile, setProfile] = useState<Omit<AuthorProfile, "user_id">>({
    display_name: "",
    slug: "",
    bio: "",
    avatar_url: "",
  });
  const [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [status, setStatus] = useState("");
  useEffect(() => {
    let active = true;
    api<{ profile: AuthorProfile | null }>("/api/admin/profile")
      .then(({ profile }) => {
        if (active) {
          if (profile) setProfile(profile);
          setReady(true);
        }
      })
      .catch((e) => {
        if (active) setError(errorMessage(e));
      });
    return () => {
      active = false;
    };
  }, []);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setStatus("");
    try {
      await api("/api/admin/profile", {
        method: "PUT",
        body: JSON.stringify(profile),
      });
      setStatus("Public profile saved.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <h1>Your profile</h1>
      <p>Your name, biography, avatar, and author URL are public once saved.</p>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {status && <p role="status">{status}</p>}
      {!ready ? (
        <p>{error ? "Reload this page to retry." : "Loading profile…"}</p>
      ) : (
        <form onSubmit={save} className={styles.panel}>
          <label className={styles.field}>
            Display name
            <input
              required
              maxLength={100}
              value={profile.display_name}
              onChange={(e) =>
                setProfile({ ...profile, display_name: e.target.value })
              }
            />
          </label>
          <label className={styles.field}>
            Author URL
            <input
              required
              maxLength={100}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              value={profile.slug}
              onChange={(e) => setProfile({ ...profile, slug: e.target.value })}
            />
            <span>Lowercase letters, numbers, and hyphens.</span>
          </label>
          <label className={styles.field}>
            Biography
            <textarea
              maxLength={2000}
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
            />
          </label>
          <label className={styles.field}>
            Avatar URL
            <input
              type="url"
              value={profile.avatar_url}
              onChange={(e) =>
                setProfile({ ...profile, avatar_url: e.target.value })
              }
            />
            <span>Use an HTTPS image URL.</span>
          </label>
          <button className={styles.primary} disabled={busy}>
            {busy ? "Saving…" : "Save profile"}
          </button>
        </form>
      )}
    </section>
  );
}
