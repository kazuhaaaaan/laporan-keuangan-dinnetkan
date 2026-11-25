# BUGFIX_REPORT — Laporan Perbaikan dan Temuan

Tanggal audit: 2026-11-25  
Workspace: `C:\Users\RYZEN\Documents\laporan-keuangan-dinnetkan-main`  
Sumber kebenaran: `C:\Users\RYZEN\Downloads\LAPORAN KEUANGAN 2025.xlsx` (read-only)

## 1. Ringkasan eksekutif

| Kategori | Jumlah | Keterangan |
|---|---:|---|
| Bug kode diperbaiki | 10 | Kas, bulanan, saldo awal, jurnal multi-baris, inventaris, storage, validasi, periode, branding, navigasi |
| Risiko dimitigasi | 1 | Penyusutan ganda: tidak ada jurnal otomatis |
| Temuan sumber `BLOCKED` | 5 | Jurnal tidak seimbang, akun tak terpetakan, ketidakseimbangan neraca, periode, presisi cache |
| Item `SKIP` | 2 | Master inventaris dan kebijakan penyusutan tidak ada di workbook |
| `FAIL` parity | 0 | Dari 23 pemeriksaan; lihat `FORMULA_PARITY_TEST.md` |

Tidak ada data historis yang dihapus. Tidak ada transaksi dummy yang ditambahkan. Tidak ada penyeimbangan paksa. Tidak ada status `PASS` yang diberikan pada data yang tidak dapat diverifikasi.

## 2. Daftar perbaikan

### BUG-01 — KPI kas memakai total aset

- **Severity:** High
- **Lokasi:** `data.js` (`CASH_EQUIVALENT_NAMES`, `buildReportData()`), `app.js` (`accountType()`)
- **Sebelum:** Semua akun berawalan `1.` dijumlahkan sebagai kas. Karena `PERALATAN DAN MESIN` (`1.2.25`) juga aset, KPI menampilkan 155.432.047,30 — sama dengan `HOME!B5` / `NERACA!C40`.
- **Akuntansi yang benar:** Kas hanya `KAS KECIL`, `BANK BCA DINETKAN`, `DUITKU`, `BANK MANDIRI DINETKAN`, dan `BANK` menurut `KODE AKUN`.
- **Perbaikan:** `CASH_EQUIVALENT_NAMES` dipakai sekali di `buildReportData()`; `accountType()` di dashboard memakai daftar yang sama.
- **Hasil:** 3.540.285,30. Selisih dengan workbook 151.891.762 = nilai peralatan.
- **Verifikasi:** `tools/parity-test.js` → `DEVIATION` (bukan `PASS`/`FAIL`) pada `HOME!B5`.
- **Status:** Fixed + documented deviation.

### BUG-02 — Grafik bulanan menggabungkan Januari 2025 dan Januari 2026

- **Severity:** High
- **Lokasi:** `data.js` (`buildMonthly()`), `app.js` (`refreshFilterOptions()`, `applyFilters()`)
- **Sebelum:** Kunci grup `date.slice(5, 7)` sehingga `2025-01` dan `2026-01` sama-sama menjadi `01`.
- **Perbaikan:** Kunci `YYYY-MM`; label `Jan 2026` dan filter memakai `date.slice(0, 7)`.
- **Verifikasi:** `tools/smoke-test.js` → `PASS | buildMonthly memisahkan tahun | 2025-01,2026-01`.
- **Status:** Fixed.

### BUG-03 — Saldo awal tidak ada sebagai konsep eksplisit

