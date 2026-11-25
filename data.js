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

// Kode mentah pada sheet KODE AKUN (kolom A), urutan identik dengan ACCOUNTS.
// Disimpan sebagai metadata referensi; kode lama di localStorage tetap diterima.
const SOURCE_ACCOUNT_CODES = [
  '40179.0', '40544.0', '40909.0', '41275.0', '41640.0', '42005.0', '42370.0', '42736.0',
  '43101.0', '43466.0', '43831.0', '44197.0', '44562.0', '40210.0', '40575.0', '40940.0',
  '41306.0', '41671.0', '42036.0', '42401.0', '42767.0', '43132.0', '43497.0', '43862.0',
  '44228.0', '44593.0', '44958.0', '45323.0', '45689.0', '46054.0', '40180.0', '40545.0',
  '40910.0', '41276.0', '41641.0', '42006.0', '42371.0', '42737.0', '43102.0', '43467.0',
  '43832.0', '44198.0', '44563.0', '44928.0', '45293.0', '45659.0', '46024.0', '46389.0',
  '46754.0', '47120.0', '10960.0', '40181.0', '40546.0', '40911.0', '41277.0', '41642.0',
  '42007.0', '42372.0', '42738.0', '43103.0', '43468.0', '43833.0', '44199.0', '44564.0',
  '40183.0', '40548.0', '40913.0', '41279.0', '41644.0', '42009.0', '42374.0', '42740.0',
  '43105.0', '43470.0', '43835.0', '44201.0', '44566.0', '44931.0', '45296.0', '45662.0',
  '46027.0', '46392.0', '46757.0', '47123.0', '10963.0', '11328.0', '11693.0', '12059.0',
  '12424.0', '12789.0', '13154.0', '13520.0', '13885.0', '14250.0', '14615.0', '14981.0',
  '15346.0', '15711.0', '16076.0', '16442.0', '16807.0', '17172.0', '17537.0', '17903.0',
  '18268.0', '18633.0', '18998.0', '19364.0', '19729.0', '20094.0', '20459.0', '20825.0',
  '21190.0', '21555.0', '21920.0', '22286.0', '22651.0', '23016.0', '23381.0', '23747.0',
  '24112.0', '24477.0', '24842.0', '25208.0',
];

// Kas setara kas mengikuti nama akun yang memang tersedia di KODE AKUN.
// HOME!B5 workbook menggunakan NERACA!C40 (total aset), bukan kas; lihat AUDIT_EXCEL.md.
const CASH_EQUIVALENT_NAMES = new Set([
  'KAS KECIL',
  'BANK BCA DINETKAN',
  'DUITKU',
  'BANK MANDIRI DINETKAN',
  'BANK',
]);

const FINANCE_STORAGE_KEY = 'dinetkan-finance-v1';
const LEGACY_FINANCE_KEYS = ['dinetkan-finance-journal-v2', 'dinetkan-finance-journal-v1'];
const FINANCE_SCHEMA_VERSION = 1;

ACCOUNTS.forEach((account, index) => {
  account.sourceCode = SOURCE_ACCOUNT_CODES[index];
});

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function normalizeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function excelSerialToISO(value) {
  const serial = Number(value);
  if (!Number.isFinite(serial)) return '';
  const date = new Date(Date.UTC(1899, 11, 30) + Math.round(serial) * 86400000);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

function buildAccountIndex(accounts) {
  const index = new Map();
  accounts.forEach((account) => {
    [account.code, account.sourceCode, account.helper].filter(Boolean).forEach((key) => {
      if (!index.has(key)) index.set(key, account);
    });
  });
  return index;
}

function resolveOpeningBalance(openingBalances, account) {
  const keys = [account.code, account.sourceCode, account.helper].filter(Boolean);
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(openingBalances, key)) {
      const value = openingBalances[key] || {};
      return {
        debit: normalizeNumber(value.debit ?? value.saldoAwalDebet),
        kredit: normalizeNumber(value.kredit ?? value.saldoAwalKredit),
      };
    }
  }
  return { debit: 0, kredit: 0 };
}

