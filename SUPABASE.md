# Integrasi Supabase

Aplikasi tetap bisa dipakai tanpa Supabase. Jika Supabase dikonfigurasi, data lokal
`localStorage` disinkronkan otomatis ke Supabase.

## 1. Buat tabel

Buka Supabase → **SQL Editor**, lalu jalankan isi [`supabase/schema.sql`](supabase/schema.sql).

Tabel yang dipakai: `public.app_state`.

| `id` | Isi `payload` |
|---|---|
| `finance` | `{ entries, openingBalances, settings, accounts, deletedAccounts, version }` |
| `inventory` | `{ items, transactions, depreciations }` |

## 2. Isi konfigurasi

Edit [`supabase-config.js`](supabase-config.js):

```js
window.DINETKAN_SUPABASE = {
  enabled: true,
  url: 'https://PROJECT_ID.supabase.co',
  anonKey: 'ANON_KEY',
  table: 'app_state',
  autoPull: true,
  autoPush: true,
};
```

Ambil `url` dan `anonKey` dari **Project Settings → API**. `anonKey` aman ditaruh di
frontend selama RLS dikonfigurasi. Jangan memakai `service_role` key di browser.

## 3. Cara kerja

- Saat halaman dibuka, aplikasi menarik baris `finance` dan `inventory` dari Supabase
  jika `autoPull: true`.
- Setiap perubahan jurnal, akun, atau inventaris dikirim otomatis ke Supabase setelah
  ~500 ms jika `autoPush: true`.
- Tombol **Tarik** dan **Kirim** tersedia di sidebar untuk sinkronisasi manual.
- Cadangan/ekspor JSON lokal tetap berfungsi seperti sebelumnya.

## 4. Mengirim data lokal yang sudah ada

Jika data lokal sudah ada sebelum Supabase diaktifkan, buka salah satu halaman lalu
klik tombol **Kirim** di sidebar. Alternatif dari browser console:

```js
await window.SupabaseSync.pushAll();
```

## 5. Catatan keamanan

Skema SQL di atas memakai policy RLS terbuka untuk `anon` agar mudah dipakai untuk
workspace tunggal/demo. Untuk produksi multi-user, tambahkan login Supabase Auth dan
ganti policy menjadi berbasis `auth.uid()`, misalnya dengan kolom `owner_id uuid`.

## 6. Diagnostik

- Status sinkronisasi muncul di sidebar: `siap`, `menarik...`, `mengirim...`,
  `tersinkron`, `kosong`, atau `gagal`.
- Error fetch tampil sebagai toast dan juga di browser console dengan prefix
  `[SupabaseSync]`.
- `node tools/smoke-test.js` memeriksa keberadaan skrip/config skema pada semua halaman.
