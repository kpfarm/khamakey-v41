-- KhamaKey v64 — catalogo vendita Moments, canali multi-store, bundle NFC, ingest Shopify
-- Applica dopo v63 su Supabase cuxlwaocjqwzluycznyp.

-- ---------------------------------------------------------------------------
-- Catalogo vendita Moments (fonte unica per Shopify e marketplace)
-- ---------------------------------------------------------------------------
create table if not exists public.platform_moment_catalog (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  description text,
  product_line text not null default 'portachiavi',
  product_type text not null default 'free',
  sale_price numeric(12,2) not null default 0,
  unit_cost numeric(12,2) not null default 0,
  physical_units integer not null default 1 check (physical_units >= 1),
  activation_codes integer not null default 1 check (activation_codes >= 1),
  image_url text,
  shopify_handle text,
  publish_shopify boolean not null default false,
  sync_status text not null default 'draft'
    check (sync_status in ('draft','pending','synced','error')),
  sync_error text,
  last_synced_at timestamptz,
  sort_order integer not null default 0,
  status text not null default 'active'
    check (status in ('active','hidden','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists platform_moment_catalog_status_idx
  on public.platform_moment_catalog(status, sort_order);

comment on column public.platform_moment_catalog.physical_units is
  'Pezzi fisici NFC spediti per unità venduta (bundle 2x portachiavi = 2).';
comment on column public.platform_moment_catalog.activation_codes is
  'Codici logici da assegnare per unità venduta (bundle condiviso 2x = 1).';

-- ---------------------------------------------------------------------------
-- Mapping catalogo ↔ canale esterno
-- ---------------------------------------------------------------------------
create table if not exists public.platform_product_listings (
  id uuid primary key default gen_random_uuid(),
  catalog_id uuid not null references public.platform_moment_catalog(id) on delete cascade,
  channel_key text not null
    check (channel_key in ('shopify','etsy','amazon','tiktok','offline')),
  external_product_id text,
  external_variant_id text,
  sync_status text not null default 'pending'
    check (sync_status in ('pending','synced','error','disabled')),
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (catalog_id, channel_key)
);

create index if not exists platform_product_listings_channel_idx
  on public.platform_product_listings(channel_key, sync_status);

-- ---------------------------------------------------------------------------
-- Log sync / audit
-- ---------------------------------------------------------------------------
create table if not exists public.platform_sync_log (
  id uuid primary key default gen_random_uuid(),
  channel_key text not null,
  catalog_id uuid references public.platform_moment_catalog(id) on delete set null,
  action text not null,
  success boolean not null default false,
  payload jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists platform_sync_log_created_idx
  on public.platform_sync_log(created_at desc);

-- ---------------------------------------------------------------------------
-- Webhook events (idempotente se tabella già esiste)
-- ---------------------------------------------------------------------------
create table if not exists public.platform_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_type text,
  external_id text,
  payload jsonb,
  processed boolean not null default false,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists platform_webhook_events_provider_idx
  on public.platform_webhook_events(provider, created_at desc);

create unique index if not exists platform_webhook_events_dedupe_idx
  on public.platform_webhook_events(provider, external_id)
  where external_id is not null;

-- ---------------------------------------------------------------------------
-- Ordini: collegamento canali esterni
-- ---------------------------------------------------------------------------
alter table public.platform_orders
  add column if not exists external_channel text,
  add column if not exists external_order_id text,
  add column if not exists external_order_number text;

create unique index if not exists platform_orders_external_channel_idx
  on public.platform_orders(external_channel, external_order_id)
  where external_channel is not null and external_order_id is not null;

-- ---------------------------------------------------------------------------
-- Righe ordine (SKU catalogo + quantità bundle)
-- ---------------------------------------------------------------------------
create table if not exists public.platform_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.platform_orders(id) on delete cascade,
  catalog_sku text,
  catalog_id uuid references public.platform_moment_catalog(id) on delete set null,
  quantity integer not null default 1 check (quantity >= 1),
  unit_price numeric(12,2),
  physical_units integer,
  activation_codes_assigned integer not null default 0,
  line_notes text,
  created_at timestamptz not null default now()
);

create index if not exists platform_order_items_order_idx
  on public.platform_order_items(order_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.platform_moment_catalog enable row level security;
alter table public.platform_product_listings enable row level security;
alter table public.platform_sync_log enable row level security;
alter table public.platform_order_items enable row level security;

drop policy if exists platform_moment_catalog_select on public.platform_moment_catalog;
create policy platform_moment_catalog_select on public.platform_moment_catalog
for select to authenticated
using (
  app_private.current_user_has_platform_permission('inventory.read')
  or app_private.current_user_has_platform_permission('inventory.write')
  or app_private.current_user_has_platform_permission('orders.read')
  or app_private.current_user_has_platform_permission('orders.write')
  or app_private.current_user_has_platform_permission('admin.full')
);

drop policy if exists platform_moment_catalog_write on public.platform_moment_catalog;
create policy platform_moment_catalog_write on public.platform_moment_catalog
for all to authenticated
using (
  app_private.current_user_has_platform_permission('inventory.write')
  or app_private.current_user_has_platform_permission('admin.full')
)
with check (
  app_private.current_user_has_platform_permission('inventory.write')
  or app_private.current_user_has_platform_permission('admin.full')
);

drop policy if exists platform_product_listings_select on public.platform_product_listings;
create policy platform_product_listings_select on public.platform_product_listings
for select to authenticated
using (
  app_private.current_user_has_platform_permission('inventory.read')
  or app_private.current_user_has_platform_permission('inventory.write')
  or app_private.current_user_has_platform_permission('admin.full')
);

drop policy if exists platform_product_listings_write on public.platform_product_listings;
create policy platform_product_listings_write on public.platform_product_listings
for all to authenticated
using (
  app_private.current_user_has_platform_permission('inventory.write')
  or app_private.current_user_has_platform_permission('admin.full')
)
with check (
  app_private.current_user_has_platform_permission('inventory.write')
  or app_private.current_user_has_platform_permission('admin.full')
);

drop policy if exists platform_sync_log_select on public.platform_sync_log;
create policy platform_sync_log_select on public.platform_sync_log
for select to authenticated
using (
  app_private.current_user_has_platform_permission('inventory.read')
  or app_private.current_user_has_platform_permission('settings.manage')
  or app_private.current_user_has_platform_permission('admin.full')
);

drop policy if exists platform_sync_log_insert on public.platform_sync_log;
create policy platform_sync_log_insert on public.platform_sync_log
for insert to authenticated
with check (
  app_private.current_user_has_platform_permission('inventory.write')
  or app_private.current_user_has_platform_permission('admin.full')
);

drop policy if exists platform_order_items_select on public.platform_order_items;
create policy platform_order_items_select on public.platform_order_items
for select to authenticated
using (
  app_private.current_user_has_platform_permission('orders.read')
  or app_private.current_user_has_platform_permission('orders.write')
  or app_private.current_user_has_platform_permission('admin.full')
);

grant select, insert, update, delete on public.platform_moment_catalog to authenticated;
grant select, insert, update, delete on public.platform_product_listings to authenticated;
grant select, insert on public.platform_sync_log to authenticated;
grant select on public.platform_order_items to authenticated;

-- ---------------------------------------------------------------------------
-- Assegna codici NFC con logica bundle (physical_units vs activation_codes)
-- Core interno (senza check permessi) — usato da ingest webhook
-- ---------------------------------------------------------------------------
create or replace function app_private.assign_moment_codes_for_catalog_core(
  p_order_id uuid,
  p_sku text,
  p_line_quantity integer default 1,
  p_product_line text default null,
  p_agent_id uuid default null,
  p_sold_channel text default null
)
returns table (
  out_code text,
  public_slug text,
  product_line text,
  batch_label text,
  codes_requested integer,
  physical_units integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sku text := upper(trim(coalesce(p_sku, '')));
  v_qty integer := greatest(1, coalesce(p_line_quantity, 1));
  v_catalog public.platform_moment_catalog%rowtype;
  v_codes_needed integer;
  v_physical integer;
  v_line text;
  v_channel text := nullif(trim(coalesce(p_sold_channel, '')), '');
  rec record;
  i integer := 0;
begin
  if p_order_id is null then
    raise exception 'Ordine obbligatorio.';
  end if;
  if v_sku = '' then
    raise exception 'SKU catalogo obbligatorio.';
  end if;

  select * into v_catalog
  from public.platform_moment_catalog c
  where upper(c.sku) = v_sku
    and c.status = 'active'
  limit 1;

  if not found then
    raise exception 'SKU % non trovato nel catalogo Moments attivo.', v_sku;
  end if;

  v_codes_needed := v_qty * greatest(1, v_catalog.activation_codes);
  v_physical := v_qty * greatest(1, v_catalog.physical_units);
  v_line := coalesce(nullif(trim(coalesce(p_product_line, '')), ''), v_catalog.product_line);

  codes_requested := v_codes_needed;
  physical_units := v_physical;

  for rec in
    select mac.code
    from public.moment_activation_codes mac
    where mac.status = 'available'
      and mac.platform_order_id is null
      and (v_line is null or mac.product_line = v_line)
    order by mac.created_at asc
    limit v_codes_needed
    for update skip locked
  loop
    update public.moment_activation_codes mac
    set
      platform_order_id = p_order_id,
      assigned_agent_id = coalesce(p_agent_id, mac.assigned_agent_id),
      sold_channel = coalesce(v_channel, mac.sold_channel, 'direct'),
      updated_at = now()
    where mac.code = rec.code;

    select mac.code, mac.public_slug, mac.product_line, mac.batch_label
    into out_code, public_slug, product_line, batch_label
    from public.moment_activation_codes mac
    where mac.code = rec.code;

    i := i + 1;
    return next;
    exit when i >= v_codes_needed;
  end loop;

  if i = 0 then
    raise exception 'Nessun codice disponibile per SKU % (linea %).', v_sku, v_line;
  end if;
  if i < v_codes_needed then
    raise exception 'Codici insufficienti per SKU %: richiesti %, assegnati %.', v_sku, v_codes_needed, i;
  end if;
end
$$;

-- Wrapper pubblico con check permessi admin
create or replace function public.assign_moment_codes_for_catalog(
  p_order_id uuid,
  p_sku text,
  p_line_quantity integer default 1,
  p_product_line text default null,
  p_agent_id uuid default null,
  p_sold_channel text default null
)
returns table (
  out_code text,
  public_slug text,
  product_line text,
  batch_label text,
  codes_requested integer,
  physical_units integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sku text := upper(trim(coalesce(p_sku, '')));
  v_qty integer := greatest(1, coalesce(p_line_quantity, 1));
  v_catalog public.platform_moment_catalog%rowtype;
  v_codes_needed integer;
  v_physical integer;
  v_line text;
  v_channel text := nullif(trim(coalesce(p_sold_channel, '')), '');
  rec record;
  i integer := 0;
begin
  if not (
    app_private.current_user_has_platform_permission('moments.write')
    or app_private.current_user_has_platform_permission('orders.write')
    or app_private.current_user_has_platform_permission('admin.full')
  ) then
    raise exception 'Permesso moments.write o orders.write richiesto.';
  end if;

  return query
  select * from app_private.assign_moment_codes_for_catalog_core(
    p_order_id, p_sku, p_line_quantity, p_product_line, p_agent_id, p_sold_channel
  );
end
$$;

revoke all on function public.assign_moment_codes_for_catalog(uuid,text,integer,text,uuid,text) from public;
revoke all on function public.assign_moment_codes_for_catalog(uuid,text,integer,text,uuid,text) from anon;
grant execute on function public.assign_moment_codes_for_catalog(uuid,text,integer,text,uuid,text) to authenticated;

-- ---------------------------------------------------------------------------
-- Ingest ordine Shopify (chiamata dal Worker con ingest key)
-- ---------------------------------------------------------------------------
create or replace function public.ingest_shopify_order(
  p_ingest_key text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text := nullif(trim(coalesce(p_ingest_key, '')), '');
  v_expected text := nullif(trim(coalesce(current_setting('app.khamakey_webhook_ingest_key', true), '')), '');
  v_shopify_id text := nullif(trim(coalesce(p_payload->>'shopify_order_id', '')), '');
  v_order_number text := nullif(trim(coalesce(p_payload->>'order_number', '')), '');
  v_email text := lower(nullif(trim(coalesce(p_payload->>'customer_email', '')), ''));
  v_name text := nullif(trim(coalesce(p_payload->>'customer_name', '')), '');
  v_phone text := nullif(trim(coalesce(p_payload->>'customer_phone', '')), '');
  v_total numeric(12,2) := coalesce((p_payload->>'total')::numeric, 0);
  v_subtotal numeric(12,2) := coalesce((p_payload->>'subtotal')::numeric, 0);
  v_shipping numeric(12,2) := coalesce((p_payload->>'shipping_total')::numeric, 0);
  v_financial text := lower(coalesce(p_payload->>'financial_status', 'pending'));
  v_existing uuid;
  v_order_id uuid;
  v_order_code text;
  v_line jsonb;
  v_sku text;
  v_qty integer;
  v_codes_assigned integer := 0;
  v_physical_total integer := 0;
  v_assigned record;
  v_item_id uuid;
begin
  if v_expected is null or v_key is distinct from v_expected then
    raise exception 'Chiave ingest non valida.';
  end if;
  if v_shopify_id is null then
    raise exception 'shopify_order_id obbligatorio.';
  end if;

  select id into v_existing
  from public.platform_orders
  where external_channel = 'shopify'
    and external_order_id = v_shopify_id
  limit 1;

  if v_existing is not null then
    return jsonb_build_object(
      'ok', true,
      'duplicate', true,
      'order_id', v_existing
    );
  end if;

  v_order_code := 'KK-SHOP-' || coalesce(v_order_number, v_shopify_id);

  insert into public.platform_orders (
    order_code,
    order_type,
    customer_name,
    customer_email,
    customer_phone,
    subtotal,
    shipping_total,
    discount_total,
    total,
    status,
    payment_status,
    external_channel,
    external_order_id,
    external_order_number,
    notes
  )
  values (
    v_order_code,
    'ecommerce',
    v_name,
    v_email,
    v_phone,
    v_subtotal,
    v_shipping,
    0,
    v_total,
    case when v_financial in ('paid','partially_paid') then 'paid' else 'pending' end,
    case when v_financial = 'paid' then 'paid' when v_financial = 'pending' then 'pending' else 'pending' end,
    'shopify',
    v_shopify_id,
    v_order_number,
    'Importato da Shopify'
  )
  returning id into v_order_id;

  for v_line in
    select * from jsonb_array_elements(coalesce(p_payload->'line_items', '[]'::jsonb))
  loop
    v_sku := upper(trim(coalesce(v_line->>'sku', '')));
    v_qty := greatest(1, coalesce((v_line->>'quantity')::integer, 1));
    if v_sku = '' then
      continue;
    end if;

    insert into public.platform_order_items (
      order_id,
      catalog_sku,
      catalog_id,
      quantity,
      unit_price,
      physical_units,
      line_notes
    )
    select
      v_order_id,
      v_sku,
      c.id,
      v_qty,
      coalesce((v_line->>'price')::numeric, c.sale_price),
      v_qty * c.physical_units,
      coalesce(v_line->>'title', c.name)
    from public.platform_moment_catalog c
    where upper(c.sku) = v_sku
    limit 1;

    begin
      for v_assigned in
        select * from app_private.assign_moment_codes_for_catalog_core(
          v_order_id,
          v_sku,
          v_qty,
          null,
          null,
          'shopify'
        )
      loop
        v_codes_assigned := v_codes_assigned + 1;
        v_physical_total := v_assigned.physical_units;
      end loop;

      update public.platform_order_items
      set activation_codes_assigned = v_codes_assigned
      where order_id = v_order_id
        and upper(catalog_sku) = v_sku;
    exception when others then
      update public.platform_orders
      set notes = coalesce(notes, '') || ' | Codici non assegnati per ' || v_sku || ': ' || SQLERRM
      where id = v_order_id;
    end;
  end loop;

  insert into public.platform_webhook_events (provider, event_type, external_id, payload, processed)
  values ('shopify', coalesce(p_payload->>'topic', 'orders/create'), v_shopify_id, p_payload, true);

  return jsonb_build_object(
    'ok', true,
    'order_id', v_order_id,
    'order_code', v_order_code,
    'codes_assigned', v_codes_assigned,
    'physical_units', v_physical_total
  );
end
$$;

revoke all on function public.ingest_shopify_order(text, jsonb) from public;
grant execute on function public.ingest_shopify_order(text, jsonb) to anon;
grant execute on function public.ingest_shopify_order(text, jsonb) to authenticated;

-- Chiave ingest: imposta in Supabase Dashboard → Database → Settings → custom config
-- oppure: alter database postgres set app.khamakey_webhook_ingest_key = 'your-secret';
-- Deve coincidere con WEBHOOK_INGEST_KEY nel Cloudflare Worker.

-- Seed catalogo esempio (opzionale, commenta se non serve)
insert into public.platform_moment_catalog (
  sku, name, description, product_line, product_type,
  sale_price, physical_units, activation_codes, publish_shopify, sync_status
)
values
  (
    'MOM-WED-SINGLE',
    'Moments Matrimonio — Portachiavo singolo',
    'Un portachiavo NFC con pagina ricordo condivisa. Attivazione con codice incluso.',
    'portachiavi', 'wedding', 29.90, 1, 1, false, 'draft'
  ),
  (
    'MOM-WED-2X',
    'Moments Matrimonio — Bundle coppia (2 portachiavi)',
    'Due portachiavi NFC con lo stesso codice: una pagina Moments condivisa per la coppia.',
    'portachiavi', 'wedding', 49.90, 2, 1, false, 'draft'
  ),
  (
    'MOM-PARTY-SINGLE',
    'Moments Party — Portachiavo singolo',
    'Portachiavo NFC per feste e compleanni.',
    'portachiavi', 'party', 24.90, 1, 1, false, 'draft'
  )
on conflict (sku) do nothing;
