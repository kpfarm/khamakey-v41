-- KhamaKey v86 — Portale self-service rivenditori: RPC "solo i miei dati"
-- Ogni RPC risolve l'agente chiamante da auth.uid()/email LATO SERVER e ritorna esclusivamente
-- i suoi dati (provvigioni, rete downline, consegne). Nessun id agente accettato dal client:
-- un rivenditore non può mai vedere i dati di un altro. Nessuna tabella nuova. Idempotente.

-- ---------------------------------------------------------------------------
-- Helper interno: id dell'agente collegato all'utente autenticato.
-- Collegamento via member_id → platform_members.user_id, oppure per email combaciante.
-- ---------------------------------------------------------------------------
create or replace function public.current_agent_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select pa.id
  from public.platform_agents pa
  where pa.status <> 'disabled'
    and (
      (pa.member_id is not null and exists (
        select 1 from public.platform_members pm
        where pm.id = pa.member_id and pm.user_id = auth.uid()
      ))
      or lower(pa.email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
    )
  order by pa.created_at
  limit 1
$$;

-- ---------------------------------------------------------------------------
-- Profilo + riepilogo guadagni dell'agente corrente.
-- ---------------------------------------------------------------------------
create or replace function public.get_my_agent_profile()
returns table (
  agent_id uuid,
  contact_name text,
  business_name text,
  email text,
  referral_code text,
  tier_key text,
  agent_type text,
  territory text,
  pending_total numeric,
  approved_total numeric,
  paid_total numeric,
  network_size bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid := public.current_agent_id();
begin
  if v_id is null then return; end if;
  return query
  select
    pa.id, pa.contact_name, pa.business_name, pa.email, pa.referral_code,
    pa.tier_key, pa.agent_type, pa.territory,
    coalesce((select sum(ce.commission_amount) from public.platform_commission_events ce where ce.agent_id = pa.id and ce.status = 'pending'), 0),
    coalesce((select sum(ce.commission_amount) from public.platform_commission_events ce where ce.agent_id = pa.id and ce.status = 'approved'), 0),
    coalesce((select sum(ce.commission_amount) from public.platform_commission_events ce where ce.agent_id = pa.id and ce.status = 'paid'), 0),
    (select count(*) from public.platform_agents d where d.parent_agent_id = pa.id)
  from public.platform_agents pa
  where pa.id = v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Le mie provvigioni (solo le mie).
-- ---------------------------------------------------------------------------
create or replace function public.get_my_commissions()
returns table (
  id uuid,
  event_type text,
  tier_level integer,
  amount numeric,
  commission_percent numeric,
  commission_amount numeric,
  status text,
  order_code text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid := public.current_agent_id();
begin
  if v_id is null then return; end if;
  return query
  select ce.id, ce.event_type, ce.tier_level, ce.amount, ce.commission_percent,
    ce.commission_amount, ce.status, (ce.rule_snapshot ->> 'order_code'), ce.created_at
  from public.platform_commission_events ce
  where ce.agent_id = v_id
  order by ce.created_at desc
  limit 200;
end;
$$;

-- ---------------------------------------------------------------------------
-- La mia rete downline (fino a 3 livelli sotto di me).
-- ---------------------------------------------------------------------------
create or replace function public.get_my_network()
returns table (
  agent_id uuid,
  contact_name text,
  business_name text,
  referral_code text,
  tier_key text,
  depth integer
)
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid := public.current_agent_id();
begin
  if v_id is null then return; end if;
  return query
  with recursive downline as (
    select pa.id, pa.parent_agent_id, 1 as depth, array[pa.id]::uuid[] as chain
      from public.platform_agents pa where pa.parent_agent_id = v_id
    union all
    select child.id, child.parent_agent_id, d.depth + 1, d.chain || child.id
      from public.platform_agents child
      join downline d on child.parent_agent_id = d.id
      where d.depth < 3 and not (child.id = any(d.chain))
  )
  select pa.id, pa.contact_name, pa.business_name, pa.referral_code, pa.tier_key, dl.depth
  from downline dl
  join public.platform_agents pa on pa.id = dl.id
  order by dl.depth, pa.contact_name;
end;
$$;

-- ---------------------------------------------------------------------------
-- Le mie consegne (offline / spedizioni assegnate a me).
-- ---------------------------------------------------------------------------
create or replace function public.get_my_deliveries()
returns table (
  id uuid,
  delivery_type text,
  product_label text,
  sku text,
  quantity integer,
  status text,
  tracking_code text,
  delivered_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid := public.current_agent_id();
begin
  if v_id is null then return; end if;
  return query
  select ad.id, ad.delivery_type, ad.product_label, ad.sku, ad.quantity,
    ad.status, ad.tracking_code, ad.delivered_at, ad.created_at
  from public.platform_agent_deliveries ad
  where ad.agent_id = v_id
  order by ad.created_at desc
  limit 200;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grant: solo authenticated (ogni funzione filtra internamente sull'agente chiamante).
-- ---------------------------------------------------------------------------
revoke all on function public.current_agent_id() from public, anon;
revoke all on function public.get_my_agent_profile() from public, anon;
revoke all on function public.get_my_commissions() from public, anon;
revoke all on function public.get_my_network() from public, anon;
revoke all on function public.get_my_deliveries() from public, anon;
grant execute on function public.get_my_agent_profile() to authenticated;
grant execute on function public.get_my_commissions() to authenticated;
grant execute on function public.get_my_network() to authenticated;
grant execute on function public.get_my_deliveries() to authenticated;
