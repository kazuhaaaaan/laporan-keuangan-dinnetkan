# SYSTEM_STATUS — Status Sistem Setelah Audit

## 1. Ringkasan

Situs laporan keuangan ini adalah aplikasi statis HTML/CSS/JS tanpa build tool, `package.json`, atau server. Perhitungan laporan terpusat di `data.js`; tampilan memakai `app.js` dan `styles.css` secara bersama oleh halaman `index.html`, `kode-akun.html`, `input-jurnal.html`, `jurnal-umum.html`, `neraca-jalur.html`, `laba-rugi.html`, `neraca.html`, serta halaman inventaris di `inventaris/`. Link lama `input-data.html` hanya menjadi pengalih ke `input-jurnal.html`.

Status saat ini: **siap dipakai dengan batasan data sumber yang terdokumentasi**. Tidak ada `FAIL` pada pengujian parity. Angka yang tidak dapat diverifikasi atau memang bermasalah diberi status `BLOCKED`, `DEVIATION`, atau `SKIP` — bukan `PASS`.

## 2. Sumber data dan batasan

- Workbook sumber: `C:\Users\RYZEN\Downloads\LAPORAN KEUANGAN 2025.xlsx` (dibaca saja, tidak diubah).
- Url sheet referensi: `https://docs.google.com/spreadsheets/d/1yMhC0C7REAkRvO8MD9RI-yeqwhC5vBhLm0Tul5CEG_Q/edit?usp=drivesdk`.
- 7 sheet diaudit: `HOME`, `KODE AKUN`, `JURNAL UMUM`, `NERACA JALUR`, `LABA RUGI`, `NERACA`, `Sheet15`.
- 124 akun dipetakan 1:1 berdasarkan **urutan baris** `KODE AKUN`, bukan nilai serial kolom A.
- 2.795 baris jurnal → 1.301 transaksi, 12 bucket bulanan, periode `2025-01-01` … `2025-12-31`.
- Workbook bertuliskan `Tahun 2026` di `NERACA!A3`; website mengikuti tanggal transaksi.
- `Sheet15` adalah lampiran settlement 74 baris tanpa formula; tidak dipetakan ke laporan.

## 3. Angka kunci

| Item | Nilai website | Padanan workbook | Status |
|---|---:|---:|---|
| Total pendapatan | 5.345.391.648,00 | `HOME!B2` = 5.345.391.648 | PASS |
| Total biaya | 5.194.628.100,70 | `HOME!B3` = 5.194.628.101 | PASS (δ −0,30) |
| Laba tahun berjalan | 150.763.547,30 | `HOME!B4` / `LABA RUGI!C84` | PASS |
| Kas setara kas | 3.540.285,30 | `HOME!B5` = 155.432.047,30 | DEVIATION |
| Total aset | 155.432.047,30 | `NERACA!C40` | PASS |
| Modal | 5.663.500,00 | `NERACA!F24` | PASS |
| Total debit jurnal (termasuk tak terpetakan) | 10.702.157.010,70 | `JURNAL UMUM!G` | PASS |
| Total kredit jurnal (termasuk tak terpetakan) | 10.702.152.010,70 | `JURNAL UMUM!H` | PASS |
| Selisih jurnal mentah | 5.000,00 | sumber | BLOCKED |
| Selisih jurnal terpetakan | −995.000,00 | sumber | BLOCKED |
| Gap aset − liabilitas − laba | −995.000,00 | sumber | BLOCKED |

Toleransi numerik: **0,50 IDR**. Alasan: dua cache `LABA RUGI` dibulatkan ke rupiah. Tidak ada pembulatan paksa di aplikasi.

## 4. Status Pengujian

Perintah yang sudah dijalankan dari root workspace:

```powershell
node --check data.js
node --check app.js
node --check inventaris/app.js
node tools\parity-test.js
node tools\smoke-test.js
```

Hasil terakhir:

