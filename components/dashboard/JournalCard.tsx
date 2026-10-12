import Link from "next/link";
import { ExternalLink, Globe, KeyRound, Lock } from "lucide-react";
import { formatDateTime } from "@/lib/date";
import { getMood } from "@/lib/constants";
import { cn } from "@/lib/utils";
import DeleteJournalButton from "@/components/DeleteJournalButton";

export type CardJournal = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  status: "draft" | "published";
  visibility: "private" | "public" | "protected";
  mood: string | null;
  category: string | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
};

const VIS = {
  private: { icon: Lock, label: "Private" },
  public: { icon: Globe, label: "Public" },
  protected: { icon: KeyRound, label: "Password" },
} as const;

export default function JournalCard({ journal: j }: { journal: CardJournal }) {
  const mood = getMood(j.mood);
  const vis = VIS[j.visibility];
  const VisIcon = vis.icon;
  const isLive = j.status === "published" && j.visibility !== "private";

  return (
    <article className="card p-4 transition-shadow hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/editor/${j.id}`} className="min-w-0 flex-1">
          <h2 className="truncate font-serif text-lg font-semibold">
            {mood && <span className="mr-1.5" title={mood.label}>{mood.emoji}</span>}
            {j.title || <span className="text-stone-400">Tanpa judul</span>}
          </h2>
          <p className="mt-1 line-clamp-2 text-sm text-stone-600 dark:text-stone-400">
            {j.excerpt || "Belum ada isi."}
          </p>
        </Link>

        <div className="flex shrink-0 items-center">
          {isLive && (
            <Link
              href={`/p/${j.slug}`}
              target="_blank"
              className="btn btn-ghost !px-2"
              title="Buka halaman publik"
              aria-label="Buka halaman publik"
            >
              <ExternalLink className="h-4 w-4" />
            </Link>
          )}
          <DeleteJournalButton id={j.id} />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-stone-500 dark:text-stone-400">
        <span
          className={cn(
            "rounded-full px-2 py-0.5 font-medium",
            j.status === "published"
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
              : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
          )}
        >
          {j.status === "published" ? "Published" : "Draft"}
        </span>
        <span className="inline-flex items-center gap-1">
          <VisIcon className="h-3.5 w-3.5" />
          {vis.label}
        </span>
        {j.category && <span>· {j.category}</span>}
        <time dateTime={j.createdAt.toISOString()}>{formatDateTime(j.createdAt)}</time>
        {j.tags.map((t) => (
          <span key={t}>#{t}</span>
        ))}
      </div>
    </article>
  );
}
