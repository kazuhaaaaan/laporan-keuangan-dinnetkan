const STORAGE_KEY = 'dinetkan-inventory-v1';
const JOURNAL_SYNC_KEY = 'dinetkan-inventory-journal-sync-v1';
const $ = (id) => document.getElementById(id);

const numberFormatter = new Intl.NumberFormat('id-ID');
const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const dateFormatter = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
const shortDateFormatter = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short' });
const monthFormatter = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' });

let state = loadState();
let mergedTransactions = mergeTransactions();
let period = mergedTransactions.length ? 'month' : 'day';
let selectedDate = mergedTransactions.length
  ? mergedTransactions.reduce((latest, transaction) => (transaction.date > latest ? transaction.date : latest), mergedTransactions[0].date)
  : todayISO();
let editingItemId = null;
let stockItemId = '';
let depreciationItemId = '';
let itemQuery = '';

function emptyState() {
  return { items: [], transactions: [], depreciations: [] };
}

function journalInventory() {
  if (typeof REPORT_DATA === 'undefined') return null;
  return REPORT_DATA.inventory || null;
}

function derivedTransactions() {
  const inventory = journalInventory();
  if (!inventory || !Array.isArray(inventory.transactions)) return [];
  return inventory.transactions.map((transaction) => ({ ...transaction, source: 'journal-derived' }));
}

function seedState() {
  const inventory = journalInventory();
  if (!inventory || !Array.isArray(inventory.items)) return emptyState();
  return {
    items: inventory.items.map((item) => ({ ...item })),
    transactions: [],
    depreciations: [],
  };
}

function journalSignature() {
  if (typeof REPORT_DATA === 'undefined') return 'no-report';
  return `${REPORT_DATA.journal.length}:${REPORT_DATA.inventory.transactions.length}`;
}

function isDerivedTransaction(transaction) {
  return transaction?.source === 'journal-derived' || String(transaction?.id || '').startsWith('mut-dummy-');
}

function normalizeInventoryState(parsed) {
  return {
    items: Array.isArray(parsed?.items) ? parsed.items.filter((item) => item && item.id) : [],
    transactions: Array.isArray(parsed?.transactions)
      ? parsed.transactions
          .filter((transaction) => transaction && transaction.id && !isDerivedTransaction(transaction))
          .map((transaction) => ({ ...transaction, source: transaction.source || 'local' }))
      : [],
    depreciations: Array.isArray(parsed?.depreciations)
      ? parsed.depreciations.filter((rule) => rule && rule.id && rule.itemId)
      : [],
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedState();
    const state = normalizeInventoryState(JSON.parse(raw));
    try {
      localStorage.setItem(JOURNAL_SYNC_KEY, journalSignature());
    } catch (error) {
      // Signature only controls diagnostics; it must never block locally stored data.
    }
    return state;
  } catch (error) {
    return seedState();
  }
}

function mergeTransactions() {
  const byId = new Map();
  [...derivedTransactions(), ...state.transactions].forEach((transaction) => {
    if (!byId.has(transaction.id)) byId.set(transaction.id, transaction);
  });
  return [...byId.values()].sort(
    (a, b) => String(a.date).localeCompare(String(b.date)) || String(a.id).localeCompare(String(b.id)),
  );
}

function refreshMergedTransactions() {
  mergedTransactions = mergeTransactions();
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    toast('Data tidak dapat disimpan di browser ini.', 'error');
  }
}

function uid() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function toISODate(date) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function dateFromISO(value) {
  return new Date(`${value}T00:00:00`);
}

function todayISO() {
  return toISODate(new Date());
}

function addDays(value, amount) {
  const date = dateFromISO(value);
  date.setDate(date.getDate() + amount);
  return toISODate(date);
}

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function addMonths(value, amount) {
  const date = dateFromISO(value);
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + amount);
  date.setDate(Math.min(day, daysInMonth(date.getFullYear(), date.getMonth())));
  return toISODate(date);
}

function monthSteps(start, end) {
  const steps = [];
  let cursor = start;
  while (cursor < end && steps.length < 240) {
    const next = addMonths(cursor, 1);
    if (next > end) break;
    steps.push({ from: cursor, to: next });
    cursor = next;
  }
  return steps;
}

function depreciationsOf(itemId) {
  return state.depreciations
    .filter((rule) => rule.itemId === itemId)
    .sort((a, b) => a.start.localeCompare(b.start) || a.id.localeCompare(b.id));
}

function depreciationRuleLabel(rule) {
  return rule.mode === 'percent' ? `${rule.value}%/bulan` : `Rp${rule.value}/bulan`;
}

function depreciationPlan(item) {
  const base = Number(item.price || 0);
  const rules = depreciationsOf(item.id).filter((rule) => rule.start <= rule.end && monthSteps(rule.start, rule.end).length);
  let price = base;
  const rows = [];

  rules.forEach((rule, ruleIndex) => {
    const percent = rule.mode === 'percent';
    const value = Number(rule.value || 0);
    monthSteps(rule.start, rule.end).forEach((step) => {
      const amount = percent ? (price * value) / 100 : value;
      const decrease = Math.min(Math.max(0, amount), price);
      const before = price;
      price = Math.max(0, price - decrease);
      rows.push({
        ...step,
        number: rows.length + 1,
        ruleNumber: ruleIndex + 1,
        ruleLabel: depreciationRuleLabel(rule),
        ruleMode: rule.mode,
        ruleValue: Number(rule.value || 0),
        ruleStart: rule.start,
        ruleEnd: rule.end,
        before,
        amount: decrease,
        after: price,
      });
    });
  });

  return { base, rows, finalPrice: price, total: base - price, rules };
}

function startOfWeek(value) {
  const date = dateFromISO(value);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return toISODate(date);
}

function formatDate(value) {
  return dateFormatter.format(dateFromISO(value));
}

