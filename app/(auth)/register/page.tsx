import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import AuthForm from "@/components/AuthForm";
import { register } from "@/app/actions/auth";

export const metadata: Metadata = { title: "Daftar" };

export default function RegisterPage() {
  const open = process.env.ALLOW_REGISTRATION !== "false";

  return (
    <>
      <SiteHeader />
      <main className="px-4 py-14">
        {open ? (
          <AuthForm mode="register" action={register} />
        ) : (
          <div className="card mx-auto max-w-sm p-6 text-center">
            <h1 className="text-xl font-semibold">Pendaftaran ditutup</h1>
            <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
              Jurnal ini hanya untuk pemiliknya.
            </p>
            <Link href="/login" className="btn btn-primary mt-4">
              Ke halaman masuk
            </Link>
          </div>
        )}
      </main>
    </>
  );
}
