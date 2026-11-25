let report = REPORT_DATA;
let meta = report.meta;
let summary = report.summary;
let monthly = report.monthly;
let journal = report.journal;
const pageSize = 25;

let filteredJournal = [];
let currentPage = 1;

function syncReport() {
  report = refreshReportData();
  meta = report.meta;
  summary = report.summary;
  monthly = report.monthly;
  journal = report.journal;
}

const INVENTORY_STATE_KEY = 'dinetkan-inventory-v1';

function loadInventoryState() {
  try {
    const raw = localStorage.getItem(INVENTORY_STATE_KEY);
    if (!raw) {
      return {
        items: (REPORT_DATA.inventory?.items || []).map((item) => ({ ...item, source: item.source || 'journal-derived' })),
        transactions: [],
        depreciations: [],
      };
    }
    const parsed = JSON.parse(raw);
    return {
      items: Array.isArray(parsed?.items) ? parsed.items.filter((item) => item && item.id && item.code) : [],
      transactions: Array.isArray(parsed?.transactions) ? parsed.transactions : [],
      depreciations: Array.isArray(parsed?.depreciations) ? parsed.depreciations : [],
    };
  } catch (error) {
    return { items: [], transactions: [], depreciations: [] };
  }
}

function saveInventoryState(state) {
  try {
    localStorage.setItem(INVENTORY_STATE_KEY, JSON.stringify(state));
    window.SupabaseSync?.pushInventory?.(state);
  } catch (error) {
    showToast('Data inventaris tidak dapat disimpan di browser ini.', 'error');
  }
}

function addInventoryItemFromJournal(payload) {
  const state = loadInventoryState();
  const code = String(payload.code).trim().toUpperCase();
  if (state.items.some((item) => String(item.code).toUpperCase() === code)) {
    throw new Error(`Kode barang ${code} sudah digunakan.`);
  }
  const saved = {
    id: `item-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
    code,
    name: String(payload.name).trim(),
    category: String(payload.category || ''),
    unit: String(payload.unit || ''),
    location: String(payload.location || ''),
    price: Number(payload.price) || 0,
    minStock: Number(payload.minStock) || 0,
    initialStock: Number(payload.initialStock) || 0,
    source: 'local',
  };
  state.items.push(saved);
  saveInventoryState(state);
  syncReport();
  return saved;
}

function renderDashboard() {
  initMeta();
  renderValidation();
  renderKpis();
  renderChart();
  renderCosts();
  renderComposition();
  renderIncomeStatement();
  renderBalance();
  renderWorksheet();
  refreshFilterOptions();
  applyFilters();
}

const moneyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat('id-ID');
const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

function money(value) {
  return moneyFormatter.format(value);
}

function shortMoney(value) {
  const absolute = Math.abs(value);
  if (absolute >= 1e12) return `Rp${(value / 1e12).toFixed(2)} T`;
  if (absolute >= 1e9) return `Rp${(value / 1e9).toFixed(2)} M`;
  if (absolute >= 1e6) return `Rp${(value / 1e6).toFixed(1)} jt`;
  if (absolute >= 1e3) return `Rp${(value / 1e3).toFixed(0)} rb`;
  return money(value);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatDate(value) {
  return dateFormatter.format(new Date(`${value}T00:00:00`));
}

function trend(current, previous, previousMonth) {
  if (!previous) return '—';
  const percent = ((current - previous) / previous) * 100;
  return `${percent >= 0 ? '+' : ''}${percent.toFixed(1)}% vs ${previousMonth}`;
}

function initMeta() {
  const isSummary = document.body.dataset.page === 'index';
  if (isSummary) document.title = `${meta.title} ${meta.period}`;
  document.getElementById('retrievedAt').textContent = `Data dibaca: ${formatDate(meta.generatedAt)}`;
  const eyebrow = document.getElementById('pageEyebrow');
  if (eyebrow && isSummary) {
    eyebrow.textContent = journal.length ? `LAPORAN KEUANGAN · PERIODE ${meta.period}` : 'STATUS: DATA KOSONG · SILAKAN INPUT TRANSAKSI';
  }
  const setText = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  };
  const periodYear = /^\d{4}/.test(meta.period) ? meta.period.slice(-4) : '';
  setText('kpiRevenueNote', periodYear ? `Akumulasi pendapatan tahun ${periodYear}` : 'Akumulasi pendapatan periode laporan');
  setText('kpiExpenseNote', periodYear ? `Akumulasi biaya operasional ${periodYear}` : 'Akumulasi biaya operasional periode laporan');
  setText('kpiCashNote', periodYear ? `Saldo kas dan bank per 31 Des ${periodYear}` : 'Saldo kas dan bank akhir periode');
  setText('balanceNote', periodYear ? `Aset dan liabilitas per 31 Desember ${periodYear}.` : 'Aset dan liabilitas akhir periode.');
  ['sourceLink', 'sheetBtn', 'footerSource'].forEach((id) => {
    document.getElementById(id).setAttribute('href', meta.source);
  });
}

function renderValidation() {
  const banner = document.getElementById('validationBanner');
  if (!banner) return;
  const diagnostics = meta.diagnostics || {};
  const items = [
    diagnostics.journalImbalance ? `Selisih jurnal ${money(diagnostics.journalImbalance)}` : '',
    diagnostics.unmappedLines?.length ? `${diagnostics.unmappedLines.length} baris akun tidak dikenal (tidak ikut dihitung)` : '',
    diagnostics.validationErrors?.length ? `${diagnostics.validationErrors.length} kesalahan validasi transaksi` : '',
    Math.abs(diagnostics.inventoryVariance || 0) > 0.01 ? `Selisih persediaan vs kartu stok ${money(diagnostics.inventoryVariance)}` : '',
  ].filter(Boolean);
  banner.hidden = items.length === 0;
  banner.textContent = items.length
    ? `BLOCKED — ${items.join(' · ').toUpperCase()}. Data tidak dipaksa seimbang; periksa sumber sebelum memakai angka ini.`
    : '';
}

function renderKpis() {
  if (!document.getElementById('kpiRevenue')) return;
  const latest = monthly[monthly.length - 1] || { revenue: 0, expense: 0, month: '—' };
  const previous = monthly.length > 1 ? monthly[monthly.length - 2] : { revenue: 0, expense: 0, month: '—' };
  const margin = summary.pendapatan ? (summary.laba / summary.pendapatan) * 100 : 0;
  const hasData = journal.length > 0;
  const display = (amount) => (hasData ? money(amount) : money(0));

  document.getElementById('kpiRevenue').textContent = display(summary.pendapatan);
  document.getElementById('kpiExpense').textContent = display(summary.biaya);
  document.getElementById('kpiProfit').textContent = display(summary.laba);
  document.getElementById('kpiCash').textContent = display(summary.kas);
  document.getElementById('revenueTrend').textContent = hasData ? trend(latest.revenue, previous.revenue, previous.month) : '';
  document.getElementById('expenseTrend').textContent = hasData ? trend(latest.expense, previous.expense, previous.month) : '';
  document.getElementById('marginTag').textContent = hasData ? `MARGIN ${margin.toFixed(2)}%` : '';
}

function renderChart() {
  const chart = document.getElementById('monthlyChart');
  if (!chart) return;
  if (!monthly.length) {
    chart.innerHTML = '<p class="chart-empty">Belum ada transaksi. Isi lewat form input transaksi untuk melihat grafik.</p>';
    return;
  }

  const width = 1000;
  const height = 340;
  const padding = { top: 22, right: 18, bottom: 44, left: 68 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const values = monthly.flatMap((item) => [item.revenue, item.expense, item.revenue - item.expense]);
  const maximum = Math.max(...values) * 1.08;
  const minimum = Math.min(0, ...values) * 1.15;
  const range = maximum - minimum || 1;
  const scaleY = (value) => padding.top + ((maximum - value) / range) * plotHeight;
  const groupWidth = plotWidth / monthly.length;
  const barWidth = Math.min(24, groupWidth * 0.29);
  const zeroY = scaleY(0);
  const parts = [];

  for (let index = 0; index <= 4; index += 1) {
    const value = minimum + (range / 4) * index;
    const y = scaleY(value);
    parts.push(`<line class="${value === 0 ? 'chart-zero' : 'chart-grid'}" x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" />`);
    parts.push(`<text x="${padding.left - 10}" y="${y + 4}" text-anchor="end">${shortMoney(value)}</text>`);
  }

  const profitPoints = monthly.map((item, index) => {
    const center = padding.left + groupWidth * index + groupWidth / 2;
    return [center, scaleY(item.revenue - item.expense)];
  });

  monthly.forEach((item, index) => {
    const center = padding.left + groupWidth * index + groupWidth / 2;
    const revenueTop = scaleY(item.revenue);
    const expenseTop = scaleY(item.expense);
    const profit = item.revenue - item.expense;

    parts.push(`<rect class="chart-bar" x="${center - barWidth - 2}" y="${revenueTop}" width="${barWidth}" height="${zeroY - revenueTop}" fill="#12a678"><title>${item.month} pendapatan: ${money(item.revenue)}</title></rect>`);
    parts.push(`<rect class="chart-bar" x="${center + 2}" y="${expenseTop}" width="${barWidth}" height="${zeroY - expenseTop}" fill="#f59e0b"><title>${item.month} biaya: ${money(item.expense)}</title></rect>`);
    parts.push(`<text x="${center}" y="${height - 16}" text-anchor="middle">${item.month}</text>`);
    parts.push(`<circle class="chart-point" cx="${profitPoints[index][0]}" cy="${profitPoints[index][1]}" r="4"><title>${item.month} laba: ${money(profit)}</title></circle>`);
  });

  const linePath = profitPoints.map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');
  parts.push(`<path class="chart-line" d="${linePath}" />`);
  chart.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Grafik pendapatan, biaya, dan laba bulanan">${parts.join('')}</svg>`;
}

