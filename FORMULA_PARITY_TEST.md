# FORMULA_PARITY_TEST — Hasil Uji Kesetaraan Rumus

## 1. Cara menjalankan

```powershell
cd <root proyek>
node tools\parity-test.js
node tools\smoke-test.js
```

Opsional, tentukan workbook lain:

```powershell
node tools\parity-test.js "C:\Path\Ke\LAPORAN KEUANGAN 2025.xlsx"
```

`parity-test.js`:

- membaca `.xlsx` langsung sebagai ZIP/XML memakai PowerShell + .NET (tanpa `npm`, tanpa Python, tanpa Excel);
- membongkar sheet `HOME`, `KODE AKUN`, `JURNAL UMUM`, `NERACA JALUR`, `LABA RUGI`, `NERACA`;
- merekonstruksi 2.795 baris jurnal menjadi 1.301 transaksi;
- menjalankan `data.js` di VM Node dengan localStorage kosong;
- membandingkan hasil engine dengan **nilai cache workbook**;
- menulis `tools/parity-results.json`.

`smoke-test.js` menguji perilaku yang tidak punya padanan di workbook (lintas tahun, multi-baris, migrasi storage, cadangan).

## 2. Definisi status

| Status | Arti |
|---|---|
| `PASS` | Sumber tersedia, selisih ≤ 0,50 IDR |
| `FAIL` | Sumber tersedia, selisih > 0,50 IDR — tidak boleh dianggap berhasil |
| `DEVIATION` | Keduanya bisa dihitung, tetapi definisinya memang berbeda dan sengaja dipertahankan |
| `BLOCKED` | Data sumber bermasalah/bertentangan; tidak ada keputusan sepihak |
| `SKIP` | Tidak ada data workbook yang bisa dijadikan pembanding |

Toleransi **0,50 IDR** dipilih karena dua cache `LABA RUGI` dibulatkan ke rupiah (`BIAYA SEWA JARINGAN` dan `BIAYA ADMINISTRASI BANK`), menghasilkan selisih total 0,30 pada `C83`. Tidak ada pembulatan paksa di aplikasi.

## 3. Ringkasan hasil

```json
{
  "PASS": 15,
  "DEVIATION": 1,
  "BLOCKED": 5,
  "SKIP": 2,
  "FAIL": 0
}
```

Statistik sumber: 124 akun, 2.795 baris jurnal, 1.301 transaksi, 12 bucket bulanan.

## 4. Tabel hasil lengkap

| Status | Kategori | Item | Expected | Actual | Catatan |
|---|---|---|---:|---:|---|
| PASS | mapping | ACCOUNTS vs KODE AKUN (124 akun) | 124, 0 selisih | 124, 0 selisih | Urutan baris dipakai sebagai kunci |
| PASS | home | `HOME!B2` pendapatan | 5.345.391.648,00 | 5.345.391.648,00 | delta 0 |
| PASS | home | `HOME!B3` biaya | 5.194.628.101,00 | 5.194.628.100,70 | delta −0,30 (cache dibulatkan) |
| PASS | home | `HOME!B4` laba | 150.763.547,30 | 150.763.547,30 | delta 0 |
| DEVIATION | home | `HOME!B5` label kas | 155.432.047,30 | 3.540.285,30 | Workbook memakai `NERACA!C40` = total aset |
| PASS | income statement | LABA RUGI per akun (73 akun) | 0 selisih > 0,50 | 0 selisih > 0,50 | Nilai cache C per baris |
| PASS | income statement | `LABA RUGI!C84` | 150.763.547,30 | 150.763.547,30 | delta 0 |
| PASS | trial balance | NERACA JALUR saldo per akun (124 akun) | 0 selisih > 0,50 | 0 selisih > 0,50 | Header worksheet dilewati |
| PASS | balance sheet | `NERACA!C9` KAS KECIL | 41.793,00 | 41.793,00 | delta 0 |
| PASS | balance sheet | `NERACA!C10` BANK BCA DINETKAN | 3.498.492,30 | 3.498.492,30 | delta 0 |
| PASS | balance sheet | `NERACA!C38` PERALATAN DAN MESIN | 151.891.762,00 | 151.891.762,00 | delta 0 |
| PASS | balance sheet | `NERACA!C40` total aset | 155.432.047,30 | 155.432.047,30 | delta 0 |
| PASS | balance sheet | `NERACA!F24` MODAL | 5.663.500,00 | 5.663.500,00 | delta 0 |
| PASS | balance sheet | `LABA RUGI!C84` → ekuitas laporan | 150.763.547,30 | 150.763.547,30 | delta 0 |
| PASS | journal | Total debit jurnal termasuk baris tak terpetakan | 10.702.157.010,70 | 10.702.157.010,70 | delta 0 |
| PASS | journal | Total kredit jurnal termasuk baris tak terpetakan | 10.702.152.010,70 | 10.702.152.010,70 | delta 0 |
| BLOCKED | journal | Akun tidak ada di KODE AKUN | 0 baris | 1 baris | `20090.0`, debit 1.000.000, baris 3620 |
| BLOCKED | journal | Keseimbangan jurnal mentah | 0 | 5.000 | Dua transaksi admin masing-masing +2.500 |
| BLOCKED | journal | Keseimbangan jurnal terpetakan | 0 | −995.000 | Setelah baris `20090.0` dikeluarkan |
| BLOCKED | balance sheet | Aset − liabilitas − laba | 0 | −995.000 | `NERACA!F27` kosong di workbook |
| SKIP | inventory | Master BRG-001/002/003 | tidak tersedia | 3 item lokal | Tidak ada data workbook |
| SKIP | depreciation | Kebijakan penyusutan | tidak tersedia | tanpa jurnal otomatis | Tidak ada data workbook |
| BLOCKED | period | Periode workbook vs jurnal | Tahun 2026 | 2025-01-01 … 2025-12-31 | Tidak disamakan |

