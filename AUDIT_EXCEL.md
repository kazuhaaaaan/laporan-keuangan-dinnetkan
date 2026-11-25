# AUDIT_EXCEL — Sumber Data Workbook

## 1. Ruang lingkup dan metode

- File sumber: `C:\Users\RYZEN\Downloads\LAPORAN KEUANGAN 2025.xlsx` (satu-satunya sumber kebenaran).
- Audit dilakukan **read-only** dengan membaca paket XLSX sebagai ZIP/XML. Tidak ada sel, formula, atau nilai yang diubah.
- Setiap sheet dibongkar menjadi dump sel mentah di folder kerja sementara `xlsx-audit/sheet1.txt` … `sheet7.txt`.
- Nilai yang dilaporkan di bawah adalah **nilai cache workbook** (`<v>`), bukan hasil hitung ulang oleh auditor.
- Karena parser dasar tidak menghitung ulang rumus Excel, kriteria “benar” adalah: rumus dicatat apa adanya, string sumber dipetakan menurut bukti di workbook, dan hasil website dibandingkan dengan cache pada `FORMULA_PARITY_TEST.md`.

## 2. Inventaris sheet

| Sheet | Baris dibaca | Sel | Sel rumus | Karakter |
|---|---:|---:|---:|---|
| `HOME` | 1000 | 9 | 4 | Ringkasan 4 KPI |
| `KODE AKUN` | 1001 | 665 | 0 | Master akun + saldo awal (kolom F/G) |
| `JURNAL UMUM` | 5097 | 13.983 | 0 | 2.795 baris transaksi manual |
| `NERACA JALUR` | 1001 | 1337 | 275 | Worksheet/perhitungan saldo |
| `LABA RUGI` | 985 | 237 | 78 | Laporan laba rugi |
| `NERACA` | 1002 | 181 | 56 | Neraca |
| `Sheet15` | 75 | 976 | 0 | Data settlement payment gateway (bukan laporan) |

## 3. `HOME` — KPI dan masalah pelabelan

| Sel | Label | Rumus | Cache |
|---|---|---|---:|
| `B2` | TOTAL PENDAPATAN | `='LABA RUGI'!C21` | 5.345.391.648 |
| `B3` | TOTAL BIAYA | `='LABA RUGI'!C83` | 5.194.628.101 |
| `B4` | LABA | `='LABA RUGI'!C84` | 150.763.547,30 |
| `B5` | KAS SETARA KAS | `=NERACA!C40` | 155.432.047,30 |

**Temuan HOME-01 (BLOCKED untuk parity, bukan bug kode).** Label `KAS SETARA KAS` tidak sesuai rumusnya. `NERACA!C40` adalah `SUM(C7:C39)`, yaitu **total aset**, bukan kas. Di dalam total itu terdapat `PERALATAN DAN MESIN` sebesar 151.891.762. Kas menurut nama akun kas di `KODE AKUN` adalah:

- `KAS KECIL` 41.793
- `BANK BCA DINETKAN` 3.498.492,30
- `DUITKU`, `BANK MANDIRI DINETKAN`, `BANK` 0

Jumlah kas menurut akun = **3.540.285,30**. Selisih dengan `HOME!B5` = **151.891.762**, persis nilai peralatan. Website memakai definisi kas yang benar secara akuntansi; selisih ini dinyatakan sebagai `DEVIATION`, bukan `PASS`.

## 4. `KODE AKUN` — master akun

Kolom:

| Kolom | Isi |
|---|---|
| A | `KODE AKUN` (nilainya artifact serial tanggal Excel, mis. `40179.0`, `45689.0`) |
| B | `NAMA AKUN` |
| C | `TABEL BANTUAN` (helper; berbeda dengan kode website) |
| D | `POS SALDO` (`DEBET`/`KREDIT`) |
| E | `POS LAPORAN` (`NERACA`/`LABA RUGI`) |
| F/G | `SALDO AWAL` — `DEBET` / `KREDIT` |

Temuan:

1. **131 baris terisi**: 7 baris header/kategori (baris 6, 7, 21, 39, 40, 62, 76) + **124 akun nyata**.
2. Urutan 124 akun nyata cocok 1:1 dengan `ACCOUNTS` di `data.js` berdasarkan **urutan baris + nama + pos saldo + pos laporan**. Kode numerik kolom A tidak boleh dipakai sebagai kode akun website.
3. Kolom F/G hanya berisi header; **tidak ada angka saldo awal**. Saldo awal justru muncul sebagai baris jurnal dengan keterangan `SALDO AWAL` di `JURNAL UMUM!A2:H3`:
   - `JURNAL UMUM!H2` = 5.585.000 (kredit `MODAL`)
   - `JURNAL UMUM!G3` = 5.585.000 (debet `BANK BCA DINETKAN`)
