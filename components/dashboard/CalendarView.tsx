import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { dateKey, formatMonthTitle, shiftMonth } from "@/lib/date";
import { cn, dashboardHref } from "@/lib/utils";

type Props = {
  monthKey: string; // 'YYYY-MM'
  daysWithEntries: string[]; // ['YYYY-MM-DD', ...]
  selectedDate?: string;
  params: Record<string, string | undefined>;
};

const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

export default function CalendarView({ monthKey, daysWithEntries, selectedDate, params }: Props) {
  const [y, m] = monthKey.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const firstDow = new Date(Date.UTC(y, m - 1, 1)).getUTCDay(); // 0 = Minggu
  const offset = (firstDow + 6) % 7; // minggu dimulai Senin
  const today = dateKey(new Date());
  const withEntries = new Set(daysWithEntries);

  const cells: (number | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="card p-3">
      <div className="mb-2 flex items-center justify-between">
        <Link
          href={dashboardHref(params, { month: shiftMonth(monthKey, -1) })}
          className="btn btn-ghost !px-2 !py-1"
          aria-label="Bulan sebelumnya"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <span className="text-sm font-medium capitalize">{formatMonthTitle(monthKey)}</span>
        <Link
          href={dashboardHref(params, { month: shiftMonth(monthKey, 1) })}
          className="btn btn-ghost !px-2 !py-1"
          aria-label="Bulan berikutnya"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center text-[11px] text-stone-400">
        {WEEKDAYS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-y-1 text-center text-sm">
        {cells.map((day, i) => {
          if (day === null) return <span key={`e${i}`} />;
          const key = `${monthKey}-${String(day).padStart(2, "0")}`;
          const has = withEntries.has(key);
          const selected = selectedDate === key;
          return (
            <Link
              key={key}
              href={dashboardHref(params, { date: selected ? null : key, month: monthKey })}
              aria-label={`${day} ${formatMonthTitle(monthKey)}${has ? ", ada jurnal" : ""}`}
              aria-current={selected ? "date" : undefined}
              className={cn(
                "relative mx-auto flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                selected
                  ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900"
                  : "hover:bg-stone-100 dark:hover:bg-stone-800",
                key === today && !selected && "ring-1 ring-stone-400",
              )}
            >
              {day}
              {has && (
                <span
                  className={cn(
                    "absolute bottom-0.5 h-1 w-1 rounded-full",
                    selected ? "bg-white dark:bg-stone-900" : "bg-amber-500",
                  )}
                />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
