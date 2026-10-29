"use client";
import { useEffect, useState } from "react";
import { api, errorMessage } from "./api";
import styles from "./workspace.module.css";
type Member = {
  user_id: string;
  role: "editor" | "author";
  display_name: string;
};
export default function MembersScreen() {
  const [members, setMembers] = useState<Member[] | null>(null),
    [id, setId] = useState(""),
    [role, setRole] = useState("author"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [status, setStatus] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    api<{ members: Member[] }>("/api/admin/members")
      .then(({ members }) => {
        if (active) setMembers(members);
      })
      .catch((e) => {
        if (active) setError(errorMessage(e));
      });
    return () => {
      active = false;
    };
  }, [reload]);
  async function change(user_id: string, nextRole?: string) {
    setBusy(true);
    setError("");
    setStatus("");
    try {
      await api("/api/admin/members", {
        method: nextRole ? "PUT" : "DELETE",
        body: JSON.stringify({ user_id, role: nextRole }),
      });
      setStatus(
        nextRole ? "Contributor access saved." : "Contributor access removed.",
      );
      setId("");
      setReload((n) => n + 1);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <h1>Contributors</h1>
      <p>
        Editors manage all posts and publication. Authors manage their own
        drafts. Only the owner manages settings, backups, and contributor
        access.
      </p>
      <p>
        Create an account in Supabase Authentication first, then paste its user
        ID below. The configured owner always keeps owner access.
      </p>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {status && <p role="status">{status}</p>}
      <form
        className={styles.panel}
        onSubmit={(e) => {
          e.preventDefault();
          void change(id, role);
        }}
      >
        <label className={styles.field}>
          Existing user ID
          <input
            required
            value={id}
            onChange={(e) => setId(e.target.value.trim())}
          />
        </label>
        <label className={styles.field}>
          Role
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="author">Author</option>
            <option value="editor">Editor</option>
          </select>
        </label>
        <button className={styles.primary} disabled={busy}>
          Add contributor
        </button>
      </form>
      {members === null ? (
        <p>
          {error ? "Could not load contributors." : "Loading contributors…"}
        </p>
      ) : members.length === 0 ? (
        <p>No contributors yet.</p>
      ) : (
        <ul>
          {members.map((member) => (
            <li key={member.user_id} className={styles.panel}>
              <strong>{member.display_name}</strong>
              <p>{member.user_id}</p>
              <label>
                Role{" "}
                <select
                  aria-label={`Role for ${member.display_name}`}
                  value={member.role}
                  disabled={busy}
                  onChange={(e) => void change(member.user_id, e.target.value)}
                >
                  <option value="author">Author</option>
                  <option value="editor">Editor</option>
                </select>
              </label>{" "}
              <button
                disabled={busy}
                onClick={() => {
                  if (
                    window.confirm(
                      "Remove this contributor’s workspace access? Their posts and public profile will remain.",
                    )
                  )
                    void change(member.user_id);
                }}
              >
                Remove access
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
