// Konfigurasi Supabase dibaca dari environment variable Vite (.env.local).
// Hanya VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY yang boleh dipakai di browser.
// Secret key tidak boleh disimpan di frontend.

export const config = Object.freeze({
  enabled: Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY),
  url: String(import.meta.env.VITE_SUPABASE_URL || '').replace(/\/+$/, ''),
  anonKey: String(import.meta.env.VITE_SUPABASE_ANON_KEY || ''),
  autoPull: String(import.meta.env.VITE_SUPABASE_AUTO_PULL || '') !== 'false',
  autoPush: String(import.meta.env.VITE_SUPABASE_AUTO_PUSH || '') !== 'false',
  requireAuth: String(import.meta.env.VITE_SUPABASE_REQUIRE_AUTH || '') !== 'false',
});

// Kompatibilitas dengan kode lama yang membaca objek global.
window.DINETKAN_SUPABASE = config;
