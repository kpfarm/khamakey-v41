-- KhamaKey v84 — CRM: RPC su tabelle già esistenti (platform_client_records, platform_client_notes)
-- Le tabelle e la RLS (crm.read / crm.write) esistono dalla v43/v63. Questo file aggiunge solo le
-- funzioni di lettura aggregata e scrittura usate dal nuovo pannello CRM admin. Idempotente.
-- Nessuna tabella nuova, nessun dato toccato.

-- ---------------------------------------------------------------------------
-- Lista CRM: un record per attività, con dati anagrafici + pipeline + conteggio note + follow-up
-- ---------------------------------------------------------------------------
create or replace function public.list_crm_clients()
returns table (
  business_id uuid,
  business_name text,
  slug text,
  categoria text,
  onboarding_status text,
  priority text,
  plan_key text,
  tags text[],
  assigned_agent_id uuid,
  assigned_agent_name text,
  next_follow_up_at timestamptz,
  admin_notes text,
  note_count bigint,
  last_note_at timestamptz,
  record_exists boolean,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (
    app_private.current_user_has_platform_permission('crm.read')
    or app_private.current_user_has_platform_permission('crm.write')
    or app_private.current_user_has_platform_permission('admin.full')
  ) then
    raise exception 'Permessi insufficienti.';
  end if;

  return query
  select
    b.id,
    coalesce(nullif(trim(b.nome), ''), b.slug, 'Senza nome'),
    b.slug,
    b.categoria,
    coalesce(cr.onboarding_status, 'nuovo'),
    coalesce(cr.priority, 'media'),
    cr.plan_key,
    coalesce(cr.tags, array[]::text[]),
    cr.assigned_agent_id,
    coalesce(pa.contact_name, pa.email),
    cr.next_follow_up_at,
    cr.admin_notes,
    (select count(*) from public.platform_client_notes n where n.business_id = b.id),
    (select max(n.created_at) from public.platform_client_notes n where n.business_id = b.id),
    (cr.business_id is not null),
    cr.updated_at
  from public.businesses b
  left join public.platform_client_records cr on cr.business_id = b.id
  left join public.platform_agents pa on pa.id = cr.assigned_agent_id
  order by
    case coalesce(cr.priority, 'media') when 'alta' then 0 when 'media' then 1 else 2 end,
    cr.next_follow_up_at asc nulls last,
    b.created_at desc;
end;
$$;

-- ---------------------------------------------------------------------------
-- Salva (upsert) il record CRM di un'attività
-- ---------------------------------------------------------------------------
create or replace function public.save_crm_client(
  p_business_id uuid,
  p_onboarding_status text default null,
  p_priority text default null,
  p_assigned_agent_id uuid default null,
  p_next_follow_up_at timestamptz default null,
  p_tags text[] default null,
  p_admin_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if not (
    app_private.current_user_has_platform_permission('crm.write')
    or app_private.current_user_has_platform_permission('admin.full')
  ) then
    raise exception 'Permessi insufficienti.';
  end if;
  if p_business_id is null or not exists (select 1 from public.businesses b where b.id = p_business_id) then
    raise exception 'Attività non valida.';
  end if;

  insert into public.platform_client_records as cr (
    business_id, onboarding_status, priority, assigned_agent_id,
    next_follow_up_at, tags, admin_notes, updated_by, updated_at
  )
  values (
    p_business_id,
    coalesce(nullif(trim(p_onboarding_status), ''), 'nuovo'),
    coalesce(nullif(trim(p_priority), ''), 'media'),
    p_assigned_agent_id,
    p_next_follow_up_at,
    coalesce(p_tags, array[]::text[]),
    nullif(trim(p_admin_notes), ''),
    v_uid,
    now()
  )
  on conflict (business_id) do update set
    onboarding_status = coalesce(nullif(trim(p_onboarding_status), ''), cr.onboarding_status),
    priority          = coalesce(nullif(trim(p_priority), ''), cr.priority),
    assigned_agent_id = p_assigned_agent_id,
    next_follow_up_at = p_next_follow_up_at,
    tags              = coalesce(p_tags, cr.tags),
    admin_notes       = nullif(trim(p_admin_notes), ''),
    updated_by        = v_uid,
    updated_at        = now();
end;
$$;

-- ---------------------------------------------------------------------------
-- Note cronologiche di un'attività (timeline)
-- ---------------------------------------------------------------------------
create or replace function public.list_crm_notes(p_business_id uuid)
returns table (
  id uuid,
  note_type text,
  body text,
  pinned boolean,
  author_name text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (
    app_private.current_user_has_platform_permission('crm.read')
    or app_private.current_user_has_platform_permission('crm.write')
    or app_private.current_user_has_platform_permission('admin.full')
  ) then
    raise exception 'Permessi insufficienti.';
  end if;

  return query
  select n.id, n.note_type, n.body, n.pinned,
    coalesce(pm.full_name, pm.email, 'Team'),
    n.created_at
  from public.platform_client_notes n
  left join public.platform_members pm on pm.user_id = n.author_user_id
  where n.business_id = p_business_id
  order by n.pinned desc, n.created_at desc;
end;
$$;

create or replace function public.add_crm_note(
  p_business_id uuid,
  p_body text,
  p_note_type text default 'nota',
  p_pinned boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not (
    app_private.current_user_has_platform_permission('crm.write')
    or app_private.current_user_has_platform_permission('admin.full')
  ) then
    raise exception 'Permessi insufficienti.';
  end if;
  if nullif(trim(coalesce(p_body, '')), '') is null then
    raise exception 'La nota non può essere vuota.';
  end if;
  if p_business_id is null or not exists (select 1 from public.businesses b where b.id = p_business_id) then
    raise exception 'Attività non valida.';
  end if;

  insert into public.platform_client_notes (business_id, author_user_id, note_type, body, pinned)
  values (p_business_id, auth.uid(), coalesce(nullif(trim(p_note_type), ''), 'nota'), trim(p_body), coalesce(p_pinned, false))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.delete_crm_note(p_note_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (
    app_private.current_user_has_platform_permission('crm.write')
    or app_private.current_user_has_platform_permission('admin.full')
  ) then
    raise exception 'Permessi insufficienti.';
  end if;
  delete from public.platform_client_notes where id = p_note_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grant: solo authenticated (il controllo fine è dentro le funzioni)
-- ---------------------------------------------------------------------------
revoke all on function public.list_crm_clients() from public, anon;
revoke all on function public.save_crm_client(uuid, text, text, uuid, timestamptz, text[], text) from public, anon;
revoke all on function public.list_crm_notes(uuid) from public, anon;
revoke all on function public.add_crm_note(uuid, text, text, boolean) from public, anon;
revoke all on function public.delete_crm_note(uuid) from public, anon;
grant execute on function public.list_crm_clients() to authenticated;
grant execute on function public.save_crm_client(uuid, text, text, uuid, timestamptz, text[], text) to authenticated;
grant execute on function public.list_crm_notes(uuid) to authenticated;
grant execute on function public.add_crm_note(uuid, text, text, boolean) to authenticated;
grant execute on function public.delete_crm_note(uuid) to authenticated;
