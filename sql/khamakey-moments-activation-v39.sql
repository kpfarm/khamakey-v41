-- KhamaKey v39 - Moments come attivazione oggetto NFC e pagina cliente componibile
-- Da applicare dopo v38 sul progetto Supabase cuxlwaocjqwzluycznyp.

alter table public.moment_events
  add column if not exists moment_type text not null default 'free',
  add column if not exists activated_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table public.moment_events
  drop constraint if exists moment_events_moment_type_check;

alter table public.moment_events
  add constraint moment_events_moment_type_check
  check (moment_type in ('free','wedding','party','travel','memory','memorial','portfolio'));

alter table public.moment_events
  drop constraint if exists moment_events_event_type_check;

alter table public.moment_events
  add constraint moment_events_event_type_check
  check (event_type in ('free','wedding','birthday','corporate','ceremony','private_party','party','travel','memory','memorial','portfolio','other'));

create table if not exists public.moment_activation_codes (
  code text primary key,
  status text not null default 'available' check (status in ('available','claimed','paused','archived')),
  claimed_by_email text,
  claimed_event_id uuid references public.moment_events(id) on delete set null,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.moment_activation_codes enable row level security;

drop policy if exists moment_activation_codes_select on public.moment_activation_codes;
create policy moment_activation_codes_select on public.moment_activation_codes
for select to authenticated
using (
  lower(claimed_by_email) = lower((select auth.jwt() ->> 'email'))
  or app_private.current_user_has_platform_permission('moments.read')
  or app_private.current_user_has_platform_permission('moments.write')
  or app_private.current_user_has_platform_permission('admin.full')
);

drop policy if exists moment_activation_codes_write on public.moment_activation_codes;
create policy moment_activation_codes_write on public.moment_activation_codes
for all to authenticated
using (app_private.current_user_has_platform_permission('moments.write') or app_private.current_user_has_platform_permission('admin.full'))
with check (app_private.current_user_has_platform_permission('moments.write') or app_private.current_user_has_platform_permission('admin.full'));

grant select, insert, update, delete on public.moment_activation_codes to authenticated;

drop policy if exists moment_events_client_insert on public.moment_events;
create policy moment_events_client_insert on public.moment_events
for insert to authenticated
with check (lower(owner_email) = lower((select auth.jwt() ->> 'email')));

drop policy if exists moment_events_client_update on public.moment_events;
create policy moment_events_client_update on public.moment_events
for update to authenticated
using (lower(owner_email) = lower((select auth.jwt() ->> 'email')))
with check (lower(owner_email) = lower((select auth.jwt() ->> 'email')));

drop policy if exists moment_pages_client_write on public.moment_pages;
create policy moment_pages_client_write on public.moment_pages
for all to authenticated
using (
  exists (
    select 1 from public.moment_events me
    where me.id = moment_pages.event_id
      and lower(me.owner_email) = lower((select auth.jwt() ->> 'email'))
  )
)
with check (
  exists (
    select 1 from public.moment_events me
    where me.id = moment_pages.event_id
      and lower(me.owner_email) = lower((select auth.jwt() ->> 'email'))
  )
);

drop policy if exists moment_nfc_links_client_select on public.moment_nfc_links;
create policy moment_nfc_links_client_select on public.moment_nfc_links
for select to authenticated
using (
  exists (
    select 1 from public.moment_events me
    where me.id = moment_nfc_links.event_id
      and lower(me.owner_email) = lower((select auth.jwt() ->> 'email'))
  )
);

insert into public.moment_activation_codes (code, status, claimed_by_email, claimed_event_id, claimed_at)
select upper(code), 'claimed', lower(me.owner_email), me.id, coalesce(me.activated_at, me.created_at, now())
from public.moment_nfc_links mn
join public.moment_events me on me.id = mn.event_id
where me.owner_email is not null
on conflict (code) do update
set status = 'claimed',
    claimed_by_email = excluded.claimed_by_email,
    claimed_event_id = excluded.claimed_event_id,
    claimed_at = coalesce(public.moment_activation_codes.claimed_at, excluded.claimed_at),
    updated_at = now();

create or replace function public.activate_moment_code(
  p_code text,
  p_title text,
  p_slug text,
  p_moment_type text default 'free'
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
  v_slug_base text := lower(regexp_replace(coalesce(p_slug, p_title, p_code), '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug text;
  v_event_id uuid;
  v_page_id uuid;
  v_existing_owner text;
  v_activation_status text;
  v_activation_owner text;
  v_activation_event uuid;
begin
  if v_email is null or v_email = '' then
    raise exception 'Accesso richiesto.';
  end if;
  if v_code !~ '^[A-Z0-9]{8,32}$' then
    raise exception 'Codice NFC non valido.';
  end if;
  if v_title is null then
    raise exception 'Inserisci il nome della pagina.';
  end if;
  if v_type not in ('free','wedding','party','travel','memory','memorial','portfolio') then
    v_type := 'free';
  end if;

  select status, lower(claimed_by_email), claimed_event_id
    into v_activation_status, v_activation_owner, v_activation_event
  from public.moment_activation_codes
  where upper(code) = v_code
  limit 1;

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
    return query
    select me.id, me.slug, v_code
    from public.moment_events me
    where me.id = v_event_id;
    return;
  end if;

  v_slug := trim(both '-' from v_slug_base);
  if v_slug is null or v_slug = '' then
    v_slug := lower(v_code);
  end if;
  while exists (select 1 from public.moment_events where slug = v_slug)
     or exists (select 1 from public.moment_pages where slug = v_slug) loop
    v_slug := trim(both '-' from v_slug_base) || '-' || lower(substr(replace(gen_random_uuid()::text,'-',''),1,5));
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
    public_visible,
    page_state,
    activated_at,
    updated_at
  )
  select ma.id, v_email, v_title, v_slug, v_type, v_type, 'active', '', v_code, true, false,
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

  insert into public.moment_pages (event_id, slug, state, published, pin_enabled)
  select me.id, me.slug, me.page_state, false, true
  from public.moment_events me
  where me.id = v_event_id
  returning id into v_page_id;

  insert into public.moment_nfc_links (code, event_id, page_id, status)
  values (v_code, v_event_id, v_page_id, 'active');

  insert into public.moment_activation_codes (code, status, claimed_by_email, claimed_event_id, claimed_at)
  values (v_code, 'claimed', v_email, v_event_id, now())
  on conflict (code) do update
  set status = 'claimed',
      claimed_by_email = excluded.claimed_by_email,
      claimed_event_id = excluded.claimed_event_id,
      claimed_at = excluded.claimed_at,
      updated_at = now();

  return query select v_event_id, v_slug, v_code;
end
$$;

revoke all on function public.activate_moment_code(text,text,text,text) from public;
revoke all on function public.activate_moment_code(text,text,text,text) from anon;
grant execute on function public.activate_moment_code(text,text,text,text) to authenticated;

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
returns table (
  event_id uuid,
  slug text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(auth.jwt() ->> 'email');
  v_event public.moment_events%rowtype;
  v_type text := coalesce(nullif(p_moment_type,''), 'free');
begin
  if v_email is null or v_email = '' then
    raise exception 'Accesso richiesto.';
  end if;
  select * into v_event
  from public.moment_events
  where id = p_event_id
    and lower(owner_email) = v_email;
  if not found then
    raise exception 'Oggetto Moments non trovato per questo account.';
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

revoke all on function public.save_my_moment_page(uuid,text,text,text,jsonb,boolean,boolean,text) from public;
revoke all on function public.save_my_moment_page(uuid,text,text,text,jsonb,boolean,boolean,text) from anon;
grant execute on function public.save_my_moment_page(uuid,text,text,text,jsonb,boolean,boolean,text) to authenticated;

create or replace function public.get_public_moment(p_slug text, p_pin_hash text default null)
returns table (
  event_id uuid,
  title text,
  slug text,
  event_type text,
  status text,
  event_date timestamptz,
  venue_name text,
  venue_address text,
  description text,
  state jsonb,
  pin_enabled boolean,
  pin_required boolean,
  pin_valid boolean
)
language sql
security definer
set search_path = public
as $$
  select
    me.id,
    me.title,
    mp.slug,
    coalesce(me.moment_type, me.event_type),
    me.status,
    me.event_date,
    me.venue_name,
    me.venue_address,
    me.description,
    mp.state,
    mp.pin_enabled,
    (mp.pin_enabled and mp.pin_hash is not null and mp.pin_hash <> '') as pin_required,
    (not mp.pin_enabled or mp.pin_hash is null or mp.pin_hash = '' or mp.pin_hash = p_pin_hash) as pin_valid
  from public.moment_pages mp
  join public.moment_events me on me.id = mp.event_id
  where mp.slug = p_slug
    and mp.published = true
    and me.status = 'active'
  limit 1
$$;

revoke all on function public.get_public_moment(text,text) from public;
grant execute on function public.get_public_moment(text,text) to anon, authenticated;

create index if not exists moment_activation_codes_status_idx on public.moment_activation_codes(status);
create index if not exists moment_events_moment_type_idx on public.moment_events(moment_type);