function formatQty(value) {
  return numberFormatter.format(Number(value) || 0);
}

function money(value) {
  return currencyFormatter.format(Number(value) || 0);
}

function periodRange() {
  if (period === 'day') return { start: selectedDate, end: selectedDate };
  if (period === 'week') {
    const start = startOfWeek(selectedDate);
    return { start, end: addDays(start, 6) };
  }
  const date = dateFromISO(selectedDate);
  return {
    start: toISODate(new Date(date.getFullYear(), date.getMonth(), 1)),
    end: toISODate(new Date(date.getFullYear(), date.getMonth() + 1, 0)),
  };
}

function periodTitle() {
  const { start, end } = periodRange();
  if (period === 'day') return formatDate(start);
  if (period === 'week') return `${shortDateFormatter.format(dateFromISO(start))} – ${formatDate(end)}`;
  return monthFormatter.format(dateFromISO(start));
}

function itemById(id) {
  return state.items.find((item) => item.id === id);
}

function transactionsOf(itemId) {
  return mergedTransactions
    .filter((transaction) => transaction.itemId === itemId)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.createdAt || 0) - (b.createdAt || 0));
}

function stockOf(item) {
  const mutation = transactionsOf(item.id).reduce(
    (total, transaction) => total + (transaction.type === 'in' ? 1 : -1) * Number(transaction.quantity || 0),
    0,
  );
  return Number(item.initialStock || 0) + mutation;
}

function stockStatus(item) {
  const stock = stockOf(item);
  const minimum = Number(item.minStock || 0);
  if (stock <= 0) return { label: 'Habis', className: 'bad' };
  if (minimum > 0 && stock <= minimum) return { label: 'Menipis', className: 'warn' };
  return { label: 'Aman', className: 'good' };
}

function periodTransactions() {
  const { start, end } = periodRange();
  return mergedTransactions
    .filter((transaction) => transaction.date >= start && transaction.date <= end)
    .sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0));
}

function periodTotals() {
  const rows = periodTransactions();
  const incoming = rows.filter((row) => row.type === 'in').reduce((sum, row) => sum + Number(row.quantity || 0), 0);
  const outgoing = rows.filter((row) => row.type === 'out').reduce((sum, row) => sum + Number(row.quantity || 0), 0);
  return { rows, incoming, outgoing, count: rows.length, net: incoming - outgoing };
}

function toast(message, type = 'success') {
  const container = $('toastContainer');
  if (!container) return;
  const element = document.createElement('div');
  element.className = `toast ${type === 'error' ? 'error' : ''}`.trim();
  element.textContent = message;
  container.appendChild(element);
  setTimeout(() => element.remove(), 3200);
}

function renderPeriodControls() {
  $('periodDate').value = selectedDate;
  document.querySelectorAll('.period-tab').forEach((tab) => {
    const active = tab.dataset.period === period;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-pressed', String(active));
  });
  $('periodLabel').textContent = periodTitle();
  $('mutationTag').textContent = period === 'day' ? 'HARI INI' : period === 'week' ? 'MINGGU INI' : 'BULAN INI';
  $('mutasiSubtitle').textContent =
    period === 'day'
      ? 'Ringkasan mutasi pada tanggal terpilih.'
      : period === 'week'
        ? 'Ringkasan mutasi Senin sampai Minggu.'
        : 'Ringkasan mutasi sepanjang bulan terpilih.';
  $('transactionSubtitle').textContent = `Daftar mutasi pada ${periodTitle()}. Excel berisi referensi harian, mingguan, bulanan, dan tahunan.`;
}

function renderKpis() {
  const totalStock = state.items.reduce((sum, item) => sum + stockOf(item), 0);
  const lowStock = state.items.filter((item) => stockStatus(item).className !== 'good').length;
  const net = periodTotals().net;

  $('kpiItems').textContent = formatQty(state.items.length);
  $('kpiStock').textContent = formatQty(totalStock);
  $('kpiLow').textContent = formatQty(lowStock);
  $('kpiMutation').textContent = `${net > 0 ? '+' : ''}${formatQty(net)}`;
}

function bucketDates() {
  const { start, end } = periodRange();
  const dates = [];
  let cursor = start;
  while (cursor <= end) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return dates.slice(0, 31);
}

