-- KhamaKey v75 — Hardening di sicurezza (audit luglio 2026)
-- Applica dopo v74 su Supabase. Idempotente: può essere rieseguito senza effetti collaterali.
--
-- Corregge tre criticità emerse dall'audit:
-- 1) get_public_moment restituiva SEMPRE il contenuto (state, titolo, indirizzo...) anche con
--    PIN errato o assente: il PIN era solo un flag informativo per il client, non una barriera
--    reale. Ora il contenuto viene restituito solo se il PIN è valido (o non richiesto).
-- 2) Nessun limite ai tentativi di PIN: un PIN a 4 cifre è bruteforzabile in poche migliaia di
--    richieste. Aggiunto lockout per slug + visitatore (20 tentativi falliti / 15 minuti),
--    evitando che un invitato malizioso blocchi la pagina a tutti gli altri.
-- 3) platform_webhook_events non aveva RLS; business_page_i18n_public_select esponeva le
--    traduzioni di TUTTE le aziende (anche con i18n disattivato) a chiunque con la anon key.

-- ---------------------------------------------------------------------------
-- 1+2) Rate limit tentativi PIN Moments
-- ---------------------------------------------------------------------------
create table if not exists public.moment_pin_attempts (
  slug text not null references public.moment_pages(slug) on delete cascade,
  visitor_key text not null default 'global',
  attempt_count integer not null default 0,
  window_start timestamptz not null default now(),
  locked_until timestamptz,
  primary key (slug, visitor_key)
);

alter table public.moment_pin_attempts
  add column if not exists visitor_key text not null default 'global';

alter table public.moment_pin_attempts
  drop constraint if exists moment_pin_attempts_pkey;

alter table public.moment_pin_attempts
  add constraint moment_pin_attempts_pkey primary key (slug, visitor_key);

alter table public.moment_pin_attempts enable row level security;
-- Nessuna policy per anon/authenticated: accesso solo tramite la funzione SECURITY DEFINER sotto.

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
      -- sotto lockout: non rivalutare il pin, non incrementare oltre
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
  select *
  from public.get_public_moment(p_slug, p_pin_hash, 'global');
$$;

revoke all on function public.get_public_moment(text,text) from public;
revoke all on function public.get_public_moment(text,text,text) from public;
grant execute on function public.get_public_moment(text,text) to anon, authenticated;
grant execute on function public.get_public_moment(text,text,text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3a) RLS su platform_webhook_events (log piattaforma, non multi-tenant: solo admin)
-- ---------------------------------------------------------------------------
alter table public.platform_webhook_events enable row level security;

drop policy if exists platform_webhook_events_admin_select on public.platform_webhook_events;
create policy platform_webhook_events_admin_select on public.platform_webhook_events
for select to authenticated
using (
  app_private.current_user_has_platform_permission('orders.read')
  or app_private.current_user_has_platform_permission('orders.write')
  or app_private.current_user_has_platform_permission('settings.manage')
  or app_private.current_user_has_platform_permission('admin.full')
);

-- ---------------------------------------------------------------------------
-- 3b) business_page_i18n: lettura pubblica solo per aziende con i18n abilitato
-- ---------------------------------------------------------------------------
drop policy if exists business_page_i18n_public_select on public.business_page_i18n;
create policy business_page_i18n_public_select on public.business_page_i18n
for select to anon
using (
  exists (
    select 1 from public.business_i18n_settings s
    where s.business_id = business_page_i18n.business_id
      and s.enabled = true
  )
);