function renderCosts() {
  const count = document.getElementById('costCount');
  const ranking = document.getElementById('costRanking');
  if (!count || !ranking) return;
  const ranked = [...report.expenseAccounts].sort((a, b) => b.amount - a.amount).slice(0, 8);
  const total = summary.biaya || 1;
  const maximum = ranked[0]?.amount || 1;

  count.textContent = `${report.expenseAccounts.length} akun biaya`;
  ranking.innerHTML = ranked.length
    ? ranked
        .map((item, index) => {
          const percent = (item.amount / total) * 100;
          return `<div class="rank-item">
            <span class="rank-number">${index + 1}</span>
            <div class="rank-info">
              <div class="rank-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</div>
              <div class="rank-bar"><span style="width:${(item.amount / maximum) * 100}%"></span></div>
            </div>
            <div class="rank-value">${shortMoney(item.amount)}<span class="rank-percent">${percent.toFixed(1)}%</span></div>
          </div>`;
        })
        .join('')
    : '<p class="chart-empty">Belum ada biaya tercatat.</p>';
}

function renderComposition() {
  const donut = document.getElementById('compositionDonut');
  const legend = document.getElementById('compositionLegend');
  const insight = document.getElementById('cashInsight');
  if (!donut || !legend || !insight) return;
  const expensePercent = summary.pendapatan ? (summary.biaya / summary.pendapatan) * 100 : 0;
  const profitPercent = 100 - expensePercent;
  const difference = summary.kas - summary.laba;
  const hasData = journal.length > 0;

  if (hasData && summary.pendapatan > 0) {
    donut.style.background = `conic-gradient(#f59e0b 0 ${expensePercent}%, #2f6bff ${expensePercent}% 100%)`;
    donut.innerHTML = `<div class="donut-label"><strong>${profitPercent.toFixed(1)}%</strong><span>margin laba</span></div>`;
  } else {
    donut.style.background = `#e2e8f0`;
    donut.innerHTML = `<div class="donut-label"><strong>0%</strong><span>belum ada data</span></div>`;
  }

  legend.innerHTML = hasData
    ? `
    <div><span><i style="background:#f59e0b"></i>Total biaya</span><strong>${shortMoney(summary.biaya)}</strong></div>
    <div><span><i style="background:#2f6bff"></i>Laba bersih</span><strong>${shortMoney(summary.laba)}</strong></div>
    <div><span><i style="background:#12a678"></i>Total pendapatan</span><strong>${shortMoney(summary.pendapatan)}</strong></div>`
    : '<p class="chart-empty">Belum ada transaksi.</p>';
  insight.innerHTML = hasData
    ? `Kas setara kas tercatat <strong>${money(summary.kas)}</strong>, ${
        difference >= 0 ? 'lebih tinggi' : 'lebih rendah'
      } <strong>${money(Math.abs(difference))}</strong> dibanding laba bersih tahun berjalan.`
    : '';
}

