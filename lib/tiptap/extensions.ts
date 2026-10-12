import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Youtube from "@tiptap/extension-youtube";

/**
 * Ekstensi yang dipakai BERSAMA oleh editor (client) dan renderer halaman publik (server).
 * Jangan taruh ekstensi khusus-editor (mis. Placeholder) di sini.
 */
export const baseExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
  }),
  Underline,
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  Image.configure({ HTMLAttributes: { loading: "lazy" } }),
  Link.configure({
    openOnClick: false,
    autolink: true,
    HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
  }),
  Youtube.configure({
    nocookie: true,
    controls: true,
    width: 640,
    height: 360,
  }),
];
