import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

export function randomSuffix(len = 6): string {
  return randomBytes(len).toString("hex").slice(0, len);
}

/** Slug placeholder untuk draf baru yang belum punya judul. */
export function draftSlug(): string {
  return `draf-${randomSuffix(8)}`;
}

/** Pastikan slug unik; tambahkan akhiran acak bila sudah dipakai jurnal lain. */
export async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  const root = slugify(base) || "catatan";
  let candidate = root;
  for (let i = 0; i < 5; i++) {
    const found = await prisma.journal.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!found || found.id === excludeId) return candidate;
    candidate = `${root}-${randomSuffix(4)}`;
  }
  return `${root}-${randomSuffix(8)}`;
}