function renderIncomeStatement() {
  const revenueBody = document.getElementById('revenueBody');
  const expenseBody = document.getElementById('expenseBody');
  if (!revenueBody || !expenseBody) return;
  const rows = (items) => items.map((item) => `
    <tr>
      <td class="account">${escapeHtml(item.code)}</td>
      <td>${escapeHtml(item.name)}</td>
      <td class="num right">${money(item.amount)}</td>
    </tr>`).join('');
  const sum = (items) => items.reduce((total, item) => total + item.amount, 0);
  const revenue = report.revenueAccounts;
  const expense = report.expenseAccounts;

  revenueBody.innerHTML = `${rows(revenue)}<tr class="total-row"><td></td><td>Total Pendapatan</td><td class="num right">${money(sum(revenue))}</td></tr>`;
  expenseBody.innerHTML = `${rows(expense)}<tr class="total-row"><td></td><td>Total Biaya</td><td class="num right">${money(sum(expense))}</td></tr>`;

  const incomeMeta = document.getElementById('incomeMeta');
  if (incomeMeta) incomeMeta.textContent = `${revenue.length + expense.length} akun · ${summary.laba >= 0 ? 'Laba' : 'Rugi'} ${money(Math.abs(summary.laba))}`;
  const incomeNote = document.getElementById('incomeNote');
  if (incomeNote) incomeNote.textContent = `Periode ${meta.period}. Angka mengikuti jurnal yang tersimpan di aplikasi.`;
  const incomeSummary = document.getElementById('incomeSummary');
  if (incomeSummary) {
    incomeSummary.innerHTML = `
      <div><span>Total Pendapatan</span><strong>${money(summary.pendapatan)}</strong></div>
      <div><span>Total Biaya</span><strong>${money(summary.biaya)}</strong></div>
      <div class="income-total"><span>${summary.laba >= 0 ? 'Laba Bersih' : 'Rugi Bersih'}</span><strong>${money(Math.abs(summary.laba))}</strong></div>`;
  }
}

function renderBalance() {
  const assetBody = document.getElementById('assetBody');
  const liabilityBody = document.getElementById('liabilityBody');
  if (!assetBody || !liabilityBody) return;
  const renderRows = (items) =>
    items
      .map(
        (item) => `<tr>
          <td class="account">${escapeHtml(item.code)}</td>
          <td>${escapeHtml(item.name)}</td>
          <td class="num right">${money(item.amount)}</td>
        </tr>`,
      )
      .join('');

  const sum = (items) => items.reduce((total, item) => total + item.amount, 0);
  const assets = report.assets;
  const liabilities = report.liabilities;

  assetBody.innerHTML = `${renderRows(assets)}<tr class="total-row"><td></td><td>Total Aset</td><td class="num right">${money(sum(assets))}</td></tr>`;
  liabilityBody.innerHTML = `${renderRows(liabilities)}<tr class="total-row"><td></td><td>Total Liabilitas &amp; Ekuitas</td><td class="num right">${money(sum(liabilities))}</td></tr>`;
}

function buildWorksheet() {
  const activeRows = report.trialBalance.rows.filter(
    (row) => row.openingDebit || row.openingKredit || row.debit || row.kredit,
  );
  const rows = activeRows.map((row) => {
    const isIncome = row.report === 'laba-rugi';
    return {
      code: row.code,
      name: row.name,
      posSaldo: row.side === 'debet' ? 'Debet' : 'Kredit',
      posLaporan: isIncome ? 'Laba Rugi' : 'Neraca',
      saldoDebet: row.saldoDebet,
      saldoKredit: row.saldoKredit,
      labaDebet: isIncome ? row.saldoDebet : 0,
      labaKredit: isIncome ? row.saldoKredit : 0,
      neracaDebet: isIncome ? 0 : row.saldoDebet,
      neracaKredit: isIncome ? 0 : row.saldoKredit,
    };
  });
  const keys = ['saldoDebet', 'saldoKredit', 'labaDebet', 'labaKredit', 'neracaDebet', 'neracaKredit'];
  const totals = (source) =>
    Object.fromEntries(keys.map((key) => [key, source.reduce((sum, row) => sum + row[key], 0)]));
  const before = totals(rows);
  const closing = {
    code: '',
    name: summary.laba >= 0 ? 'Laba Bersih' : 'Rugi Bersih',
    posSaldo: '',
    posLaporan: 'Penutup',
    saldoDebet: 0,
    saldoKredit: 0,
    labaDebet: summary.laba >= 0 ? summary.laba : 0,
    labaKredit: summary.laba < 0 ? -summary.laba : 0,
    neracaDebet: summary.laba < 0 ? -summary.laba : 0,
    neracaKredit: summary.laba >= 0 ? summary.laba : 0,
  };

  return { rows, before, closing, after: totals([...rows, closing]) };
}

function renderWorksheet() {
  const body = document.getElementById('worksheetBody');
  const meta = document.getElementById('worksheetMeta');
  if (!body || !meta) return;
  const hasData = report.trialBalance.rows.some(
    (row) => row.openingDebit || row.openingKredit || row.debit || row.kredit,
  );
  if (!hasData) {
    body.innerHTML = '<tr class="empty-row"><td colspan="10">Belum ada transaksi. Isi lewat form input transaksi untuk melihat neraca jalur.</td></tr>';
    meta.textContent = '';
    return;
  }

  const { rows, before, closing, after } = buildWorksheet();
  const cell = (value) => `<td class="num right">${value ? money(value) : '—'}</td>`;
  const renderRow = (row, className = '') => `<tr${className ? ` class="${className}"` : ''}>
    <td class="account">${escapeHtml(row.code)}</td>
    <td>${escapeHtml(row.name)}</td>
    <td class="pos">${escapeHtml(row.posSaldo)}</td>
    <td class="pos">${escapeHtml(row.posLaporan)}</td>
    ${cell(row.saldoDebet)}
    ${cell(row.saldoKredit)}
    ${cell(row.labaDebet)}
    ${cell(row.labaKredit)}
    ${cell(row.neracaDebet)}
    ${cell(row.neracaKredit)}
  </tr>`;
  const totalRow = (label, values, className) =>
    renderRow({ code: '', name: label, posSaldo: '', posLaporan: '', ...values }, className);

  body.innerHTML = `${rows.map((row) => renderRow(row)).join('')}
    ${totalRow('Jumlah', before, 'total-row')}
    ${renderRow(closing, 'closing-row')}
    ${totalRow('Jumlah setelah laba', after, 'total-row')}`;
  meta.textContent = `${rows.length} akun · ${summary.laba >= 0 ? 'Laba' : 'Rugi'} ${money(Math.abs(summary.laba))}`;
}

