-- KhamaKey v68 - rete rivenditori/agenti con provvigioni a grado, listini B2B e storico consegne
-- Estende platform_agents (già esistente) con gerarchia piramidale e strumenti admin.

-- ---------------------------------------------------------------------------
-- Estensioni agenti / rivenditori
-- ---------------------------------------------------------------------------

alter table public.platform_agents
  add column if not exists agent_type text default 'agent',
  add column if not exists parent_agent_id uuid,
  add column if not exists tier_key text default 'standard',
  add column if not exists commission_bonus_percent numeric(6,2) default 0,
  add column if not exists price_list_id uuid,
  add column if not exists territory text,
  add column if not exists network_notes text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'platform_agents_agent_type_check'
  ) then
    alter table public.platform_agents
      add constraint platform_agents_agent_type_check
      check (agent_type in ('agent','reseller','authorized_point'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'platform_agents_parent_agent_id_fkey'
  ) then
    alter table public.platform_agents
      add constraint platform_agents_parent_agent_id_fkey
      foreign key (parent_agent_id) references public.platform_agents(id) on delete set null;
  end if;
end $$;

create index if not exists platform_agents_parent_agent_idx
  on public.platform_agents(parent_agent_id);

create index if not exists platform_agents_tier_key_idx
  on public.platform_agents(tier_key);

-- ---------------------------------------------------------------------------
-- Regole provvigioni per grado (L1 diretto, L2 upline, L3 upline superiore)
-- ---------------------------------------------------------------------------

create table if not exists public.platform_commission_tier_rules (
  id uuid primary key default gen_random_uuid(),
  tier_key text not null,
  product_area text not null default 'all',
  event_type text not null,
  level_1_percent numeric(6,2) not null default 0,
  level_2_percent numeric(6,2) not null default 0,
  level_3_percent numeric(6,2) not null default 0,
  max_depth integer not null default 3 check (max_depth between 1 and 5),
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tier_key, product_area, event_type)
);

alter table public.platform_commission_tier_rules enable row level security;

drop policy if exists platform_commission_tier_rules_select on public.platform_commission_tier_rules;
create policy platform_commission_tier_rules_select on public.platform_commission_tier_rules
for select to authenticated
using (
  app_private.current_user_has_platform_permission('commissions.read')
  or app_private.current_user_has_platform_permission('agents.read')
  or app_private.current_user_has_platform_permission('admin.full')
);

drop policy if exists platform_commission_tier_rules_write on public.platform_commission_tier_rules;
create policy platform_commission_tier_rules_write on public.platform_commission_tier_rules
for all to authenticated
using (
  app_private.current_user_has_platform_permission('commissions.write')
  or app_private.current_user_has_platform_permission('admin.full')
)
with check (
  app_private.current_user_has_platform_permission('commissions.write')
  or app_private.current_user_has_platform_permission('admin.full')
);

-- Override per singolo agente (admin può dare % extra su eventi specifici)
create table if not exists public.platform_agent_commission_overrides (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.platform_agents(id) on delete cascade,
  event_type text not null,
  product_area text not null default 'all',
  level_1_percent numeric(6,2),
  level_2_percent numeric(6,2),
  level_3_percent numeric(6,2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agent_id, event_type, product_area)
);

alter table public.platform_agent_commission_overrides enable row level security;

drop policy if exists platform_agent_commission_overrides_select on public.platform_agent_commission_overrides;
create policy platform_agent_commission_overrides_select on public.platform_agent_commission_overrides
for select to authenticated
using (
  app_private.current_user_has_platform_permission('commissions.read')
  or app_private.current_user_has_platform_permission('agents.read')
  or app_private.current_user_has_platform_permission('admin.full')
);

drop policy if exists platform_agent_commission_overrides_write on public.platform_agent_commission_overrides;
create policy platform_agent_commission_overrides_write on public.platform_agent_commission_overrides
for all to authenticated
using (
  app_private.current_user_has_platform_permission('commissions.write')
  or app_private.current_user_has_platform_permission('admin.full')
)
with check (
  app_private.current_user_has_platform_permission('commissions.write')
  or app_private.current_user_has_platform_permission('admin.full')
);

-- ---------------------------------------------------------------------------
-- Listini rivenditori B2B
-- ---------------------------------------------------------------------------

