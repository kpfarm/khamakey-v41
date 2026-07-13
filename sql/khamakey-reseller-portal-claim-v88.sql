-- KhamaKey v88 - Claim sicuro profilo rivenditore
-- Completa v87: niente fallback lettura via email, ma primo accesso operativo.
-- Un utente autenticato puo' collegarsi solo a un platform_member agente gia'
-- creato dall'admin, attivo, con stessa email confermata e non gia' assegnato.

create or replace function public.claim_my_agent_profile()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_confirmed_at timestamptz;
  v_member_id uuid;
begin
  if v_uid is null then
    return false;
  end if;

  select lower(u.email), u.email_confirmed_at
    into v_email, v_confirmed_at
  from auth.users u
  where u.id = v_uid;

  if v_email is null or v_confirmed_at is null then
    return false;
  end if;

  update public.platform_members pm
  set user_id = v_uid,
      updated_at = now()
  where pm.id = (
    select pm2.id
    from public.platform_members pm2
    join public.platform_agents pa on pa.member_id = pm2.id
    where lower(pm2.email) = v_email
      and pm2.role = 'agent'
      and pm2.status = 'active'
      and pa.status <> 'disabled'
      and (pm2.user_id is null or pm2.user_id = v_uid)
    order by pm2.created_at
    limit 1
  )
    and (pm.user_id is null or pm.user_id = v_uid)
  returning pm.id into v_member_id;

  return v_member_id is not null or public.current_agent_id() is not null;
end;
$$;

revoke all on function public.claim_my_agent_profile() from public, anon;
grant execute on function public.claim_my_agent_profile() to authenticated;

comment on function public.claim_my_agent_profile() is
  'Claims an admin-created active agent member for the authenticated confirmed email. It only writes platform_members.user_id and never exposes agent data by email fallback.';
