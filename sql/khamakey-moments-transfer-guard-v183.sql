-- KhamaKey SQL v183
-- Un invio email fallito annulla solo il proprio invito.
-- Non deve cancellare un trasferimento più recente sulla stessa pagina.

create or replace function public.moment_ownership_transfer_is_current(
  p_event_id uuid,
  p_token text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_token text := lower(trim(coalesce(p_token, '')));
  v_owner text;
  v_hash text;
begin
  if v_email = '' or p_event_id is null or v_token !~ '^[a-f0-9]{32,128}$' then
    return false;
  end if;

  select lower(me.owner_email) into v_owner
  from public.moment_events me
  where me.id = p_event_id;

  if v_owner is null or v_owner is distinct from v_email then
    return false;
  end if;

  v_hash := app_private.moment_invite_token_hash(v_token);

  return exists (
    select 1
    from public.moment_ownership_transfers t
    where t.event_id = p_event_id
      and t.status = 'pending'
      and t.invite_token_hash = v_hash
      and (t.expires_at is null or t.expires_at > now())
  );
end;
$$;

revoke all on function public.moment_ownership_transfer_is_current(uuid, text) from public, anon;
grant execute on function public.moment_ownership_transfer_is_current(uuid, text) to authenticated;

create or replace function public.abandon_unsent_moment_ownership_transfer(
  p_event_id uuid,
  p_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_token text := lower(trim(coalesce(p_token, '')));
  v_owner text;
  v_hash text;
  v_updated integer := 0;
begin
  if v_email = '' then
    raise exception 'TRANSFER_AUTH';
  end if;
  if p_event_id is null or v_token !~ '^[a-f0-9]{32,128}$' then
    return jsonb_build_object('ok', true, 'status', 'kept');
  end if;

  select lower(me.owner_email) into v_owner
  from public.moment_events me
  where me.id = p_event_id
  for update;

  if v_owner is null or v_owner is distinct from v_email then
    raise exception 'TRANSFER_OWNER_ONLY';
  end if;

  v_hash := app_private.moment_invite_token_hash(v_token);

  update public.moment_ownership_transfers
  set
    status = 'cancelled',
    invite_token_hash = null,
    cancelled_at = now(),
    updated_at = now()
  where event_id = p_event_id
    and status = 'pending'
    and invite_token_hash = v_hash;

  get diagnostics v_updated = row_count;
  if v_updated < 1 then
    return jsonb_build_object('ok', true, 'status', 'kept');
  end if;

  return jsonb_build_object('ok', true, 'status', 'cancelled');
end;
$$;

revoke all on function public.abandon_unsent_moment_ownership_transfer(uuid, text) from public, anon;
grant execute on function public.abandon_unsent_moment_ownership_transfer(uuid, text) to authenticated;