## 5. Penjelasan item penting

### 5.1 `DEVIATION` kas

`HOME!B5` bernilai 155.432.047,30 karena mereferensi total aset. Mesin website memakai akun kas menurut `KODE AKUN`: 3.540.285,30. Selisih 151.891.762 sama dengan `PERALATAN DAN MESIN`. Ini bukan `FAIL` karena keduanya dihitung dengan benar menurut definisi masing-masing; yang salah adalah label workbook.

### 5.2 `BLOCKED` jurnal

- Dua transaksi `BIAYA ADMINISTRASI` Rp2.500 tidak memiliki pasangan kredit (baris 2923–2925 dan 3115–3117).
- Baris 3620 memakai kode helper `20090.0` yang juga tidak dihitung oleh `SUMIF` workbook.
- Setelah kode tersebut dikeluarkan, jurnal terpetakan berselisih −995.000.

Angka-angka ini sengaja dibiarkan. Tidak ada jurnal penyeimbang, tidak ada koreksi otomatis, tidak ada `PASS` palsu.

### 5.3 `BLOCKED` neraca

`NERACA!F40` hanya 5.663.500 karena `F27` (laba tahun berjalan) kosong. Aset 155.432.047,30 − 5.663.500 − 150.763.547,30 = −995.000. Website menampilkan laba sebagai komponen ekuitas terpisah dan menandai selisih.

### 5.4 `SKIP`

Tidak ada master barang, mutasi stok, atau aturan penyusutan di workbook. Karena itu tidak ada nilai yang bisa dibandingkan untuk inventaris dan penyusutan. Data lokal tetap dipertahankan; tidak dibuat data dummy baru.

## 6. Hasil `smoke-test.js`

```text
PASS | app.js: ID HTML | 53 direferensikan, 0 hilang
PASS | inventaris/app.js: ID HTML | 66 direferensikan, 0 hilang
PASS | index.html: tautan inventaris/index.html | file ada
PASS | inventaris/index.html: tautan ../index.html | file ada
PASS | buildMonthly memisahkan tahun | 2025-01,2026-01
PASS | migrasi localStorage | 1 transaksi, key baru ada
PASS | jurnal multi-baris | 3 baris tersimpan, 3 baris laporan
PASS | round-trip cadangan JSON | ok=true, 1 transaksi
```

## 7. Batasan pengujian

- Pengujian memakai **nilai cache** workbook, bukan mesin kalkulasi Excel. Jika workbook dibuka dan disimpan ulang, cache dapat berubah.
- Tidak ada pengujian browser end-to-end; tidak ada `package.json`, build tool, atau runtime DOM di proyek ini.
- `Sheet15` tidak diuji karena tidak dipetakan ke laporan.
- Status `PASS` tidak berarti data sumber seimbang; status `BLOCKED` tetap berlaku walaupun angka laporan cocok dengan workbook.
