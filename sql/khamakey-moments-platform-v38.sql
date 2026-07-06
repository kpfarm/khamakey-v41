-- KhamaKey v38 - separazione Business / Moments, pagina pubblica Moments, NFC e PIN
-- Da applicare dopo v37 sul progetto Supabase cuxlwaocjqwzluycznyp.

create table if not exists public.moment_accounts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  email text not null unique,
  display_name text,
  status text not null default 'active' check (status in ('active','paused','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.moment_events
  add column if not exists account_id uuid references public.moment_accounts(id) on delete set null,
  add column if not exists owner_email text,
  add column if not exists nfc_code text,
  add column if not exists pin_enabled boolean not null default true,
  add column if not exists pin_hash text,
  add column if not exists public_visible boolean not null default false,
  add column if not exists page_state jsonb not null default '{}';

create table if not exists public.moment_pages (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.moment_events(id) on delete cascade,
  slug text not null unique,
  state jsonb not null default '{}',
  published boolean not null default false,
  pin_enabled boolean not null default true,
  pin_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.moment_nfc_links (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  event_id uuid not null references public.moment_events(id) on delete cascade,
  page_id uuid references public.moment_pages(id) on delete set null,
  status text not null default 'active' check (status in ('active','paused','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.moment_accounts enable row level security;
alter table public.moment_events enable row level security;
alter table public.moment_pages enable row level security;
alter table public.moment_nfc_links enable row level security;

drop policy if exists moment_accounts_select on public.moment_accounts;
create policy moment_accounts_select on public.moment_accounts
for select to authenticated
using (
  lower(email) = lower((select auth.jwt() ->> 'email'))
  or app_private.current_user_has_platform_permission('moments.read')
  or app_private.current_user_has_platform_permission('moments.write')
  or app_private.current_user_has_platform_permission('admin.full')
);

drop policy if exists moment_accounts_write on public.moment_accounts;
create policy moment_accounts_write on public.moment_accounts
for all to authenticated
using (app_private.current_user_has_platform_permission('moments.write') or app_private.current_user_has_platform_permission('admin.full'))
with check (app_private.current_user_has_platform_permission('moments.write') or app_private.current_user_has_platform_permission('admin.full'));

drop policy if exists moment_events_select on public.moment_events;
create policy moment_events_select on public.moment_events
for select to authenticated
using (
  lower(owner_email) = lower((select auth.jwt() ->> 'email'))
  or app_private.current_user_has_platform_permission('moments.read')
  or app_private.current_user_has_platform_permission('moments.write')
  or app_private.current_user_has_platform_permission('admin.full')
);

drop policy if exists moment_events_write on public.moment_events;
create policy moment_events_write on public.moment_events
for all to authenticated
using (app_private.current_user_has_platform_permission('moments.write') or app_private.current_user_has_platform_permission('admin.full'))
with check (app_private.current_user_has_platform_permission('moments.write') or app_private.current_user_has_platform_permission('admin.full'));

drop policy if exists moment_pages_select on public.moment_pages;
create policy moment_pages_select on public.moment_pages
for select to authenticated
using (
  exists (
    select 1 from public.moment_events me
    where me.id = moment_pages.event_id
      and lower(me.owner_email) = lower((select auth.jwt() ->> 'email'))
  )
  or app_private.current_user_has_platform_permission('moments.read')
  or app_private.current_user_has_platform_permission('moments.write')
  or app_private.current_user_has_platform_permission('admin.full')
);

drop policy if exists moment_pages_write on public.moment_pages;
create policy moment_pages_write on public.moment_pages
for all to authenticated
using (app_private.current_user_has_platform_permission('moments.write') or app_private.current_user_has_platform_permission('admin.full'))
with check (app_private.current_user_has_platform_permission('moments.write') or app_private.current_user_has_platform_permission('admin.full'));

drop policy if exists moment_nfc_links_select on public.moment_nfc_links;
create policy moment_nfc_links_select on public.moment_nfc_links
for select to authenticated
using (
  exists (
    select 1 from public.moment_events me
    where me.id = moment_nfc_links.event_id
      and lower(me.owner_email) = lower((select auth.jwt() ->> 'email'))
  )
  or app_private.current_user_has_platform_permission('moments.read')
  or app_private.current_user_has_platform_permission('moments.write')
  or app_private.current_user_has_platform_permission('admin.full')
);

drop policy if exists moment_nfc_links_write on public.moment_nfc_links;
create policy moment_nfc_links_write on public.moment_nfc_links
for all to authenticated
using (app_private.current_user_has_platform_permission('moments.write') or app_private.current_user_has_platform_permission('admin.full'))
with check (app_private.current_user_has_platform_permission('moments.write') or app_private.current_user_has_platform_permission('admin.full'));

grant select, insert, update, delete on public.moment_accounts to authenticated;
grant select, insert, update, delete on public.moment_events to authenticated;
grant select, insert, update, delete on public.moment_pages to authenticated;
grant select, insert, update, delete on public.moment_nfc_links to authenticated;

insert into public.moment_accounts (email, display_name)
select distinct lower(owner_email), owner_email
from public.moment_events
where owner_email is not null
on conflict (email) do nothing;

update public.moment_events me
set account_id = ma.id
from public.moment_accounts ma
where me.account_id is null
  and lower(me.owner_email) = lower(ma.email);

insert into public.moment_pages (event_id, slug, state, published, pin_enabled, pin_hash)
select id, slug, page_state, public_visible, pin_enabled, pin_hash
from public.moment_events
on conflict (slug) do update
set state = excluded.state,
    published = excluded.published,
    pin_enabled = excluded.pin_enabled,
    pin_hash = coalesce(excluded.pin_hash, moment_pages.pin_hash),
    updated_at = now();

insert into public.moment_nfc_links (code, event_id, page_id, status)
select me.nfc_code, me.id, mp.id, 'active'
from public.moment_events me
join public.moment_pages mp on mp.event_id = me.id
where me.nfc_code is not null and me.nfc_code <> ''
on conflict (code) do update
set event_id = excluded.event_id,
    page_id = excluded.page_id,
    status = excluded.status,
    updated_at = now();

create or replace function public.get_public_moment(p_slug text, p_pin_hash text default null)
returns table (
  event_id uuid,
  title text,
  slug text,
  event_type text,
  status text,
  event_date timestamptz,
  venue_name text,
  venue_address text,
  description text,
  state jsonb,
  pin_enabled boolean,
  pin_required boolean,
  pin_valid boolean
)
language sql
security definer
set search_path = public
as $$
  select
    me.id,
    me.title,
    mp.slug,
    me.event_type,
    me.status,
    me.event_date,
    me.venue_name,
    me.venue_address,
    me.description,
    mp.state,
    mp.pin_enabled,
    (mp.pin_enabled and mp.pin_hash is not null and mp.pin_hash <> '') as pin_required,
    (not mp.pin_enabled or mp.pin_hash is null or mp.pin_hash = '' or mp.pin_hash = p_pin_hash) as pin_valid
  from public.moment_pages mp
  join public.moment_events me on me.id = mp.event_id
  where mp.slug = p_slug
    and mp.published = true
    and me.status = 'active'
  limit 1
$$;

revoke all on function public.get_public_moment(text,text) from public;
grant execute on function public.get_public_moment(text,text) to anon, authenticated;

create or replace function public.resolve_khamakey_code(p_code text)
returns table (
  target_type text,
  business_id uuid,
  moment_event_id uuid,
  slug text
)
language sql
security definer
set search_path = public
as $$
  select 'moment'::text, null::uuid, me.id, mp.slug
  from public.moment_nfc_links mn
  join public.moment_events me on me.id = mn.event_id
  join public.moment_pages mp on mp.event_id = me.id
  where upper(mn.code) = upper(p_code)
    and mn.status = 'active'
    and me.status = 'active'
    and mp.published = true
  limit 1
$$;

revoke all on function public.resolve_khamakey_code(text) from public;
grant execute on function public.resolve_khamakey_code(text) to anon, authenticated;

create index if not exists moment_accounts_email_idx on public.moment_accounts(lower(email));
create index if not exists moment_events_owner_email_idx on public.moment_events(lower(owner_email));
create index if not exists moment_pages_event_idx on public.moment_pages(event_id);
create index if not exists moment_nfc_links_code_idx on public.moment_nfc_links(upper(code));