function accountLabel(account) {
  const sideLabel = account.side === 'debet' ? 'Debet' : 'Kredit';
  return `${account.code} · ${account.name} (normal ${sideLabel})`;
}

function accountSelectOptionsHtml() {
  return getAccountList().map((account) =>
    `<option value="${escapeHtml(account.code)}">${escapeHtml(accountLabel(account))}</option>`,
  ).join('');
}

function accountListHtml(filter = '') {
  const needle = filter.trim().toLowerCase();
  return getAccountList()
    .filter((account) => !needle || `${account.code} ${account.name}`.toLowerCase().includes(needle))
    .map((account) =>
      `<button type="button" class="combo-option" role="option" data-code="${escapeHtml(account.code)}">${escapeHtml(accountLabel(account))}</button>`,
    )
    .join('') || '<div class="combo-empty">Akun tidak ditemukan.</div>';
}

function resolveAccountInput(value) {
  const text = String(value || '').trim();
  if (!text) return null;
  const accounts = getAccountList();
  const needle = text.toLowerCase();
  const exact = accounts.find((account) =>
    account.code.toLowerCase() === needle
    || accountLabel(account).toLowerCase() === needle
    || account.name.toLowerCase() === needle,
  );
  if (exact) return exact;
  const matches = accounts.filter((account) =>
    `${account.code} ${account.name}`.toLowerCase().includes(needle),
  );
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) {
    throw new Error(`Akun "${text}" cocok dengan ${matches.length} akun. Pilih dari daftar atau gunakan kode lengkap.`);
  }
  throw new Error(`Akun "${text}" tidak ditemukan.`);
}

function refreshAccountOptions() {
  const list = document.getElementById('accountOptions');
  if (list && list.tagName !== 'DATALIST') list.innerHTML = accountListHtml();
  ['txDebit', 'txCredit', 'txAccount'].forEach((id) => {
    const select = document.getElementById(id);
    if (!select || select.tagName !== 'SELECT') return;
    const selected = select.value;
    select.innerHTML = `<option value="">Pilih akun</option>${accountSelectOptionsHtml()}`;
    select.value = selected && [...select.options].some((option) => option.value === selected) ? selected : '';
  });
  document.querySelectorAll('.extra-account').forEach((select) => {
    const selected = select.value;
    select.innerHTML = `<option value="">Pilih akun</option>${accountSelectOptionsHtml()}`;
    select.value = selected && [...select.options].some((option) => option.value === selected) ? selected : '';
  });
}

function accountType(code) {
  const account = getAccountList().find((item) => item.code === code || item.sourceCode === code || item.helper === code);
  if (!account) return 'lainnya';
  if (CASH_EQUIVALENT_NAMES.has(account.name)) return 'kas';
  if (account.type === 'pendapatan') return 'pendapatan';
  if (account.type === 'biaya') return 'biaya';
  return 'lainnya';
}

function refreshFilterOptions() {
  const monthFilter = document.getElementById('monthFilter');
  if (!monthFilter) return;
  const selectedMonth = monthFilter.value;
  monthFilter.innerHTML = '<option value="">Semua bulan</option>';
  monthly.forEach((item) => {
    const option = document.createElement('option');
    option.value = item.key;
    option.textContent = item.label;
    monthFilter.appendChild(option);
  });
  monthFilter.value = monthly.some((item) => item.key === selectedMonth) ? selectedMonth : '';

  const accounts = [...new Map(journal.map((row) => [row[2], { code: row[2], name: row[3] }])).values()].sort((a, b) => a.code.localeCompare(b.code));
  const accountFilter = document.getElementById('accountFilter');
  const selectedAccount = accountFilter.value;
  accountFilter.innerHTML = '<option value="">Semua akun</option>';
  accounts.forEach((account) => {
    const option = document.createElement('option');
    option.value = account.code;
    option.textContent = `${account.code} · ${account.name}`;
    accountFilter.appendChild(option);
  });
  accountFilter.value = accounts.some((account) => account.code === selectedAccount) ? selectedAccount : '';
}

function initFilters() {
  if (!document.getElementById('journalSearch')) return;
  ['journalSearch', 'monthFilter', 'accountFilter', 'typeFilter'].forEach((id) => {
    document.getElementById(id).addEventListener('input', () => {
      currentPage = 1;
      applyFilters();
    });
  });

  document.getElementById('prevPage').addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage -= 1;
      renderJournalTable();
    }
  });

  document.getElementById('nextPage').addEventListener('click', () => {
    if (currentPage < Math.max(1, Math.ceil(filteredJournal.length / pageSize))) {
      currentPage += 1;
      renderJournalTable();
    }
  });

  document.getElementById('exportBtn').addEventListener('click', exportJournal);

  applyFilters();
}

function initPrintButton() {
  const button = document.getElementById('printBtn');
  if (button) button.addEventListener('click', () => window.print());
}

function applyFilters() {
  if (!document.getElementById('journalSearch')) return;
  const query = document.getElementById('journalSearch').value.trim().toLowerCase();
  const month = document.getElementById('monthFilter').value;
  const account = document.getElementById('accountFilter').value;
  const type = document.getElementById('typeFilter').value;

  filteredJournal = journal.filter((row) => {
    const [date, description, code, name] = row;
    if (query && !`${description} ${code} ${name}`.toLowerCase().includes(query)) return false;
    if (month && date.slice(0, 7) !== month) return false;
    if (account && code !== account) return false;
    if (type && accountType(code) !== type) return false;
    return true;
  });

  renderJournalTable();
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const element = document.createElement('div');
  element.className = `toast ${type === 'error' ? 'error' : ''}`.trim();
  element.textContent = message;
  container.appendChild(element);
  setTimeout(() => {
    element.style.opacity = '0';
    element.style.transform = 'translateY(8px)';
    setTimeout(() => element.remove(), 250);
  }, 3200);
}

