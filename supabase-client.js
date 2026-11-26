import { createClient } from '@supabase/supabase-js';
import { config } from './supabase-config.js';

// Satu-satunya client Supabase untuk seluruh aplikasi.
// Kunci yang dipakai adalah publishable/anon key; RLS tetap menjadi penjaga akhir.
export const supabase = config.enabled
  ? createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'dinetkan-finance-auth',
      },
      global: { headers: { 'X-Application-Name': 'dinetkan-finance' } },
    })
  : null;

export function requireSupabase() {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi melalui VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.');
  return supabase;
}