create table if not exists public.platform_reseller_price_lists (
  id uuid primary key default gen_random_uuid(),
  list_key text not null unique,
  name text not null,
  product_area text not null default 'all',
  currency text not null default 'EUR',
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_reseller_price_list_items (
  id uuid primary key default gen_random_uuid(),
  price_list_id uuid not null references public.platform_reseller_price_lists(id) on delete cascade,
  sku text not null,
  product_name text,
  unit_price numeric(12,2) not null default 0,
  min_qty integer not null default 1,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (price_list_id, sku)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'platform_agents_price_list_id_fkey'
  ) then
    alter table public.platform_agents
      add constraint platform_agents_price_list_id_fkey
      foreign key (price_list_id) references public.platform_reseller_price_lists(id) on delete set null;
  end if;
end $$;

alter table public.platform_reseller_price_lists enable row level security;
alter table public.platform_reseller_price_list_items enable row level security;

drop policy if exists platform_reseller_price_lists_select on public.platform_reseller_price_lists;
create policy platform_reseller_price_lists_select on public.platform_reseller_price_lists
for select to authenticated
using (
  app_private.current_user_has_platform_permission('agents.read')
  or app_private.current_user_has_platform_permission('inventory.read')
  or app_private.current_user_has_platform_permission('admin.full')
);

drop policy if exists platform_reseller_price_lists_write on public.platform_reseller_price_lists;
create policy platform_reseller_price_lists_write on public.platform_reseller_price_lists
for all to authenticated
using (
  app_private.current_user_has_platform_permission('agents.write')
  or app_private.current_user_has_platform_permission('admin.full')
)
with check (
  app_private.current_user_has_platform_permission('agents.write')
  or app_private.current_user_has_platform_permission('admin.full')
);

drop policy if exists platform_reseller_price_list_items_select on public.platform_reseller_price_list_items;
create policy platform_reseller_price_list_items_select on public.platform_reseller_price_list_items
for select to authenticated
using (
  app_private.current_user_has_platform_permission('agents.read')
  or app_private.current_user_has_platform_permission('inventory.read')
  or app_private.current_user_has_platform_permission('admin.full')
);

drop policy if exists platform_reseller_price_list_items_write on public.platform_reseller_price_list_items;
create policy platform_reseller_price_list_items_write on public.platform_reseller_price_list_items
for all to authenticated
using (
  app_private.current_user_has_platform_permission('agents.write')
  or app_private.current_user_has_platform_permission('admin.full')
)
with check (
  app_private.current_user_has_platform_permission('agents.write')
  or app_private.current_user_has_platform_permission('admin.full')
);

-- ---------------------------------------------------------------------------
-- Storico prodotti consegnati ai rivenditori
-- ---------------------------------------------------------------------------

create table if not exists public.platform_agent_deliveries (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.platform_agents(id) on delete cascade,
  platform_order_id uuid,
  delivery_type text not null default 'product_shipment',
  sku text,
  product_label text,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(12,2),
  sold_channel text,
  status text not null default 'delivered',
  tracking_code text,
  notes text,
  delivered_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'platform_agent_deliveries_type_check'
  ) then
    alter table public.platform_agent_deliveries
      add constraint platform_agent_deliveries_type_check
      check (delivery_type in ('nfc_batch','product_shipment','stock_transfer'));
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'platform_agent_deliveries_status_check'
  ) then
    alter table public.platform_agent_deliveries
      add constraint platform_agent_deliveries_status_check
      check (status in ('pending','shipped','delivered','returned'));
  end if;
end $$;

create index if not exists platform_agent_deliveries_agent_idx
  on public.platform_agent_deliveries(agent_id, delivered_at desc);

alter table public.platform_agent_deliveries enable row level security;

drop policy if exists platform_agent_deliveries_select on public.platform_agent_deliveries;
create policy platform_agent_deliveries_select on public.platform_agent_deliveries
for select to authenticated
using (
  app_private.current_user_has_platform_permission('agents.read')
  or app_private.current_user_has_platform_permission('shipping.read')
  or app_private.current_user_has_platform_permission('admin.full')
);

drop policy if exists platform_agent_deliveries_write on public.platform_agent_deliveries;
create policy platform_agent_deliveries_write on public.platform_agent_deliveries
for all to authenticated
using (
  app_private.current_user_has_platform_permission('agents.write')
  or app_private.current_user_has_platform_permission('shipping.write')
  or app_private.current_user_has_platform_permission('admin.full')
)
with check (
  app_private.current_user_has_platform_permission('agents.write')
  or app_private.current_user_has_platform_permission('shipping.write')
  or app_private.current_user_has_platform_permission('admin.full')
);

