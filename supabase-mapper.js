// Mapping antara model localStorage aplikasi dan skema normalized Supabase.
// Tidak ada angka laporan yang disimpan ulang: laporan tetap dihitung dari
// journal_entries + journal_lines + opening_balances oleh data.js.

export const TABLES = [
  'profiles',
  'accounts',
  'auxiliary_accounts',
  'opening_balances',
  'fiscal_periods',
  'journal_entries',
  'journal_lines',
  'inventory',
  'inventory_movements',
];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MUTATION_RE = /\s\[mutasi:([^:\]]+):(in|out):([0-9.]+)\]$/i;

export function isUuid(value) {
  return UUID_RE.test(String(value || ''));
}

function hash32(input, seed) {
  let hash = seed >>> 0;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash >>> 0;
}

// UUID deterministik (versi 5) supaya upsert tidak pernah membuat duplikat.
export function uuidFor(namespace, value) {
  const key = `${namespace}:${value}`;
  const parts = [
    hash32(key, 0x811c9dc5),
    hash32(key, 0x9e3779b9),
    hash32(key, 0x85ebca6b),
    hash32(key, 0xc2b2ae35),
  ];
  const bytes = [];
  parts.forEach((part) => {
    bytes.push((part >>> 24) & 255, (part >>> 16) & 255, (part >>> 8) & 255, part & 255);
  });
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function buildAccountIndex(accounts) {
  const index = new Map();
  (accounts || []).forEach((account) => {
    if (!account) return;
    [account.code, account.helper, account.sourceCode].forEach((key) => {
      if (key) index.set(String(key), account);
    });
  });
  return index;
}

export function encodeLineDescription(description, mutation) {
  const base = String(description || '');
  if (!mutation || !mutation.item) return base;
  const type = String(mutation.type) === 'out' ? 'out' : 'in';
  return `${base} [mutasi:${mutation.item}:${type}:${Number(mutation.quantity) || 0}]`;
}

export function decodeLineDescription(description) {
  const text = String(description || '');
  const match = text.match(MUTATION_RE);
  if (!match) return { description: text, mutation: null };
  return {
    description: text.slice(0, match.index),
    mutation: { item: match[1], type: match[2], quantity: Number(match[3]) || 0 },
  };
}

function monthKey(date) {
  const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(String(date || ''));
  return match ? `${match[1]}-${match[2]}` : '';
}

function fiscalYearOf(entries, fallback = new Date().getFullYear()) {
  for (const entry of entries) {
    const year = Number(String(entry.date || '').slice(0, 4));
    if (Number.isInteger(year) && year > 1900) return year;
  }
  return fallback;
}

function buildPeriodRows(entries) {
  const byKey = new Map();
  (entries || []).forEach((entry) => {
    const key = monthKey(entry.date);
    if (!key || byKey.has(key)) return;
    const [year, month] = key.split('-').map(Number);
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const pad = (value) => String(value).padStart(2, '0');
    byKey.set(key, {
      id: uuidFor('fiscal-period', key),
      period_name: key,
      month,
      year,
      start_date: `${year}-${pad(month)}-01`,
      end_date: `${year}-${pad(month)}-${pad(lastDay)}`,
      is_closed: false,
    });
  });
  return [...byKey.values()];
}

function accountRow(account) {
  const code = String(account.code || '');
  return {
    id: isUuid(account.id) && account.id ? account.id : uuidFor('account', code),
    account_code: code,
    account_name: String(account.name || ''),
    account_type: String(account.type || 'aset'),
    normal_balance: String(account.side || 'debet'),
    parent_id: null,
    report_group: String(account.report || ''),
    is_active: true,
  };
}

function auxiliaryRows(accounts) {
  const rows = new Map();
  (accounts || []).forEach((account) => {
    const aliases = [account.sourceCode, account.helper].filter(Boolean);
    aliases.forEach((alias) => {
      if (String(alias) === String(account.code) || rows.has(String(alias))) return;
      rows.set(String(alias), {
        id: uuidFor('auxiliary', String(alias)),
        auxiliary_code: String(alias),
        auxiliary_name: String(account.name || ''),
        auxiliary_type: 'kode-sumber',
        description: `Alias untuk akun ${account.code}`,
        is_active: true,
      });
    });
  });
  return [...rows.values()];
}

/**
 * Ubah state lokal menjadi baris-baris tabel Supabase.
 * finance: { entries, openingBalances, accounts, deletedAccounts, settings }
 * inventory: { items, transactions, depreciations }
 * itemDefinitions: hasil getInventoryItemDefinitions() (built-in + lokal).
 */
export function buildRemoteSnapshot({ finance = {}, inventory = {}, itemDefinitions = [], accounts: accountList = [], userId = null } = {}) {
  const entries = Array.isArray(finance.entries) ? finance.entries : [];
  const customAccounts = Array.isArray(finance.accounts) ? finance.accounts : [];
  const accounts = accountList.length ? accountList : customAccounts;
  const accountIndex = buildAccountIndex(accounts);
  const accountRows = accounts.map(accountRow);
  const auxRows = auxiliaryRows(accounts);
  const periodRows = buildPeriodRows(entries);
  const periodIds = new Map(periodRows.map((row) => [row.period_name, row.id]));
  const year = fiscalYearOf(entries);

  const entryRows = [];
  const lineRows = [];
  const entryIds = new Map();
  entries.forEach((entry) => {
    if (String(entry.status || 'posted') !== 'posted') return;
    const ref = String(entry.ref || entry.id || '');
    const id = isUuid(entry.id) && entry.id ? entry.id : uuidFor('journal', ref);
    entryIds.set(ref, id);
    entryRows.push({
      id,
      journal_number: ref,
      transaction_date: String(entry.date || ''),
      description: String(entry.description || ''),
      reference_number: ref,
      journal_type: 'general',
      fiscal_year: Number(String(entry.date || '').slice(0, 4)) || year,
      period_id: periodIds.get(monthKey(entry.date)) || null,
      status: 'posted',
      created_by: userId,
    });

    (entry.lines || []).forEach((line, index) => {
      const code = String(line.code || '');
      const canonical = accountIndex.get(code);
      if (!canonical) return; // akun tak terpetakan tetap jadi diagnostik di lokal
      const aux = code === String(canonical.code) ? null : auxRows.find((row) => row.auxiliary_code === code);
      const decoded = decodeLineDescription(line.accountName || entry.description);
      lineRows.push({
        id: uuidFor('journal-line', `${ref}:${index + 1}`),
        journal_entry_id: id,
        account_id: accountRow(canonical).id,
        auxiliary_account_id: aux ? aux.id : null,
        line_number: index + 1,
        description: encodeLineDescription(decoded.description, line.mutation) || String(entry.description || ''),
        debit: Number(line.debit) || 0,
        credit: Number(line.kredit || line.credit) || 0,
      });
    });
  });

  const openingRows = [];
  Object.entries(finance.openingBalances || {}).forEach(([key, value]) => {
    const account = accountIndex.get(String(key));
    if (!account) return;
    const debit = Number(value && (value.debit ?? value.saldoAwalDebit)) || 0;
    const credit = Number(value && (value.kredit ?? value.saldoAwalKredit)) || 0;
    if (!debit && !credit) return;
    openingRows.push({
      id: uuidFor('opening-balance', `${account.code}:${year}`),
      account_id: accountRow(account).id,
      fiscal_year: year,
      debit,
      credit,
    });
  });

  const definitions = Array.isArray(itemDefinitions) && itemDefinitions.length
    ? itemDefinitions
    : (Array.isArray(inventory.items) ? inventory.items : []);
  const itemRows = [];
  const itemByCode = new Map();
  definitions.forEach((item) => {
    const code = String(item.code || '');
    if (!code) return;
    const id = isUuid(item.id) && item.id ? item.id : uuidFor('inventory', code);
    itemByCode.set(code, id);
    itemRows.push({
      id,
      item_code: code,
      item_name: String(item.name || ''),
      category: String(item.category || '') || null,
      acquisition_date: null,
      acquisition_cost: Number(item.price) || 0,
      quantity: Number(item.initialStock) || 0,
      unit: String(item.unit || '') || null,
      condition: null,
      description: String(item.location || '') || null,
    });
  });
  const localItems = Array.isArray(inventory.items) ? inventory.items : [];
  const remoteItemIdByLocalId = new Map();
  localItems.forEach((item) => {
    if (!item || !item.code) return;
    remoteItemIdByLocalId.set(String(item.id), itemByCode.get(String(item.code)) || uuidFor('inventory', String(item.code)));
  });

  const movementRows = [];
  (Array.isArray(inventory.transactions) ? inventory.transactions : []).forEach((transaction) => {
    const inventoryId = remoteItemIdByLocalId.get(String(transaction.itemId));
    if (!inventoryId) return;
    const reference = String(transaction.reference || '');
    movementRows.push({
      id: isUuid(transaction.id) && transaction.id ? transaction.id : uuidFor('inventory-movement', String(transaction.id)),
      inventory_id: inventoryId,
      movement_date: String(transaction.date || ''),
      movement_type: String(transaction.type) === 'out' ? 'out' : 'in',
      quantity: Number(transaction.quantity) || 0,
      description: String(transaction.note || reference || ''),
      journal_entry_id: entryIds.get(reference) || null,
    });
  });

  return {
    accounts: accountRows,
    auxiliary_accounts: auxRows,
    fiscal_periods: periodRows,
    opening_balances: openingRows,
    journal_entries: entryRows,
    journal_lines: lineRows,
    inventory: itemRows,
    inventory_movements: movementRows,
  };
}

/**
 * Ubah baris Supabase kembali menjadi state localStorage aplikasi.
 * Hanya journal_entries berstatus posted yang masuk laporan.
 */
export function buildLocalSnapshot(rows = {}, builtinCodes = []) {
  const accounts = Array.isArray(rows.accounts) ? rows.accounts : [];
  const auxiliary = Array.isArray(rows.auxiliary_accounts) ? rows.auxiliary_accounts : [];
  const entries = Array.isArray(rows.journal_entries) ? rows.journal_entries : [];
  const lines = Array.isArray(rows.journal_lines) ? rows.journal_lines : [];
  const openings = Array.isArray(rows.opening_balances) ? rows.opening_balances : [];
  const items = Array.isArray(rows.inventory) ? rows.inventory : [];
  const movements = Array.isArray(rows.inventory_movements) ? rows.inventory_movements : [];

  const accountById = new Map(accounts.map((row) => [row.id, row]));
  const auxById = new Map(auxiliary.map((row) => [row.id, row]));
  const builtin = new Set(builtinCodes.map((code) => String(code)));

  const linesByEntry = new Map();
  lines.forEach((line) => {
    const key = String(line.journal_entry_id || '');
    if (!linesByEntry.has(key)) linesByEntry.set(key, []);
    linesByEntry.get(key).push(line);
  });

  const localEntries = entries
    .filter((entry) => String(entry.status || 'draft') === 'posted')
    .map((entry) => {
      const entryLines = (linesByEntry.get(String(entry.id)) || [])
        .slice()
        .sort((a, b) => Number(a.line_number) - Number(b.line_number))
        .map((line) => {
          const account = accountById.get(String(line.account_id || ''));
          const aux = auxById.get(String(line.auxiliary_account_id || ''));
          const decoded = decodeLineDescription(line.description);
          return {
            code: String(aux?.auxiliary_code || account?.account_code || ''),
            debit: Number(line.debit) || 0,
            kredit: Number(line.credit) || 0,
            ...(decoded.description ? { accountName: decoded.description } : {}),
            ...(decoded.mutation ? { mutation: decoded.mutation } : {}),
          };
        })
        .filter((line) => line.code);
      return {
        id: String(entry.id),
        ref: String(entry.journal_number || entry.id),
        date: String(entry.transaction_date || ''),
        description: String(entry.description || ''),
        lines: entryLines,
      };
    });

  const openingBalances = {};
  openings.forEach((row) => {
    const account = accountById.get(String(row.account_id || ''));
    if (!account) return;
    const debit = Number(row.debit) || 0;
    const credit = Number(row.credit) || 0;
    if (!debit && !credit) return;
    openingBalances[String(account.account_code)] = { debit, kredit: credit };
  });

  const finance = {
    version: 1,
    entries: localEntries,
    openingBalances,
    settings: { migratedFrom: 'supabase' },
    accounts: accounts
      .filter((row) => !builtin.has(String(row.account_code)))
      .map((row) => ({
        code: String(row.account_code),
        name: String(row.account_name),
        type: String(row.account_type || 'aset'),
        side: String(row.normal_balance || 'debet'),
      })),
    deletedAccounts: accounts
      .filter((row) => row.is_active === false)
      .map((row) => String(row.account_code)),
  };

  const localItems = items.map((row) => ({
    id: String(row.id),
    code: String(row.item_code || ''),
    name: String(row.item_name || ''),
    category: String(row.category || ''),
    unit: String(row.unit || ''),
    location: String(row.description || ''),
    price: Number(row.acquisition_cost) || 0,
    minStock: 0,
    initialStock: Number(row.quantity) || 0,
    source: 'remote',
  }));

  const localTransactions = movements
    .filter((row) => !row.journal_entry_id)
    .map((row) => ({
      id: String(row.id),
      createdAt: Date.parse(row.created_at || '') || Date.now(),
      date: String(row.movement_date || ''),
      itemId: String(row.inventory_id || ''),
      type: String(row.movement_type) === 'out' ? 'out' : 'in',
      quantity: Number(row.quantity) || 0,
      note: String(row.description || ''),
      reference: '',
      source: 'local',
    }));

  return {
    finance,
    inventory: { items: localItems, transactions: localTransactions, depreciations: [] },
  };
}
