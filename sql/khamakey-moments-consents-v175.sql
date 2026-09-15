-- KhamaKey v175 — Registro consensi Moments (Termini/Privacy + marketing).
-- Append-only: ogni sì/no è una riga nuova. Nessun update/delete dal client.
-- Non è autorizzazione NFC/editor: non usarla in RLS di eventi o upload.
-- Fail-safe: se l'insert fallisce, signup e attivazione devono comunque procedere (lo fa il client).

create table if not exists public.moment_user_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  consent_type text not null,
  granted boolean not null,
  source text not null,
  policy_version text,
  created_at timestamptz not null default now(),
  constraint moment_user_consents_type_chk check (consent_type in ('legal', 'marketing')),
  constraint moment_user_consents_source_chk check (source in ('signup_nfc', 'signup_invite', 'account'))
);

create index if not exists moment_user_consents_user_type_created_idx
  on public.moment_user_consents (user_id, consent_type, created_at desc);

comment on table public.moment_user_consents is
  'Registro consensi Moments. Ultima riga per (user_id, consent_type) = stato corrente.';

alter table public.moment_user_consents enable row level security;

revoke all on table public.moment_user_consents from public, anon, authenticated;
grant select, insert on table public.moment_user_consents to authenticated;

create or replace function public.moment_user_consents_force_uid()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'moment_user_consents: authentication required';
  end if;
  new.user_id := auth.uid();
  new.created_at := now();
  return new;
end;
$$;

drop trigger if exists moment_user_consents_force_uid on public.moment_user_consents;
create trigger moment_user_consents_force_uid
before insert on public.moment_user_consents
for each row
execute function public.moment_user_consents_force_uid();

revoke all on function public.moment_user_consents_force_uid() from public, anon, authenticated;

drop policy if exists moment_user_consents_select_own on public.moment_user_consents;
create policy moment_user_consents_select_own
  on public.moment_user_consents
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists moment_user_consents_insert_own on public.moment_user_consents;
create policy moment_user_consents_insert_own
  on public.moment_user_consents
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- Nessuna policy update/delete: registro solo in append.