-- ---------------------------------------------------------------------------
-- Estensioni eventi provvigione (rete a grado)
-- ---------------------------------------------------------------------------

alter table public.platform_commission_events
  add column if not exists tier_level integer,
  add column if not exists source_agent_id uuid,
  add column if not exists network_depth integer,
  add column if not exists rule_snapshot jsonb;

-- ---------------------------------------------------------------------------
-- Seed regole tier di default (idempotente)
-- ---------------------------------------------------------------------------

insert into public.platform_commission_tier_rules (tier_key, product_area, event_type, level_1_percent, level_2_percent, level_3_percent, notes)
values
  ('standard', 'all', 'subscription', 10, 3, 1, 'Abbonamento Business: L1 vendita diretta, L2/L3 upline'),
  ('standard', 'all', 'nfc_order', 8, 2, 1, 'Ordine NFC Moments offline'),
  ('standard', 'all', 'setup', 15, 5, 0, 'Setup / onboarding cliente'),
  ('premium', 'all', 'subscription', 15, 5, 2, 'Tier premium — percentuali più alte'),
  ('premium', 'all', 'nfc_order', 12, 4, 2, 'Tier premium — ordini NFC'),
  ('partner', 'all', 'subscription', 20, 8, 3, 'Partner top — massima rete'),
  ('partner', 'all', 'nfc_order', 15, 6, 3, 'Partner top — ordini NFC')
on conflict (tier_key, product_area, event_type) do nothing;

insert into public.platform_reseller_price_lists (list_key, name, product_area, notes)
values
  ('standard-it', 'Listino standard Italia', 'all', 'Prezzi base rivenditori'),
  ('moments-offline', 'Listino Moments offline', 'moments', 'NFC fisici per rivenditori sul territorio')
on conflict (list_key) do nothing;

-- ---------------------------------------------------------------------------
-- RPC: albero rete agenti
-- ---------------------------------------------------------------------------

create or replace function public.get_agent_network_tree(p_root_agent_id uuid default null)
returns table (
  agent_id uuid,
  parent_agent_id uuid,
  depth integer,
  path uuid[],
  contact_name text,
  business_name text,
  email text,
  referral_code text,
  agent_type text,
  tier_key text,
  commission_percent numeric,
  commission_bonus_percent numeric,
  model text,
  status text,
  downline_count bigint
)
language sql
security definer
set search_path = public
as $$
  with recursive network as (
    select
      pa.id as agent_id,
      pa.parent_agent_id,
      0 as depth,
      array[pa.id] as path,
      pa.contact_name,
      pa.business_name,
      pa.email,
      pa.referral_code,
      pa.agent_type,
      pa.tier_key,
      pa.commission_percent,
      pa.commission_bonus_percent,
      pa.model,
      pa.status
    from public.platform_agents pa
    where (
      (p_root_agent_id is null and pa.parent_agent_id is null)
      or (p_root_agent_id is not null and pa.id = p_root_agent_id)
    )
    union all
    select
      child.id,
      child.parent_agent_id,
      network.depth + 1,
      network.path || child.id,
      child.contact_name,
      child.business_name,
      child.email,
      child.referral_code,
      child.agent_type,
      child.tier_key,
      child.commission_percent,
      child.commission_bonus_percent,
      child.model,
      child.status
    from public.platform_agents child
    join network on child.parent_agent_id = network.agent_id
    where network.depth < 10
      and not (child.id = any(network.path))
  )
  select
    n.agent_id,
    n.parent_agent_id,
    n.depth,
    n.path,
    n.contact_name,
    n.business_name,
    n.email,
    n.referral_code,
    coalesce(n.agent_type, 'agent') as agent_type,
    coalesce(n.tier_key, 'standard') as tier_key,
    n.commission_percent,
    coalesce(n.commission_bonus_percent, 0) as commission_bonus_percent,
    n.model,
    n.status,
    (
      select count(*)::bigint
      from public.platform_agents d
      where d.parent_agent_id = n.agent_id
    ) as downline_count
  from network n
  order by n.depth, coalesce(n.contact_name, n.email), n.referral_code
$$;

