"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { draftSlug, slugify, uniqueSlug } from "@/lib/slug";
import { docToText, sanitizeDoc } from "@/lib/tiptap/doc";
import { MEDIA_BUCKET, MOOD_KEYS, type StatusValue, type VisibilityValue } from "@/lib/constants";

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const MAX_CONTENT_BYTES = 1_500_000;

/* ───────────────────────── Buat jurnal baru ───────────────────────── */

/** Dipanggil dari <form action={createJournal}>. Membuat draf kosong lalu membuka editor. */
export async function createJournal() {
  const user = await requireUser();
  const journal = await prisma.journal.create({
    data: {
      userId: user.id,
      slug: draftSlug(),
      content: { type: "doc", content: [{ type: "paragraph" }] },
    },
    select: { id: true },
  });
  redirect(`/editor/${journal.id}`);
}

/* ───────────────────────── Auto-save ───────────────────────── */

export type SaveInput = {
  title: string;
  content: unknown;
  mood: string | null;
  category: string | null;
  tags: string[];
};

function cleanTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  const out = new Set<string>();
  for (const t of tags) {
    if (typeof t !== "string") continue;
    const v = t.trim().toLowerCase().replace(/^#/, "").slice(0, 30);
    if (v) out.add(v);
    if (out.size >= 10) break;
  }
  return [...out];
}

export async function saveJournal(
  id: string,
  input: SaveInput,
): Promise<ActionResult<{ savedAt: string }>> {
  const user = await requireUser();

  const doc = sanitizeDoc(input.content);
  if (!doc) return { ok: false, error: "Format isi tidak valid." };
  if (JSON.stringify(doc).length > MAX_CONTENT_BYTES) {
    return { ok: false, error: "Isi terlalu besar. Pecah menjadi beberapa jurnal." };
  }

  const text = docToText(doc);
  const mood = input.mood && MOOD_KEYS.includes(input.mood) ? input.mood : null;
  const category = input.category?.trim().slice(0, 40) || null;

  // updateMany + userId di WHERE = sekaligus cek kepemilikan dalam satu query
  const res = await prisma.journal.updateMany({
    where: { id, userId: user.id },
    data: {
      title: String(input.title ?? "").slice(0, 200),
      content: doc as Prisma.InputJsonValue,
      contentText: text,
      excerpt: text.slice(0, 180),
      mood,
      category,
      tags: cleanTags(input.tags),
    },
  });

  if (res.count === 0) return { ok: false, error: "Jurnal tidak ditemukan." };
  return { ok: true, savedAt: new Date().toISOString() };
}

/* ───────────────────── Terbitkan / visibilitas / password ───────────────────── */

export type PublishInput = {
  status: StatusValue;
  visibility: VisibilityValue;
  /** Password baru (opsional jika sudah pernah diset). */
  password?: string;
  /** Slug kustom (opsional). */
  slug?: string;
};

export async function applyPublishSettings(
  id: string,
  input: PublishInput,
): Promise<
  ActionResult<{
    status: StatusValue;
    visibility: VisibilityValue;
    slug: string;
    hasPassword: boolean;
  }>
> {
  const user = await requireUser();

  if (!["draft", "published"].includes(input.status)) {
    return { ok: false, error: "Status tidak valid." };
  }
  if (!["private", "public", "protected"].includes(input.visibility)) {
    return { ok: false, error: "Visibilitas tidak valid." };
  }

  const journal = await prisma.journal.findFirst({ where: { id, userId: user.id } });
  if (!journal) return { ok: false, error: "Jurnal tidak ditemukan." };

  if (input.status === "published" && !journal.title.trim()) {
    return { ok: false, error: "Beri judul dulu sebelum menerbitkan." };
  }

  /* slug */
  let slug = journal.slug;
  const wanted = slugify(input.slug ?? "");
  if (wanted && wanted !== journal.slug) {
    slug = await uniqueSlug(wanted, journal.id);
  } else if (journal.slug.startsWith("draf-") && journal.title.trim()) {
    slug = await uniqueSlug(slugify(journal.title), journal.id);
  }

  /* password */
  let passwordHash: string | null = null;
  let passwordChanged = false;
  if (input.visibility === "protected") {
    const pw = (input.password ?? "").trim();
    if (pw) {
      if (pw.length < 4) return { ok: false, error: "Password minimal 4 karakter." };
      if (pw.length > 64) return { ok: false, error: "Password maksimal 64 karakter." };
      passwordHash = await bcrypt.hash(pw, 10);
      passwordChanged = true;
    } else if (journal.passwordHash) {
      passwordHash = journal.passwordHash;
    } else {
      return { ok: false, error: "Isi password untuk jurnal yang dilindungi." };
    }
  }

  await prisma.journal.update({
    where: { id: journal.id },
    data: {
      status: input.status,
      visibility: input.visibility,
      slug,
      passwordHash,
      ...(passwordChanged || input.visibility !== "protected"
        ? { failedAttempts: 0, lockedUntil: null }
        : {}),
    },
  });

  return {
    ok: true,
    status: input.status,
    visibility: input.visibility,
    slug,
    hasPassword: passwordHash !== null,
  };
}

/* ───────────────────────── Media ───────────────────────── */

/** Catat file yang sudah diupload klien ke Supabase Storage. */
export async function registerMedia(
  journalId: string,
  url: string,
  fileType: string,
): Promise<ActionResult> {
  const user = await requireUser();

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const expectedPrefix = `${base}/storage/v1/object/public/${MEDIA_BUCKET}/${user.id}/`;
  if (!base || !url.startsWith(expectedPrefix)) {
    return { ok: false, error: "URL media tidak valid." };
  }

  const owned = await prisma.journal.findFirst({
    where: { id: journalId, userId: user.id },
    select: { id: true },
  });
  if (!owned) return { ok: false, error: "Jurnal tidak ditemukan." };

  await prisma.media.create({
    data: { journalId, url, fileType: fileType.slice(0, 100) },
  });
  return { ok: true };
}

/* ───────────────────────── Hapus ───────────────────────── */

export async function deleteJournal(id: string): Promise<ActionResult> {
  const user = await requireUser();

  const journal = await prisma.journal.findFirst({
    where: { id, userId: user.id },
    select: { id: true, media: { select: { url: true } } },
  });
  if (!journal) return { ok: false, error: "Jurnal tidak ditemukan." };

  // Hapus file di Storage (best-effort) — policy mengizinkan pemilik menghapus foldernya.
  const marker = `/storage/v1/object/public/${MEDIA_BUCKET}/`;
  const paths = journal.media
    .map((m) => {
      const i = m.url.indexOf(marker);
      return i === -1 ? null : decodeURIComponent(m.url.slice(i + marker.length));
    })
    .filter((p): p is string => !!p && p.startsWith(`${user.id}/`));

  if (paths.length) {
    try {
      const supabase = await createClient();
      await supabase.storage.from(MEDIA_BUCKET).remove(paths);
    } catch {
      // Abaikan: file yatim bisa dibersihkan manual dari dashboard Supabase.
    }
  }

  await prisma.journal.delete({ where: { id: journal.id } });
  redirect("/dashboard");
}
