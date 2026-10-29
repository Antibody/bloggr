"use client";
import { useState } from "react";
import Link from "next/link";
import {
  loginWithPassword,
  requestPasswordReset,
  updatePassword,
} from "@/app/blog/actions";
import { ThemeSelect } from "@/components/ThemeProvider";
import styles from "./workspace.module.css";
export default function LoginForm({
  configured,
  recoveryCode,
}: {
  configured: boolean;
  recoveryCode?: string;
}) {
  const [reset, setReset] = useState(false),
    [visible, setVisible] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await (recoveryCode
        ? updatePassword(data)
        : reset
          ? requestPasswordReset(data)
          : loginWithPassword(data));
      setError(result?.error || "");
      setMessage(result?.message || "");
    } catch {
      setError("The request could not be completed. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={styles.workspace}>
      <header className={styles.header}>
        <Link href="/blog" className={styles.brand}>
          ← Publication
        </Link>
        <ThemeSelect />
      </header>
      <main id="main-content" className={styles.login}>
        <p className={styles.eyebrow}>Your writing, your space</p>
        <h1>
          {recoveryCode
            ? "Choose a new password"
            : reset
              ? "Reset your password"
              : "Welcome back"}
        </h1>
        <p className={styles.muted}>
          {recoveryCode
            ? "Use a strong password you do not use elsewhere."
            : reset
              ? "We will send a recovery link to the publication owner."
              : "Sign in to your author workspace."}
        </p>
        {!configured ? (
          <section className={styles.notice}>
            <h2>Set up your workspace</h2>
            <p>
              Connect Supabase, set the publication owner email, and apply the
              database migrations. The project setup guide includes the required
              environment variables and commands.
            </p>
            <Link href="/blog">Return to publication</Link>
          </section>
        ) : (
          <form onSubmit={submit} className={styles.stack}>
            {error && (
              <p className={styles.notice} id="login-error" role="alert">
                {error}
              </p>
            )}
            {message && <p role="status">{message}</p>}
            {recoveryCode ? (
              <input type="hidden" name="code" value={recoveryCode} />
            ) : (
              <label>
                Email
                <input
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                  disabled={busy}
                  aria-describedby={error ? "login-error" : undefined}
                />
              </label>
            )}
            {(!reset || recoveryCode) && (
              <>
                <label>
                  {recoveryCode ? "New password" : "Password"}
                  <input
                    name="password"
                    type={visible ? "text" : "password"}
                    autoComplete={
                      recoveryCode ? "new-password" : "current-password"
                    }
                    required
                    minLength={recoveryCode ? 12 : undefined}
                    disabled={busy}
                    aria-describedby={error ? "login-error" : undefined}
                  />
                </label>
                <button
                  className={styles.visibility}
                  type="button"
                  aria-pressed={visible}
                  onClick={() => setVisible(!visible)}
                >
                  {visible ? "Hide password" : "Show password"}
                </button>
              </>
            )}
            {recoveryCode && (
              <label>
                Confirm new password
                <input
                  name="confirmation"
                  type={visible ? "text" : "password"}
                  autoComplete="new-password"
                  minLength={12}
                  required
                  disabled={busy}
                />
              </label>
            )}
            <button className={styles.primary} type="submit" disabled={busy}>
              {busy
                ? "Please wait…"
                : recoveryCode
                  ? "Save new password"
                  : reset
                    ? "Send reset link"
                    : "Sign in"}
            </button>
            {!recoveryCode && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setReset(!reset);
                  setError("");
                  setMessage("");
                }}
              >
                {reset ? "Back to sign in" : "Forgot password?"}
              </button>
            )}
          </form>
        )}
      </main>
    </div>
  );
}
