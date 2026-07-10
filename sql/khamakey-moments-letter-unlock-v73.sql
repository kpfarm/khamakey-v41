-- KhamaKey v73 — Notifica apertura lettera al futuro
-- Da applicare dopo v72 su Supabase produzione.

create table if not exists public.moment_letter_unlock_log (
  event_id uuid primary key references public.moment_events(id) on delete cascade,
  unlock_date date not null,
  owner_email text not null,
  sent_on date not null default current_date,
  resend_id text,
  created_at timestamptz not null default now()
);

alter table public.moment_letter_unlock_log enable row level security;

drop policy if exists moment_letter_unlock_log_select on public.moment_letter_unlock_log;
create policy moment_letter_unlock_log_select on public.moment_letter_unlock_log
for select to authenticated
using (
  app_private.current_user_has_platform_permission('moments.read')
  or app_private.current_user_has_platform_permission('moments.write')
  or app_private.current_user_has_platform_permission('admin.full')
);

grant select on public.moment_letter_unlock_log to authenticated;

create or replace function public.due_moment_letter_unlocks(
  p_day date default current_date,
  p_ingest_key text default null
)
returns table (
  event_id uuid,
  slug text,
  title text,
  owner_email text,
  unlock_date date,
  recipient text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text := nullif(trim(coalesce(p_ingest_key, '')), '');
  v_expected text := nullif(trim(coalesce(current_setting('app.khamakey_webhook_ingest_key', true), '')), '');
begin
  if v_expected is null or v_key is distinct from v_expected then
    raise exception 'Chiave ingest non valida.';
  end if;

  return query
  select
    me.id,
    mp.slug,
    coalesce(nullif(trim(me.title), ''), 'Il tuo Moment') as title,
    lower(me.owner_email) as owner_email,
    (nullif(trim(mp.state->'sections'->'letter_future'->>'unlock_date'), '')::timestamptz)::date as unlock_date,
    nullif(trim(mp.state->'sections'->'letter_future'->>'recipient'), '') as recipient
  from public.moment_events me
  join public.moment_pages mp on mp.event_id = me.id
  where me.status = 'active'
    and mp.published = true
    and me.owner_email is not null
    and coalesce((mp.state->>'anniversary_emails')::boolean, true) = true
    and coalesce((mp.state->'sections'->'letter_future'->>'enabled')::boolean, false) = true
    and nullif(trim(mp.state->'sections'->'letter_future'->>'unlock_date'), '') is not null
    and (nullif(trim(mp.state->'sections'->'letter_future'->>'unlock_date'), '')::timestamptz)::date = p_day
    and not exists (
      select 1 from public.moment_letter_unlock_log l where l.event_id = me.id
    );
end
$$;

revoke all on function public.due_moment_letter_unlocks(date, text) from public;
grant execute on function public.due_moment_letter_unlocks(date, text) to anon, authenticated;

create or replace function public.record_moment_letter_unlock_send(
  p_event_id uuid,
  p_unlock_date date,
  p_owner_email text,
  p_ingest_key text default null,
  p_resend_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text := nullif(trim(coalesce(p_ingest_key, '')), '');
  v_expected text := nullif(trim(coalesce(current_setting('app.khamakey_webhook_ingest_key', true), '')), '');
begin
  if v_expected is null or v_key is distinct from v_expected then
    raise exception 'Chiave ingest non valida.';
  end if;

  insert into public.moment_letter_unlock_log (event_id, unlock_date, owner_email, resend_id)
  values (
    p_event_id,
    p_unlock_date,
    lower(nullif(trim(coalesce(p_owner_email, '')), '')),
    nullif(trim(coalesce(p_resend_id, '')), '')
  )
  on conflict (event_id) do update
  set sent_on = current_date,
      owner_email = excluded.owner_email,
      resend_id = coalesce(excluded.resend_id, public.moment_letter_unlock_log.resend_id);

  return jsonb_build_object('ok', true);
end
$$;

revoke all on function public.record_moment_letter_unlock_send(uuid, date, text, text, text) from public;
grant execute on function public.record_moment_letter_unlock_send(uuid, date, text, text, text) to anon, authenticated;
