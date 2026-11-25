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

function accountOptionsHtml() {
  return getAccountList().map((account) => {
    const sideLabel = account.side === 'debet' ? 'Debet' : 'Kredit';
    return `<option value="${escapeHtml(account.code)}">${escapeHtml(account.code)} · ${escapeHtml(account.name)} (normal ${sideLabel})</option>`;
  }).join('');
}

function refreshAccountOptions() {
  ['txDebit', 'txCredit'].forEach((id) => {
    const select = document.getElementById(id);
    if (!select) return;
    const selected = select.value;
    select.innerHTML = `<option value="">Pilih akun</option>${accountOptionsHtml()}`;
    select.value = selected && [...select.options].some((option) => option.value === selected) ? selected : '';
  });
  document.querySelectorAll('.extra-account').forEach((select) => {
    const selected = select.value;
    select.innerHTML = `<option value="">Pilih akun</option>${accountOptionsHtml()}`;
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
  const debit = document.getElementById('txDebit');
  const credit = document.getElementById('txCredit');
  const item = document.getElementById('txItem');
  const mutation = document.getElementById('txMutation');
  const quantity = document.getElementById('txQuantity');
  const amount = document.getElementById('txAmount');
  const status = document.getElementById('formStatus');
  const extraLines = document.getElementById('extraLines');
  let lineSequence = 0;

  const setStatus = (message, type = '') => {
    status.textContent = message;
    status.className = `form-status ${type}`.trim();
  };

  debit.innerHTML = `<option value="">Pilih akun</option>${accountOptionsHtml()}`;
  credit.innerHTML = `<option value="">Pilih akun</option>${accountOptionsHtml()}`;

  INVENTORY_ITEMS.forEach((product) => {
    const option = document.createElement('option');
    option.value = product.code;
    option.textContent = `${product.code} · ${product.name} (Rp${product.price.toLocaleString('id-ID')}/${product.unit})`;
    item.appendChild(option);
  });

  const renderExtraLine = () => {
    lineSequence += 1;
    const row = document.createElement('div');
    row.className = 'extra-line';
    row.dataset.line = String(lineSequence);
    row.innerHTML = `
      <select class="extra-account" aria-label="Akun tambahan" required><option value="">Pilih akun</option>${accountOptionsHtml()}</select>
      <select class="extra-side" aria-label="Posisi akun tambahan">
        <option value="debet">Debet</option>
        <option value="kredit">Kredit</option>
      </select>
      <input class="extra-amount" type="number" min="0.01" step="0.01" placeholder="Nominal" aria-label="Nominal baris tambahan" required />
      <button class="btn btn-ghost danger-btn extra-remove" type="button" aria-label="Hapus baris">×</button>`;
    extraLines.appendChild(row);
  };

  const resetForm = () => {
    form.reset();
    extraLines.innerHTML = '';
    lineSequence = 0;
    document.getElementById('txDate').value = new Date().toISOString().slice(0, 10);
    setStatus('');
  };

  const updateAmount = () => {
    const product = INVENTORY_ITEMS.find((entry) => entry.code === item.value);
    const qty = Number(quantity.value);
    if (product && mutation.value && qty > 0) {
      amount.value = (product.price * qty).toFixed(2);
    }
  };

  [item, mutation, quantity].forEach((element) => {
    element.addEventListener('input', updateAmount);
    element.addEventListener('change', updateAmount);
  });

  document.getElementById('txAddLineBtn').addEventListener('click', () => renderExtraLine());
  extraLines.addEventListener('click', (event) => {
    if (!event.target.classList.contains('extra-remove')) return;
    event.target.closest('.extra-line')?.remove();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const date = document.getElementById('txDate').value;
    const description = document.getElementById('txDescription').value.trim();
    const debitCode = debit.value;
    const creditCode = credit.value;
    const nominal = Number(amount.value);
    const product = INVENTORY_ITEMS.find((entry) => entry.code === item.value);
    const mutationType = mutation.value;
    const qty = Number(quantity.value);

    try {
      if (!date) throw new Error('Tanggal wajib diisi.');
      if (!description) throw new Error('Keterangan wajib diisi.');
      if (!debitCode || !creditCode) throw new Error('Pilih akun debit dan kredit.');
      if (debitCode === creditCode) throw new Error('Akun debit dan kredit harus berbeda.');
      const accountList = getAccountList();
      const debitAccount = accountList.find((account) => account.code === debitCode);
      const creditAccount = accountList.find((account) => account.code === creditCode);
      if (debitAccount?.side === 'kredit') {
        throw new Error(`${debitAccount.code} ${debitAccount.name} normalnya di Kredit. Pindah ke kolom Akun Kredit.`);
      }
      if (creditAccount?.side === 'debet') {
        throw new Error(`${creditAccount.code} ${creditAccount.name} normalnya di Debet. Pindah ke kolom Akun Debet.`);
      }
      if (!Number.isFinite(nominal) || nominal <= 0) throw new Error('Nominal harus lebih dari 0.');

      const lines = [
        { code: debitCode, debit: nominal, kredit: 0 },
        { code: creditCode, debit: 0, kredit: nominal },
      ];

      extraLines.querySelectorAll('.extra-line').forEach((row) => {
        const code = row.querySelector('.extra-account').value;
        const side = row.querySelector('.extra-side').value;
        const value = Number(row.querySelector('.extra-amount').value);
        if (!code) throw new Error('Pilih akun pada semua baris tambahan.');
        if (!Number.isFinite(value) || value <= 0) throw new Error('Nominal baris tambahan harus lebih dari 0.');
        const account = getAccountList().find((item) => item.code === code);
        if (account?.side !== side) {
          throw new Error(`${account?.code || code} normalnya di ${account?.side === 'debet' ? 'Debet' : 'Kredit'}. Sesuaikan posisi baris.`);
        }
        lines.push(side === 'debet'
          ? { code, debit: value, kredit: 0 }
          : { code, debit: 0, kredit: value });
      });

      const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);
      const totalKredit = lines.reduce((sum, line) => sum + line.kredit, 0);
      if (Math.abs(totalDebit - totalKredit) > 0.01) {
        throw new Error(`Jurnal tidak seimbang: debit ${money(totalDebit)} vs kredit ${money(totalKredit)}.`);
      }

      const stockLines = lines.filter((line) => line.code === '1.2.13');
      const usesStock = stockLines.length > 0;
      if (usesStock && (!product || !mutationType || qty <= 0)) {
        throw new Error('Transaksi PERSEDIAAN membutuhkan barang, arah mutasi, dan jumlah.');
      }
      if (!usesStock && mutationType) {
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
        if (stockLine) {
          stockLine.mutation = { item: product.code, type: mutationType, quantity: qty };
        }
      }

      addJournalEntry({
        date,
        description,
        ref: `JRN-${Date.now().toString(36).toUpperCase()}`,
        lines,
      });
      syncReport();
      renderDashboard();
      resetForm();
      const count = loadJournalEntries().length;
      setStatus(`Tersimpan. Jurnal kini berisi ${count} transaksi.`, 'success');
      showToast('Transaksi berhasil disimpan!');
    } catch (error) {
      setStatus(error.message, 'error');
      showToast(error.message, 'error');
    }
  });

  document.getElementById('backupJournalBtn').addEventListener('click', exportBackup);
  document.getElementById('importJournalBtn').addEventListener('click', () => document.getElementById('journalImportFile').click());
  document.getElementById('journalImportFile').addEventListener('change', importBackup);

  document.getElementById('clearJournalBtn').addEventListener('click', () => {
    if (!journal.length) {
      showToast('Jurnal sudah kosong.');
      return;
    }
    if (confirm('Yakin ingin mengosongkan seluruh data transaksi jurnal? Cadangan JSON akan diunduh otomatis sebelum data dikosongkan.')) {
      exportBackup();
      clearJournalEntries();
      syncReport();
      renderDashboard();
      setStatus('Seluruh transaksi jurnal telah dikosongkan.', 'info');
      showToast('Jurnal berhasil dikosongkan.');
    }
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
