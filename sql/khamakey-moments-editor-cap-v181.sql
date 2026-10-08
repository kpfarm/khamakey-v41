-- KhamaKey SQL v181
-- Il titolare può invitare fino a 4 persone sulla stessa pagina.
-- Chi è già invitato resta. L'invitato non invita altri e non cancella la pagina.
-- NFC, Salva, upload e RLS invariati.

create or replace function public.moment_page_editor_cap()
returns integer
language sql
immutable
as $$
  select 4;
$$;

comment on function public.moment_page_editor_cap() is
  'Max invitati accepted+pending non scaduti per pagina, oltre il titolare. v181: 4.';

revoke all on function public.moment_page_editor_cap() from public, anon;
grant execute on function public.moment_page_editor_cap() to authenticated;

create or replace function public.invite_moment_page_editor(
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
  v_invitee text := lower(trim(coalesce(p_email, '')));
  v_owner text;
  v_title text;
  v_existing public.moment_page_members%rowtype;
  v_active integer := 0;
  v_cap integer := public.moment_page_editor_cap();
  v_token text;
  v_hash text;
  v_expires timestamptz := now() + interval '14 days';
begin
  if v_email = '' then
    raise exception 'Accesso richiesto.';
  end if;
  if p_event_id is null then
    raise exception 'Pagina obbligatoria.';
  end if;
  if v_invitee = '' or v_invitee !~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$' then
    raise exception 'Email non valida.';
  end if;

  select lower(me.owner_email), me.title
    into v_owner, v_title
  from public.moment_events me
  where me.id = p_event_id;

  if v_owner is null then
    raise exception 'Pagina non trovata.';
  end if;
  if v_owner is distinct from v_email then
    raise exception 'Solo chi ha attivato la pagina può invitare.';
  end if;
  if v_invitee = v_owner then
    raise exception 'Non puoi invitare te stesso.';
  end if;

  select * into v_existing
  from public.moment_page_members m
  where m.event_id = p_event_id
    and m.email = v_invitee;

  if found and v_existing.status = 'accepted' then
    raise exception 'Questa persona può già modificare la pagina.';
  end if;

  select count(*)::integer into v_active
  from public.moment_page_members m
  where m.event_id = p_event_id
    and m.email is distinct from v_invitee
    and (
      m.status = 'accepted'
      or (m.status = 'pending' and m.expires_at > now())
    );

  if coalesce(v_active, 0) >= v_cap then
    raise exception 'Puoi invitare al massimo % persone su questa pagina.', v_cap;
  end if;

  v_token := encode(extensions.gen_random_bytes(24), 'hex');
  v_hash := app_private.moment_invite_token_hash(v_token);

  insert into public.moment_page_members (
    event_id, email, role, status, invite_token_hash,
    invited_by_email, invited_at, expires_at, updated_at,
    user_id, accepted_at, revoked_at
  ) values (
    p_event_id, v_invitee, 'editor', 'pending', v_hash,
    v_email, now(), v_expires, now(),
    null, null, null
  )
  on conflict (event_id, email) do update
  set
    role = 'editor',
    status = 'pending',
    invite_token_hash = excluded.invite_token_hash,
    invited_by_email = excluded.invited_by_email,
    invited_at = now(),
    expires_at = excluded.expires_at,
    accepted_at = null,
    revoked_at = null,
    user_id = null,
    updated_at = now();

  return jsonb_build_object(
    'ok', true,
    'event_id', p_event_id,
    'email', v_invitee,
    'status', 'pending',
    'expires_at', v_expires,
    'page_title', coalesce(v_title, ''),
    'invited_by_email', v_email,
    'invite_token', v_token
  );
end;
$$;

revoke all on function public.invite_moment_page_editor(uuid, text) from public, anon;
grant execute on function public.invite_moment_page_editor(uuid, text) to authenticated;
