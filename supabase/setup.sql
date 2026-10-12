-- ============================================================
-- Jurnalku — setup Supabase (jalankan di SQL Editor SETELAH `npx prisma db push`)
-- ============================================================

-- 1) Kunci tabel dari akses langsung via API Supabase (PostgREST).
--    Aplikasi mengakses database lewat Prisma (role postgres) yang tidak terpengaruh RLS,
--    jadi tanpa policy apa pun, anon key tidak bisa membaca/menulis tabel ini.
alter table public.users    enable row level security;
alter table public.journals enable row level security;
alter table public.media    enable row level security;

-- 2) Bucket Storage untuk gambar jurnal (publik agar gambar tampil di halaman /p/[slug])
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'journal-media',
  'journal-media',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 3) Policy Storage: user hanya boleh mengelola file di folder miliknya ({user_id}/...)
drop policy if exists "journal media: owner can upload" on storage.objects;
create policy "journal media: owner can upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'journal-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "journal media: owner can update" on storage.objects;
create policy "journal media: owner can update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'journal-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "journal media: owner can delete" on storage.objects;
create policy "journal media: owner can delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'journal-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Catatan: membaca file lewat URL publik bucket tidak membutuhkan policy SELECT.
