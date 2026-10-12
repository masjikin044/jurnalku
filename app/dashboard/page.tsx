import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import type { Prisma } from "@prisma/client";
import SiteHeader from "@/components/SiteHeader";
import SearchBox from "@/components/dashboard/SearchBox";
import CalendarView from "@/components/dashboard/CalendarView";
import JournalCard from "@/components/dashboard/JournalCard";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createJournal } from "@/app/actions/journal";
import { MOODS, MOOD_KEYS } from "@/lib/constants";
import { dateKey, dayRange, isDateKey, isMonthKey, monthRange } from "@/lib/date";
import { cn, dashboardHref } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };

type SP = {
  q?: string;
  mood?: string;
  category?: string;
  status?: string;
  date?: string;
  month?: string;
};

export default async function DashboardPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const user = await requireUser();

  const q = sp.q?.trim().slice(0, 100) || undefined;
  const mood = sp.mood && MOOD_KEYS.includes(sp.mood) ? sp.mood : undefined;
  const category = sp.category?.slice(0, 40) || undefined;
  const status = sp.status === "draft" || sp.status === "published" ? sp.status : undefined;
  const date = isDateKey(sp.date) ? sp.date : undefined;
  const monthKey = isMonthKey(sp.month)
    ? sp.month
    : (date ?? dateKey(new Date())).slice(0, 7);

  const where: Prisma.JournalWhereInput = { userId: user.id };
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { contentText: { contains: q, mode: "insensitive" } },
      { tags: { has: q.toLowerCase().replace(/^#/, "") } },
    ];
  }
  if (mood) where.mood = mood;
  if (category) where.category = category;
  if (status) where.status = status;
  if (date) {
    const { start, end } = dayRange(date);
    where.createdAt = { gte: start, lt: end };
  }

  const month = monthRange(monthKey);
  const [journals, categoryRows, monthRows] = await Promise.all([
    prisma.journal.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        status: true,
        visibility: true,
        mood: true,
        category: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.journal.findMany({
      where: { userId: user.id, category: { not: null } },
      distinct: ["category"],
      select: { category: true },
      orderBy: { category: "asc" },
    }),
    prisma.journal.findMany({
      where: { userId: user.id, createdAt: { gte: month.start, lt: month.end } },
      select: { createdAt: true },
    }),
  ]);

  const categories = categoryRows.map((r) => r.category!).filter(Boolean);
  const daysWithEntries = [...new Set(monthRows.map((r) => dateKey(r.createdAt)))];

  // Query saat ini (tanpa q) — dipakai link filter & kotak pencarian
  const current: Record<string, string | undefined> = {
    mood,
    category,
    status,
    date,
    month: sp.month && isMonthKey(sp.month) ? sp.month : undefined,
  };
  const withQ = { ...current, q };
  const hasFilter = !!(q || mood || category || status || date);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto grid max-w-6xl gap-8 px-4 py-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        {/* ───────── Sidebar ───────── */}
        <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          <form action={createJournal}>
            <button type="submit" className="btn btn-primary w-full !py-2.5">
              <Plus className="h-4 w-4" />
              Tulis baru
            </button>
          </form>

          <CalendarView monthKey={monthKey} daysWithEntries={daysWithEntries} selectedDate={date} params={withQ} />

          <details className="group lg:open" open>
            <summary className="mb-2 cursor-pointer list-none text-sm font-medium lg:cursor-default">
              Filter
            </summary>

            <div className="space-y-4">
              <div>
                <p className="mb-1.5 text-xs uppercase tracking-wide text-stone-400">Mood</p>
                <div className="flex flex-wrap gap-1.5">
                  {MOODS.map((m) => (
                    <Link
                      key={m.key}
                      href={dashboardHref(withQ, { mood: mood === m.key ? null : m.key })}
                      className={cn("chip", mood === m.key && "chip-active")}
                      title={m.label}
                    >
                      <span>{m.emoji}</span>
                      <span className="hidden xl:inline">{m.label}</span>
                    </Link>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-xs uppercase tracking-wide text-stone-400">Status</p>
                <div className="flex gap-1.5">
                  {(["draft", "published"] as const).map((s) => (
                    <Link
                      key={s}
                      href={dashboardHref(withQ, { status: status === s ? null : s })}
                      className={cn("chip", status === s && "chip-active")}
                    >
                      {s === "draft" ? "Draft" : "Published"}
                    </Link>
                  ))}
                </div>
              </div>

              {categories.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs uppercase tracking-wide text-stone-400">Kategori</p>
                  <div className="flex flex-wrap gap-1.5">
                    {categories.map((c) => (
                      <Link
                        key={c}
                        href={dashboardHref(withQ, { category: category === c ? null : c })}
                        className={cn("chip", category === c && "chip-active")}
                      >
                        {c}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {hasFilter && (
                <Link href="/dashboard" className="text-xs text-stone-500 underline">
                  Reset semua filter
                </Link>
              )}
            </div>
          </details>
        </aside>

        {/* ───────── Daftar jurnal ───────── */}
        <section className="min-w-0 space-y-4">
          <SearchBox defaultValue={q} params={current} />

          <p className="text-sm text-stone-500 dark:text-stone-400">
            {journals.length} catatan
            {date && <> · tanggal {date}</>}
            {journals.length === 100 && " (menampilkan 100 terbaru)"}
          </p>

          {journals.length === 0 ? (
            <div className="rounded-xl border border-dashed border-stone-300 p-10 text-center dark:border-stone-700">
              <p className="text-sm text-stone-500 dark:text-stone-400">
                {hasFilter ? "Tidak ada jurnal yang cocok dengan filter." : "Belum ada jurnal. Mulai tulis yang pertama!"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {journals.map((j) => (
                <JournalCard key={j.id} journal={j} />
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
