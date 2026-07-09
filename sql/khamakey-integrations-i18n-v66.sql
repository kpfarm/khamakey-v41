-- KhamaKey v66 — Integration Hub, pagamenti, lingue catalogo Moments
-- Applica dopo v65 su Supabase.

-- ---------------------------------------------------------------------------
-- Integration Hub (metadati admin — le chiavi restano su Cloudflare Worker)
-- ---------------------------------------------------------------------------
create table if not exists public.platform_integrations (
  id uuid primary key default gen_random_uuid(),
  provider text not null
    check (provider in ('stripe','paypal','resend','shopify','whatsapp','shipping','automation','i18n','other')),
  name text not null,
  environment text not null default 'live'
    check (environment in ('test','live')),
  status text not null default 'not_configured'
    check (status in ('not_configured','test','active','error','disabled')),
  webhook_url text,
  notes text,
  config_public jsonb not null default '{}'::jsonb,
  last_event_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, environment)
);

create index if not exists platform_integrations_provider_idx
  on public.platform_integrations(provider, status);

-- ---------------------------------------------------------------------------
-- Transazioni pagamenti (Stripe / PayPal / Shopify Payments)
-- ---------------------------------------------------------------------------
create table if not exists public.platform_payment_transactions (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('stripe','paypal','shopify','manual','other')),
  transaction_type text not null default 'payment'
    check (transaction_type in ('payment','refund','subscription','setup','payout','other')),
  external_id text,
  order_id uuid references public.platform_orders(id) on delete set null,
  amount numeric(12,2) not null default 0,
  currency text not null default 'EUR',
  status text not null default 'pending'
    check (status in ('pending','succeeded','failed','cancelled','refunded')),
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists platform_payment_transactions_order_idx
  on public.platform_payment_transactions(order_id, created_at desc);

create unique index if not exists platform_payment_transactions_dedupe_idx
  on public.platform_payment_transactions(provider, external_id)
  where external_id is not null;

-- ---------------------------------------------------------------------------
-- Lingue piattaforma (Business editor + catalogo Moments + pagine pubbliche)
-- ---------------------------------------------------------------------------
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

-- Traduzioni catalogo Moments per canali multi-lingua (Shopify markets, landing)
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

create index if not exists platform_moment_catalog_i18n_locale_idx
  on public.platform_moment_catalog_i18n(locale);

-- ---------------------------------------------------------------------------
-- Webhook events — colonne usate dall'admin
-- ---------------------------------------------------------------------------
alter table public.platform_webhook_events
  add column if not exists status text,
  add column if not exists received_at timestamptz;

update public.platform_webhook_events
set
  status = coalesce(status, case when processed then 'processed' else 'received' end),
  received_at = coalesce(received_at, created_at)
where status is null or received_at is null;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.platform_integrations enable row level security;
alter table public.platform_payment_transactions enable row level security;
alter table public.platform_supported_locales enable row level security;
alter table public.platform_moment_catalog_i18n enable row level security;

drop policy if exists platform_integrations_select on public.platform_integrations;
create policy platform_integrations_select on public.platform_integrations
for select to authenticated
using (
  app_private.current_user_has_platform_permission('settings.manage')
  or app_private.current_user_has_platform_permission('admin.full')
);

drop policy if exists platform_integrations_write on public.platform_integrations;
create policy platform_integrations_write on public.platform_integrations
for all to authenticated
using (
  app_private.current_user_has_platform_permission('settings.manage')
  or app_private.current_user_has_platform_permission('admin.full')
)
with check (
  app_private.current_user_has_platform_permission('settings.manage')
  or app_private.current_user_has_platform_permission('admin.full')
);

drop policy if exists platform_payment_transactions_select on public.platform_payment_transactions;
create policy platform_payment_transactions_select on public.platform_payment_transactions
for select to authenticated
using (
  app_private.current_user_has_platform_permission('orders.read')
  or app_private.current_user_has_platform_permission('orders.write')
  or app_private.current_user_has_platform_permission('settings.manage')
  or app_private.current_user_has_platform_permission('admin.full')
);

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

-- Seed integrazioni (stato operativo aggiornato dal Worker /health)
insert into public.platform_integrations (provider, name, environment, status, webhook_url, notes)
values
  ('shopify', 'Shopify Moments', 'live', 'not_configured', 'https://khamakey-nfc.khamakey-nfc.workers.dev/webhooks/shopify/orders', 'Catalogo + ordini Moments'),
  ('stripe', 'Stripe Business', 'live', 'not_configured', 'https://khamakey-nfc.khamakey-nfc.workers.dev/webhooks/stripe', 'Abbonamenti Business + Payment Link'),
  ('paypal', 'PayPal', 'live', 'not_configured', 'https://khamakey-nfc.khamakey-nfc.workers.dev/webhooks/paypal', 'Pagamenti alternativi (fase F2)'),
  ('resend', 'Resend email', 'live', 'not_configured', 'https://khamakey-nfc.khamakey-nfc.workers.dev/webhooks/resend', 'Prenotazioni Business + email ordini Moments'),
  ('i18n', 'Lingue piattaforma', 'live', 'active', null, 'IT EN FR DE ES — editor Business + catalogo Moments')
on conflict (provider, environment) do nothing;
