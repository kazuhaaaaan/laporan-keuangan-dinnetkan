-- REKOMENDASI RLS (belum dijalankan otomatis).
-- Tinjau policy yang sudah ada di Supabase sebelum menjalankan file ini.
-- Tujuannya: anon tidak bisa membaca/menulis data; hanya pengguna login yang
-- bisa membaca, admin/staff yang bisa menulis, dan viewer read-only.

create or replace function public.app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'viewer');
$$;

alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.auxiliary_accounts enable row level security;
alter table public.opening_balances enable row level security;
alter table public.fiscal_periods enable row level security;
alter table public.journal_entries enable row level security;
alter table public.journal_lines enable row level security;
alter table public.inventory enable row level security;
alter table public.inventory_movements enable row level security;

-- Helper: hapus policy lama dengan nama yang sama agar idempotent.
do $$
declare
  t text;
  p text;
begin
  foreach t in array array[
    'profiles', 'accounts', 'auxiliary_accounts', 'opening_balances',
    'fiscal_periods', 'journal_entries', 'journal_lines',
    'inventory', 'inventory_movements'
  ] loop
    foreach p in array array['read_authenticated', 'insert_staff', 'update_staff', 'delete_admin'] loop
      execute format('drop policy if exists %I on public.%I', t || '_' || p, t);
    end loop;
  end loop;
end $$;

-- SELECT: semua pengguna login boleh membaca.
do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'accounts', 'auxiliary_accounts', 'opening_balances',
    'fiscal_periods', 'journal_entries', 'journal_lines',
    'inventory', 'inventory_movements'
  ] loop
    execute format('create policy %I on public.%I for select to authenticated using (true)', t || '_read_authenticated', t);
  end loop;
end $$;

-- INSERT/UPDATE: admin dan staff.
do $$
declare t text;
begin
  foreach t in array array[
    'accounts', 'auxiliary_accounts', 'opening_balances', 'fiscal_periods',
    'journal_entries', 'journal_lines', 'inventory', 'inventory_movements'
  ] loop
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.app_role() in (''admin'',''staff''))',
      t || '_insert_staff', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.app_role() in (''admin'',''staff'')) with check (public.app_role() in (''admin'',''staff''))',
      t || '_update_staff', t);
  end loop;
end $$;

-- DELETE: admin saja (termasuk draft jurnal).
do $$
declare t text;
begin
  foreach t in array array[
    'accounts', 'auxiliary_accounts', 'opening_balances', 'fiscal_periods',
    'journal_entries', 'journal_lines', 'inventory', 'inventory_movements'
  ] loop
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.app_role() = ''admin'')',
      t || '_delete_admin', t);
  end loop;
end $$;

-- Profil: pengguna boleh membuat profilnya sendiri; hanya admin yang mengubah peran.
drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self
  on public.profiles for insert to authenticated
  with check (auth.uid() = id);

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin
  on public.profiles for update to authenticated
  using (public.app_role() = 'admin')
  with check (public.app_role() = 'admin');

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
