-- v177 — Cron Moments: stessa chiave ingest di RSVP/guestbook (app_private)
-- Non cambia il valore della chiave, né editor, NFC, Salva, upload.
-- v72/v73/v77 leggevano ancora current_setting('app.khamakey_webhook_ingest_key'),
-- vuoto in produzione dopo v165 → zero mail anniversario / lettera, pulizia rate-limit ferma.

create or replace function public.due_moment_anniversaries(
  p_day date default current_date,
  p_ingest_key text default null
)
returns table (
  event_id uuid,
  slug text,
  title text,
  owner_email text,
  anchor_type text,
  anchor_label text,
  years integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text := nullif(trim(coalesce(p_ingest_key, '')), '');
  v_expected text := app_private.webhook_ingest_key();
begin
  if v_expected is null or v_key is distinct from v_expected then
    raise exception 'Chiave ingest non valida.';
  end if;

  return query
  with base as (
    select
      me.id as event_id,
      mp.slug,
      coalesce(nullif(trim(me.title), ''), 'Il tuo Moment') as title,
      lower(me.owner_email) as owner_email,
      mp.state
    from public.moment_events me
    join public.moment_pages mp on mp.event_id = me.id
    where me.status = 'active'
      and mp.published = true
      and me.owner_email is not null
      and coalesce((mp.state->>'anniversary_emails')::boolean, true) = true
  ),
  anchors as (
    select b.event_id, b.slug, b.title, b.owner_email, 'event_date'::text as anchor_type,
      'Data dell''evento'::text as anchor_label,
      me.event_date::date as anchor_date
    from base b
    join public.moment_events me on me.id = b.event_id
    where me.event_date is not null

    union all

    select b.event_id, b.slug, b.title, b.owner_email, 'together_since'::text,
      'Insieme da'::text,
      nullif(trim(b.state->>'together_since'), '')::date
    from base b
    where coalesce((b.state->>'show_together_counter')::boolean, false) = true
      and nullif(trim(b.state->>'together_since'), '') is not null

    union all

    select b.event_id, b.slug, b.title, b.owner_email, 'countdown'::text,
      coalesce(nullif(trim(b.state->'sections'->'countdown'->>'event_label'), ''), 'Il grande giorno')::text,
      nullif(trim(b.state->'sections'->'countdown'->>'target_date'), '')::timestamptz::date
    from base b
    where coalesce((b.state->'sections'->'countdown'->>'enabled')::boolean, false) = true
      and nullif(trim(b.state->'sections'->'countdown'->>'target_date'), '') is not null
  ),
  due as (
    select
      a.event_id,
      a.slug,
      a.title,
      a.owner_email,
      a.anchor_type,
      a.anchor_label,
      (extract(year from p_day)::int - extract(year from a.anchor_date)::int) as years
    from anchors a
    where a.anchor_date is not null
      and a.anchor_date < p_day
      and extract(month from a.anchor_date) = extract(month from p_day)
      and extract(day from a.anchor_date) = extract(day from p_day)
      and (extract(year from p_day)::int - extract(year from a.anchor_date)::int) >= 1
  )
  select d.event_id, d.slug, d.title, d.owner_email, d.anchor_type, d.anchor_label, d.years
  from due d
  where not exists (
    select 1
    from public.moment_anniversary_log l
    where l.event_id = d.event_id
      and l.anchor_type = d.anchor_type
      and l.years = d.years
  );
end
$$;

revoke all on function public.due_moment_anniversaries(date, text) from public;
grant execute on function public.due_moment_anniversaries(date, text) to anon, authenticated;

create or replace function public.record_moment_anniversary_send(
  p_event_id uuid,
  p_anchor_type text,
  p_years integer,
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
  v_expected text := app_private.webhook_ingest_key();
begin
  if v_expected is null or v_key is distinct from v_expected then
    raise exception 'Chiave ingest non valida.';
  end if;

  insert into public.moment_anniversary_log (event_id, anchor_type, years, owner_email, resend_id)
  values (
    p_event_id,
    p_anchor_type,
    p_years,
    lower(nullif(trim(coalesce(p_owner_email, '')), '')),
    nullif(trim(coalesce(p_resend_id, '')), '')
  )
  on conflict (event_id, anchor_type, years) do update
  set sent_on = current_date,
      owner_email = excluded.owner_email,
      resend_id = coalesce(excluded.resend_id, public.moment_anniversary_log.resend_id);

  return jsonb_build_object('ok', true);
end
$$;

revoke all on function public.record_moment_anniversary_send(uuid, text, integer, text, text, text) from public;
grant execute on function public.record_moment_anniversary_send(uuid, text, integer, text, text, text) to anon, authenticated;

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
  v_expected text := app_private.webhook_ingest_key();
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
  v_expected text := app_private.webhook_ingest_key();
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

create or replace function public.cleanup_rate_limit_tables(p_ingest_key text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text := nullif(trim(coalesce(p_ingest_key, '')), '');
  v_expected text := app_private.webhook_ingest_key();
  v_pin_deleted integer;
  v_rate_deleted integer;
begin
  if v_expected is null or v_key is distinct from v_expected then
    raise exception 'Chiave ingest non valida.';
  end if;

  delete from public.moment_pin_attempts
  where window_start < now() - interval '1 day'
    and (locked_until is null or locked_until < now());
  get diagnostics v_pin_deleted = row_count;

  delete from public.platform_rate_limits
  where window_start < now() - interval '1 day'
    and (locked_until is null or locked_until < now());
  get diagnostics v_rate_deleted = row_count;

  return jsonb_build_object(
    'ok', true,
    'pin_attempts_deleted', v_pin_deleted,
    'rate_limits_deleted', v_rate_deleted
  );
end;
$$;

revoke all on function public.cleanup_rate_limit_tables(text) from public;
grant execute on function public.cleanup_rate_limit_tables(text) to anon, authenticated;