4. Duplikat nama `HARGA POKOK PENJUALAN` terjadi pada kode serial `41277.0` dan `41642.0`; keduanya harus tetap dibedakan menurut urutan baris.
5. `BIAYA SOUVENIR / MERCHANDISE / HADIAH ` pada baris akun memiliki spasi trailing; website memakai nama tanpa spasi trailing. Ini tidak mengubah klasifikasi dan sengaja tidak diubah agar data historis tetap utuh.
6. Kode helper Excel untuk `PIUTANG KARYAWAN` adalah `20090.0`, sedangkan helper website adalah `1.1.20`. Lihat temuan JURNAL-02.

## 5. `JURNAL UMUM` — input manual

Kolom: A `TANGGAL`, B `KETERANGAN`, C `NAMA AKUN`, D `AKUN` (kode serial `KODE AKUN!A`), E `NAMA AKUN BANTU`, F `AKUN BANTU`, G `DEBET`, H `KREDIT`.

- **2.795 baris angka**, dikelompokkan menjadi **1.301 transaksi** berdasarkan baris worksheet yang bersambung.
- Tanggal serial mencakup `2025-01-01` sampai `2025-12-31`. Tidak ada formula sama sekali; seluruhnya input manual.
- Total debit = `10.702.157.010,70`; total kredit = `10.702.152.010,70`; selisih mentah = **+5.000**.

### Temuan JURNAL-01 — dua jurnal tidak seimbang (BLOCKED)

| Baris | Keterangan | Debet | Kredit | Selisih |
|---:|---|---:|---:|---:|
| 2923–2925 | Pembayaran Invoice INV/25/0070119 LINTAS ARTA | 170.822.515 | 170.820.015 | +2.500 |
| 3115–3117 | Pembayaran INV NJI00966 – RENT SHAFT PT. Wisma Bumiputera | 2.530.000 | 2.527.500 | +2.500 |

Kedua transaksi memiliki baris `BIAYA ADMINISTRASI` Rp2.500 yang tidak memiliki pasangan kredit. Tidak ada koreksi otomatis.

### Temuan JURNAL-02 — kode akun tidak terpetakan (BLOCKED)

- Baris 3620, tanggal serial `46008.0` → `2025-12-17`.
- Keterangan: `Peminjaman Karyawan An Slamet Sebagai NOC`.
- Nama akun: `PIUTANG KARYAWAN`; kode pada kolom D: `20090.0`; debit `1.000.000`.
- `20090.0` adalah helper lama di `KODE AKUN!C`, bukan kode serial `KODE AKUN!A` (`43831.0`).
- Rumus workbook sendiri memakai `SUMIF('JURNAL UMUM'!D:D, ...)` sehingga baris ini juga **tidak masuk laporan workbook**. Memaksanya masuk akan mengubah angka laporan dan memerlukan keputusan klasifikasi; karena itu ditandai `BLOCKED`.

Setelah baris tersebut dikeluarkan (selaras dengan perlakuan workbook), selisih jurnal terpetakan menjadi **−995.000**. Angka ini bukan untuk ditambal.

## 6. `NERACA JALUR` — worksheet/perhitungan

Rumus representatif (baris 5, pola yang sama jusqu baris 135):

```text
D5 = IF(C5="DEBET",
        SUMIF('KODE AKUN'!A:A,A5,'KODE AKUN'!F:F)
      + SUMIF('JURNAL UMUM'!D:D,A5,'JURNAL UMUM'!G:G)
      - SUMIF('JURNAL UMUM'!D:D,A5,'JURNAL UMUM'!H:H), 0)

E5 = IF(C5="KREDIT",
        SUMIF('KODE AKUN'!A:A,A5,'KODE AKUN'!G:G)
      + SUMIF('JURNAL UMUM'!D:D,A5,'JURNAL UMUM'!H:H)
      + SUMIF('JURNAL UMUM'!E:E,A5,'JURNAL UMUM'!I:I), 0)

G5 = IF(F5="LABA RUGI", D5, 0)   H5 = IF(F5="LABA RUGI", E5, 0)
I5 = IF(F5="NERACA",   D5, 0)   J5 = IF(F5="NERACA",   E5, 0)
```

Artinya:

- Kolom D = saldo **neto debit** untuk akun normal-debet.
- Kolom E = saldo **neto kredit** untuk akun normal-kredit.
- Kolom G/H = alokasi ke laba rugi.
- Kolom I/J = alokasi ke neraca.
- Tidak ada baris akun normal-kredit dengan nilai debit di sumber, sehingga penyederhanaan tanda di website aman untuk dataset ini.

Baris kategori/header worksheet yang harus dilewati saat memetakan akun: **5, 6, 20, 38, 39, 61, 75**. Baris 20 memakai kode `45689.0` yang sama dengan akun `PERALATAN DAN MESIN` di baris 36; baris 39 memakai kode `45659.0` yang sama dengan `MODAL`. Menghitung keduanya akan menggandakan saldo.

Total worksheet (cache):

