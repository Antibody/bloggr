import Image from "@tiptap/extension-image";
import type { DOMOutputSpec } from "@tiptap/pm/model";
import { mergeAttributes } from "@tiptap/core";

export const CaptionImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      src: {
        default: null,
        parseHTML: (element: HTMLElement) =>
          (element.matches("img")
            ? element
            : element.querySelector("img")
          )?.getAttribute("src"),
      },
      alt: {
        default: null,
        parseHTML: (element: HTMLElement) =>
          (element.matches("img")
            ? element
            : element.querySelector("img")
          )?.getAttribute("alt"),
      },
      title: {
        default: null,
        parseHTML: (element: HTMLElement) =>
          (element.matches("img")
            ? element
            : element.querySelector("img")
          )?.getAttribute("title"),
      },
      caption: {
        default: "",
        rendered: false,
        parseHTML: (element: HTMLElement) =>
          element.closest("figure")?.querySelector("figcaption")?.textContent ||
          "",
      },
    };
  },
  parseHTML() {
    return [
      {
        tag: "figure",
        getAttrs: (element: HTMLElement) => {
          const img = element.querySelector("img");
          if (!img) return false;
          return {
            src: img.getAttribute("src"),
            alt: img.getAttribute("alt"),
            title: img.getAttribute("title"),
            caption: element.querySelector("figcaption")?.textContent || "",
          };
        },
      },
      { tag: "img[src]" },
    ];
  },
  renderHTML({ node, HTMLAttributes }) {
    const img: DOMOutputSpec = [
      "img",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
    ];
    return node.attrs.caption
      ? ["figure", {}, img, ["figcaption", {}, String(node.attrs.caption)]]
      : img;
  },
});
export default CaptionImage;
