-- KhamaKey v170 — build_stage magazzino Moments (ops only)
-- Distingue codice solo digitale vs pezzo già assemblato (chip + inserto in prodotto).
-- NON influenza attivazione cliente, NFC, /m/, /k/ — solo filtri Officina.

alter table public.moment_activation_codes
  add column if not exists build_stage text not null default 'digital';

update public.moment_activation_codes
set build_stage = 'digital'
where build_stage is null or trim(build_stage) = '';

alter table public.moment_activation_codes
  drop constraint if exists moment_activation_codes_build_stage_check;

alter table public.moment_activation_codes
  add constraint moment_activation_codes_build_stage_check
  check (build_stage in ('digital', 'assembled'));

create index if not exists moment_activation_codes_build_stage_idx
  on public.moment_activation_codes(build_stage);

comment on column public.moment_activation_codes.build_stage is
  'Ops Officina: digital = generato non ancora nel pezzo; assembled = chip/inserto già nel prodotto. Non blocca activate_moment_code.';

-- Aggiorna build_stage su qualsiasi codice (anche claimed): metadato fabbricazione, non stato attivazione.
create or replace function public.set_moment_codes_build_stage(
  p_codes text[],
  p_build_stage text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stage text := lower(trim(coalesce(p_build_stage, '')));
  v_count integer := 0;
begin
  if not (
    app_private.current_user_has_platform_permission('moments.write')
    or app_private.current_user_has_platform_permission('admin.full')
  ) then
    raise exception 'Permesso moments.write richiesto.';
  end if;

  if v_stage not in ('digital', 'assembled') then
    raise exception 'build_stage non valido (usa digital o assembled).';
  end if;

  if p_codes is null or cardinality(p_codes) = 0 then
    return 0;
  end if;

  update public.moment_activation_codes mac
  set
    build_stage = v_stage,
    updated_at = now()
  where mac.code = any (
    select upper(trim(code))
    from unnest(coalesce(p_codes, array[]::text[])) as code
    where nullif(trim(code), '') is not null
  );

  get diagnostics v_count = row_count;
  return v_count;
end
$$;

revoke all on function public.set_moment_codes_build_stage(text[], text) from public, anon;
grant execute on function public.set_moment_codes_build_stage(text[], text) to authenticated;
