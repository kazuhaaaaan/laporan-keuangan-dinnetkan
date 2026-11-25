(function () {
  const config = window.DINETKAN_SUPABASE || {};
  const table = config.table || 'app_state';
  const FINANCE_KEY = 'dinetkan-finance-v1';
  const INVENTORY_KEY = 'dinetkan-inventory-v1';
  const timers = new Map();
  let applyingRemote = false;

  function isConfigured() {
    return Boolean(
      config.enabled
      && config.url
      && config.anonKey
      && !String(config.url).includes('YOUR_PROJECT')
      && !String(config.anonKey).includes('YOUR_ANON_KEY'),
    );
  }

  function collectionUrl() {
    return `${String(config.url).replace(/\/+$/, '')}/rest/v1/${table}`;
  }

  function rowUrl(id) {
    return `${collectionUrl()}?id=eq.${encodeURIComponent(id)}&select=payload,updated_at`;
  }

  function requestHeaders(extra = {}) {
    return {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
      'Content-Type': 'application/json',
      ...extra,
    };
  }

  function emit(name, detail) {
    window.dispatchEvent(new CustomEvent(name, { detail }));
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

  async function fetchState(id) {
    const response = await fetch(rowUrl(id), {
      headers: requestHeaders({ Accept: 'application/json' }),
      cache: 'no-store',
    });
    if (!response.ok) {
      throw new Error(`Supabase GET ${id} gagal (${response.status}): ${await response.text()}`);
    }
    const rows = await response.json();
    return rows[0]?.payload || null;
  }

  async function upsertState(id, payload) {
    const response = await fetch(collectionUrl(), {
      method: 'POST',
      headers: requestHeaders({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify({ id, payload, updated_at: new Date().toISOString() }),
    });
    if (!response.ok) {
      throw new Error(`Supabase POST ${id} gagal (${response.status}): ${await response.text()}`);
    }
  }

  function schedulePush(id, getPayload) {
    if (!isConfigured() || applyingRemote || config.autoPush === false) return;
    const previous = timers.get(id);
    if (previous) clearTimeout(previous);
    timers.set(id, setTimeout(async () => {
      timers.delete(id);
      try {
        setStatus('Supabase: mengirim...', 'busy');
        await upsertState(id, getPayload());
        setStatus('Supabase: tersinkron', 'ok');
      } catch (error) {
        notifyError(error);
      }
    }, 500));
  }

  async function pullAll() {
    if (!isConfigured() || config.autoPull === false) return { ok: false, reason: 'not-configured' };
    setStatus('Supabase: menarik...', 'busy');
    try {
      const [finance, inventory] = await Promise.all([fetchState('finance'), fetchState('inventory')]);

      if (finance) {
        applyingRemote = true;
        try {
          if (typeof window.importFinanceBackup === 'function') {
            const result = window.importFinanceBackup(JSON.stringify(finance));
            if (!result.ok) throw new Error(`Data keuangan dari Supabase ditolak: ${result.errors.join(' ')}`);
          } else {
            localStorage.setItem(FINANCE_KEY, JSON.stringify(finance));
          }
        } finally {
          applyingRemote = false;
        }
      }

      if (inventory) {
        applyingRemote = true;
        try {
          localStorage.setItem(INVENTORY_KEY, JSON.stringify(inventory));
        } finally {
          applyingRemote = false;
        }
      }

      const hasData = Boolean(finance || inventory);
      setStatus(hasData ? 'Supabase: tersinkron' : 'Supabase: kosong', hasData ? 'ok' : '');
      emit('dinetkan:remote-updated', { finance: Boolean(finance), inventory: Boolean(inventory) });
      return { ok: true, finance: Boolean(finance), inventory: Boolean(inventory) };
    } catch (error) {
      setStatus('Supabase: gagal', 'error');
      notifyError(error);
      return { ok: false, error: error.message };
    }
  }

  async function pushAll() {
    if (!isConfigured()) return { ok: false, reason: 'not-configured' };
    setStatus('Supabase: mengirim...', 'busy');
    try {
      const finance = readLocal(FINANCE_KEY);
      const inventory = readLocal(INVENTORY_KEY);
      if (!finance && !inventory) throw new Error('Belum ada data lokal untuk dikirim.');
      const jobs = [];
      if (finance) jobs.push(upsertState('finance', finance));
      if (inventory) jobs.push(upsertState('inventory', inventory));
      await Promise.all(jobs);
      setStatus('Supabase: tersinkron', 'ok');
      return { ok: true };
    } catch (error) {
      setStatus('Supabase: gagal', 'error');
      notifyError(error);
      return { ok: false, error: error.message };
    }
  }

  function renderControl() {
    if (document.querySelector('.supabase-sync')) return;
    const footer = document.querySelector('.sidebar-footer');
    if (!footer) return;
    const ready = isConfigured();
    const box = document.createElement('div');
    box.className = 'supabase-sync';
    box.innerHTML = `
      <div class="supabase-status" data-mode="${ready ? '' : 'off'}">
        <span class="dot"></span>
        <span id="supabaseStatus">Supabase: ${ready ? 'siap' : 'belum dikonfigurasi'}</span>
      </div>
      <div class="supabase-actions">
        <button type="button" id="supabasePull" ${ready ? '' : 'disabled'}>Tarik</button>
        <button type="button" id="supabasePush" ${ready ? '' : 'disabled'}>Kirim</button>
      </div>`;
    footer.prepend(box);

    document.getElementById('supabasePull')?.addEventListener('click', async () => {
      const result = await pullAll();
      if (result.ok) window.showToast?.('Data dari Supabase berhasil dimuat.');
    });
    document.getElementById('supabasePush')?.addEventListener('click', async () => {
      const result = await pushAll();
      if (result.ok) window.showToast?.('Data lokal berhasil dikirim ke Supabase.');
    });
  }

  window.SupabaseSync = {
    isConfigured,
    isApplyingRemote: () => applyingRemote,
    pushFinance: (state) => schedulePush('finance', () => state),
    pushInventory: (state) => schedulePush('inventory', () => state),
    pullAll,
    pushAll,
  };

  function init() {
    renderControl();
    if (isConfigured() && config.autoPull !== false) pullAll();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
