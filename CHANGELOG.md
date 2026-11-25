# CHANGELOG

Semua perubahan tercatat pada tanggal **2026-11-25**. Proyek ini bukan repository Git dan tidak memakai package manager; bagian “Unreleased” di bawah adalah status lokal terkini.

## [Unreleased] — 2026-11-25

### Added

- `data.js`
  - `SOURCE_ACCOUNT_CODES` + `sourceCode` pada 124 akun untuk memetakan kode serial `KODE AKUN!A` tanpa mengganti kode tampilan.
  - `CASH_EQUIVALENT_NAMES` sebagai definisi tunggal kas setara kas.
  - `openingBalances` dalam state keuangan dan `resolveOpeningBalance()`.
  - `validateEntry()`, `normalizeFinanceState()`, `normalizeInventoryState()`.
  - `derivePeriod()`, `refreshReportData()`, `exportFinanceBackup()`, `importFinanceBackup()`.
  - `meta.diagnostics` untuk `validationErrors`, `unmappedLines`, `journalImbalance`, `inventoryVariance`, dan `depreciationLines`.
  - `buildReportData()` sebagai satu-satunya jalur perhitungan laporan.
- `app.js`
  - Banner validasi `BLOCKED`.
  - Filter bulan `YYYY-MM` lintas tahun.
  - Form jurnal multi-baris dengan validasi sisi normal dan keseimbangan.
  - Tombol **Unduh Cadangan**, **Muat Cadangan**, dan auto-backup sebelum **Kosongkan data**.
  - Catatan KPI/neraca yang mengikuti `meta.period`.
- `index.html`
  - `#validationBanner`, `#extraLines`, `#txAddLineBtn`, `#backupJournalBtn`, `#importJournalBtn`, `#journalImportFile`.
  - Id dinamis untuk catatan KPI (`kpiRevenueNote`, `kpiExpenseNote`, `kpiCashNote`) dan `balanceNote`.
- `inventaris/app.js`
  - Kunci storage terversi + migrasi kunci lama.
  - `mergeTransactions()` sebagai penggabung tunggal transaksi jurnal dan lokal.
  - Impor cadangan dengan validasi format tanggal dan pemisahan transaksi turunan.
  - Penanda sumber `Jurnal` pada mutasi turunan.
- `tools/parity-test.js` — parity test mandiri yang membaca XLSX langsung via ZIP/XML, tanpa npm/Python/Excel.
- `tools/smoke-test.js` — uji ID HTML, lintas tahun, migrasi, multi-baris, dan round-trip cadangan.
- `tools/parity-results.json` — keluaran mesin dari parity test.
- Dokumentasi: `AUDIT_EXCEL.md`, `AUDIT_CODE.md`, `FORMULA_MAPPING.md`, `FORMULA_PARITY_TEST.md`, `BUGFIX_REPORT.md`, `CHANGELOG.md`, `SYSTEM_STATUS.md`.

### Changed

- Branding UI `Dinnetkan` → `Dinetkan` di dashboard, inventaris, dan judul ekspor Excel.
- Judul/deskripsi/footer dan catatan periode tidak lagi menuliskan `2025` secara statis; runtime memakai tanggal transaksi.
- `buildWorksheet()` dan `renderBalance()` sekarang hanya memetakan hasil `REPORT_DATA`.
- Inventaris tidak lagi menyimpan transaksi turunan jurnal di state lokal; baris turunan dienumerasi ulang dari jurnal saat merge.
- Panel penurunan harga menyatakan secara eksplisit bahwa aturan tersebut tidak membuat jurnal otomatis.

### Fixed

- KPI kas sebelumnya menjumlahkan seluruh aset; sekarang 3.540.285,30 sesuai akun kas.
- `buildMonthly()` sebelumnya menggabungkan bulan dengan nomor sama dari tahun berbeda; sekarang memakai `YYYY-MM`.
- Jurnal multi-baris kini dapat dibuat dan divalidasi dari UI.
- Data lokal inventaris tidak lagi di-reset saat jumlah jurnal berubah.
- localStorage lama dimigrasikan ke kunci baru tanpa kehilangan transaksi.
- Akun tak terpetakan dan selisih persediaan tidak lagi membuat dashboard gagal tampil; keduanya tampil sebagai diagnostik.
- Menu Inventaris kini menuju `inventaris/index.html` secara eksplisit, sehingga langsung membuka halaman inventaris baik lewat `file://` maupun server statis.

### Documented / Not changed

- `HOME!B5` salah label: workbook mereferensi total aset. Website sengaja menyimpang; status `DEVIATION`.
- Dua jurnal admin masing-masing +Rp2.500 tidak seimbang; tidak dikoreksi.
- Baris 3620 memakai helper `20090.0`; tidak dipetakan, selaras dengan `SUMIF` workbook.
- Gap neraca −995.000 dan `NERACA!F27` kosong; tidak ditambal.
- Cache `LABA RUGI!C83` dibulatkan; toleransi 0,50 IDR didokumentasi.
- `NERACA!A3 = Tahun 2026` vs jurnal 2025; tidak disamakan.
- Master barang dan kebijakan penyusutan tidak ada di workbook; status `SKIP`.
- Legacy `dinnetkan-*` storage keys, nama akun `DINETKAN`, data `Sheet15`, path, rumus, dan uraian historis tidak diubah.

### Tests

- `node --check data.js`, `node --check app.js`, `node --check inventaris/app.js` → OK.
- `node tools/parity-test.js` → `PASS 15`, `DEVIATION 1`, `BLOCKED 5`, `SKIP 2`, `FAIL 0`.
- `node tools/smoke-test.js` → 8 dari 8 pemeriksaan PASS.

## Catatan versi

Belum ada nomor versi rilis resmi. Jika diperlukan, gunakan `1.0.0-audit-2026-11-25` untuk paket perubahan ini.
