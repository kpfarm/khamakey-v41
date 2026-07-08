-- KhamaKey v62 - collegamento ordini ↔ codici NFC (pronta consegna)

alter table public.moment_activation_codes
  add column if not exists platform_order_id uuid;

create index if not exists moment_activation_codes_platform_order_idx
  on public.moment_activation_codes(platform_order_id);

create or replace function public.bulk_update_moment_activation_codes(
  p_codes text[],
  p_status text default null,
  p_sold_channel text default null,
  p_assigned_agent_id uuid default null,
  p_platform_order_id uuid default null,
  p_clear_agent boolean default false,
  p_clear_order boolean default false
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  if not (
    app_private.current_user_has_platform_permission('moments.write')
    or app_private.current_user_has_platform_permission('admin.full')
  ) then
    raise exception 'Permesso moments.write richiesto.';
  end if;

  update public.moment_activation_codes mac
  set
    status = coalesce(nullif(trim(p_status), ''), mac.status),
    sold_channel = case
      when p_sold_channel is not null then nullif(trim(p_sold_channel), '')
      else mac.sold_channel
    end,
    assigned_agent_id = case
      when p_clear_agent then null
      when p_assigned_agent_id is not null then p_assigned_agent_id
      else mac.assigned_agent_id
    end,
    platform_order_id = case
      when p_clear_order then null
      when p_platform_order_id is not null then p_platform_order_id
      else mac.platform_order_id
    end,
    updated_at = now()
  where mac.code = any (
    select upper(trim(code)) from unnest(coalesce(p_codes, array[]::text[])) as code
  )
    and mac.status <> 'claimed';

  get diagnostics v_count = row_count;
  return v_count;
end
$$;

create or replace function public.assign_moment_codes_to_order(
  p_order_id uuid,
  p_quantity integer,
  p_product_line text default null,
  p_agent_id uuid default null,
  p_sold_channel text default null
)
returns table (
  out_code text,
  public_slug text,
  product_line text,
  batch_label text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_qty integer := least(500, greatest(1, coalesce(p_quantity, 1)));
  v_line text := nullif(trim(coalesce(p_product_line, '')), '');
  v_channel text := nullif(trim(coalesce(p_sold_channel, '')), '');
  v_agent uuid := p_agent_id;
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
  if p_order_id is null then
    raise exception 'Ordine obbligatorio.';
  end if;

  for rec in
    select mac.code
    from public.moment_activation_codes mac
    where mac.status = 'available'
      and mac.platform_order_id is null
      and (v_line is null or mac.product_line = v_line)
    order by mac.created_at asc
    limit v_qty
    for update skip locked
  loop
    update public.moment_activation_codes mac
    set
      platform_order_id = p_order_id,
      assigned_agent_id = coalesce(v_agent, mac.assigned_agent_id),
      sold_channel = coalesce(v_channel, mac.sold_channel, 'agent'),
      updated_at = now()
    where mac.code = rec.code;

    select mac.code, mac.public_slug, mac.product_line, mac.batch_label
    into out_code, public_slug, product_line, batch_label
    from public.moment_activation_codes mac
    where mac.code = rec.code;

    i := i + 1;
    return next;
    exit when i >= v_qty;
  end loop;

  if i = 0 then
    raise exception 'Nessun codice disponibile in magazzino per i filtri indicati.';
  end if;
end
$$;

revoke all on function public.bulk_update_moment_activation_codes(text[],text,text,uuid,uuid,boolean,boolean) from public;
revoke all on function public.bulk_update_moment_activation_codes(text[],text,text,uuid,uuid,boolean,boolean) from anon;
grant execute on function public.bulk_update_moment_activation_codes(text[],text,text,uuid,uuid,boolean,boolean) to authenticated;

revoke all on function public.assign_moment_codes_to_order(uuid,integer,text,uuid,text) from public;
revoke all on function public.assign_moment_codes_to_order(uuid,integer,text,uuid,text) from anon;
grant execute on function public.assign_moment_codes_to_order(uuid,integer,text,uuid,text) to authenticated;
