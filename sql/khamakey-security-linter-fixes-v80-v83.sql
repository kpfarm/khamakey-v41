-- KhamaKey v80-v83 — Fix da triage completo dei security advisor Supabase (2026-07-11/12)
-- Applicato in produzione. Consolidato in un solo file per i 4 fix trovati dal linter dopo il
-- deploy dell'hardening principale (v75-v79). Idempotente.
--
-- v80: rimossa la policy che permetteva di ELENCARE tutti i file del bucket Storage
-- khamakey-media (legacy, pre-migrazione a R2). Il bucket è "public": il download diretto via
-- URL nota continua a funzionare (non passa dalla RLS), solo l'enumerazione list() è bloccata.
-- Verificato: URL diretta ancora 200, list() ora restituisce [].
drop policy if exists khamakey_media_public_read on storage.objects;

-- v81: fissa search_path su una funzione di validazione senza (linter "Function Search Path
-- Mutable"). Nessun cambio di comportamento, solo hardening.
create or replace function public._moment_type_valid(p_type text)
returns text
language plpgsql
immutable
set search_path = public
as $function$
declare
  v text := coalesce(nullif(trim(p_type), ''), 'free');
begin
  if v in (
    'free','love','mom','dad','child','kids','memory','photo','pet',
    'communion','baptism','friendship','family','valentine','christmas','birthday',
    'wedding','party','travel','memorial','portfolio'
  ) then
    return v;
  end if;
  return 'free';
end
$function$;

-- v82: get_agent_delivery_history era eseguibile da ANON senza alcun controllo permessi. Con
-- p_agent_id=null (default) restituiva fino a 500 righe di consegne di TUTTI gli agenti (prezzi,
-- tracking, note) a chiunque. Usata solo da pages/admin.js (staff autenticato).
-- get_order_activation_codes e resolve_agent_commission_percent: verificato che non sono
-- chiamate da nessun file in pages/ o worker/ — accesso revocato del tutto, nessun uso reale.
create or replace function public.get_agent_delivery_history(p_agent_id uuid default null, p_limit integer default 100)
returns table(delivery_id uuid, agent_id uuid, agent_name text, platform_order_id uuid, delivery_type text, sku text, product_label text, quantity integer, unit_price numeric, sold_channel text, status text, tracking_code text, notes text, delivered_at timestamptz)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not (
    app_private.current_user_has_platform_permission('agents.read')
    or app_private.current_user_has_platform_permission('shipping.read')
    or app_private.current_user_has_platform_permission('admin.full')
  ) then
    raise exception 'Permessi insufficienti.';
  end if;

  return query
  select d.id, d.agent_id, coalesce(pa.contact_name, pa.email, 'Agente'), d.platform_order_id, d.delivery_type, d.sku, d.product_label, d.quantity, d.unit_price, d.sold_channel, d.status, d.tracking_code, d.notes, d.delivered_at
  from public.platform_agent_deliveries d join public.platform_agents pa on pa.id = d.agent_id
  where p_agent_id is null or d.agent_id = p_agent_id
  order by d.delivered_at desc
  limit greatest(1, least(coalesce(p_limit, 100), 500));
end;
$function$;

revoke all on function public.get_agent_delivery_history(uuid, integer) from public, anon;
grant execute on function public.get_agent_delivery_history(uuid, integer) to authenticated;

revoke all on function public.get_order_activation_codes(uuid) from public, anon, authenticated;
revoke all on function public.resolve_agent_commission_percent(uuid, text, text, integer) from public, anon, authenticated;

-- v83: altre 4 funzioni statistiche usate solo da pages/admin.js, senza alcun controllo
-- permessi — qualunque cliente autenticato (non solo staff) poteva chiamarle.
-- get_moment_customer_stats era la più grave: email + attività di TUTTI i clienti Moments.
create or replace function public.get_moment_customer_stats()
returns table(email text, display_name text, status text, object_count bigint, published_count bigint, last_activated_at timestamptz)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not (
    app_private.current_user_has_platform_permission('moments.read')
    or app_private.current_user_has_platform_permission('moments.write')
    or app_private.current_user_has_platform_permission('admin.full')
  ) then
    raise exception 'Permessi insufficienti.';
  end if;

  return query
  select ma.email, coalesce(ma.display_name, ma.email), ma.status, count(me.id)::bigint,
    count(me.id) filter (where me.public_visible = true)::bigint, max(me.activated_at)
  from public.moment_accounts ma left join public.moment_events me on lower(me.owner_email)=lower(ma.email)
  group by ma.id, ma.email, ma.display_name, ma.status order by max(me.activated_at) desc nulls last, ma.email;
end;
$function$;

create or replace function public.get_moment_product_inventory_stats()
returns table(product_line text, batch_label text, product_type text, total_count bigint, available_count bigint, claimed_count bigint, paused_count bigint)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not (
    app_private.current_user_has_platform_permission('moments.read')
    or app_private.current_user_has_platform_permission('moments.write')
    or app_private.current_user_has_platform_permission('admin.full')
  ) then
    raise exception 'Permessi insufficienti.';
  end if;

  return query
  select
    coalesce(mac.product_line, 'non_specificato') as product_line,
    coalesce(mac.batch_label, 'senza_lotto') as batch_label,
    coalesce(mac.product_type, 'free') as product_type,
    count(*)::bigint as total_count,
    count(*) filter (where mac.status = 'available')::bigint as available_count,
    count(*) filter (where mac.status = 'claimed')::bigint as claimed_count,
    count(*) filter (where mac.status = 'paused')::bigint as paused_count
  from public.moment_activation_codes mac
  group by 1, 2, 3
  order by max(mac.created_at) desc nulls last, 1, 2;
end;
$function$;

create or replace function public.get_moment_agent_inventory_stats()
returns table(agent_id uuid, agent_name text, sold_channel text, total_count bigint, available_count bigint, claimed_count bigint)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not (
    app_private.current_user_has_platform_permission('moments.read')
    or app_private.current_user_has_platform_permission('agents.read')
    or app_private.current_user_has_platform_permission('admin.full')
  ) then
    raise exception 'Permessi insufficienti.';
  end if;

  return query
  select mac.assigned_agent_id, coalesce(pa.contact_name, pa.email, 'Senza agente'), coalesce(mac.sold_channel, 'non_specificato'),
    count(*)::bigint, count(*) filter (where mac.status = 'available')::bigint, count(*) filter (where mac.status = 'claimed')::bigint
  from public.moment_activation_codes mac left join public.platform_agents pa on pa.id = mac.assigned_agent_id
  group by mac.assigned_agent_id, pa.contact_name, pa.email, coalesce(mac.sold_channel, 'non_specificato')
  order by 6 desc, 4 desc, 2, 3;
end;
$function$;

create or replace function public.get_agent_network_tree(p_root_agent_id uuid default null)
returns table(agent_id uuid, parent_agent_id uuid, depth integer, path uuid[], contact_name text, business_name text, email text, referral_code text, agent_type text, tier_key text, commission_percent numeric, commission_bonus_percent numeric, model text, status text, downline_count bigint)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not (
    app_private.current_user_has_platform_permission('agents.read')
    or app_private.current_user_has_platform_permission('admin.full')
  ) then
    raise exception 'Permessi insufficienti.';
  end if;

  return query
  with recursive network as (
    select pa.id as agent_id, pa.parent_agent_id, 0 as depth, array[pa.id] as path,
      pa.contact_name, pa.business_name, pa.email, pa.referral_code, pa.agent_type, pa.tier_key,
      pa.commission_percent, pa.commission_bonus_percent, pa.model, pa.status
    from public.platform_agents pa
    where ((p_root_agent_id is null and pa.parent_agent_id is null) or (p_root_agent_id is not null and pa.id = p_root_agent_id))
    union all
    select child.id, child.parent_agent_id, network.depth + 1, network.path || child.id,
      child.contact_name, child.business_name, child.email, child.referral_code, child.agent_type, child.tier_key,
      child.commission_percent, child.commission_bonus_percent, child.model, child.status
    from public.platform_agents child
    join network on child.parent_agent_id = network.agent_id
    where network.depth < 10 and not (child.id = any(network.path))
  )
  select n.agent_id, n.parent_agent_id, n.depth, n.path, n.contact_name, n.business_name, n.email, n.referral_code,
    coalesce(n.agent_type, 'agent'), coalesce(n.tier_key, 'standard'), n.commission_percent,
    coalesce(n.commission_bonus_percent, 0), n.model, n.status,
    (select count(*)::bigint from public.platform_agents d where d.parent_agent_id = n.agent_id)
  from network n
  order by n.depth, coalesce(n.contact_name, n.email), n.referral_code;
end;
$function$;

revoke all on function public.get_moment_customer_stats() from public, anon;
revoke all on function public.get_moment_product_inventory_stats() from public, anon;
revoke all on function public.get_moment_agent_inventory_stats() from public, anon;
revoke all on function public.get_agent_network_tree(uuid) from public, anon;
grant execute on function public.get_moment_customer_stats() to authenticated;
grant execute on function public.get_moment_product_inventory_stats() to authenticated;
grant execute on function public.get_moment_agent_inventory_stats() to authenticated;
grant execute on function public.get_agent_network_tree(uuid) to authenticated;
