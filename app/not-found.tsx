import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="text-5xl">📭</p>
        <h1 className="mt-4 text-xl font-semibold">Halaman tidak ditemukan</h1>
        <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
          Tulisan ini mungkin sudah dihapus, belum terbit, atau bersifat privat.
        </p>
        <Link href="/" className="btn btn-primary mt-6">
          Ke beranda
        </Link>
      </main>
    </>
  );
}
