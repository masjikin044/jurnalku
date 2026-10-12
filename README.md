# Jurnalku — Personal Journal & Blog

Aplikasi jurnal & blog pribadi full-stack. Tampilan simpel, nyaman di desktop maupun HP, dengan mode terang/gelap.

**Stack:** Next.js 15 (App Router) · React 19 · Tailwind CSS · Supabase (PostgreSQL + Auth + Storage) · Prisma ORM · Tiptap (rich text editor) · Deploy gratis di Vercel.

## Fitur

- **Auth**: login & register (Supabase Auth). Middleware melindungi `/dashboard` dan `/editor`.
- **Editor ala Blogger/WordPress**: Bold, Italic, Underline, Coret, Heading 1–3, daftar poin/bernomor, kutipan, blok kode, rata kiri/tengah/kanan, tautan, garis pemisah, undo/redo.
- **Gambar & video**: upload dari tombol, **drag-and-drop**, atau **paste** → tersimpan di Supabase Storage. Embed video YouTube (tempel URL).
- **Auto-save**: draf tersimpan otomatis 2,5 detik setelah berhenti mengetik. Indikator: *Menyimpan...* / *Tersimpan sebagai draf* / *Gagal menyimpan*.
- **Status**: Draft / Published.
- **Visibilitas**: Private (default) · Public (`/p/[slug]`) · Public + Password (hash bcrypt, dibatasi 5 percobaan per 5 menit).
- **Mood tracker**, **kategori**, **tag**.
- **Pencarian** (judul + isi), filter mood/kategori/status, dan **kalender**.
- **Dark / light mode**.

---

## 1. Persiapan

