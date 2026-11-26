import { config } from './supabase-config.js';
import { supabase, requireSupabase } from './supabase-client.js';
import { TABLES, buildRemoteSnapshot, buildLocalSnapshot } from './supabase-mapper.js';

const FINANCE_KEY = 'dinetkan-finance-v1';
const INVENTORY_KEY = 'dinetkan-inventory-v1';
const PAGE_SIZE = 1000;
const timers = new Map();

let session = null;
let profile = null;
let applyingRemote = false;
let initialized = false;

export function isConfigured() {
  return Boolean(config.enabled && config.url && config.anonKey);
}

export function isApplyingRemote() {
  return applyingRemote;
}

export function getSession() {
  return session;
}

export function getProfile() {
  return profile;
}

export function canWrite() {
  if (!isConfigured()) return true;
  return Boolean(session && profile && String(profile.role) !== 'viewer');
}

function emit(name, detail) {
  document.dispatchEvent(new CustomEvent(name, { detail }));
}

function notifyError(error) {
  console.error('[SupabaseSync]', error);
  emit('dinetkan:sync-error', { message: error?.message || String(error) });
}

function setStatus(message, mode = '') {
  const node = document.getElementById('supabaseStatus');
  if (!node) return;
  node.textContent = message;
  node.dataset.mode = mode;
}

function readLocal(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function writeLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    notifyError(error);
    return false;
  }
}

async function fetchAllRows(table) {
  const client = requireSupabase();
  const rows = [];
  let from = 0;
  while (true) {
    const { data, error } = await client
      .from(table)
      .select('*')
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    const batch = Array.isArray(data) ? data : [];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

async function upsertRows(table, rows) {
  if (!rows.length) return;
  const client = requireSupabase();
  const { error } = await client.from(table).upsert(rows, { onConflict: 'id' });
  if (error) throw new Error(`${table}: ${error.message}`);
}

async function ensureProfile(user) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('profiles')
    .select('id,full_name,email,role')
    .eq('id', user.id)
    .maybeSingle();
  if (error) throw new Error(`profiles: ${error.message}`);
  if (!data) {
    const payload = {
      id: user.id,
      email: user.email || '',
      full_name: String(user.user_metadata?.full_name || user.email || ''),
    };
    const { error: insertError } = await client.from('profiles').upsert(payload, { onConflict: 'id' });
    if (insertError) {
      console.warn('[SupabaseSync] profile tidak bisa dibuat; memakai role default staff.', insertError.message);
      return { id: user.id, email: user.email || '', role: 'staff' };
    }
    return { ...payload, role: 'staff' };
  }
  return data;
}

export async function signIn(email, password) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data.session;
}

export async function signOut() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

export async function deleteDraftJournal(id) {
  if (!canWrite()) throw new Error('Role viewer tidak dapat menghapus jurnal.');
  const client = requireSupabase();
  const { error: linesError } = await client.from('journal_lines').delete().eq('journal_entry_id', id);
  if (linesError) throw new Error(`journal_lines: ${linesError.message}`);
  const { error: entryError } = await client
    .from('journal_entries')
    .delete()
    .eq('id', id)
    .eq('status', 'draft');
  if (entryError) throw new Error(`journal_entries: ${entryError.message}`);
}

export async function pullAll() {
  if (!isConfigured()) return { ok: false, reason: 'not-configured' };
  if (!session && config.requireAuth) return { ok: false, reason: 'unauthorized' };
  setStatus('Supabase: menarik...', 'busy');
  try {
    const raw = await Promise.all(TABLES.map((table) => fetchAllRows(table)));
    const rows = Object.fromEntries(TABLES.map((table, index) => [table, raw[index]]));
    const builtinCodes = typeof window.getAccountList === 'function'
      ? window.getAccountList().map((account) => account.code)
      : [];
    const local = buildLocalSnapshot(rows, builtinCodes);

    applyingRemote = true;
    try {
      if (typeof window.importFinanceBackup === 'function') {
        const result = window.importFinanceBackup(JSON.stringify(local.finance));
        if (!result.ok) throw new Error(`Data keuangan dari Supabase ditolak: ${result.errors.join(' ')}`);
      } else {
        writeLocal(FINANCE_KEY, local.finance);
      }
      writeLocal(INVENTORY_KEY, local.inventory);
    } finally {
      applyingRemote = false;
    }

    const totalRows = raw.reduce((total, rows) => total + rows.length, 0);
    setStatus(totalRows ? 'Supabase: tersinkron' : 'Supabase: kosong', totalRows ? 'ok' : '');
    emit('dinetkan:remote-updated', {
      finance: local.finance.entries.length,
      inventory: local.inventory.items.length,
      empty: totalRows === 0,
    });
    return { ok: true, ...local };
  } catch (error) {
    setStatus('Supabase: gagal', 'error');
    notifyError(error);
    return { ok: false, error: error.message };
  }
}

