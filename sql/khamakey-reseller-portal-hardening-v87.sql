-- KhamaKey v87 — Hardening portale rivenditori
-- Rimuove il fallback di collegamento agente via sola email JWT.
-- Da ora il portale mostra dati solo se l'agente e' collegato esplicitamente
-- a platform_members.member_id, che a sua volta punta all'utente auth.

create or replace function public.current_agent_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select pa.id
  from public.platform_agents pa
  where pa.status <> 'disabled'
    and pa.member_id is not null
    and exists (
      select 1
      from public.platform_members pm
      where pm.id = pa.member_id
        and pm.user_id = auth.uid()
        and pm.status = 'active'
    )
  order by pa.created_at
  limit 1
$$;

revoke all on function public.current_agent_id() from public, anon;
grant execute on function public.current_agent_id() to authenticated;

comment on function public.current_agent_id() is
  'Returns the current authenticated reseller/agent id only through explicit platform_agents.member_id -> platform_members.user_id linkage. No email fallback.';
