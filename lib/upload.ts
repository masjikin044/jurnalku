"use client";

import { createClient } from "@/lib/supabase/client";
import { registerMedia } from "@/app/actions/journal";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_MB, MEDIA_BUCKET } from "@/lib/constants";

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/**
 * Upload gambar langsung dari browser ke Supabase Storage (tidak lewat server Next.js,
 * jadi tidak kena batas ukuran body Vercel). Mengembalikan URL publik gambar.
 */
export async function uploadImage(
  file: File,
  opts: { userId: string; journalId: string },
): Promise<string> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Format gambar harus JPG, PNG, WEBP, atau GIF.");
  }
  if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
    throw new Error(`Ukuran gambar maksimal ${MAX_IMAGE_MB} MB.`);
  }

  const supabase = createClient();
  const path = `${opts.userId}/${opts.journalId}/${crypto.randomUUID()}.${EXT_BY_TYPE[file.type]}`;

  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new Error(`Upload gagal: ${error.message}`);

  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);

  // Catat di tabel `media` (gagal mencatat tidak boleh menggagalkan penyisipan gambar).
  registerMedia(opts.journalId, data.publicUrl, file.type).catch(() => {});

  return data.publicUrl;
}
