-- Jalankan di Supabase SQL Editor.
-- Tabel ini menyimpan payload aplikasi sebagai JSON, sehingga struktur laporan
-- tetap fleksibel tanpa mengubah skema setiap kali ada field baru.

create table if not exists public.app_state (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

-- Mode demo/single-workspace: izinkan anon membaca dan menulis.
-- Untuk produksi yang lebih aman, ganti policy ini dengan policy berbasis auth.uid().
drop policy if exists "app_state_select_all" on public.app_state;
create policy "app_state_select_all"
  on public.app_state for select
  using (true);

drop policy if exists "app_state_insert_all" on public.app_state;
create policy "app_state_insert_all"
  on public.app_state for insert
  with check (true);

drop policy if exists "app_state_update_all" on public.app_state;
create policy "app_state_update_all"
  on public.app_state for update
  using (true)
  with check (true);

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.app_state to anon, authenticated;

-- Baris yang dipakai aplikasi:
--   id = 'finance'    -> state keuangan (entries, openingBalances, accounts, deletedAccounts)
--   id = 'inventory'  -> state inventaris (items, transactions, depreciations)
