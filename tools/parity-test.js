#!/usr/bin/env node
/*
 * Parity test: membaca workbook XLSX langsung (tanpa dependensi npm), lalu
 * menjalankan mesin hitung di data.js dengan jurnal yang direkonstruksi dari
 * sheet JURNAL UMUM. Output: tools/parity-results.json + ringkasan di stdout.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_XLSX = 'C:\\Users\\RYZEN\\Downloads\\LAPORAN KEUANGAN 2025.xlsx';
const XLSX_PATH = process.argv[2] || process.env.XLSX_PATH || DEFAULT_XLSX;
const TOLERANCE = 0.5; // IDR; cache workbook dibulatkan sampai satuan rupiah pada beberapa baris.

function decodeXml(value = '') {
  return String(value)
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));
}

function attrs(text = '') {
  const result = {};
  for (const match of text.matchAll(/([\w:.-]+)\s*=\s*"([^"]*)"/g)) result[match[1]] = decodeXml(match[2]);
  return result;
}

function readZipEntry(entry) {
  const script = `
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$path = $env:XLSX_ZIP_PATH
$entry = $env:XLSX_ZIP_ENTRY
$zip = [System.IO.Compression.ZipFile]::OpenRead($path)
try {
  $item = $zip.GetEntry($entry)
  if ($null -eq $item) { throw "Missing ZIP entry: $entry" }
  $stream = $item.Open()
  $memory = New-Object System.IO.MemoryStream
  $stream.CopyTo($memory)
  [Convert]::ToBase64String($memory.ToArray())
} finally {
  if ($null -ne $zip) { $zip.Dispose() }
}
`;
  const stdout = execFileSync('powershell.exe', ['-NoProfile', '-Command', script], {
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024,
    env: { ...process.env, XLSX_ZIP_PATH: XLSX_PATH, XLSX_ZIP_ENTRY: entry },
  });
  return Buffer.from(stdout.trim(), 'base64').toString('utf8');
}

function parseSharedStrings(xml) {
  return [...xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((match) =>
    [...match[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((part) => decodeXml(part[1])).join(''),
  );
}

function parseWorksheet(xml, sharedStrings) {
  const cells = new Map();
  const cellRegex = /<c\b[^>]*?\/>|<c\b[^>]*?>[\s\S]*?<\/c>/g;
  for (const match of xml.matchAll(cellRegex)) {
    const raw = match[0];
    const meta = attrs(raw.slice(0, raw.indexOf('>') + 1));
    if (!meta.r) continue;
    const formula = raw.match(/<f\b[^>]*>([\s\S]*?)<\/f>/);
    const value = raw.match(/<v\b[^>]*>([\s\S]*?)<\/v>/);
    const inline = raw.match(/<is\b[^>]*>([\s\S]*?)<\/is>/);
    let parsed = value ? decodeXml(value[1]) : '';
    if (meta.t === 's' && parsed !== '') parsed = sharedStrings[Number(parsed)] ?? '';
    if (meta.t === 'inlineStr' && inline) {
      parsed = [...inline[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((part) => decodeXml(part[1])).join('');
    }
    cells.set(meta.r, {
      address: meta.r,
      type: meta.t || '',
      formula: formula ? decodeXml(formula[1]) : '',
      raw: parsed,
      value: meta.t === 's' || meta.t === 'inlineStr' || meta.t === 'str' ? parsed : Number(parsed),
    });
  }
  return cells;
}

function cellNumber(cells, address) {
  const cell = cells.get(address);
  if (!cell) return null;
  const value = Number(cell.value);
  return Number.isFinite(value) ? value : null;
}

function cellText(cells, address) {
  return String(cells.get(address)?.raw ?? '');
}

function sourceCode(value) {
  if (value === null || value === undefined || value === '') return '';
  const number = Number(value);
  return Number.isFinite(number) ? `${Math.round(number)}.0` : '';
}

function excelSerialToISO(value) {
  const serial = Number(value);
  if (!Number.isFinite(serial)) return '';
  return new Date(Date.UTC(1899, 11, 30) + Math.round(serial) * 86400000).toISOString().slice(0, 10);
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function rowNumber(address) {
  const match = String(address || '').match(/\d+$/);
  return match ? Number(match[0]) : 0;
}

function loadWorkbook() {
  const workbookXml = readZipEntry('xl/workbook.xml');
  const relsXml = readZipEntry('xl/_rels/workbook.xml.rels');
  const sharedXml = readZipEntry('xl/sharedStrings.xml');
  const rels = new Map(
    [...relsXml.matchAll(/<Relationship\b([^>]*)\/>/g)].map((match) => {
      const meta = attrs(match[1]);
      return [meta.Id, meta.Target];
    }),
  );
  const sharedStrings = parseSharedStrings(sharedXml);
  const sheets = new Map();
  for (const match of workbookXml.matchAll(/<sheet\b([^>]*)\/>/g)) {
    const meta = attrs(match[1]);
    const target = rels.get(meta['r:id']);
    if (!target) continue;
    const entry = target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`;
    sheets.set(meta.name, parseWorksheet(readZipEntry(entry), sharedStrings));
  }
  return sheets;
}

function reconstructJournal(cells) {
  const rows = [];
  for (const [address, cell] of cells) {
    const row = rowNumber(address);
    if (row < 2 || !address.startsWith('A')) continue;
    const serial = Number(cell.value);
    if (!Number.isFinite(serial) || serial <= 0) continue;
    const debit = cellNumber(cells, `G${row}`) || 0;
    const credit = cellNumber(cells, `H${row}`) || 0;
    if (!debit && !credit) continue;
    rows.push({
      row,
      date: excelSerialToISO(serial),
      description: String(cellText(cells, `B${row}`) || '').trim(),
      code: sourceCode(cellNumber(cells, `D${row}`)),
      accountName: cellText(cells, `C${row}`),
      debit,
      credit,
    });
  }
  rows.sort((a, b) => a.row - b.row);
  const groups = [];
  let current = null;
  for (const row of rows) {
    if (!current || row.row !== current.lastRow + 1) {
      current = {
        row: row.row,
        lastRow: row.row,
        date: row.date,
        description: row.description,
        lines: [],
      };
      groups.push(current);
    }
    current.lastRow = row.row;
    current.lines.push({
      code: row.code,
      accountName: row.accountName,
      debit: row.debit,
      kredit: row.credit,
      sourceRow: row.row,
    });
  }
  return {
    rawRows: rows,
    entries: groups.map((group, index) => ({
      ref: `XL-${String(group.row).padStart(5, '0')}`,
      id: `XL-${String(group.row).padStart(5, '0')}`,
      date: group.date,
      description: group.description,
      lines: group.lines,
      _index: index,
    })),
  };
}

function runEngine(entries) {
  const dataJs = fs.readFileSync(path.join(ROOT, 'data.js'), 'utf8');
  const context = vm.createContext({
    localStorage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    },
  });
  vm.runInContext(dataJs, context, { filename: 'data.js' });
  const evaluate = (expression) => vm.runInContext(expression, context);
  const cleanEntries = entries.map(({ _index, ...entry }) => entry);
  const report = evaluate(`buildReportData(${JSON.stringify(cleanEntries)})`);
  return {
    report,
    accounts: evaluate('ACCOUNTS.map(a => ({ code: a.code, name: a.name, sourceCode: a.sourceCode, side: a.side, report: a.report }))'),
    cashNames: evaluate('[...CASH_EQUIVALENT_NAMES]'),
  };
}

function makeChecker() {
  const results = [];
  const add = (status, category, item, expected, actual, note = '') => {
    results.push({ status, category, item, expected, actual, note });
  };
  const compare = (category, item, expected, actual, note = '') => {
    if (expected === null || actual === null || !Number.isFinite(Number(expected)) || !Number.isFinite(Number(actual))) {
      add('BLOCKED', category, item, expected, actual, 'Nilai tidak tersedia di workbook atau engine.');
      return false;
    }
    const delta = roundMoney(Number(actual) - Number(expected));
    const ok = Math.abs(delta) <= TOLERANCE;
    add(ok ? 'PASS' : 'FAIL', category, item, Number(expected), Number(actual), note || `delta ${delta}`);
    return ok;
  };
  return { results, add, compare };
}

function main() {
  if (!fs.existsSync(XLSX_PATH)) throw new Error(`Workbook tidak ditemukan: ${XLSX_PATH}`);
  const sheets = loadWorkbook();
  const required = ['HOME', 'KODE AKUN', 'JURNAL UMUM', 'NERACA JALUR', 'LABA RUGI', 'NERACA'];
  for (const name of required) if (!sheets.has(name)) throw new Error(`Sheet tidak ditemukan: ${name}`);

  const home = sheets.get('HOME');
  const kodeAkun = sheets.get('KODE AKUN');
  const jurnal = sheets.get('JURNAL UMUM');
  const jalur = sheets.get('NERACA JALUR');
  const labaRugi = sheets.get('LABA RUGI');
  const neraca = sheets.get('NERACA');
  const { rawRows, entries } = reconstructJournal(jurnal);
  const { report, accounts, cashNames } = runEngine(entries);
  const checker = makeChecker();
  const { add, compare } = checker;

  // 1. Mapping akun: urutan KODE AKUN adalah kunci karena kolom A adalah serial tanggal.
  const skipRows = new Set([6, 7, 21, 39, 40, 62, 76]);
  const excelAccounts = [];
  for (let row = 1; row <= 200; row += 1) {
    if (skipRows.has(row)) continue;
    const code = sourceCode(cellNumber(kodeAkun, `A${row}`));
    const name = cellText(kodeAkun, `B${row}`);
    if (!code || !name) continue;
    excelAccounts.push({
      row,
      code,
      name,
      side: cellText(kodeAkun, `D${row}`).toLowerCase(),
      report: cellText(kodeAkun, `E${row}`).toLowerCase() === 'laba rugi' ? 'laba-rugi' : 'neraca',
    });
  }
  const mappingMismatches = [];
  excelAccounts.forEach((excel, index) => {
    const web = accounts[index];
    if (!web || web.sourceCode !== excel.code || web.name.trim() !== excel.name.trim() || web.side !== excel.side || web.report !== excel.report) {
      mappingMismatches.push({ excel, web });
    }
  });
  add(
    excelAccounts.length === accounts.length && mappingMismatches.length === 0 ? 'PASS' : 'FAIL',
    'mapping',
    `ACCOUNTS vs KODE AKUN (${accounts.length} akun)`,
    `${excelAccounts.length} akun, 0 selisih`,
    `${accounts.length} akun, ${mappingMismatches.length} selisih`,
    mappingMismatches.length
      ? JSON.stringify(mappingMismatches.slice(0, 8))
      : 'Map berdasarkan urutan baris, bukan nilai serial kolom A.',
  );

  // 2. KPI HOME.
  compare('home', 'HOME!B2 = LABA RUGI!C21 (pendapatan)', cellNumber(home, 'B2'), report.summary.pendapatan);
  compare('home', 'HOME!B3 = LABA RUGI!C83 (biaya)', cellNumber(home, 'B3'), report.summary.biaya, 'Dua baris cache workbook dibulatkan ke rupiah; lihat dokumentasi.');
  compare('home', 'HOME!B4 = LABA RUGI!C84 (laba)', cellNumber(home, 'B4'), report.summary.laba);
  add(
    'DEVIATION',
    'home',
    'HOME!B5 label KAS SETARA KAS',
    cellNumber(home, 'B5'),
    report.summary.kas,
    'Workbook B5 mereferensi NERACA!C40 (total aset), bukan kas. Engine memakai akun kas menurut KODE AKUN; selisih = aset non-kas.',
  );

  // 3. Laba rugi per akun.
  const lrCodes = accounts.filter((account) => account.report === 'laba-rugi').map((account) => account.sourceCode);
  let lrChecked = 0;
  let lrFailed = 0;
  const lrFailures = [];
  for (const code of lrCodes) {
    const rows = [];
    for (let row = 1; row <= 200; row += 1) if (sourceCode(cellNumber(labaRugi, `A${row}`)) === code) rows.push(row);
    if (!rows.length) continue;
    const expected = rows.reduce((sum, row) => sum + (cellNumber(labaRugi, `C${row}`) || 0), 0);
    const tb = report.trialBalance.rows.find((item) => item.sourceCode === code);
    const actual = tb ? roundMoney(tb.side === 'debet' ? tb.debit - tb.kredit : tb.kredit - tb.debit) : null;
    lrChecked += 1;
    if (actual === null || Math.abs(actual - expected) > TOLERANCE) {
      lrFailed += 1;
      lrFailures.push({ code, expected, actual });
    }
  }
  add(
    lrFailed === 0 ? 'PASS' : 'FAIL',
    'income-statement',
    `LABA RUGI per akun (${lrChecked} akun)`,
    '0 selisih > 0.50',
    `${lrFailed} selisih > 0.50`,
    lrFailures.length ? JSON.stringify(lrFailures.slice(0, 5)) : 'Dibandingkan dengan nilai cache C per baris.',
  );
  compare('income-statement', 'LABA RUGI!C84 (laba bersih)', cellNumber(labaRugi, 'C84'), report.summary.laba);

  // 4. Neraca jalur per akun nyata.
  let jalurChecked = 0;
  let jalurFailed = 0;
  const jalurFailures = [];
  const jalurSkipRows = new Set([5, 6, 20, 38, 39, 61, 75]);
  for (const account of accounts) {
    const rows = [];
    for (let row = 1; row <= 160; row += 1) {
      if (jalurSkipRows.has(row)) continue;
      if (sourceCode(cellNumber(jalur, `A${row}`)) === account.sourceCode) rows.push(row);
    }
    if (!rows.length) continue;
    const expectedDebet = rows.reduce((sum, row) => sum + (cellNumber(jalur, `D${row}`) || 0), 0);
    const expectedKredit = rows.reduce((sum, row) => sum + (cellNumber(jalur, `E${row}`) || 0), 0);
    const tb = report.trialBalance.rows.find((item) => item.sourceCode === account.sourceCode);
    const actualDebet = tb?.saldoDebet ?? null;
    const actualKredit = tb?.saldoKredit ?? null;
    jalurChecked += 1;
    if (
      actualDebet === null
      || Math.abs(actualDebet - expectedDebet) > TOLERANCE
      || Math.abs(actualKredit - expectedKredit) > TOLERANCE
    ) {
      jalurFailed += 1;
      jalurFailures.push({ code: account.sourceCode, expectedDebet, actualDebet, expectedKredit, actualKredit });
    }
  }
  add(
    jalurFailed === 0 ? 'PASS' : 'FAIL',
    'trial-balance',
    `NERACA JALUR saldo per akun (${jalurChecked} akun)`,
    '0 selisih > 0.50',
    `${jalurFailed} selisih > 0.50`,
    jalurFailures.length ? JSON.stringify(jalurFailures.slice(0, 5)) : 'Kolom D/E workbook adalah saldo bersih menurut pos saldo.',
  );

  // 5. Neraca komponen dan total.
  const assetRows = report.assets;
  for (const asset of assetRows) {
    const account = accounts.find((item) => item.code === asset.code);
    const rows = [];
    for (let row = 7; row <= 39; row += 1) {
      if (sourceCode(cellNumber(neraca, `A${row}`)) !== account?.sourceCode) continue;
      if (cellText(neraca, `B${row}`).trim() !== asset.name.trim()) continue;
      rows.push(row);
    }
    if (rows.length) compare('balance-sheet', `NERACA!C${rows[0]} ${asset.name}`, cellNumber(neraca, `C${rows[0]}`), asset.amount);
  }
  compare('balance-sheet', 'NERACA!C40 total aset', cellNumber(neraca, 'C40'), assetRows.reduce((sum, item) => sum + item.amount, 0));
  const modal = report.liabilities.find((item) => item.code === '2.1.25');
  compare('balance-sheet', 'NERACA!F24 MODAL', cellNumber(neraca, 'F24'), modal?.amount ?? null);
  compare('balance-sheet', 'LABA RUGI!C84 → ekuitas laporan', cellNumber(labaRugi, 'C84'), report.summary.laba);

  // 6. Jurnal dan diagnostik sumber.
  const excelDebit = roundMoney(rawRows.reduce((sum, row) => sum + row.debit, 0));
  const excelCredit = roundMoney(rawRows.reduce((sum, row) => sum + row.credit, 0));
  const unmappedDebit = roundMoney(report.meta.diagnostics.unmappedLines.reduce((sum, line) => sum + line.debit, 0));
  compare(
    'journal',
    'JURNAL UMUM total debit (termasuk akun tak terpetakan)',
    excelDebit,
    roundMoney(report.trialBalance.totalDebit + unmappedDebit),
  );
  compare(
    'journal',
    'JURNAL UMUM total kredit (termasuk akun tak terpetakan)',
    excelCredit,
    report.trialBalance.totalKredit,
  );
  const unmapped = report.meta.diagnostics.unmappedLines;
  add(
    unmapped.length ? 'BLOCKED' : 'PASS',
    'journal',
    'Akun jurnal tidak ada di KODE AKUN',
    '0 baris',
    `${unmapped.length} baris`,
    unmapped.length ? JSON.stringify(unmapped) : '',
  );
  const rawImbalance = roundMoney(excelDebit - excelCredit);
  add(
    Math.abs(rawImbalance) > TOLERANCE ? 'BLOCKED' : 'PASS',
    'journal',
    'Keseimbangan jurnal mentah workbook',
    '0',
    rawImbalance,
    'Dua transaksi BIAYA ADMINISTRASI masing-masing menyisihkan Rp2.500; tidak dikoreksi.',
  );
  const mappedImbalance = report.meta.diagnostics.journalImbalance;
  add(
    Math.abs(mappedImbalance) > TOLERANCE ? 'BLOCKED' : 'PASS',
    'journal',
    'Keseimbangan jurnal terpetakan',
    '0',
    mappedImbalance,
    'Selisih setelah 1 baris tak terpetakan Rp1.000.000 dikeluarkan dari perhitungan.',
  );

  // 7. Ketidakseimbangan neraca sumber — sengaja tidak dipaksa seimbang.
  const assetsTotal = assetRows.reduce((sum, item) => sum + item.amount, 0);
  const liabilitiesWorkbook = cellNumber(neraca, 'F40');
  const currentProfitWorkbook = cellNumber(labaRugi, 'C84');
  const gap = roundMoney(assetsTotal - liabilitiesWorkbook - currentProfitWorkbook);
  add(
    Math.abs(gap) > TOLERANCE ? 'BLOCKED' : 'PASS',
    'balance-sheet',
    'Selisih aset vs liabilitas + laba workbook',
    '0',
    gap,
    'NERACA!F40 tidak memasukkan LABA RUGI TAHUN BERJALAN. Website menampilkan komponen secara terpisah; tidak ada penyesuaian paksa.',
  );

  // 8. Item yang tidak dapat diuji dari workbook.
  add('SKIP', 'inventory', 'Master barang BRG-001/002/003', 'tidak tersedia', '3 item lokal dipertahankan', 'Workbook tidak memuat master inventaris; tidak klaim parity.');
  add('SKIP', 'depreciation', 'Kebijakan penyusutan', 'tidak tersedia', 'aturan lokal tanpa jurnal otomatis', 'Tidak ada kebijakan di workbook; engine hanya menghitung, tidak membuat jurnal.');
  const dates = rawRows.map((row) => row.date).sort();
  add(
    'BLOCKED',
    'period',
    'Periode workbook vs tanggal jurnal',
    'NERACA!A3 = Tahun 2026',
    `${dates[0]} s/d ${dates[dates.length - 1]}`,
    'Tidak diubah; periode laporan website mengikuti tanggal transaksi.',
  );

  const counts = checker.results.reduce((all, item) => {
    all[item.status] = (all[item.status] || 0) + 1;
    return all;
  }, {});
  const output = {
    generatedAt: new Date().toISOString(),
    xlsxPath: XLSX_PATH,
    tolerance: TOLERANCE,
    counts,
    totals: {
      journalRows: rawRows.length,
      journalEntries: entries.length,
      accounts: accounts.length,
      monthlyBuckets: report.monthly.length,
      cashNames,
      cashAmount: report.summary.kas,
      workbookCashLabelAmount: cellNumber(home, 'B5'),
      assetsTotal,
      liabilitiesWorkbook,
      currentProfitWorkbook,
      balanceGap: gap,
    },
    results: checker.results,
  };
  const outputPath = path.join(ROOT, 'tools', 'parity-results.json');
  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\r\n`);
  console.log(JSON.stringify({ counts, totals: output.totals, outputPath }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(`PARITY TEST ERROR: ${error.message}`);
  process.exitCode = 1;
}
