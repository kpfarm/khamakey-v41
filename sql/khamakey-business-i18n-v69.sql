-- KhamaKey v69 — Traduzioni pagine Business (Sprint G1)
-- Applica dopo v68 su Supabase.

-- ---------------------------------------------------------------------------
-- Impostazioni internazionalizzazione per attività
-- ---------------------------------------------------------------------------
create table if not exists public.business_i18n_settings (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  enabled boolean not null default false,
  fallback_locale text not null default 'en' references public.platform_supported_locales(locale) on delete restrict,
  locales text[] not null default array['it','en','fr','de','es'],
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Traduzioni campo-per-campo (incrementale, sync background)
-- ---------------------------------------------------------------------------
create table if not exists public.business_page_i18n (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  locale text not null references public.platform_supported_locales(locale) on delete restrict,
  field_path text not null,
  source_text text,
  source_hash text not null default '',
  translated_text text not null,
  updated_at timestamptz not null default now(),
  unique (business_id, locale, field_path)
);

create index if not exists business_page_i18n_business_locale_idx
  on public.business_page_i18n(business_id, locale);

-- ---------------------------------------------------------------------------
-- RLS — proprietario attività
-- ---------------------------------------------------------------------------
alter table public.business_i18n_settings enable row level security;
alter table public.business_page_i18n enable row level security;

drop policy if exists business_i18n_settings_owner_select on public.business_i18n_settings;
create policy business_i18n_settings_owner_select on public.business_i18n_settings
for select to authenticated
using (
  exists (
    select 1 from public.businesses b
    where b.id = business_i18n_settings.business_id
      and b.profile_id = auth.uid()
  )
  or app_private.current_user_has_platform_permission('admin.full')
);

drop policy if exists business_i18n_settings_owner_write on public.business_i18n_settings;
create policy business_i18n_settings_owner_write on public.business_i18n_settings
for all to authenticated
using (
  exists (
    select 1 from public.businesses b
    where b.id = business_i18n_settings.business_id
      and b.profile_id = auth.uid()
  )
  or app_private.current_user_has_platform_permission('admin.full')
)
with check (
  exists (
    select 1 from public.businesses b
    where b.id = business_i18n_settings.business_id
      and b.profile_id = auth.uid()
  )
  or app_private.current_user_has_platform_permission('admin.full')
);

drop policy if exists business_page_i18n_owner_select on public.business_page_i18n;
create policy business_page_i18n_owner_select on public.business_page_i18n
for select to authenticated
using (
  exists (
    select 1 from public.businesses b
    where b.id = business_page_i18n.business_id
      and b.profile_id = auth.uid()
  )
  or app_private.current_user_has_platform_permission('admin.full')
);

drop policy if exists business_page_i18n_owner_write on public.business_page_i18n;
create policy business_page_i18n_owner_write on public.business_page_i18n
for all to authenticated
using (
  exists (
    select 1 from public.businesses b
    where b.id = business_page_i18n.business_id
      and b.profile_id = auth.uid()
  )
  or app_private.current_user_has_platform_permission('admin.full')
)
with check (
  exists (
    select 1 from public.businesses b
    where b.id = business_page_i18n.business_id
      and b.profile_id = auth.uid()
  )
  or app_private.current_user_has_platform_permission('admin.full')
);

-- Lettura pubblica anonima per Worker (via service role o RPC dedicata in fase successiva)
drop policy if exists business_page_i18n_public_select on public.business_page_i18n;
create policy business_page_i18n_public_select on public.business_page_i18n
for select to anon
using (true);

drop policy if exists business_i18n_settings_public_select on public.business_i18n_settings;
create policy business_i18n_settings_public_select on public.business_i18n_settings
for select to anon
using (enabled = true);
