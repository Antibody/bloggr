"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ThemeSelect } from "@/components/ThemeProvider";
import { logout } from "@/app/blog/actions";
import { api, ApiError, errorMessage } from "./api";
import PostsScreen from "./PostsScreen";
import PostEditor from "./PostEditor";
import MediaLibrary from "./MediaLibrary";
import SettingsScreen from "./SettingsScreen";
import MembersScreen from "./MembersScreen";
import ProfileScreen from "./ProfileScreen";
import type { WorkspaceRole } from "@/lib/access";
import styles from "./workspace.module.css";

export default function AdminWorkspace() {
  const [screen, setScreen] = useState<
    "posts" | "media" | "settings" | "members" | "profile"
  >("posts");
  const [editing, setEditing] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [ownerId, setOwnerId] = useState("");
  const [role, setRole] = useState<WorkspaceRole>("owner");
  const [error, setError] = useState("");
  const [authRequired, setAuthRequired] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    api<{ ownerId: string; actor?: { role: WorkspaceRole } }>(
      "/blog/api/validate",
    )
      .then((data) => {
        if (active) {
          if (!data.ownerId)
            throw new Error(
              "The server did not identify the publication owner. Reload after updating workspace setup.",
            );
          setOwnerId(data.ownerId);
          setRole(data.actor?.role || "owner");
          setReady(true);
        }
      })
      .catch((e) => {
        if (active) {
          setError(errorMessage(e));
          setAuthRequired(
            e instanceof ApiError && (e.status === 401 || e.status === 403),
          );
        }
      });
    return () => {
      active = false;
    };
  }, [attempt]);
  return (
    <div className={styles.workspace}>
      <header className={styles.header}>
        <span className={styles.brand}>
          Bloggr <span className={styles.muted}>/ Workspace</span>
        </span>
        <ThemeSelect />
        {editing === null && (
          <>
            <Link href="/blog">View publication</Link>
            <form action={logout}>
              <button type="submit">Sign out</button>
            </form>
          </>
        )}
      </header>
      <main id="main-content" className={styles.main}>
        {!ready ? (
          <section className={styles.panel} aria-live="polite">
            <h1>Author workspace</h1>
            {error ? (
              <>
                <p role="alert">{error}</p>
                {authRequired ? (
                  <Link className={styles.primary} href="/blog/login">
                    Sign in
                  </Link>
                ) : (
                  <>
                    <p>
                      Connect Supabase, configure the owner email, and apply the
                      database migrations described in the project setup guide.
                    </p>
                    <button
                      onClick={() => {
                        setError("");
                        setAttempt((n) => n + 1);
                      }}
                    >
                      Check setup again
                    </button>
                  </>
                )}
              </>
            ) : (
              <p>Checking your workspace…</p>
            )}
          </section>
        ) : editing !== null ? (
          <PostEditor
            ownerId={ownerId}
            role={role}
            key={editing}
            slug={editing || null}
            onBack={() => setEditing(null)}
          />
        ) : (
          <>
            <nav className={styles.tabs} aria-label="Workspace">
              {(
                [
                  "posts",
                  "media",
                  "profile",
                  ...(role === "owner"
                    ? (["settings", "members"] as const)
                    : []),
                ] as const
              ).map((tab) => (
                <button
                  key={tab}
                  aria-current={screen === tab ? "page" : undefined}
                  onClick={() => setScreen(tab)}
                >
                  {tab[0].toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>
            {screen === "posts" && <PostsScreen onOpen={setEditing} />}
            {screen === "media" && (
              <section>
                <h1>Media</h1>
                <p className={styles.muted}>
                  Upload and reuse images throughout your publication.
                </p>
                <MediaLibrary />
              </section>
            )}
            {screen === "settings" && role === "owner" && <SettingsScreen />}
            {screen === "members" && role === "owner" && <MembersScreen />}
            {screen === "profile" && <ProfileScreen />}
          </>
        )}
      </main>
    </div>
  );
}
