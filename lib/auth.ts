import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/** User dari Supabase Auth (tervalidasi ke server), atau null. */
export const getAuthUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * Baris profil di tabel `users` untuk user yang sedang login.
 * Dibuat otomatis bila belum ada (mis. akun dibuat lewat dashboard Supabase).
 */
export const getCurrentUser = cache(async () => {
  const authUser = await getAuthUser();
  if (!authUser || !authUser.email) return null;

  const existing = await prisma.user.findUnique({ where: { id: authUser.id } });
  if (existing) return existing;

  const metaName =
    typeof authUser.user_metadata?.name === "string" ? authUser.user_metadata.name : "";

  return prisma.user.upsert({
    where: { id: authUser.id },
    create: {
      id: authUser.id,
      email: authUser.email,
      name: metaName || authUser.email.split("@")[0],
    },
    update: {},
  });
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