function buildTrialBalance(accounts, entries, options = {}) {
  const openingBalances = options.openingBalances || {};
  const rows = accounts.map((account) => {
    const opening = resolveOpeningBalance(openingBalances, account);
    return {
      ...account,
      openingDebit: opening.debit,
      openingKredit: opening.kredit,
      debit: opening.debit,
      kredit: opening.kredit,
    };
  });
  const index = new Map();
  rows.forEach((row) => {
    [row.code, row.sourceCode, row.helper].filter(Boolean).forEach((key) => {
      if (!index.has(key)) index.set(key, row);
    });
  });
  const unmappedLines = [];

  entries.forEach((entry) => {
    (entry.lines || []).forEach((line) => {
      const row = index.get(line.code);
      if (!row) {
        unmappedLines.push({
          entry: entry.ref || entry.id || '',
          date: entry.date || '',
          code: line.code || '',
          debit: normalizeNumber(line.debit),
          kredit: normalizeNumber(line.kredit ?? line.credit),
        });
        return;
      }
      row.debit += normalizeNumber(line.debit);
      row.kredit += normalizeNumber(line.kredit ?? line.credit);
    });
  });

  rows.forEach((row) => {
    row.saldo = roundMoney(
      row.side === 'debet' ? row.debit - row.kredit : row.kredit - row.debit,
    );
    row.saldoDebet = row.side === 'debet' ? Math.max(0, row.saldo) : Math.max(0, -row.saldo);
    row.saldoKredit = row.side === 'kredit' ? Math.max(0, row.saldo) : Math.max(0, -row.saldo);
  });

  const totalDebit = roundMoney(rows.reduce((sum, row) => sum + row.debit, 0));
  const totalKredit = roundMoney(rows.reduce((sum, row) => sum + row.kredit, 0));

  return {
    rows,
    totalDebit,
    totalKredit,
    imbalance: roundMoney(totalDebit - totalKredit),
    unmappedLines,
    totalSaldoDebet: roundMoney(rows.reduce((sum, row) => sum + row.saldoDebet, 0)),
    totalSaldoKredit: roundMoney(rows.reduce((sum, row) => sum + row.saldoKredit, 0)),
  };
}

function buildJournalRows(accounts, entries) {
  const index = buildAccountIndex(accounts);
  return entries.flatMap((entry) =>
    (entry.lines || [])
      .map((line) => {
        const account = index.get(line.code);
        if (!account) return null;
        return [
          entry.date,
          entry.description,
          account.code,
          account.name,
          normalizeNumber(line.debit),
          normalizeNumber(line.kredit ?? line.credit),
          entry.ref || entry.id || '',
          account.sourceCode || '',
        ];
      })
      .filter(Boolean),
  );
}

function buildInventory(entries, itemDefinitions) {
  const items = itemDefinitions.map((item, index) => ({
    ...item,
    id: `item-dummy-${String(index + 1).padStart(3, '0')}`,
    source: 'journal-derived',
  }));
  const byCode = new Map(items.map((item) => [item.code, item]));
  const transactions = [];
  const diagnostics = { unmappedItems: [], mutationMismatches: [], depreciationLines: 0 };
  const depreciationNames = new Set([
    'AK. PENYUSUTAN BANGUNAN',
    'AK. PENYUSUTAN KENDARAAN RODA 4',
    'AK. PENYUSUTAN KENDARAAN RODA 2',
    'AK. PENYUSUTAN INVENTARIS KANTOR',
    'AK. PENYUSUTAN PERALATAN DAN MESIN',
    'BIAYA PENYUSUTAN INVENTARIS',
  ]);
  let sequence = 0;

  entries.forEach((entry) => {
    (entry.lines || []).forEach((line) => {
      if (depreciationNames.has(line.accountName || '')) diagnostics.depreciationLines += 1;
      if (!line.mutation) return;
      const item = byCode.get(line.mutation.item);
      if (!item) {
        diagnostics.unmappedItems.push({
          entry: entry.ref || entry.id || '',
          item: line.mutation.item || '',
        });
        return;
      }
      const recordedAmount = normalizeNumber(line.debit) || normalizeNumber(line.kredit ?? line.credit);
      const quantity = normalizeNumber(line.mutation.quantity);
      const mutationAmount = roundMoney(quantity * item.price);
      if (Math.abs(recordedAmount - mutationAmount) > 0.01) {
        diagnostics.mutationMismatches.push({
          entry: entry.ref || entry.id || '',
          item: item.code,
          recorded: recordedAmount,
          expected: mutationAmount,
        });
      }
      sequence += 1;
      transactions.push({
        id: `mut-dummy-${String(sequence).padStart(3, '0')}`,
        createdAt: Date.parse(`${entry.date}T00:00:00Z`) + sequence,
        date: entry.date,
        itemId: item.id,
        type: line.mutation.type === 'out' ? 'out' : 'in',
        quantity,
        note: entry.description,
        reference: entry.ref || line.code,
        source: 'journal-derived',
      });
    });
  });

  const valueOf = (transaction) => {
    const item = items.find((candidate) => candidate.id === transaction.itemId);
    return (transaction.type === 'in' ? 1 : -1) * transaction.quantity * (item?.price || 0);
  };
  const stockValue = roundMoney(transactions.reduce((total, transaction) => total + valueOf(transaction), 0));
  const initialStockValue = roundMoney(
    items.reduce((total, item) => total + normalizeNumber(item.initialStock) * normalizeNumber(item.price), 0),
  );

  return { items, transactions, stockValue, initialStockValue, diagnostics };
}

