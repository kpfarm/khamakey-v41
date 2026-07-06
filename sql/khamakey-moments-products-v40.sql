-- KhamaKey v40 - inventario prodotti Moments, link pubblici pre-generati e attivazione con codice

alter table public.moment_activation_codes
  add column if not exists public_slug text unique,
  add column if not exists product_type text not null default 'free',
  add column if not exists product_label text,
  add column if not exists batch_label text,
  add column if not exists public_url text;

alter table public.moment_activation_codes
  drop constraint if exists moment_activation_codes_product_type_check;

alter table public.moment_activation_codes
  add constraint moment_activation_codes_product_type_check
  check (product_type in ('free','wedding','party','travel','memory','memorial','portfolio'));

create or replace function public.create_moment_product_batch(
  p_quantity integer,
  p_prefix text default 'MOMENT',
  p_product_type text default 'free',
  p_batch_label text default null
)
returns table (
  code text,
  public_slug text,
  product_type text,
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
        product_label,
        batch_label,
        public_url
      )
      values (
        v_code,
        'available',
        v_slug,
        v_type,
        'KhamaKey Moments ' || v_code,
        nullif(trim(coalesce(p_batch_label,'')), ''),
        '/m/' || v_slug
      );
      i := i + 1;
      code := v_code;
      public_slug := v_slug;
      product_type := v_type;
      batch_label := nullif(trim(coalesce(p_batch_label,'')), '');
      return next;
    exception when unique_violation then
      -- Riprova con un nuovo codice.
    end;
  end loop;
end
$$;

revoke all on function public.create_moment_product_batch(integer,text,text,text) from public;
revoke all on function public.create_moment_product_batch(integer,text,text,text) from anon;
grant execute on function public.create_moment_product_batch(integer,text,text,text) to authenticated;

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
  if v_email is null or v_email = '' then
    raise exception 'Accesso richiesto.';
  end if;
  if v_code !~ '^[A-Z0-9]{8,32}$' then
    raise exception 'Codice prodotto non valido.';
  end if;
  if v_title is null then
    raise exception 'Inserisci il nome della pagina.';
  end if;
  if v_type not in ('free','wedding','party','travel','memory','memorial','portfolio') then
    v_type := 'free';
  end if;

  select status, lower(claimed_by_email), claimed_event_id, public_slug, product_type
    into v_activation_status, v_activation_owner, v_activation_event, v_activation_slug, v_type
  from public.moment_activation_codes
  where upper(code) = v_code
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
    update public.moment_activation_codes
    set status = 'claimed',
        claimed_by_email = v_email,
        claimed_event_id = v_event_id,
        claimed_at = coalesce(claimed_at, now()),
        updated_at = now()
    where code = v_code;
    return query
    select me.id, me.slug, v_code
    from public.moment_events me
    where me.id = v_event_id;
    return;
  end if;

  v_slug := coalesce(nullif(trim(both '-' from lower(v_activation_slug)), ''), lower(v_code));
  while exists (select 1 from public.moment_events where slug = v_slug)
     or exists (select 1 from public.moment_pages where slug = v_slug) loop
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

  update public.moment_activation_codes
  set status = 'claimed',
      claimed_by_email = v_email,
      claimed_event_id = v_event_id,
      claimed_at = now(),
      updated_at = now()
  where code = v_code;

  return query select v_event_id, v_slug, v_code;
end
$$;

revoke all on function public.activate_moment_code(text,text,text,text,text) from public;
revoke all on function public.activate_moment_code(text,text,text,text,text) from anon;
grant execute on function public.activate_moment_code(text,text,text,text,text) to authenticated;

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
  union all
  select 'moment_activation'::text, null::uuid, null::uuid, mac.public_slug
  from public.moment_activation_codes mac
  where upper(mac.code) = upper(p_code)
    and mac.status = 'available'
    and mac.public_slug is not null
  limit 1
$$;

revoke all on function public.resolve_khamakey_code(text) from public;
grant execute on function public.resolve_khamakey_code(text) to anon, authenticated;

create or replace function public.get_moment_activation_page(p_slug text)
returns table (
  code text,
  public_slug text,
  product_type text,
  status text
)
language sql
security definer
set search_path = public
as $$
  select code, public_slug, product_type, status
  from public.moment_activation_codes
  where public_slug = p_slug
    and status in ('available','paused')
  limit 1
$$;

revoke all on function public.get_moment_activation_page(text) from public;
grant execute on function public.get_moment_activation_page(text) to anon, authenticated;

create index if not exists moment_activation_codes_public_slug_idx on public.moment_activation_codes(public_slug);
create index if not exists moment_activation_codes_product_type_idx on public.moment_activation_codes(product_type);
