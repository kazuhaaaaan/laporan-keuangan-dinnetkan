const SOURCE_SHEET = 'https://docs.google.com/spreadsheets/d/1yMhC0C7REAkRvO8MD9RI-yeqwhC5vBhLm0Tul5CEG_Q/edit?usp=drivesdk';

const ACCOUNTS = [
  { code: '1.1.10', name: 'KAS KECIL', helper: '1.1.10', side: 'debet', report: 'neraca', type: 'aset' },
  { code: '1.1.11', name: 'BANK BCA DINETKAN', helper: '1.1.11', side: 'debet', report: 'neraca', type: 'aset' },
  { code: '1.1.12', name: 'DUITKU', helper: '1.1.12', side: 'debet', report: 'neraca', type: 'aset' },
  { code: '1.1.13', name: 'BANK MANDIRI DINETKAN', helper: '1.1.13', side: 'debet', report: 'neraca', type: 'aset' },
  { code: '1.1.14', name: 'BANK', helper: '1.1.14', side: 'debet', report: 'neraca', type: 'aset' },
  { code: '1.1.15', name: 'INVESTASI', helper: '1.1.45', side: 'debet', report: 'neraca', type: 'aset' },
  { code: '1.1.16', name: 'PIUTANG PENJUALAN', helper: '1.1.47', side: 'debet', report: 'neraca', type: 'aset' },
  { code: '1.1.17', name: 'PIUTANG PENJUALAN NON LANCAR', helper: '1.1.48', side: 'debet', report: 'neraca', type: 'aset' },
  { code: '1.1.18', name: 'PIUTANG USAHA', helper: '1.1.52', side: 'debet', report: 'neraca', type: 'aset' },
  { code: '1.1.19', name: 'PIUTANG PEMEGANG SAHAM', helper: '1.1.54', side: 'debet', report: 'neraca', type: 'aset' },
  { code: '1.1.20', name: 'PIUTANG KARYAWAN', helper: '1.1.55', side: 'debet', report: 'neraca', type: 'aset' },
  { code: '1.1.21', name: 'PIUTANG NON-OPERASIONAL', helper: '1.1.59', side: 'debet', report: 'neraca', type: 'aset' },
  { code: '1.1.22', name: 'PIUTANG ONGKIR LAINNYA', helper: '1.1.60', side: 'debet', report: 'neraca', type: 'aset' },
  { code: '1.2.10', name: 'BIAYA DIBAYAR DIMUKA', helper: '1.2.10', side: 'debet', report: 'neraca', type: 'aset' },
  { code: '1.2.11', name: 'ASURANSI DIBAYAR DIMUKA', helper: '1.2.11', side: 'debet', report: 'neraca', type: 'aset' },
  { code: '1.2.12', name: 'DANA DEPOSIT DI SUPPLIER', helper: '1.2.12', side: 'debet', report: 'neraca', type: 'aset' },
  { code: '1.2.13', name: 'PERSEDIAAN', helper: '1.2.13', side: 'debet', report: 'neraca', type: 'aset' },
  { code: '1.2.14', name: 'PERSEDIAAN BARANG DAGANG', helper: '1.2.14', side: 'debet', report: 'neraca', type: 'aset' },
  { code: '1.2.15', name: 'AKTIVA TETAP', helper: '1.2.15', side: 'debet', report: 'neraca', type: 'aset' },
  { code: '1.2.16', name: 'TANAH', helper: '1.2.16', side: 'debet', report: 'neraca', type: 'aset' },
  { code: '1.2.17', name: 'BANGUNAN', helper: '1.2.17', side: 'debet', report: 'neraca', type: 'aset' },
  { code: '1.2.18', name: 'AK. PENYUSUTAN BANGUNAN', helper: '1.2.18', side: 'kredit', report: 'neraca', type: 'aset' },
  { code: '1.2.19', name: 'KENDARAAN MOBIL', helper: '1.2.19', side: 'debet', report: 'neraca', type: 'aset' },
  { code: '1.2.20', name: 'AK. PENYUSUTAN KENDARAAN RODA 4', helper: '1.2.20', side: 'kredit', report: 'neraca', type: 'aset' },
  { code: '1.2.21', name: 'KENDARAAN MOTOR', helper: '1.2.21', side: 'debet', report: 'neraca', type: 'aset' },
  { code: '1.2.22', name: 'AK. PENYUSUTAN KENDARAAN RODA 2', helper: '1.2.22', side: 'kredit', report: 'neraca', type: 'aset' },
  { code: '1.2.23', name: 'INVENTARIS KANTOR', helper: '1.2.23', side: 'debet', report: 'neraca', type: 'aset' },
  { code: '1.2.24', name: 'AK. PENYUSUTAN INVENTARIS KANTOR', helper: '1.2.24', side: 'kredit', report: 'neraca', type: 'aset' },
  { code: '1.2.25', name: 'PERALATAN DAN MESIN', helper: '1.2.25', side: 'debet', report: 'neraca', type: 'aset' },
  { code: '1.2.26', name: 'AK. PENYUSUTAN PERALATAN DAN MESIN', helper: '1.2.26', side: 'kredit', report: 'neraca', type: 'aset' },
  { code: '2.1.10', name: 'HUTANG BANK', helper: '2.1.10', side: 'kredit', report: 'neraca', type: 'liabilitas' },
  { code: '2.1.11', name: 'HUTANG PEMBELIAN BARANG DAGANG', helper: '2.1.11', side: 'kredit', report: 'neraca', type: 'liabilitas' },
  { code: '2.1.12', name: 'PENDAPATAN DITERIMA DIMUKA', helper: '2.1.12', side: 'kredit', report: 'neraca', type: 'liabilitas' },
  { code: '2.1.13', name: 'DEPOSIT PELANGGAN', helper: '2.1.13', side: 'kredit', report: 'neraca', type: 'liabilitas' },
  { code: '2.1.14', name: 'TITIPAN - TITIPAN', helper: '2.1.14', side: 'kredit', report: 'neraca', type: 'liabilitas' },
  { code: '2.1.15', name: 'TITIPAN BIAYA - THR', helper: '2.1.15', side: 'kredit', report: 'neraca', type: 'liabilitas' },
  { code: '2.1.16', name: 'TITIPAN BIAYA - MAKAN', helper: '2.1.16', side: 'kredit', report: 'neraca', type: 'liabilitas' },
  { code: '2.1.17', name: 'TITIPAN BIAYA - ASURANSI KETENAGAKERJAAN', helper: '2.1.17', side: 'kredit', report: 'neraca', type: 'liabilitas' },
  { code: '2.1.18', name: 'TITIPAN BIAYA - ASURANSI KESEHATAN', helper: '2.1.18', side: 'kredit', report: 'neraca', type: 'liabilitas' },
  { code: '2.1.19', name: 'TITIPAN BIAYA - HIBURAN & REKREASI', helper: '2.1.19', side: 'kredit', report: 'neraca', type: 'liabilitas' },
  { code: '2.1.20', name: 'TITIPAN BIAYA - PPN , BHP & USO', helper: '2.1.20', side: 'kredit', report: 'neraca', type: 'liabilitas' },
  { code: '2.1.21', name: 'TITIPAN BIAYA - BIAYA', helper: '2.1.21', side: 'kredit', report: 'neraca', type: 'liabilitas' },
  { code: '2.1.22', name: 'TITIPAN LAINNYA', helper: '2.1.22', side: 'kredit', report: 'neraca', type: 'liabilitas' },
  { code: '2.1.23', name: 'TITIPAN ONGKIR', helper: '2.1.23', side: 'kredit', report: 'neraca', type: 'liabilitas' },
  { code: '2.1.24', name: 'TITIPAN PIHAK KETIGA', helper: '2.1.24', side: 'kredit', report: 'neraca', type: 'liabilitas' },
  { code: '2.1.25', name: 'MODAL', helper: '2.1.25', side: 'kredit', report: 'neraca', type: 'ekuitas' },
  { code: '2.1.26', name: 'MODAL DASAR', helper: '2.1.26', side: 'kredit', report: 'neraca', type: 'ekuitas' },
  { code: '2.1.27', name: 'LABA DI TAHAN', helper: '2.1.27', side: 'kredit', report: 'neraca', type: 'ekuitas' },
  { code: '2.1.28', name: 'LABA / RUGI TAHUN BERJALAN', helper: '2.1.28', side: 'kredit', report: 'neraca', type: 'ekuitas' },
  { code: '2.1.29', name: 'LABA TAHUN LALU', helper: '2.1.29', side: 'kredit', report: 'neraca', type: 'ekuitas' },
  { code: '2.1.30', name: 'PRIVE', helper: '2.1.30', side: 'debet', report: 'neraca', type: 'ekuitas' },
  { code: '3.1.10', name: 'PENDAPATAN DAGANG', helper: '3.1.10', side: 'kredit', report: 'laba-rugi', type: 'pendapatan' },
  { code: '3.1.11', name: 'PENDAPATAN PENJUALAN JASA', helper: '3.1.11', side: 'kredit', report: 'laba-rugi', type: 'pendapatan' },
  { code: '3.1.12', name: 'POTONGAN JUAL', helper: '3.1.12', side: 'debet', report: 'laba-rugi', type: 'pendapatan' },
  { code: '3.1.13', name: 'HARGA POKOK PENJUALAN', helper: '3.1.13', side: 'debet', report: 'laba-rugi', type: 'pendapatan' },
  { code: '3.1.14', name: 'HARGA POKOK PENJUALAN', helper: '3.1.14', side: 'debet', report: 'laba-rugi', type: 'pendapatan' },
  { code: '3.1.15', name: 'POTONGAN PEMBELIAN', helper: '3.1.15', side: 'kredit', report: 'laba-rugi', type: 'pendapatan' },
  { code: '3.1.16', name: 'KERUGIAN PIUTANG', helper: '3.1.16', side: 'debet', report: 'laba-rugi', type: 'pendapatan' },
  { code: '3.1.17', name: 'ITEM MASUK', helper: '3.1.17', side: 'kredit', report: 'laba-rugi', type: 'pendapatan' },
  { code: '3.1.18', name: 'ITEM KELUAR', helper: '3.1.18', side: 'debet', report: 'laba-rugi', type: 'pendapatan' },
  { code: '3.1.19', name: 'PENDAPATAN LAIN', helper: '3.1.19', side: 'kredit', report: 'laba-rugi', type: 'pendapatan' },
  { code: '3.1.20', name: 'PENDAPATAN BUNGA', helper: '3.1.20', side: 'kredit', report: 'laba-rugi', type: 'pendapatan' },
  { code: '3.1.21', name: 'PENDAPATAN PEMBULATAN NILAI UANG', helper: '3.1.21', side: 'kredit', report: 'laba-rugi', type: 'pendapatan' },
  { code: '3.1.22', name: 'PENDAPATAN LAIN-LAIN', helper: '3.1.22', side: 'kredit', report: 'laba-rugi', type: 'pendapatan' },
  { code: '5.1.10', name: 'BIAYA INSTALASI PELANGGAN / BEBAN SUBKONTRAKTOR', helper: '5.1.10', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.11', name: 'BIAYA GAJI PEGAWAI', helper: '5.1.11', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.12', name: 'BIAYA BROADBAND', helper: '5.1.12', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.13', name: 'BIAYA TUNJANGAN PENDIDIKAN', helper: '5.1.13', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.14', name: 'BIAYA TUNJANGAN & MANFAAT LAINNYA', helper: '5.1.14', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.15', name: 'BIAYA UPAH KERJA KARYAWAN / KONSULTAN /', helper: '5.1.15', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.16', name: 'BIAYA INSENTIF KARYAWAN', helper: '5.1.16', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.17', name: 'BIAYA LEMBUR', helper: '5.1.17', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.18', name: 'BIAYA SEWA JARINGAN', helper: '5.1.18', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.19', name: 'BIAYA TUNJANGAN HARI RAYA (THR)', helper: '5.1.19', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.20', name: 'BIAYA TUNJANGAN KESEHATAN KARYAWAN', helper: '5.1.20', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.21', name: 'BIAYA TUNJANGAN ASURANSI KETENAGAKERJAAN', helper: '5.1.21', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.22', name: 'BIAYA TUNJANGAN MAKAN PEGAWAI', helper: '5.1.22', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.23', name: 'BIAYA UMUM', helper: '5.1.23', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.24', name: 'BIAYA LISTRIK', helper: '5.1.24', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.25', name: 'BIAYA SISTEM DAN TEKNOLOGI INFORMASI', helper: '5.1.25', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.26', name: 'BIAYA INVENTARIS KANTOR', helper: '5.1.26', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.27', name: 'BIAYA PEMASANGAN / PEMELIHARAN / PERBAIKAN INVENTARIS', helper: '5.1.27', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.28', name: 'BIAYA PENYUSUTAN INVENTARIS', helper: '5.1.28', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.29', name: 'BIAYA PERLENGKAPAN KANTOR', helper: '5.1.29', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.30', name: 'BIAYA ALAT TULIS KANTOR', helper: '5.1.30', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.31', name: 'BIAYA MANAGED SERVICE', helper: '5.1.31', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.32', name: 'BIAYA HIBURAN & REKREASI', helper: '5.1.32', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.33', name: 'BIAYA TRANSPORTASI (BENSIN, TOL & PARKIR)', helper: '5.1.33', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.34', name: 'BIAYA JAMUAN MAKAN', helper: '5.1.34', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.35', name: 'BIAYA ASURANSI', helper: '5.1.35', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.36', name: 'BIAYA SEWA DATA CENTER', helper: '5.1.36', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.37', name: 'BIAYA KEPERLUAN KANTOR', helper: '5.1.37', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.38', name: 'BIAYA TELEPON / KOMUNIKASI', helper: '5.1.38', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.39', name: 'BIAYA RUMAH TANGGA KANTOR', helper: '5.1.39', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.40', name: 'BIAYA IURAN', helper: '5.1.40', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.41', name: 'BIAYA KEAMANAN', helper: '5.1.41', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.42', name: 'BIAYA KEBERSIHAN', helper: '5.1.42', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.43', name: 'BIAYA OPERASIONAL', helper: '5.1.43', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.44', name: 'BIAYA SEWA TEMPAT', helper: '5.1.44', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.45', name: 'BIAYA UANG SAKU PERJALANAN DINAS', helper: '5.1.45', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.46', name: 'BIAYA INFRASTRUKTUR JARINGAN LANGSUNG', helper: '5.1.46', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.47', name: 'BIAYA ONGKIR', helper: '5.1.47', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.48', name: 'BIAYA PEMASARAN', helper: '5.1.48', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.49', name: 'BIAYA BONUS & KOMISI PENJUALAN MARKETING', helper: '5.1.49', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.50', name: 'BIAYA PERJALANAN DINAS', helper: '5.1.50', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.51', name: 'BIAYA IKLAN / PROMOSI / ENDORSE / SPONSO', helper: '5.1.51', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.52', name: 'BIAYA ENTERTAIN', helper: '5.1.52', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.53', name: 'BIAYA SOUVENIR / MERCHANDISE / HADIAH', helper: '5.1.53', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.54', name: 'BIAYA ONGKIR SOUVENIR / MERCHANDISE / HADIAH', helper: '5.1.54', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.55', name: 'BIAYA NON-OPERASIONAL', helper: '5.1.55', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.56', name: 'BIAYA ADMINISTRASI BANK', helper: '5.1.56', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.57', name: 'BIAYA BUNGA PINJAMAN BANK', helper: '5.1.57', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.58', name: 'BIAYA LEGAL / NOTARIS / PENGACARA / JASA', helper: '5.1.58', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.59', name: 'BIAYA DENDA / SANKSI', helper: '5.1.59', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.60', name: 'BIAYA PENYEWAAN RUANG SHAFT', helper: '5.1.60', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.61', name: 'BIAYA PAJAK PPH PASAL 21', helper: '5.1.61', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.62', name: 'BIAYA PAJAK HUTANG PPN', helper: '5.1.62', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.63', name: 'BIAYA PAJAK PPH PASAL 23', helper: '5.1.63', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.64', name: 'BIAYA PAJAK PPH FINAL (PASAL 4 AYAT 2)', helper: '5.1.64', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.65', name: 'BIAYA MATERAI', helper: '5.1.65', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.66', name: 'BIAYA LAINNYA', helper: '5.1.66', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.67', name: 'KERUGIAN PEMBULATAN NILAI UANG', helper: '5.1.67', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.68', name: 'KOREKSI LABA RUGI KREDIT', helper: '5.1.68', side: 'kredit', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.69', name: 'KOREKSI LABA RUGI DEBET', helper: '5.1.69', side: 'debet', report: 'laba-rugi', type: 'biaya' },
];

const INVENTORY_ITEMS = [
  { code: 'BRG-001', name: 'Router MikroTik RB750Gr3', category: 'Jaringan', unit: 'unit', location: 'Gudang A', price: 1250000, minStock: 2 },
  { code: 'BRG-002', name: 'Kabel FO Single Core', category: 'Jaringan', unit: 'roll', location: 'Gudang A', price: 500000, minStock: 3 },
  { code: 'BRG-003', name: 'Splitter ODP 1:8', category: 'Jaringan', unit: 'pcs', location: 'Gudang B', price: 85000, minStock: 5 },
];

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function buildTrialBalance(accounts, entries) {
  const rows = accounts.map((account) => ({ ...account, debit: 0, kredit: 0 }));
  const byCode = new Map(rows.map((row) => [row.code, row]));

  entries.forEach((entry) => {
    entry.lines.forEach((line) => {
      const row = byCode.get(line.code) || rows.find((account) => account.helper === line.code);
      if (!row) throw new Error(`Akun ${line.code} tidak ada dalam KODE AKUN`);
      row.debit += line.debit || 0;
      row.kredit += line.kredit || 0;
    });
  });

  rows.forEach((row) => {
    row.saldo = row.side === 'debet' ? row.debit - row.kredit : row.kredit - row.debit;
  });

  const totalDebit = rows.reduce((sum, row) => sum + row.debit, 0);
  const totalKredit = rows.reduce((sum, row) => sum + row.kredit, 0);
  if (Math.abs(totalDebit - totalKredit) > 0.01) throw new Error('Jurnal umum tidak seimbang');

  return {
    rows,
    totalDebit,
    totalKredit,
    totalSaldoDebet: rows.reduce(
      (sum, row) => sum + (row.side === 'debet' ? Math.max(0, row.saldo) : Math.max(0, -row.saldo)),
      0,
    ),
    totalSaldoKredit: rows.reduce(
      (sum, row) => sum + (row.side === 'kredit' ? Math.max(0, row.saldo) : Math.max(0, -row.saldo)),
      0,
    ),
  };
}

function buildJournalRows(accounts, entries) {
  const names = new Map(accounts.flatMap((account) => [[account.code, account.name], [account.helper, account.name]]));
  return entries.flatMap((entry) =>
    entry.lines.map((line) => [
      entry.date,
      entry.description,
      line.code,
      names.get(line.code),
      line.debit || 0,
      line.kredit || 0,
    ]),
  );
}

function buildInventory(entries, itemDefinitions) {
  const items = itemDefinitions.map((item, index) => ({
    ...item,
    id: `item-dummy-${String(index + 1).padStart(3, '0')}`,
    initialStock: 0,
  }));
  const byCode = new Map(items.map((item) => [item.code, item]));
  const transactions = [];
  let sequence = 0;

  entries.forEach((entry) => {
    entry.lines.forEach((line) => {
      if (!line.mutation) return;
      const item = byCode.get(line.mutation.item);
      if (!item) throw new Error(`Barang ${line.mutation.item} tidak ditemukan`);
      const recordedAmount = line.debit || line.kredit || 0;
      const mutationAmount = line.mutation.quantity * item.price;
      if (Math.abs(recordedAmount - mutationAmount) > 0.01) {
        throw new Error(`Nilai mutasi ${item.code} tidak cocok dengan jurnal`);
      }
      sequence += 1;
      transactions.push({
        id: `mut-dummy-${String(sequence).padStart(3, '0')}`,
        createdAt: Date.parse(`${entry.date}T00:00:00Z`) + sequence,
        date: entry.date,
        itemId: item.id,
        type: line.mutation.type,
        quantity: line.mutation.quantity,
        note: entry.description,
        reference: entry.ref || line.code,
      });
    });
  });

  const stockValue = transactions.reduce((total, transaction) => {
    const item = items.find((candidate) => candidate.id === transaction.itemId);
    const sign = transaction.type === 'in' ? 1 : -1;
    return total + sign * transaction.quantity * item.price;
  }, 0);

  return { items, transactions, stockValue };
}

function buildMonthly(accounts, entries) {
  const types = new Map(accounts.map((account) => [account.code, account.type]));
  const activeMonths = new Set(entries.map((entry) => entry.date.slice(5, 7)));
  const monthly = [];

  MONTH_NAMES.forEach((month, index) => {
    const monthNumber = String(index + 1).padStart(2, '0');
    if (!activeMonths.has(monthNumber)) return;
    let revenue = 0;
    let expense = 0;
    entries
      .filter((entry) => entry.date.slice(5, 7) === monthNumber)
      .forEach((entry) => {
        entry.lines.forEach((line) => {
          const type = types.get(line.code);
          if (type === 'pendapatan') revenue += (line.kredit || 0) - (line.debit || 0);
          if (type === 'biaya') expense += (line.debit || 0) - (line.kredit || 0);
        });
      });
    monthly.push({ month, number: monthNumber, revenue, expense });
  });

  return monthly;
}

function buildReportData(entries) {
  const trialBalance = buildTrialBalance(ACCOUNTS, entries);
  const inventory = buildInventory(entries, INVENTORY_ITEMS);
  const signed = (row) => {
    const normalSide = ['pendapatan', 'liabilitas', 'ekuitas'].includes(row.type) ? 'kredit' : 'debet';
    return row.side === normalSide ? row.saldo : -row.saldo;
  };
  const totalOf = (type) =>
    trialBalance.rows.filter((row) => row.type === type).reduce((sum, row) => sum + signed(row), 0);
  const pendapatan = totalOf('pendapatan');
  const biaya = totalOf('biaya');
  const laba = pendapatan - biaya;
  const kas = trialBalance.rows
    .filter((row) => row.report === 'neraca' && row.code.startsWith('1.'))
    .reduce((sum, row) => sum + signed(row), 0);
  const group = (type) =>
    trialBalance.rows
      .filter((row) => row.type === type && signed(row) !== 0)
      .map((row) => ({ code: row.code, name: row.name, amount: signed(row) }));

  const stockAccount = trialBalance.rows.find((row) => row.code === '1.2.13');
  if (Math.abs(stockAccount.saldo - inventory.stockValue) > 0.01) {
    throw new Error('Nilai persediaan tidak cocok dengan kartu stok');
  }

  const assets = group('aset').sort((a, b) => a.code.localeCompare(b.code));
  const liabilities = group('liabilitas')
    .concat(group('ekuitas').filter((row) => row.code !== '2.1.28'))
    .concat([{ code: '2.1.28', name: 'LABA / RUGI TAHUN BERJALAN', amount: laba, computed: true }])
    .sort((a, b) => a.code.localeCompare(b.code));

  return {
    meta: {
      title: 'Laporan Keuangan Dinnetkan',
      period: entries.length ? entries[entries.length - 1].date.slice(0, 4) : '2025',
      source: SOURCE_SHEET,
      generatedAt: new Date().toISOString().slice(0, 10),
      isDummy: false,
      note: 'Kode akun, neraca, dan laba rugi mengikuti logika spreadsheet; isi jurnal manual.',
    },
    summary: { pendapatan, biaya, laba, kas },
    monthly: buildMonthly(ACCOUNTS, entries),
    revenueAccounts: group('pendapatan'),
    expenseAccounts: group('biaya').sort((a, b) => b.amount - a.amount),
    assets,
    liabilities,
    journal: buildJournalRows(ACCOUNTS, entries),
    trialBalance: {
      rows: trialBalance.rows.map((row) => ({
        code: row.code,
        name: row.name,
        side: row.side,
        debit: row.debit,
        kredit: row.kredit,
        saldo: row.saldo,
        saldoDebet: row.side === 'debet' ? Math.max(0, row.saldo) : Math.max(0, -row.saldo),
        saldoKredit: row.side === 'kredit' ? Math.max(0, row.saldo) : Math.max(0, -row.saldo),
      })),
      totalDebit: trialBalance.totalDebit,
      totalKredit: trialBalance.totalKredit,
      totalSaldoDebet: trialBalance.totalSaldoDebet,
      totalSaldoKredit: trialBalance.totalSaldoKredit,
    },
    incomeStatement: {
      pendapatan,
      biaya,
      laba,
      revenueRows: group('pendapatan'),
      expenseRows: group('biaya'),
    },
    inventory,
  };
}

const FINANCE_STORAGE_KEY = 'dinnetkan-finance-journal-v2';

function loadJournalEntries() {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(FINANCE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry) => entry && typeof entry.date === 'string' && Array.isArray(entry.lines));
  } catch (error) {
    return [];
  }
}

function saveJournalEntries(entries) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(FINANCE_STORAGE_KEY, JSON.stringify(entries));
  } catch (error) {
    return;
  }
}

function replaceJournalEntries(entries) {
  const report = buildReportData(entries);
  saveJournalEntries(entries);
  REPORT_DATA = report;
  return report;
}

function addJournalEntry(entry) {
  if (!entry || typeof entry.date !== 'string' || !Array.isArray(entry.lines)) {
    throw new Error('Format transaksi tidak valid.');
  }
  const entries = loadJournalEntries();
  entries.push(entry);
  entries.sort((a, b) => a.date.localeCompare(b.date));
  return replaceJournalEntries(entries);
}

function clearJournalEntries() {
  return replaceJournalEntries([]);
}

function refreshReportData() {
  REPORT_DATA = buildReportData(loadJournalEntries());
  return REPORT_DATA;
}

let REPORT_DATA;
REPORT_DATA = refreshReportData();