function renderMutationChart() {
  const totals = periodTotals();
  $('periodIn').textContent = formatQty(totals.incoming);
  $('periodOut').textContent = formatQty(totals.outgoing);
  $('periodCount').textContent = formatQty(totals.count);

  if (!totals.count) {
    $('mutationChart').innerHTML = '<div class="chart-empty"><div><strong>Belum ada mutasi</strong>Catat transaksi untuk melihat grafik periode ini.</div></div>';
    return;
  }

  const dates = bucketDates();
  const buckets = dates.map((date) => ({ date, incoming: 0, outgoing: 0 }));
  const indexByDate = new Map(buckets.map((bucket, index) => [bucket.date, index]));
  totals.rows.forEach((row) => {
    const index = indexByDate.get(row.date);
    if (index === undefined) return;
    buckets[index][row.type === 'in' ? 'incoming' : 'outgoing'] += Number(row.quantity || 0);
  });

  const width = 1000;
  const height = 260;
  const padding = { top: 18, right: 18, bottom: 38, left: 52 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const maximum = Math.max(1, ...buckets.flatMap((bucket) => [bucket.incoming, bucket.outgoing])) * 1.1;
  const scaleY = (value) => padding.top + (1 - value / maximum) * plotHeight;
  const groupWidth = plotWidth / buckets.length;
  const barWidth = Math.min(18, groupWidth * 0.32);
  const zeroY = scaleY(0);
  const labelStep = Math.ceil(buckets.length / 12);
  const parts = [];

  for (let index = 0; index <= 4; index += 1) {
    const value = (maximum / 4) * index;
    const y = scaleY(value);
    parts.push(`<line class="chart-grid" x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" />`);
    parts.push(`<text x="${padding.left - 8}" y="${y + 4}" text-anchor="end">${formatQty(Math.round(value))}</text>`);
  }

  buckets.forEach((bucket, index) => {
    const center = padding.left + groupWidth * index + groupWidth / 2;
    const incomingTop = scaleY(bucket.incoming);
    const outgoingTop = scaleY(bucket.outgoing);
    const label = shortDateFormatter.format(dateFromISO(bucket.date));

    if (bucket.incoming) {
      parts.push(`<rect class="chart-bar" x="${center - barWidth - 1}" y="${incomingTop}" width="${barWidth}" height="${zeroY - incomingTop}" fill="#12a678"><title>${label} masuk: ${formatQty(bucket.incoming)}</title></rect>`);
    }
    if (bucket.outgoing) {
      parts.push(`<rect class="chart-bar" x="${center + 1}" y="${outgoingTop}" width="${barWidth}" height="${zeroY - outgoingTop}" fill="#e25656"><title>${label} keluar: ${formatQty(bucket.outgoing)}</title></rect>`);
    }
    if (index % labelStep === 0 || index === buckets.length - 1) {
      parts.push(`<text x="${center}" y="${height - 12}" text-anchor="middle">${label}</text>`);
    }
  });

  $('mutationChart').innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Grafik mutasi barang ${periodTitle()}">${parts.join('')}</svg>`;
}

function renderItemOptions() {
  const currentTransactionItem = $('trxItem').value;
  const transactionOptions = state.items
    .map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.code)} · ${escapeHtml(item.name)}</option>`)
    .join('');
  $('trxItem').innerHTML = '<option value="">Pilih barang terlebih dahulu</option>' + transactionOptions;
  if (itemById(currentTransactionItem)) $('trxItem').value = currentTransactionItem;
  $('trxSubmit').disabled = state.items.length === 0;

  if (!itemById(stockItemId)) stockItemId = state.items[0]?.id || '';
  const stockOptions = state.items
    .map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.code)} · ${escapeHtml(item.name)}</option>`)
    .join('');
  $('stockItemSelect').innerHTML = state.items.length
    ? stockOptions
    : '<option value="">Belum ada barang</option>';
  $('stockItemSelect').value = stockItemId;
  updateAvailableStock();
}

function resetDepreciationForm() {
  $('depMode').value = 'nominal';
  $('depValue').value = '';
  $('depStart').value = '';
  $('depEnd').value = '';
  $('depStatus').textContent = '';
}

