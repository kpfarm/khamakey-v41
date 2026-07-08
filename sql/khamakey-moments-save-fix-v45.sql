-- KhamaKey v45 - fix save Moments: "column reference slug is ambiguous"
-- Causa: RETURNS TABLE (..., slug) confligge con ON CONFLICT (slug) in PL/pgSQL.

drop function if exists public.save_my_moment_page(uuid,text,text,text,jsonb,boolean,boolean,text);
drop function if exists public.admin_save_moment_page(uuid,text,text,text,jsonb,boolean,boolean,text);

create or replace function public.save_my_moment_page(
  p_event_id uuid,
  p_title text,
  p_moment_type text,
  p_description text,
  p_page_state jsonb,
  p_public_visible boolean,
  p_pin_enabled boolean,
  p_pin_hash text default null
)
returns table (
  result_event_id uuid,
  result_slug text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(auth.jwt() ->> 'email');
  v_event public.moment_events%rowtype;
  v_type text := coalesce(nullif(p_moment_type,''), 'free');
begin
  if v_email is null or v_email = '' then
    raise exception 'Accesso richiesto.';
  end if;
  select * into v_event
  from public.moment_events
  where id = p_event_id
    and lower(owner_email) = v_email;
  if not found then
    raise exception 'Oggetto Moments non trovato per questo account.';
  end if;
  if v_type not in ('free','wedding','party','travel','memory','memorial','portfolio') then
    v_type := 'free';
  end if;

  update public.moment_events
  set title = coalesce(nullif(trim(coalesce(p_title,'')), ''), title),
      moment_type = v_type,
      event_type = v_type,
      description = coalesce(p_description, ''),
      page_state = coalesce(p_page_state, '{}'::jsonb),
      public_visible = coalesce(p_public_visible, false),
      pin_enabled = coalesce(p_pin_enabled, true),
      pin_hash = coalesce(nullif(p_pin_hash,''), pin_hash),
      updated_at = now()
  where id = p_event_id;

  insert into public.moment_pages (event_id, slug, state, published, pin_enabled, pin_hash)
  values (
    p_event_id,
    v_event.slug,
    coalesce(p_page_state, '{}'::jsonb),
    coalesce(p_public_visible, false),
    coalesce(p_pin_enabled, true),
    nullif(p_pin_hash,'')
  )
  on conflict on constraint moment_pages_slug_key do update
  set state = excluded.state,
      published = excluded.published,
      pin_enabled = excluded.pin_enabled,
      pin_hash = coalesce(excluded.pin_hash, public.moment_pages.pin_hash),
      updated_at = now();

  return query select p_event_id, v_event.slug;
end
$$;

create or replace function public.admin_save_moment_page(
  p_event_id uuid,
  p_title text,
  p_moment_type text,
  p_description text,
  p_page_state jsonb,
  p_public_visible boolean,
  p_pin_enabled boolean,
  p_pin_hash text default null
)
returns table (
  result_event_id uuid,
  result_slug text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.moment_events%rowtype;
  v_type text := coalesce(nullif(p_moment_type,''), 'free');
begin
  if not (
    app_private.current_user_has_platform_permission('moments.write')
    or app_private.current_user_has_platform_permission('admin.full')
  ) then
    raise exception 'Permesso moments.write richiesto.';
  end if;

  select * into v_event
  from public.moment_events
  where id = p_event_id;
  if not found then
    raise exception 'Oggetto Moments non trovato.';
  end if;
  if v_type not in ('free','wedding','party','travel','memory','memorial','portfolio') then
    v_type := 'free';
  end if;

  update public.moment_events
  set title = coalesce(nullif(trim(coalesce(p_title,'')), ''), title),
      moment_type = v_type,
      event_type = v_type,
      description = coalesce(p_description, ''),
      page_state = coalesce(p_page_state, '{}'::jsonb),
      public_visible = coalesce(p_public_visible, false),
      pin_enabled = coalesce(p_pin_enabled, true),
      pin_hash = coalesce(nullif(p_pin_hash,''), pin_hash),
      updated_at = now()
  where id = p_event_id;

  insert into public.moment_pages (event_id, slug, state, published, pin_enabled, pin_hash)
  values (
    p_event_id,
    v_event.slug,
    coalesce(p_page_state, '{}'::jsonb),
    coalesce(p_public_visible, false),
    coalesce(p_pin_enabled, true),
    nullif(p_pin_hash,'')
  )
  on conflict on constraint moment_pages_slug_key do update
  set state = excluded.state,
      published = excluded.published,
      pin_enabled = excluded.pin_enabled,
      pin_hash = coalesce(excluded.pin_hash, public.moment_pages.pin_hash),
      updated_at = now();

  return query select p_event_id, v_event.slug;
end
$$;

revoke all on function public.save_my_moment_page(uuid,text,text,text,jsonb,boolean,boolean,text) from public;
revoke all on function public.save_my_moment_page(uuid,text,text,text,jsonb,boolean,boolean,text) from anon;
grant execute on function public.save_my_moment_page(uuid,text,text,text,jsonb,boolean,boolean,text) to authenticated;

revoke all on function public.admin_save_moment_page(uuid,text,text,text,jsonb,boolean,boolean,text) from public;
revoke all on function public.admin_save_moment_page(uuid,text,text,text,jsonb,boolean,boolean,text) from anon;
grant execute on function public.admin_save_moment_page(uuid,text,text,text,jsonb,boolean,boolean,text) to authenticated;
