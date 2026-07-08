-- KhamaKey v63 - admin Business: RLS per team con pages.read / crm.read / analytics.read
-- I permessi in platform_members c'erano già; mancavano le policy sulle tabelle Business.

-- businesses
drop policy if exists businesses_platform_select on public.businesses;
create policy businesses_platform_select on public.businesses
for select to authenticated
using (
  app_private.current_user_has_platform_permission('pages.read')
  or app_private.current_user_has_platform_permission('pages.write')
  or app_private.current_user_has_platform_permission('crm.read')
  or app_private.current_user_has_platform_permission('crm.write')
  or app_private.current_user_has_platform_permission('admin.full')
);

drop policy if exists businesses_platform_write on public.businesses;
create policy businesses_platform_write on public.businesses
for all to authenticated
using (
  app_private.current_user_has_platform_permission('pages.write')
  or app_private.current_user_has_platform_permission('admin.full')
)
with check (
  app_private.current_user_has_platform_permission('pages.write')
  or app_private.current_user_has_platform_permission('admin.full')
);

-- business_public_pages
drop policy if exists business_public_pages_platform_select on public.business_public_pages;
create policy business_public_pages_platform_select on public.business_public_pages
for select to authenticated
using (
  app_private.current_user_has_platform_permission('pages.read')
  or app_private.current_user_has_platform_permission('pages.write')
  or app_private.current_user_has_platform_permission('admin.full')
);

drop policy if exists business_public_pages_platform_write on public.business_public_pages;
create policy business_public_pages_platform_write on public.business_public_pages
for all to authenticated
using (
  app_private.current_user_has_platform_permission('pages.write')
  or app_private.current_user_has_platform_permission('admin.full')
)
with check (
  app_private.current_user_has_platform_permission('pages.write')
  or app_private.current_user_has_platform_permission('admin.full')
);

-- business_editor_states (drawer editor admin)
drop policy if exists business_editor_states_platform_select on public.business_editor_states;
create policy business_editor_states_platform_select on public.business_editor_states
for select to authenticated
using (
  app_private.current_user_has_platform_permission('pages.read')
  or app_private.current_user_has_platform_permission('pages.write')
  or app_private.current_user_has_platform_permission('admin.full')
);

drop policy if exists business_editor_states_platform_write on public.business_editor_states;
create policy business_editor_states_platform_write on public.business_editor_states
for all to authenticated
using (
  app_private.current_user_has_platform_permission('pages.write')
  or app_private.current_user_has_platform_permission('admin.full')
)
with check (
  app_private.current_user_has_platform_permission('pages.write')
  or app_private.current_user_has_platform_permission('admin.full')
);

-- business_modules
drop policy if exists business_modules_platform_select on public.business_modules;
create policy business_modules_platform_select on public.business_modules
for select to authenticated
using (
  app_private.current_user_has_platform_permission('pages.read')
  or app_private.current_user_has_platform_permission('pages.write')
  or app_private.current_user_has_platform_permission('admin.full')
);

-- analytics_events (scheda cliente admin)
drop policy if exists analytics_events_platform_select on public.analytics_events;
create policy analytics_events_platform_select on public.analytics_events
for select to authenticated
using (
  app_private.current_user_has_platform_permission('analytics.read')
  or app_private.current_user_has_platform_permission('pages.read')
  or app_private.current_user_has_platform_permission('admin.full')
);

-- business_public_leads
drop policy if exists business_public_leads_platform_select on public.business_public_leads;
create policy business_public_leads_platform_select on public.business_public_leads
for select to authenticated
using (
  app_private.current_user_has_platform_permission('crm.read')
  or app_private.current_user_has_platform_permission('pages.read')
  or app_private.current_user_has_platform_permission('admin.full')
);

-- Garantisce bundle admin completo a owner/admin (idempotente)
update public.platform_members
set permissions = array(
  select distinct unnest(
    permissions || array[
      'pages.read','pages.write',
      'crm.read','crm.write',
      'analytics.read',
      'orders.read','orders.write',
      'inventory.read','inventory.write',
      'agents.read','agents.write',
      'moments.read','moments.write',
      'support.read','support.write',
      'shipping.read','shipping.write',
      'billing.read','billing.write',
      'commissions.read','commissions.write',
      'staff.manage','settings.manage','audit.read',
      'admin.full'
    ]::text[]
  )
), updated_at = now()
where role in ('owner','admin') or 'admin.full' = any(permissions);
