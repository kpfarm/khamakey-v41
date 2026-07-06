-- KhamaKey v43 - clienti Moments da admin, provisioning senza cliente, salvataggio editor admin

create or replace function public.admin_provision_moment_customer(
  p_email text,
  p_display_name text default null,
  p_code text default null,
  p_title text default null,
  p_moment_type text default 'free',
  p_pin_hash text default null
)
returns table (
  account_email text,
  event_id uuid,
  slug text,
  code text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_name text := nullif(trim(coalesce(p_display_name, '')), '');
  v_code text := upper(regexp_replace(coalesce(p_code,''), '[^A-Za-z0-9]', '', 'g'));
  v_title text := nullif(trim(coalesce(p_title,'')), '');
  v_type text := coalesce(nullif(p_moment_type,''), 'free');
  v_slug text;
  v_event_id uuid;
  v_page_id uuid;
  v_existing_owner text;
  v_activation_status text;
  v_activation_owner text;
  v_activation_event uuid;
  v_activation_slug text;
begin
  if not (
    app_private.current_user_has_platform_permission('moments.write')
    or app_private.current_user_has_platform_permission('admin.full')
  ) then
    raise exception 'Permesso moments.write richiesto.';
  end if;
  if v_email is null or v_email = '' or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Email cliente non valida.';
  end if;

  insert into public.moment_accounts (email, display_name, status)
  values (v_email, coalesce(v_name, v_email), 'active')
  on conflict (email) do update
  set display_name = coalesce(excluded.display_name, public.moment_accounts.display_name),
      status = 'active',
      updated_at = now();

  if v_code is null or v_code = '' then
    account_email := v_email;
    event_id := null;
    slug := null;
    code := null;
    return next;
    return;
  end if;

  if v_code !~ '^[A-Z0-9]{8,32}$' then
    raise exception 'Codice NFC non valido.';
  end if;
  if v_title is null then
    raise exception 'Inserisci il titolo della pagina per attivare il codice.';
  end if;
  if v_type not in ('free','wedding','party','travel','memory','memorial','portfolio') then
    v_type := 'free';
  end if;

  select mac.status, lower(mac.claimed_by_email), mac.claimed_event_id, mac.public_slug, mac.product_type
    into v_activation_status, v_activation_owner, v_activation_event, v_activation_slug, v_type
  from public.moment_activation_codes mac
  where upper(mac.code) = v_code
  limit 1;

  if v_activation_status is null then
    raise exception 'Codice non presente nel magazzino Moments.';
  end if;
  if v_activation_status in ('paused','archived') then
    raise exception 'Questo codice non e attivabile.';
  end if;
  if v_activation_status = 'claimed' and v_activation_owner is not null and v_activation_owner <> v_email then
    raise exception 'Codice gia collegato a un altro cliente.';
  end if;
  if v_activation_status = 'claimed' and v_activation_event is not null then
    return query
    select v_email, me.id, me.slug, v_code
    from public.moment_events me
    where me.id = v_activation_event;
    return;
  end if;

  select lower(me.owner_email), me.id
    into v_existing_owner, v_event_id
  from public.moment_nfc_links mn
  join public.moment_events me on me.id = mn.event_id
  where upper(mn.code) = v_code
  limit 1;

  if v_existing_owner is not null and v_existing_owner <> v_email then
    raise exception 'Codice gia collegato a un altro cliente.';
  end if;

  if v_event_id is not null then
    update public.moment_activation_codes mac
    set status = 'claimed',
        claimed_by_email = v_email,
        claimed_event_id = v_event_id,
        claimed_at = coalesce(mac.claimed_at, now()),
        updated_at = now()
    where mac.code = v_code;
    return query
    select v_email, me.id, me.slug, v_code
    from public.moment_events me
    where me.id = v_event_id;
    return;
  end if;

  v_slug := coalesce(nullif(trim(both '-' from lower(v_activation_slug)), ''), lower(v_code));
  while exists (select 1 from public.moment_events me where me.slug = v_slug)
     or exists (select 1 from public.moment_pages mp where mp.slug = v_slug) loop
    v_slug := lower(v_code) || '-' || lower(substr(replace(gen_random_uuid()::text,'-',''),1,5));
  end loop;

  insert into public.moment_events (
    account_id,
    owner_email,
    title,
    slug,
    event_type,
    moment_type,
    status,
    description,
    nfc_code,
    pin_enabled,
    pin_hash,
    public_visible,
    page_state,
    activated_at,
    updated_at
  )
  select ma.id, v_email, v_title, v_slug, v_type, v_type, 'active', '', v_code, true, nullif(p_pin_hash,''), false,
    jsonb_build_object(
      'title', v_title,
      'type', v_type,
      'subtitle', '',
      'description', '',
      'theme', 'classic',
      'sections', jsonb_build_object(
        'intro', jsonb_build_object('enabled', true, 'title', 'La nostra storia', 'body', ''),
        'details', jsonb_build_object('enabled', true, 'title', 'Dettagli', 'body', ''),
        'gallery', jsonb_build_object('enabled', false, 'title', 'Galleria', 'body', ''),
        'schedule', jsonb_build_object('enabled', false, 'title', 'Programma', 'body', ''),
        'location', jsonb_build_object('enabled', false, 'title', 'Luogo', 'body', ''),
        'contacts', jsonb_build_object('enabled', false, 'title', 'Contatti', 'body', ''),
        'message', jsonb_build_object('enabled', false, 'title', 'Messaggio', 'body', '')
      )
    ),
    now(),
    now()
  from public.moment_accounts ma
  where ma.email = v_email
  returning id into v_event_id;

  insert into public.moment_pages (event_id, slug, state, published, pin_enabled, pin_hash)
  select me.id, me.slug, me.page_state, false, true, nullif(p_pin_hash,'')
  from public.moment_events me
  where me.id = v_event_id
  returning id into v_page_id;

  insert into public.moment_nfc_links (code, event_id, page_id, status)
  values (v_code, v_event_id, v_page_id, 'active')
  on conflict (code) do update
  set event_id = excluded.event_id,
      page_id = excluded.page_id,
      status = 'active',
      updated_at = now();

  update public.moment_activation_codes mac
  set status = 'claimed',
      claimed_by_email = v_email,
      claimed_event_id = v_event_id,
      claimed_at = coalesce(mac.claimed_at, now()),
      updated_at = now()
  where mac.code = v_code;

  return query select v_email, v_event_id, v_slug, v_code;
end
$$;

revoke all on function public.admin_provision_moment_customer(text,text,text,text,text,text) from public;
revoke all on function public.admin_provision_moment_customer(text,text,text,text,text,text) from anon;
grant execute on function public.admin_provision_moment_customer(text,text,text,text,text,text) to authenticated;

create or replace function public.admin_save_moment_page(
  p_event_id uuid,
  p_title text,
  p_moment_type text,
  p_description text,
  p_page_state jsonb,
  p_public_visible boolean,
  p_pin_enabled boolean,
  p_pin_hash text default null
)
returns table (
  event_id uuid,
  slug text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.moment_events%rowtype;
  v_type text := coalesce(nullif(p_moment_type,''), 'free');
begin
  if not (
    app_private.current_user_has_platform_permission('moments.write')
    or app_private.current_user_has_platform_permission('admin.full')
  ) then
    raise exception 'Permesso moments.write richiesto.';
  end if;

  select * into v_event
  from public.moment_events
  where id = p_event_id;
  if not found then
    raise exception 'Oggetto Moments non trovato.';
  end if;
  if v_type not in ('free','wedding','party','travel','memory','memorial','portfolio') then
    v_type := 'free';
  end if;

  update public.moment_events
  set title = coalesce(nullif(trim(coalesce(p_title,'')), ''), title),
      moment_type = v_type,
      event_type = v_type,
      description = coalesce(p_description, ''),
      page_state = coalesce(p_page_state, '{}'::jsonb),
      public_visible = coalesce(p_public_visible, false),
      pin_enabled = coalesce(p_pin_enabled, true),
      pin_hash = coalesce(nullif(p_pin_hash,''), pin_hash),
      updated_at = now()
  where id = p_event_id;

  insert into public.moment_pages (event_id, slug, state, published, pin_enabled, pin_hash)
  values (
    p_event_id,
    v_event.slug,
    coalesce(p_page_state, '{}'::jsonb),
    coalesce(p_public_visible, false),
    coalesce(p_pin_enabled, true),
    nullif(p_pin_hash,'')
  )
  on conflict (slug) do update
  set state = excluded.state,
      published = excluded.published,
      pin_enabled = excluded.pin_enabled,
      pin_hash = coalesce(excluded.pin_hash, public.moment_pages.pin_hash),
      updated_at = now();

  return query select p_event_id, v_event.slug;
end
$$;

revoke all on function public.admin_save_moment_page(uuid,text,text,text,jsonb,boolean,boolean,text) from public;
revoke all on function public.admin_save_moment_page(uuid,text,text,text,jsonb,boolean,boolean,text) from anon;
grant execute on function public.admin_save_moment_page(uuid,text,text,text,jsonb,boolean,boolean,text) to authenticated;

create or replace function public.get_moment_customer_stats()
returns table (
  email text,
  display_name text,
  status text,
  object_count bigint,
  published_count bigint,
  last_activated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    ma.email,
    coalesce(ma.display_name, ma.email) as display_name,
    ma.status,
    count(me.id)::bigint as object_count,
    count(me.id) filter (where me.public_visible = true)::bigint as published_count,
    max(me.activated_at) as last_activated_at
  from public.moment_accounts ma
  left join public.moment_events me on lower(me.owner_email) = lower(ma.email)
  group by ma.id, ma.email, ma.display_name, ma.status
  order by max(me.activated_at) desc nulls last, ma.email
$$;

revoke all on function public.get_moment_customer_stats() from public;
revoke all on function public.get_moment_customer_stats() from anon;
grant execute on function public.get_moment_customer_stats() to authenticated;
