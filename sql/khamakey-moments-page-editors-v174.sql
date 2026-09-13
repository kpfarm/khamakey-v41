-- KhamaKey v174 — Un invitato può modificare la stessa pagina Moments del titolare.
-- Titolare = owner_email (chi ha attivato il codice). Non si sposta.
-- Invitato = account proprio; stesso editor / Salva / upload R2 / quote della pagina.
-- Tetto attuale: 1 invitato. Per allargare (famiglia 4–5) cambiare solo moment_page_editor_cap().
-- NFC, /m/, PIN ospite, attivazione e piano restano sull'evento, non per persona.
-- Token in chiaro solo nel return di invite_moment_page_editor (Worker lo manda via email).

create extension if not exists pgcrypto with schema extensions;

create or replace function public.moment_page_editor_cap()
returns integer
language sql
immutable
as $$
  select 1;
$$;

comment on function public.moment_page_editor_cap() is
  'Max invitati accepted+pending per pagina (oltre il titolare). Oggi 1; alzare qui per estendere.';

revoke all on function public.moment_page_editor_cap() from public, anon;
grant execute on function public.moment_page_editor_cap() to authenticated;

create table if not exists public.moment_page_members (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.moment_events(id) on delete cascade,
  email text not null,
  user_id uuid references auth.users(id) on delete set null,
  role text not null default 'editor',
  status text not null default 'pending',
  invite_token_hash text,
  invited_by_email text,
  invited_at timestamptz not null default now(),
  expires_at timestamptz,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint moment_page_members_email_lower check (email = lower(email)),
  constraint moment_page_members_role_chk check (role = 'editor'),
  constraint moment_page_members_status_chk check (status in ('pending', 'accepted', 'revoked')),
  constraint moment_page_members_event_email_key unique (event_id, email)
);

create index if not exists moment_page_members_token_hash_idx
  on public.moment_page_members (invite_token_hash)
  where invite_token_hash is not null;

create index if not exists moment_page_members_event_status_idx
  on public.moment_page_members (event_id, status);

alter table public.moment_page_members enable row level security;

revoke all on table public.moment_page_members from public, anon, authenticated;

