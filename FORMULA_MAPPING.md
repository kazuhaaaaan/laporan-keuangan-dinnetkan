# FORMULA_MAPPING — Pemetaan Rumus Workbook ke Mesin Website

## 1. Sumber dan arah alur

```text
KODE AKUN (master)  ─┐
JURNAL UMUM (input) ─┼─> buildTrialBalance ─> buildReportData ─> REPORT_DATA
SALDO AWAL (state)  ─┘                         ├─> summary / KPI
                                               ├─> incomeStatement
                                               ├─> assets / liabilities
                                               ├─> monthly
                                               └─> inventory + diagnostics
```

`app.js` tidak lagi membuat angka laporan baru; ia hanya membaca `REPORT_DATA`.

## 2. Master akun

| Workbook | Website | Catatan |
|---|---|---|
| `KODE AKUN!A` (serial tanggal) | `ACCOUNTS[i].sourceCode` | Disimpan sebagai metadata, bukan kode tampilan |
| `KODE AKUN!B` | `ACCOUNTS[i].name` | Nama historis dipertahankan persis |
| `KODE AKUN!C` | Helper lama (tidak dipakai sebagai kode utama) | `20090.0` tidak cocok dengan helper website |
| `KODE AKUN!D` | `ACCOUNTS[i].side` | `debet`/`kredit` |
| `KODE AKUN!E` | `ACCOUNTS[i].report` | `neraca`/`laba-rugi` |
| Urutan baris 8–135 tanpa header | `ACCOUNTS[0..123]` | Satu-satunya kunci pemetaan yang aman |

Dua akun bernama `HARGA POKOK PENJUALAN` dibedakan oleh `sourceCode` `41277.0` dan `41642.0` → `3.1.13` dan `3.1.14`.

## 3. Jurnal dan saldo

| Workbook | Rumus/kolom | Website | Rumus website |
|---|---|---|---|
| `JURNAL UMUM!G` | DEBET | `entry.lines[].debit` | `normalizeNumber(line.debit)` |
| `JURNAL UMUM!H` | KREDIT | `entry.lines[].kredit` | `normalizeNumber(line.kredit ?? line.credit)` |
| `JURNAL UMUM!D` | kode serial akun | `line.code` | `buildAccountIndex()` menerima `code`, `sourceCode`, atau `helper` |
| `KODE AKUN!F/G` | saldo awal debit/kredit | `state.openingBalances` | `resolveOpeningBalance()` dipakai sekali di `buildTrialBalance()` |
| `NERACA JALUR!D` | `IF(C="DEBET", saldoAwalDebet + Σjurnal debit − Σjurnal kredit, 0)` | `trialBalance.rows[].saldoDebet` | `side === 'debet' ? Math.max(0, saldo) : Math.max(0, -saldo)` |
| `NERACA JALUR!E` | `IF(C="KREDIT", saldoAwalKredit + Σjurnal kredit + helper kredit, 0)` | `trialBalance.rows[].saldoKredit` | `side === 'kredit' ? Math.max(0, saldo) : Math.max(0, -saldo)` |
| `NERACA JALUR!G/H` | alokasi laba rugi | `incomeStatement.revenueRows/expenseRows` | `group('pendapatan')`, `group('biaya')` |
| `NERACA JALUR!I/J` | alokasi neraca | `report.assets`, `report.liabilities` | `group('aset')`, `group('liabilitas')`, `group('ekuitas')` |

`saldo` website selalu dalam orientasi **sisi normal akun**:

```js
normalSide = ['pendapatan', 'liabilitas', 'ekuitas'].includes(row.type) ? 'kredit' : 'debet'
signed(row) = row.side === normalSide ? row.saldo : -row.saldo
```

Ini setara dengan kolom D/E workbook untuk dataset ini: tidak ada akun normal-kredit yang memiliki mutasi debit di sumber.

Baris dengan kode tidak dikenal tidak dibuang diam-diam: dicatat di `meta.diagnostics.unmappedLines` dan tidak masuk saldo. Ini selaras dengan workbook yang memakai `SUMIF` pada kode serial dan karena itu juga tidak memasukkan baris `20090.0`.

## 4. Laba rugi

