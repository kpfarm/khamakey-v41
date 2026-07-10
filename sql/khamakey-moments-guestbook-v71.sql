-- KhamaKey v71 — Libro degli ospiti Moments
-- Da applicare dopo v70 su Supabase produzione.

create table if not exists public.moment_guestbook_messages (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.moment_events(id) on delete cascade,
  slug text not null,
  guest_name text not null,
  message text not null,
  status text not null default 'pending'
    check (status in ('pending','approved','rejected')),
  user_agent text,
  created_at timestamptz not null default now(),
  moderated_at timestamptz,
  moderated_by text
);

create index if not exists moment_guestbook_messages_event_id_idx
  on public.moment_guestbook_messages(event_id);

create index if not exists moment_guestbook_messages_status_idx
  on public.moment_guestbook_messages(event_id, status, created_at desc);

alter table public.moment_guestbook_messages enable row level security;

drop policy if exists moment_guestbook_messages_select on public.moment_guestbook_messages;
create policy moment_guestbook_messages_select on public.moment_guestbook_messages
for select to authenticated
using (
  exists (
    select 1
    from public.moment_events me
    where me.id = moment_guestbook_messages.event_id
      and lower(me.owner_email) = lower((select auth.jwt() ->> 'email'))
  )
  or app_private.current_user_has_platform_permission('moments.read')
  or app_private.current_user_has_platform_permission('moments.write')
  or app_private.current_user_has_platform_permission('admin.full')
);

grant select on public.moment_guestbook_messages to authenticated;

create or replace function public.submit_moment_guestbook(
  p_slug text,
  p_values jsonb,
  p_ingest_key text default null,
  p_user_agent text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text := nullif(trim(coalesce(p_ingest_key, '')), '');
  v_expected text := nullif(trim(coalesce(current_setting('app.khamakey_webhook_ingest_key', true), '')), '');
  v_slug text := nullif(trim(coalesce(p_slug, '')), '');
  v_event_id uuid;
  v_guestbook_enabled boolean := false;
  v_name text := nullif(trim(coalesce(p_values->>'name', '')), '');
  v_message text := nullif(trim(coalesce(p_values->>'message', '')), '');
  v_id uuid;
begin
  if v_expected is null or v_key is distinct from v_expected then
    raise exception 'Chiave ingest non valida.';
  end if;
  if v_slug is null or v_name is null or v_message is null then
    raise exception 'Slug, nome e messaggio sono obbligatori.';
  end if;
  if char_length(v_message) > 1200 then
    raise exception 'Messaggio troppo lungo.';
  end if;

  select
    me.id,
    coalesce((mp.state->'sections'->'guestbook'->>'enabled')::boolean, false)
  into v_event_id, v_guestbook_enabled
  from public.moment_pages mp
  join public.moment_events me on me.id = mp.event_id
  where mp.slug = v_slug
    and mp.published = true
    and me.status = 'active'
  limit 1;

  if v_event_id is null then
    raise exception 'Pagina Moments non pubblicata.';
  end if;

  if not v_guestbook_enabled then
    raise exception 'Libro degli ospiti non attivo su questa pagina.';
  end if;

  insert into public.moment_guestbook_messages (
    event_id,
    slug,
    guest_name,
    message,
    status,
    user_agent
  )
  values (
    v_event_id,
    v_slug,
    v_name,
    v_message,
    'pending',
    nullif(trim(coalesce(p_user_agent, '')), '')
  )
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id, 'status', 'pending');
end
$$;

revoke all on function public.submit_moment_guestbook(text, jsonb, text, text) from public;
grant execute on function public.submit_moment_guestbook(text, jsonb, text, text) to anon, authenticated;

create or replace function public.list_public_moment_guestbook(p_slug text)
returns table (
  message_id uuid,
  guest_name text,
  message text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    g.id,
    g.guest_name,
    g.message,
    g.created_at
  from public.moment_guestbook_messages g
  join public.moment_pages mp on mp.slug = g.slug
  join public.moment_events me on me.id = mp.event_id
  where g.slug = nullif(trim(coalesce(p_slug, '')), '')
    and g.status = 'approved'
    and mp.published = true
    and me.status = 'active'
    and coalesce((mp.state->'sections'->'guestbook'->>'enabled')::boolean, false) = true
  order by g.created_at desc
  limit 120;
$$;

revoke all on function public.list_public_moment_guestbook(text) from public;
grant execute on function public.list_public_moment_guestbook(text) to anon, authenticated;

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
declare
  v_email text := lower(auth.jwt() ->> 'email');
  v_allowed boolean := false;
begin
  if v_email is null or v_email = '' then
    raise exception 'Accesso richiesto.';
  end if;

  select true into v_allowed
  from public.moment_events me
  where me.id = p_event_id
    and (
      lower(me.owner_email) = v_email
      or app_private.current_user_has_platform_permission('moments.read')
      or app_private.current_user_has_platform_permission('moments.write')
      or app_private.current_user_has_platform_permission('admin.full')
    )
  limit 1;

  if not coalesce(v_allowed, false) then
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

revoke all on function public.list_my_moment_guestbook(uuid) from public;
revoke all on function public.list_my_moment_guestbook(uuid) from anon;
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
  v_email text := lower(auth.jwt() ->> 'email');
  v_status text := lower(nullif(trim(coalesce(p_status, '')), ''));
  v_event_id uuid;
  v_allowed boolean := false;
begin
  if v_email is null or v_email = '' then
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

  select true into v_allowed
  from public.moment_events me
  where me.id = v_event_id
    and (
      lower(me.owner_email) = v_email
      or app_private.current_user_has_platform_permission('moments.write')
      or app_private.current_user_has_platform_permission('admin.full')
    )
  limit 1;

  if not coalesce(v_allowed, false) then
    raise exception 'Non autorizzato a moderare questo messaggio.';
  end if;

  update public.moment_guestbook_messages
  set status = v_status,
      moderated_at = now(),
      moderated_by = v_email
  where id = p_message_id;

  return jsonb_build_object('ok', true, 'status', v_status);
end
$$;

revoke all on function public.moderate_moment_guestbook(uuid, text) from public;
revoke all on function public.moderate_moment_guestbook(uuid, text) from anon;
grant execute on function public.moderate_moment_guestbook(uuid, text) to authenticated;