| Sel | Rumus | Cache |
|---|---|---:|
| `D136` | `=SUM(D3:D135)` | 5.501.951.910 |
| `E136` | `=SUM(E5:E135)` | 5.356.718.648 |
| `G136` | `=SUM(G3:G135)` | 5.194.628.101 |
| `H136` | — | 5.345.391.648 |
| `I136` | — | 307.323.809,30 |
| `J136` | — | 11.327.000 |
| `E137` | `=E136-D136` | −145.233.262 |
| `G137` | `=H136-G136` | 150.763.547,30 |
| `I137` | `=I136-J136` | 295.996.809,30 |
| `H138` | `=G137-I137` | −145.233.262 |

`D136` dan `E136` adalah saldo bersih menurut sisi normal, **bukan** total debit/kredit jurnal. Keduanya tidak boleh dibandingkan dengan `trialBalance.totalDebit/totalKredit` website.

## 7. `LABA RUGI`

- 78 rumus; sebagian besar `C{row} = 'NERACA JALUR'!D/E{row}`.
- `C21 = SUM(C6:C20)` → 5.345.391.648 (pendapatan).
- `C83 = SUM(C22:C82)` → 5.194.628.101 (biaya).
- `C84 = C21-C83` → 150.763.547,30.
- 73 baris akun nyata; sisanya header/subtotal.

**Presisi cache (BLOCKED untuk kesamaan eksak).** `C83` adalah bilangan bulat 5.194.628.101, sedangkan penjumlahan nilai per-akun yang tidak dibulatkan menghasilkan 5.194.628.100,70. Dua baris cache dibulatkan ke rupiah:

| Kode serial | Akun | Cache workbook | Nilai terhitung |
|---|---|---:|---:|
| `43105.0` | BIAYA SEWA JARINGAN | 2.818.517.884 | 2.818.517.883,76 |
| `11328.0` | BIAYA ADMINISTRASI BANK | 1.020.334.045 | 1.020.334.044,94 |

Selisih total 0,30. Pengujian memakai toleransi 0,50 dan mencatat alasannya; tidak ada pembulatan paksa di aplikasi.

## 8. `NERACA`

- `A3 = Tahun 2026`, sedangkan jurnal pada `JURNAL UMUM` bertanggal 2025. Periode tidak disamakan.
- `C{row} = 'NERACA JALUR'!I{row}` untuk sisi aset.
- `F{row} = 'NERACA JALUR'!D{row}+'NERACA JALUR'!E{row}` untuk sisi pasiva.
- `C40 = SUM(C7:C39)` → 155.432.047,30.
- `F40 = SUM(F7:F37)` → 5.663.500.
- Baris `E27` berlabel `LABA / RUGI TAHUN BERJALAN`, tetapi `F27` **kosong**. Jadi laba tahun berjalan tidak dimasukkan dalam `F40`.

Komponen aset yang benar-benar ber nilai:

| Sel | Akun | Cache |
|---|---|---:|
| `C9` | KAS KECIL | 41.793 |
| `C10` | BANK BCA DINETKAN | 3.498.492,30 |
| `C38` | PERALATAN DAN MESIN | 151.891.762 |

### Temuan NERACA-01 — ketidakseimbangan sumber (BLOCKED)

Aset `155.432.047,30` dikurangi liabilitas workbook `5.663.500` dan laba tahun berjalan `150.763.547,30` menyisakan **−995.000**. Website menampilkan komponen tersebut apa adanya dan menandai ketidakseimbangan; tidak ada jurnal penyeimbang.

## 9. `Sheet15` — data pendukung, bukan laporan

- 74 baris transaksi payment gateway dengan kolom `TransactionDate`, `Reference`, `PaymentNumber`, `MerchantOrderId`, `PgTransactionId`, `PaymentGateway`, `Project`, `Amount`, `WalletAmount`, `Fee`, `SettlementDate`, `AdditionalParam`, `Status`, `PublisherOrderId`.
- Tidak ada formula. `Project` berisi identitas `DINETKAN` (data historis, sengaja tidak diubah).
- `K2 = 46190.0` → `2026-06-15`, berbeda dengan periode jurnal 2025. Sheet ini diperlakukan sebagai lampiran rekonsiliasi; tidak dipetakan ke akun atau laporan website.

## 10. Ringkasan item BLOCKED

| ID | Item | Nilai | Perlakuan |
|---|---|---:|---|
| JURNAL-01 | Dua jurnal admin tidak seimbang | +5.000 | Ditampilkan, tidak dikoreksi |
| JURNAL-02 | Kode `20090.0` di baris 3620 | 1.000.000 | Tidak dipetakan, selaras dengan workbook |
| LABA-01 | Pembulatan cache laba rugi | 0,30 | Toleransi 0,50, tanpa pembulatan paksa |
| NERACA-01 | Selisih aset vs liabilitas + laba | −995.000 | Ditampilkan sebagai BLOCKED |
| PERIODE-01 | Judul 2026 vs jurnal 2025 | — | Tidak diubah |
| INV-01 | Master 3 barang inventaris tidak ada di workbook | — | Data lokal dipertahankan |
| DEP-01 | Kebijakan penyusutan tidak ada di workbook | — | Tidak membuat jurnal otomatis |