function renderJournalTable() {
  const body = document.getElementById('journalBody');
  if (!body) return;
  const totalPages = Math.max(1, Math.ceil(filteredJournal.length / pageSize));
  currentPage = Math.min(currentPage, totalPages);
  const start = (currentPage - 1) * pageSize;
  const rows = filteredJournal.slice(start, start + pageSize);
  const debit = filteredJournal.reduce((sum, row) => sum + row[4], 0);
  const credit = filteredJournal.reduce((sum, row) => sum + row[5], 0);

  body.innerHTML = rows.length
    ? rows
        .map(
          (row) => `<tr>
            <td class="date">${formatDate(row[0])}</td>
            <td class="tx-desc">${escapeHtml(row[1])}</td>
            <td class="account"><span class="code-badge">${escapeHtml(row[2])}</span> ${escapeHtml(row[3])}</td>
            <td class="num right num-debet">${row[4] ? money(row[4]) : '—'}</td>
            <td class="num right num-kredit">${row[5] ? money(row[5]) : '—'}</td>
            <td class="center">
              ${
                row[6]
                  ? `<button class="icon-btn danger delete-tx-btn" type="button" data-ref="${escapeHtml(row[6])}" title="Hapus transaksi ini" aria-label="Hapus transaksi">
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>`
                  : '—'
              }
            </td>
          </tr>`,
        )
        .join('')
    : '<tr class="empty-row"><td colspan="6">Tidak ada transaksi yang cocok dengan filter.</td></tr>';

  const first = filteredJournal.length ? start + 1 : 0;
  const last = Math.min(start + pageSize, filteredJournal.length);
  document.getElementById('journalCount').textContent = `Menampilkan ${numberFormatter.format(first)}–${numberFormatter.format(last)} dari ${numberFormatter.format(filteredJournal.length)} baris`;
  document.getElementById('journalTotals').textContent = `Debet ${shortMoney(debit)} · Kredit ${shortMoney(credit)}`;
  document.getElementById('pageInfo').textContent = `Halaman ${currentPage} dari ${totalPages}`;
  document.getElementById('prevPage').disabled = currentPage === 1;
  document.getElementById('nextPage').disabled = currentPage === totalPages;
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportJournal() {
  const lines = [['Tanggal', 'Keterangan', 'Akun', 'Nama Akun', 'Debet', 'Kredit']];
  filteredJournal.forEach((row) => lines.push([formatDate(row[0]), row[1], row[2], row[3], row[4], row[5]]));
  const csv = lines
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
    .join('\r\n');
  downloadFile(`\uFEFF${csv}`, `jurnal-umum-${meta.period}.csv`, 'text/csv;charset=utf-8;');
  showToast('File CSV berhasil diunduh.');
}

function exportBackup() {
  downloadFile(
    exportFinanceBackup(),
    `cadangan-keuangan-${meta.period}-${new Date().toISOString().slice(0, 10)}.json`,
    'application/json',
  );
  showToast('Cadangan JSON berhasil diunduh.');
}

function importBackup(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const result = importFinanceBackup(reader.result);
      if (!result.ok) throw new Error(result.errors.join(' '));
      syncReport();
      renderDashboard();
      showToast(`Cadangan dimuat: ${result.state.entries.length} transaksi.`);
    } catch (error) {
      showToast(`Cadangan ditolak: ${error.message}`, 'error');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function initTransactionForm() {
  const form = document.getElementById('journalForm');
  if (!form) return;
  const dateInput = document.getElementById('txDate');
  const descriptionInput = document.getElementById('txDescription');
  const account = document.getElementById('txAccount');
  const accountOptions = document.getElementById('accountOptions');
  const accountCombo = document.getElementById('accountCombo');
  const accountToggle = document.getElementById('accountToggle');
  const side = document.getElementById('txSide');
  const amount = document.getElementById('txAmount');
  const item = document.getElementById('txItem');
  const mutation = document.getElementById('txMutation');
  const quantity = document.getElementById('txQuantity');
  const status = document.getElementById('formStatus');
  const draftBody = document.getElementById('pendataanBody');
  const draftSummary = document.getElementById('pendataanSummary');
  const editInfo = document.getElementById('lineEditInfo');
  const addButton = document.getElementById('txAddLineBtn');
  if (!dateInput || !descriptionInput || !account || !accountOptions || !accountCombo || !accountToggle || !side || !amount || !item || !mutation || !quantity || !status || !draftBody || !draftSummary || !editInfo || !addButton) return;

  let pendingLines = [];
  let editingIndex = null;
  let selectedAccountCode = '';
  let accountMatches = [];
  let activeAccountIndex = -1;

  const setStatus = (message, type = '') => {
    status.textContent = message;
    status.className = `form-status ${type}`.trim();
  };

  const getTotals = () => pendingLines.reduce((totals, line) => {
    if (line.side === 'debet') totals.debit += line.amount;
    else totals.kredit += line.amount;
    return totals;
  }, { debit: 0, kredit: 0 });

  const renderDraft = () => {
    draftBody.innerHTML = pendingLines.map((line, index) => {
      const selected = getAccountList().find((entry) => entry.code === line.code);
      return `<tr>
        <td class="account"><span class="code-badge">${escapeHtml(line.code)}</span></td>
        <td>${escapeHtml(selected?.name || '')}</td>
        <td>${line.side === 'debet' ? 'Debet' : 'Kredit'}</td>
        <td class="num right">${money(line.amount)}</td>
        <td class="center">
          <button class="btn btn-ghost edit-line-btn" type="button" data-index="${index}">Ubah</button>
          <button class="btn btn-ghost danger-btn remove-line-btn" type="button" data-index="${index}">Hapus</button>
        </td>
      </tr>`;
    }).join('') || '<tr class="empty-row"><td colspan="5">Belum ada baris. Isi akun, posisi, dan nominal lalu klik Tambah ke Pendataan.</td></tr>';

    const totals = getTotals();
    const balanced = pendingLines.length > 0 && Math.abs(totals.debit - totals.kredit) <= 0.01;
    draftSummary.classList.toggle('balanced', balanced);
    draftSummary.innerHTML = `
      <div><span>Total Debet</span><strong>${money(totals.debit)}</strong></div>
      <div><span>Total Kredit</span><strong>${money(totals.kredit)}</strong></div>
      <div><span>Selisih</span><strong>${money(Math.abs(totals.debit - totals.kredit))}</strong></div>`;
  };

  const clearLineInputs = () => {
    account.value = '';
    selectedAccountCode = '';
    activeAccountIndex = -1;
    hideAccountList();
    side.value = 'debet';
    amount.value = '';
    editingIndex = null;
    addButton.textContent = 'Tambah ke Pendataan';
    editInfo.textContent = '';
  };

  const resetForm = () => {
    form.reset();
    pendingLines = [];
    dateInput.value = new Date().toISOString().slice(0, 10);
    clearLineInputs();
    renderDraft();
    setStatus('');
  };

  const updateActiveAccountOption = () => {
    accountOptions.querySelectorAll('.combo-option').forEach((option, index) => {
      option.classList.toggle('active', index === activeAccountIndex);
    });
  };

  const renderAccountList = (filter = '') => {
    const needle = filter.trim().toLowerCase();
    accountMatches = getAccountList().filter((entry) =>
      !needle || `${entry.code} ${entry.name}`.toLowerCase().includes(needle));
    accountOptions.innerHTML = accountMatches.map((entry) =>
      `<button type="button" class="combo-option" role="option" data-code="${escapeHtml(entry.code)}">${escapeHtml(accountLabel(entry))}</button>`,
    ).join('') || '<div class="combo-empty">Akun tidak ditemukan.</div>';
    activeAccountIndex = accountMatches.length ? 0 : -1;
    updateActiveAccountOption();
  };

  const showAccountList = (filter = account.value) => {
    renderAccountList(filter);
    accountOptions.hidden = false;
    account.setAttribute('aria-expanded', 'true');
  };

  const hideAccountList = () => {
    accountOptions.hidden = true;
    account.setAttribute('aria-expanded', 'false');
  };

  const chooseAccount = (code) => {
    const selected = getAccountList().find((entry) => entry.code === code);
    if (!selected) return;
    selectedAccountCode = selected.code;
    account.value = accountLabel(selected);
    hideAccountList();
    setStatus('');
  };

  const moveAccountOption = (step) => {
    if (!accountMatches.length) return;
    activeAccountIndex = (activeAccountIndex + step + accountMatches.length) % accountMatches.length;
    updateActiveAccountOption();
    accountOptions.querySelector('.combo-option.active')?.scrollIntoView({ block: 'nearest' });
  };

  account.addEventListener('focus', () => {
    account.select();
    showAccountList('');
  });
  account.addEventListener('input', () => {
    selectedAccountCode = '';
    showAccountList(account.value);
  });
  account.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (accountOptions.hidden) showAccountList(account.value);
      moveAccountOption(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (accountOptions.hidden) showAccountList(account.value);
      moveAccountOption(-1);
    } else if (event.key === 'Enter') {
      if (!accountOptions.hidden && activeAccountIndex >= 0) {
        event.preventDefault();
        chooseAccount(accountMatches[activeAccountIndex].code);
      }
    } else if (event.key === 'Escape') {
      hideAccountList();
    }
  });
  accountOptions.addEventListener('click', (event) => {
    const option = event.target.closest('.combo-option');
    if (option) chooseAccount(option.dataset.code);
  });
  accountToggle.addEventListener('click', () => {
    if (accountOptions.hidden) account.focus();
    else hideAccountList();
  });
  document.addEventListener('click', (event) => {
    if (!accountCombo.contains(event.target)) hideAccountList();
  });

  const fillItemOptions = () => {
    const selected = item.value;
    item.innerHTML = '<option value="">Tanpa mutasi barang</option>';
    getInventoryItemDefinitions().forEach((product) => {
      const option = document.createElement('option');
      option.value = product.code;
      option.textContent = `${product.code} · ${product.name} (Rp${product.price.toLocaleString('id-ID')}/${product.unit || '-'})`;
      item.appendChild(option);
    });
    if (selected && [...item.options].some((option) => option.value === selected)) item.value = selected;
  };
  fillItemOptions();

  const updateAmount = () => {
    const product = getInventoryItemDefinitions().find((entry) => entry.code === item.value);
    const qty = Number(quantity.value);
    if (product && mutation.value && qty > 0) {
      amount.value = (product.price * qty).toFixed(2);
    }
  };

  [item, mutation, quantity].forEach((element) => {
    element.addEventListener('input', updateAmount);
    element.addEventListener('change', updateAmount);
  });

  form.addEventListener('submit', (event) => event.preventDefault());

  addButton.addEventListener('click', () => {
    try {
      if (!dateInput.value) throw new Error('Tanggal wajib diisi.');
      if (!descriptionInput.value.trim()) throw new Error('Keterangan wajib diisi.');
      const selected = selectedAccountCode
        ? getAccountList().find((entry) => entry.code === selectedAccountCode)
        : resolveAccountInput(account.value);
      if (!selected) throw new Error('Pilih akun dari daftar terlebih dahulu.');
      const code = selected.code;
      const posisi = side.value;
      if (!posisi) throw new Error('Pilih posisi Debet atau Kredit.');
      const nominal = Number(amount.value);
      if (!Number.isFinite(nominal) || nominal <= 0) throw new Error('Nominal harus lebih dari 0.');
      if (selected.side !== posisi) {
        throw new Error(`${selected.code} ${selected.name} normalnya di ${selected.side === 'debet' ? 'Debet' : 'Kredit'}. Sesuaikan posisi.`);
      }

      const wasEditing = editingIndex !== null;
      const line = { code, side: posisi, amount: nominal };
      if (wasEditing) pendingLines[editingIndex] = line;
      else pendingLines.push(line);
      clearLineInputs();
      renderDraft();
      setStatus(wasEditing
        ? 'Baris pendataan diperbarui.'
        : `${code} · ${posisi} ${money(nominal)} ditambahkan ke pendataan.`, 'success');
    } catch (error) {
      setStatus(error.message, 'error');
      showToast(error.message, 'error');
    }
  });

  document.getElementById('invAddBtn')?.addEventListener('click', () => {
    const codeField = document.getElementById('invItemCode');
    const nameField = document.getElementById('invItemName');
    const unitField = document.getElementById('invItemUnit');
    const priceField = document.getElementById('invItemPrice');
    const initialField = document.getElementById('invItemInitial');
    if (!codeField || !nameField || !unitField || !priceField || !initialField) return;
    try {
      const code = codeField.value.trim().toUpperCase();
      const name = nameField.value.trim();
      if (!code) throw new Error('Kode barang wajib diisi.');
      if (!name) throw new Error('Nama barang wajib diisi.');
      const price = Number(priceField.value);
      if (!Number.isFinite(price) || price < 0) throw new Error('Harga barang tidak valid.');
      const saved = addInventoryItemFromJournal({
        code,
        name,
        unit: unitField.value.trim(),
        price,
        initialStock: Math.max(0, Number(initialField.value) || 0),
        category: '',
        location: '',
        minStock: 0,
      });
      fillItemOptions();
      item.value = saved.code;
      updateAmount();
      codeField.value = '';
      nameField.value = '';
      unitField.value = '';
      priceField.value = '0';
      initialField.value = '0';
      setStatus(`Barang ${saved.code} · ${saved.name} ditambahkan ke inventaris.`, 'success');
      showToast(`Barang ${saved.code} tersedia untuk mutasi jurnal.`);
    } catch (error) {
      setStatus(error.message, 'error');
      showToast(error.message, 'error');
    }
  });

  draftBody.addEventListener('click', (event) => {
    const editButton = event.target.closest('.edit-line-btn');
    if (editButton) {
      const index = Number(editButton.dataset.index);
      const line = pendingLines[index];
      if (!line) return;
      const selected = getAccountList().find((entry) => entry.code === line.code);
      selectedAccountCode = selected ? selected.code : '';
      account.value = selected ? accountLabel(selected) : line.code;
      side.value = line.side;
      amount.value = String(line.amount);
      editingIndex = index;
      addButton.textContent = 'Perbarui Pendataan';
      editInfo.textContent = `Mengubah baris ${index + 1}. Klik Perbarui Pendataan untuk menyimpan perubahan.`;
      setStatus('');
      account.focus();
      return;
    }

    const removeButton = event.target.closest('.remove-line-btn');
    if (!removeButton) return;
    const index = Number(removeButton.dataset.index);
    if (!Number.isInteger(index) || !pendingLines[index]) return;
    pendingLines.splice(index, 1);
    if (editingIndex !== null) {
      if (index === editingIndex) clearLineInputs();
      else if (index < editingIndex) editingIndex -= 1;
    }
    renderDraft();
    setStatus('Baris dihapus dari pendataan.', 'info');
  });

  const clearDraft = () => {
    pendingLines = [];
    clearLineInputs();
    renderDraft();
    setStatus('Pendataan dikosongkan.', 'info');
  };

  const saveButton = document.getElementById('saveJournalBtn');
  saveButton?.addEventListener('click', () => {
    try {
      if (!dateInput.value) throw new Error('Tanggal wajib diisi.');
      if (!descriptionInput.value.trim()) throw new Error('Keterangan wajib diisi.');
      if (!pendingLines.length) throw new Error('Belum ada baris di pendataan. Tambahkan baris Debet dan Kredit.');
      if (!pendingLines.some((line) => line.side === 'debet')) throw new Error('Jurnal harus memiliki baris Debet.');
      if (!pendingLines.some((line) => line.side === 'kredit')) throw new Error('Jurnal harus memiliki baris Kredit.');
      const totals = getTotals();
      if (Math.abs(totals.debit - totals.kredit) > 0.01) {
        throw new Error(`Jurnal tidak seimbang: debit ${money(totals.debit)} vs kredit ${money(totals.kredit)}.`);
      }

      const lines = pendingLines.map((line) => (line.side === 'debet'
        ? { code: line.code, debit: line.amount, kredit: 0 }
        : { code: line.code, debit: 0, kredit: line.amount }));

      const product = getInventoryItemDefinitions().find((entry) => entry.code === item.value);
      const mutationType = mutation.value;
      const qty = Number(quantity.value);
      const stockLines = lines.filter((line) => line.code === '1.2.13');
      if (stockLines.length && (!product || !mutationType || qty <= 0)) {
        throw new Error('Transaksi PERSEDIAAN membutuhkan barang, arah mutasi, dan jumlah.');
      }
      if (!stockLines.length && mutationType) {
        throw new Error('Mutasi barang hanya berlaku untuk akun PERSEDIAAN (1.2.13).');
      }
      if (mutationType === 'in' && !stockLines.some((line) => line.debit > 0)) {
        throw new Error('Mutasi barang masuk harus dibukukan ke debit akun PERSEDIAAN (1.2.13).');
      }
      if (mutationType === 'out' && !stockLines.some((line) => line.kredit > 0)) {
        throw new Error('Mutasi barang keluar harus dibukukan ke kredit akun PERSEDIAAN (1.2.13).');
      }
      if (mutationType) {
        const stockLine = mutationType === 'in'
          ? stockLines.find((line) => line.debit > 0)
          : stockLines.find((line) => line.kredit > 0);
        if (stockLine) stockLine.mutation = { item: product.code, type: mutationType, quantity: qty };
      }

      addJournalEntry({
        date: dateInput.value,
        description: descriptionInput.value.trim(),
        ref: `JRN-${Date.now().toString(36).toUpperCase()}`,
        lines,
      });
      syncReport();
      renderDashboard();
      const count = loadJournalEntries().length;
      resetForm();
      setStatus(`Tersimpan (${count} transaksi). Data kini tampil di Jurnal Umum, Neraca Jalur, Laba Rugi, dan Neraca.`, 'success');
      showToast('Jurnal tersimpan dan seluruh laporan diperbarui!');
    } catch (error) {
      setStatus(error.message, 'error');
      showToast(error.message, 'error');
    }
  });

  document.getElementById('clearDraftBtn')?.addEventListener('click', clearDraft);
  document.getElementById('backupJournalBtn')?.addEventListener('click', exportBackup);
  document.getElementById('importJournalBtn')?.addEventListener('click', () => document.getElementById('journalImportFile').click());
  document.getElementById('journalImportFile')?.addEventListener('change', importBackup);

  document.getElementById('clearJournalBtn')?.addEventListener('click', () => {
    if (!journal.length) {
      showToast('Jurnal sudah kosong.');
      return;
    }
    if (!confirm('Yakin ingin mengosongkan seluruh data transaksi jurnal? Cadangan JSON akan diunduh otomatis sebelum data dikosongkan.')) return;
    exportBackup();
    clearJournalEntries();
    syncReport();
    renderDashboard();
    resetForm();
    setStatus('Seluruh transaksi jurnal telah dikosongkan.', 'info');
    showToast('Jurnal berhasil dikosongkan.');
  });

  resetForm();
}

