-- KhamaKey v169 — seed look/palette per categoria all'attivazione NFC
-- Prima: theme sempre 'classic' → verde anche su Amore.
-- Ora: colorPalette (+ theme look id) allineati a LOOK_FOR_MOMENT_TYPE / PAGE_LOOKS.
-- L'editor (Moments v226) completa sezioni e testi al primo open e salva.
-- Eseguire dopo v157 su Supabase (cuxlwaocjqwzluycznyp).

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
  v_look text;
  v_palette text;
  v_variant text := 'chiaro';
  v_font text := 'classic';
  v_hero text := 'classico';
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

  -- Look suggerito per categoria (allineato a pages/moment-themes.js LOOK_FOR_MOMENT_TYPE)
  v_look := case v_type
    when 'love' then 'amore'
    when 'valentine' then 'passion'
    when 'wedding' then 'wedding'
    when 'mom' then 'amore'
    when 'dad' then 'uomo'
    when 'child' then 'party'
    when 'kids' then 'party'
    when 'birthday' then 'party'
    when 'party' then 'party'
    when 'christmas' then 'festive'
    when 'memory' then 'memory'
    when 'photo' then 'memory'
    when 'memorial' then 'night'
    when 'travel' then 'voyage'
    when 'pet' then 'nature'
    when 'friendship' then 'party'
    when 'communion' then 'elegant'
    when 'baptism' then 'elegant'
    when 'portfolio' then 'uomo'
    else 'classic'
  end;

  v_palette := case v_look
    when 'amore' then 'rosso'
    when 'passion' then 'bordeaux'
    when 'wedding' then 'bordeaux'
    when 'uomo' then 'blu'
    when 'party' then 'arancio'
    when 'festive' then 'ambra'
    when 'memory' then 'crema'
    when 'night' then 'nero'
    when 'voyage' then 'arancio'
    when 'nature' then 'verde'
    when 'elegant' then 'viola'
    else 'verde'
  end;

  v_variant := case v_look
    when 'festive' then 'caldo'
    when 'voyage' then 'caldo'
    when 'memory' then 'caldo'
    when 'night' then 'scuro'
    else 'chiaro'
  end;

  v_font := case v_look
    when 'amore' then 'romantic'
    when 'passion' then 'romantic'
    when 'wedding' then 'romantic'
    when 'uomo' then 'modern'
    when 'party' then 'modern'
    when 'festive' then 'modern'
    when 'voyage' then 'modern'
    when 'elegant' then 'elegant'
    when 'night' then 'elegant'
    else 'classic'
  end;

  v_hero := case v_look
    when 'amore' then 'romantico'
    when 'passion' then 'romantico'
    when 'wedding' then 'romantico'
    when 'night' then 'romantico'
    when 'nature' then 'profilo'
    when 'memory' then 'intimo'
    else 'classico'
  end;

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
      'theme', v_look,
      'colorPalette', v_palette,
      'themeVariant', v_variant,
      'fontPair', v_font,
      'heroStyle', v_hero,
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
