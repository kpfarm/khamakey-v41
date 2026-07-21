-- v165 — Store webhook ingest key in app_private (ALTER DATABASE non sempre disponibile)
-- Allinea Guest book / RSVP / Shopify ingest al Worker WEBHOOK_INGEST_KEY.
-- Dopo deploy codice: impostare il valore con
--   select app_private.set_webhook_ingest_key('STESSA-CHIAVE-DEL-WORKER');

create schema if not exists app_private;

create table if not exists app_private.khamakey_secrets (
  secret_key text primary key,
  secret_value text not null,
  updated_at timestamptz not null default now()
);

revoke all on table app_private.khamakey_secrets from public, anon, authenticated;
-- NON revocare USAGE sullo schema app_private ad authenticated/service_role:
-- serve a RLS e agli helper usati da create_moment_product_batch (vedi v166).
revoke all on schema app_private from public, anon;
grant usage on schema app_private to authenticated, service_role, postgres;
revoke all on table app_private.khamakey_secrets from service_role;
grant select, insert, update on table app_private.khamakey_secrets to postgres, service_role;

create or replace function app_private.webhook_ingest_key()
returns text
language sql
stable
security definer
set search_path = public, app_private
as $$
  select nullif(trim(coalesce(
    (select s.secret_value from app_private.khamakey_secrets s where s.secret_key = 'webhook_ingest' limit 1),
    current_setting('app.khamakey_webhook_ingest_key', true),
    ''
  )), '');
$$;

revoke all on function app_private.webhook_ingest_key() from public, anon, authenticated;

create or replace function app_private.set_webhook_ingest_key(p_value text)
returns boolean
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_value text := nullif(trim(coalesce(p_value, '')), '');
begin
  if v_value is null or char_length(v_value) < 16 then
    raise exception 'Chiave ingest troppo corta.';
  end if;
  insert into app_private.khamakey_secrets (secret_key, secret_value, updated_at)
  values ('webhook_ingest', v_value, now())
  on conflict (secret_key) do update
    set secret_value = excluded.secret_value,
        updated_at = now();
  return true;
end;
$$;

revoke all on function app_private.set_webhook_ingest_key(text) from public, anon, authenticated;
-- Solo service_role / owner via SQL editor o migration tool
grant execute on function app_private.set_webhook_ingest_key(text) to postgres, service_role;

-- Guestbook: usa store + fallback GUC
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
  v_expected text := app_private.webhook_ingest_key();
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

-- RSVP: stessa fonte chiave
create or replace function public.submit_moment_rsvp(
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
  v_expected text := app_private.webhook_ingest_key();
  v_slug text := nullif(trim(coalesce(p_slug, '')), '');
  v_event_id uuid;
  v_rsvp_enabled boolean := false;
  v_name text := nullif(trim(coalesce(p_values->>'name', '')), '');
  v_attending text := nullif(trim(coalesce(p_values->>'attending', '')), '');
  v_guests integer;
  v_id uuid;
begin
  if v_expected is null or v_key is distinct from v_expected then
    raise exception 'Chiave ingest non valida.';
  end if;
  if v_slug is null or v_name is null or v_attending is null then
    raise exception 'Slug, nome e presenza sono obbligatori.';
  end if;

  select
    me.id,
    coalesce((mp.state->'sections'->'rsvp'->>'enabled')::boolean, false)
  into v_event_id, v_rsvp_enabled
  from public.moment_pages mp
  join public.moment_events me on me.id = mp.event_id
  where mp.slug = v_slug
    and mp.published = true
    and me.status = 'active'
  limit 1;

  if v_event_id is null then
    raise exception 'Pagina Moments non pubblicata.';
  end if;

  if not v_rsvp_enabled then
    raise exception 'RSVP non attivo su questa pagina.';
  end if;

  begin
    v_guests := nullif(trim(coalesce(p_values->>'guests', '')), '')::integer;
  exception when others then
    v_guests := null;
  end;

  insert into public.moment_rsvp_responses (
    event_id,
    slug,
    guest_name,
    attending,
    guests_count,
    notes,
    phone,
    email,
    custom_fields,
    source,
    user_agent
  )
  values (
    v_event_id,
    v_slug,
    v_name,
    v_attending,
    v_guests,
    nullif(trim(coalesce(p_values->>'notes', '')), ''),
    nullif(trim(coalesce(p_values->>'phone', '')), ''),
    nullif(trim(coalesce(p_values->>'email', '')), ''),
    coalesce(p_values->'custom', '{}'::jsonb),
    coalesce(nullif(trim(coalesce(p_values->>'source', '')), ''), 'public_page'),
    nullif(trim(coalesce(p_user_agent, '')), '')
  )
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id);
end
$$;

revoke all on function public.submit_moment_rsvp(text, jsonb, text, text) from public;
grant execute on function public.submit_moment_rsvp(text, jsonb, text, text) to anon, authenticated;
