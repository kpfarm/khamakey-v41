-- KhamaKey v70 — RSVP Moments: raccolta risposte strutturata
-- Da applicare dopo v69 su Supabase produzione (cuxlwaocjqwzluycznyp).

create table if not exists public.moment_rsvp_responses (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.moment_events(id) on delete cascade,
  slug text not null,
  guest_name text not null,
  attending text not null,
  guests_count integer,
  notes text,
  phone text,
  email text,
  custom_fields jsonb not null default '{}'::jsonb,
  source text not null default 'public_page',
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists moment_rsvp_responses_event_id_idx
  on public.moment_rsvp_responses(event_id);

create index if not exists moment_rsvp_responses_created_at_idx
  on public.moment_rsvp_responses(created_at desc);

alter table public.moment_rsvp_responses enable row level security;

drop policy if exists moment_rsvp_responses_select on public.moment_rsvp_responses;
create policy moment_rsvp_responses_select on public.moment_rsvp_responses
for select to authenticated
using (
  exists (
    select 1
    from public.moment_events me
    where me.id = moment_rsvp_responses.event_id
      and lower(me.owner_email) = lower((select auth.jwt() ->> 'email'))
  )
  or app_private.current_user_has_platform_permission('moments.read')
  or app_private.current_user_has_platform_permission('moments.write')
  or app_private.current_user_has_platform_permission('admin.full')
);

grant select on public.moment_rsvp_responses to authenticated;

-- Ingest pubblico via Worker (stessa chiave di webhook/analytics)
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
  v_expected text := nullif(trim(coalesce(current_setting('app.khamakey_webhook_ingest_key', true), '')), '');
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

-- Elenco risposte per organizzatore (editor Moments)
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

revoke all on function public.list_my_moment_rsvp(uuid) from public;
revoke all on function public.list_my_moment_rsvp(uuid) from anon;
grant execute on function public.list_my_moment_rsvp(uuid) to authenticated;
