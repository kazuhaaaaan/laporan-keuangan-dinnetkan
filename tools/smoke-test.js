#!/usr/bin/env node
/* Pemeriksaan statis + unit ringan tanpa dependensi npm. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const mainPages = [
  'index.html',
  'kode-akun.html',
  'input-jurnal.html',
  'jurnal-umum.html',
  'neraca-jalur.html',
  'laba-rugi.html',
  'neraca.html',
];
const pairs = [
  ['app.js', mainPages],
  ['inventaris/app.js', ['inventaris/index.html']],
];

let failed = false;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}${detail ? ` | ${detail}` : ''}`);
  if (!ok) failed = true;
};

const idsFrom = (file) => {
  const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  return new Set([...html.matchAll(/\bid\s*=\s*["']([^"']+)["']/g)].map((match) => match[1]));
};

for (const [jsFile, htmlFiles] of pairs) {
  const js = fs.readFileSync(path.join(ROOT, jsFile), 'utf8');
  const htmlIds = new Set(htmlFiles.flatMap((file) => [...idsFrom(file)]));
  const referenced = new Set([
    ...[...js.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g)].map((match) => match[1]),
    ...[...js.matchAll(/\$\(['"]([^'"]+)['"]\)/g)].map((match) => match[1]),
  ]);
  const missing = [...referenced].filter((id) => !htmlIds.has(id));
  check(`${jsFile}: ID HTML`, missing.length === 0, `${referenced.size} direferensikan, ${missing.length} hilang${missing.length ? ` (${missing.join(', ')})` : ''}`);
}

const commonIds = [
  'retrievedAt', 'pageEyebrow', 'validationBanner', 'toastContainer',
  'sidebar', 'mobileToggle', 'sidebarBackdrop', 'sidebarClose',
  'sourceLink', 'sheetBtn', 'footerSource', 'printBtn',
];
const pageIds = {
  'index.html': ['kpiRevenue', 'monthlyChart', 'costCount', 'compositionDonut'],
  'kode-akun.html': ['accountForm', 'accountStatus', 'accountSearch', 'accountCount', 'accountBody', 'acctCode', 'acctName', 'acctType', 'acctSide'],
  'input-jurnal.html': ['journalForm', 'txDate', 'txDescription', 'txAccount', 'accountFieldLabel', 'accountCombo', 'accountToggle', 'accountOptions', 'txSide', 'txAmount', 'txAddLineBtn', 'lineEditInfo', 'pendataanBody', 'pendataanSummary', 'saveJournalBtn', 'clearDraftBtn', 'formStatus', 'txItem', 'txMutation', 'txQuantity', 'invItemCode', 'invItemName', 'invItemUnit', 'invItemPrice', 'invItemInitial', 'invAddBtn', 'backupJournalBtn', 'importJournalBtn', 'journalImportFile', 'clearJournalBtn'],
  'jurnal-umum.html': ['journalSearch', 'monthFilter', 'accountFilter', 'typeFilter', 'journalBody', 'journalCount', 'journalTotals', 'pageInfo', 'prevPage', 'nextPage', 'exportBtn'],
  'neraca-jalur.html': ['worksheetBody', 'worksheetMeta'],
  'laba-rugi.html': ['revenueBody', 'expenseBody', 'incomeMeta', 'incomeNote', 'incomeSummary'],
  'neraca.html': ['assetBody', 'liabilityBody', 'balanceNote'],
};
for (const page of mainPages) {
  const htmlIds = idsFrom(page);
  const required = [...commonIds, ...(pageIds[page] || [])];
  const missing = required.filter((id) => !htmlIds.has(id));
  check(`${page}: ID halaman`, missing.length === 0, `${required.length} wajib, ${missing.length} hilang${missing.length ? ` (${missing.join(', ')})` : ''}`);
}

const allPages = [...mainPages, 'inventaris/index.html'];
for (const source of allPages) {
  const html = fs.readFileSync(path.join(ROOT, source), 'utf8');
  const base = path.dirname(source);
  for (const targetPage of allPages) {
    if (targetPage === source) continue;
    const href = base === '.'
      ? targetPage
      : path.relative(base, targetPage).replace(/\\/g, '/');
    const target = path.resolve(ROOT, base, href);
    check(`${source}: tautan ${href}`, html.includes(`href="${href}"`) && fs.existsSync(target), fs.existsSync(target) ? 'file ada' : 'file tidak ada');
  }
}

const redirectHtml = fs.readFileSync(path.join(ROOT, 'input-data.html'), 'utf8');
check(
  'input-data.html: redirect ke input-jurnal.html',
  redirectHtml.includes('href="input-jurnal.html"') && redirectHtml.includes('url=input-jurnal.html'),
  'tautan dan meta refresh tersedia',
);

const journalPageHtml = fs.readFileSync(path.join(ROOT, 'input-jurnal.html'), 'utf8');
check(
  'input-jurnal.html: daftar akun dapat dicari',
  journalPageHtml.includes('id="accountCombo"')
    && journalPageHtml.includes('role="combobox"')
    && journalPageHtml.includes('id="accountOptions" role="listbox"')
    && !journalPageHtml.includes('<datalist'),
  'combobox dengan daftar, bukan datalist',
);

const supabaseConfig = fs.readFileSync(path.join(ROOT, 'supabase-config.js'), 'utf8');
const supabaseClient = fs.readFileSync(path.join(ROOT, 'supabase-client.js'), 'utf8');
const supabaseSync = fs.readFileSync(path.join(ROOT, 'supabase-sync.js'), 'utf8');
const supabaseMapper = fs.readFileSync(path.join(ROOT, 'supabase-mapper.js'), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const gitignore = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
check(
  'supabase: konfigurasi memakai environment variable Vite',
  supabaseConfig.includes('import.meta.env.VITE_SUPABASE_URL')
    && supabaseConfig.includes('import.meta.env.VITE_SUPABASE_ANON_KEY')
    && supabaseConfig.includes('window.DINETKAN_SUPABASE')
    && !supabaseConfig.includes('service_role'),
  'VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY',
);
check(
  'supabase: client terpusat dan aman',
  supabaseClient.includes("from '@supabase/supabase-js'")
    && supabaseClient.includes('createClient(')
    && !supabaseClient.includes('service_role')
    && !supabaseClient.includes('sb_secret_'),
  'createClient dengan anon key saja',
);
check(
  'supabase: dependency dan script tersedia',
  Boolean(packageJson.dependencies?.['@supabase/supabase-js'])
    && Boolean(packageJson.devDependencies?.vite)
    && Boolean(packageJson.scripts?.build),
  `@supabase/supabase-js ${packageJson.dependencies?.['@supabase/supabase-js']}, vite ${packageJson.devDependencies?.vite}`,
);
check(
  'supabase: .env.local tidak ikut ter-commit',
  gitignore.includes('.env.local') && fs.existsSync(path.join(ROOT, '.env.example')),
  '.env.example tersedia, .env.local diabaikan',
);
check(
  'supabase: 9 tabel dipetakan',
  ['profiles', 'accounts', 'auxiliary_accounts', 'opening_balances', 'fiscal_periods', 'journal_entries', 'journal_lines', 'inventory', 'inventory_movements']
    .every((table) => supabaseMapper.includes(`'${table}'`)),
  'mapping mengikuti skema aktual Supabase',
);
check(
  'supabase: auth dan CRUD tersedia',
  supabaseSync.includes('signInWithPassword')
    && supabaseSync.includes('auth.signOut')
    && supabaseSync.includes('onAuthStateChange')
    && supabaseSync.includes('deleteDraftJournal')
    && supabaseSync.includes('.upsert(')
    && supabaseSync.includes('.delete()'),
  'login, logout, sesi, draft delete, upsert',
);
check(
  'supabase: event refresh sampai ke halaman',
  supabaseSync.includes("document.dispatchEvent(new CustomEvent(name")
    && fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8').includes("document.addEventListener('dinetkan:remote-updated'"),
  'event dispatch di document, bukan window',
);

const missingSyncScripts = allPages.filter((page) => {
  const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
  const prefix = page.startsWith('inventaris/') ? '../' : '';
  return !html.includes(`type="module" src="${prefix}supabase-config.js"`)
    || !html.includes(`type="module" src="${prefix}supabase-sync.js"`);
});
check(
  'supabase: skrip module termuat di semua halaman',
  missingSyncScripts.length === 0,
  missingSyncScripts.length ? `hilang di ${missingSyncScripts.join(', ')}` : `${allPages.length} halaman`,
);

function createEngine(storage = {}) {
  const store = { ...storage };
  const localStorage = {
    getItem: (key) => (Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null),
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
  };
  const context = vm.createContext({ localStorage });
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'data.js'), 'utf8'), context, { filename: 'data.js' });
  return {
    context,
    store,
    evaluate: (expression) => vm.runInContext(expression, context),
  };
}

// buildMonthly harus memisahkan Januari 2025 dan Januari 2026.
{
  const engine = createEngine();
  const report = engine.evaluate(`buildReportData([
    { ref: 'A', date: '2025-01-15', description: 'x', lines: [{ code: '3.1.10', debit: 0, kredit: 100 }] },
    { ref: 'B', date: '2026-01-15', description: 'y', lines: [{ code: '3.1.10', debit: 0, kredit: 200 }] }
  ])`);
  const keys = report.monthly.map((item) => item.key).join(',');
  check('buildMonthly memisahkan tahun', keys === '2025-01,2026-01', keys);
}

// Migrasi kunci lama tidak boleh kehilangan transaksi.
{
  const legacy = [{
    ref: 'OLD-1',
    date: '2025-03-01',
    description: 'data lama',
    lines: [{ code: '1.1.10', debit: 5000, kredit: 0 }, { code: '3.1.10', debit: 0, kredit: 5000 }],
  }];
  const engine = createEngine({ 'dinetkan-finance-journal-v2': JSON.stringify(legacy) });
  const migrated = engine.evaluate('loadJournalEntries()');
  const newKey = engine.store['dinetkan-finance-v1'];
  check('migrasi localStorage', migrated.length === 1 && Boolean(newKey), `${migrated.length} transaksi, key baru ${newKey ? 'ada' : 'tidak ada'}`);
}

// Jurnal multi-baris harus tersimpan utuh dan seimbang.
{
  const engine = createEngine();
  const report = engine.evaluate(`addJournalEntry({
    ref: 'MULTI-1', date: '2025-04-01', description: 'jurnal 3 baris',
    lines: [
      { code: '1.1.10', debit: 600, kredit: 0 },
      { code: '5.1.56', debit: 250, kredit: 0 },
      { code: '3.1.10', debit: 0, kredit: 850 }
    ]
  })`);
  const state = JSON.parse(engine.store['dinetkan-finance-v1']);
  check(
    'jurnal multi-baris',
    state.entries.length === 1 && state.entries[0].lines.length === 3 && report.journal.length === 3,
    `${state.entries[0]?.lines.length || 0} baris tersimpan, ${report.journal.length} baris laporan`,
  );
}

// Transaksi baru harus langsung tampil di jurnal, worksheet, laba rugi, dan neraca.
{
  const engine = createEngine();
  const report = engine.evaluate(`addJournalEntry({
    ref: 'FLOW-1', date: '2025-07-01', description: 'alur laporan',
    lines: [
      { code: '1.1.10', debit: 2000, kredit: 0 },
      { code: '3.1.10', debit: 0, kredit: 2000 }
    ]
  })`);
  const inJournal = report.journal.some((row) => row[1] === 'alur laporan');
  const inWorksheetSource = report.trialBalance.rows.some((row) => row.code === '1.1.10' && row.debit === 2000);
  const inIncome = report.revenueAccounts.some((item) => item.code === '3.1.10' && item.amount === 2000);
  const inBalance = report.assets.some((item) => item.code === '1.1.10' && item.amount === 2000);
  check(
    'jurnal masuk seluruh laporan',
    inJournal && inWorksheetSource && inIncome && inBalance,
    `jurnal=${inJournal}, worksheet=${inWorksheetSource}, laba rugi=${inIncome}, neraca=${inBalance}`,
  );
}

// Barang yang dibuat dari Input Jurnal harus terhubung ke mutasi di Inventaris.
{
  const engine = createEngine({
    'dinetkan-inventory-v1': JSON.stringify({
      items: [{ id: 'item-local-abc', code: 'BRG-900', name: 'Barang uji', price: 100, initialStock: 5 }],
      transactions: [],
      depreciations: [],
    }),
  });
  const report = engine.evaluate(`addJournalEntry({
    ref: 'INV-1', date: '2025-08-01', description: 'mutasi barang baru',
    lines: [
      { code: '1.2.13', debit: 200, kredit: 0, mutation: { item: 'BRG-900', type: 'in', quantity: 2 } },
      { code: '3.1.10', debit: 0, kredit: 200 }
    ]
  })`);
  const item = report.inventory.items.find((entry) => entry.code === 'BRG-900');
  const mutation = report.inventory.transactions.find((entry) => entry.reference === 'INV-1');
  check(
    'barang input jurnal terhubung ke inventaris',
    item?.id === 'item-local-abc' && mutation?.itemId === 'item-local-abc',
    `item=${item?.id || '-'}, mutasi=${mutation?.itemId || '-'}`,
  );
}

// Ekspor/impor cadangan harus round-trip.
{
  const engine = createEngine();
  engine.evaluate(`addJournalEntry({ ref: 'RT-1', date: '2025-05-01', description: 'round trip', lines: [
    { code: '1.1.10', debit: 100, kredit: 0 }, { code: '3.1.10', debit: 0, kredit: 100 }
  ] })`);
  const backup = engine.evaluate('exportFinanceBackup()');
  const result = engine.evaluate(`importFinanceBackup(${JSON.stringify(backup)})`);
  check('round-trip cadangan JSON', result.ok === true && result.state.entries.length === 1, `ok=${result.ok}, ${result.state.entries.length} transaksi`);
}

// Akun kustom harus ikut laporan dan tidak bisa dihapus saat masih dipakai.
{
  const engine = createEngine();
  const added = engine.evaluate(`addAccount({ code: '5.1.70', name: 'BIAYA UJI', type: 'biaya', side: 'debet' })`);
  engine.evaluate(`addJournalEntry({ ref: 'ACC-1', date: '2025-06-01', description: 'akun kustom', lines: [
    { code: '5.1.70', debit: 10, kredit: 0 }, { code: '3.1.10', debit: 0, kredit: 10 }
  ] })`);
  const report = engine.evaluate('REPORT_DATA');
  const usage = engine.evaluate(`getAccountUsage('5.1.70')`);
  const deleteResult = engine.evaluate(`(() => {
    try { deleteAccount('5.1.70'); return 'deleted'; } catch (error) { return error.message; }
  })()`);
  check(
    'tambah akun kustom',
    added.account.code === '5.1.70' && report.trialBalance.rows.some((row) => row.code === '5.1.70'),
    `akun=${added.account.code}, neraca=${report.trialBalance.rows.some((row) => row.code === '5.1.70')}`,
  );
  check(
    'akun terpakai tidak bisa dihapus',
    usage.entries === 1 && deleteResult !== 'deleted',
    `dipakai ${usage.entries} transaksi, hapus=${deleteResult}`,
  );
}

// Akun kustom yang belum dipakai boleh dihapus.
{
  const engine = createEngine();
  engine.evaluate(`addAccount({ code: '5.1.71', name: 'BIAYA UJI 2', type: 'biaya', side: 'debet' })`);
  const removed = engine.evaluate(`deleteAccount('5.1.71')`);
  const stillListed = engine.evaluate(`getAccountList().some((account) => account.code === '5.1.71')`);
  check('hapus akun belum terpakai', removed === true && !stillListed, `removed=${removed}, masih ada=${stillListed}`);
}

async function checkSupabaseMapper() {
  const mapper = await import('../supabase-mapper.js');
  const accounts = [{ code: '1.1.01', name: 'KAS', type: 'aset', side: 'debet', report: 'neraca', sourceCode: '40179.0' }];
  const finance = {
    entries: [{
      id: 'JRN-UJI',
      ref: 'JRN-UJI',
      date: '2025-01-15',
      description: 'Jurnal uji',
      lines: [
        { code: '1.1.01', debit: 100, kredit: 0, mutation: { item: 'BRG-001', type: 'in', quantity: 2 } },
        { code: '40179.0', debit: 0, kredit: 100 },
      ],
    }],
    openingBalances: { '1.1.01': { debit: 50, kredit: 0 } },
    accounts: [],
    deletedAccounts: [],
  };
  const inventory = {
    items: [{ id: 'item-local-1', code: 'BRG-001', name: 'Router', price: 1250000, initialStock: 0 }],
    transactions: [{ id: 'mut-1', date: '2025-01-16', itemId: 'item-local-1', type: 'out', quantity: 1, note: 'dipakai' }],
    depreciations: [],
  };
  const snapshot = mapper.buildRemoteSnapshot({ finance, inventory, itemDefinitions: inventory.items, accounts });
  const debit = snapshot.journal_lines.reduce((total, line) => total + line.debit, 0);
  const credit = snapshot.journal_lines.reduce((total, line) => total + line.credit, 0);
  check(
    'mapper: jurnal remote seimbang dan berstatus posted',
    snapshot.journal_entries.length === 1
      && snapshot.journal_entries[0].status === 'posted'
      && snapshot.journal_lines.length === 2
      && debit === credit
      && snapshot.journal_lines.some((line) => line.auxiliary_account_id),
    `debet=${debit}, kredit=${credit}, baris=${snapshot.journal_lines.length}`,
  );
  check(
    'mapper: mutasi jurnal dikodekan di journal_lines',
    snapshot.journal_lines.some((line) => /\[mutasi:BRG-001:in:2\]/.test(line.description)),
    'deskripsi baris menyimpan mutation',
  );
  const local = mapper.buildLocalSnapshot(snapshot, []);
  check(
    'mapper: data remote kembali ke state lokal',
    local.finance.entries.length === 1
      && local.finance.entries[0].lines.length === 2
      && local.finance.entries[0].lines[0].mutation?.item === 'BRG-001'
      && local.inventory.transactions.length === 1
      && local.inventory.items.length === 1,
    `entries=${local.finance.entries.length}, mutasi=${local.inventory.transactions.length}`,
  );
  check(
    'mapper: UUID deterministik untuk upsert',
    mapper.uuidFor('account', '1.1.01') === mapper.uuidFor('account', '1.1.01')
      && mapper.isUuid(mapper.uuidFor('account', '1.1.01')),
    'id stabil sehingga tidak ada duplikat',
  );
}

(async () => {
  await checkSupabaseMapper();
  if (failed) process.exitCode = 1;
})();