function renderDepreciationOptions() {
  if (!itemById(depreciationItemId)) depreciationItemId = state.items[0]?.id || '';
  $('depItem').innerHTML = state.items.length
    ? state.items
        .map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.code)} · ${escapeHtml(item.name)}</option>`)
        .join('')
    : '<option value="">Belum ada barang</option>';
  $('depItem').value = depreciationItemId;
  $('depSubmit').disabled = state.items.length === 0;
  $('depClear').disabled = depreciationsOf(depreciationItemId).length === 0;
  renderDepreciation();
}

function renderDepreciation() {
  const item = itemById(depreciationItemId);
  const result = $('depreciationResult');
  if (!item) {
    $('depSummary').textContent = '';
    result.innerHTML = '<p class="chart-empty">Belum ada barang untuk dihitung.</p>';
    return;
  }

  const plan = depreciationPlan(item);
  $('depSummary').textContent = `${item.code} · ${item.name} · Harga awal ${money(plan.base)} · ${plan.rules.length} aturan · ${plan.rows.length} kali penurunan · Harga akhir ${money(plan.finalPrice)}`;

  const rulesMarkup = plan.rules.length
    ? `<div class="dep-rules">
        <div class="dep-rules-head">Aturan tersimpan (${plan.rules.length})</div>
        ${plan.rules
          .map(
            (rule, index) => `<div class="dep-rule-row">
              <span><strong>${index + 1}.</strong> ${escapeHtml(depreciationRuleLabel(rule))} · ${formatDate(rule.start)} – ${formatDate(rule.end)}</span>
              <button class="icon-btn danger" type="button" data-delete-dep="${escapeHtml(rule.id)}">Hapus</button>
            </div>`,
          )
          .join('')}
      </div>`
    : '';

  if (!plan.rows.length) {
    result.innerHTML = `${rulesMarkup}<p class="chart-empty">${
      plan.rules.length ? 'Periode kurang dari satu bulan penuh.' : 'Belum ada aturan penurunan untuk barang ini.'
    } Harga saat ini ${money(plan.base)}.</p>`;
    return;
  }

  result.innerHTML = `${rulesMarkup}<div class="table-wrap"><table class="data-table">
    <thead><tr>
      <th class="right">#</th>
      <th>Aturan</th>
      <th>Periode penurunan</th>
      <th class="right">Harga awal</th>
      <th class="right">Penurunan</th>
      <th class="right">Harga akhir</th>
    </tr></thead>
    <tbody>
      ${plan.rows
        .map(
          (row) => `<tr>
            <td class="num right">${row.number}</td>
            <td>${escapeHtml(row.ruleLabel)}</td>
            <td>${formatDate(row.from)} – ${formatDate(row.to)}</td>
            <td class="num right">${money(row.before)}</td>
            <td class="num right">${money(row.amount)}</td>
            <td class="num right">${money(row.after)}</td>
          </tr>`,
        )
        .join('')}
      <tr class="total-row dep-final"><td></td><td colspan="2">Harga akhir ${escapeHtml(item.name)}</td><td class="num right">${money(plan.base)}</td><td class="num right">${money(plan.total)}</td><td class="num right">${money(plan.finalPrice)}</td></tr>
    </tbody>
  </table></div>`;
}

function updateAvailableStock() {
  const item = itemById($('trxItem').value);
  $('availableStock').textContent = item
    ? `Stok tersedia: ${formatQty(stockOf(item))} ${escapeHtml(item.unit || '')}`.trim()
    : '';
}

function renderItems() {
  const query = itemQuery.trim().toLowerCase();
  const items = state.items.filter((item) => `${item.code} ${item.name} ${item.category || ''}`.toLowerCase().includes(query));

  if (!items.length) {
    const message = state.items.length ? 'Tidak ada barang yang cocok dengan pencarian.' : 'Belum ada barang. Isi formulir Tambah Barang untuk mulai.';
    $('itemTableBody').innerHTML = `<tr class="empty-row"><td colspan="9">${message}</td></tr>`;
    return;
  }

  $('itemTableBody').innerHTML = items
    .map((item) => {
      const status = stockStatus(item);
      const plan = depreciationPlan(item);
      return `<tr>
        <td class="account">${escapeHtml(item.code)}</td>
        <td>${escapeHtml(item.name)}</td>
        <td>${escapeHtml(item.category || '—')}</td>
        <td class="num right">${formatQty(stockOf(item))} ${escapeHtml(item.unit || '')}</td>
        <td class="num right">${money(plan.base)}</td>
        <td class="num right"><strong>${money(plan.finalPrice)}</strong>${plan.total ? `<span class="price-drop">−${money(plan.total)}</span>` : ''}</td>
        <td class="num right">${formatQty(item.minStock || 0)}</td>
        <td><span class="badge ${status.className}">${status.label}</span></td>
        <td><div class="action-cell">
          <button class="icon-btn" type="button" data-edit="${escapeHtml(item.id)}">Ubah</button>
          <button class="icon-btn" type="button" data-depreciate="${escapeHtml(item.id)}">Penurunan</button>
          <button class="icon-btn danger" type="button" data-delete="${escapeHtml(item.id)}">Hapus</button>
        </div></td>
      </tr>`;
    })
    .join('');
}

function renderTransactions() {
  const rows = periodTransactions();
  if (!rows.length) {
    $('transactionTableBody').innerHTML = '<tr class="empty-row"><td colspan="6">Belum ada transaksi pada periode ini.</td></tr>';
    return;
  }

  $('transactionTableBody').innerHTML = rows
    .map((row) => {
      const item = itemById(row.itemId);
      return `<tr>
        <td class="date">${formatDate(row.date)}</td>
        <td>${escapeHtml(item ? `${item.code} · ${item.name}` : 'Barang dihapus')}</td>
        <td><span class="badge ${row.type}">${row.type === 'in' ? 'Masuk' : 'Keluar'}</span></td>
        <td class="num right">${formatQty(row.quantity)} ${escapeHtml(item?.unit || '')}</td>
        <td>${escapeHtml(row.note || row.reference || '—')}${row.source === 'journal-derived' ? '<span class="source-tag">Jurnal</span>' : ''}</td>
        <td><div class="action-cell">${
          row.source === 'journal-derived'
            ? '<span class="muted-note">Dari jurnal</span>'
            : `<button class="icon-btn danger" type="button" data-delete-trx="${escapeHtml(row.id)}">Hapus</button>`
        }</div></td>
      </tr>`;
    })
    .join('');
}

function renderStockCard() {
  const item = itemById(stockItemId);
  if (!item) {
    $('stockCardBody').innerHTML = '<tr class="empty-row"><td colspan="5">Belum ada barang untuk ditampilkan.</td></tr>';
    return;
  }

  let balance = Number(item.initialStock || 0);
  const opening = `<tr><td class="date">Stok awal</td><td>Saldo pembuka</td><td class="num right">—</td><td class="num right">—</td><td class="num right">${formatQty(balance)}</td></tr>`;
  const transactions = transactionsOf(item.id);
  const rows = transactions
    .map((transaction) => {
      balance += (transaction.type === 'in' ? 1 : -1) * Number(transaction.quantity || 0);
      return `<tr>
        <td class="date">${formatDate(transaction.date)}</td>
        <td>${escapeHtml(transaction.note || transaction.reference || (transaction.type === 'in' ? 'Barang masuk' : 'Barang keluar'))}</td>
        <td class="num right">${transaction.type === 'in' ? formatQty(transaction.quantity) : '—'}</td>
        <td class="num right">${transaction.type === 'out' ? formatQty(transaction.quantity) : '—'}</td>
        <td class="num right"><strong>${formatQty(balance)}</strong></td>
      </tr>`;
    })
    .join('');

  $('stockCardBody').innerHTML = opening + (rows || '<tr class="empty-row"><td colspan="5">Belum ada mutasi untuk barang ini.</td></tr>');
}

function renderAll() {
  renderPeriodControls();
  renderKpis();
  renderMutationChart();
  renderItemOptions();
  renderDepreciationOptions();
  renderItems();
  renderTransactions();
  renderStockCard();
}

function resetItemForm() {
  editingItemId = null;
  $('itemForm').reset();
  $('itemInitial').value = '0';
  $('itemMin').value = '0';
  $('itemPrice').value = '0';
  $('itemFormTitle').textContent = 'Tambah Barang';
  $('itemSubmit').textContent = 'Simpan Barang';
  $('cancelItemEdit').classList.remove('visible');
}

function populateItemForm(item) {
  editingItemId = item.id;
  $('itemCode').value = item.code;
  $('itemName').value = item.name;
  $('itemCategory').value = item.category || '';
  $('itemUnit').value = item.unit || '';
  $('itemLocation').value = item.location || '';
  $('itemInitial').value = item.initialStock || 0;
  $('itemMin').value = item.minStock || 0;
  $('itemPrice').value = item.price || 0;
  $('itemFormTitle').textContent = 'Ubah Barang';
  $('itemSubmit').textContent = 'Perbarui Barang';
  $('cancelItemEdit').classList.add('visible');
  if ($('itemForm').scrollIntoView) $('itemForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function submitItem(event) {
  event.preventDefault();
  const payload = {
    code: $('itemCode').value.trim().toUpperCase(),
    name: $('itemName').value.trim(),
    category: $('itemCategory').value.trim(),
    unit: $('itemUnit').value.trim(),
    location: $('itemLocation').value.trim(),
    initialStock: Math.max(0, Number($('itemInitial').value) || 0),
    minStock: Math.max(0, Number($('itemMin').value) || 0),
    price: Math.max(0, Number($('itemPrice').value) || 0),
  };

  if (!payload.code || !payload.name) {
    toast('Kode dan nama barang wajib diisi.', 'error');
    return;
  }

  const duplicate = state.items.some((item) => item.code === payload.code && item.id !== editingItemId);
  if (duplicate) {
    toast('Kode barang sudah digunakan.', 'error');
    return;
  }

  if (editingItemId) {
    const item = itemById(editingItemId);
    if (item) Object.assign(item, payload);
    toast('Barang diperbarui.');
  } else {
    state.items.push({ id: uid(), ...payload });
    toast('Barang ditambahkan.');
  }

  resetItemForm();
  saveState();
  renderAll();
}

function submitDepreciation(event) {
  event.preventDefault();
  const item = itemById(depreciationItemId || $('depItem').value);
  if (!item) {
    toast('Pilih barang terlebih dahulu.', 'error');
    return;
  }

  const mode = $('depMode').value === 'percent' ? 'percent' : 'nominal';
  const value = Number($('depValue').value);
  const start = $('depStart').value;
  const end = $('depEnd').value;
  const fail = (message) => {
    $('depStatus').textContent = message;
    toast(message, 'error');
  };

  if (!start || !end) {
    fail('Tanggal mulai dan akhir wajib diisi.');
    return;
  }
  if (end < start) {
    fail('Tanggal akhir harus setelah tanggal mulai.');
    return;
  }
  if (!Number.isFinite(value) || value <= 0) {
    fail('Nilai penurunan harus lebih dari nol.');
    return;
  }
  if (mode === 'percent' && value > 100) {
    fail('Penurunan persen maksimal 100%.');
    return;
  }
  const steps = monthSteps(start, end);
  if (!steps.length) {
    fail('Periode harus minimal satu bulan penuh.');
    return;
  }

  const ruleCount = depreciationsOf(item.id).length + 1;
  state.depreciations.push({ id: uid(), itemId: item.id, mode, value, start, end });
  saveState();
  resetDepreciationForm();
  renderDepreciationOptions();
  renderItems();
  $('depStatus').textContent = `Aturan ${ruleCount} tersimpan: ${steps.length} kali penurunan.`;
  toast('Penurunan harga disimpan.');
}

function deleteDepreciationRule(ruleId) {
  const rule = state.depreciations.find((entry) => entry.id === ruleId);
  if (!rule) return;
  state.depreciations = state.depreciations.filter((entry) => entry.id !== ruleId);
  saveState();
  renderDepreciationOptions();
  renderItems();
  $('depStatus').textContent = 'Aturan penurunan dihapus.';
  toast('Aturan penurunan dihapus.');
}

function clearDepreciation() {
  const item = itemById(depreciationItemId);
  if (!item || !depreciationsOf(item.id).length) return;
  state.depreciations = state.depreciations.filter((rule) => rule.itemId !== item.id);
  saveState();
  resetDepreciationForm();
  renderDepreciationOptions();
  renderItems();
  $('depStatus').textContent = 'Semua aturan penurunan dihapus.';
  toast('Semua aturan penurunan dihapus.');
}

function submitTransaction(event) {
  event.preventDefault();
  const item = itemById($('trxItem').value);
  const quantity = Math.floor(Number($('trxQty').value) || 0);
  const type = $('trxType').value;

  if (!item) {
    toast('Pilih barang terlebih dahulu.', 'error');
    return;
  }
  if (quantity <= 0) {
    toast('Jumlah harus lebih dari nol.', 'error');
    return;
  }
  if (type === 'out' && quantity > stockOf(item)) {
    toast(`Stok ${item.name} tidak mencukupi.`, 'error');
    return;
  }

  state.transactions.push({
    id: uid(),
    createdAt: Date.now(),
    date: $('trxDate').value || todayISO(),
    itemId: item.id,
    type,
    quantity,
    note: $('trxNote').value.trim(),
    reference: $('trxReference').value.trim(),
  });

  $('trxQty').value = '';
  $('trxNote').value = '';
  $('trxReference').value = '';
  saveState();
  refreshMergedTransactions();
  renderAll();
  toast('Transaksi dicatat.');
}

function download(content, filename, type) {
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

function exportJson() {
  const backup = { ...state, transactions: mergedTransactions, exportedAt: new Date().toISOString() };
  download(JSON.stringify(backup, null, 2), 'dinetkan-inventaris-cadangan.json', 'application/json');
  toast('Cadangan diunduh.');
}

function exportCsv() {
  const lines = [['Tanggal', 'Kode Barang', 'Nama Barang', 'Jenis', 'Jumlah', 'Satuan', 'Keterangan', 'Referensi']];
  periodTransactions().forEach((row) => {
    const item = itemById(row.itemId);
    lines.push([
      formatDate(row.date),
      item?.code || '',
      item?.name || 'Barang dihapus',
      row.type === 'in' ? 'Masuk' : 'Keluar',
      row.quantity,
      item?.unit || '',
      row.note || '',
      row.reference || '',
    ]);
  });
  const csv = lines.map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\r\n');
  download(`\uFEFF${csv}`, `mutasi-${period}-${selectedDate}.csv`, 'text/csv;charset=utf-8;');
  toast('CSV periode ini diunduh.');
}

function escapeXml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function xmlCell(entry) {
  const [value, style] = Array.isArray(entry) ? entry : [entry, ''];
  const styleAttribute = style ? ` ss:StyleID="${style}"` : '';
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<Cell${styleAttribute}><Data ss:Type="Number">${value}</Data></Cell>`;
  }
  return `<Cell${styleAttribute}><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`;
}

