-- KhamaKey v37 - base admin per KhamaKey Moments
-- Da applicare al progetto Supabase cuxlwaocjqwzluycznyp prima di usare la sezione Moments.

create table if not exists public.moment_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete set null,
  profile_id uuid references public.profiles(id) on delete set null,
  title text not null,
  slug text not null unique,
  event_type text not null default 'other' check (event_type in ('wedding','birthday','corporate','ceremony','private_party','other')),
  status text not null default 'draft' check (status in ('draft','active','completed','archived')),
  event_date timestamptz,
  venue_name text,
  venue_address text,
  description text,
  settings jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.moment_events enable row level security;

drop policy if exists moment_events_select on public.moment_events;
create policy moment_events_select on public.moment_events
for select to authenticated
using (
  app_private.current_user_has_platform_permission('moments.read')
  or app_private.current_user_has_platform_permission('moments.write')
  or app_private.current_user_has_platform_permission('admin.full')
);

drop policy if exists moment_events_write on public.moment_events;
create policy moment_events_write on public.moment_events
for all to authenticated
using (
  app_private.current_user_has_platform_permission('moments.write')
  or app_private.current_user_has_platform_permission('admin.full')
)
with check (
  app_private.current_user_has_platform_permission('moments.write')
  or app_private.current_user_has_platform_permission('admin.full')
);

grant select, insert, update, delete on public.moment_events to authenticated;

update public.platform_members
set permissions = array(
  select distinct unnest(permissions || array['moments.read','moments.write']::text[])
), updated_at = now()
where role in ('owner','admin') or 'admin.full' = any(permissions);

create index if not exists moment_events_slug_idx on public.moment_events(slug);
create index if not exists moment_events_business_idx on public.moment_events(business_id);
create index if not exists moment_events_status_idx on public.moment_events(status);
