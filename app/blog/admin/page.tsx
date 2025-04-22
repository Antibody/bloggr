"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactElement,
  ChangeEvent,
} from "react";
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import Heading from "@tiptap/extension-heading";
import Bold from "@tiptap/extension-bold";
import Italic from "@tiptap/extension-italic";
import Underline from "@tiptap/extension-underline";
import History from "@tiptap/extension-history";
import Dropcursor from "@tiptap/extension-dropcursor";
import Gapcursor from "@tiptap/extension-gapcursor";
import HardBreak from "@tiptap/extension-hard-break";
import Image from "@tiptap/extension-image";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import ListItem from "@tiptap/extension-list-item";
import TextAlign from "@tiptap/extension-text-align";
import Code from "@tiptap/extension-code";
import CodeBlock from "@tiptap/extension-code-block";
import {
  BsTypeBold,
  BsTypeItalic,
  BsTypeUnderline,
  BsParagraph,
  BsTypeH2,
  BsTypeH3,
  BsListUl,
  BsListOl,
  BsTextLeft,
  BsTextCenter,
  BsTextRight,
  BsCode,
  BsCodeSquare,
  BsImage,
  BsCalendar,
  BsTags,
  BsCardText,
} from "react-icons/bs";

// --- Types ---
interface PostListItem {
  slug: string;
  title: string;
  date: string; // ISO string
}

interface PostData extends PostListItem {
  htmlContent: string;
  seoKeywords?: string;
  seoDescription?: string;
}

// --- Helper Functions ---
function formatIsoToLocalDateTime(
  isoString: string | null | undefined
): string {
  if (!isoString) return "";
  try {
    const date = new Date(isoString);
    const offset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() - offset);
    return localDate.toISOString().slice(0, 16);
  } catch (e) {
    console.error("Error formatting date:", e);
    return "";
  }
}

function formatLocalDateTimeToIso(localDateTimeString: string): string {
  if (!localDateTimeString) return new Date().toISOString();
  try {
    const date = new Date(localDateTimeString);
    return date.toISOString();
  } catch (e) {
    console.error("Error formatting date to ISO:", e);
    return new Date().toISOString();
  }
}

// --- Custom Tiptap Commands ---
const setHeadingCommand = (
  editor: Editor,
  level: 2 | 3
): boolean => {
  const { state, dispatch } = editor.view;
  const { $from } = state.selection;
  const node = $from.node($from.depth);
  if (!node || !node.isBlock) return false;
  const start = $from.before($from.depth);
  const end = $from.after($from.depth);
  const headingType = state.schema.nodes.heading;
  if (!headingType) return false;
  const tr = state.tr.setBlockType(start, end, headingType, { level });
  dispatch(tr);
  return true;
};

const setParagraphCommand = (editor: Editor): boolean => {
  const { state, dispatch } = editor.view;
  const { $from } = state.selection;
  const node = $from.node($from.depth);
  if (!node || !node.isBlock) return false;
  const start = $from.before($from.depth);
  const end = $from.after($from.depth);
  const paragraphType = state.schema.nodes.paragraph;
  if (!paragraphType) return false;
  const tr = state.tr.setBlockType(start, end, paragraphType);
  dispatch(tr);
  return true;
};

