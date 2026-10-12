"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { safeNextPath } from "@/lib/utils";

export type AuthState = { error?: string; message?: string };

function registrationOpen() {
  return process.env.ALLOW_REGISTRATION !== "false";
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(String(formData.get("next") ?? ""));

  if (!email || !password) return { error: "Email dan password wajib diisi." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return {
      error:
        error.message === "Email not confirmed"
          ? "Email belum dikonfirmasi. Cek kotak masuk Anda."
          : "Email atau password salah.",
    };
  }

  redirect(next);
}

export async function register(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!registrationOpen()) return { error: "Pendaftaran sedang ditutup." };

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name || !email || !password) return { error: "Semua kolom wajib diisi." };
  if (name.length > 80) return { error: "Nama terlalu panjang." };
  if (password.length < 8) return { error: "Password minimal 8 karakter." };

  const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
      emailRedirectTo: origin ? `${origin}/auth/callback` : undefined,
    },
  });

  if (error) return { error: error.message };
  if (!data.user) return { error: "Pendaftaran gagal. Coba lagi." };

  // Buat baris profil di tabel `users` (id sama dengan Supabase Auth).
  await prisma.user.upsert({
    where: { id: data.user.id },
    create: { id: data.user.id, email, name },
    update: { name },
  });

  // Jika "Confirm email" dimatikan di Supabase, sesi langsung aktif.
  if (data.session) redirect("/dashboard");

  return {
    message:
      "Akun dibuat. Kami mengirim email konfirmasi — klik link di dalamnya, lalu masuk.",
  };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