- Node.js 20+ dan npm
- Akun gratis [Supabase](https://supabase.com), [Vercel](https://vercel.com), dan GitHub

```bash
cd jurnalku
npm install
cp .env.example .env.local
```

## 2. Setup Supabase

### 2.1 Buat project
1. Buka supabase.com → **New project**. Catat **database password** (dipakai di langkah 2.3).
2. Pilih region terdekat (mis. Singapore).

### 2.2 Ambil API key
**Project Settings → API** (atau tombol *Connect*):
- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `Publishable key` (`sb_publishable_...`) atau `anon` key legacy → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2.3 Ambil connection string database
Klik **Connect** di dashboard → tab *ORMs → Prisma*, atau **Project Settings → Database**:
- **Transaction pooler (port 6543)** → `DATABASE_URL`, tambahkan `?pgbouncer=true&connection_limit=1`
- **Session pooler (port 5432)** → `DIRECT_URL` (dipakai untuk `prisma db push`)

> Koneksi *Direct* (`db.xxx.supabase.co`) di paket gratis hanya IPv6. Jika jaringan Anda IPv4, pakai **Session pooler** untuk `DIRECT_URL`.

### 2.4 Pengaturan Auth
**Authentication → Providers → Email**:
- Untuk jurnal pribadi paling mudah: **matikan "Confirm email"** → akun langsung aktif setelah daftar.
- Jika dibiarkan aktif, tambahkan URL di **Authentication → URL Configuration**:
  - *Site URL*: `https://NAMA-APP.vercel.app` (atau `http://localhost:3000` saat dev)
  - *Redirect URLs*: `http://localhost:3000/**` dan `https://NAMA-APP.vercel.app/**`

### 2.5 Buat tabel
```bash
npx prisma db push
```
Perintah ini membuat tabel `users`, `journals`, `media` sesuai `prisma/schema.prisma`.

### 2.6 Storage bucket + keamanan (SQL)
Buka **SQL Editor** di Supabase, tempel seluruh isi file [`supabase/setup.sql`](supabase/setup.sql), lalu **Run**. Script ini:
- mengaktifkan Row Level Security pada 3 tabel (agar tidak bisa diakses lewat anon key),
- membuat bucket publik `journal-media` (maks 5 MB, hanya JPG/PNG/WEBP/GIF),
- membuat policy: user hanya boleh upload/ubah/hapus file di folder `{user_id}/…` miliknya.

*(Alternatif lewat UI: Storage → New bucket → nama `journal-media`, centang Public. Policy tetap perlu dari SQL.)*

## 3. Jalankan lokal

Isi `.env.local` (lihat `.env.example`). Buat rahasia cookie:

```bash
openssl rand -base64 32     # tempel ke JOURNAL_COOKIE_SECRET
```

```bash
npm run dev
```
Buka http://localhost:3000 → **Masuk → Daftar** → buat akun → mulai menulis.

Setelah akun Anda dibuat, set `ALLOW_REGISTRATION=false` agar orang lain tidak bisa mendaftar.

---

## 4. Struktur folder

```
jurnalku/
├─ middleware.ts                    # proteksi /dashboard & /editor (refresh sesi Supabase)
├─ prisma/schema.prisma             # skema: users, journals, media
├─ supabase/setup.sql               # RLS + bucket Storage + policy
├─ app/
│  ├─ layout.tsx, globals.css       # layout, tema, gaya editor & artikel
│  ├─ page.tsx                      # beranda: daftar tulisan publik
│  ├─ not-found.tsx
│  ├─ (auth)/login, (auth)/register # halaman masuk & daftar
│  ├─ auth/callback/route.ts        # tukar kode konfirmasi email → sesi
│  ├─ dashboard/page.tsx            # daftar jurnal, pencarian, filter, kalender
│  ├─ editor/[id]/page.tsx          # halaman editor (hanya pemilik)
│  ├─ p/[slug]/page.tsx             # halaman publik + gerbang password
│  └─ actions/
│     ├─ auth.ts                    # login, register, logout
│     ├─ journal.ts                 # buat, auto-save, terbitkan, hapus, catat media
│     └─ protected.ts               # verifikasi password jurnal ber-password
├─ components/
│  ├─ SiteHeader, ThemeToggle, ThemeProvider, AuthForm, DeleteJournalButton
│  ├─ editor/  JournalEditor (Tiptap + auto-save), Toolbar, PublishPanel,
│  │           SaveIndicator, MoodPicker
│  ├─ dashboard/ SearchBox, CalendarView, JournalCard
│  └─ public/  PasswordGate
└─ lib/
   ├─ supabase/ client.ts, server.ts, middleware.ts, env.ts
   ├─ tiptap/   extensions.ts (dipakai editor & halaman publik), doc.ts (sanitasi, teks, HTML)
   ├─ auth.ts, prisma.ts, slug.ts, date.ts, upload.ts, access-cookie.ts, constants.ts, utils.ts
```

## 5. Bagian penting & cara kerjanya

### Auto-save (`components/editor/JournalEditor.tsx`)
Setiap perubahan (isi, judul, mood, kategori, tag) menandai `dirty` dan memanggil `useDebouncedCallback` (2,5 detik, `maxWait` 10 detik). Server Action `saveJournal` memeriksa kepemilikan, membersihkan dokumen, lalu menyimpan JSON + teks polos (untuk pencarian). Penyimpanan tidak pernah tumpang tindih (`inflight`), dan tab yang ditutup saat ada perubahan memunculkan peringatan browser.

> Catatan: untuk jurnal yang **sudah terbit**, auto-save langsung mengubah isi yang dibaca publik.

### Upload gambar (`lib/upload.ts`)
Browser mengupload langsung ke Supabase Storage (tidak lewat server Next.js, jadi aman dari batas body Vercel), lalu mencatatnya di tabel `media` lewat Server Action `registerMedia`. Path file: `{user_id}/{journal_id}/{uuid}.{ext}`.

### Visibilitas & password (`app/actions/journal.ts`, `app/actions/protected.ts`, `app/p/[slug]/page.tsx`)
- `private` / draf → halaman `/p/[slug]` mengembalikan **404** untuk selain pemilik.
- `protected` → password di-hash dengan **bcrypt** saat disimpan. Pengunjung melihat form password; isi tulisan **tidak dikirim** ke browser sebelum lolos.
- `verifyJournalPassword` membandingkan hash, membatasi **5 percobaan → kunci 5 menit**, lalu memasang cookie `httpOnly` bertanda tangan HMAC (24 jam). Mengganti password otomatis membatalkan semua akses lama.

### Keamanan lain
- Semua query jurnal memakai `userId` pemilik (cek kepemilikan di server).
- Dokumen dari editor disanitasi (gambar/video/link dengan URL tidak aman dibuang) sebelum disimpan.
- RLS aktif di semua tabel; Storage dibatasi per-folder user.

---

## 6. Deploy ke Vercel

1. Push project ke GitHub (`.env.local` sudah di-`.gitignore`).
2. Vercel → **Add New → Project** → impor repo. Framework otomatis terdeteksi Next.js.
3. Tambahkan **Environment Variables**:

| Nama | Isi |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable / anon key |
| `DATABASE_URL` | Transaction pooler (6543) + `?pgbouncer=true&connection_limit=1` |
| `DIRECT_URL` | Session pooler (5432) |
| `JOURNAL_COOKIE_SECRET` | string acak ≥ 32 karakter |
| `APP_TIMEZONE` | `Asia/Jakarta` |
| `ALLOW_REGISTRATION` | `true` dulu, ubah ke `false` setelah akun dibuat |

4. **Deploy**. Build menjalankan `prisma generate && next build` (sudah diatur di `package.json`).
5. Kembali ke Supabase → **Authentication → URL Configuration**: isi *Site URL* dan *Redirect URLs* dengan domain Vercel Anda.
6. Buka domain Vercel → daftar akun → set `ALLOW_REGISTRATION=false` lalu **Redeploy**.

## 7. Troubleshooting

| Masalah | Solusi |
|---|---|
| `Can't reach database server` | Pastikan `DIRECT_URL` memakai Session pooler (IPv4) dan password benar (karakter khusus harus di-URL-encode). |
| `prepared statement ... already exists` | `DATABASE_URL` harus punya `?pgbouncer=true`. |
| Upload gambar gagal / `row-level security` | Jalankan `supabase/setup.sql`; pastikan bucket bernama `journal-media`. |
| Login berhasil tapi kembali ke /login | Cek `NEXT_PUBLIC_SUPABASE_*` dan Site URL di Supabase. |
| Email konfirmasi tidak datang | Matikan "Confirm email" (untuk pemakaian pribadi) atau atur SMTP sendiri. |
| Tanggal bergeser | Atur `APP_TIMEZONE`. |

## 8. Rekomendasi pengembangan

- **Rate limit sungguhan** (Upstash Redis gratis) untuk login & password jurnal — saat ini pembatasan per-jurnal di database.
- **Riwayat revisi** (tabel `journal_revisions`) agar bisa kembali ke versi lama; terutama karena auto-save menimpa isi.
- **Pembersihan gambar yatim** (gambar yang dihapus dari teks tapi masih di Storage) lewat cron Vercel.
- **Kompres gambar** di browser sebelum upload (mis. `browser-image-compression`).
- **Pencarian full-text Postgres** (`tsvector` + index GIN) bila jurnal sudah ribuan.
- **Ekspor** ke Markdown/PDF, **PWA** agar bisa di-install, **pengingat menulis** harian.
- **Neon** bisa menggantikan database Supabase (ubah `DATABASE_URL`/`DIRECT_URL`), tetapi Auth & Storage tetap butuh Supabase (atau Auth.js + Vercel Blob/Cloudflare R2).