function buildMonthly(accounts, entries) {
  const index = buildAccountIndex(accounts);
  const groups = new Map();

  entries.forEach((entry) => {
    const date = String(entry.date || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    const key = date.slice(0, 7);
    const year = date.slice(0, 4);
    const number = date.slice(5, 7);
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        year,
        number,
        month: MONTH_NAMES[Number(number) - 1] || number,
        label: `${MONTH_NAMES[Number(number) - 1] || number} ${year}`,
        revenue: 0,
        expense: 0,
      });
    }
    const group = groups.get(key);
    (entry.lines || []).forEach((line) => {
      const account = index.get(line.code);
      if (!account) return;
      const debit = normalizeNumber(line.debit);
      const kredit = normalizeNumber(line.kredit ?? line.credit);
      if (account.type === 'pendapatan') group.revenue += kredit - debit;
      if (account.type === 'biaya') group.expense += debit - kredit;
    });
  });

  const monthly = [...groups.values()].sort((a, b) => a.key.localeCompare(b.key));
  monthly.forEach((item) => {
    item.revenue = roundMoney(item.revenue);
    item.expense = roundMoney(item.expense);
  });
  return monthly;
}

function validateEntry(entry, index = 0) {
  const errors = [];
  const label = entry?.ref || entry?.id || `baris ${index + 1}`;
  if (!entry || typeof entry !== 'object') return [`${label}: format transaksi tidak valid.`];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(entry.date || ''))) {
    errors.push(`${label}: tanggal harus berformat YYYY-MM-DD.`);
  }
  if (!String(entry.description || '').trim()) errors.push(`${label}: keterangan wajib diisi.`);
  if (!Array.isArray(entry.lines) || entry.lines.length === 0) {
    errors.push(`${label}: transaksi harus memiliki minimal satu baris akun.`);
    return errors;
  }
  entry.lines.forEach((line, lineIndex) => {
    if (!String(line.code || '').trim()) {
      errors.push(`${label} baris ${lineIndex + 1}: akun wajib dipilih.`);
    }
    const debit = normalizeNumber(line.debit);
    const kredit = normalizeNumber(line.kredit ?? line.credit);
    if (debit < 0 || kredit < 0) {
      errors.push(`${label} baris ${lineIndex + 1}: nominal tidak boleh negatif.`);
    }
    if (debit > 0 && kredit > 0) {
      errors.push(`${label} baris ${lineIndex + 1}: debit dan kredit tidak boleh bersamaan.`);
    }
  });
  const debit = roundMoney(entry.lines.reduce((sum, line) => sum + normalizeNumber(line.debit), 0));
  const kredit = roundMoney(
    entry.lines.reduce((sum, line) => sum + normalizeNumber(line.kredit ?? line.credit), 0),
  );
  if (Math.abs(debit - kredit) > 0.01) {
    errors.push(`${label}: jurnal tidak seimbang (selisih ${moneyDelta(debit - kredit)}).`);
  }
  return errors;
}

