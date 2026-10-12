"use client";

import { useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
  Youtube as YoutubeIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type BtnProps = {
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
};

function ToolButton({ label, onClick, active, disabled, children }: BtnProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      // mencegah editor kehilangan fokus/seleksi saat tombol diklik
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-stone-600 transition-colors hover:bg-stone-200/80 disabled:opacity-40 dark:text-stone-300 dark:hover:bg-stone-800",
        active && "bg-stone-200 text-stone-900 dark:bg-stone-700 dark:text-white",
      )}
    >
      {children}
    </button>
  );
}

const Sep = () => <span className="mx-1 h-5 w-px shrink-0 bg-stone-200 dark:bg-stone-700" />;

function normalizeUrl(raw: string) {
  const v = raw.trim();
  if (!v) return "";
  return /^(https?:\/\/|mailto:)/i.test(v) ? v : `https://${v}`;
}

type Props = {
  editor: Editor;
  uploading: number;
  onPickImages: (files: File[]) => void;
};

export default function Toolbar({ editor, uploading, onPickImages }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [urlMode, setUrlMode] = useState<null | "link" | "youtube">(null);
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState("");

  const icon = "h-[18px] w-[18px]";

  function openUrlBar(mode: "link" | "youtube") {
    if (mode === "link" && editor.isActive("link")) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    setUrl(mode === "link" ? ((editor.getAttributes("link").href as string) ?? "") : "");
    setUrlError("");
    setUrlMode(mode);
  }

  function submitUrl() {
    const href = normalizeUrl(url);
    if (!href) return setUrlError("Masukkan URL.");

    if (urlMode === "link") {
      const { from, to } = editor.state.selection;
      if (from === to) {
        // Tanpa teks terpilih: sisipkan URL sebagai teks bertautan
        editor
          .chain()
          .focus()
          .insertContent({ type: "text", text: href, marks: [{ type: "link", attrs: { href } }] })
          .run();
      } else {
        editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
      }
    } else {
      const ok = editor.chain().focus().setYoutubeVideo({ src: href }).run();
      if (!ok) return setUrlError("URL YouTube tidak valid.");
    }
    setUrlMode(null);
    setUrl("");
  }

  return (
    <div className="sticky top-14 z-20 border-b border-stone-200 bg-stone-50/95 backdrop-blur dark:border-stone-800 dark:bg-stone-950/95">
      <div className="mx-auto flex max-w-4xl items-center gap-0.5 overflow-x-auto px-3 py-1.5">
        <ToolButton label="Urungkan (Ctrl+Z)" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
          <Undo2 className={icon} />
        </ToolButton>
        <ToolButton label="Ulangi (Ctrl+Y)" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
          <Redo2 className={icon} />
        </ToolButton>
        <Sep />

        <ToolButton label="Judul 1" active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
          <Heading1 className={icon} />
        </ToolButton>
        <ToolButton label="Judul 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 className={icon} />
        </ToolButton>
        <ToolButton label="Judul 3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3 className={icon} />
        </ToolButton>
        <Sep />

        <ToolButton label="Tebal (Ctrl+B)" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className={icon} />
        </ToolButton>
        <ToolButton label="Miring (Ctrl+I)" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className={icon} />
        </ToolButton>
        <ToolButton label="Garis bawah (Ctrl+U)" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon className={icon} />
        </ToolButton>
        <ToolButton label="Coret" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough className={icon} />
        </ToolButton>
        <Sep />

        <ToolButton label="Daftar poin" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className={icon} />
        </ToolButton>
        <ToolButton label="Daftar bernomor" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className={icon} />
        </ToolButton>
        <ToolButton label="Kutipan" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote className={icon} />
        </ToolButton>
        <ToolButton label="Blok kode" active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
          <Code2 className={icon} />
        </ToolButton>
        <ToolButton label="Garis pemisah" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus className={icon} />
        </ToolButton>
        <Sep />

        <ToolButton label="Rata kiri" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
          <AlignLeft className={icon} />
        </ToolButton>
        <ToolButton label="Rata tengah" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
          <AlignCenter className={icon} />
        </ToolButton>
        <ToolButton label="Rata kanan" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}>
          <AlignRight className={icon} />
        </ToolButton>
        <Sep />

        <ToolButton label="Tautan" active={editor.isActive("link")} onClick={() => openUrlBar("link")}>
          <Link2 className={icon} />
        </ToolButton>
        <ToolButton label="Sisipkan gambar" onClick={() => fileRef.current?.click()}>
          {uploading > 0 ? <Loader2 className={cn(icon, "animate-spin")} /> : <ImagePlus className={icon} />}
        </ToolButton>
        <ToolButton label="Embed video YouTube" onClick={() => openUrlBar("youtube")}>
          <YoutubeIcon className={icon} />
        </ToolButton>

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          hidden
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            if (files.length) onPickImages(files);
          }}
        />
      </div>

      {urlMode && (
        <form
          className="mx-auto flex max-w-4xl items-center gap-2 px-3 pb-2"
          onSubmit={(e) => {
            e.preventDefault();
            submitUrl();
          }}
        >
          <input
            autoFocus
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setUrlError("");
            }}
            placeholder={urlMode === "link" ? "Tempel URL tautan…" : "Tempel URL video YouTube…"}
            className="input !py-1.5"
          />
          <button type="submit" className="btn btn-primary !py-1.5">
            {urlMode === "link" ? "Pasang" : "Sisipkan"}
          </button>
          <button type="button" className="btn btn-ghost !py-1.5" onClick={() => setUrlMode(null)}>
            Batal
          </button>
          {urlError && <span className="text-xs text-red-600">{urlError}</span>}
        </form>
      )}
    </div>
  );
}