export async function pushAll() {
  if (!isConfigured()) return { ok: false, reason: 'not-configured' };
  if (!canWrite()) return { ok: false, reason: 'read-only' };
  setStatus('Supabase: mengirim...', 'busy');
  try {
    const finance = readLocal(FINANCE_KEY);
    const inventory = readLocal(INVENTORY_KEY);
    if (!finance && !inventory) throw new Error('Belum ada data lokal untuk dikirim.');
    const snapshot = buildRemoteSnapshot({
      finance: finance || {},
      inventory: inventory || {},
      itemDefinitions: typeof window.getInventoryItemDefinitions === 'function'
        ? window.getInventoryItemDefinitions()
        : [],
      accounts: typeof window.getAccountList === 'function' ? window.getAccountList() : [],
      userId: session?.user?.id || null,
    });
    const order = [
      'accounts',
      'auxiliary_accounts',
      'fiscal_periods',
      'opening_balances',
      'journal_entries',
      'journal_lines',
      'inventory',
      'inventory_movements',
    ];
    for (const table of order) await upsertRows(table, snapshot[table] || []);
    setStatus('Supabase: tersinkron', 'ok');
    emit('dinetkan:pushed', { rows: order.reduce((total, table) => total + (snapshot[table]?.length || 0), 0) });
    return { ok: true, rows: snapshot };
  } catch (error) {
    setStatus('Supabase: gagal', 'error');
    notifyError(error);
    return { ok: false, error: error.message };
  }
}

function schedulePush() {
  if (!isConfigured() || applyingRemote || config.autoPush === false) return;
  const previous = timers.get('all');
  if (previous) clearTimeout(previous);
  timers.set('all', setTimeout(async () => {
    timers.delete('all');
    await pushAll();
  }, 500));
}

export function pushFinance() {
  schedulePush();
}

export function pushInventory() {
  schedulePush();
}

function bindAuthForm(form) {
  if (!form || form.dataset.bound) return;
  form.dataset.bound = 'true';
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = form.querySelector('[data-auth-email]')?.value || '';
    const password = form.querySelector('[data-auth-password]')?.value || '';
    const button = form.querySelector('button[type="submit"]');
    if (button) button.disabled = true;
    try {
      await signIn(email, password);
      window.showToast?.('Login Supabase berhasil.');
    } catch (error) {
      window.showToast?.(`Login gagal: ${error.message}`, 'error');
    } finally {
      if (button) button.disabled = false;
    }
  });
}

function authFormHtml() {
  return `
    <form class="auth-form" data-auth-form>
      <label class="field">
        <span>Email</span>
        <input type="email" data-auth-email required autocomplete="username" />
      </label>
      <label class="field">
        <span>Password</span>
        <input type="password" data-auth-password required autocomplete="current-password" />
      </label>
      <button class="btn btn-primary" type="submit">Masuk</button>
    </form>`;
}

function applyAuthGate() {
  const locked = isConfigured() && config.requireAuth && !session;
  document.body.classList.toggle('auth-locked', locked);
  const existing = document.querySelector('.auth-gate');
  if (locked && !existing) {
    const gate = document.createElement('div');
    gate.className = 'auth-gate';
    gate.innerHTML = `
      <div class="auth-card">
        <p class="eyebrow">SUPABASE AUTH</p>
        <h2>Masuk ke Dinetkan Finance</h2>
        <p class="subtitle">Data laporan tersedia setelah sesi dibuat.</p>
        ${authFormHtml()}
      </div>`;
    document.body.appendChild(gate);
    bindAuthForm(gate.querySelector('[data-auth-form]'));
  } else if (!locked && existing) {
    existing.remove();
  }
}

