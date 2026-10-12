"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Globe, KeyRound, Loader2, Lock, X } from "lucide-react";
import { applyPublishSettings } from "@/app/actions/journal";
import {
  CATEGORY_SUGGESTIONS,
  VISIBILITY_OPTIONS,
  type StatusValue,
  type VisibilityValue,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import MoodPicker from "./MoodPicker";
import DeleteJournalButton from "@/components/DeleteJournalButton";

export type PublishMeta = {
  status: StatusValue;
  visibility: VisibilityValue;
  slug: string;
  hasPassword: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  journalId: string;
  meta: PublishMeta;
  onMetaChange: (meta: PublishMeta) => void;
  /** Dipanggil sebelum menerbitkan agar isi terbaru sudah tersimpan. */
  beforeApply: () => Promise<void>;
  mood: string | null;
  onMoodChange: (v: string | null) => void;
  category: string;
  onCategoryChange: (v: string) => void;
  tags: string[];
  onTagsChange: (v: string[]) => void;
};

const VIS_ICON = { private: Lock, public: Globe, protected: KeyRound } as const;

export default function PublishPanel(props: Props) {
  const { open, onClose, journalId, meta, onMetaChange, beforeApply } = props;

  const [visibility, setVisibility] = useState<VisibilityValue>(meta.visibility);
  const [password, setPassword] = useState("");
  const [slug, setSlug] = useState(meta.slug.startsWith("draf-") ? "" : meta.slug);
  const [tagInput, setTagInput] = useState("");
  const [busy, setBusy] = useState<null | "publish" | "draft">(null);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  // Sinkronkan bila meta berubah dari luar
  useEffect(() => {
    setVisibility(meta.visibility);
  }, [meta.visibility]);

  async function apply(status: StatusValue) {
    setBusy(status === "published" ? "publish" : "draft");
    setMessage(null);
    try {
      await beforeApply();
      const res = await applyPublishSettings(journalId, {
        status,
        visibility,
        password: password || undefined,
        slug: slug || undefined,
      });
      if (!res.ok) {
        setMessage({ type: "error", text: res.error });
        return;
      }
      onMetaChange({
        status: res.status,
        visibility: res.visibility,
        slug: res.slug,
        hasPassword: res.hasPassword,
      });
      setSlug(res.slug.startsWith("draf-") ? "" : res.slug);
      setPassword("");
      setMessage({
        type: "ok",
        text: res.status === "published" ? "Pengaturan diterapkan & diterbitkan." : "Pengaturan disimpan sebagai draf.",
      });
    } catch {
      setMessage({ type: "error", text: "Terjadi kesalahan jaringan. Coba lagi." });
    } finally {
      setBusy(null);
    }
  }

  function addTag(raw: string) {
    const v = raw.trim().toLowerCase().replace(/^#/, "");
    if (!v || props.tags.includes(v) || props.tags.length >= 10) return;
    props.onTagsChange([...props.tags, v.slice(0, 30)]);
  }

  const isPublished = meta.status === "published";
  const needsPassword = visibility === "protected";

  return (
    <>
      {/* backdrop hanya di layar kecil */}
      {open && <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={onClose} aria-hidden />}

      <aside
        aria-label="Pengaturan jurnal"
        className={cn(
          "fixed inset-y-0 right-0 z-40 w-full max-w-sm overflow-y-auto border-l border-stone-200 bg-white p-5 shadow-xl transition-transform duration-200 dark:border-stone-800 dark:bg-stone-900",
          open ? "translate-x-0" : "pointer-events-none translate-x-full",
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">Pengaturan jurnal</h2>
          <button type="button" onClick={onClose} className="btn btn-ghost !px-2" aria-label="Tutup">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ─── Visibilitas ─── */}
        <section className="space-y-2">
          <h3 className="text-sm font-medium">Siapa yang bisa membaca?</h3>
          {VISIBILITY_OPTIONS.map((opt) => {
            const Icon = VIS_ICON[opt.value];
            const active = visibility === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setVisibility(opt.value)}
                aria-pressed={active}
                className={cn(
                  "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                  active
                    ? "border-stone-900 bg-stone-50 dark:border-stone-100 dark:bg-stone-800"
                    : "border-stone-200 hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-800",
                )}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  <span className="block text-sm font-medium">{opt.label}</span>
                  <span className="block text-xs text-stone-500 dark:text-stone-400">{opt.desc}</span>
                </span>
              </button>
            );
          })}

          {needsPassword && (
            <label className="block pt-1 text-sm">
              <span className="mb-1 block font-medium">Password / PIN</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={4}
                maxLength={64}
                placeholder={meta.hasPassword ? "Kosongkan untuk memakai password lama" : "Minimal 4 karakter"}
                className="input"
              />
              <span className="mt-1 block text-xs text-stone-500">
                Disimpan terenkripsi (hash bcrypt). Bagikan password lewat jalur terpisah dari link.
              </span>
            </label>
          )}
        </section>

        {/* ─── URL ─── */}
        <section className="mt-5">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Alamat (slug)</span>
            <div className="flex items-center rounded-lg border border-stone-300 bg-white text-sm dark:border-stone-700 dark:bg-stone-900">
              <span className="pl-3 text-stone-400">/p/</span>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="otomatis dari judul"
                className="w-full bg-transparent px-1 py-2 outline-none"
              />
            </div>
          </label>
        </section>

        {/* ─── Tombol terbit ─── */}
        <section className="mt-5 space-y-2">
          <button type="button" disabled={busy !== null} onClick={() => apply("published")} className="btn btn-primary w-full">
            {busy === "publish" && <Loader2 className="h-4 w-4 animate-spin" />}
            {isPublished ? "Perbarui pengaturan" : "Terbitkan"}
          </button>
          <button type="button" disabled={busy !== null} onClick={() => apply("draft")} className="btn btn-outline w-full">
            {busy === "draft" && <Loader2 className="h-4 w-4 animate-spin" />}
            {isPublished ? "Tarik jadi draf" : "Simpan pengaturan (tetap draf)"}
          </button>

          {message && (
            <p
              role={message.type === "error" ? "alert" : "status"}
              className={cn(
                "rounded-lg px-3 py-2 text-xs",
                message.type === "error"
                  ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                  : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
              )}
            >
              {message.text}
            </p>
          )}

          <Link href={`/p/${meta.slug}`} target="_blank" className="flex items-center justify-center gap-1.5 pt-1 text-xs text-stone-500 hover:underline">
            <ExternalLink className="h-3.5 w-3.5" />
            {isPublished && meta.visibility !== "private" ? "Buka halaman publik" : "Pratinjau (hanya Anda)"}
          </Link>

          <p className="text-[11px] leading-relaxed text-stone-400">
            Catatan: perubahan pada jurnal yang sudah terbit tersimpan otomatis dan langsung terlihat oleh pembaca.
          </p>
        </section>

        <hr className="my-5 border-stone-200 dark:border-stone-800" />

        {/* ─── Mood ─── */}
        <section>
          <h3 className="mb-2 text-sm font-medium">Mood hari ini</h3>
          <MoodPicker value={props.mood} onChange={props.onMoodChange} />
        </section>

        {/* ─── Kategori ─── */}
        <section className="mt-5">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Kategori</span>
            <input
              list="category-suggestions"
              value={props.category}
              onChange={(e) => props.onCategoryChange(e.target.value)}
              maxLength={40}
              placeholder="Pribadi, Ide, Work…"
              className="input"
            />
            <datalist id="category-suggestions">
              {CATEGORY_SUGGESTIONS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </label>
        </section>

        {/* ─── Tag ─── */}
        <section className="mt-5">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Tag</span>
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addTag(tagInput);
                  setTagInput("");
                }
              }}
              onBlur={() => {
                addTag(tagInput);
                setTagInput("");
              }}
              placeholder="Ketik lalu tekan Enter"
              className="input"
            />
          </label>
          {props.tags.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {props.tags.map((t) => (
                <li key={t} className="chip">
                  #{t}
                  <button
                    type="button"
                    aria-label={`Hapus tag ${t}`}
                    onClick={() => props.onTagsChange(props.tags.filter((x) => x !== t))}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <hr className="my-5 border-stone-200 dark:border-stone-800" />

        <DeleteJournalButton id={journalId} withLabel className="btn btn-danger w-full" />
      </aside>
    </>
  );
}
