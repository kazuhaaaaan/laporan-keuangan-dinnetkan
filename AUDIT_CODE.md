# AUDIT_CODE — Audit dan Refactor Kode Website

## 1. File yang diaudit

| File | Peran sebelum refactor | Perlakuan |
|---|---|---|
| `data.js` | 124 definisi akun, 3 item inventaris, fungsi hitung laporan, localStorage | Mesin hitung terpusat + storage versi baru |
| `app.js` | Dashboard, KPI, grafik, worksheet, filter, form jurnal, ekspor CSV | Memakai hasil `data.js`, tidak menghitung ulang laporan |
| `index.html` | Struktur dashboard, form 1 debit + 1 kredit, filter bulan | Branding, banner validasi, tombol cadangan, baris jurnal tambahan |
| `styles.css` | Seluruh tampilan dashboard | 3 blok gaya baru; warna/tipografi/layout lama tidak diubah |
| `inventaris/app.js` | Mutasi barang, penyusutan, impor/ekspor, sinkron jurnal | Storage versi baru, merge transaksi, tanpa reseed destruktif |
| `inventaris/index.html` | UI inventaris | Branding + penjelasan bahwa penurunan harga tidak membuat jurnal |

Tidak ada file dihapus. Tidak ada data historis, akun, nama customer, atau uraian transaksi yang ditimpa.

## 2. Prinsip refactor

1. **Satu sumber perhitungan.** Seluruh turunan angka berada di `data.js`. `app.js` hanya membaca `REPORT_DATA`.
2. **Tidak memaksa seimbang.** Ketidakseimbangan sumber tetap tampil sebagai `BLOCKED`.
3. **Tidak menebak klasifikasi.** Akun tak dikenal tidak dimasukkan ke laporan dan dicatat di diagnostik.
4. **Data lokal tidak hilang.** Migrasi localStorage bersifat additive; penghapusan jurnal mengunduh cadangan terlebih dahulu.
5. **UI/UX dipertahankan.** Sidebar, navigasi, warna, grid, tipografi, tabel, dan alur input lama tetap ada; perubahan hanya menambah kemampuan.

## 3. Temuan dan perbaikan

### C-01 — Perhitungan kas salah (HIGH, fixed)

**Sebelum.** `summary.kas` menjumlahkan semua akun `1.*` di neraca. Karena akun `PERALATAN DAN MESIN` juga berawalan `1.`, KPI “Kas Setara Kas” mengikuti kesalahan pelabelan `HOME!B5` dan bernilai 155.432.047,30.

**Sesudah.** `CASH_EQUIVALENT_NAMES` membatasi kas pada `KAS KECIL`, `BANK BCA DINETKAN`, `DUITKU`, `BANK MANDIRI DINETKAN`, dan `BANK`. Nilai sekarang **3.540.285,30**. `accountType()` di `app.js` juga memakai daftar yang sama, sehingga filter “kas” konsisten.

**Verifikasi.** `FORMULA_PARITY_TEST.md`, baris `HOME!B5` berstatus `DEVIATION` dengan delta 151.891.762.

### C-02 — `buildMonthly()` menggabungkan tahun (HIGH, fixed)

**Sebelum.** `entry.date.slice(5, 7)` dipakai sebagai kunci. Januari 2025 dan Januari 2026 jatuh ke bucket `01` yang sama.

**Sesudah.** Kunci `YYYY-MM`, dengan `year`, `number`, `month`, dan `label` (mis. `Jan 2026`). Filter bulan memakai `item.key`, dan `applyFilters()` membandingkan `date.slice(0, 7)`.

**Verifikasi.** `tools/smoke-test.js`: dua entri `2025-01-15` dan `2026-01-15` menghasilkan `2025-01,2026-01` (PASS).

### C-03 — Saldo awal tidak eksplisit (MEDIUM, fixed)

**Sebelum.** Tidak ada konsep saldo awal. `buildTrialBalance()` hanya menjumlahkan jurnal, dan baris `SALDO AWAL` di Excel tidak dibedakan.

**Sesudah.** State keuangan memiliki `openingBalances` dengan struktur `{kode: {debit, kredit}}`. `buildTrialBalance()` menambahkannya sekali di awal ke `openingDebit`/`openingKredit`. Baris jurnal `SALDO AWAL` tetap diperlakukan sebagai jurnal biasa, sehingga tidak ada double counting. Kode lama, `sourceCode`, dan `helper` semuanya diterima sebagai kunci.