function initJournalActions() {
  const body = document.getElementById('journalBody');
  if (!body) return;
  body.addEventListener('click', (event) => {
    const button = event.target.closest('.delete-tx-btn');
    if (!button) return;
    const ref = button.dataset.ref;
    if (!ref) return;
    if (!confirm('Hapus transaksi ini dari jurnal umum?')) return;
    deleteJournalEntry(ref);
    syncReport();
    renderDashboard();
    showToast('Transaksi berhasil dihapus.');
  });
}

function renderAccountList() {
  const body = document.getElementById('accountBody');
  if (!body) return;
  const query = document.getElementById('accountSearch').value.trim().toLowerCase();
  const accounts = getAccountList().filter((account) =>
    `${account.code} ${account.name}`.toLowerCase().includes(query),
  );
  document.getElementById('accountCount').textContent = `${accounts.length} akun`;
  body.innerHTML = accounts.map((account) => `
    <tr>
      <td class="account"><span class="code-badge">${escapeHtml(account.code)}</span>${account.custom ? ' <span class="pill-optional">Baru</span>' : ''}</td>
      <td>${escapeHtml(account.name)}</td>
      <td>${escapeHtml(account.type)}</td>
      <td>${account.side === 'debet' ? 'Debet' : 'Kredit'}</td>
      <td>${account.report === 'neraca' ? 'Neraca' : 'Laba Rugi'}</td>
      <td><button class="btn btn-ghost danger-btn delete-account-btn" type="button" data-code="${escapeHtml(account.code)}">Hapus</button></td>
    </tr>`).join('') || '<tr><td colspan="6" class="empty-row">Tidak ada akun yang cocok.</td></tr>';
}