| Workbook | Rumus | Cache | Website |
|---|---|---:|---|
| `LABA RUGI!C21` | `=SUM(C6:C20)` | 5.345.391.648 | `summary.pendapatan`, `incomeStatement.pendapatan` |
| `LABA RUGI!C83` | `=SUM(C22:C82)` | 5.194.628.101 | `summary.biaya`, `incomeStatement.biaya` |
| `LABA RUGI!C84` | `=C21-C83` | 150.763.547,30 | `summary.laba`, `incomeStatement.laba` |

`C83` cache dibulatkan ke rupiah; penjumlahan per-akun sekarang menghasilkan 5.194.628.100,70. Toleransi 0,50 dipakai di pengujian, bukan pembulatan di aplikasi.

## 5. Neraca

| Workbook | Rumus | Cache | Website |
|---|---|---:|---|
| `NERACA!C9` | `='NERACA JALUR'!I7` | 41.793 | `assets` → KAS KECIL |
| `NERACA!C10` | `='NERACA JALUR'!I8` | 3.498.492,30 | `assets` → BANK BCA DINETKAN |
| `NERACA!C38` | `='NERACA JALUR'!I36` | 151.891.762 | `assets` → PERALATAN DAN MESIN |
| `NERACA!C40` | `=SUM(C7:C39)` | 155.432.047,30 | `Σ report.assets` |
| `NERACA!F24` | `='NERACA JALUR'!D55+'NERACA JALUR'!E55` | 5.663.500 | `liabilities` → MODAL |
| `NERACA!F27` | kosong untuk LABA / RUGI TAHUN BERJALAN | 0 | `liabilities` → akun `2.1.28` dengan `amount = summary.laba` |

Website sengaja memasukkan laba tahun berjalan ke ekuitas karena itu perlakuan akuntansi yang benar. Workbook tidak melakukannya, sehingga total `NERACA!F40` tidak sepadan dengan total liabilitas website; selisihnya −995.000 ditandai `BLOCKED`.

## 6. KPI HOME — satu pengecualian

| KPI | Rumus workbook | Perlakuan website |
|---|---|---|
| Total pendapatan | `='LABA RUGI'!C21` | Sama |
| Total biaya | `='LABA RUGI'!C83` | Sama dalam toleransi cache |
| Laba | `='LABA RUGI'!C84` | Sama |
| Kas setara kas | `=NERACA!C40` | **Tidak sama.** Website memakai lima akun kas menurut `KODE AKUN`, bukan total aset. |

`HOME!B5 = 155.432.047,30`; kas website `3.540.285,30`; delta `151.891.762` = `PERALATAN DAN MESIN`. Status pengujian: `DEVIATION`, bukan `FAIL` dan bukan `PASS`.

## 7. Bulanan

Workbook tidak menyediakan laporan bulanan. Website menghitung dari `JURNAL UMUM` dengan aturan:

```text
key      = tanggal.slice(0, 7)          // YYYY-MM
revenue  = Σ (kredit − debit) untuk akun type='pendapatan'
expense  = Σ (debit − kredit) untuk akun type='biaya'
```

Tidak ada nilai cache workbook untuk dibandingkan; ini diuji secara fungsional di `tools/smoke-test.js` untuk kasus lintas tahun.

## 8. Inventaris dan Sheet15

- Tidak ada master barang, mutasi stok, atau kebijakan penyusutan di workbook. `INVENTORY_ITEMS` dan aturan lokal dipertahankan sebagai data lokal; tidak klaim parity.
- `Sheet15` adalah data settlement 74 baris tanpa formula dan tidak dipetakan ke akun. Kolom `Project = DINETKAN` adalah data historis yang tidak diubah.

## 9. Toleransi dan pembulatan

- Toleransi: **0,50 IDR** untuk semua perbandingan numerik.
- Pembulatan internal: `roundMoney(value)` → 2 desimal dengan `Math.round((value + Number.EPSILON) * 100) / 100`.
- Tidak ada penyesuaian paksa agar debit = kredit, aset = liabilitas, atau kas = total aset.
- Status `PASS` hanya diberikan bila selisih berada di dalam toleransi dan sumber nilainya tersedia. Jika tidak, status `BLOCKED`, `SKIP`, atau `DEVIATION` yang dipakai.