- **Severity:** Medium
- **Lokasi:** `data.js` (`normalizeOpeningBalances()`, `resolveOpeningBalance()`, `buildTrialBalance()`)
- **Sebelum:** `KODE AKUN!F/G` kosong dan tidak ada state saldo awal; baris `SALDO AWAL` di jurnal tidak dibedakan.
- **Perbaikan:** `state.openingBalances` ditambahkan dengan kunci `code` / `sourceCode` / `helper`. Nilai ditambahkan sekali ke baris trial balance. Baris jurnal `SALDO AWAL` tetap dihitung sebagai jurnal biasa, sehingga tidak double counting.
- **Verifikasi:** Parity 124 akun di `NERACA JALUR` → `PASS` dengan 0 selisih > 0,50.
- **Status:** Fixed. Pengisian saldo awal lewat UI tidak ditambahkan karena tidak ada pola bisnis di workbook; ini bukan blocker untuk dataset saat ini.

### BUG-04 — Form jurnal hanya mendukung 1 debit + 1 kredit

- **Severity:** High
- **Lokasi:** `index.html` (`#extraLines`, `#txAddLineBtn`), `app.js` (`initTransactionForm()`), `data.js` (`validateEntry()`)
- **Sebelum:** Jurnal multi-baris workbook tidak bisa direproduksi dari UI.
- **Perbaikan:** Baris tambahan dengan akun + posisi + nominal. Submit memvalidasi sisi normal, minimal satu baris, nominal positif, dan keseimbangan debit=kredit (toleransi 0,01). Mutasi stok hanya boleh menempel pada `1.2.13 PERSEDIAAN` dengan arah yang sesuai.
- **Verifikasi:** `tools/smoke-test.js` → `PASS | jurnal multi-baris | 3 baris tersimpan, 3 baris laporan`.
- **Status:** Fixed.

### BUG-05 — Sinkronisasi inventaris menimpa data lokal

- **Severity:** High
- **Lokasi:** `inventaris/app.js` (`journalSignature()`, `loadState()`, `normalizeInventoryState()`, `seedState()`, `mergeTransactions()`)
- **Sebelum:** Signature `${journal.length}:${inventory.transactions.length}` memicu `seedState()` setiap jumlah jurnal berubah. Transaksi lokal bisa hilang tanpa konfirmasi.
- **Perbaikan:**
  - Signature hanya ditulis sebagai diagnostik dan kunci lama dihapus; tidak pernah memicu reset.
  - `seedState()` tidak lagi menyimpan transaksi turunan jurnal di state lokal.
  - `normalizeInventoryState()` membuang `source === 'journal-derived'` dan id `mut-dummy-*`.
  - `mergeTransactions()` adalah satu-satunya tempat penggabungan turunan + lokal, dengan `Map` berdasarkan id.
  - Baris turunan ditandai `Jurnal`; tombol hapusnya disembunyikan.
- **Verifikasi:** `node --check inventaris/app.js` + `tools/smoke-test.js` (ID HTML dan alur impor).
- **Status:** Fixed.

### BUG-06 — Risiko penyusutan tercatat dua kali

- **Severity:** Medium
- **Lokasi:** `inventaris/index.html` (panel Penurunan Harga), `data.js` (`buildInventory().diagnostics.depreciationLines`)
- **Sebelum:** Aturan penurunan harga bisa dianggap jurnal, padahal akun `AK. PENYUSUTAN ...` dan `BIAYA PENYUSUTAN INVENTARIS` sudah ada di workbook.
- **Perbaikan:** Penurunan harga tetap berupa perhitungan nilai barang. UI menyatakan: “Aturan ini tidak membuat jurnal otomatis agar penyusutan tidak dicatat dua kali.” Engine hanya menghitung `depreciationLines` sebagai pengingat.
- **Verifikasi:** Parity → `SKIP | Kebijakan penyusutan` karena workbook tidak memuat kebijakan; tidak klaim benar/salah.
- **Status:** Mitigated; kebijakan akuntansi tetap `BLOCKED`.

### BUG-07 — localStorage tidak terversi dan tidak divalidasi

