"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useDebouncedCallback } from "use-debounce";
import { dashboardHref } from "@/lib/utils";

type Props = {
  defaultValue?: string;
  /** Query dashboard saat ini (tanpa q) agar filter lain tidak hilang */
  params: Record<string, string | undefined>;
};

export default function SearchBox({ defaultValue = "", params }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  const push = useDebouncedCallback((v: string) => {
    router.replace(dashboardHref(params, { q: v.trim() || null }));
  }, 400);

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
      <input
        type="search"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          push(e.target.value);
        }}
        placeholder="Cari judul atau isi jurnal…"
        aria-label="Cari jurnal"
        className="input !pl-9"
      />
    </div>
  );
}
