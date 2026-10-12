"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { EditorContent, useEditor, type Editor, type JSONContent } from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import { useDebouncedCallback } from "use-debounce";
import { ArrowLeft, Eye, SlidersHorizontal } from "lucide-react";
import { baseExtensions } from "@/lib/tiptap/extensions";
import { saveJournal } from "@/app/actions/journal";
import { uploadImage } from "@/lib/upload";
import { AUTOSAVE_DELAY_MS, getMood } from "@/lib/constants";
import ThemeToggle from "@/components/ThemeToggle";
import Toolbar from "./Toolbar";
import SaveIndicator, { type SaveState } from "./SaveIndicator";
import PublishPanel, { type PublishMeta } from "./PublishPanel";

export type EditorJournal = {
  id: string;
  userId: string;
  title: string;
  content: JSONContent;
  mood: string | null;
  category: string | null;
  tags: string[];
  meta: PublishMeta;
};

export default function JournalEditor({ journal }: { journal: EditorJournal }) {
  const router = useRouter();

  /* ───────── state ───────── */
  const [title, setTitle] = useState(journal.title);
  const [mood, setMood] = useState<string | null>(journal.mood);
  const [category, setCategory] = useState(journal.category ?? "");
  const [tags, setTags] = useState<string[]>(journal.tags);
  const [meta, setMeta] = useState<PublishMeta>(journal.meta);

  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  /* ───────── refs (agar callback tidak basi / stale) ───────── */
  const latest = useRef({ title, mood, category, tags });
  latest.current = { title, mood, category, tags };

  const editorRef = useRef<Editor | null>(null);
  const dirty = useRef(false);
  const inflight = useRef<Promise<void> | null>(null);
  const uploadRef = useRef<(files: File[], pos?: number) => void>(() => {});
  const debouncedRef = useRef<() => void>(() => {});

  /* ───────── auto-save ───────── */
  const doSave = useCallback(async () => {
    const editor = editorRef.current;
    if (!editor || editor.isDestroyed) return;

    // Jika ada penyimpanan yang sedang berjalan, tunggu dulu, lalu simpan state terbaru.
    if (inflight.current) await inflight.current;
    if (!dirty.current) return; // tidak ada perubahan sejak penyimpanan terakhir

    const run = (async () => {
      dirty.current = false;
      setSaveState("saving");
      const l = latest.current;
      let res: Awaited<ReturnType<typeof saveJournal>>;
      try {
        res = await saveJournal(journal.id, {
          title: l.title,
          content: JSON.parse(JSON.stringify(editor.getJSON())),
          mood: l.mood,
          category: l.category.trim() || null,
          tags: l.tags,
        });
      } catch {
        res = { ok: false, error: "Koneksi bermasalah." };
      }

      if (res.ok) {
        setSaveError(null);
        // Jika user mengetik lagi selama proses simpan, jadwal debounce sudah berjalan.
        setSaveState(dirty.current ? "dirty" : "saved");
      } else {
        dirty.current = true; // coba lagi nanti
        setSaveError(res.error);
        setSaveState("error");
      }
    })();

    inflight.current = run;
    try {
      await run;
    } finally {
      if (inflight.current === run) inflight.current = null;
    }
  }, [journal.id]);

  const debouncedSave = useDebouncedCallback(doSave, AUTOSAVE_DELAY_MS, { maxWait: 10_000 });
  debouncedRef.current = debouncedSave;

  const markDirty = useCallback(() => {
    dirty.current = true;
    setSaveState((s) => (s === "saving" ? s : "dirty"));
    debouncedRef.current();
  }, []);

  /** Simpan sekarang juga (dipakai sebelum menerbitkan / keluar halaman). */
  const saveNow = useCallback(async () => {
    debouncedSave.cancel();
    await doSave();
  }, [debouncedSave, doSave]);

  /* ───────── editor ───────── */
  const editor = useEditor({
    extensions: [
      ...baseExtensions,
      Placeholder.configure({ placeholder: "Tulis ceritamu di sini…" }),
    ],
    content: journal.content,
    immediatelyRender: false, // hindari hydration mismatch di Next.js
    editorProps: {
      attributes: {
        class:
          "tiptap prose prose-stone max-w-none min-h-[60vh] pb-32 focus:outline-none dark:prose-invert prose-p:leading-relaxed",
      },
      handleDrop(view, event, _slice, moved) {
        if (moved) return false;
        const files = Array.from(event.dataTransfer?.files ?? []).filter((f) =>
          f.type.startsWith("image/"),
        );
        if (!files.length) return false;
        event.preventDefault();
        const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
        uploadRef.current(files, coords?.pos);
        return true;
      },
      handlePaste(_view, event) {
        const files = Array.from(event.clipboardData?.files ?? []).filter((f) =>
          f.type.startsWith("image/"),
        );
        if (!files.length) return false;
        event.preventDefault();
        uploadRef.current(files);
        return true;
      },
    },
    onUpdate: () => markDirty(),
  });
  editorRef.current = editor;

  /* ───────── upload gambar (drag-drop, paste, tombol toolbar) ───────── */
  uploadRef.current = async (files, pos) => {
    const ed = editorRef.current;
    if (!ed) return;
    let insertAt = pos;
    for (const file of files) {
      setUploading((n) => n + 1);
      try {
        const src = await uploadImage(file, { userId: journal.userId, journalId: journal.id });
        const image = { type: "image", attrs: { src, alt: file.name } };
        if (insertAt !== undefined) {
          ed.chain().focus().insertContentAt(insertAt, image).run();
          insertAt = undefined; // gambar berikutnya menyusul di posisi kursor
        } else {
          ed.chain().focus().insertContent(image).run();
        }
      } catch (e) {
        setNotice(e instanceof Error ? e.message : "Upload gagal.");
      } finally {
        setUploading((n) => n - 1);
      }
    }
  };

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  /* ───────── jaga data saat tab ditutup / disembunyikan ───────── */
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty.current || inflight.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") debouncedSave.flush();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [debouncedSave]);

  async function goBack() {
    await saveNow();
    router.push("/dashboard");
  }

  const words = editor ? editor.getText().split(/\s+/).filter(Boolean).length : 0;
  const currentMood = getMood(mood);
  const isPublished = meta.status === "published";

  return (
    <div className="min-h-screen">
      {/* ───────── Header ───────── */}
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-stone-50/95 backdrop-blur dark:border-stone-800 dark:bg-stone-950/95">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-3 px-3">
          <button type="button" onClick={goBack} className="btn btn-ghost !px-2.5">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </button>

          <div className="flex items-center gap-3">
            <SaveIndicator
              state={saveState}
              isPublished={isPublished}
              errorMessage={saveError}
              onRetry={() => void saveNow()}
            />
            <span className="hidden text-xs text-stone-400 md:inline">{words} kata</span>
          </div>

          <div className="flex items-center gap-1">
            {currentMood && (
              <span className="hidden text-lg sm:inline" title={`Mood: ${currentMood.label}`}>
                {currentMood.emoji}
              </span>
            )}
            <Link href={`/p/${meta.slug}`} target="_blank" className="btn btn-ghost !px-2.5" title="Pratinjau">
              <Eye className="h-4 w-4" />
              <span className="hidden md:inline">Pratinjau</span>
            </Link>
            <ThemeToggle />
            <button type="button" onClick={() => setPanelOpen((v) => !v)} className="btn btn-primary">
              <SlidersHorizontal className="h-4 w-4" />
              {isPublished ? "Pengaturan" : "Terbitkan"}
            </button>
          </div>
        </div>
      </header>

      {editor && <Toolbar editor={editor} uploading={uploading} onPickImages={(f) => uploadRef.current(f)} />}

      {/* ───────── Area menulis ───────── */}
      <main className="mx-auto max-w-3xl px-4 pt-8 sm:pt-12">
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            markDirty();
          }}
          maxLength={200}
          placeholder="Judul"
          aria-label="Judul jurnal"
          className="mb-6 w-full bg-transparent font-serif text-3xl font-semibold tracking-tight outline-none placeholder:text-stone-300 sm:text-4xl dark:placeholder:text-stone-700"
        />
        <EditorContent editor={editor} />
      </main>

      {notice && (
        <div role="alert" className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-red-600 px-4 py-2 text-sm text-white shadow-lg">
          {notice}
        </div>
      )}

      <PublishPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        journalId={journal.id}
        meta={meta}
        onMetaChange={setMeta}
        beforeApply={saveNow}
        mood={mood}
        onMoodChange={(v) => {
          setMood(v);
          markDirty();
        }}
        category={category}
        onCategoryChange={(v) => {
          setCategory(v);
          markDirty();
        }}
        tags={tags}
        onTagsChange={(v) => {
          setTags(v);
          markDirty();
        }}
      />
    </div>
  );
}
