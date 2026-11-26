# Integrasi Supabase — Dinetkan Finance

Aplikasi tetap berjalan dengan `localStorage` tanpa Supabase. Jika environment variable diisi,
seluruh halaman memakai klien Supabase terpusat (`@supabase/supabase-js`) dan tabel normalized
yang **sudah ada** di project Anda. Tidak ada tabel yang dibuat ulang oleh aplikasi.

## 1. Lokasi API link / kunci

Taruh di root repository, file **`.env.local`**:

```env
VITE_SUPABASE_URL=https://gnuqhaugrylgmebenkku.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_XXXXXXXXXXXXXXXXXXXXXXXX
```

- `VITE_SUPABASE_URL` = Project URL (bukan endpoint `/rest/v1/`).
- `VITE_SUPABASE_ANON_KEY` = **publishable/anon key**, dari *Project Settings → API → Project API keys*.
- Jangan pakai `service_role` / secret key di browser. File `.env.local` sudah diabaikan Git; template amannya ada di `.env.example`.

Pada mesin ini `.env.local` sudah diisi, jadi Anda **tidak perlu menempel ulang kuncinya**.

## 2. Menjalankan / deploy

```powershell
npm install
npm run dev      # http://localhost:5173
npm run build    # hasil ke folder dist/
npm run preview
```

Untuk GitHub Pages, deploy folder **`dist/`** (file `CNAME` sudah ikut tersalin). Karena nilai env
di-build oleh Vite, setiap kali mengubah `.env.local` jalankan ulang `npm run build`.

> Catatan: Vite memberi peringatan bahwa `data.js` / `app.js` bukan module. Itu disengaja agar
> mesin hitung lama tetap dipakai apa adanya; kedua file disalin ke `dist/` oleh plugin build.

## 3. Tabel yang dipakai

Mapping dari model lokal ke 9 tabel aktual:

| Tabel Supabase | Sumber lokal | Catatan |
|---|---|---|
| `profiles` | Supabase Auth user | `id = auth.uid()`, `role` default `staff` |
| `accounts` | `getAccountList()` (124 akun bawaan + kustom) | `account_code`, `normal_balance`, `report_group` |
| `auxiliary_accounts` | `sourceCode` / `helper` akun | dipakai saat baris jurnal memakai kode alias |
| `opening_balances` | `finance.openingBalances` | per `account_id` + `fiscal_year` |
| `fiscal_periods` | bulan/tahun pada tanggal jurnal | `period_name = YYYY-MM` |
| `journal_entries` | `finance.entries` | hanya `status = posted` yang masuk laporan |
| `journal_lines` | `entry.lines` | debit/kredit; mutasi barang dikodekan di `description` |
| `inventory` | `getInventoryItemDefinitions()` | `quantity` = stok awal |
| `inventory_movements` | `inventory.transactions` | baris dengan `journal_entry_id` tidak disimpan ulang |

Laporan **tidak** menyimpan total hitungan sebagai transaksi. `data.js` tetap menghitung
Jurnal Umum, Neraca Saldo, Neraca Jalur, Laba Rugi, Neraca, dan Inventaris dari baris sumber.

## 4. Auth & role

1. Buat user di **Supabase Dashboard → Authentication → Users**, atau undang melalui Auth UI.
2. Buka aplikasi; akan muncul form login (sidebar + layar utama) selama `requireAuth` aktif.
3. Setelah login, aplikasi membuat/membaca baris `profiles` untuk user tersebut.
4. Peran dibaca dari kolom `profiles.role`:
   - `admin` — penuh, termasuk hapus.
   - `staff` — boleh input/edit jurnal & inventaris.
   - `viewer` — read-only; tombol **Kirim** dan hapus jurnal ditolak.

Sesi disimpan browser (`persistSession`), diperbarui otomatis, dan dipantau lewat
`onAuthStateChange`. Role di frontend hanya kenyamanan; **RLS tetap penjaga akhir**.

Variabel opsional:

```env
VITE_SUPABASE_AUTO_PULL=true
VITE_SUPABASE_AUTO_PUSH=true
VITE_SUPABASE_REQUIRE_AUTH=true
```

## 5. Cara sinkron

- **Tarik** — mengambil 9 tabel, mengubahnya jadi state lokal, lalu `REPORT_DATA` dihitung ulang.
- **Kirim** — mengubah state lokal jadi baris dengan UUID deterministik, lalu `upsert` per tabel.
- Setiap perubahan jurnal/akun/inventaris otomatis mengirim setelah ~500 ms.
- Data lama di `localStorage` **tidak dihapus**. Untuk memindahkan data lokal yang sudah ada:
  login, lalu klik **Kirim** sekali. UUID deterministik mencegah duplikat saat kirim ulang.

Event internal: `dinetkan:remote-updated`, `dinetkan:pushed`, `dinetkan:sync-error`.

## 6. Status RLS yang sudah diverifikasi

- `GET /auth/v1/health` dengan anon key → **200**.
- `GET /rest/v1/<9 tabel>` dengan anon key → **200** (semua tabel ada dan bisa dibaca; masih kosong).
- `GET /rest/v1/` (OpenAPI) hanya bisa diakses dengan secret key, jadi metadata dibaca sekali saat audit.
- Insert/update/delete **belum diuji** karena belum ada user/role di project Anda.

Rekomendasi policy berbasis `auth.uid()` ada di [`supabase/policies.sql`](supabase/policies.sql).
File itu **belum dijalankan**; tinjau policy existing sebelum menggunakannya.

## 7. Keamanan

- Kunci publishable/anon memang boleh ada di bundle browser, selama RLS benar.
- Secret key yang pernah dibagikan di chat sebaiknya **di-rotate** di Supabase Dashboard.
- Jangan commit `.env.local`. `.env.example` adalah satu-satunya template yang boleh masuk Git.

## 8. Pengujian

```powershell
npm test        # 88/88 PASS (statik + unit + mapper)
npm run parity  # PASS 15 | DEVIATION 1 | BLOCKED 5 | SKIP 2
npm run build   # production build sukses
```

`npm test` juga memeriksa bahwa tidak ada `service_role`/secret key di kode frontend dan bahwa
semua 8 halaman memuat script module Supabase.
