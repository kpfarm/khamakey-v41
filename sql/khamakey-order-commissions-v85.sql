-- KhamaKey v85 — Aggancio automatico provvigioni al flusso ordini
-- La rete rivenditori (v68) e la distribuzione multilivello (distribute_network_commissions)
-- esistono, ma nessun ordine generava provvigioni: la funzione andava chiamata a mano e ha un
-- gate di permesso che la rende inutilizzabile dal flusso ingest (Shopify/Stripe) che gira con
-- ingest_key, non con un utente autenticato.
--
-- Questa migrazione aggancia la distribuzione a un TRIGGER su platform_orders: un unico punto
-- che copre ogni modo in cui nasce/aggiorna un ordine (ingest Shopify, ingest Stripe, creazione
-- admin, assegnazione agente successiva). Idempotente: mai due volte lo stesso ordine.
-- Nessuna tabella nuova, nessun dato esistente modificato. Le provvigioni nascono 'pending'
-- (revisione/pagamento a cura dell'admin, come da design v68).

-- ---------------------------------------------------------------------------
-- Distributore interno (SECURITY DEFINER, senza gate permessi: invocato solo dal trigger,
-- che a sua volta scatta solo su una riga ordine reale già inserita/aggiornata nel DB).
-- ---------------------------------------------------------------------------
create or replace function public.apply_order_commissions(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order       public.platform_orders%rowtype;
  v_event_type  text;
  v_base        numeric;
  v_chain       uuid[];
  v_level       integer;
  v_agent_id    uuid;
  v_percent     numeric;
  v_max_depth   integer := 3;
begin
  select * into v_order from public.platform_orders where id = p_order_id;
  if not found then return; end if;
  if v_order.agent_id is null then return; end if;

  -- Base provvigione: valore merce (subtotal) escluse spedizione/sconti; fallback a total.
  v_base := coalesce(nullif(v_order.subtotal, 0), v_order.total, 0);
  if v_base <= 0 then return; end if;

  -- Idempotenza: se questo ordine ha già generato provvigioni, non rifare nulla.
  if exists (
    select 1 from public.platform_commission_events
    where source_type = 'order' and source_id = p_order_id
  ) then
    return;
  end if;

  -- Tipo evento: abbonamento se l'ordine è legato a un piano/subscription, altrimenti ordine NFC.
  -- (order_type ammesso: nfc/setup/subscription/ecommerce/manual; event_type provvigione: nfc_order/subscription/setup)
  v_event_type := case
    when coalesce(v_order.plan_key, '') <> '' or coalesce(v_order.stripe_subscription_id, '') <> ''
         or v_order.order_type = 'subscription' then 'subscription'
    else 'nfc_order'
  end;

  -- Catena upline dell'agente venditore (fino a 5, distribuiamo sui primi 3 livelli con regole).
  with recursive upline as (
    select pa.id, pa.parent_agent_id, 1 as lvl, array[pa.id]::uuid[] as chain
      from public.platform_agents pa where pa.id = v_order.agent_id
    union all
    select parent.id, parent.parent_agent_id, u.lvl + 1, u.chain || parent.id
      from public.platform_agents parent
      join upline u on parent.id = u.parent_agent_id
      where u.lvl < 5 and not (parent.id = any(u.chain))
  )
  select array_agg(id order by lvl) into v_chain from upline;

  if v_chain is null then return; end if;

  for v_level in 1..v_max_depth loop
    exit when v_level > array_length(v_chain, 1);
    v_agent_id := v_chain[v_level];
    v_percent := public.resolve_agent_commission_percent(v_agent_id, v_event_type, 'all', v_level);
    if coalesce(v_percent, 0) <= 0 then continue; end if;
    -- commission_amount è colonna GENERATA nel DB (round(amount*commission_percent/100,2)): non inserirla.
    insert into public.platform_commission_events (
      agent_id, business_id, event_type, amount, commission_percent,
      status, tier_level, source_type, source_id, source_agent_id, network_depth, rule_snapshot
    ) values (
      v_agent_id, v_order.business_id, v_event_type, v_base, v_percent,
      'pending', v_level, 'order', p_order_id, v_order.agent_id, v_level,
      jsonb_build_object('product_area','all','order_id',p_order_id,'order_code',v_order.order_code,'percent',v_percent)
    );
  end loop;
end;
$$;

revoke all on function public.apply_order_commissions(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Trigger: distribuisci alla creazione ordine e quando un agente viene assegnato dopo.
-- L'idempotenza dentro apply_order_commissions protegge da doppie esecuzioni.
-- ---------------------------------------------------------------------------
create or replace function public.trg_apply_order_commissions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.agent_id is not null then
    begin
      perform public.apply_order_commissions(new.id);
    exception when others then
      -- Le provvigioni non devono MAI bloccare la creazione/aggiornamento di un ordine.
      raise warning 'apply_order_commissions fallita per ordine %: %', new.id, sqlerrm;
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists platform_orders_commissions on public.platform_orders;
create trigger platform_orders_commissions
  after insert or update of agent_id on public.platform_orders
  for each row
  execute function public.trg_apply_order_commissions();
