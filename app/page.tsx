import Link from "next/link";
import { Lock } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/date";
import { getMood } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Hanya tulisan yang sudah terbit dan bersifat publik / ber-password.
  const posts = await prisma.journal.findMany({
    where: { status: "published", visibility: { in: ["public", "protected"] } },
    orderBy: { updatedAt: "desc" },
    take: 30,
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      visibility: true,
      mood: true,
      category: true,
      createdAt: true,
    },
  });

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-12">
        <section className="mb-10">
          <h1 className="font-serif text-3xl font-semibold tracking-tight">Jurnalku</h1>
          <p className="mt-2 text-stone-500 dark:text-stone-400">
            Catatan, cerita, dan pikiran — ditulis pelan-pelan.
          </p>
        </section>

        {posts.length === 0 ? (
          <p className="rounded-xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500 dark:border-stone-700">
            Belum ada tulisan yang diterbitkan.
          </p>
        ) : (
          <ul className="divide-y divide-stone-200 dark:divide-stone-800">
            {posts.map((p) => {
              const mood = getMood(p.mood);
              return (
                <li key={p.id}>
                  <Link href={`/p/${p.slug}`} className="group block py-5">
                    <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                      <time>{formatDate(p.createdAt)}</time>
                      {p.category && <span>· {p.category}</span>}
                      {mood && <span title={mood.label}>· {mood.emoji}</span>}
                    </div>
                    <h2 className="mt-1 flex items-center gap-2 font-serif text-xl font-semibold group-hover:underline">
                      {p.title || "Tanpa judul"}
                      {p.visibility === "protected" && (
                        <Lock className="h-4 w-4 text-stone-400" aria-label="Dilindungi password" />
                      )}
                    </h2>
                    <p className="mt-1 line-clamp-2 text-sm text-stone-600 dark:text-stone-300">
                      {p.visibility === "protected"
                        ? "Tulisan ini dilindungi password."
                        : p.excerpt}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}
