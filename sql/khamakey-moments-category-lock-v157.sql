-- KhamaKey v157 — categoria Moments bloccata al codice NFC / magazzino
-- Eseguire in Supabase SQL Editor dopo v59 (categorie estese).

-- product_type sui codici: stessa lista di moment_events (v59)
alter table public.moment_activation_codes
  drop constraint if exists moment_activation_codes_product_type_check;

alter table public.moment_activation_codes
  add constraint moment_activation_codes_product_type_check
  check (product_type in (
    'free','love','mom','dad','child','kids','memory','photo','pet',
    'communion','baptism','friendship','family','valentine','christmas','birthday',
    'wedding','party','travel','memorial','portfolio'
  ));

-- Anteprima categoria da codice (signup / attivazione) — solo tipo prodotto, nessun dato sensibile
create or replace function public.peek_moment_activation_code(p_code text)
returns table (
  product_type text,
  product_label text,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := upper(regexp_replace(coalesce(p_code,''), '[^A-Za-z0-9]', '', 'g'));
  v_email text := lower(auth.jwt() ->> 'email');
begin
  if v_code !~ '^[A-Z0-9]{8,32}$' then
    return;
  end if;
  return query
  select
    public._moment_type_valid(mac.product_type),
    coalesce(nullif(trim(mac.product_label), ''), nullif(trim(mac.product_line), ''), ''),
    mac.status
  from public.moment_activation_codes mac
  where upper(mac.code) = v_code
    and (
      mac.status in ('available', 'paused')
      or (mac.status = 'claimed' and v_email is not null and lower(mac.claimed_by_email) = v_email)
    )
  limit 1;
end;
$$;

revoke all on function public.peek_moment_activation_code(text) from public;
grant execute on function public.peek_moment_activation_code(text) to anon, authenticated;

-- Attivazione: categoria sempre dal codice magazzino
create or replace function public.activate_moment_code(
  p_code text,
  p_title text,
  p_slug text,
  p_moment_type text default 'free',
  p_pin_hash text default null
)
returns table (
  event_id uuid,
  slug text,
  code text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(auth.jwt() ->> 'email');
  v_code text := upper(regexp_replace(coalesce(p_code,''), '[^A-Za-z0-9]', '', 'g'));
  v_title text := nullif(trim(coalesce(p_title,'')), '');
  v_type text := public._moment_type_valid(p_moment_type);
  v_slug text;
  v_event_id uuid;
  v_page_id uuid;
  v_existing_owner text;
  v_activation_status text;
  v_activation_owner text;
  v_activation_event uuid;
  v_activation_slug text;
  v_code_type text;
begin
  if v_email is null or v_email = '' then
    raise exception 'Accesso richiesto.';
  end if;
  if v_code !~ '^[A-Z0-9]{8,32}$' then
    raise exception 'Codice prodotto non valido.';
  end if;
  if v_title is null then
    raise exception 'Inserisci il nome della pagina.';
  end if;

  select mac.status, lower(mac.claimed_by_email), mac.claimed_event_id, mac.public_slug, mac.product_type
    into v_activation_status, v_activation_owner, v_activation_event, v_activation_slug, v_code_type
  from public.moment_activation_codes mac
  where upper(mac.code) = v_code
  limit 1;

  if v_activation_status is null then
    raise exception 'Codice non presente nell inventario KhamaKey Moments.';
  end if;
  if v_activation_status in ('paused','archived') then
    raise exception 'Questo codice non e attivabile.';
  end if;
  if v_activation_status = 'claimed' and v_activation_owner is not null and v_activation_owner <> v_email then
    raise exception 'Questo codice risulta gia collegato a un altro account.';
  end if;
  if v_activation_status = 'claimed' and v_activation_event is not null then
    return query
    select me.id, me.slug, v_code
    from public.moment_events me
    where me.id = v_activation_event
      and lower(me.owner_email) = v_email;
    return;
  end if;

  v_type := public._moment_type_valid(coalesce(v_code_type, v_type));

  select lower(me.owner_email), me.id
    into v_existing_owner, v_event_id
  from public.moment_nfc_links mn
  join public.moment_events me on me.id = mn.event_id
  where upper(mn.code) = v_code
  limit 1;

  if v_existing_owner is not null and v_existing_owner <> v_email then
    raise exception 'Questo codice risulta gia collegato a un altro account.';
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
    select me.id, me.slug, v_code
    from public.moment_events me
    where me.id = v_event_id;
    return;
  end if;

  v_slug := coalesce(nullif(trim(both '-' from lower(v_activation_slug)), ''), lower(v_code));
  while exists (select 1 from public.moment_events me where me.slug = v_slug)
     or exists (select 1 from public.moment_pages mp where mp.slug = v_slug) loop
    v_slug := lower(v_code) || '-' || lower(substr(replace(gen_random_uuid()::text,'-',''),1,5));
  end loop;

  insert into public.moment_accounts (email, display_name)
  values (v_email, v_email)
  on conflict (email) do nothing;

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
  select ma.id, v_email, v_title, v_slug, v_type, v_type, 'active', '', v_code, true, nullif(p_pin_hash,''), true,
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
  select me.id, me.slug, me.page_state, true, true, nullif(p_pin_hash,'')
  from public.moment_events me
  where me.id = v_event_id
  returning id into v_page_id;

  insert into public.moment_nfc_links (code, event_id, page_id, status)
  values (v_code, v_event_id, v_page_id, 'active');

  update public.moment_activation_codes mac
  set status = 'claimed',
      claimed_by_email = v_email,
      claimed_event_id = v_event_id,
      claimed_at = now(),
      updated_at = now()
  where mac.code = v_code;

  return query select v_event_id, v_slug, v_code;
end;
$$;

revoke all on function public.activate_moment_code(text,text,text,text,text) from public;
revoke all on function public.activate_moment_code(text,text,text,text,text) from anon;
grant execute on function public.activate_moment_code(text,text,text,text,text) to authenticated;

-- Salvataggio utente: la categoria non cambia dopo l attivazione
create or replace function public.save_my_moment_page(
  p_event_id uuid,
  p_title text,
  p_moment_type text,
  p_description text,
  p_page_state jsonb,
  p_public_visible boolean,
  p_pin_enabled boolean,
  p_pin_hash text default null
)
returns table (result_event_id uuid, result_slug text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(auth.jwt() ->> 'email');
  v_event public.moment_events%rowtype;
  v_type text;
  v_state jsonb;
begin
  if v_email is null or v_email = '' then
    raise exception 'Accesso richiesto.';
  end if;
  select * into v_event from public.moment_events
  where id = p_event_id and lower(owner_email) = v_email;
  if not found then
    raise exception 'Oggetto Moments non trovato per questo account.';
  end if;

  v_type := public._moment_type_valid(v_event.moment_type);
  v_state := coalesce(p_page_state, '{}'::jsonb);
  v_state := jsonb_set(v_state, '{type}', to_jsonb(v_type), true);

  update public.moment_events
  set title = coalesce(nullif(trim(coalesce(p_title,'')), ''), title),
      moment_type = v_type,
      event_type = v_type,
      description = coalesce(p_description, ''),
      page_state = v_state,
      public_visible = coalesce(p_public_visible, false),
      pin_enabled = coalesce(p_pin_enabled, true),
      pin_hash = coalesce(nullif(p_pin_hash,''), pin_hash),
      updated_at = now()
  where id = p_event_id;

  insert into public.moment_pages (event_id, slug, state, published, pin_enabled, pin_hash)
  values (p_event_id, v_event.slug, v_state,
    coalesce(p_public_visible, false), coalesce(p_pin_enabled, true), nullif(p_pin_hash,''))
  on conflict on constraint moment_pages_slug_key do update
  set state = excluded.state,
      published = excluded.published,
      pin_enabled = excluded.pin_enabled,
      pin_hash = coalesce(excluded.pin_hash, public.moment_pages.pin_hash),
      updated_at = now();

  return query select p_event_id, v_event.slug;
end;
$$;

-- Batch magazzino: accetta tutte le categorie v59
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
    v_slug := lower(v_code);
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
