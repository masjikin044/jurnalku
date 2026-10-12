"use server";

import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { accessCookieName, createAccessToken, ACCESS_TTL_SECONDS } from "@/lib/access-cookie";

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 5;

export type VerifyResult = { ok: true } | { ok: false; error: string };

/**
 * Verifikasi password untuk jurnal ber-visibilitas "protected".
 * Berhasil → set cookie httpOnly bertanda tangan (24 jam); halaman lalu di-refresh klien.
 * Isi jurnal TIDAK PERNAH dikirim ke browser sebelum cookie valid.
 */
export async function verifyJournalPassword(
  slug: string,
  password: string,
): Promise<VerifyResult> {
  const notFound = { ok: false, error: "Tulisan tidak ditemukan." } as const;
  if (!slug || typeof password !== "string" || !password) {
    return { ok: false, error: "Masukkan password." };
  }

  const journal = await prisma.journal.findUnique({
    where: { slug },
    select: {
      id: true,
      status: true,
      visibility: true,
      passwordHash: true,
      failedAttempts: true,
      lockedUntil: true,
    },
  });

  if (
    !journal ||
    journal.status !== "published" ||
    journal.visibility !== "protected" ||
    !journal.passwordHash
  ) {
    return notFound;
  }

  if (journal.lockedUntil && journal.lockedUntil > new Date()) {
    const minutes = Math.ceil((journal.lockedUntil.getTime() - Date.now()) / 60000);
    return {
      ok: false,
      error: `Terlalu banyak percobaan. Coba lagi dalam ${minutes} menit.`,
    };
  }

  const valid = await bcrypt.compare(password, journal.passwordHash);

  if (!valid) {
    const attempts = journal.failedAttempts + 1;
    const lock = attempts >= MAX_ATTEMPTS;
    await prisma.journal.update({
      where: { id: journal.id },
      data: lock
        ? {
            failedAttempts: 0,
            lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000),
          }
        : { failedAttempts: attempts },
    });
    return {
      ok: false,
      error: lock
        ? `Terlalu banyak percobaan. Coba lagi dalam ${LOCK_MINUTES} menit.`
        : `Password salah. Sisa percobaan: ${MAX_ATTEMPTS - attempts}.`,
    };
  }

  if (journal.failedAttempts > 0 || journal.lockedUntil) {
    await prisma.journal.update({
      where: { id: journal.id },
      data: { failedAttempts: 0, lockedUntil: null },
    });
  }

  const cookieStore = await cookies();
  cookieStore.set(
    accessCookieName(journal.id),
    createAccessToken(journal.id, journal.passwordHash),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/p",
      maxAge: ACCESS_TTL_SECONDS,
    },
  );

  return { ok: true };
}