revoke all on function public.get_agent_network_tree(uuid) from public;
revoke all on function public.get_agent_network_tree(uuid) from anon;
grant execute on function public.get_agent_network_tree(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: percentuale effettiva per livello (override agente > tier > default agente)
-- ---------------------------------------------------------------------------

create or replace function public.resolve_agent_commission_percent(
  p_agent_id uuid,
  p_event_type text,
  p_product_area text,
  p_tier_level integer
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agent public.platform_agents%rowtype;
  v_override public.platform_agent_commission_overrides%rowtype;
  v_rule public.platform_commission_tier_rules%rowtype;
  v_percent numeric;
begin
  select * into v_agent from public.platform_agents where id = p_agent_id;
  if not found then
    return 0;
  end if;

  select * into v_override
  from public.platform_agent_commission_overrides o
  where o.agent_id = p_agent_id
    and o.event_type = p_event_type
    and o.product_area in (p_product_area, 'all')
  order by case when o.product_area = p_product_area then 0 else 1 end
  limit 1;

  if p_tier_level = 1 then
    v_percent := coalesce(
      v_override.level_1_percent,
      v_agent.commission_percent + coalesce(v_agent.commission_bonus_percent, 0)
    );
    if v_percent is not null then
      return greatest(v_percent, 0);
    end if;
  elsif p_tier_level = 2 then
    if v_override.level_2_percent is not null then
      return greatest(v_override.level_2_percent, 0);
    end if;
  elsif p_tier_level = 3 then
    if v_override.level_3_percent is not null then
      return greatest(v_override.level_3_percent, 0);
    end if;
  end if;

  select * into v_rule
  from public.platform_commission_tier_rules r
  where r.tier_key = coalesce(v_agent.tier_key, 'standard')
    and r.event_type = p_event_type
    and r.product_area in (p_product_area, 'all')
    and r.active = true
  order by case when r.product_area = p_product_area then 0 else 1 end
  limit 1;

  if found then
    if p_tier_level = 1 then
      return greatest(coalesce(v_rule.level_1_percent, 0), 0);
    elsif p_tier_level = 2 then
      return greatest(coalesce(v_rule.level_2_percent, 0), 0);
    elsif p_tier_level = 3 then
      return greatest(coalesce(v_rule.level_3_percent, 0), 0);
    end if;
  end if;

  return 0;
end
$$;

revoke all on function public.resolve_agent_commission_percent(uuid,text,text,integer) from public;
revoke all on function public.resolve_agent_commission_percent(uuid,text,text,integer) from anon;
grant execute on function public.resolve_agent_commission_percent(uuid,text,text,integer) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: genera provvigioni a grado per una vendita di un agente downline
-- ---------------------------------------------------------------------------

create or replace function public.distribute_network_commissions(
  p_source_agent_id uuid,
  p_event_type text,
  p_product_area text,
  p_base_amount numeric,
  p_order_id uuid default null,
  p_reference_label text default null
)
returns table (
  commission_event_id uuid,
  beneficiary_agent_id uuid,
  tier_level integer,
  commission_percent numeric,
  commission_amount numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_chain uuid[];
  v_agent_id uuid;
  v_level integer;
  v_percent numeric;
  v_amount numeric;
  v_event_id uuid;
  v_max_depth integer := 3;
begin
  if not (
    app_private.current_user_has_platform_permission('commissions.write')
    or app_private.current_user_has_platform_permission('admin.full')
  ) then
    raise exception 'Permesso commissions.write richiesto.';
  end if;

  if p_source_agent_id is null or coalesce(p_base_amount, 0) <= 0 then
    return;
  end if;

  with recursive upline as (
    select pa.id, pa.parent_agent_id, 1 as lvl, array[pa.id]::uuid[] as chain
    from public.platform_agents pa
    where pa.id = p_source_agent_id
    union all
    select parent.id, parent.parent_agent_id, u.lvl + 1, u.chain || parent.id
    from public.platform_agents parent
    join upline u on parent.id = u.parent_agent_id
    where u.lvl < 5 and not (parent.id = any(u.chain))
  )
  select array_agg(id order by lvl) into v_chain from upline;

  if v_chain is null then
    return;
  end if;

  for v_level in 1..v_max_depth loop
    exit when v_level > array_length(v_chain, 1);
    v_agent_id := v_chain[v_level];
    v_percent := public.resolve_agent_commission_percent(v_agent_id, p_event_type, p_product_area, v_level);
    if coalesce(v_percent, 0) <= 0 then
      continue;
    end if;
    v_amount := round((p_base_amount * v_percent / 100.0)::numeric, 2);

    insert into public.platform_commission_events (
      agent_id,
      event_type,
      amount,
      commission_amount,
      status,
      tier_level,
      source_agent_id,
      network_depth,
      rule_snapshot
    )
    values (
      v_agent_id,
      p_event_type,
      p_base_amount,
      v_amount,
      'pending',
      v_level,
      p_source_agent_id,
      v_level,
      jsonb_build_object(
        'product_area', p_product_area,
        'order_id', p_order_id,
        'reference_label', p_reference_label,
        'percent', v_percent
      )
    )
    returning id into v_event_id;

    commission_event_id := v_event_id;
    beneficiary_agent_id := v_agent_id;
    tier_level := v_level;
    commission_percent := v_percent;
    commission_amount := v_amount;
    return next;
  end loop;
end
$$;

revoke all on function public.distribute_network_commissions(uuid,text,text,numeric,uuid,text) from public;
revoke all on function public.distribute_network_commissions(uuid,text,text,numeric,uuid,text) from anon;
grant execute on function public.distribute_network_commissions(uuid,text,text,numeric,uuid,text) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: storico consegne agente
-- ---------------------------------------------------------------------------

create or replace function public.get_agent_delivery_history(p_agent_id uuid default null, p_limit integer default 100)
returns table (
  delivery_id uuid,
  agent_id uuid,
  agent_name text,
  platform_order_id uuid,
  delivery_type text,
  sku text,
  product_label text,
  quantity integer,
  unit_price numeric,
  sold_channel text,
  status text,
  tracking_code text,
  notes text,
  delivered_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    d.id as delivery_id,
    d.agent_id,
    coalesce(pa.contact_name, pa.email, 'Agente') as agent_name,
    d.platform_order_id,
    d.delivery_type,
    d.sku,
    d.product_label,
    d.quantity,
    d.unit_price,
    d.sold_channel,
    d.status,
    d.tracking_code,
    d.notes,
    d.delivered_at
  from public.platform_agent_deliveries d
  join public.platform_agents pa on pa.id = d.agent_id
  where p_agent_id is null or d.agent_id = p_agent_id
  order by d.delivered_at desc
  limit greatest(1, least(coalesce(p_limit, 100), 500))
$$;

revoke all on function public.get_agent_delivery_history(uuid,integer) from public;
revoke all on function public.get_agent_delivery_history(uuid,integer) from anon;
grant execute on function public.get_agent_delivery_history(uuid,integer) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: registra consegna prodotti a rivenditore
-- ---------------------------------------------------------------------------

create or replace function public.record_agent_delivery(
  p_agent_id uuid,
  p_delivery_type text default 'product_shipment',
  p_sku text default null,
  p_product_label text default null,
  p_quantity integer default 1,
  p_unit_price numeric default null,
  p_sold_channel text default null,
  p_platform_order_id uuid default null,
  p_tracking_code text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not (
    app_private.current_user_has_platform_permission('agents.write')
    or app_private.current_user_has_platform_permission('shipping.write')
    or app_private.current_user_has_platform_permission('admin.full')
  ) then
    raise exception 'Permesso agents.write o shipping.write richiesto.';
  end if;

  if p_agent_id is null then
    raise exception 'Agente obbligatorio.';
  end if;

  insert into public.platform_agent_deliveries (
    agent_id,
    platform_order_id,
    delivery_type,
    sku,
    product_label,
    quantity,
    unit_price,
    sold_channel,
    tracking_code,
    notes,
    status
  )
  values (
    p_agent_id,
    p_platform_order_id,
    coalesce(nullif(p_delivery_type, ''), 'product_shipment'),
    nullif(trim(coalesce(p_sku, '')), ''),
    nullif(trim(coalesce(p_product_label, '')), ''),
    greatest(1, coalesce(p_quantity, 1)),
    p_unit_price,
    nullif(trim(coalesce(p_sold_channel, '')), ''),
    nullif(trim(coalesce(p_tracking_code, '')), ''),
    nullif(trim(coalesce(p_notes, '')), ''),
    'delivered'
  )
  returning id into v_id;

  return v_id;
end
$$;

revoke all on function public.record_agent_delivery(uuid,text,text,text,integer,numeric,text,uuid,text,text) from public;
revoke all on function public.record_agent_delivery(uuid,text,text,text,integer,numeric,text,uuid,text,text) from anon;
grant execute on function public.record_agent_delivery(uuid,text,text,text,integer,numeric,text,uuid,text,text) to authenticated;
