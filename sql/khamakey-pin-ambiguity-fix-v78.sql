-- KhamaKey v78 — Fix urgente: get_public_moment falliva con errore 42702
-- "column reference slug is ambiguous" su ogni evento Moments con PIN attivo.
-- Applicato in produzione il 2026-07-11 dopo che uno smoke test su un evento reale
-- (pin_enabled=true) ha mostrato HTTP 500 su /m/<slug>, RSVP e guestbook.
--
-- Causa: get_public_moment (v75) è una funzione plpgsql con RETURNS TABLE(..., slug
-- text, ...). Postgres dichiara implicitamente "slug" come variabile locale con lo
-- stesso nome della colonna di ritorno. Le query interne su moment_pin_attempts
-- (che ha anch'essa una colonna slug) diventavano ambigue: non sapevano se "slug"
-- si riferisse alla variabile di output o alla colonna di tabella.
--
-- Fix: #variable_conflict use_column come prima riga del corpo funzione, forza
-- Postgres a preferire sempre la colonna di tabella. Nessun'altra modifica alla
-- logica rispetto a v75.

create or replace function public.get_public_moment(
  p_slug text,
  p_pin_hash text,
  p_visitor_key text
)
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
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_pin_enabled boolean;
  v_pin_hash text;
  v_required boolean;
  v_ok boolean;
  v_attempt public.moment_pin_attempts%rowtype;
  v_visitor_key text := left(coalesce(nullif(trim(p_visitor_key), ''), 'global'), 160);
begin
  select mp.pin_enabled, mp.pin_hash
    into v_pin_enabled, v_pin_hash
  from public.moment_pages mp
  where mp.slug = p_slug
    and mp.published = true;

  v_required := coalesce(v_pin_enabled, false) and v_pin_hash is not null and v_pin_hash <> '';

  if not v_required then
    v_ok := true;
  else
    insert into public.moment_pin_attempts (slug, visitor_key)
    values (p_slug, v_visitor_key)
    on conflict (slug, visitor_key) do nothing;

    select * into v_attempt
    from public.moment_pin_attempts
    where slug = p_slug
      and visitor_key = v_visitor_key
    for update;

    if v_attempt.locked_until is not null and v_attempt.locked_until > now() then
      v_ok := false;
    elsif v_pin_hash = p_pin_hash then
      v_ok := true;
      update public.moment_pin_attempts
      set attempt_count = 0, window_start = now(), locked_until = null
      where slug = p_slug
        and visitor_key = v_visitor_key;
    else
      v_ok := false;
      if now() - v_attempt.window_start > interval '15 minutes' then
        update public.moment_pin_attempts
        set attempt_count = 1, window_start = now(), locked_until = null
        where slug = p_slug
          and visitor_key = v_visitor_key;
      else
        update public.moment_pin_attempts
        set attempt_count = attempt_count + 1,
            locked_until = case
              when attempt_count + 1 >= 20 then now() + interval '15 minutes'
              else locked_until
            end
        where slug = p_slug
          and visitor_key = v_visitor_key;
      end if;
    end if;
  end if;

  return query
  select
    me.id,
    case when v_ok then me.title else null end,
    mp.slug,
    case when v_ok then me.event_type else null end,
    me.status,
    case when v_ok then me.event_date else null end,
    case when v_ok then me.venue_name else null end,
    case when v_ok then me.venue_address else null end,
    case when v_ok then me.description else null end,
    case when v_ok then mp.state else null end,
    v_pin_enabled,
    v_required,
    v_ok
  from public.moment_pages mp
  join public.moment_events me on me.id = mp.event_id
  where mp.slug = p_slug
    and mp.published = true
    and me.status = 'active'
  limit 1;
end;
$$;
