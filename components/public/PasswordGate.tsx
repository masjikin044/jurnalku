"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2 } from "lucide-react";
import { verifyJournalPassword } from "@/app/actions/protected";

export default function PasswordGate({ slug, title }: { slug: string; title: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await verifyJournalPassword(slug, password);
      if (res.ok) {
        router.refresh(); // server component dirender ulang dengan cookie akses
      } else {
        setError(res.error);
        setPassword("");
      }
    });
  }

  return (
    <div className="card mx-auto mt-10 max-w-sm p-6 text-center shadow-sm">
      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-stone-100 dark:bg-stone-800">
        <KeyRound className="h-5 w-5" />
      </div>
      <h1 className="font-serif text-xl font-semibold">{title || "Tulisan dilindungi"}</h1>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
        Tulisan ini dilindungi. Masukkan password untuk membacanya.
      </p>

      <form onSubmit={submit} className="mt-5 space-y-3 text-left">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          autoComplete="off"
          maxLength={64}
          placeholder="Password / PIN"
          aria-label="Password"
          className="input"
        />
        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        <button type="submit" disabled={pending || !password} className="btn btn-primary w-full">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Buka tulisan
        </button>
      </form>
    </div>
  );
}
