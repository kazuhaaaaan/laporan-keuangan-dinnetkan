const SOURCE_SHEET = 'https://docs.google.com/spreadsheets/d/1yMhC0C7REAkRvO8MD9RI-yeqwhC5vBhLm0Tul5CEG_Q/edit?usp=drivesdk';

const ACCOUNTS = [
  { code: '1.1.10', name: 'KAS KECIL', side: 'debet', report: 'neraca', type: 'kas' },
  { code: '1.1.11', name: 'BANK BCA DINETKAN', side: 'debet', report: 'neraca', type: 'kas' },
  { code: '1.2.13', name: 'PERSEDIAAN', side: 'debet', report: 'neraca', type: 'aset' },
  { code: '1.2.25', name: 'PERALATAN DAN MESIN', side: 'debet', report: 'neraca', type: 'aset' },
  { code: '2.1.11', name: 'HUTANG PEMBELIAN BARANG DAGANG', side: 'kredit', report: 'neraca', type: 'liabilitas' },
  { code: '2.1.25', name: 'MODAL', side: 'kredit', report: 'neraca', type: 'ekuitas' },
  { code: '3.1.11', name: 'PENDAPATAN PENJUALAN JASA', side: 'kredit', report: 'laba-rugi', type: 'pendapatan' },
  { code: '3.1.19', name: 'PENDAPATAN LAIN', side: 'kredit', report: 'laba-rugi', type: 'pendapatan' },
  { code: '5.1.11', name: 'BIAYA GAJI PEGAWAI', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.18', name: 'BIAYA SEWA JARINGAN', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.24', name: 'BIAYA LISTRIK', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.26', name: 'BIAYA INVENTARIS KANTOR', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.44', name: 'BIAYA SEWA TEMPAT', side: 'debet', report: 'laba-rugi', type: 'biaya' },
  { code: '5.1.56', name: 'BIAYA ADMINISTRASI BANK', side: 'debet', report: 'laba-rugi', type: 'biaya' },
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
      const row = byCode.get(line.code);
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
  const names = new Map(accounts.map((account) => [account.code, account.name]));
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
    monthly.push({ month, revenue, expense });
  });

  return monthly;
}

function buildReportData(entries) {
  const trialBalance = buildTrialBalance(ACCOUNTS, entries);
  const inventory = buildInventory(entries, INVENTORY_ITEMS);
  const totalOf = (type) =>
    trialBalance.rows.filter((row) => row.type === type).reduce((sum, row) => sum + row.saldo, 0);
  const pendapatan = totalOf('pendapatan');
  const biaya = totalOf('biaya');
  const laba = pendapatan - biaya;
  const kas = totalOf('kas');
  const group = (type) =>
    trialBalance.rows
      .filter((row) => row.type === type && row.saldo !== 0)
      .map((row) => ({ code: row.code, name: row.name, amount: row.saldo }));

  const stockAccount = trialBalance.rows.find((row) => row.code === '1.2.13');
  if (Math.abs(stockAccount.saldo - inventory.stockValue) > 0.01) {
    throw new Error('Nilai persediaan tidak cocok dengan kartu stok');
  }

  const assets = group('aset').concat(group('kas')).sort((a, b) => a.code.localeCompare(b.code));
  const liabilities = group('liabilitas')
    .concat(group('ekuitas'))
    .concat([{ code: '2.1.28', name: 'LABA / RUGI TAHUN BERJALAN', amount: laba, computed: true }])
    .sort((a, b) => a.code.localeCompare(b.code));

  return {
    meta: {
      title: 'Laporan Keuangan Dinnetkan',
      period: entries.length ? entries[entries.length - 1].date.slice(0, 4) : '2025',
      source: SOURCE_SHEET,
      generatedAt: new Date().toISOString().slice(0, 10),
      isDummy: true,
      note: 'Isi jurnal umum lewat form input; laporan dihitung ulang otomatis.',
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