// --- Menu Bar Component ---
const MenuBar = ({
  editor,
}: {
  editor: Editor | null;
}): ReactElement | null => {
  if (!editor) return null;
  const buttonClass = (isActive: boolean): string =>
    `px-2.5 py-1.5 border border-gray-700 rounded mr-1 mb-1 text-xs font-semibold transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-sky-500 ${
      isActive
        ? "bg-sky-600 text-white hover:bg-sky-700"
        : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
    } disabled:opacity-40 disabled:cursor-not-allowed`;

  return (
    <div className="flex flex-wrap items-center gap-1">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={buttonClass(editor.isActive("bold"))}
        title="Bold"
      >
        <BsTypeBold />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={buttonClass(editor.isActive("italic"))}
        title="Italic"
      >
        <BsTypeItalic />
      </button>
      <button
        onClick={() =>
          editor.chain().focus().toggleUnderline().run()
        }
        disabled={
          !editor.can().chain().focus().toggleUnderline().run()
        }
        className={buttonClass(editor.isActive("underline"))}
        title="Underline"
      >
        <BsTypeUnderline />
      </button>
      <button
        onClick={() => setParagraphCommand(editor)}
        disabled={!editor.can().setNode("paragraph")}
        className={buttonClass(editor.isActive("paragraph"))}
        title="Paragraph"
      >
        <BsParagraph />
      </button>
      <button
        onClick={() => setHeadingCommand(editor, 2)}
        disabled={
          !editor.can().setNode("heading", { level: 2 })
        }
        className={buttonClass(
          editor.isActive("heading", { level: 2 })
        )}
        title="Heading 2"
      >
        <BsTypeH2 />
      </button>
      <button
        onClick={() => setHeadingCommand(editor, 3)}
        disabled={
          !editor.can().setNode("heading", { level: 3 })
        }
        className={buttonClass(
          editor.isActive("heading", { level: 3 })
        )}
        title="Heading 3"
      >
        <BsTypeH3 />
      </button>
      <button
        onClick={() =>
          editor.chain().focus().toggleBulletList().run()
        }
        className={buttonClass(
          editor.isActive("bulletList")
        )}
        title="Bullet List"
      >
        <BsListUl />
      </button>
      <button
        onClick={() =>
          editor.chain().focus().toggleOrderedList().run()
        }
        className={buttonClass(
          editor.isActive("orderedList")
        )}
        title="Ordered List"
      >
        <BsListOl />
      </button>
      <button
        onClick={() =>
          editor.chain().focus().setTextAlign("left").run()
        }
        className={buttonClass(
          editor.isActive({ textAlign: "left" })
        )}
        title="Align Left"
      >
        <BsTextLeft />
      </button>
      <button
        onClick={() =>
          editor.chain().focus().setTextAlign("center").run()
        }
        className={buttonClass(
          editor.isActive({ textAlign: "center" })
        )}
        title="Align Center"
      >
        <BsTextCenter />
      </button>
      <button
        onClick={() =>
          editor.chain().focus().setTextAlign("right").run()
        }
        className={buttonClass(
          editor.isActive({ textAlign: "right" })
        )}
        title="Align Right"
      >
        <BsTextRight />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleCode().run()}
        disabled={!editor.can().chain().focus().toggleCode().run()}
        className={buttonClass(editor.isActive("code"))}
        title="Inline Code"
      >
        <BsCode />
      </button>
      <button
        onClick={() =>
          editor.chain().focus().toggleCodeBlock().run()
        }
        className={buttonClass(
          editor.isActive("codeBlock")
        )}
        title="Code Block"
      >
        <BsCodeSquare />
      </button>
    </div>
  );
};