```text
syntax checks        : 3/3 OK
parity-test.js       : PASS 15 | DEVIATION 1 | BLOCKED 5 | SKIP 2 | FAIL 0
smoke-test.js        : 78/78 PASS
```

Rincian mesin: `tools/parity-results.json`. Penjelasan tiap baris: `FORMULA_PARITY_TEST.md`.

## 5. Struktur file

| File | Status | Catatan |
|---|---|---|
| `data.js` | Dimodifikasi | Mesin hitung, 124 akun, storage versi, diagnostik, daftar barang bawaan + lokal |
| `app.js` | Dimodifikasi | Renderer/page guard, filter, banner, form multi-baris, cadangan, aksi jurnal, listener sinkron |
| `supabase-config.js` | Baru | URL project, anon key, nama tabel, flag auto pull/push |
| `supabase-sync.js` | Baru | REST sync ke `app_state`, status sidebar, tombol Tarik/Kirim |
| `supabase/schema.sql` | Baru | DDL tabel `app_state` + policy RLS |
| `index.html` | Dimodifikasi | Halaman ringkasan + analisis, branding, banner, periode dinamis |
| `kode-akun.html` | Baru | Halaman kelola kode akun |
| `input-jurnal.html` | Baru | Form jurnal per baris + tabel pendataan yang bisa diubah/dihapus |
| `input-data.html` | Baru | Redirect statis ke `input-jurnal.html` |
| `jurnal-umum.html` | Baru | Halaman filter, pagination, ekspor, dan hapus transaksi |
| `neraca-jalur.html` | Baru | Halaman worksheet neraca jalur |
| `laba-rugi.html` | Baru | Halaman laporan laba rugi |
| `neraca.html` | Baru | Halaman posisi aset/liabilitas/ekuitas |
| `styles.css` | Dimodifikasi | Gaya ringkasan laba rugi, label sidebar, sidebar dapat digulir |
| `inventaris/app.js` | Dimodifikasi | Storage versi, merge transaksi, import validasi, filter tautan internal |
| `inventaris/index.html` | Dimodifikasi | Branding, tautan ke semua halaman laporan, penjelasan tanpa jurnal otomatis |
| `inventaris/styles.css` | Tidak diubah | Styling aset dipertahankan |
| `tools/parity-test.js` | Baru | Pembaca XLSX + engine parity |
| `tools/smoke-test.js` | Dimodifikasi | Uji ID per halaman, tautan lintas halaman, dan unit ringan |
| `tools/parity-results.json` | Baru | Output parity test |
| `*.md` | Baru | Tujuh dokumen audit/fix/parity/status |

## 6. Penyimpanan browser

| Kunci aktif | Fungsi | Migration source |
|---|---|---|
| `dinetkan-finance-v1` | Jurnal, saldo awal, settings, akun kustom, akun bawaan yang dihapus | `dinetkan-finance-journal-v2`, `dinetkan-finance-journal-v1` |
| `dinetkan-inventory-v1` | Barang, transaksi lokal, aturan penurunan | — |
| `dinetkan-inventory-journal-sync-v1` | Signature diagnostik | — |

Kunci lama kini memakai ejaan `dinetkan`. Data pada kunci ejaan sebelumnya tidak dibaca otomatis; pulihkan dari cadangan JSON. Nama akun `DINETKAN` pada data historis juga tidak diubah.

Akun kustom dan penanda akun bawaan yang dihapus ikut tersimpan di `dinetkan-finance-v1` serta terbawa oleh cadangan JSON. Akun yang masih dipakai transaksi atau memiliki saldo awal tidak bisa dihapus dari web.

Penghapusan seluruh jurnal mengunduh cadangan JSON terlebih dahulu. Cadangan keuangan dan inventaris dapat dimuat kembali dengan validasi.

## 7. Perilaku yang perlu diketahui pengguna