**Catatan.** Workbook tidak mengisi `KODE AKUN!F/G`; saldo awal di workbook berasal dari jurnal. UI pengisian saldo awal belum ditambahkan karena tidak ada pola bisnis yang dapat diambil dari workbook.

### C-04 — Jurnal hanya 1 debit + 1 kredit (HIGH, fixed)

**Sebelum.** Form `index.html` dan `initTransactionForm()` memaksa tepat satu akun debit dan satu akun kredit. Jurnal multi-baris di Excel tidak bisa direproduksi.

**Sesudah.** Tombol `+ Tambah baris jurnal` menambah akun, posisi debit/kredit, dan nominal. Field lama `txDebit`, `txCredit`, `txAmount` tetap dipakai sebagai dua baris pertama. Submit:

- menghitung total debit dan kredit dan menolak selisih > 0,01;
- memvalidasi sisi normal akun;
- tetap menghubungkan mutasi stok hanya ke akun `1.2.13 PERSEDIAAN`;
- menyimpan `lines[]` utuh.

**Verifikasi.** `tools/smoke-test.js`: jurnal 3 baris tersimpan dan menghasilkan 3 baris laporan (PASS).

### C-05 — Sinkronisasi inventaris mereset data lokal (HIGH, fixed)

**Sebelum.** `journalSignature()` hanya memakai `${REPORT_DATA.journal.length}:${REPORT_DATA.inventory.transactions.length}`. Setiap perubahan jumlah jurnal membuat signature berubah, lalu `loadState()` mengganti seluruh state inventaris dengan hasil `seedState()`. Edit lokal bisa hilang tanpa pemberitahuan.

**Sesudah.**

- Signature tidak lagi memicu reset; hanya ditulis untuk diagnostik.
- Transaksi turunan jurnal (`source: journal-derived`, id `mut-dummy-*`) digabung dengan transaksi lokal menggunakan `Map` berdasarkan id.
- Transaksi turunan tidak disimpan sebagai transaksi lokal, sehingga tidak bisa basi atau dobel saat jurnal berubah.
- Impor cadangan membuang transaksi turunan dan membiarkannya regenerate dari jurnal.
- Baris turunan ditandai `Jurnal` dan tombol hapusnya disembunyikan.

### C-06 — Potensi penyusutan ganda (MEDIUM, mitigated)

**Sebelum.** Aturan penurunan harga di halaman inventaris bisa berubah menjadi jurnal, sementara workbook sudah memiliki akun `AK. PENYUSUTAN ...` dan `BIAYA PENYUSUTAN INVENTARIS`. Tanpa kebijakan yang tertulis, penyusutan berisiko dicatat dua kali.

**Sesudah.** Penurunan harga tetap berupa perhitungan harga barang dan **tidak membuat jurnal otomatis**. UI menyatakan hal ini secara eksplisit. `buildInventory()` hanya menghitung `diagnostics.depreciationLines` sebagai pengingat bahwa akun penyusutan ada di jurnal sumber. Kebijakan penyusutan tetap `BLOCKED` sampai ditentukan pengguna.

### C-07 — localStorage tidak terversi (HIGH, fixed)

**Sebelum.** Kunci statis `dinnetkan-finance-journal-v2`, `dinnetkan-inventory-v1`, dan `dinnetkan-inventory-journal-sync-v1`. Tidak ada normalisasi, validasi, cadangan, atau migrasi.

**Sesudah.**

| Kunci lama | Kunci baru |
|---|---|
| `dinnetkan-finance-journal-v2`, `dinnetkan-finance-journal-v1` | `dinetkan-finance-v1` |
| `dinnetkan-inventory-v1` | `dinetkan-inventory-v1` |
| `dinnetkan-inventory-journal-sync-v1` | `dinetkan-inventory-journal-sync-v1` |

- `normalizeFinanceState()` menerima array lama maupun objek `{version, entries, openingBalances, settings}`.
- `normalizeInventoryState()` memfilter entitas tanpa id dan memisahkan transaksi turunan.
- `validateEntry()` menolak tanggal invalid, keterangan kosong, baris tanpa akun, nominal negatif, debit+kredit sekaligus, dan jurnal tidak seimbang.
- `exportFinanceBackup()` / `importFinanceBackup()` menambah cadangan JSON dan impor tervalidasi.
- Tombol **Unduh Cadangan**, **Muat Cadangan**, dan konfirmasi pengosongan dengan unduhan otomatis ditambahkan.

