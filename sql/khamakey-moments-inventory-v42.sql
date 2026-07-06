-- KhamaKey v42 - linea prodotto fisica, statistiche lotti, batch organizzati

alter table public.moment_activation_codes
  add column if not exists product_line text;

create index if not exists moment_activation_codes_product_line_idx
  on public.moment_activation_codes(product_line);

create index if not exists moment_activation_codes_batch_label_idx
  on public.moment_activation_codes(batch_label);

drop function if exists public.create_moment_product_batch(integer, text, text, text);

create or replace function public.create_moment_product_batch(
  p_quantity integer,
  p_prefix text default 'MOMENT',
  p_product_type text default 'free',
  p_batch_label text default null,
  p_product_line text default null
)
returns table (
  out_code text,
  public_slug text,
  product_type text,
  product_line text,
  batch_label text
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
        public_url
      )
      values (
        v_code,
        'available',
        v_slug,
        v_type,
        v_line,
        coalesce(v_line, 'KhamaKey Moments') || ' ' || v_code,
        v_batch,
        '/m/' || v_slug
      );
      i := i + 1;
      out_code := v_code;
      public_slug := v_slug;
      product_type := v_type;
      product_line := v_line;
      batch_label := v_batch;
      return next;
    exception when unique_violation then
      null;
    end;
  end loop;
end
$$;

revoke all on function public.create_moment_product_batch(integer,text,text,text,text) from public;
revoke all on function public.create_moment_product_batch(integer,text,text,text,text) from anon;
grant execute on function public.create_moment_product_batch(integer,text,text,text,text) to authenticated;

create or replace function public.get_moment_product_inventory_stats()
returns table (
  product_line text,
  batch_label text,
  product_type text,
  total_count bigint,
  available_count bigint,
  claimed_count bigint,
  paused_count bigint
)
language sql
security definer
set search_path = public
as $$
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
  order by max(mac.created_at) desc nulls last, 1, 2
$$;

revoke all on function public.get_moment_product_inventory_stats() from public;
revoke all on function public.get_moment_product_inventory_stats() from anon;
grant execute on function public.get_moment_product_inventory_stats() to authenticated;
