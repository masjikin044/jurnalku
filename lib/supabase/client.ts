import { createBrowserClient } from "@supabase/ssr";

// Dipakai di komponen client (mis. upload gambar ke Storage).
// process.env.NEXT_PUBLIC_* harus diakses secara literal agar di-inline oleh Next.js.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
