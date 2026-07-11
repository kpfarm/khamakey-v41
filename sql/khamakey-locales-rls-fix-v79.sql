-- KhamaKey v79 — Abilita RLS su platform_supported_locales (mancava)
-- Trovato dall'advisory di sicurezza Supabase (2026-07-11): la tabella lingue
-- (it/en/fr/de/es) era leggibile E scrivibile da chiunque avesse la anon key,
-- senza alcuna policy RLS. Probabilmente creata a mano prima che la migrazione
-- v66 completa (che include questa RLS) venisse applicata correttamente.
--
-- Unico consumer noto: pages/admin.js, autenticato — nessuna regressione attesa.
-- Idempotente.

alter table public.platform_supported_locales enable row level security;

drop policy if exists platform_locales_select on public.platform_supported_locales;
create policy platform_locales_select on public.platform_supported_locales
for select to authenticated using (true);

drop policy if exists platform_locales_write on public.platform_supported_locales;
create policy platform_locales_write on public.platform_supported_locales
for all to authenticated
using (
  app_private.current_user_has_platform_permission('settings.manage')
  or app_private.current_user_has_platform_permission('admin.full')
)
with check (
  app_private.current_user_has_platform_permission('settings.manage')
  or app_private.current_user_has_platform_permission('admin.full')
);
