import { generateHTML } from "@tiptap/html";
import type { JSONContent } from "@tiptap/core";
import { baseExtensions } from "./extensions";

type Node = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  content?: Node[];
};

const MAX_DEPTH = 40;

function isHttpUrl(v: unknown): v is string {
  if (typeof v !== "string") return false;
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function isYoutubeUrl(v: unknown): v is string {
  if (!isHttpUrl(v)) return false;
  const host = new URL(v).hostname.replace(/^www\./, "");
  return ["youtube.com", "youtube-nocookie.com", "youtu.be", "m.youtube.com"].includes(host);
}

function cleanNode(node: Node, depth: number): Node | null {
  if (depth > MAX_DEPTH || typeof node !== "object" || node === null) return null;

  if (node.type === "image" && !isHttpUrl(node.attrs?.src)) return null;
  if (node.type === "youtube" && !isYoutubeUrl(node.attrs?.src)) return null;

  const cleaned: Node = { ...node };

  if (Array.isArray(node.marks)) {
    cleaned.marks = node.marks.filter(
      (m) => m.type !== "link" || isHttpUrl(m.attrs?.href) || /^mailto:/i.test(String(m.attrs?.href ?? "")),
    );
  }

  if (Array.isArray(node.content)) {
    cleaned.content = node.content
      .map((c) => cleanNode(c, depth + 1))
      .filter((c): c is Node => c !== null);
  }
  return cleaned;
}

/**
 * Bersihkan dokumen Tiptap dari klien sebelum disimpan:
 * buang gambar/video/link dengan URL tidak aman (javascript:, data:, dll).
 */
export function sanitizeDoc(doc: unknown): JSONContent | null {
  if (typeof doc !== "object" || doc === null) return null;
  if ((doc as Node).type !== "doc") return null;
  return cleanNode(doc as Node, 0) as JSONContent | null;
}

/** Ekstrak teks polos dari dokumen (untuk pencarian & cuplikan). */
export function docToText(doc: unknown): string {
  const parts: string[] = [];
  const walk = (n: Node, depth: number) => {
    if (!n || depth > MAX_DEPTH) return;
    if (typeof n.text === "string") parts.push(n.text);
    if (Array.isArray(n.content)) {
      n.content.forEach((c) => walk(c, depth + 1));
      // pisahkan blok dengan spasi agar kata tidak menempel
      if (n.type && n.type !== "doc" && !n.text) parts.push(" ");
    }
  };
  walk(doc as Node, 0);
  return parts.join("").replace(/\s+/g, " ").trim();
}

/** Render dokumen Tiptap menjadi HTML (server-side) untuk halaman publik. */
export function renderDocHtml(doc: unknown): string {
  try {
    return generateHTML(doc as JSONContent, baseExtensions);
  } catch {
    return "";
  }
}
