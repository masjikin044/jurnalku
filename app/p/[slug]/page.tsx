import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import PasswordGate from "@/components/public/PasswordGate";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { renderDocHtml } from "@/lib/tiptap/doc";
import { accessCookieName, verifyAccessToken } from "@/lib/access-cookie";
import { formatDate } from "@/lib/date";
import { getMood } from "@/lib/constants";

export const dynamic = "force-dynamic";

async function loadJournal(slug: string) {
  return prisma.journal.findUnique({
    where: { slug },
    include: { user: { select: { name: true } } },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const j = await prisma.journal.findUnique({
    where: { slug },
    select: { title: true, excerpt: true, status: true, visibility: true },
  });
  if (!j || j.status !== "published" || j.visibility === "private") {
    return { title: "Tulisan", robots: { index: false } };
  }
  if (j.visibility === "protected") {
    // Jangan bocorkan cuplikan isi tulisan yang dilindungi
    return { title: j.title || "Tulisan dilindungi", robots: { index: false } };
  }
  return { title: j.title || "Tanpa judul", description: j.excerpt || undefined };
}

export default async function PublicJournalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const journal = await loadJournal(slug);
  if (!journal) notFound();

  const authUser = await getAuthUser();
  const isOwner = authUser?.id === journal.userId;

  const isLive = journal.status === "published" && journal.visibility !== "private";
  // Orang lain tidak boleh tahu bahwa draf/jurnal privat itu ada → 404
  if (!isOwner && !isLive) notFound();

  // Gerbang password (pemilik tidak perlu memasukkan password)
  if (!isOwner && journal.visibility === "protected") {
    const token = (await cookies()).get(accessCookieName(journal.id))?.value;
    const allowed =
      !!journal.passwordHash && verifyAccessToken(token, journal.id, journal.passwordHash);
    if (!allowed) {
      return (
        <>
          <SiteHeader />
          <main className="mx-auto max-w-2xl px-4 py-10">
            <PasswordGate slug={journal.slug} title={journal.title} />
          </main>
        </>
      );
    }
  }

  const html = renderDocHtml(journal.content);
  const mood = getMood(journal.mood);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-10">
        {isOwner && (
          <div className="mb-6 flex items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
            <span>
              Pratinjau pemilik — {journal.status === "published" ? "Published" : "Draft"} ·{" "}
              {journal.visibility === "private"
                ? "Private"
                : journal.visibility === "public"
                  ? "Public"
                  : "Public + Password"}
            </span>
            <Link href={`/editor/${journal.id}`} className="inline-flex items-center gap-1 font-medium underline">
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Link>
          </div>
        )}

        <article>
          <header className="mb-8">
            <h1 className="font-serif text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              {journal.title || "Tanpa judul"}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-stone-500 dark:text-stone-400">
              <span>{journal.user.name}</span>
              <span>·</span>
              <time dateTime={journal.createdAt.toISOString()}>{formatDate(journal.createdAt)}</time>
              {mood && (
                <>
                  <span>·</span>
                  <span title={mood.label}>
                    {mood.emoji} {mood.label}
                  </span>
                </>
              )}
              {journal.category && (
                <>
                  <span>·</span>
                  <span>{journal.category}</span>
                </>
              )}
            </div>
            {journal.tags.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {journal.tags.map((t) => (
                  <li key={t} className="rounded-full bg-stone-200/70 px-2.5 py-0.5 text-xs text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                    #{t}
                  </li>
                ))}
              </ul>
            )}
          </header>

          {/* HTML dihasilkan dari skema Tiptap (bukan HTML mentah dari klien) dan
              dokumen sudah disanitasi saat disimpan. */}
          <div
            className="prose prose-stone max-w-none font-serif prose-p:leading-relaxed prose-headings:font-sans dark:prose-invert sm:prose-lg"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </article>

        <footer className="mt-14 border-t border-stone-200 pt-6 dark:border-stone-800">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:underline">
            <ArrowLeft className="h-4 w-4" />
            Kembali ke beranda
          </Link>
        </footer>
      </main>
    </>
  );
}
