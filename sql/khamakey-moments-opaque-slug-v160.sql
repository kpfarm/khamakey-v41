-- KhamaKey Moments v160
-- Sicurezza scaffale: slug pubblico opaco ≠ codice attivazione.
-- Il codice resta solo per inserto/confezione (CSV/PDF). Il chip NFC punta a /m/<slug>.

create or replace function app_private.random_moment_public_slug(p_len integer default 12)
returns text
language plpgsql
as $$
declare
  alphabet text := '23456789bcdfghjkmnpqrstvwxyz';
  result text := '';
  i integer;
begin
  if p_len is null or p_len < 8 then
    p_len := 12;
  end if;
  for i in 1..p_len loop
    result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::integer, 1);
  end loop;
  return result;
end;
$$;

revoke all on function app_private.random_moment_public_slug(integer) from public;
revoke all on function app_private.random_moment_public_slug(integer) from anon;
revoke all on function app_private.random_moment_public_slug(integer) from authenticated;

drop function if exists public.get_moment_activation_page(text);

-- Pagina pre-attivazione: non restituire mai il codice al Worker/pubblico
create or replace function public.get_moment_activation_page(p_slug text)
returns table (
  public_slug text,
  product_type text,
  status text,
  product_line text,
  product_label text
)
language sql
security definer
set search_path = public
as $$
  select mac.public_slug, mac.product_type, mac.status, mac.product_line, mac.product_label
  from public.moment_activation_codes mac
  where mac.public_slug = p_slug
    and mac.status in ('available','paused')
  limit 1
$$;

revoke all on function public.get_moment_activation_page(text) from public;
grant execute on function public.get_moment_activation_page(text) to anon, authenticated;

-- /k/<codice> non risolve pezzi available: in negozio il chip non deve esporre il codice.
-- Dopo attivazione resta il ramo moment_nfc_links.
create or replace function public.resolve_khamakey_code(p_code text)
returns table (
  target_type text,
  business_id uuid,
  moment_event_id uuid,
  slug text
)
language sql
security definer
set search_path = public
as $$
  select 'moment'::text, null::uuid, me.id, mp.slug
  from public.moment_nfc_links mn
  join public.moment_events me on me.id = mn.event_id
  join public.moment_pages mp on mp.event_id = me.id
  where upper(mn.code) = upper(p_code)
    and mn.status = 'active'
    and me.status = 'active'
    and mp.published = true
  limit 1
$$;

revoke all on function public.resolve_khamakey_code(text) from public;
grant execute on function public.resolve_khamakey_code(text) to anon, authenticated;

-- Nuovi lotti: slug opaco indipendente dal codice attivazione
-- Firma allineata a v157 (chiamata da admin.js)
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
  packaging_barcode text,
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
  v_type text := public._moment_type_valid(p_product_type);
  v_line text := nullif(trim(coalesce(p_product_line,'')), '');
  v_batch text := nullif(trim(coalesce(p_batch_label,'')), '');
  v_channel text := nullif(trim(coalesce(p_sold_channel,'')), '');
  v_agent uuid := p_assigned_agent_id;
  v_code text;
  v_packaging text;
  v_slug text;
  i integer := 0;
begin
  if not (
    app_private.current_user_has_platform_permission('moments.write')
    or app_private.current_user_has_platform_permission('admin.full')
  ) then
    raise exception 'Permesso moments.write richiesto.';
  end if;
  if v_channel is not null and v_channel not in ('direct','agent','reseller','gift','other') then
    v_channel := 'other';
  end if;

  while i < v_quantity loop
    v_code := app_private.random_moment_activation_code(12);
    v_packaging := app_private.random_moment_packaging_barcode();
    loop
      v_slug := app_private.random_moment_public_slug(12);
      exit when lower(v_slug) <> lower(v_code)
        and not exists (select 1 from public.moment_activation_codes mac where mac.public_slug = v_slug)
        and not exists (select 1 from public.moment_events me where me.slug = v_slug)
        and not exists (select 1 from public.moment_pages mp where mp.slug = v_slug);
    end loop;
    begin
      insert into public.moment_activation_codes (
        code,
        packaging_barcode,
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
        v_packaging,
        'available',
        v_slug,
        v_type,
        v_line,
        coalesce(v_line, 'KhamaKey Moments'),
        v_batch,
        '/m/' || v_slug,
        v_channel,
        v_agent
      );
      i := i + 1;
      out_code := v_code;
      packaging_barcode := v_packaging;
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
end;
$$;

revoke all on function public.create_moment_product_batch(integer,text,text,text,text,text,uuid) from public;
revoke all on function public.create_moment_product_batch(integer,text,text,text,text,text,uuid) from anon;
grant execute on function public.create_moment_product_batch(integer,text,text,text,text,text,uuid) to authenticated;

-- Backfill pezzi non ancora venduti: slug opaco (riprogrammare chip con nuovo Link NFC /m/<slug>)
do $$
declare
  r record;
  v_slug text;
begin
  for r in
    select mac.code
    from public.moment_activation_codes mac
    where mac.status in ('available', 'paused')
      and (
        mac.public_slug is null
        or lower(mac.public_slug) = lower(mac.code)
      )
  loop
    loop
      v_slug := app_private.random_moment_public_slug(12);
      exit when lower(v_slug) <> lower(r.code)
        and not exists (select 1 from public.moment_activation_codes x where x.public_slug = v_slug)
        and not exists (select 1 from public.moment_events me where me.slug = v_slug)
        and not exists (select 1 from public.moment_pages mp where mp.slug = v_slug);
    end loop;
    update public.moment_activation_codes mac
    set public_slug = v_slug,
        public_url = '/m/' || v_slug,
        updated_at = now()
    where mac.code = r.code;
  end loop;
end;
$$;
