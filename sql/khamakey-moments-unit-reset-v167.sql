-- KhamaKey Moments v167
-- Reset pezzo per reso Amazon / refurb: scollega account, cancella pagina,
-- nuovo codice attivazione. Il chip NFC resta valido (stesso public_slug).
-- Additivo: non cambia activate_moment_code né il renderer pubblico.

create table if not exists public.moment_unit_reset_log (
  id uuid primary key default gen_random_uuid(),
  old_code text not null,
  new_code text not null,
  public_slug text not null,
  previous_event_id uuid,
  previous_owner_email text,
  packaging_barcode text,
  reason text,
  reset_by_email text,
  created_at timestamptz not null default now()
);

create index if not exists moment_unit_reset_log_slug_idx
  on public.moment_unit_reset_log (public_slug, created_at desc);

create index if not exists moment_unit_reset_log_created_idx
  on public.moment_unit_reset_log (created_at desc);

alter table public.moment_unit_reset_log enable row level security;

drop policy if exists moment_unit_reset_log_staff_select on public.moment_unit_reset_log;
create policy moment_unit_reset_log_staff_select
  on public.moment_unit_reset_log
  for select
  to authenticated
  using (
    app_private.current_user_has_platform_permission('moments.read')
    or app_private.current_user_has_platform_permission('moments.write')
    or app_private.current_user_has_platform_permission('admin.full')
  );

revoke all on table public.moment_unit_reset_log from public;
revoke all on table public.moment_unit_reset_log from anon;
grant select on table public.moment_unit_reset_log to authenticated;

-- p_confirm deve essere esattamente 'RESET' (protezione UI + RPC).
create or replace function public.admin_reset_moment_unit_for_resale(
  p_code text,
  p_confirm text,
  p_reason text default null
)
returns table (
  old_code text,
  new_code text,
  public_slug text,
  packaging_barcode text,
  previous_owner_email text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_old text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_confirm text := upper(trim(coalesce(p_confirm, '')));
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_status text;
  v_slug text;
  v_packaging text;
  v_event_id uuid;
  v_owner text;
  v_new text;
  v_attempts integer := 0;
begin
  if not (
    app_private.current_user_has_platform_permission('moments.write')
    or app_private.current_user_has_platform_permission('admin.full')
  ) then
    raise exception 'Permesso moments.write richiesto.';
  end if;

  if v_confirm <> 'RESET' then
    raise exception 'Conferma non valida. Digita RESET per procedere.';
  end if;

  if v_old !~ '^[A-Z0-9]{8,32}$' then
    raise exception 'Codice prodotto non valido.';
  end if;

  select
    mac.status,
    mac.public_slug,
    mac.packaging_barcode,
    mac.claimed_event_id,
    lower(mac.claimed_by_email)
  into v_status, v_slug, v_packaging, v_event_id, v_owner
  from public.moment_activation_codes mac
  where upper(mac.code) = v_old
  for update;

  if v_status is null then
    raise exception 'Codice non presente in magazzino Moments.';
  end if;

  if v_status <> 'claimed' then
    raise exception 'Si possono resettare solo pezzi attivati (status=claimed). Stato attuale: %.', v_status;
  end if;

  if v_slug is null or trim(v_slug) = '' then
    raise exception 'Pezzo senza public_slug: non resettabile in sicurezza (chip NFC).';
  end if;

  -- Evento collegato: cancella pagina + dati correlati (CASCADE su pages/nfc/rsvp/guestbook/…).
  if v_event_id is not null then
    delete from public.moment_events me where me.id = v_event_id;
  else
    -- Fallback: event via nfc_links sullo stesso codice attivazione
    delete from public.moment_events me
    where me.id in (
      select mn.event_id
      from public.moment_nfc_links mn
      where upper(mn.code) = v_old
    );
  end if;

  -- Eventuali link NFC orfani sullo stesso codice
  delete from public.moment_nfc_links mn where upper(mn.code) = v_old;

  -- Nuovo codice attivazione (inserto da ristampare); barcode e slug restano
  loop
    v_attempts := v_attempts + 1;
    if v_attempts > 40 then
      raise exception 'Impossibile generare un nuovo codice attivazione unico.';
    end if;
    v_new := app_private.random_moment_activation_code(12);
    exit when v_new is not null
      and v_new <> v_old
      and not exists (select 1 from public.moment_activation_codes x where upper(x.code) = upper(v_new));
  end loop;

  update public.moment_activation_codes mac
  set code = v_new,
      status = 'available',
      claimed_by_email = null,
      claimed_event_id = null,
      claimed_at = null,
      platform_order_id = null,
      public_url = '/m/' || v_slug,
      updated_at = now()
  where upper(mac.code) = v_old;

  if not found then
    raise exception 'Aggiornamento magazzino non riuscito.';
  end if;

  insert into public.moment_unit_reset_log (
    old_code,
    new_code,
    public_slug,
    previous_event_id,
    previous_owner_email,
    packaging_barcode,
    reason,
    reset_by_email
  ) values (
    v_old,
    v_new,
    v_slug,
    v_event_id,
    v_owner,
    v_packaging,
    v_reason,
    nullif(v_email, '')
  );

  old_code := v_old;
  new_code := v_new;
  public_slug := v_slug;
  packaging_barcode := v_packaging;
  previous_owner_email := v_owner;
  return next;
end;
$$;

revoke all on function public.admin_reset_moment_unit_for_resale(text, text, text) from public;
revoke all on function public.admin_reset_moment_unit_for_resale(text, text, text) from anon;
grant execute on function public.admin_reset_moment_unit_for_resale(text, text, text) to authenticated;

comment on function public.admin_reset_moment_unit_for_resale(text, text, text) is
  'Staff-only: reset pezzo Moments per reso/refurb. Mantiene public_slug (chip NFC), genera nuovo codice attivazione, cancella evento/pagina.';