function xmlRow(cells) {
  return `<Row>${cells.map(xmlCell).join('')}</Row>`;
}

function xmlSheet(name, rows) {
  return `<Worksheet ss:Name="${escapeXml(name)}"><Table>${rows.map(xmlRow).join('')}</Table></Worksheet>`;
}

function buildWorkbook(sheets) {
  const styles = `<Styles>
    <Style ss:ID="Title"><Font ss:Bold="1" ss:Size="14" ss:Color="#101A31"/></Style>
    <Style ss:ID="Label"><Font ss:Bold="1" ss:Color="#101A31"/></Style>
    <Style ss:ID="Header"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#101A31" ss:Pattern="Solid"/></Style>
    <Style ss:ID="Number"><NumberFormat ss:Format="#,##0"/></Style>
    <Style ss:ID="Wrap"><Alignment ss:Vertical="Top" ss:WrapText="1"/></Style>
  </Styles>`;
  const header = '<?xml version="1.0"?>\n<?mso-application progid="Excel.Sheet"?>\n<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">';
  return `${header}${styles}${sheets.map((sheet) => xmlSheet(sheet.name, sheet.rows)).join('')}</Workbook>`;
}

function stockAt(itemId, endDate) {
  const item = itemById(itemId);
  if (!item) return 0;
  const mutation = mergedTransactions
    .filter((transaction) => transaction.itemId === itemId && transaction.date <= endDate)
    .reduce((total, transaction) => total + (transaction.type === 'in' ? 1 : -1) * Number(transaction.quantity || 0), 0);
  return Number(item.initialStock || 0) + mutation;
}

