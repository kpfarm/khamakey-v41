-- KhamaKey SQL v182
-- Il titolare può chiedere il passaggio di un solo Moment.
-- La pagina cambia proprietario solo quando il destinatario accetta.
-- Slug, chip NFC, codice già consumato, contenuti e file restano dov'erano.
-- I collaboratori già accettati restano. Il destinatario, se era invitato, esce da quel ruolo.

create table if not exists public.moment_ownership_transfers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.moment_events(id) on delete cascade,
  from_email text not null,
  to_email text not null,
  status text not null default 'pending',
  invite_token_hash text,
  expires_at timestamptz,
  requested_at timestamptz not null default now(),
  accepted_at timestamptz,
  declined_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint moment_ownership_transfers_from_lower check (from_email = lower(from_email)),
  constraint moment_ownership_transfers_to_lower check (to_email = lower(to_email)),
  constraint moment_ownership_transfers_not_self check (from_email <> to_email),
  constraint moment_ownership_transfers_status_chk check (status in ('pending', 'accepted', 'declined', 'cancelled'))
);

create unique index if not exists moment_ownership_transfers_one_pending_idx
  on public.moment_ownership_transfers (event_id)
  where status = 'pending';

create unique index if not exists moment_ownership_transfers_token_hash_idx
  on public.moment_ownership_transfers (invite_token_hash)
  where invite_token_hash is not null;

create index if not exists moment_ownership_transfers_event_idx
  on public.moment_ownership_transfers (event_id, requested_at desc);

alter table public.moment_ownership_transfers enable row level security;

revoke all on table public.moment_ownership_transfers from public, anon, authenticated;

comment on table public.moment_ownership_transfers is
  'Passaggio di proprietà di un Moment. Il token in chiaro non viene salvato. Nessun accesso diretto dal client.';