function moneyDelta(value) {
  return new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

function normalizeEntry(raw, index = 0) {
  if (!raw || typeof raw !== 'object') return null;
  const fallbackRef = `JRN-${String(index + 1).padStart(5, '0')}`;
  const lines = (Array.isArray(raw.lines) ? raw.lines : []).map((line) => {
    if (!line || typeof line !== 'object') return null;
    const code = String(line.code ?? line.account ?? '').trim();
    const debit = normalizeNumber(line.debit ?? (line.side === 'debet' ? line.amount : 0));
    const kredit = normalizeNumber(line.kredit ?? line.credit ?? (line.side === 'kredit' ? line.amount : 0));
    const result = { code, debit, kredit };
    if (line.accountName) result.accountName = String(line.accountName);
    if (line.mutation && typeof line.mutation === 'object') {
      result.mutation = {
        item: String(line.mutation.item ?? ''),
        type: line.mutation.type === 'out' ? 'out' : 'in',
        quantity: normalizeNumber(line.mutation.quantity),
      };
    }
    return result;
  }).filter(Boolean);

  return {
    id: String(raw.id || raw.ref || fallbackRef),
    ref: String(raw.ref || raw.id || fallbackRef),
    date: /^\d{4}-\d{2}-\d{2}$/.test(String(raw.date || '')) ? String(raw.date) : excelSerialToISO(raw.date),
    description: String(raw.description || '').trim(),
    lines,
  };
}

function normalizeOpeningBalances(input) {
  const result = {};
  Object.entries(input || {}).forEach(([key, value]) => {
    if (!key) return;
    if (typeof value === 'number' || typeof value === 'string') {
      result[key] = { debit: normalizeNumber(value), kredit: 0 };
    } else if (value && typeof value === 'object') {
      result[key] = {
        debit: normalizeNumber(value.debit ?? value.saldoAwalDebet),
        kredit: normalizeNumber(value.kredit ?? value.saldoAwalKredit),
      };
    }
  });
  return result;
}

function normalizeFinanceState(raw) {
  if (Array.isArray(raw)) {
    return {
      version: FINANCE_SCHEMA_VERSION,
      entries: raw.map(normalizeEntry).filter(Boolean),
      openingBalances: {},
      settings: {},
    };
  }
  return {
    version: normalizeNumber(raw?.version) || FINANCE_SCHEMA_VERSION,
    entries: (Array.isArray(raw?.entries) ? raw.entries : []).map(normalizeEntry).filter(Boolean),
    openingBalances: normalizeOpeningBalances(raw?.openingBalances),
    settings: raw?.settings && typeof raw.settings === 'object' ? raw.settings : {},
  };
}

function emptyFinanceState() {
  return { version: FINANCE_SCHEMA_VERSION, entries: [], openingBalances: {}, settings: {} };
}

function loadFinanceState() {
  if (typeof localStorage === 'undefined') return emptyFinanceState();
  try {
    const raw = localStorage.getItem(FINANCE_STORAGE_KEY);
    if (raw) return normalizeFinanceState(JSON.parse(raw));
    for (const legacyKey of LEGACY_FINANCE_KEYS) {
      const legacy = localStorage.getItem(legacyKey);
      if (!legacy) continue;
      const state = normalizeFinanceState(JSON.parse(legacy));
      state.settings = { ...state.settings, migratedFrom: legacyKey };
      saveFinanceState(state);
      return state;
    }
  } catch (error) {
    return emptyFinanceState();
  }
  return emptyFinanceState();
}

function saveFinanceState(state) {
  if (typeof localStorage === 'undefined') return false;
  try {
    localStorage.setItem(FINANCE_STORAGE_KEY, JSON.stringify(normalizeFinanceState(state)));
    return true;
  } catch (error) {
    return false;
  }
}

function derivePeriod(entries) {
  const dates = entries.map((entry) => String(entry.date || '')).filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)).sort();
  if (!dates.length) return 'TANPA DATA';
  const first = dates[0].slice(0, 4);
  const last = dates[dates.length - 1].slice(0, 4);
  return first === last ? first : `${first}–${last}`;
}

