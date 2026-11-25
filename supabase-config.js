// Konfigurasi Supabase untuk dashboard Dinetkan.
// Isi nilai di bawah, lalu ubah enabled menjadi true.
// Anon key boleh disimpan di frontend; keamanan diatur lewat RLS di Supabase.
window.DINETKAN_SUPABASE = {
  enabled: false,
  url: 'https://YOUR_PROJECT.supabase.co',
  anonKey: 'YOUR_ANON_KEY',
  table: 'app_state',
  autoPull: true,
  autoPush: true,
};