1. KPI **Kas Setara Kas** tidak mengikuti angka `HOME!B5` workbook. Itu disengaja; lihat `AUDIT_EXCEL.md` §3.
2. Banner `BLOCKED` akan muncul karena sumber memiliki baris akun tak terpetakan dan jurnal tidak seimbang. Ini bukan kegagalan aplikasi.
3. Baris mutasi inventaris berlabel `Jurnal` berasal dari jurnal umum dan tidak bisa dihapus langsung di halaman inventaris; hapus/hubah jurnal sumbernya.
4. Penurunan harga hanya mengubah nilai barang di laporan inventaris. Tidak ada jurnal penyusutan otomatis sampai kebijakan ditetapkan.
5. Filter bulan memakai `YYYY-MM`, sehingga Januari 2025 dan Januari 2026 tidak lagi bercampur.
6. Form **Input Jurnal** menyimpan tanggal dan keterangan sekali per transaksi. Tiap baris berisi akun dari daftar pilihan yang bisa dicari dengan kode/nama, posisi Debet/Kredit, dan nominal; baris dikumpulkan dulu di tabel **Pendataan Jurnal**, bisa diubah/dihapus, lalu disimpan setelah total debit sama dengan kredit.
7. Barang baru bisa ditambahkan dari panel mutasi di Input Jurnal; barang tersebut masuk ke `dinetkan-inventory-v1` dan dapat dipilih untuk mutasi sekaligus tampil di halaman Inventaris.
8. Setelah jurnal disimpan, transaksi langsung tampil di **Jurnal Umum**, **Neraca Jalur**, **Laba Rugi**, dan **Neraca** karena keempatnya dibangun dari `REPORT_DATA` yang sama.
9. Setiap menu sidebar membuka halamannya sendiri; **Ringkasan** dan **Analisis** tetap merupakan bagian dari `index.html`, sedangkan **Inventaris** membuka `inventaris/index.html` dan tautan baliknya memakai `../index.html`.
10. Supabase bersifat opsional dan nonaktif sampai `supabase-config.js` diisi serta `enabled` diubah ke `true`. Jika aktif, state keuangan/inventaris ditarik saat halaman dibuka dan dikirim otomatis setelah perubahan; tombol **Tarik/Kirim** di sidebar tersedia untuk sinkron manual.

## 8. Item BLOCKED / SKIP aktif

| ID | Item | Nilai | Tindakan yang diperlukan |
|---|---|---:|---|
| SRC-01 | Dua jurnal admin tidak seimbang | +5.000 | Konfirmasi pasangan kredit yang benar |
| SRC-02 | Helper `20090.0` di baris 3620 | 1.000.000 | Putuskan apakah harus dipetakan ke `PIUTANG KARYAWAN` |
| SRC-03/04 | Gap neraca | −995.000 | Rekonsiliasi modal/laba tahun berjalan |
| SRC-05 | Label `HOME!B5` | 151.891.762 delta | Perbaiki label workbook bila dipakai sebagai acuan eksternal |
| SRC-06 | Presisi cache biaya | 0,30 | Tidak perlu selama toleransi 0,50 disetujui |
| SRC-07 | Periode 2026 vs 2025 | — | Putuskan tahun pelaporan resmi |
| INV-01 | Master BRG-001/002/003 | — | Jika ingin parity, sediakan master inventaris di workbook |
| DEP-01 | Kebijakan penyusutan | — | Tetapkan metode, akun, dan frekuensi sebelum mengaktifkan jurnal otomatis |

## 9. Pernyataan akhir

- Tidak ada data historis yang dihapus atau ditimpa.
- Tidak ada transaksi dummy atau jurnal penyeimbang yang dibuat.
- Tidak ada hardcoding angka agar laporan tampak seimbang.
- UI/UX lama (sidebar, warna, tipografi, ringkasan dashboard, dan halaman inventaris) dipertahankan; bagian laporan kini dibuka sebagai halaman terpisah tanpa mengubah logika perhitungan.
- Status ini hanya menyatakan kesesuaian dengan workbook dan kode yang ada, bukan opini audit akuntansi formal.