function renderControl() {
  if (document.querySelector('.supabase-sync')) {
    renderAuthDetails();
    return;
  }
  const footer = document.querySelector('.sidebar-footer');
  if (!footer) return;
  const box = document.createElement('div');
  box.className = 'supabase-sync';
  box.innerHTML = `
    <div class="supabase-status" data-mode="${isConfigured() ? '' : 'off'}">
      <span class="dot"></span>
      <span id="supabaseStatus">Supabase: ${isConfigured() ? 'siap' : 'belum dikonfigurasi'}</span>
    </div>
    <div id="supabaseAuth"></div>
    <div class="supabase-actions">
      <button type="button" id="supabasePull" ${isConfigured() ? '' : 'disabled'}>Tarik</button>
      <button type="button" id="supabasePush" ${isConfigured() ? '' : 'disabled'}>Kirim</button>
    </div>`;
  footer.prepend(box);

  document.getElementById('supabasePull')?.addEventListener('click', async () => {
    const result = await pullAll();
    if (result.ok) window.showToast?.('Data dari Supabase berhasil dimuat.');
  });
  document.getElementById('supabasePush')?.addEventListener('click', async () => {
    const result = await pushAll();
    if (result.ok) window.showToast?.('Data lokal berhasil dikirim ke Supabase.');
    else if (result.reason === 'read-only') window.showToast?.('Role viewer bersifat read-only.', 'error');
  });

  renderAuthDetails();
}

function renderAuthDetails() {
  const host = document.getElementById('supabaseAuth');
  if (!host || !isConfigured()) return;
  if (!session) {
    host.innerHTML = `<div class="auth-inline">${authFormHtml()}</div>`;
    bindAuthForm(host.querySelector('[data-auth-form]'));
    return;
  }
  const role = String(profile?.role || 'staff');
  host.innerHTML = `
    <div class="auth-user">
      <span>${role} · ${session.user.email || 'pengguna'}</span>
      <button type="button" id="supabaseLogout">Keluar</button>
    </div>`;
  document.getElementById('supabaseLogout')?.addEventListener('click', async () => {
    try {
      await signOut();
      window.showToast?.('Sesi diakhiri.');
    } catch (error) {
      window.showToast?.(`Gagal keluar: ${error.message}`, 'error');
    }
  });
}

async function initAuth() {
  if (!isConfigured() || !supabase) {
    applyAuthGate();
    return;
  }
  const { data, error } = await supabase.auth.getSession();
  if (error) console.warn('[SupabaseSync] gagal memuat sesi.', error.message);
  session = data?.session || null;
  if (session) {
    try {
      profile = await ensureProfile(session.user);
    } catch (error) {
      console.warn('[SupabaseSync] gagal memuat profil.', error.message);
      profile = { id: session.user.id, email: session.user.email || '', role: 'staff' };
    }
  }
  applyAuthGate();
  renderControl();

  supabase.auth.onAuthStateChange(async (event, nextSession) => {
    session = nextSession;
    profile = null;
    if (session) {
      try {
        profile = await ensureProfile(session.user);
      } catch (error) {
        console.warn('[SupabaseSync] gagal memuat profil.', error.message);
        profile = { id: session.user.id, email: session.user.email || '', role: 'staff' };
      }
    }
    applyAuthGate();
    renderAuthDetails();
    if (event === 'SIGNED_IN' && config.autoPull !== false) await pullAll();
    if (event === 'SIGNED_OUT') {
      setStatus('Supabase: belum login', 'off');
      emit('dinetkan:remote-updated', { finance: 0, inventory: 0, signedOut: true });
    }
  });
}

function init() {
  if (initialized) return;
  initialized = true;
  renderControl();
  initAuth();
  if (isConfigured() && !config.requireAuth && config.autoPull !== false) pullAll();
}

window.SupabaseSync = {
  isConfigured,
  isApplyingRemote,
  getSession,
  getProfile,
  canWrite,
  signIn,
  signOut,
  deleteDraftJournal,
  pullAll,
  pushAll,
  pushFinance,
  pushInventory,
  refresh: pullAll,
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
