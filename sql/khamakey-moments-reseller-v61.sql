-- KhamaKey v61 - tracciabilità rivenditori su codici Moments NFC

alter table public.moment_activation_codes
  add column if not exists sold_channel text,
  add column if not exists assigned_agent_id uuid;

create index if not exists moment_activation_codes_sold_channel_idx
  on public.moment_activation_codes(sold_channel);

create index if not exists moment_activation_codes_assigned_agent_idx
  on public.moment_activation_codes(assigned_agent_id);

drop function if exists public.create_moment_product_batch(integer, text, text, text, text);
drop function if exists public.create_moment_product_batch(integer, text, text, text, text, text, uuid);

create or replace function public.create_moment_product_batch(
  p_quantity integer,
  p_prefix text default 'MOMENT',
  p_product_type text default 'free',
  p_batch_label text default null,
  p_product_line text default null,
  p_sold_channel text default null,
  p_assigned_agent_id uuid default null
)
returns table (
  out_code text,
  public_slug text,
  product_type text,
  product_line text,
  batch_label text,
  sold_channel text,
  assigned_agent_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quantity integer := least(500, greatest(1, coalesce(p_quantity, 1)));
  v_prefix text := upper(regexp_replace(coalesce(nullif(p_prefix,''),'MOMENT'), '[^A-Za-z0-9]', '', 'g'));
  v_type text := coalesce(nullif(p_product_type,''), 'free');
  v_line text := nullif(trim(coalesce(p_product_line,'')), '');
  v_batch text := nullif(trim(coalesce(p_batch_label,'')), '');
  v_channel text := nullif(trim(coalesce(p_sold_channel,'')), '');
  v_agent uuid := p_assigned_agent_id;
  v_code text;
  v_slug text;
  i integer := 0;
begin
  if not (
    app_private.current_user_has_platform_permission('moments.write')
    or app_private.current_user_has_platform_permission('admin.full')
  ) then
    raise exception 'Permesso moments.write richiesto.';
  end if;
  if length(v_prefix) < 2 then
    v_prefix := 'MOMENT';
  end if;
  if v_type not in ('free','wedding','party','travel','memory','memorial','portfolio') then
    v_type := 'free';
  end if;
  if v_channel is not null and v_channel not in ('direct','agent','reseller','gift','other') then
    v_channel := 'other';
  end if;

  while i < v_quantity loop
    v_code := substr(v_prefix, 1, 12) || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
    v_slug := lower(v_code);
    begin
      insert into public.moment_activation_codes (
        code,
        status,
        public_slug,
        product_type,
        product_line,
        product_label,
        batch_label,
        public_url,
        sold_channel,
        assigned_agent_id
      )
      values (
        v_code,
        'available',
        v_slug,
        v_type,
        v_line,
        coalesce(v_line, 'KhamaKey Moments') || ' ' || v_code,
        v_batch,
        '/m/' || v_slug,
        v_channel,
        v_agent
      );
      i := i + 1;
      out_code := v_code;
      public_slug := v_slug;
      product_type := v_type;
      product_line := v_line;
      batch_label := v_batch;
      sold_channel := v_channel;
      assigned_agent_id := v_agent;
      return next;
    exception when unique_violation then
      null;
    end;
  end loop;
end
$$;

revoke all on function public.create_moment_product_batch(integer,text,text,text,text,text,uuid) from public;
revoke all on function public.create_moment_product_batch(integer,text,text,text,text,text,uuid) from anon;
grant execute on function public.create_moment_product_batch(integer,text,text,text,text,text,uuid) to authenticated;

create or replace function public.get_moment_agent_inventory_stats()
returns table (
  agent_id uuid,
  agent_name text,
  sold_channel text,
  total_count bigint,
  available_count bigint,
  claimed_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    mac.assigned_agent_id as agent_id,
    coalesce(pa.contact_name, pa.email, 'Senza agente') as agent_name,
    coalesce(mac.sold_channel, 'non_specificato') as sold_channel,
    count(*)::bigint as total_count,
    count(*) filter (where mac.status = 'available')::bigint as available_count,
    count(*) filter (where mac.status = 'claimed')::bigint as claimed_count
  from public.moment_activation_codes mac
  left join public.platform_agents pa on pa.id = mac.assigned_agent_id
  group by mac.assigned_agent_id, pa.contact_name, pa.email, coalesce(mac.sold_channel, 'non_specificato')
  order by claimed_count desc, total_count desc, agent_name, sold_channel
$$;

revoke all on function public.get_moment_agent_inventory_stats() from public;
revoke all on function public.get_moment_agent_inventory_stats() from anon;
grant execute on function public.get_moment_agent_inventory_stats() to authenticated;