function buildReportData(entries, options = {}) {
  const state = options.state || loadFinanceState();
  const openingBalances = options.openingBalances || state.openingBalances || {};
  const trialBalance = buildTrialBalance(ACCOUNTS, entries, { openingBalances });
  const inventory = buildInventory(entries, INVENTORY_ITEMS);
  const validationErrors = entries.flatMap((entry, index) => validateEntry(entry, index));
  const signed = (row) => {
    const normalSide = ['pendapatan', 'liabilitas', 'ekuitas'].includes(row.type) ? 'kredit' : 'debet';
    return row.side === normalSide ? row.saldo : -row.saldo;
  };
  const totalOf = (type) =>
    trialBalance.rows.filter((row) => row.type === type).reduce((sum, row) => sum + signed(row), 0);
  const pendapatan = roundMoney(totalOf('pendapatan'));
  const biaya = roundMoney(totalOf('biaya'));
  const laba = roundMoney(pendapatan - biaya);
  const cashCodes = new Set(ACCOUNTS.filter((account) => CASH_EQUIVALENT_NAMES.has(account.name)).map((account) => account.code));
  const kas = roundMoney(
    trialBalance.rows.filter((row) => cashCodes.has(row.code)).reduce((sum, row) => sum + signed(row), 0),
  );
  const group = (type) =>
    trialBalance.rows
      .filter((row) => row.type === type && signed(row) !== 0)
      .map((row) => ({ code: row.code, name: row.name, amount: roundMoney(signed(row)) }));

  const stockAccount = trialBalance.rows.find((row) => row.code === '1.2.13');
  const inventoryVariance = roundMoney((stockAccount?.saldo || 0) - inventory.stockValue);

  const assets = group('aset').sort((a, b) => a.code.localeCompare(b.code));
  const liabilities = group('liabilitas')
    .concat(group('ekuitas').filter((row) => row.code !== '2.1.28'))
    .concat([{ code: '2.1.28', name: 'LABA / RUGI TAHUN BERJALAN', amount: laba, computed: true }])
    .sort((a, b) => a.code.localeCompare(b.code));

  const diagnostics = {
    validationErrors,
    unmappedLines: trialBalance.unmappedLines,
    journalImbalance: trialBalance.imbalance,
    inventoryVariance,
    inventory: inventory.diagnostics,
  };
  const hasBlockingIssues =
    validationErrors.length > 0 || trialBalance.unmappedLines.length > 0 || Math.abs(trialBalance.imbalance) > 0.01;

  return {
    meta: {
      title: 'Laporan Keuangan Dinetkan',
      period: derivePeriod(entries),
      source: SOURCE_SHEET,
      generatedAt: new Date().toISOString().slice(0, 10),
      isDummy: false,
      note: 'Kode akun, neraca, dan laba rugi mengikuti KODE AKUN pada spreadsheet; jurnal berasal dari input lokal.',
      diagnostics,
      hasBlockingIssues,
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
        sourceCode: row.sourceCode,
        name: row.name,
        side: row.side,
        report: row.report,
        openingDebit: row.openingDebit,
        openingKredit: row.openingKredit,
        debit: row.debit,
        kredit: row.kredit,
        saldo: row.saldo,
        saldoDebet: row.saldoDebet,
        saldoKredit: row.saldoKredit,
      })),
      totalDebit: trialBalance.totalDebit,
      totalKredit: trialBalance.totalKredit,
      imbalance: trialBalance.imbalance,
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

function loadJournalEntries() {
  return loadFinanceState().entries;
}

function saveJournalEntries(entries) {
  const state = loadFinanceState();
  state.entries = entries;
  saveFinanceState(state);
}

function replaceJournalEntries(entries, options = {}) {
  const normalized = (entries || []).map(normalizeEntry).filter(Boolean);
  const state = loadFinanceState();
  state.entries = normalized;
  if (options.openingBalances) state.openingBalances = normalizeOpeningBalances(options.openingBalances);
  saveFinanceState(state);
  const report = buildReportData(normalized, { state });
  REPORT_DATA = report;
  return report;
}

function addJournalEntry(entry) {
  const normalized = normalizeEntry(entry, loadFinanceState().entries.length);
  const errors = validateEntry(normalized, loadFinanceState().entries.length);
  if (errors.length) throw new Error(errors.join(' '));
  const state = loadFinanceState();
  state.entries.push(normalized);
  state.entries.sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.ref).localeCompare(String(b.ref)));
  saveFinanceState(state);
  const report = buildReportData(state.entries, { state });
  REPORT_DATA = report;
  return report;
}

function deleteJournalEntry(ref) {
  if (!ref) return false;
  const state = loadFinanceState();
  const next = state.entries.filter((entry) => entry.ref !== ref && entry.id !== ref);
  if (next.length === state.entries.length) return false;
  state.entries = next;
  saveFinanceState(state);
  REPORT_DATA = buildReportData(state.entries, { state });
  return true;
}

function clearJournalEntries() {
  return replaceJournalEntries([]);
}

function exportFinanceBackup() {
  return JSON.stringify(loadFinanceState(), null, 2);
}

function importFinanceBackup(text) {
  const parsed = JSON.parse(text);
  const state = normalizeFinanceState(parsed);
  const errors = state.entries.flatMap((entry, index) => validateEntry(entry, index));
  if (errors.length) {
    return { ok: false, errors, state, report: null };
  }
  saveFinanceState(state);
  REPORT_DATA = buildReportData(state.entries, { state });
  return { ok: true, errors: [], state, report: REPORT_DATA };
}

function refreshReportData() {
  const state = loadFinanceState();
  REPORT_DATA = buildReportData(state.entries, { state });
  return REPORT_DATA;
}

let REPORT_DATA;
REPORT_DATA = refreshReportData();
