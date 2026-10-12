"use client";

import { MOODS } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Props = {
  value: string | null;
  onChange: (value: string | null) => void;
};

export default function MoodPicker({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {MOODS.map((m) => {
        const active = value === m.key;
        return (
          <button
            key={m.key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active ? null : m.key)}
            className={cn(
              "flex flex-col items-center rounded-lg border px-1 py-2 text-xs transition-colors",
              active
                ? "border-stone-900 bg-stone-100 dark:border-stone-100 dark:bg-stone-800"
                : "border-stone-200 hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800",
            )}
          >
            <span className="text-xl leading-none">{m.emoji}</span>
            <span className="mt-1 text-stone-600 dark:text-stone-300">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}
