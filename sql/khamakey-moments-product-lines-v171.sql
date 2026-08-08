-- KhamaKey v171 — linee oggetto fisico gestibili (Officina Magazzino)
-- Tabella anagrafica + rename/delete sicuri. Non tocca NFC / attivazione.

create table if not exists public.platform_moment_product_lines (
  slug text primary key,
  label text not null,
  is_system boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_moment_product_lines_slug_check
    check (slug ~ '^[a-z0-9_]+$' and char_length(slug) between 2 and 48)
);

comment on table public.platform_moment_product_lines is
  'Linee oggetto fisico Moments (Orsetto, Portachiavi, custom…). Usate in catalogo e magazzino.';

insert into public.platform_moment_product_lines (slug, label, is_system, active, sort_order)
values
  ('portachiavi', 'Portachiavi NFC', true, true, 10),
  ('orsetto', 'Orsetto NFC', true, true, 20),
  ('card', 'Card NFC', true, true, 30),
  ('magnete', 'Magnete NFC', true, true, 40),
  ('tag', 'Tag / tessera NFC', true, true, 50),
  ('confezione', 'Confezione regalo', true, true, 60)
on conflict (slug) do update
set label = excluded.label,
    is_system = true,
    active = true,
    sort_order = excluded.sort_order,
    updated_at = now();

-- Importa linee già usate su pezzi/catalogo (custom)
insert into public.platform_moment_product_lines (slug, label, is_system, active, sort_order)
select distinct
  lower(regexp_replace(trim(mac.product_line), '[^a-z0-9]+', '_', 'g')),
  initcap(replace(lower(regexp_replace(trim(mac.product_line), '[^a-z0-9]+', ' ', 'g')), '_', ' ')),
  false,
  true,
  200
from public.moment_activation_codes mac
where nullif(trim(mac.product_line), '') is not null
  and lower(trim(mac.product_line)) not in ('altro', 'non_specificato', '')
  and lower(regexp_replace(trim(mac.product_line), '[^a-z0-9]+', '_', 'g')) ~ '^[a-z0-9_]+$'
on conflict (slug) do nothing;

insert into public.platform_moment_product_lines (slug, label, is_system, active, sort_order)
select distinct
  lower(regexp_replace(trim(c.product_line), '[^a-z0-9]+', '_', 'g')),
  initcap(replace(lower(regexp_replace(trim(c.product_line), '[^a-z0-9]+', ' ', 'g')), '_', ' ')),
  false,
  true,
  200
from public.platform_moment_catalog c
where nullif(trim(c.product_line), '') is not null
  and lower(trim(c.product_line)) not in ('altro', 'non_specificato', '')
  and lower(regexp_replace(trim(c.product_line), '[^a-z0-9]+', '_', 'g')) ~ '^[a-z0-9_]+$'
on conflict (slug) do nothing;

alter table public.platform_moment_product_lines enable row level security;

drop policy if exists platform_moment_product_lines_select on public.platform_moment_product_lines;
create policy platform_moment_product_lines_select on public.platform_moment_product_lines
  for select to authenticated
  using (
    app_private.current_user_has_platform_permission('moments.read')
    or app_private.current_user_has_platform_permission('moments.write')
    or app_private.current_user_has_platform_permission('admin.full')
  );

drop policy if exists platform_moment_product_lines_write on public.platform_moment_product_lines;
create policy platform_moment_product_lines_write on public.platform_moment_product_lines
  for all to authenticated
  using (
    app_private.current_user_has_platform_permission('moments.write')
    or app_private.current_user_has_platform_permission('admin.full')
  )
  with check (
    app_private.current_user_has_platform_permission('moments.write')
    or app_private.current_user_has_platform_permission('admin.full')
  );

grant select, insert, update, delete on public.platform_moment_product_lines to authenticated;

create or replace function public.rename_moment_product_line(
  p_old_slug text,
  p_new_slug text,
  p_new_label text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old text := lower(trim(coalesce(p_old_slug, '')));
  v_new text := lower(regexp_replace(trim(coalesce(p_new_slug, '')), '[^a-z0-9]+', '_', 'g'));
  v_label text := nullif(trim(coalesce(p_new_label, '')), '');
  v_codes int := 0;
  v_catalog int := 0;
begin
  if not (
    app_private.current_user_has_platform_permission('moments.write')
    or app_private.current_user_has_platform_permission('admin.full')
  ) then
    raise exception 'Permessi insufficienti.';
  end if;

  if v_old = '' or v_new = '' or char_length(v_new) < 2 then
    raise exception 'Slug linea non valido.';
  end if;
  if v_new in ('altro', 'non_specificato') then
    raise exception 'Slug riservato.';
  end if;
  if not exists (select 1 from public.platform_moment_product_lines where slug = v_old) then
    raise exception 'Linea «%» non trovata.', v_old;
  end if;
  if v_old <> v_new and exists (
    select 1 from public.platform_moment_product_lines where slug = v_old and is_system
  ) then
    raise exception 'Le linee di sistema non possono cambiare slug: modifica solo il nome.';
  end if;
  if v_old <> v_new and exists (select 1 from public.platform_moment_product_lines where slug = v_new) then
    raise exception 'Esiste già una linea con slug «%».', v_new;
  end if;

  if v_label is null then
    select label into v_label from public.platform_moment_product_lines where slug = v_old;
  end if;

  if v_old = v_new then
    update public.platform_moment_product_lines
    set label = v_label, updated_at = now()
    where slug = v_old;
  else
    update public.platform_moment_product_lines
    set slug = v_new, label = v_label, updated_at = now()
    where slug = v_old;

    update public.moment_activation_codes
    set product_line = v_new
    where product_line = v_old;
    get diagnostics v_codes = row_count;

    update public.platform_moment_catalog
    set product_line = v_new
    where product_line = v_old;
    get diagnostics v_catalog = row_count;
  end if;

  return jsonb_build_object(
    'ok', true,
    'slug', v_new,
    'label', v_label,
    'codes_updated', v_codes,
    'catalog_updated', v_catalog
  );
end;
$$;

create or replace function public.delete_moment_product_line(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text := lower(trim(coalesce(p_slug, '')));
  v_system boolean;
  v_codes int := 0;
  v_catalog int := 0;
begin
  if not (
    app_private.current_user_has_platform_permission('moments.write')
    or app_private.current_user_has_platform_permission('admin.full')
  ) then
    raise exception 'Permessi insufficienti.';
  end if;

  select is_system into v_system
  from public.platform_moment_product_lines
  where slug = v_slug;

  if v_system is null then
    raise exception 'Linea «%» non trovata.', v_slug;
  end if;
  if v_system then
    raise exception 'Le linee di sistema non si eliminano: disattivale.';
  end if;

  select count(*)::int into v_codes
  from public.moment_activation_codes
  where product_line = v_slug;

  select count(*)::int into v_catalog
  from public.platform_moment_catalog
  where product_line = v_slug;

  if v_codes > 0 or v_catalog > 0 then
    raise exception 'Linea in uso (% pezzi, % modelli). Rinomina o sposta i pezzi prima di eliminarla.', v_codes, v_catalog;
  end if;

  delete from public.platform_moment_product_lines where slug = v_slug;

  return jsonb_build_object('ok', true, 'slug', v_slug);
end;
$$;

revoke all on function public.rename_moment_product_line(text, text, text) from public, anon;
revoke all on function public.delete_moment_product_line(text) from public, anon;
grant execute on function public.rename_moment_product_line(text, text, text) to authenticated;
grant execute on function public.delete_moment_product_line(text) to authenticated;
