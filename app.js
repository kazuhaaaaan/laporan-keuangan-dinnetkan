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
  renderKpis();
  renderChart();
  renderCosts();
  renderComposition();
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
  document.title = `${meta.title} ${meta.period}`;
  document.getElementById('retrievedAt').textContent = `Data dibaca: ${formatDate(meta.generatedAt)}`;
  ['sourceLink', 'sheetBtn', 'footerSource'].forEach((id) => {
    document.getElementById(id).setAttribute('href', meta.source);
  });
}

function renderKpis() {
  const latest = monthly[monthly.length - 1] || { revenue: 0, expense: 0, month: '—' };
  const previous = monthly.length > 1 ? monthly[monthly.length - 2] : { revenue: 0, expense: 0, month: '—' };
  const margin = summary.pendapatan ? (summary.laba / summary.pendapatan) * 100 : 0;
  const hasData = journal.length > 0;
  const display = (amount) => (hasData ? money(amount) : '');

  document.getElementById('kpiRevenue').textContent = display(summary.pendapatan);
  document.getElementById('kpiExpense').textContent = display(summary.biaya);
  document.getElementById('kpiProfit').textContent = display(summary.laba);
  document.getElementById('kpiCash').textContent = display(summary.kas);
  document.getElementById('revenueTrend').textContent = hasData ? trend(latest.revenue, previous.revenue, previous.month) : '';
  document.getElementById('expenseTrend').textContent = hasData ? trend(latest.expense, previous.expense, previous.month) : '';
  document.getElementById('marginTag').textContent = hasData ? `MARGIN ${margin.toFixed(2)}%` : '';
}

