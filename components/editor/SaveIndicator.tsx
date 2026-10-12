"use client";

import { AlertCircle, Check, Loader2, PencilLine } from "lucide-react";

export type SaveState = "saved" | "dirty" | "saving" | "error";

type Props = {
  state: SaveState;
  isPublished: boolean;
  errorMessage?: string | null;
  onRetry: () => void;
};

export default function SaveIndicator({ state, isPublished, errorMessage, onRetry }: Props) {
  if (state === "saving") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-stone-500" role="status">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Menyimpan...
      </span>
    );
  }
  if (state === "error") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400" role="alert" title={errorMessage ?? undefined}>
        <AlertCircle className="h-3.5 w-3.5" />
        Gagal menyimpan
        <button type="button" onClick={onRetry} className="underline">
          Coba lagi
        </button>
      </span>
    );
  }
  if (state === "dirty") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-stone-400" role="status">
        <PencilLine className="h-3.5 w-3.5" />
        Belum disimpan…
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400" role="status">
      <Check className="h-3.5 w-3.5" />
      {isPublished ? "Tersimpan" : "Tersimpan sebagai draf"}
    </span>
  );
}
