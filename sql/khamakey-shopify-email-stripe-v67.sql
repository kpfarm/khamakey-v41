-- KhamaKey v67 — email ordine con codici NFC, ingest Stripe, tracking email
-- Applica dopo v66.

alter table public.platform_orders
  add column if not exists activation_email_sent_at timestamptz,
  add column if not exists plan_key text;

create or replace function public.get_order_activation_codes(p_order_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'code', mac.code,
        'public_slug', mac.public_slug,
        'product_line', mac.product_line
      )
      order by mac.code
    ),
    '[]'::jsonb
  )
  from public.moment_activation_codes mac
  where mac.platform_order_id = p_order_id;
$$;

revoke all on function public.get_order_activation_codes(uuid) from public;
grant execute on function public.get_order_activation_codes(uuid) to anon, authenticated;

create or replace function public.mark_order_activation_email_sent(
  p_ingest_key text,
  p_order_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text := nullif(trim(coalesce(p_ingest_key, '')), '');
  v_expected text := nullif(trim(coalesce(current_setting('app.khamakey_webhook_ingest_key', true), '')), '');
begin
  if v_expected is null or v_key is distinct from v_expected then
    raise exception 'Chiave ingest non valida.';
  end if;
  if p_order_id is null then
    raise exception 'order_id obbligatorio.';
  end if;
  update public.platform_orders
  set activation_email_sent_at = now()
  where id = p_order_id
    and activation_email_sent_at is null;
  return jsonb_build_object('ok', true, 'order_id', p_order_id);
end;
$$;

revoke all on function public.mark_order_activation_email_sent(text, uuid) from public;
grant execute on function public.mark_order_activation_email_sent(text, uuid) to anon, authenticated;

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
  v_topic text := lower(coalesce(p_payload->>'topic', 'orders/create'));
  v_existing uuid;
  v_order_id uuid;
  v_order_code text;
  v_line jsonb;
  v_sku text;
  v_qty integer;
  v_codes_assigned integer := 0;
  v_line_codes integer := 0;
  v_physical_total integer := 0;
  v_assigned record;
  v_codes jsonb := '[]'::jsonb;
  v_email_sent timestamptz;
  v_payment_status text;
  v_order_status text;
begin
  if v_expected is null or v_key is distinct from v_expected then
    raise exception 'Chiave ingest non valida.';
  end if;
  if v_shopify_id is null then
    raise exception 'shopify_order_id obbligatorio.';
  end if;

  v_payment_status := case
    when v_financial = 'paid' then 'paid'
    when v_financial in ('partially_paid', 'partially_refunded') then 'partial'
    else 'pending'
  end;
  v_order_status := case
    when v_financial in ('paid', 'partially_paid') then 'paid'
    else 'pending'
  end;

  select id, order_code, activation_email_sent_at
  into v_existing, v_order_code, v_email_sent
  from public.platform_orders
  where external_channel = 'shopify'
    and external_order_id = v_shopify_id
  limit 1;

  if v_existing is not null then
    update public.platform_orders
    set
      payment_status = v_payment_status,
      status = case when v_order_status = 'paid' then 'paid' else status end,
      total = case when v_total > 0 then v_total else total end
    where id = v_existing;

    v_codes := public.get_order_activation_codes(v_existing);

    return jsonb_build_object(
      'ok', true,
      'duplicate', true,
      'order_id', v_existing,
      'order_code', v_order_code,
      'codes_assigned', jsonb_array_length(v_codes),
      'activation_codes', v_codes,
      'payment_status', v_payment_status,
      'activation_email_sent', v_email_sent is not null,
      'should_send_email', v_email_sent is null and v_payment_status = 'paid' and v_email is not null
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
    v_order_status,
    v_payment_status,
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
    v_line_codes := 0;
    if v_sku = '' then
      continue;
    end if;

    insert into public.platform_order_items (
      order_id, catalog_sku, catalog_id, quantity, unit_price, physical_units, line_notes
    )
    select
      v_order_id, v_sku, c.id, v_qty,
      coalesce((v_line->>'price')::numeric, c.sale_price),
      v_qty * c.physical_units,
      coalesce(v_line->>'title', c.name)
    from public.platform_moment_catalog c
    where upper(c.sku) = v_sku
    limit 1;

    begin
      for v_assigned in
        select * from app_private.assign_moment_codes_for_catalog_core(
          v_order_id, v_sku, v_qty, null, null, 'shopify'
        )
      loop
        v_codes_assigned := v_codes_assigned + 1;
        v_line_codes := v_line_codes + 1;
        v_physical_total := v_assigned.physical_units;
        v_codes := v_codes || jsonb_build_array(jsonb_build_object(
          'code', v_assigned.out_code,
          'public_slug', v_assigned.public_slug,
          'product_line', v_assigned.product_line
        ));
      end loop;

      update public.platform_order_items
      set activation_codes_assigned = v_line_codes
      where order_id = v_order_id and upper(catalog_sku) = v_sku;
    exception when others then
      update public.platform_orders
      set notes = coalesce(notes, '') || ' | Codici non assegnati per ' || v_sku || ': ' || SQLERRM
      where id = v_order_id;
    end;
  end loop;

  insert into public.platform_webhook_events (
    provider, environment, event_type, external_event_id, payload, status, received_at, processed_at
  )
  values (
    'shopify', 'live', coalesce(p_payload->>'topic', 'orders/create'), v_shopify_id, p_payload, 'processed', now(), now()
  );

  return jsonb_build_object(
    'ok', true,
    'order_id', v_order_id,
    'order_code', v_order_code,
    'codes_assigned', v_codes_assigned,
    'activation_codes', v_codes,
    'physical_units', v_physical_total,
    'payment_status', v_payment_status,
    'activation_email_sent', false,
    'should_send_email', v_payment_status = 'paid' and v_email is not null
  );
end;
$$;

create or replace function public.ingest_stripe_checkout_event(
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
  v_session_id text := nullif(trim(coalesce(p_payload->>'session_id', '')), '');
  v_event_type text := nullif(trim(coalesce(p_payload->>'event_type', '')), '');
  v_payment_status text := lower(coalesce(p_payload->>'payment_status', 'unpaid'));
  v_email text := lower(nullif(trim(coalesce(p_payload->>'customer_email', '')), ''));
  v_name text := nullif(trim(coalesce(p_payload->>'customer_name', '')), '');
  v_amount numeric(12,2) := coalesce((p_payload->>'amount_total')::numeric, 0) / 100.0;
  v_currency text := upper(coalesce(p_payload->>'currency', 'EUR'));
  v_plan_key text := nullif(trim(coalesce(p_payload->>'plan_key', '')), '');
  v_order_id uuid;
  v_order_code text;
  v_existing_tx uuid;
begin
  if v_expected is null or v_key is distinct from v_expected then
    raise exception 'Chiave ingest non valida.';
  end if;
  if v_session_id is null then
    raise exception 'session_id obbligatorio.';
  end if;

  select id into v_existing_tx
  from public.platform_payment_transactions
  where provider = 'stripe' and stripe_checkout_session_id = v_session_id
  limit 1;

  if v_existing_tx is not null then
    return jsonb_build_object('ok', true, 'duplicate', true, 'transaction_id', v_existing_tx);
  end if;

  select id, order_code into v_order_id, v_order_code
  from public.platform_orders
  where stripe_checkout_session_id = v_session_id
  limit 1;

  if v_order_id is null then
    v_order_code := 'KK-STRIPE-' || substr(replace(v_session_id, 'cs_', ''), 1, 12);
    insert into public.platform_orders (
      order_code, order_type, customer_name, customer_email,
      subtotal, total, status, payment_status,
      stripe_checkout_session_id, plan_key, notes
    )
    values (
      v_order_code, 'subscription', v_name, v_email,
      v_amount, v_amount,
      case when v_payment_status = 'paid' then 'paid' else 'pending' end,
      case when v_payment_status = 'paid' then 'paid' else 'pending' end,
      v_session_id, v_plan_key,
      'Importato da Stripe Checkout'
    )
    returning id into v_order_id;
  else
    update public.platform_orders
    set
      payment_status = case when v_payment_status = 'paid' then 'paid' else payment_status end,
      status = case when v_payment_status = 'paid' then 'paid' else status end,
      total = case when v_amount > 0 then v_amount else total end,
      plan_key = coalesce(v_plan_key, plan_key)
    where id = v_order_id;
  end if;

  insert into public.platform_payment_transactions (
    provider, environment, transaction_type, order_id, amount, currency, status,
    stripe_checkout_session_id, metadata
  )
  values (
    'stripe',
    'live',
    case when v_plan_key is not null then 'subscription' else 'payment' end,
    v_order_id,
    v_amount,
    v_currency,
    case when v_payment_status = 'paid' then 'succeeded' else 'pending' end,
    v_session_id,
    p_payload
  );

  insert into public.platform_webhook_events (
    provider, environment, event_type, external_event_id, payload, status, received_at, processed_at
  )
  values (
    'stripe', 'live', coalesce(v_event_type, 'checkout.session.completed'), v_session_id, p_payload, 'processed', now(), now()
  );

  return jsonb_build_object(
    'ok', true,
    'order_id', v_order_id,
    'order_code', v_order_code,
    'payment_status', v_payment_status
  );
end;
$$;

revoke all on function public.ingest_stripe_checkout_event(text, jsonb) from public;
grant execute on function public.ingest_stripe_checkout_event(text, jsonb) to anon, authenticated;
