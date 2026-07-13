-- KhamaKey v89 — Ticket supporto creati da utenti autenticati
-- Policy additiva: non modifica le policy admin esistenti e non consente accesso anonimo.

alter table public.platform_support_tickets enable row level security;

drop policy if exists platform_support_tickets_customer_select on public.platform_support_tickets;
create policy platform_support_tickets_customer_select on public.platform_support_tickets
for select to authenticated
using (
  profile_id = (select auth.uid())
);

drop policy if exists platform_support_tickets_customer_insert on public.platform_support_tickets;
create policy platform_support_tickets_customer_insert on public.platform_support_tickets
for insert to authenticated
with check (
  profile_id = (select auth.uid())
  and status = 'open'
  and priority in ('low','normal','high','urgent')
  and source in ('business_editor','moments_editor','account_area')
  and (
    business_id is null
    or exists (
      select 1
      from public.businesses b
      where b.id = platform_support_tickets.business_id
        and b.profile_id = (select auth.uid())
    )
  )
);
