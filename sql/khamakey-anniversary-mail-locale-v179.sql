-- v179 — Mail anniversario: lingua da Auth user_metadata.ui_locale (stessa regola delle mail di conferma)
-- DROP perché cambia il RETURNS TABLE. Logica scadenze invariata.
-- Non tocca editor, NFC, Salva, upload, valore della chiave.

drop function if exists public.due_moment_anniversaries(date, text);

create function public.due_moment_anniversaries(
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
  years integer,
  cover_url text,
  subtitle text,
  anchor_date date,
  owner_ui_locale text
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
      mp.state,
      nullif(trim(mp.state->>'cover_url'), '') as cover_url,
      nullif(trim(mp.state->>'subtitle'), '') as subtitle
    from public.moment_events me
    join public.moment_pages mp on mp.event_id = me.id
    where me.status = 'active'
      and mp.published = true
      and me.owner_email is not null
      and coalesce((mp.state->>'anniversary_emails')::boolean, true) = true
  ),
  anchors as (
    select b.event_id, b.slug, b.title, b.owner_email, b.cover_url, b.subtitle,
      'event_date'::text as anchor_type,
      'Data dell''evento'::text as anchor_label,
      me.event_date::date as anchor_date
    from base b
    join public.moment_events me on me.id = b.event_id
    where me.event_date is not null

    union all

    select b.event_id, b.slug, b.title, b.owner_email, b.cover_url, b.subtitle,
      'together_since'::text,
      'Insieme da'::text,
      nullif(trim(b.state->>'together_since'), '')::date
    from base b
    where coalesce((b.state->>'show_together_counter')::boolean, false) = true
      and nullif(trim(b.state->>'together_since'), '') is not null

    union all

    select b.event_id, b.slug, b.title, b.owner_email, b.cover_url, b.subtitle,
      'countdown'::text,
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
      (extract(year from p_day)::int - extract(year from a.anchor_date)::int) as years,
      a.cover_url,
      a.subtitle,
      a.anchor_date
    from anchors a
    where a.anchor_date is not null
      and a.anchor_date < p_day
      and extract(month from a.anchor_date) = extract(month from p_day)
      and extract(day from a.anchor_date) = extract(day from p_day)
      and (extract(year from p_day)::int - extract(year from a.anchor_date)::int) >= 1
  )
  select
    d.event_id,
    d.slug,
    d.title,
    d.owner_email,
    d.anchor_type,
    d.anchor_label,
    d.years,
    d.cover_url,
    d.subtitle,
    d.anchor_date,
    case
      when lower(coalesce(u.raw_user_meta_data->>'ui_locale', '')) = 'en' then 'en'
      else 'it'
    end as owner_ui_locale
  from due d
  left join auth.users u on lower(u.email) = d.owner_email
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