function itemLabel(itemId) {
  const item = itemById(itemId);
  return item ? `${item.code} · ${item.name}` : 'Barang dihapus';
}

function weekNumber(value) {
  const date = dateFromISO(startOfWeek(value));
  date.setDate(date.getDate() + 4 - (date.getDay() || 7));
  const yearStart = new Date(date.getFullYear(), 0, 1);
  return Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
}

function buildTransactionRows(rows) {
  const header = [['Tanggal', 'Header'], ['Kode Barang', 'Header'], ['Nama Barang', 'Header'], ['Jenis', 'Header'], ['Jumlah', 'Header'], ['Satuan', 'Header'], ['Keterangan', 'Header'], ['Referensi', 'Header']];
  if (!rows.length) return [header, [['Belum ada transaksi']]];
  return [header, ...rows.map((row) => {
    const item = itemById(row.itemId);
    return [
      formatDate(row.date),
      item?.code || '',
      item?.name || 'Barang dihapus',
      row.type === 'in' ? 'Masuk' : 'Keluar',
      Number(row.quantity || 0),
      item?.unit || '',
      row.note || '',
      row.reference || '',
    ];
  })];
}

function buildMasterRows() {
  const header = [['Kode', 'Header'], ['Nama Barang', 'Header'], ['Kategori', 'Header'], ['Satuan', 'Header'], ['Lokasi', 'Header'], ['Stok Awal', 'Header'], ['Minimum', 'Header'], ['Stok Saat Ini', 'Header'], ['Harga Awal', 'Header'], ['Total Penurunan', 'Header'], ['Harga Akhir', 'Header'], ['Aturan Penurunan', 'Header'], ['Status', 'Header'], ['Nilai Stok Awal', 'Header'], ['Nilai Stok Akhir', 'Header']];
  if (!state.items.length) return [header, [['Belum ada barang']]];
  return [header, ...state.items.map((item) => {
    const status = stockStatus(item);
    const plan = depreciationPlan(item);
    const rules = plan.rules
      .map((rule) => `${rule.start} s/d ${rule.end} · ${depreciationRuleLabel(rule)}`)
      .join(' | ');
    return [
      item.code,
      item.name,
      item.category || '',
      item.unit || '',
      item.location || '',
      Number(item.initialStock || 0),
      Number(item.minStock || 0),
      stockOf(item),
      plan.base,
      plan.total,
      plan.finalPrice,
      rules,
      status.label,
      stockOf(item) * plan.base,
      stockOf(item) * plan.finalPrice,
    ];
  })];
}

