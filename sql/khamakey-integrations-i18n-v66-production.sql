-- KhamaKey v66 (produzione) — adattato a schema esistente cuxlwaocjqwzluycznyp
-- platform_integrations e platform_payment_transactions già presenti con colonne Stripe.

create table if not exists public.platform_supported_locales (
  locale text primary key,
  label text not null,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

insert into public.platform_supported_locales (locale, label, active, sort_order)
values
  ('it', 'Italiano', true, 1),
  ('en', 'English', true, 2),
  ('fr', 'Français', true, 3),
  ('de', 'Deutsch', true, 4),
  ('es', 'Español', true, 5)
on conflict (locale) do nothing;

create table if not exists public.platform_moment_catalog_i18n (
  id uuid primary key default gen_random_uuid(),
  catalog_id uuid not null references public.platform_moment_catalog(id) on delete cascade,
  locale text not null references public.platform_supported_locales(locale) on delete restrict,
  name text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (catalog_id, locale)
);

alter table public.platform_webhook_events
  add column if not exists status text,
  add column if not exists received_at timestamptz;

update public.platform_webhook_events
set
  status = coalesce(status, case when processed then 'processed' else 'received' end),
  received_at = coalesce(received_at, created_at)
where status is null or received_at is null;

alter table public.platform_supported_locales enable row level security;
alter table public.platform_moment_catalog_i18n enable row level security;

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

drop policy if exists platform_moment_catalog_i18n_select on public.platform_moment_catalog_i18n;
create policy platform_moment_catalog_i18n_select on public.platform_moment_catalog_i18n
for select to authenticated
using (
  app_private.current_user_has_platform_permission('inventory.read')
  or app_private.current_user_has_platform_permission('inventory.write')
  or app_private.current_user_has_platform_permission('admin.full')
);

drop policy if exists platform_moment_catalog_i18n_write on public.platform_moment_catalog_i18n;
create policy platform_moment_catalog_i18n_write on public.platform_moment_catalog_i18n
for all to authenticated
using (
  app_private.current_user_has_platform_permission('inventory.write')
  or app_private.current_user_has_platform_permission('admin.full')
)
with check (
  app_private.current_user_has_platform_permission('inventory.write')
  or app_private.current_user_has_platform_permission('admin.full')
);

insert into public.platform_integrations (provider, name, environment, status, webhook_url, notes)
values
  ('shopify', 'Shopify Moments', 'live', 'not_configured', 'https://khamakey-nfc.khamakey-nfc.workers.dev/webhooks/shopify/orders', 'Catalogo + ordini Moments'),
  ('stripe', 'Stripe Business', 'live', 'not_configured', 'https://khamakey-nfc.khamakey-nfc.workers.dev/webhooks/stripe', 'Abbonamenti Business'),
  ('resend', 'Resend email', 'live', 'not_configured', 'https://khamakey-nfc.khamakey-nfc.workers.dev/webhooks/resend', 'Email ordini + prenotazioni'),
  ('i18n', 'Lingue piattaforma', 'live', 'active', null, 'IT EN FR DE ES')
on conflict (provider, environment) do nothing;