-- Hash SHA-256 hex del token in chiaro. Solo app_private: il client non lo chiama.
create or replace function app_private.moment_invite_token_hash(p_token text)
returns text
language sql
immutable
set search_path = public, extensions
as $$
  select encode(extensions.digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex');
$$;

revoke all on function app_private.moment_invite_token_hash(text) from public;

-- Legge SOLO moment_page_members (mai moment_events): usabile nelle policy di moment_events
-- senza ricorsione RLS.
create or replace function app_private.moment_jwt_is_accepted_member(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.moment_page_members m
    where m.event_id = p_event_id
      and m.status = 'accepted'
      and lower(m.email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  );
$$;

revoke all on function app_private.moment_jwt_is_accepted_member(uuid) from public;
grant execute on function app_private.moment_jwt_is_accepted_member(uuid) to authenticated;

create or replace function app_private.can_access_moment_event(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_event_id is not null
    and (
      exists (
        select 1
        from public.moment_events me
        where me.id = p_event_id
          and (
            lower(coalesce(me.owner_email, '')) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
            or app_private.current_user_has_platform_permission('moments.read')
            or app_private.current_user_has_platform_permission('moments.write')
            or app_private.current_user_has_platform_permission('admin.full')
          )
      )
      or app_private.moment_jwt_is_accepted_member(p_event_id)
    );
$$;

revoke all on function app_private.can_access_moment_event(uuid) from public;

create or replace function public.moment_can_edit_event(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(app_private.can_access_moment_event(p_event_id), false);
$$;

revoke all on function public.moment_can_edit_event(uuid) from public, anon;
grant execute on function public.moment_can_edit_event(uuid) to authenticated;

drop policy if exists moment_events_select on public.moment_events;
create policy moment_events_select on public.moment_events
for select to authenticated
using (
  lower(owner_email) = lower((select auth.jwt() ->> 'email'))
  or app_private.moment_jwt_is_accepted_member(id)
  or app_private.current_user_has_platform_permission('moments.read')
  or app_private.current_user_has_platform_permission('moments.write')
  or app_private.current_user_has_platform_permission('admin.full')
);

drop policy if exists moment_pages_select on public.moment_pages;
create policy moment_pages_select on public.moment_pages
for select to authenticated
using (
  exists (
    select 1 from public.moment_events me
    where me.id = moment_pages.event_id
      and lower(me.owner_email) = lower((select auth.jwt() ->> 'email'))
  )
  or app_private.moment_jwt_is_accepted_member(event_id)
  or app_private.current_user_has_platform_permission('moments.read')
  or app_private.current_user_has_platform_permission('moments.write')
  or app_private.current_user_has_platform_permission('admin.full')
);

drop policy if exists moment_media_usage_select_owner on public.moment_media_usage;
create policy moment_media_usage_select_owner
  on public.moment_media_usage
  for select
  to authenticated
  using (
    exists (
      select 1 from public.moment_events me
      where me.id = moment_media_usage.event_id
        and (
          lower(me.owner_email) = lower((select auth.jwt() ->> 'email'))
          or app_private.current_user_has_platform_permission('moments.read')
          or app_private.current_user_has_platform_permission('moments.write')
          or app_private.current_user_has_platform_permission('admin.full')
        )
    )
    or app_private.moment_jwt_is_accepted_member(event_id)
  );

create or replace function public.save_my_moment_page(
  p_event_id uuid,
  p_title text,
  p_moment_type text,
  p_description text,
  p_page_state jsonb,
  p_public_visible boolean,
  p_pin_enabled boolean,
  p_pin_hash text default null,
  p_expected_updated_at timestamptz default null
)
returns table (result_event_id uuid, result_slug text, result_updated_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(auth.jwt() ->> 'email');
  v_event public.moment_events%rowtype;
  v_type text;
  v_state jsonb;
  v_updated timestamptz;
begin
  if v_email is null or v_email = '' then
    raise exception 'Accesso richiesto.';
  end if;
  if not app_private.can_access_moment_event(p_event_id) then
    raise exception 'Oggetto Moments non trovato per questo account.';
  end if;
  select * into v_event from public.moment_events where id = p_event_id;
  if not found then
    raise exception 'Oggetto Moments non trovato per questo account.';
  end if;

  if p_expected_updated_at is not null
     and v_event.updated_at is distinct from p_expected_updated_at then
    raise exception 'CONFLICT_STALE_SAVE: La pagina è stata salvata da un''altra sessione. Ricarica e riprova.';
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
  where id = p_event_id
  returning updated_at into v_updated;

  insert into public.moment_pages (event_id, slug, state, published, pin_enabled, pin_hash)
  values (p_event_id, v_event.slug, v_state,
    coalesce(p_public_visible, false), coalesce(p_pin_enabled, true), nullif(p_pin_hash,''))
  on conflict on constraint moment_pages_slug_key do update
  set state = excluded.state,
      published = excluded.published,
      pin_enabled = excluded.pin_enabled,
      pin_hash = coalesce(excluded.pin_hash, public.moment_pages.pin_hash),
      updated_at = now();

  return query select p_event_id, v_event.slug, v_updated;
end;
$$;

revoke all on function public.save_my_moment_page(uuid, text, text, text, jsonb, boolean, boolean, text, timestamptz) from public, anon;
grant execute on function public.save_my_moment_page(uuid, text, text, text, jsonb, boolean, boolean, text, timestamptz) to authenticated;

create or replace function public.list_my_moment_rsvp(p_event_id uuid)
returns table (
  response_id uuid,
  guest_name text,
  attending text,
  guests_count integer,
  notes text,
  phone text,
  email text,
  custom_fields jsonb,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(coalesce(auth.jwt() ->> 'email', '')) = '' then
    raise exception 'Accesso richiesto.';
  end if;
  if not app_private.can_access_moment_event(p_event_id) then
    raise exception 'Non autorizzato a vedere le risposte RSVP.';
  end if;

  return query
  select
    r.id,
    r.guest_name,
    r.attending,
    r.guests_count,
    r.notes,
    r.phone,
    r.email,
    r.custom_fields,
    r.created_at
  from public.moment_rsvp_responses r
  where r.event_id = p_event_id
  order by r.created_at desc;
end
$$;

revoke all on function public.list_my_moment_rsvp(uuid) from public, anon;
grant execute on function public.list_my_moment_rsvp(uuid) to authenticated;

create or replace function public.list_my_moment_guestbook(p_event_id uuid)
returns table (
  message_id uuid,
  guest_name text,
  message text,
  status text,
  created_at timestamptz,
  moderated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(coalesce(auth.jwt() ->> 'email', '')) = '' then
    raise exception 'Accesso richiesto.';
  end if;
  if not app_private.can_access_moment_event(p_event_id) then
    raise exception 'Non autorizzato a vedere il libro degli ospiti.';
  end if;

  return query
  select
    g.id,
    g.guest_name,
    g.message,
    g.status,
    g.created_at,
    g.moderated_at
  from public.moment_guestbook_messages g
  where g.event_id = p_event_id
  order by
    case g.status when 'pending' then 0 when 'approved' then 1 else 2 end,
    g.created_at desc;
end
$$;

revoke all on function public.list_my_moment_guestbook(uuid) from public, anon;
grant execute on function public.list_my_moment_guestbook(uuid) to authenticated;

create or replace function public.moderate_moment_guestbook(
  p_message_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text := lower(nullif(trim(coalesce(p_status, '')), ''));
  v_event_id uuid;
begin
  if lower(coalesce(auth.jwt() ->> 'email', '')) = '' then
    raise exception 'Accesso richiesto.';
  end if;
  if v_status not in ('approved', 'rejected') then
    raise exception 'Stato non valido.';
  end if;

  select g.event_id into v_event_id
  from public.moment_guestbook_messages g
  where g.id = p_message_id
  limit 1;

  if v_event_id is null then
    raise exception 'Messaggio non trovato.';
  end if;
  if not app_private.can_access_moment_event(v_event_id) then
    raise exception 'Non autorizzato a moderare questo messaggio.';
  end if;

  update public.moment_guestbook_messages
  set status = v_status,
      moderated_at = now(),
      moderated_by = lower(auth.jwt() ->> 'email')
  where id = p_message_id;

  return jsonb_build_object('ok', true, 'status', v_status);
end
$$;

revoke all on function public.moderate_moment_guestbook(uuid, text) from public, anon;
grant execute on function public.moderate_moment_guestbook(uuid, text) to authenticated;

create or replace function public.list_my_moment_events()
returns table (
  id uuid,
  title text,
  slug text,
  event_type text,
  moment_type text,
  status text,
  description text,
  nfc_code text,
  pin_enabled boolean,
  public_visible boolean,
  owner_email text,
  created_at timestamptz,
  updated_at timestamptz,
  my_role text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if v_email = '' then
    raise exception 'Accesso richiesto.';
  end if;

  return query
  select
    me.id,
    me.title,
    me.slug,
    me.event_type,
    me.moment_type,
    me.status,
    me.description,
    me.nfc_code,
    me.pin_enabled,
    me.public_visible,
    me.owner_email,
    me.created_at,
    me.updated_at,
    case
      when lower(coalesce(me.owner_email, '')) = v_email then 'owner'
      else 'editor'
    end as my_role
  from public.moment_events me
  where lower(coalesce(me.owner_email, '')) = v_email
     or exists (
       select 1
       from public.moment_page_members m
       where m.event_id = me.id
         and m.status = 'accepted'
         and lower(m.email) = v_email
     )
  order by me.created_at desc;
end;
$$;

revoke all on function public.list_my_moment_events() from public, anon;
grant execute on function public.list_my_moment_events() to authenticated;

create or replace function public.list_moment_page_editors(p_event_id uuid)
returns table (
  email text,
  role text,
  status text,
  invited_by_email text,
  invited_at timestamptz,
  expires_at timestamptz,
  accepted_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_owner text;
begin
  if v_email = '' then
    raise exception 'Accesso richiesto.';
  end if;

  select lower(me.owner_email) into v_owner
  from public.moment_events me
  where me.id = p_event_id;

  if v_owner is null then
    raise exception 'Pagina non trovata.';
  end if;
  if v_owner is distinct from v_email
     and not app_private.current_user_has_platform_permission('admin.full')
     and not app_private.current_user_has_platform_permission('moments.read') then
    raise exception 'Solo il titolare può vedere chi modifica la pagina.';
  end if;

  return query
  select
    m.email,
    m.role,
    m.status,
    m.invited_by_email,
    m.invited_at,
    m.expires_at,
    m.accepted_at
  from public.moment_page_members m
  where m.event_id = p_event_id
    and m.status in ('pending', 'accepted')
  order by m.invited_at asc;
end;
$$;

revoke all on function public.list_moment_page_editors(uuid) from public, anon;
grant execute on function public.list_moment_page_editors(uuid) to authenticated;

create or replace function public.invite_moment_page_editor(
  p_event_id uuid,
  p_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_invitee text := lower(trim(coalesce(p_email, '')));
  v_owner text;
  v_title text;
  v_existing public.moment_page_members%rowtype;
  v_active integer := 0;
  v_cap integer := public.moment_page_editor_cap();
  v_token text;
  v_hash text;
  v_expires timestamptz := now() + interval '14 days';
begin
  if v_email = '' then
    raise exception 'Accesso richiesto.';
  end if;
  if p_event_id is null then
    raise exception 'Pagina obbligatoria.';
  end if;
  if v_invitee = '' or v_invitee !~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$' then
    raise exception 'Email non valida.';
  end if;

  select lower(me.owner_email), me.title
    into v_owner, v_title
  from public.moment_events me
  where me.id = p_event_id;

  if v_owner is null then
    raise exception 'Pagina non trovata.';
  end if;
  if v_owner is distinct from v_email then
    raise exception 'Solo chi ha attivato la pagina può invitare.';
  end if;
  if v_invitee = v_owner then
    raise exception 'Non puoi invitare te stesso.';
  end if;

  select * into v_existing
  from public.moment_page_members m
  where m.event_id = p_event_id
    and m.email = v_invitee;

  if found and v_existing.status = 'accepted' then
    raise exception 'Questa persona può già modificare la pagina.';
  end if;

  select count(*)::integer into v_active
  from public.moment_page_members m
  where m.event_id = p_event_id
    and m.email is distinct from v_invitee
    and (
      m.status = 'accepted'
      or (m.status = 'pending' and m.expires_at > now())
    );

  if coalesce(v_active, 0) >= v_cap then
    raise exception 'Per ora puoi invitare una sola persona su questa pagina.';
  end if;

  v_token := encode(extensions.gen_random_bytes(24), 'hex');
  v_hash := app_private.moment_invite_token_hash(v_token);

  insert into public.moment_page_members (
    event_id, email, role, status, invite_token_hash,
    invited_by_email, invited_at, expires_at, updated_at,
    user_id, accepted_at, revoked_at
  ) values (
    p_event_id, v_invitee, 'editor', 'pending', v_hash,
    v_email, now(), v_expires, now(),
    null, null, null
  )
  on conflict (event_id, email) do update
  set
    role = 'editor',
    status = 'pending',
    invite_token_hash = excluded.invite_token_hash,
    invited_by_email = excluded.invited_by_email,
    invited_at = now(),
    expires_at = excluded.expires_at,
    accepted_at = null,
    revoked_at = null,
    user_id = null,
    updated_at = now();

  return jsonb_build_object(
    'ok', true,
    'event_id', p_event_id,
    'email', v_invitee,
    'status', 'pending',
    'expires_at', v_expires,
    'page_title', coalesce(v_title, ''),
    'invited_by_email', v_email,
    'invite_token', v_token
  );
end;
$$;

revoke all on function public.invite_moment_page_editor(uuid, text) from public, anon;
grant execute on function public.invite_moment_page_editor(uuid, text) to authenticated;

create or replace function public.peek_moment_page_invite(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_token text := lower(trim(coalesce(p_token, '')));
  v_hash text;
  v_row public.moment_page_members%rowtype;
  v_title text;
  v_status text;
begin
  if v_token !~ '^[a-f0-9]{32,128}$' then
    return jsonb_build_object('ok', false, 'status', 'invalid');
  end if;

  v_hash := app_private.moment_invite_token_hash(v_token);

  select * into v_row
  from public.moment_page_members m
  where m.invite_token_hash = v_hash
  order by m.updated_at desc
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'status', 'invalid');
  end if;

  select me.title into v_title
  from public.moment_events me
  where me.id = v_row.event_id;

  v_status := v_row.status;
  if v_status = 'pending' and v_row.expires_at is not null and v_row.expires_at <= now() then
    v_status := 'expired';
  end if;

  return jsonb_build_object(
    'ok', v_status in ('pending', 'accepted'),
    'status', v_status,
    'page_title', coalesce(v_title, ''),
    'invited_email', v_row.email,
    'invited_by_email', coalesce(v_row.invited_by_email, ''),
    'expires_at', v_row.expires_at
  );
end;
$$;

revoke all on function public.peek_moment_page_invite(text) from public;
grant execute on function public.peek_moment_page_invite(text) to anon, authenticated;

create or replace function public.accept_moment_page_invite(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_uid uuid := auth.uid();
  v_token text := lower(trim(coalesce(p_token, '')));
  v_hash text;
  v_row public.moment_page_members%rowtype;
  v_title text;
begin
  if v_email = '' or v_uid is null then
    raise exception 'Accesso richiesto.';
  end if;
  if v_token !~ '^[a-f0-9]{32,128}$' then
    raise exception 'Invito non valido.';
  end if;

  v_hash := app_private.moment_invite_token_hash(v_token);

  select * into v_row
  from public.moment_page_members m
  where m.invite_token_hash = v_hash
  for update
  limit 1;

  if not found then
    raise exception 'Invito non valido o già usato.';
  end if;
  if lower(v_row.email) is distinct from v_email then
    raise exception 'Questo invito è per un''altra email. Accedi con %', v_row.email;
  end if;
  if v_row.status = 'revoked' then
    raise exception 'Questo invito non è più valido.';
  end if;
  if v_row.status = 'pending' and v_row.expires_at is not null and v_row.expires_at <= now() then
    raise exception 'Questo invito è scaduto. Chiedi un nuovo invito al titolare.';
  end if;

  if v_row.status = 'accepted' then
    select me.title into v_title from public.moment_events me where me.id = v_row.event_id;
    return jsonb_build_object(
      'ok', true,
      'event_id', v_row.event_id,
      'title', coalesce(v_title, ''),
      'status', 'accepted'
    );
  end if;

  update public.moment_page_members
  set
    status = 'accepted',
    user_id = v_uid,
    accepted_at = now(),
    updated_at = now()
  where id = v_row.id;

  select me.title into v_title from public.moment_events me where me.id = v_row.event_id;

  return jsonb_build_object(
    'ok', true,
    'event_id', v_row.event_id,
    'title', coalesce(v_title, ''),
    'status', 'accepted'
  );
end;
$$;

revoke all on function public.accept_moment_page_invite(text) from public, anon;
grant execute on function public.accept_moment_page_invite(text) to authenticated;

create or replace function public.revoke_moment_page_editor(
  p_event_id uuid,
  p_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_target text := lower(trim(coalesce(p_email, '')));
  v_owner text;
  v_updated integer := 0;
begin
  if v_email = '' then
    raise exception 'Accesso richiesto.';
  end if;
  if p_event_id is null or v_target = '' then
    raise exception 'Pagina e email obbligatorie.';
  end if;

  select lower(me.owner_email) into v_owner
  from public.moment_events me
  where me.id = p_event_id;

  if v_owner is null then
    raise exception 'Pagina non trovata.';
  end if;
  if v_owner is distinct from v_email then
    raise exception 'Solo il titolare può revocare l''invito.';
  end if;

  update public.moment_page_members
  set
    status = 'revoked',
    invite_token_hash = null,
    revoked_at = now(),
    updated_at = now()
  where event_id = p_event_id
    and email = v_target
    and status in ('pending', 'accepted');

  get diagnostics v_updated = row_count;
  if v_updated < 1 then
    raise exception 'Nessun invito da revocare per questa email.';
  end if;

  return jsonb_build_object('ok', true, 'email', v_target, 'status', 'revoked');
end;
$$;

revoke all on function public.revoke_moment_page_editor(uuid, text) from public, anon;
grant execute on function public.revoke_moment_page_editor(uuid, text) to authenticated;