function buildSummaryRows(groupType) {
  const headers = {
    day: ['Tanggal', 'Barang', 'Masuk', 'Keluar', 'Mutasi', 'Saldo Akhir', 'Jumlah Transaksi'],
    week: ['Tahun', 'Minggu', 'Periode', 'Barang', 'Masuk', 'Keluar', 'Mutasi', 'Saldo Akhir', 'Jumlah Transaksi'],
    month: ['Tahun', 'Bulan', 'Barang', 'Masuk', 'Keluar', 'Mutasi', 'Saldo Akhir', 'Jumlah Transaksi'],
    year: ['Tahun', 'Barang', 'Masuk', 'Keluar', 'Mutasi', 'Saldo Akhir', 'Jumlah Transaksi'],
  };
  const header = headers[groupType].map((label) => [label, 'Header']);
  const groups = new Map();

  mergedTransactions.forEach((transaction) => {
    const date = dateFromISO(transaction.date);
    const year = date.getFullYear();
    let key;
    let extra;
    let endDate;

    if (groupType === 'day') {
      key = transaction.date;
      extra = [formatDate(transaction.date)];
      endDate = transaction.date;
    } else if (groupType === 'week') {
      const start = startOfWeek(transaction.date);
      const week = weekNumber(transaction.date);
      key = `W-${start}`;
      extra = [year, `Minggu ${week}`, `${shortDateFormatter.format(dateFromISO(start))} – ${formatDate(addDays(start, 6))}`];
      endDate = addDays(start, 6);
    } else if (groupType === 'month') {
      key = `M-${year}-${date.getMonth()}`;
      extra = [year, monthFormatter.format(date)];
      endDate = toISODate(new Date(year, date.getMonth() + 1, 0));
    } else {
      key = `Y-${year}`;
      extra = [year];
      endDate = `${year}-12-31`;
    }

    if (!groups.has(key)) groups.set(key, { key, extra, endDate, items: new Map() });
    const group = groups.get(key);
    if (!group.items.has(transaction.itemId)) group.items.set(transaction.itemId, { incoming: 0, outgoing: 0, count: 0 });
    const entry = group.items.get(transaction.itemId);
    const quantity = Number(transaction.quantity || 0);
    if (transaction.type === 'in') entry.incoming += quantity;
    else entry.outgoing += quantity;
    entry.count += 1;
  });

  const rows = [...groups.values()]
    .sort((a, b) => a.key.localeCompare(b.key))
    .flatMap((group) =>
      [...group.items.entries()].map(([itemId, entry]) => {
        const net = entry.incoming - entry.outgoing;
        return [...group.extra, itemLabel(itemId), entry.incoming, entry.outgoing, net, stockAt(itemId, group.endDate), entry.count];
      }),
    );

  return rows.length ? [header, ...rows] : [header, [['Belum ada transaksi']]];
}

function buildDepreciationRows() {
  const header = [['Barang', 'Header'], ['Harga Awal', 'Header'], ['Aturan', 'Header'], ['Mulai', 'Header'], ['Sampai', 'Header'], ['Jenis', 'Header'], ['Nilai/Bulan', 'Header'], ['#', 'Header'], ['Periode', 'Header'], ['Penurunan', 'Header'], ['Harga Akhir', 'Header']];
  if (!state.items.length) return [header, [['Belum ada barang']]];

  return [header, ...state.items.flatMap((item) => {
    const plan = depreciationPlan(item);
    const label = `${item.code} · ${item.name}`;
    if (!plan.rules.length) return [[label, plan.base, '', '', '', '', '', '', '', 0, plan.base]];

    return [
      ...plan.rows.map((row) => [
        label,
        plan.base,
        row.ruleNumber,
        row.ruleStart,
        row.ruleEnd,
        row.ruleMode === 'percent' ? 'Persen' : 'Nominal',
        row.ruleValue,
        row.number,
        `${row.from} s/d ${row.to}`,
        row.amount,
        row.after,
      ]),
      [label, plan.base, 'AKHIR', '', '', '', '', 'Harga akhir barang', '', plan.total, plan.finalPrice],
    ];
  })];
}

function buildReferenceRows() {
  return [
    [['INVENTARIS DINETKAN', 'Title']],
    [['REKAP EXPORT EXCEL', 'Label']],
    [['Diekspor', 'Label'], [todayISO()]],
    [['Periode terpilih', 'Label'], [periodTitle()]],
    [['Jenis barang', 'Label'], [state.items.length]],
    [['Jumlah transaksi', 'Label'], [mergedTransactions.length]],
    [['Rumus stok', 'Label'], ['Stok akhir = Stok awal + Barang masuk - Barang keluar']],
    [['Rumus penurunan', 'Label'], ['Tiap aturan dihitung per bulan; aturan berikutnya memakai harga setelah aturan sebelumnya']],
    [['Periode penurunan', 'Label'], ['Tiap periode dihitung dari tanggal mulai ke tanggal yang sama di bulan berikutnya']],
    [['Petunjuk', 'Label'], ['Sheet Harian = mutasi per tanggal']],
    [['', ''], ['Sheet Mingguan = ringkasan per minggu Senin-Minggu']],
    [['', ''], ['Sheet Bulanan = ringkasan per bulan kalender']],
    [['', ''], ['Sheet Tahunan = ringkasan per tahun kalender']],
    [['', ''], ['Saldo akhir dihitung dari seluruh transaksi hingga akhir periode pada baris tersebut']],
    [['', ''], ['Sheet Periode Terpilih mengikuti filter hari/minggu/bulan di dashboard']],
  ];
}

function exportExcel() {
  const allTransactions = [...mergedTransactions].sort((a, b) => a.date.localeCompare(b.date) || (a.createdAt || 0) - (b.createdAt || 0));
  const sheets = [
    { name: 'Petunjuk', rows: buildReferenceRows() },
    { name: 'Periode Terpilih', rows: buildTransactionRows(periodTransactions()) },
    { name: 'Master Barang', rows: buildMasterRows() },
    { name: 'Penurunan Harga', rows: buildDepreciationRows() },
    { name: 'Transaksi', rows: buildTransactionRows(allTransactions) },
    { name: 'Harian', rows: buildSummaryRows('day') },
    { name: 'Mingguan', rows: buildSummaryRows('week') },
    { name: 'Bulanan', rows: buildSummaryRows('month') },
    { name: 'Tahunan', rows: buildSummaryRows('year') },
  ];
  const xml = buildWorkbook(sheets);
  download(xml, `inventaris-referensi-${todayISO()}.xls`, 'application/vnd.ms-excel');
  toast('Excel berisi penurunan harga dan rekap harian, mingguan, bulanan, tahunan diunduh.');
}

