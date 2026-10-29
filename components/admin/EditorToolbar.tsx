"use client";
import type { Editor } from "@tiptap/react";
import { useState } from "react";
import styles from "./workspace.module.css";
export default function EditorToolbar({ editor }: { editor: Editor | null }) {
  const [url, setUrl] = useState(""),
    [error, setError] = useState("");
  if (!editor) return null;
  function link() {
    try {
      const parsed = new URL(url);
      if (!["https:", "http:", "mailto:"].includes(parsed.protocol))
        throw new Error();
      editor!
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: parsed.href })
        .run();
      setError("");
    } catch {
      setError("Use an https://, http:// or mailto: link.");
    }
  }
  return (
    <div className={styles.toolbar} aria-label="Text formatting">
      <button
        type="button"
        aria-label="Bold"
        aria-pressed={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <strong>B</strong>
      </button>
      <button
        type="button"
        aria-label="Italic"
        aria-pressed={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <em>I</em>
      </button>
      <button
        type="button"
        aria-label="Heading 2"
        aria-pressed={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        H2
      </button>
      <button
        type="button"
        aria-label="Bullet list"
        aria-pressed={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        List
      </button>
      <details className={styles.more}>
        <summary>More</summary>
        <div className={styles.morePanel}>
          <div className={styles.actions}>
            <button
              type="button"
              aria-pressed={editor.isActive("underline")}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
            >
              Underline
            </button>
            <button
              type="button"
              aria-pressed={editor.isActive("heading", { level: 3 })}
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 3 }).run()
              }
            >
              Heading 3
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().setParagraph().run()}
            >
              Paragraph
            </button>
            <button
              type="button"
              aria-pressed={editor.isActive("orderedList")}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
            >
              Numbered list
            </button>
            <button
              type="button"
              aria-pressed={editor.isActive("blockquote")}
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
            >
              Quote
            </button>
            <button
              type="button"
              aria-pressed={editor.isActive("codeBlock")}
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            >
              Code block
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
            >
              Divider
            </button>
            <button
              type="button"
              disabled={!editor.can().undo()}
              onClick={() => editor.chain().focus().undo().run()}
            >
              Undo
            </button>
            <button
              type="button"
              disabled={!editor.can().redo()}
              onClick={() => editor.chain().focus().redo().run()}
            >
              Redo
            </button>
          </div>
          <label>
            Link URL
            <input
              type="url"
              value={url}
              placeholder="https://…"
              onChange={(e) => setUrl(e.target.value)}
            />
          </label>
          <div className={styles.actions}>
            <button type="button" onClick={link}>
              Apply link
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().unsetLink().run()}
            >
              Remove link
            </button>
          </div>
          {error && <p role="alert">{error}</p>}
        </div>
      </details>
    </div>
  );
}
