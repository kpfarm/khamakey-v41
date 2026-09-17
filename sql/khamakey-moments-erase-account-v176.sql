-- KhamaKey v176 — Export e cancellazione account Moments (diritti GDPR).
-- Solo auth.uid() + email JWT. Non tocca pagine di altri titolari.
-- Codici NFC già claimed restano claimed (niente riciclo). Staff/admin non possono auto-cancellarsi.
-- Fail-safe: NFC, Salva, upload, renderer pubblico non cambiano.

create or replace function public.export_my_moment_account()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_created timestamptz;
  v_name text;
begin
  if v_uid is null or v_email = '' then
    raise exception 'MOMENT_ERASE_AUTH';
  end if;

  select u.created_at,
         nullif(trim(coalesce(u.raw_user_meta_data ->> 'full_name', '')), '')
    into v_created, v_name
  from auth.users u
  where u.id = v_uid;

  return jsonb_build_object(
    'exported_at', now(),
    'product', 'KhamaKey Moments',
    'account', jsonb_build_object(
      'email', v_email,
      'name', v_name,
      'created_at', v_created
    ),
    'consents', coalesce((
      select jsonb_agg(jsonb_build_object(
        'consent_type', c.consent_type,
        'granted', c.granted,
        'source', c.source,
        'policy_version', c.policy_version,
        'created_at', c.created_at
      ) order by c.created_at)
      from public.moment_user_consents c
      where c.user_id = v_uid
    ), '[]'::jsonb),
    'pages_owned', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', me.id,
        'title', me.title,
        'slug', me.slug,
        'nfc_code', me.nfc_code,
        'public_visible', me.public_visible,
        'created_at', me.created_at,
        'updated_at', me.updated_at,
        'page_state', me.page_state
      ) order by me.created_at)
      from public.moment_events me
      where lower(coalesce(me.owner_email, '')) = v_email
    ), '[]'::jsonb),
    'pages_invited', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', me.id,
        'title', me.title,
        'slug', me.slug,
        'role', 'editor'
      ) order by me.created_at)
      from public.moment_events me
      join public.moment_page_members m on m.event_id = me.id
      where m.status = 'accepted'
        and lower(m.email) = v_email
        and lower(coalesce(me.owner_email, '')) is distinct from v_email
    ), '[]'::jsonb),
    'activation_codes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'code', ac.code,
        'status', ac.status,
        'claimed_at', ac.claimed_at
      ) order by ac.claimed_at)
      from public.moment_activation_codes ac
      where lower(coalesce(ac.claimed_by_email, '')) = v_email
    ), '[]'::jsonb),
    'rsvp', coalesce((
      select jsonb_agg(to_jsonb(r) order by r.created_at)
      from public.moment_rsvp_responses r
      where r.event_id in (
        select me.id from public.moment_events me
        where lower(coalesce(me.owner_email, '')) = v_email
      )
    ), '[]'::jsonb),
    'guestbook', coalesce((
      select jsonb_agg(to_jsonb(g) order by g.created_at)
      from public.moment_guestbook_messages g
      where g.event_id in (
        select me.id from public.moment_events me
        where lower(coalesce(me.owner_email, '')) = v_email
      )
    ), '[]'::jsonb)
  );
end;
$$;

comment on function public.export_my_moment_account() is
  'Copia JSON dei dati Moments dell''utente autenticato. Nessun pin_hash. Pagine altrui: solo elenco ruolo editor.';

revoke all on function public.export_my_moment_account() from public, anon;
grant execute on function public.export_my_moment_account() to authenticated;

create or replace function public.erase_my_moment_account(p_confirm_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_confirm text := lower(trim(coalesce(p_confirm_email, '')));
  v_pages int := 0;
  v_members int := 0;
begin
  if v_uid is null or v_email = '' then
    raise exception 'MOMENT_ERASE_AUTH';
  end if;
  if v_confirm = '' or v_confirm is distinct from v_email then
    raise exception 'MOMENT_ERASE_EMAIL';
  end if;
  if app_private.current_user_has_platform_permission('admin.full')
     or app_private.current_user_has_platform_permission('moments.write') then
    raise exception 'MOMENT_ERASE_STAFF';
  end if;
  if exists (select 1 from public.businesses b where b.profile_id = v_uid) then
    raise exception 'MOMENT_ERASE_BUSINESS';
  end if;

  delete from public.moment_page_members m
  where lower(m.email) = v_email;
  get diagnostics v_members = row_count;

  delete from public.moment_events me
  where lower(coalesce(me.owner_email, '')) = v_email;
  get diagnostics v_pages = row_count;

  delete from public.moment_accounts a
  where lower(a.email) = v_email;

  delete from public.moment_user_consents c
  where c.user_id = v_uid;

  delete from auth.users u
  where u.id = v_uid;

  if exists (select 1 from auth.users u where u.id = v_uid) then
    raise exception 'MOMENT_ERASE_AUTH';
  end if;

  return jsonb_build_object(
    'ok', true,
    'pages_deleted', v_pages,
    'memberships_removed', v_members
  );
end;
$$;

comment on function public.erase_my_moment_account(text) is
  'Cancella SOLO i Moments del chiamante (email JWT). Pagine di altri titolari intatte. Codici claimed non si riciclano. Staff bloccato. Media R2: eventuali orfani dopo erase (il JWT non vale più per DELETE).';

revoke all on function public.erase_my_moment_account(text) from public, anon;
grant execute on function public.erase_my_moment_account(text) to authenticated;
