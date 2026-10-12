"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { AuthState } from "@/app/actions/auth";

type Props = {
  mode: "login" | "register";
  action: (prev: AuthState, formData: FormData) => Promise<AuthState>;
  next?: string;
  registrationOpen?: boolean;
  initialError?: string;
};

export default function AuthForm({ mode, action, next, registrationOpen = true, initialError }: Props) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, {
    error: initialError,
  });
  const isLogin = mode === "login";

  return (
    <div className="card mx-auto w-full max-w-sm p-6 shadow-sm">
      <h1 className="text-xl font-semibold">{isLogin ? "Masuk" : "Buat akun"}</h1>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
        {isLogin ? "Lanjutkan menulis jurnalmu." : "Mulai jurnal pribadimu."}
      </p>

      <form action={formAction} className="mt-5 space-y-4">
        {isLogin && next ? <input type="hidden" name="next" value={next} /> : null}

        {!isLogin && (
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Nama</span>
            <input name="name" type="text" required maxLength={80} autoComplete="name" className="input" />
          </label>
        )}

        <label className="block text-sm">
          <span className="mb-1 block font-medium">Email</span>
          <input name="email" type="email" required autoComplete="email" className="input" />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium">Password</span>
          <input
            name="password"
            type="password"
            required
            minLength={isLogin ? undefined : 8}
            autoComplete={isLogin ? "current-password" : "new-password"}
            className="input"
          />
          {!isLogin && (
            <span className="mt-1 block text-xs text-stone-500">Minimal 8 karakter.</span>
          )}
        </label>

        {state.error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {state.error}
          </p>
        )}
        {state.message && (
          <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            {state.message}
          </p>
        )}

        <button type="submit" disabled={pending} className="btn btn-primary w-full">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {isLogin ? "Masuk" : "Daftar"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-stone-500 dark:text-stone-400">
        {isLogin ? (
          registrationOpen ? (
            <>
              Belum punya akun?{" "}
              <Link href="/register" className="font-medium text-stone-900 underline dark:text-stone-100">
                Daftar
              </Link>
            </>
          ) : null
        ) : (
          <>
            Sudah punya akun?{" "}
            <Link href="/login" className="font-medium text-stone-900 underline dark:text-stone-100">
              Masuk
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
