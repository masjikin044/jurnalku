"use client";

import { useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { deleteJournal } from "@/app/actions/journal";

type Props = {
  id: string;
  /** Tampilkan teks "Hapus" di samping ikon */
  withLabel?: boolean;
  className?: string;
};

export default function DeleteJournalButton({ id, withLabel, className }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      title="Hapus jurnal"
      aria-label="Hapus jurnal"
      className={className ?? "btn btn-ghost !px-2 text-red-600 hover:!bg-red-50 dark:text-red-400 dark:hover:!bg-red-950"}
      onClick={() => {
        if (!window.confirm("Hapus jurnal ini beserta gambarnya? Tindakan ini tidak bisa dibatalkan.")) return;
        startTransition(async () => {
          const res = await deleteJournal(id);
          // Sukses → server melakukan redirect; hanya error yang sampai di sini.
          if (res && !res.ok) window.alert(res.error);
        });
      }}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      {withLabel && <span>Hapus jurnal</span>}
    </button>
  );
}