// ## Main Admin Page Component ---
const BlogAdminPage = (): ReactElement => {
  // State
  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState<string>(
    formatIsoToLocalDateTime(new Date().toISOString())
  );
  const [seoKeywords, setSeoKeywords] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isLoadingEdit, setIsLoadingEdit] = useState(false);
  // NEW STATE: toggles for optional inputs
  const [showDateInput, setShowDateInput] = useState(false);
  const [showSeoKeywordsInput, setShowSeoKeywordsInput] = useState(false);
  const [showSeoDescriptionInput, setShowSeoDescriptionInput] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Editor Setup
  const editor = useEditor({
    extensions: [
      Document,
      Paragraph.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            "data-image-placeholder-id": {
              default: null,
              parseHTML: (element) =>
                element.getAttribute("data-image-placeholder-id"),
              renderHTML: (attributes) => {
                if (!attributes["data-image-placeholder-id"]) {
                  return {};
                }
                return {
                  "data-image-placeholder-id":
                    attributes["data-image-placeholder-id"],
                };
              },
            },
          };
        },
      }),
      Text,
      Heading.configure({ levels: [2, 3] }),
      Bold,
      Italic,
      Underline,
      Image,
      History,
      Dropcursor,
      Gapcursor,
      HardBreak,
      BulletList,
      OrderedList,
      ListItem,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Code,
      CodeBlock,
    ],
    content: "<p>Write your blog post here...</p>",
    editorProps: {
      attributes: {
        class:
          "prose dark:prose-invert mx-auto focus:outline-none p-4 rounded-md min-h-[300px] bg-white dark:bg-gray-900 text-black dark:text-white",
      },
    },
    immediatelyRender: false,
  });

  // Fetch posts
  const fetchPosts = useCallback(async (): Promise<void> => {
    setIsLoadingPosts(true);
    try {
      const response = await fetch("/api/admin/posts");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch posts");
      }
      const data = await response.json();
      setPosts(data.posts || []);
    } catch (error) {
      console.error("Fetch posts error:", error);
      toast.error(
        `Error fetching posts: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      setPosts([]);
    } finally {
      setIsLoadingPosts(false);
    }
  }, []);

  // Validate admin & fetch
  useEffect(() => {
    const validateAdminSetup = async (): Promise<void> => {
      try {
        const response = await fetch("/blog/api/validate");
        const result = await response.json();
        if (!response.ok || !result.authorized) {
          throw new Error(result.message || "Admin validation failed.");
        }
        if (result.dbCreated) {
          toast.success(
            "Database created successfully! Let&apos;s get started!",
            { autoClose: 5000 }
          );
        } else {
          toast.info("Fetching posts...", { autoClose: 3000 });
        }
        fetchPosts();
      } catch (error) {
        console.error("Admin validation error:", error);
        toast.error(
          `Admin validation failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    };
    validateAdminSetup();
  }, [fetchPosts]);

  // Handlers
  const handleTitleChange = (
    event: ChangeEvent<HTMLInputElement>
  ): void => {
    setTitle(event.target.value);
  };

  const handleDateChange = (
    event: ChangeEvent<HTMLInputElement>
  ): void => {
    setDate(event.target.value);
  };

  const handleSeoKeywordsChange = (
    event: ChangeEvent<HTMLInputElement>
  ): void => {
    setSeoKeywords(event.target.value);
  };

  const handleSeoDescriptionChange = (
    event: ChangeEvent<HTMLTextAreaElement>
  ): void => {
    setSeoDescription(event.target.value);
  };

  const triggerFileInput = (): void => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (
    event: ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    if (!editor) return;
    const file = event.target.files?.[0];
    if (!file) return;
    const placeholderId = `placeholder-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 9)}`;
    const { from } = editor.state.selection;
    editor
      .chain()
      .focus()
      .insertContentAt(from, {
        type: "paragraph",
        attrs: { "data-image-placeholder-id": placeholderId },
        content: [{ type: "text", text: "⏳ Uploading image..." }],
      })
      .run();
    const placeholderPos = from;
    if (fileInputRef.current) fileInputRef.current.value = "";
    const formData = new FormData();
    formData.append("image", file);
    try {
      const response = await fetch("/api/admin/upload-image", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Image upload failed");
      if (result.success && result.imageUrl) {
        let nodePos = -1;
        let placeholderNodeSize = 0;
        editor.state.doc.descendants((node, pos) => {
          if (
            node.attrs["data-image-placeholder-id"] ===
            placeholderId
          ) {
            nodePos = pos;
            placeholderNodeSize = node.nodeSize;
            return false;
          }
          return true;
        });
        if (nodePos !== -1) {
          const tr = editor.state.tr
            .deleteRange(nodePos, nodePos + placeholderNodeSize)
            .insert(
              nodePos,
              editor.state.schema.nodes.image.create({
                src: result.imageUrl,
              })
            );
          editor.view.dispatch(tr);
          toast.success("Image uploaded successfully!", {
            autoClose: 3000,
          });
        } else {
          console.warn(
            "Could not find placeholder node to replace. Inserting image at original cursor position."
          );
          editor
            .chain()
            .focus()
            .insertContentAt(placeholderPos, {
              type: "image",
              attrs: { src: result.imageUrl },
            })
            .run();
          toast.success("Image uploaded (placeholder issue)!", {
            autoClose: 3000,
          });
        }
      } else {
        throw new Error(result.error || "Image URL not returned");
      }
    } catch (error) {
      console.error("Upload error:", error);
      let nodePos = -1;
      editor.state.doc.descendants((node, pos) => {
        if (
          node.attrs["data-image-placeholder-id"] ===
          placeholderId
        ) {
          nodePos = pos;
          return false;
        }
        return true;
      });
      if (nodePos !== -1) {
        editor.view.dispatch(
          editor.state.tr.delete(
            nodePos,
            nodePos + editor.state.doc.nodeAt(nodePos)!.nodeSize
          )
        );
      } else {
        console.warn(
          "Could not find placeholder node to remove after upload error."
        );
      }
      toast.error(
        `Error uploading image: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        { autoClose: 5000 }
      );
    }
  };

  const resetForm = useCallback((): void => {
    setEditingSlug(null);
    setTitle("");
    setDate(formatIsoToLocalDateTime(new Date().toISOString()));
    setSeoKeywords("");
    setSeoDescription("");
    editor?.commands.setContent("<p>Write your blog post here...</p>");
  }, [editor]);

  const handleSave = async (): Promise<void> => {
    if (!editor || !title || !date) {
      toast.error("Please enter a title, date, and content.");
      return;
    }
    setIsSaving(true);
    const saveToastId = toast.loading(
      editingSlug ? "Updating post..." : "Saving post..."
    );
    const htmlContent = editor.getHTML();
    const isoDate = formatLocalDateTimeToIso(date);
    const url = editingSlug
      ? `/api/admin/posts/${editingSlug}`
      : "/api/admin/create-post";
    const method = editingSlug ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          htmlContent,
          date: isoDate,
          seoKeywords,
          seoDescription,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            result.details ||
            `Failed to ${editingSlug ? "update" : "save"} post`
        );
      }

      let successMessage = `Post ${result.operationStatus} successfully!`;
      if (
        result.rebuildStatus ===
        "Vercel rebuild triggered."
      ) {
        successMessage +=
          " Site rebuild initiated (may take a few minutes).";
      } else if (
        result.rebuildStatus ===
        "Failed to trigger Vercel rebuild."
      ) {
        successMessage += " Rebuild trigger failed.";
      } else if (result.rebuildStatus === "skipped") {
        successMessage +=
          " Rebuild skipped (hook URL set but trigger skipped).";
      } else if (
        result.rebuildStatus === "not configured"
      ) {
        successMessage += " Rebuild not configured.";
      }
      toast.update(saveToastId, {
        render: successMessage,
        type: "success",
        isLoading: false,
        autoClose: 5000,
      });
      resetForm();
      await fetchPosts();
    } catch (error) {
      console.error("Save error:", error);
      const errorText = `Error ${
        editingSlug ? "updating" : "saving"
      } post: ${
        error instanceof Error ? error.message : "Unknown error"
      }`;
      toast.update(saveToastId, {
        render: errorText,
        type: "error",
        isLoading: false,
        autoClose: 5000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = useCallback(
    async (slug: string): Promise<void> => {
      setIsLoadingEdit(true);
      resetForm();
      try {
        const response = await fetch(
          `/api/admin/posts/${slug}`
        );
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || "Failed to fetch post data"
          );
        }
        const postData: PostData = await response.json();
        setTitle(postData.title);
        setDate(formatIsoToLocalDateTime(postData.date));
        setSeoKeywords(postData.seoKeywords || "");
        setSeoDescription(postData.seoDescription || "");
        editor?.commands.setContent(
          postData.htmlContent || "<p></p>"
        );
        setEditingSlug(slug);
      } catch (error) {
        console.error("Edit error:", error);
        toast.error(
          `Error loading post for editing: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
        resetForm();
      } finally {
        setIsLoadingEdit(false);
      }
    },
    [editor, resetForm]
  );

  const handleDelete = async (
    slug: string
  ): Promise<void> => {
    if (
      !window.confirm(
        `Are you sure you want to delete the post "${slug}"? This cannot be undone.`
      )
    ) {
      return;
    }
    setIsDeleting(slug);
    const deleteToastId = toast.loading("Deleting post...");
    try {
      const response = await fetch(
        `/api/admin/posts/${slug}`,
        { method: "DELETE" }
      );
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            result.details ||
            "Failed to delete post"
        );
      }
      toast.update(deleteToastId, {
        render:
          result.message ||
          `Post "${slug}" deleted successfully!`,
        type: "success",
        isLoading: false,
        autoClose: 5000,
      });
      await fetchPosts();
      if (editingSlug === slug) {
        resetForm();
      }
    } catch (error) {
      console.error("Delete error:", error);
      const errorText = `Error deleting post: ${
        error instanceof Error ? error.message : "Unknown error"
      }`;
      toast.update(deleteToastId, {
        render: errorText,
        type: "error",
        isLoading: false,
        autoClose: 5000,
      });
    } finally {
      setIsDeleting(null);
    }
  };

  // Render
  if (!editor) {
    return (
      <div className="p-6 text-center text-gray-500 dark:text-gray-400">
        Loading Editor...
      </div>
    );
  }

  return (
    <div className="flex flex-col p-6 mx-auto bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 h-screen overflow-hidden">
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
      <div className="flex flex-col md:flex-row gap-8 flex-grow min-h-0 overflow-hidden">
        {/* Left Column */}
        <section className="md:w-1/3 flex flex-col space-y-4 overflow-y-auto min-h-0">
          <h2 className="text-xl font-semibold border-b pb-2 border-gray-300 dark:border-gray-700 sticky top-0 bg-gray-50 dark:bg-gray-900 z-10 flex-shrink-0">
            Manage Posts
          </h2>
          <div className="flex-grow overflow-y-auto">
            {isLoadingPosts ? (
              <p className="text-gray-500 dark:text-gray-400">
                Fetching posts...
              </p>
            ) : posts.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">
                No posts here yet. Let&apos;s make a difference.
              </p>
            ) : (
              <ul className="space-y-2">
                {posts.map((post) => (
                  <li
                    key={post.slug}
                    className="flex items-center justify-between gap-4 p-3 bg-white dark:bg-gray-800 rounded shadow-sm border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex-grow min-w-0">
                      <span
                        className="font-medium block truncate"
                        title={post.title}
                      >
                        {post.title}
                      </span>
                      <span
                        className="text-xs text-gray-500 dark:text-gray-400 block truncate"
                        title={post.slug}
                      >
                        ({post.slug})
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 block">
                        -{" "}
                        {new Date(
                          post.date
                        ).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex flex-shrink-0 items-center space-x-2">
                      <button
                        onClick={() =>
                          handleEdit(post.slug)
                        }
                        disabled={
                          isLoadingEdit ||
                          isSaving ||
                          !!isDeleting
                        }
                        className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoadingEdit &&
                        editingSlug === post.slug
                          ? "Loading..."
                          : "Edit"}
                      </button>
                      <button
                        onClick={() =>
                          handleDelete(post.slug)
                        }
                        disabled={
                          isSaving || !!isDeleting
                        }
                        className="px-3 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isDeleting === post.slug
                          ? "Deleting..."
                          : "Delete"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Right Column */}
        <section className="md:w-2/3 flex flex-col space-y-4 border-t md:border-t-0 md:border-l md:pl-8 pt-8 md:pt-0 border-gray-300 dark:border-gray-700 overflow-hidden min-h-0">
          <h1 className="text-2xl font-bold sticky top-0 bg-gray-50 dark:bg-gray-900 z-10 pt-8 md:pt-0 pb-2">
            {editingSlug ? `Edit Post: ${title || editingSlug}` : "Create New Blog Post"}
          </h1>

          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Title:
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={handleTitleChange}
              disabled={isSaving}
              className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 bg-white dark:bg-gray-800 disabled:opacity-70"
              placeholder="Enter post title"
            />
          </div>

          {/* ICON-ONLY TOGGLE BUTTONS FOR SEO and DATE */}
          <div className="flex space-x-2 my-3">
            <button
              onClick={() =>
                setShowDateInput((prev) => !prev)
              }
              className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
              title={
                showDateInput
                  ? "Hide Date input"
                  : "Show Date input"
              }
            >
              <BsCalendar className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>

            <button
              onClick={() =>
                setShowSeoKeywordsInput((prev) => !prev)
              }
              className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
              title={
                showSeoKeywordsInput
                  ? "Hide SEO Keywords input"
                  : "Show SEO Keywords input"
              }
            >
              <BsTags className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>

            <button
              onClick={() =>
                setShowSeoDescriptionInput((prev) => !prev)
              }
              className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
              title={
                showSeoDescriptionInput
                  ? "Hide SEO Description input"
                  : "Show SEO Description input"
              }
            >
              <BsCardText className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>
          </div>
          {/* END NEW ICON-ONLY TOGGLE BUTTONS */}

          {showDateInput && (
            <div>
              <label
                htmlFor="date"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Date:
              </label>
              <input
                type="datetime-local"
                id="date"
                value={date}
                onChange={handleDateChange}
                disabled={isSaving}
                className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 bg-white dark:bg-gray-800 disabled:opacity-70"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Date and time are based on your local timezone but saved as UTC.
              </p>
            </div>
          )}

          {showSeoKeywordsInput && (
            <div>
              <label
                htmlFor="seoKeywords"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                SEO Keywords:
              </label>
              <input
                type="text"
                id="seoKeywords"
                value={seoKeywords}
                onChange={handleSeoKeywordsChange}
                disabled={isSaving}
                className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 bg-white dark:bg-gray-800 disabled:opacity-70"
                placeholder="Enter comma-separated keywords"
              />
            </div>
          )}

          {showSeoDescriptionInput && (
            <div>
              <label
                htmlFor="seoDescription"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                SEO Description:
              </label>
              <textarea
                id="seoDescription"
                value={seoDescription}
                onChange={handleSeoDescriptionChange}
                rows={3}
                disabled={isSaving}
                className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 bg-white dark:bg-gray-800 disabled:opacity-70"
                placeholder="Enter a brief description for search engines (max ~160 chars)"
              />
            </div>
          )}

          {/* Content Editor */}
          <div className="flex flex-col flex-1 overflow-hidden">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Content:
            </label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              style={{ display: "none" }}
            />
            <div className="border border-gray-300 dark:border-gray-700 rounded-md overflow-hidden flex flex-col flex-1">
            <div className="flex flex-wrap items-center gap-2 p-2 border-b border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex-shrink-0">
                <MenuBar editor={editor} />
                <button
                  onClick={triggerFileInput}
                  disabled={isSaving}
                  className="bg-gray-700 hover:bg-gray-600 text-gray-200 font-bold py-1.5 px-3 rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  title="Upload Image"
                >
                  <BsImage size={16} />
                </button>

             {/* Save Post button in toolbar */}
                <button
                  onClick={handleSave}
                  disabled={isSaving || isLoadingEdit || !!isDeleting}
                  className="bg-green-600 hover:bg-green-500 text-white font-bold py-1.5 px-3 rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  title={editingSlug ? "Update Post" : "Save Post"}
                >
                  {isSaving
                    ? "Saving..."
                    : editingSlug
                    ? "Update Post"
                    : "Save Post"}
                </button>
                {/* Clear Editor button */}
                {!editingSlug && (
                  <button
                    onClick={() => editor.commands.clearContent()}
                    disabled={isSaving}
                    className="bg-gray-700 hover:bg-gray-600 text-gray-200 font-bold py-1.5 px-3 rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Clear Editor"
                  >
                    Clear Editor
                  </button>
                )}
              </div>
              <div className="flex-grow overflow-y-auto">
                <EditorContent editor={editor} />
              </div>
            </div>
          </div>

          
        </section>
      </div>
    </div>
  );
};

export default BlogAdminPage;