create or replace function public.request_moment_ownership_transfer(
  p_event_id uuid,
  p_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_to text := lower(trim(coalesce(p_email, '')));
  v_owner text;
  v_title text;
  v_token text;
  v_hash text;
  v_expires timestamptz := now() + interval '14 days';
begin
  if v_email = '' then
    raise exception 'TRANSFER_AUTH';
  end if;
  if p_event_id is null then
    raise exception 'TRANSFER_NOT_FOUND';
  end if;
  if v_to = '' or v_to !~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$' then
    raise exception 'TRANSFER_EMAIL';
  end if;

  select lower(me.owner_email), me.title
    into v_owner, v_title
  from public.moment_events me
  where me.id = p_event_id
  for update;

  if v_owner is null then
    raise exception 'TRANSFER_NOT_FOUND';
  end if;
  if v_owner is distinct from v_email then
    raise exception 'TRANSFER_OWNER_ONLY';
  end if;
  if v_to = v_owner then
    raise exception 'TRANSFER_SELF';
  end if;

  update public.moment_ownership_transfers
  set
    status = 'cancelled',
    invite_token_hash = null,
    cancelled_at = now(),
    updated_at = now()
  where event_id = p_event_id
    and status = 'pending';

  v_token := encode(extensions.gen_random_bytes(24), 'hex');
  v_hash := app_private.moment_invite_token_hash(v_token);

  insert into public.moment_ownership_transfers (
    event_id, from_email, to_email, status, invite_token_hash, expires_at, updated_at
  ) values (
    p_event_id, v_email, v_to, 'pending', v_hash, v_expires, now()
  );

  return jsonb_build_object(
    'ok', true,
    'event_id', p_event_id,
    'email', v_to,
    'status', 'pending',
    'expires_at', v_expires,
    'page_title', coalesce(v_title, ''),
    'from_email', v_email,
    'invite_token', v_token
  );
end;
$$;

revoke all on function public.request_moment_ownership_transfer(uuid, text) from public, anon;
grant execute on function public.request_moment_ownership_transfer(uuid, text) to authenticated;

create or replace function public.cancel_moment_ownership_transfer(p_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_owner text;
  v_updated integer := 0;
begin
  if v_email = '' then
    raise exception 'TRANSFER_AUTH';
  end if;
  if p_event_id is null then
    raise exception 'TRANSFER_NOT_FOUND';
  end if;

  select lower(me.owner_email) into v_owner
  from public.moment_events me
  where me.id = p_event_id
  for update;

  if v_owner is null then
    raise exception 'TRANSFER_NOT_FOUND';
  end if;
  if v_owner is distinct from v_email then
    raise exception 'TRANSFER_OWNER_ONLY';
  end if;

  update public.moment_ownership_transfers
  set
    status = 'cancelled',
    invite_token_hash = null,
    cancelled_at = now(),
    updated_at = now()
  where event_id = p_event_id
    and status = 'pending';

  get diagnostics v_updated = row_count;
  if v_updated < 1 then
    raise exception 'TRANSFER_NONE';
  end if;

  return jsonb_build_object('ok', true, 'status', 'cancelled');
end;
$$;

revoke all on function public.cancel_moment_ownership_transfer(uuid) from public, anon;
grant execute on function public.cancel_moment_ownership_transfer(uuid) to authenticated;

create or replace function public.get_moment_ownership_transfer(p_event_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_owner text;
  v_row public.moment_ownership_transfers%rowtype;
  v_status text;
begin
  if v_email = '' then
    raise exception 'TRANSFER_AUTH';
  end if;

  select lower(me.owner_email) into v_owner
  from public.moment_events me
  where me.id = p_event_id;

  if v_owner is null or v_owner is distinct from v_email then
    raise exception 'TRANSFER_OWNER_ONLY';
  end if;

  select * into v_row
  from public.moment_ownership_transfers t
  where t.event_id = p_event_id
    and t.from_email = v_email
  order by t.requested_at desc
  limit 1;

  if not found then
    return jsonb_build_object('ok', true, 'status', 'none');
  end if;

  v_status := v_row.status;
  if v_status = 'pending' and v_row.expires_at is not null and v_row.expires_at <= now() then
    v_status := 'expired';
  end if;

  return jsonb_build_object(
    'ok', true,
    'status', v_status,
    'email', v_row.to_email,
    'expires_at', v_row.expires_at,
    'requested_at', v_row.requested_at
  );
end;
$$;

revoke all on function public.get_moment_ownership_transfer(uuid) from public, anon;
grant execute on function public.get_moment_ownership_transfer(uuid) to authenticated;

create or replace function public.peek_moment_ownership_transfer(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_token text := lower(trim(coalesce(p_token, '')));
  v_hash text;
  v_row public.moment_ownership_transfers%rowtype;
  v_title text;
  v_status text;
begin
  if v_token !~ '^[a-f0-9]{32,128}$' then
    return jsonb_build_object('ok', false, 'status', 'invalid');
  end if;

  v_hash := app_private.moment_invite_token_hash(v_token);

  select * into v_row
  from public.moment_ownership_transfers t
  where t.invite_token_hash = v_hash
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'status', 'invalid');
  end if;

  select me.title into v_title
  from public.moment_events me
  where me.id = v_row.event_id;

  v_status := v_row.status;
  if v_status = 'pending' and v_row.expires_at is not null and v_row.expires_at <= now() then
    v_status := 'expired';
  end if;

  return jsonb_build_object(
    'ok', v_status = 'pending',
    'status', v_status,
    'page_title', coalesce(v_title, ''),
    'to_email', v_row.to_email,
    'from_email', v_row.from_email,
    'expires_at', v_row.expires_at
  );
end;
$$;

revoke all on function public.peek_moment_ownership_transfer(text) from public;
grant execute on function public.peek_moment_ownership_transfer(text) to anon, authenticated;

create or replace function public.decline_moment_ownership_transfer(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_token text := lower(trim(coalesce(p_token, '')));
  v_hash text;
  v_row public.moment_ownership_transfers%rowtype;
begin
  if v_email = '' or auth.uid() is null then
    raise exception 'TRANSFER_AUTH';
  end if;
  if v_token !~ '^[a-f0-9]{32,128}$' then
    return jsonb_build_object('ok', false, 'status', 'invalid');
  end if;

  v_hash := app_private.moment_invite_token_hash(v_token);

  select * into v_row
  from public.moment_ownership_transfers t
  where t.invite_token_hash = v_hash
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'status', 'invalid');
  end if;
  if v_row.to_email is distinct from v_email then
    return jsonb_build_object('ok', false, 'status', 'mismatch', 'to_email', v_row.to_email);
  end if;
  if v_row.status is distinct from 'pending' then
    return jsonb_build_object('ok', false, 'status', v_row.status);
  end if;
  if v_row.expires_at is not null and v_row.expires_at <= now() then
    return jsonb_build_object('ok', false, 'status', 'expired');
  end if;

  update public.moment_ownership_transfers
  set
    status = 'declined',
    invite_token_hash = null,
    declined_at = now(),
    updated_at = now()
  where id = v_row.id
    and status = 'pending';

  return jsonb_build_object('ok', true, 'status', 'declined');
end;
$$;

revoke all on function public.decline_moment_ownership_transfer(text) from public, anon;
grant execute on function public.decline_moment_ownership_transfer(text) to authenticated;

create or replace function public.accept_moment_ownership_transfer(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_uid uuid := auth.uid();
  v_token text := lower(trim(coalesce(p_token, '')));
  v_hash text;
  v_row public.moment_ownership_transfers%rowtype;
  v_event public.moment_events%rowtype;
  v_event_id uuid;
  v_account uuid;
  v_moved integer := 0;
begin
  if v_email = '' or v_uid is null then
    raise exception 'TRANSFER_AUTH';
  end if;
  if v_token !~ '^[a-f0-9]{32,128}$' then
    return jsonb_build_object('ok', false, 'status', 'invalid');
  end if;

  v_hash := app_private.moment_invite_token_hash(v_token);

  select t.event_id into v_event_id
  from public.moment_ownership_transfers t
  where t.invite_token_hash = v_hash;

  if v_event_id is null then
    return jsonb_build_object('ok', false, 'status', 'invalid');
  end if;

  select * into v_event
  from public.moment_events me
  where me.id = v_event_id
  for update;

  select * into v_row
  from public.moment_ownership_transfers t
  where t.invite_token_hash = v_hash
    and t.event_id = v_event_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'status', 'invalid');
  end if;
  if v_row.to_email is distinct from v_email then
    return jsonb_build_object('ok', false, 'status', 'mismatch', 'to_email', v_row.to_email);
  end if;
  if v_row.status is distinct from 'pending' then
    return jsonb_build_object('ok', false, 'status', v_row.status);
  end if;
  if v_row.expires_at is not null and v_row.expires_at <= now() then
    return jsonb_build_object('ok', false, 'status', 'expired');
  end if;

  if v_event.id is null or lower(coalesce(v_event.owner_email, '')) is distinct from v_row.from_email then
    update public.moment_ownership_transfers
    set
      status = 'cancelled',
      invite_token_hash = null,
      cancelled_at = now(),
      updated_at = now()
    where id = v_row.id
      and status = 'pending';
    return jsonb_build_object('ok', false, 'status', 'cancelled');
  end if;

  insert into public.moment_accounts (email, display_name)
  values (v_email, v_email)
  on conflict (email) do update
  set updated_at = now()
  returning id into v_account;

  update public.moment_events
  set
    owner_email = v_email,
    account_id = v_account,
    updated_at = now()
  where id = v_event.id
    and lower(coalesce(owner_email, '')) = v_row.from_email;

  get diagnostics v_moved = row_count;
  if v_moved <> 1 then
    raise exception 'TRANSFER_CONFLICT';
  end if;

  update public.moment_page_members
  set
    status = 'revoked',
    invite_token_hash = null,
    revoked_at = now(),
    updated_at = now()
  where event_id = v_event.id
    and email = v_email
    and status in ('pending', 'accepted');

  update public.moment_ownership_transfers
  set
    status = 'accepted',
    invite_token_hash = null,
    accepted_at = now(),
    updated_at = now()
  where id = v_row.id
    and status = 'pending';

  return jsonb_build_object(
    'ok', true,
    'status', 'accepted',
    'event_id', v_event.id,
    'title', coalesce(v_event.title, ''),
    'slug', coalesce(v_event.slug, '')
  );
end;
$$;

revoke all on function public.accept_moment_ownership_transfer(text) from public, anon;
grant execute on function public.accept_moment_ownership_transfer(text) to authenticated;