function afterAccountChange() {
  syncReport();
  renderDashboard();
  refreshAccountOptions();
  renderAccountList();
}

function initAccountManager() {
  const form = document.getElementById('accountForm');
  if (!form) return;
  const status = document.getElementById('accountStatus');
  const search = document.getElementById('accountSearch');
  const body = document.getElementById('accountBody');
  if (!status || !search || !body) return;
  const setStatus = (message, type = '') => {
    status.textContent = message;
    status.className = `form-status ${type}`.trim();
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const raw = {
      code: document.getElementById('acctCode').value,
      name: document.getElementById('acctName').value,
      type: document.getElementById('acctType').value,
      side: document.getElementById('acctSide').value,
    };
    try {
      const result = addAccount(raw);
      form.reset();
      document.getElementById('acctType').value = 'aset';
      document.getElementById('acctSide').value = 'debet';
      const message = result.restored
        ? `Akun ${result.account.code} dipulihkan.`
        : `Akun ${result.account.code} · ${result.account.name} ditambahkan.`;
      afterAccountChange();
      setStatus(message, 'success');
      showToast(message);
    } catch (error) {
      setStatus(error.message, 'error');
      showToast(error.message, 'error');
    }
  });

  search.addEventListener('input', renderAccountList);
  body.addEventListener('click', (event) => {
    const button = event.target.closest('.delete-account-btn');
    if (!button) return;
    const code = button.dataset.code;
    const usage = getAccountUsage(code);
    if (usage.used) {
      const message = `Akun ${code} tidak bisa dihapus karena ${usage.reason}.`;
      setStatus(message, 'error');
      showToast(message, 'error');
      return;
    }
    if (!confirm(`Hapus akun ${code} dari daftar akun?`)) return;
    try {
      deleteAccount(code);
      afterAccountChange();
      setStatus(`Akun ${code} dihapus.`, 'info');
      showToast(`Akun ${code} dihapus.`);
    } catch (error) {
      setStatus(error.message, 'error');
      showToast(error.message, 'error');
    }
  });

  renderAccountList();
}