- **Severity:** High
- **Lokasi:** `data.js` (`FINANCE_STORAGE_KEY`, `LEGACY_FINANCE_KEYS`, `normalizeFinanceState()`, `importFinanceBackup()`), `inventaris/app.js` (`STORAGE_KEY`, `LEGACY_STORAGE_KEYS`)
- **Sebelum:** Kunci ejaan lama, array mentah, tanpa normalisasi/validasi/cadangan. Import bisa menimpa data dengan format salah.
- **Perbaikan:**

  | Kunci lama (migration source) | Kunci aktif |
  |---|---|
  | `dinnetkan-finance-journal-v2`, `dinnetkan-finance-journal-v1` | `dinetkan-finance-v1` |
  | `dinnetkan-inventory-v1` | `dinetkan-inventory-v1` |
  | `dinnetkan-inventory-journal-sync-v1` | `dinetkan-inventory-journal-sync-v1` |

  - State keuangan: `{version, entries, openingBalances, settings}`.
  - State inventaris: `{items, transactions, depreciations}`; transaksi turunan tidak disimpan.
  - `validateEntry()` menolak tanggal invalid, keterangan kosong, baris tanpa akun, nominal negatif, debit+kredit sekaligus, dan jurnal tidak seimbang.
  - `exportFinanceBackup()` / `importFinanceBackup()` melakukan round-trip tervalidasi.
  - Tombol cadangan/impor ditambahkan; pengosongan jurnal mengunduh cadangan otomatis sebelum menghapus.
- **Verifikasi:** `tools/smoke-test.js` → `PASS | migrasi localStorage | 1 transaksi, key baru ada` dan `PASS | round-trip cadangan JSON | ok=true, 1 transaksi`.
- **Status:** Fixed. Kunci lama sengaja tidak diganti ejaannya agar data lama tetap terbaca.

### BUG-08 — Perhitungan laporan diduplikasi di dashboard

- **Severity:** Medium
- **Lokasi:** `app.js` (`buildWorksheet()`, `renderBalance()`)
- **Sebelum:** Worksheet dan neraca menghitung saldo sendiri-sendiri dari jurnal; berisiko berbeda dari `data.js`.
- **Perbaikan:** `buildWorksheet()` hanya memetakan `report.trialBalance.rows`; `renderBalance()` memakai `report.assets` dan `report.liabilities`. Satu source of truth untuk semua angka.
- **Verifikasi:** Parity trial balance dan neraca → `PASS` semua.
- **Status:** Fixed.

### BUG-09 — Kesalahan sumber membuat dashboard gagal tampil

- **Severity:** Medium
- **Lokasi:** `data.js` (`buildReportData().meta.diagnostics`), `app.js` (`renderValidation()`)
- **Sebelum:** Akun tak dikenal dan selisih persediaan melempar exception, sehingga seluruh dashboard kosong.
- **Perbaikan:** Keduanya menjadi diagnostik: `unmappedLines`, `validationErrors`, `journalImbalance`, `inventoryVariance`, `inventory.diagnostics`. Banner `BLOCKED` merangkum masalah tanpa mengubah angka.
- **Verifikasi:** Dengan jurnal workbook, banner akan aktif karena 1 baris tak terpetakan dan selisih −995.000; parity tetap `PASS` untuk angka yang memang sebanding.
- **Status:** Fixed.

### BUG-10 — Periode dan branding hardcoded

- **Severity:** Low
- **Lokasi:** `index.html`, `inventaris/index.html`, `inventaris/app.js`, `app.js` (`initMeta()`), `data.js` (`derivePeriod()`)
- **Sebelum:** Teks UI memakai `Dinnetkan` dan `2025`, sementara workbook bertuliskan `Tahun 2026` dan jurnal 2025.
- **Perbaikan:** Branding UI menjadi `Dinetkan` (termasuk title Excel inventaris). Periode dan catatan KPI/neraca dihasilkan dari tanggal transaksi; fallback `TANPA DATA` / teks generik bila kosong.
- **Pengecualian sengaja:** Nama akun historis `BANK BCA DINETKAN`, `BANK MANDIRI DINETKAN`, data `Sheet15`, keterangan transaksi, path file, rumus, dan empat kunci localStorage lama tetap memakai ejaan lama.
- **Verifikasi:** `grep DINNETKAN|Dinnetkan|dinnetkan` pada file JS/HTML/CSS hanya menemukan 4 kunci migrasi legacy di aplikasi (2 di `data.js`, 2 di `inventaris/app.js`) dan 1 fixture pengujian di `tools/smoke-test.js`; `grep 2025` pada `index.html` tidak menemukan lagi tahun statis.
- **Status:** Fixed dengan exclusion list.