function importJson(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!Array.isArray(parsed.items) || !Array.isArray(parsed.transactions)) throw new Error('format invalid');
      const imported = normalizeInventoryState(parsed);
      const invalidDates = imported.transactions.filter((transaction) => !/^\d{4}-\d{2}-\d{2}$/.test(String(transaction.date || '')));
      if (invalidDates.length) throw new Error(`format tanggal invalid: ${invalidDates.length} transaksi`);
      state = imported;
      refreshMergedTransactions();
      selectedDate = mergedTransactions.length
        ? mergedTransactions.reduce((latest, transaction) => (transaction.date > latest ? transaction.date : latest), mergedTransactions[0].date)
        : todayISO();
      stockItemId = '';
      depreciationItemId = '';
      itemQuery = '';
      $('itemSearch').value = '';
      resetDepreciationForm();
      saveState();
      renderAll();
      toast('Cadangan berhasil dimuat.');
    } catch (error) {
      toast(`File cadangan ditolak: ${error.message}`, 'error');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function shiftPeriod(direction) {
  selectedDate = period === 'day' ? addDays(selectedDate, direction) : period === 'week' ? addDays(selectedDate, direction * 7) : addMonths(selectedDate, direction);
  renderAll();
}

function initEvents() {
  document.querySelectorAll('.period-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      period = tab.dataset.period;
      renderAll();
    });
  });

  $('periodDate').addEventListener('change', (event) => {
    selectedDate = event.target.value || todayISO();
    renderAll();
  });
  $('prevPeriod').addEventListener('click', () => shiftPeriod(-1));
  $('nextPeriod').addEventListener('click', () => shiftPeriod(1));
  $('todayBtn').addEventListener('click', () => {
    selectedDate = todayISO();
    renderAll();
  });

  $('itemForm').addEventListener('submit', submitItem);
  $('cancelItemEdit').addEventListener('click', resetItemForm);
  $('transactionForm').addEventListener('submit', submitTransaction);
  $('trxItem').addEventListener('change', updateAvailableStock);
  $('trxType').addEventListener('change', updateAvailableStock);

  $('depreciationForm').addEventListener('submit', submitDepreciation);
  $('depItem').addEventListener('change', (event) => {
    depreciationItemId = event.target.value;
    resetDepreciationForm();
    renderDepreciationOptions();
  });
  $('depClear').addEventListener('click', clearDepreciation);
  $('depreciationResult').addEventListener('click', (event) => {
    const ruleId = event.target.dataset.deleteDep;
    if (ruleId) deleteDepreciationRule(ruleId);
  });

  $('itemSearch').addEventListener('input', (event) => {
    itemQuery = event.target.value;
    renderItems();
  });

  $('itemTableBody').addEventListener('click', (event) => {
    const editId = event.target.dataset.edit;
    const depreciateId = event.target.dataset.depreciate;
    const deleteId = event.target.dataset.delete;
    if (editId) {
      const item = itemById(editId);
      if (item) populateItemForm(item);
    }
    if (depreciateId) {
      const item = itemById(depreciateId);
      if (!item) return;
      depreciationItemId = depreciateId;
      resetDepreciationForm();
      renderDepreciationOptions();
      document.getElementById('penurunan-harga')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      $('depValue').focus();
    }
    if (deleteId) {
      const item = itemById(deleteId);
      if (!item || !window.confirm(`Hapus ${item.name} beserta seluruh transaksinya?`)) return;
      state.items = state.items.filter((entry) => entry.id !== deleteId);
      state.transactions = state.transactions.filter((entry) => entry.itemId !== deleteId);
      state.depreciations = state.depreciations.filter((entry) => entry.itemId !== deleteId);
      refreshMergedTransactions();
      if (editingItemId === deleteId) resetItemForm();
      if (stockItemId === deleteId) stockItemId = '';
      if (depreciationItemId === deleteId) depreciationItemId = '';
      saveState();
      renderAll();
      toast('Barang dihapus.');
    }
  });

  $('transactionTableBody').addEventListener('click', (event) => {
    const id = event.target.dataset.deleteTrx;
    if (!id || !window.confirm('Hapus transaksi ini?')) return;
    state.transactions = state.transactions.filter((transaction) => transaction.id !== id);
    saveState();
    refreshMergedTransactions();
    renderAll();
    toast('Transaksi dihapus.');
  });

  $('stockItemSelect').addEventListener('change', (event) => {
    stockItemId = event.target.value;
    renderStockCard();
  });

  $('exportJsonBtn').addEventListener('click', exportJson);
  $('importJsonBtn').addEventListener('click', () => $('importFile').click());
  $('importFile').addEventListener('change', importJson);
  $('exportCsvBtn').addEventListener('click', exportCsv);
  $('exportExcelBtn').addEventListener('click', exportExcel);
  $('resetBtn').addEventListener('click', () => {
    if (!window.confirm('Hapus semua barang, transaksi, dan aturan penurunan harga?')) return;
    state = emptyState();
    refreshMergedTransactions();
    stockItemId = '';
    depreciationItemId = '';
    itemQuery = '';
    $('itemSearch').value = '';
    resetDepreciationForm();
    resetItemForm();
    saveState();
    renderAll();
    toast('Data dikosongkan.');
  });
  $('printBtn').addEventListener('click', () => window.print());

  const toggle = $('mobileToggle');
  const sidebar = $('sidebar');
  const backdrop = $('sidebarBackdrop');
  const closeButton = $('sidebarClose');
  const links = [...document.querySelectorAll('.nav-link')];

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
  links.forEach((link) => link.addEventListener('click', () => setSidebar(false)));

  const sections = links.map((link) => document.querySelector(link.getAttribute('href'))).filter(Boolean);
  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      links.forEach((link) => link.classList.toggle('active', link.getAttribute('href') === `#${visible.target.id}`));
    },
    { rootMargin: '-15% 0px -60% 0px', threshold: [0, 0.25, 0.5] },
  );
  sections.forEach((section) => observer.observe(section));
}

$('trxDate').value = todayISO();
resetItemForm();
initEvents();
renderAll();
