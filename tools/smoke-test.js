#!/usr/bin/env node
/* Pemeriksaan statis + unit ringan tanpa dependensi npm. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const pairs = [
  ['app.js', 'index.html'],
  ['inventaris/app.js', 'inventaris/index.html'],
];

let failed = false;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}${detail ? ` | ${detail}` : ''}`);
  if (!ok) failed = true;
};

for (const [jsFile, htmlFile] of pairs) {
  const js = fs.readFileSync(path.join(ROOT, jsFile), 'utf8');
  const html = fs.readFileSync(path.join(ROOT, htmlFile), 'utf8');
  const htmlIds = new Set([...html.matchAll(/\bid\s*=\s*["']([^"']+)["']/g)].map((match) => match[1]));
  const referenced = new Set([
    ...[...js.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g)].map((match) => match[1]),
    ...[...js.matchAll(/\$\(['"]([^'"]+)['"]\)/g)].map((match) => match[1]),
  ]);
  const missing = [...referenced].filter((id) => !htmlIds.has(id));
  check(`${jsFile}: ID HTML`, missing.length === 0, `${referenced.size} direferensikan, ${missing.length} hilang${missing.length ? ` (${missing.join(', ')})` : ''}`);
}

const navigationLinks = [
  ['index.html', 'inventaris/index.html'],
  ['inventaris/index.html', '../index.html'],
];
for (const [source, href] of navigationLinks) {
  const html = fs.readFileSync(path.join(ROOT, source), 'utf8');
  const target = path.resolve(ROOT, path.dirname(source), href);
  check(`${source}: tautan ${href}`, html.includes(`href="${href}"`) && fs.existsSync(target), fs.existsSync(target) ? 'file ada' : 'file tidak ada');
}

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

if (failed) process.exitCode = 1;