function initNavigation() {
  const toggle = document.getElementById('mobileToggle');
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  const closeButton = document.getElementById('sidebarClose');
  const allLinks = [...document.querySelectorAll('.nav-link')];
  const links = allLinks.filter((link) => link.getAttribute('href').startsWith('#'));

  const setSidebar = (open) => {
    sidebar.classList.toggle('open', open);
    backdrop.classList.toggle('open', open);
    document.body.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  };

  toggle.addEventListener('click', () => setSidebar(!sidebar.classList.contains('open')));
  closeButton.addEventListener('click', () => setSidebar(false));
  backdrop.addEventListener('click', () => setSidebar(false));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setSidebar(false);
  });
  allLinks.forEach((link) => link.addEventListener('click', () => setSidebar(false)));

  const targets = links.map((link) => document.querySelector(link.getAttribute('href'))).filter(Boolean);
  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      links.forEach((link) => link.classList.toggle('active', link.getAttribute('href') === `#${visible.target.id}`));
    },
    { rootMargin: '-15% 0px -60% 0px', threshold: [0, 0.25, 0.5] },
  );
  targets.forEach((target) => observer.observe(target));
}

initFilters();
initJournalActions();
initPrintButton();
renderDashboard();
initNavigation();
initTransactionForm();
initAccountManager();

document.addEventListener('dinetkan:remote-updated', () => {
  syncReport();
  renderDashboard();
  refreshAccountOptions();
  if (document.getElementById('accountBody')) renderAccountList();
});
document.addEventListener('dinetkan:sync-error', (event) => {
  showToast(`Supabase: ${event.detail?.message || 'gagal sinkron'}`, 'error');
});