**Verifikasi.** `tools/smoke-test.js`: migrasi kunci lama dan round-trip cadangan PASS.

### C-08 — Rumus laporan diduplikasi (MEDIUM, fixed)

**Sebelum.** `app.js` memiliki `buildWorksheet()`, `renderBalance()`, `renderKpis()`, dan `accountType()` yang menghitung ulang atau mengklasifikasikan ulang data secara terpisah dari `data.js`.

**Sesudah.** `buildWorksheet()` kini hanya membentuk tampilan dari `report.trialBalance.rows` dan `report.summary`. `renderBalance()` memakai `report.assets` dan `report.liabilities`. Tidak ada angka laporan yang dihitung dua kali dengan rumus berbeda.

### C-09 — Periode dan judul hardcoded (LOW, fixed)

**Sebelum.** `meta.period` memakai tahun entri terakhir atau fallback `2025`; `index.html` juga menuliskan `2025` di title, deskripsi, dan footer. Workbook justru bertuliskan `Tahun 2026`.

**Sesudah.** `derivePeriod()` memakai rentang tahun dari tanggal transaksi (`TANPA DATA` bila kosong). Judul, deskripsi, footer, dan catatan KPI/neraca tidak lagi menuliskan `2025` secara statis; `document.title`, eyebrow, dan empat catatan KPI/neraca diisi dari `meta.period` atau fallback generik.

### C-10 — Kesalahan source ditampilkan sebagai angka sah (MEDIUM, fixed)

**Sebelum.** Baris akun tak dikenal menyebabkan throw; inkonsistensi persediaan juga menyebabkan throw, sehingga seluruh dashboard gagal tampil.

**Sesudah.** Keduanya menjadi diagnostik: `unmappedLines`, `validationErrors`, `journalImbalance`, dan `inventoryVariance`. Banner `BLOCKED` di bagian atas dashboard merangkum masalah tanpa mengubah angka.

### C-11 — Branding (LOW, fixed)

`Dinnetkan` → `Dinetkan` diterapkan pada teks UI, title, meta description, footer, dan ekspor Excel inventaris. Varian uppercase historis pada nama akun (`BANK BCA DINETKAN`, `BANK MANDIRI DINETKAN`), data `Sheet15`, dan keterangan transaksi tidak diubah. Empat kunci localStorage lama sengaja tetap memakai ejaan lama agar data lama terbaca; setelah dibaca, data ditulis ke kunci baru.

### C-12 — Tautan menu Inventaris (MEDIUM, fixed)

**Sebelum.** Sidebar memakai `href="inventaris/"`, yaitu URL direktori. Pada pembukaan langsung lewat `file://` atau server statis tanpa redirect direktori, browser tidak otomatis membuka `index.html` di dalam folder tersebut.

**Sesudah.** Tautan menjadi `href="inventaris/index.html"`. Tautan balik di halaman inventaris sudah memakai `../index.html`. `tools/smoke-test.js` kini memeriksa kedua tautan dan keberadaan file tujuannya.

## 4. Perubahan UI yang sengaja dilakukan

| Elemen | Alasan |
|---|---|
| `#validationBanner` | Menampilkan diagnostik `BLOCKED` |
| `#extraLines`, `#txAddLineBtn` | Jurnal multi-baris |
| `#backupJournalBtn`, `#importJournalBtn`, `#journalImportFile` | Cadangan dan validasi impor |
| `.validation-banner`, `.extra-lines`, `.extra-line`, `.add-line-btn` | Gaya tambahan; tidak mengubah token warna/font yang ada |
| Teks panel input dan penurunan harga | Menjelaskan perilaku baru tanpa mengubah alur |

## 5. Status akhir

| Area | Status |
|---|---|
| Mesin hitung terpusat | Selesai |
| Kas, bulanan, saldo awal, multi-baris | Selesai |
| Storage versi, migrasi, cadangan, validasi | Selesai |
| Sinkronisasi inventaris | Selesai |
| Penyusutan ganda | Dimitigasi; kebijakan tetap BLOCKED |
| Ketidakseimbangan dan kode akun sumber | BLOCKED, sengaja tidak diperbaiki |
| Branding | Selesai dengan pengecualian data historis/kunci lama |
| Navigasi inventaris | Selesai; tautan eksplisit ke `inventaris/index.html` |
