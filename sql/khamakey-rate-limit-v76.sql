-- KhamaKey v76 — Rate limiting generico per endpoint pubblici/costosi (audit luglio 2026)
-- Applica dopo v75 su Supabase. Idempotente.
--
-- Riusa in Postgres lo stesso pattern già introdotto per moment_pin_attempts (v75), invece di
-- aggiungere infrastruttura nuova (KV/Durable Objects): zero costo aggiuntivo, un solo round-trip
-- in più verso un database già interrogato ad ogni richiesta pubblica.
--
-- check_rate_limit(p_key, p_max_attempts, p_window_minutes, p_lock_minutes) restituisce:
--   true  -> richiesta permessa (contatore incrementato)
--   false -> limite superato, richiesta da rifiutare (es. HTTP 429)

create table if not exists public.platform_rate_limits (
  bucket_key text primary key,
  attempt_count integer not null default 0,
  window_start timestamptz not null default now(),
  locked_until timestamptz
);

alter table public.platform_rate_limits enable row level security;
-- Nessuna policy per anon/authenticated: accesso solo tramite la funzione SECURITY DEFINER sotto.

create or replace function public.check_rate_limit(
  p_key text,
  p_max_attempts integer,
  p_window_minutes integer,
  p_lock_minutes integer default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.platform_rate_limits%rowtype;
  v_lock_minutes integer := coalesce(p_lock_minutes, p_window_minutes);
begin
  insert into public.platform_rate_limits (bucket_key)
  values (p_key)
  on conflict (bucket_key) do nothing;

  select * into v_row
  from public.platform_rate_limits
  where bucket_key = p_key
  for update;

  if v_row.locked_until is not null and v_row.locked_until > now() then
    return false;
  end if;

  if now() - v_row.window_start > (p_window_minutes || ' minutes')::interval then
    update public.platform_rate_limits
    set attempt_count = 1, window_start = now(), locked_until = null
    where bucket_key = p_key;
    return true;
  end if;

  if v_row.attempt_count + 1 > p_max_attempts then
    update public.platform_rate_limits
    set locked_until = now() + (v_lock_minutes || ' minutes')::interval
    where bucket_key = p_key;
    return false;
  end if;

  update public.platform_rate_limits
  set attempt_count = attempt_count + 1
  where bucket_key = p_key;
  return true;
end;
$$;

revoke all on function public.check_rate_limit(text,integer,integer,integer) from public;
grant execute on function public.check_rate_limit(text,integer,integer,integer) to anon, authenticated;

-- Pulizia periodica facoltativa (righe scadute da oltre un giorno): decommenta se vuoi un cron dedicato.
-- delete from public.platform_rate_limits where window_start < now() - interval '1 day' and (locked_until is null or locked_until < now());