function renderChart() {
  if (!monthly.length) {
    document.getElementById('monthlyChart').innerHTML = '<p class="chart-empty">Belum ada transaksi. Isi lewat form input transaksi untuk melihat grafik.</p>';
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
  document.getElementById('monthlyChart').innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Grafik pendapatan, biaya, dan laba bulanan">${parts.join('')}</svg>`;
}

function renderCosts() {
  const ranked = [...report.expenseAccounts].sort((a, b) => b.amount - a.amount).slice(0, 8);
  const total = summary.biaya || 1;
  const maximum = ranked[0]?.amount || 1;

  document.getElementById('costCount').textContent = `${report.expenseAccounts.length} akun biaya`;
  document.getElementById('costRanking').innerHTML = ranked.length
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
  const expensePercent = summary.pendapatan ? (summary.biaya / summary.pendapatan) * 100 : 0;
  const profitPercent = 100 - expensePercent;
  const difference = summary.kas - summary.laba;
  const hasData = journal.length > 0;

  const donut = document.getElementById('compositionDonut');
  donut.style.background = `conic-gradient(#f59e0b 0 ${expensePercent}%, #2f6bff ${expensePercent}% 100%)`;
  donut.innerHTML = `<div class="donut-label"><strong>${hasData ? `${profitPercent.toFixed(1)}%` : ''}</strong><span>margin laba</span></div>`;
  document.getElementById('compositionLegend').innerHTML = hasData
    ? `
    <div><span><i style="background:#f59e0b"></i>Total biaya</span><strong>${shortMoney(summary.biaya)}</strong></div>
    <div><span><i style="background:#2f6bff"></i>Laba bersih</span><strong>${shortMoney(summary.laba)}</strong></div>
    <div><span><i style="background:#12a678"></i>Total pendapatan</span><strong>${shortMoney(summary.pendapatan)}</strong></div>`
    : '<p class="chart-empty">Belum ada transaksi.</p>';
  document.getElementById('cashInsight').innerHTML = hasData
    ? `Kas setara kas tercatat <strong>${money(summary.kas)}</strong>, ${
        difference >= 0 ? 'lebih tinggi' : 'lebih rendah'
      } <strong>${money(Math.abs(difference))}</strong> dibanding laba bersih tahun berjalan.`
    : '';
}

function renderBalance() {
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

  document.getElementById('assetBody').innerHTML = `${renderRows(assets)}<tr class="total-row"><td></td><td>Total Aset</td><td class="num right">${money(sum(assets))}</td></tr>`;
  document.getElementById('liabilityBody').innerHTML = `${renderRows(liabilities)}<tr class="total-row"><td></td><td>Total Liabilitas &amp; Ekuitas</td><td class="num right">${money(sum(liabilities))}</td></tr>`;
}

function buildWorksheet() {
  const activeRows = report.trialBalance.rows.filter((row) => row.debit || row.kredit);
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
  const hasData = report.trialBalance.rows.some((row) => row.debit || row.kredit);
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

function accountType(code) {
  if (code.startsWith('1.')) return 'kas';
  if (code.startsWith('3.')) return 'pendapatan';
  if (code.startsWith('5.')) return 'biaya';
  return 'lainnya';
}

function refreshFilterOptions() {
  const monthFilter = document.getElementById('monthFilter');
  const selectedMonth = monthFilter.value;
  monthFilter.innerHTML = '<option value="">Semua bulan</option>';
  monthly.forEach((item) => {
    const option = document.createElement('option');
    option.value = item.number;
    option.textContent = item.month;
    monthFilter.appendChild(option);
  });
  monthFilter.value = monthly.some((item) => item.number === selectedMonth) ? selectedMonth : '';

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
  document.getElementById('printBtn').addEventListener('click', () => window.print());

  applyFilters();
}

function applyFilters() {
  const query = document.getElementById('journalSearch').value.trim().toLowerCase();
  const month = document.getElementById('monthFilter').value;
  const account = document.getElementById('accountFilter').value;
  const type = document.getElementById('typeFilter').value;

  filteredJournal = journal.filter((row) => {
    const [date, description, code, name] = row;
    if (query && !`${description} ${code} ${name}`.toLowerCase().includes(query)) return false;
    if (month && date.slice(5, 7) !== month) return false;
    if (account && code !== account) return false;
    if (type && accountType(code) !== type) return false;
    return true;
  });

  renderJournalTable();
}

function renderJournalTable() {
  const totalPages = Math.max(1, Math.ceil(filteredJournal.length / pageSize));
  currentPage = Math.min(currentPage, totalPages);
  const start = (currentPage - 1) * pageSize;
  const rows = filteredJournal.slice(start, start + pageSize);
  const debit = filteredJournal.reduce((sum, row) => sum + row[4], 0);
  const credit = filteredJournal.reduce((sum, row) => sum + row[5], 0);

  document.getElementById('journalBody').innerHTML = rows.length
    ? rows
        .map(
          (row) => `<tr>
            <td class="date">${formatDate(row[0])}</td>
            <td>${escapeHtml(row[1])}</td>
            <td class="account">${escapeHtml(row[2])} · ${escapeHtml(row[3])}</td>
            <td class="num right">${row[4] ? money(row[4]) : '—'}</td>
            <td class="num right">${row[5] ? money(row[5]) : '—'}</td>
          </tr>`,
        )
        .join('')
    : '<tr class="empty-row"><td colspan="5">Tidak ada transaksi yang cocok dengan filter.</td></tr>';

  const first = filteredJournal.length ? start + 1 : 0;
  const last = Math.min(start + pageSize, filteredJournal.length);
  document.getElementById('journalCount').textContent = `Menampilkan ${numberFormatter.format(first)}–${numberFormatter.format(last)} dari ${numberFormatter.format(filteredJournal.length)} baris`;
  document.getElementById('journalTotals').textContent = `Debet ${shortMoney(debit)} · Kredit ${shortMoney(credit)}`;
  document.getElementById('pageInfo').textContent = `Halaman ${currentPage} dari ${totalPages}`;
  document.getElementById('prevPage').disabled = currentPage === 1;
  document.getElementById('nextPage').disabled = currentPage === totalPages;
}

function exportJournal() {
  const lines = [['Tanggal', 'Keterangan', 'Akun', 'Nama Akun', 'Debet', 'Kredit']];
  filteredJournal.forEach((row) => lines.push([formatDate(row[0]), row[1], row[2], row[3], row[4], row[5]]));
  const csv = lines
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
    .join('\r\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `jurnal-umum-${meta.period}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function initTransactionForm() {
  const form = document.getElementById('journalForm');
  const debit = document.getElementById('txDebit');
  const credit = document.getElementById('txCredit');
  const item = document.getElementById('txItem');
  const mutation = document.getElementById('txMutation');
  const quantity = document.getElementById('txQuantity');
  const amount = document.getElementById('txAmount');
  const status = document.getElementById('formStatus');

  ACCOUNTS.forEach((account) => {
    [debit, credit].forEach((select) => {
      const option = document.createElement('option');
      option.value = account.code;
      option.textContent = `${account.code} · ${account.name}`;
      select.appendChild(option);
    });
  });

  INVENTORY_ITEMS.forEach((product) => {
    const option = document.createElement('option');
    option.value = product.code;
    option.textContent = `${product.code} · ${product.name}`;
    item.appendChild(option);
  });

  const resetForm = () => {
    form.reset();
    document.getElementById('txDate').value = new Date().toISOString().slice(0, 10);
    status.textContent = '';
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
      if (!Number.isFinite(nominal) || nominal <= 0) throw new Error('Nominal harus lebih dari 0.');

      const usesStock = debitCode === '1.2.13' || creditCode === '1.2.13';
      if (usesStock && (!product || !mutationType || qty <= 0)) {
        throw new Error('Transaksi PERSEDIAAN butuh barang, mutasi, dan jumlah.');
      }
      if (!usesStock && mutationType) {
        throw new Error('Mutasi barang butuh akun PERSEDIAAN (1.2.13).');
      }
      if (mutationType === 'in' && debitCode !== '1.2.13') {
        throw new Error('Mutasi masuk harus dibukukan ke debit PERSEDIAAN.');
      }
      if (mutationType === 'out' && creditCode !== '1.2.13') {
        throw new Error('Mutasi keluar harus dibukukan ke kredit PERSEDIAAN.');
      }

      const lines = [
        { code: debitCode, debit: nominal },
        { code: creditCode, kredit: nominal },
      ];
      if (mutationType) {
        lines.find((line) => line.code === '1.2.13').mutation = {
          item: product.code,
          type: mutationType,
          quantity: qty,
        };
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
      status.textContent = `Tersimpan. Jurnal berisi ${loadJournalEntries().length} transaksi.`;
    } catch (error) {
      status.textContent = error.message;
    }
  });

  document.getElementById('clearJournalBtn').addEventListener('click', () => {
    clearJournalEntries();
    syncReport();
    renderDashboard();
    status.textContent = 'Jurnal dikosongkan.';
  });

  resetForm();
}

function initNavigation() {
  const toggle = document.getElementById('mobileToggle');
  const sidebar = document.getElementById('sidebar');
  const allLinks = [...document.querySelectorAll('.nav-link')];
  const links = allLinks.filter((link) => link.getAttribute('href').startsWith('#'));

  toggle.addEventListener('click', () => sidebar.classList.toggle('open'));
  allLinks.forEach((link) => link.addEventListener('click', () => sidebar.classList.remove('open')));

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
renderDashboard();
initNavigation();
initTransactionForm();
