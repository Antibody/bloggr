"use client";
import { useState } from "react";
export default function ShareArticle() {
  const [message, setMessage] = useState("");
  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setMessage("Link copied.");
    } catch {
      setMessage("Copy the address from your browser to share this story.");
    }
  }
  return (
    <div className="share-row">
      <button className="button" onClick={copy}>
        Copy story link <span aria-hidden="true">↗</span>
      </button>
      <span role="status" className="muted">
        {message}
      </span>
    </div>
  );
}