### BUG-11 — Menu Inventaris tidak langsung membuka halaman inventaris

- **Severity:** Medium
- **Lokasi:** `index.html` (tautan sidebar Inventaris)
- **Sebelum:** `href="inventaris/"` mengarah ke URL direktori. Saat file dibuka langsung dari `file://` atau server tanpa redirect direktori ke `index.html`, browser menampilkan daftar folder / halaman kosong, sehingga terasa seperti tidak berpindah ke inventaris.
- **Perbaikan:** Tautan diubah menjadi `href="inventaris/index.html"` sehingga eksplisit dan bekerja baik di `file://` maupun HTTP statis. Tautan balik di inventaris sudah memakai `../index.html`.
- **Verifikasi:** `tools/smoke-test.js` → `PASS | index.html: tautan inventaris/index.html | file ada` dan `PASS | inventaris/index.html: tautan ../index.html | file ada`.
- **Status:** Fixed.

## 3. Temuan sumber yang sengaja tidak diperbaiki

| ID | Temuan | Angka | Alasan |
|---|---|---:|---|
| SRC-01 | Dua jurnal `BIAYA ADMINISTRASI` Rp2.500 tanpa pasangan kredit (baris 2923–2925, 3115–3117) | +5.000 | Membutuhkan keputusan akuntansi; tidak ada bukti koreksi di workbook |
| SRC-02 | Baris 3620 memakai helper `20090.0` untuk `PIUTANG KARYAWAN` | 1.000.000 | `SUMIF` workbook juga memakai kolom D dan tidak memasukkan baris ini |
| SRC-03 | Jurnal terpetakan tidak seimbang setelah SRC-02 dikeluarkan | −995.000 | Sama dengan gap neraca; tidak ditambal |
| SRC-04 | `NERACA!F27` kosong untuk laba tahun berjalan | −995.000 gap | Website menampilkan laba sebagai ekuitas terpisah, bukan memaksa total sama |
| SRC-05 | `HOME!B5` berlabel kas tetapi merujuk total aset | 151.891.762 delta | Label workbook salah; website memakai definisi kas menurut akun |
| SRC-06 | `C83` cache dibulatkan ke rupiah | 0,30 | Dua baris biaya dibulatkan; toleransi 0,50 terdokumentasi |
| SRC-07 | `NERACA!A3 = Tahun 2026`, jurnal 2025 | — | Periode website mengikuti transaksi, bukan judul sheet |
| SRC-08 | Master BRG-001/002/003 tidak ada di workbook | — | Data lokal dipertahankan, tidak klaim parity |
| SRC-09 | Kebijakan penyusutan tidak ada di workbook | — | Tidak membuat jurnal otomatis |

## 4. Bukti pengujian terakhir

```text
node --check data.js                 → OK
node --check app.js                  → OK
node --check inventaris/app.js       → OK
node tools/parity-test.js            → PASS 15, DEVIATION 1, BLOCKED 5, SKIP 2, FAIL 0
node tools/smoke-test.js             → 8/8 PASS
```

Detail seluruh baris hasil ada di `tools/parity-results.json` dan `FORMULA_PARITY_TEST.md`.

## 5. Pernyataan integritas

- Tidak ada sel workbook yang ditulis ulang.
- Tidak ada akun, nama customer, uraian transaksi, atau tanggal historis yang diganti.
- Tidak ada jurnal penyeimbang yang dibuat.
- Tidak ada angka yang di-hardcode agar laporan terlihat seimbang.
- `DEVIATION`, `BLOCKED`, dan `SKIP` sengaja dipertahankan agar pembaca laporan mengetahui batas datanya.
