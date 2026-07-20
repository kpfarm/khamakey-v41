-- KhamaKey v148 — magazzino codici NFC Business (admin, come Moments)

alter table public.business_activation_codes
  add column if not exists sku text,
  add column if not exists product_line text,
  add column if not exists product_label text,
  add column if not exists public_url text,
  add column if not exists sold_channel text,
  add column if not exists assigned_agent_id uuid,
  add column if not exists platform_order_id uuid;

create index if not exists business_activation_codes_sku_idx
  on public.business_activation_codes(sku);
create index if not exists business_activation_codes_batch_idx
  on public.business_activation_codes(batch_label);
create index if not exists business_activation_codes_agent_idx
  on public.business_activation_codes(assigned_agent_id);
create index if not exists business_activation_codes_order_idx
  on public.business_activation_codes(platform_order_id);

-- Backfill link NFC su codici esistenti
update public.business_activation_codes bac
set
  public_url = coalesce(bac.public_url, '/k/' || lower(bac.code)),
  product_label = coalesce(bac.product_label, 'KhamaKey Business'),
  batch_label = coalesce(bac.batch_label, 'legacy-import')
where bac.code is not null;

update public.business_activation_codes bac
set public_slug = coalesce(bac.public_slug, b.slug)
from public.businesses b
where bac.claimed_business_id = b.id
  and bac.public_slug is null;

-- RLS admin (inventory.read / inventory.write)
drop policy if exists business_activation_codes_select on public.business_activation_codes;
create policy business_activation_codes_select on public.business_activation_codes
for select to authenticated
using (
  lower(claimed_by_email) = lower((select auth.jwt() ->> 'email'))
  or app_private.current_user_has_platform_permission('inventory.read')
  or app_private.current_user_has_platform_permission('inventory.write')
  or app_private.current_user_has_platform_permission('pages.read')
  or app_private.current_user_has_platform_permission('admin.full')
);

drop policy if exists business_activation_codes_write on public.business_activation_codes;
create policy business_activation_codes_write on public.business_activation_codes
for all to authenticated
using (
  app_private.current_user_has_platform_permission('inventory.write')
  or app_private.current_user_has_platform_permission('admin.full')
)
with check (
  app_private.current_user_has_platform_permission('inventory.write')
  or app_private.current_user_has_platform_permission('admin.full')
);

grant select, insert, update, delete on public.business_activation_codes to authenticated;

create or replace function public.create_business_product_batch(
  p_quantity integer,
  p_prefix text default 'KHAMA',
  p_sku text default null,
  p_batch_label text default null,
  p_product_line text default null,
  p_product_label text default null,
  p_sold_channel text default null,
  p_assigned_agent_id uuid default null
)
returns table (
  out_code text,
  public_slug text,
  sku text,
  product_line text,
  batch_label text,
  public_url text,
  sold_channel text,
  assigned_agent_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quantity integer := least(500, greatest(1, coalesce(p_quantity, 1)));
  v_prefix text := upper(regexp_replace(coalesce(nullif(p_prefix,''),'KHAMA'), '[^A-Za-z0-9]', '', 'g'));
  v_sku text := nullif(trim(coalesce(p_sku,'')), '');
  v_line text := nullif(trim(coalesce(p_product_line,'')), '');
  v_batch text := nullif(trim(coalesce(p_batch_label,'')), '');
  v_label text := nullif(trim(coalesce(p_product_label,'')), '');
  v_channel text := nullif(trim(coalesce(p_sold_channel,'')), '');
  v_agent uuid := p_assigned_agent_id;
  v_code text;
  i integer := 0;
begin
  if not (
    app_private.current_user_has_platform_permission('inventory.write')
    or app_private.current_user_has_platform_permission('admin.full')
  ) then
    raise exception 'Permesso inventory.write richiesto.';
  end if;
  if length(v_prefix) < 2 then
    v_prefix := 'KHAMA';
  end if;
  if v_channel is not null and v_channel not in ('direct','agent','reseller','gift','other') then
    v_channel := 'other';
  end if;

  while i < v_quantity loop
    v_code := v_prefix || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
    begin
      insert into public.business_activation_codes (
        code, status, sku, product_line, product_label, batch_label,
        public_url, sold_channel, assigned_agent_id
      )
      values (
        v_code,
        'available',
        v_sku,
        v_line,
        coalesce(v_label, coalesce(v_sku, 'KhamaKey Business') || ' ' || v_code),
        v_batch,
        '/k/' || lower(v_code),
        v_channel,
        v_agent
      );
      i := i + 1;
      out_code := v_code;
      public_slug := null;
      sku := v_sku;
      product_line := v_line;
      batch_label := v_batch;
      public_url := '/k/' || lower(v_code);
      sold_channel := v_channel;
      assigned_agent_id := v_agent;
      return next;
    exception when unique_violation then
      null;
    end;
  end loop;
end
$$;

revoke all on function public.create_business_product_batch(integer,text,text,text,text,text,text,uuid) from public, anon;
grant execute on function public.create_business_product_batch(integer,text,text,text,text,text,text,uuid) to authenticated;

create or replace function public.get_business_product_inventory_stats()
returns table (
  sku text,
  product_line text,
  batch_label text,
  total_count bigint,
  available_count bigint,
  claimed_count bigint,
  paused_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    coalesce(bac.sku, 'non_specificato') as sku,
    coalesce(bac.product_line, 'non_specificato') as product_line,
    coalesce(bac.batch_label, 'senza_lotto') as batch_label,
    count(*)::bigint as total_count,
    count(*) filter (where bac.status = 'available')::bigint as available_count,
    count(*) filter (where bac.status = 'claimed')::bigint as claimed_count,
    count(*) filter (where bac.status = 'paused')::bigint as paused_count
  from public.business_activation_codes bac
  group by 1, 2, 3
  order by max(bac.created_at) desc nulls last, 1, 2
$$;

revoke all on function public.get_business_product_inventory_stats() from public, anon;
grant execute on function public.get_business_product_inventory_stats() to authenticated;

create or replace function public.bulk_update_business_activation_codes(
  p_codes text[],
  p_status text default null,
  p_sold_channel text default null,
  p_assigned_agent_id uuid default null,
  p_platform_order_id uuid default null,
  p_clear_agent boolean default false,
  p_clear_order boolean default false
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  if not (
    app_private.current_user_has_platform_permission('inventory.write')
    or app_private.current_user_has_platform_permission('admin.full')
  ) then
    raise exception 'Permesso inventory.write richiesto.';
  end if;

  update public.business_activation_codes bac
  set
    status = coalesce(nullif(trim(p_status), ''), bac.status),
    sold_channel = case
      when p_sold_channel is not null then nullif(trim(p_sold_channel), '')
      else bac.sold_channel
    end,
    assigned_agent_id = case
      when p_clear_agent then null
      when p_assigned_agent_id is not null then p_assigned_agent_id
      else bac.assigned_agent_id
    end,
    platform_order_id = case
      when p_clear_order then null
      when p_platform_order_id is not null then p_platform_order_id
      else bac.platform_order_id
    end,
    updated_at = now()
  where bac.code = any (
    select upper(regexp_replace(code, '[^A-Za-z0-9]', '', 'g'))
    from unnest(coalesce(p_codes, array[]::text[])) as code
  )
    and bac.status <> 'claimed';

  get diagnostics v_count = row_count;
  return v_count;
end
$$;

revoke all on function public.bulk_update_business_activation_codes(text[],text,text,uuid,uuid,boolean,boolean) from public, anon;
grant execute on function public.bulk_update_business_activation_codes(text[],text,text,uuid,uuid,boolean,boolean) to authenticated;

-- Provisioning admin: attiva codice su account Business esistente (per email)
create or replace function public.activate_business_code_for_user(
  p_user_id uuid,
  p_email text,
  p_code text,
  p_business_name text default null
)
returns table (
  business_id uuid,
  slug text,
  code text,
  nfc_url text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := p_user_id;
  v_email text := lower(trim(coalesce(p_email, '')));
  v_code text := upper(regexp_replace(coalesce(p_code,''), '[^A-Za-z0-9]', '', 'g'));
  v_name text := nullif(trim(coalesce(p_business_name,'')), '');
  v_status text;
  v_owner_email text;
  v_claimed_business uuid;
  v_business_id uuid;
  v_slug text;
  v_nfc_url text;
  v_worker_base text := 'https://khamakey-nfc.khamakey-nfc.workers.dev';
begin
  if v_user_id is null or v_email is null or v_email = '' then
    raise exception 'Utente non valido.';
  end if;
  if v_code !~ '^[A-Z0-9]{8,32}$' then
    raise exception 'Codice prodotto non valido (8-32 caratteri).';
  end if;

  select bac.status, lower(bac.claimed_by_email), bac.claimed_business_id
    into v_status, v_owner_email, v_claimed_business
  from public.business_activation_codes bac
  where bac.code = v_code
  limit 1;

  if v_status is null then
    raise exception 'Codice non presente nell inventario KhamaKey Business.';
  end if;
  if v_status in ('paused','archived') then
    raise exception 'Questo codice non e attivabile.';
  end if;

  if v_status = 'claimed' then
    if v_owner_email is not null and v_owner_email <> v_email then
      raise exception 'Questo codice e gia collegato a un altro account.';
    end if;
    if v_claimed_business is not null then
      select b.id, b.slug, n.url
        into v_business_id, v_slug, v_nfc_url
      from public.businesses b
      left join public.nfc_tags n on n.business_id = b.id and upper(n.code) = v_code
      where b.id = v_claimed_business and b.profile_id = v_user_id;
      if v_business_id is not null then
        return query select v_business_id, v_slug, v_code, coalesce(v_nfc_url, v_worker_base || '/k/' || v_code);
        return;
      end if;
    end if;
  end if;

  select b.id, b.slug, n.url
    into v_business_id, v_slug, v_nfc_url
  from public.businesses b
  left join public.nfc_tags n on n.business_id = b.id
  where b.profile_id = v_user_id
  order by b.created_at asc
  limit 1;

  if v_business_id is null then
    if v_name is null then
      raise exception 'Inserisci il nome attivita.';
    end if;
    v_slug := lower(regexp_replace(v_name, '[^a-zA-Z0-9]+', '-', 'g'));
    v_slug := trim(both '-' from v_slug);
    if v_slug = '' then v_slug := 'attivita'; end if;
    v_slug := v_slug || '-' || lower(substr(replace(v_user_id::text,'-',''),1,6));
    while exists (select 1 from public.businesses bx where bx.slug = v_slug) loop
      v_slug := v_slug || '-' || lower(substr(replace(gen_random_uuid()::text,'-',''),1,4));
    end loop;

    insert into public.profiles (id, email, tipo, nome)
    values (v_user_id, v_email, 'b2b', v_name)
    on conflict (id) do update set email = excluded.email, updated_at = now();

    insert into public.businesses (profile_id, nome, slug, categoria, pubblicato)
    values (v_user_id, v_name, v_slug, 'Azienda', true)
    returning id, slug into v_business_id, v_slug;

    insert into public.business_editor_states (business_id, profile_id, state)
    values (v_business_id, v_user_id, '{}'::jsonb)
    on conflict (business_id) do nothing;

    insert into public.business_public_pages (business_id, profile_id, slug, state, published)
    values (v_business_id, v_user_id, v_slug, '{}'::jsonb, true)
    on conflict (business_id) do nothing;
  else
    v_slug := coalesce(v_slug, 'pagina-' || lower(substr(replace(v_business_id::text,'-',''),1,6)));
  end if;

  v_nfc_url := v_worker_base || '/k/' || v_code;

  update public.nfc_tags n
  set business_id = v_business_id,
      profile_id = v_user_id,
      stato = 'attivo',
      url = v_nfc_url
  where upper(n.code) = v_code;

  if not exists (select 1 from public.nfc_tags n where n.business_id = v_business_id and upper(n.code) = v_code) then
    insert into public.nfc_tags (business_id, profile_id, stato, code, url)
    values (v_business_id, v_user_id, 'attivo', v_code, v_nfc_url);
  end if;

  update public.business_activation_codes bac
  set status = 'claimed',
      claimed_by_email = v_email,
      claimed_business_id = v_business_id,
      claimed_at = coalesce(bac.claimed_at, now()),
      public_slug = coalesce(bac.public_slug, v_slug),
      updated_at = now()
  where bac.code = v_code;

  update public.businesses
  set pubblicato = true, updated_at = now()
  where id = v_business_id;

  return query select v_business_id, v_slug, v_code, v_nfc_url;
end;
$$;

revoke all on function public.activate_business_code_for_user(uuid,text,text,text) from public, anon;
grant execute on function public.activate_business_code_for_user(uuid,text,text,text) to authenticated;

create or replace function public.activate_business_code(
  p_code text,
  p_business_name text default null
)
returns table (
  business_id uuid,
  slug text,
  code text,
  nfc_url text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Accesso richiesto.';
  end if;
  return query
  select * from public.activate_business_code_for_user(
    auth.uid(),
    lower(auth.jwt() ->> 'email'),
    p_code,
    p_business_name
  );
end;
$$;

revoke all on function public.activate_business_code(text,text) from public, anon;
grant execute on function public.activate_business_code(text,text) to authenticated;

create or replace function public.admin_provision_business_customer(
  p_email text,
  p_business_name text default null,
  p_code text default null
)
returns table (
  account_email text,
  business_id uuid,
  slug text,
  code text,
  nfc_url text,
  status_message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_name text := nullif(trim(coalesce(p_business_name, '')), '');
  v_code text := upper(regexp_replace(coalesce(p_code,''), '[^A-Za-z0-9]', '', 'g'));
  v_user_id uuid;
  v_row record;
begin
  if not (
    app_private.current_user_has_platform_permission('pages.write')
    or app_private.current_user_has_platform_permission('inventory.write')
    or app_private.current_user_has_platform_permission('admin.full')
  ) then
    raise exception 'Permesso pages.write o inventory.write richiesto.';
  end if;
  if v_email is null or v_email = '' then
    raise exception 'Email cliente obbligatoria.';
  end if;

  select p.id into v_user_id
  from public.profiles p
  where lower(p.email) = v_email
  limit 1;

  if v_user_id is null then
    account_email := v_email;
    business_id := null;
    slug := null;
    code := null;
    nfc_url := null;
    status_message := 'Account non trovato. Il cliente deve registrarsi su Business con il codice, poi puoi gestirlo da qui.';
    return next;
    return;
  end if;

  if v_code is null or v_code = '' then
    select b.id, b.slug into business_id, slug
    from public.businesses b
    where b.profile_id = v_user_id
    order by b.created_at asc
    limit 1;
    account_email := v_email;
    code := null;
    nfc_url := null;
    status_message := case
      when business_id is not null then 'Account trovato con attività esistente.'
      else 'Account trovato senza attività — inserisci un codice NFC da attivare.'
    end;
    return next;
    return;
  end if;

  select * into v_row
  from public.activate_business_code_for_user(v_user_id, v_email, v_code, v_name) as t
  limit 1;

  account_email := v_email;
  business_id := v_row.business_id;
  slug := v_row.slug;
  code := v_row.code;
  nfc_url := v_row.nfc_url;
  status_message := 'Codice attivato e pagina collegata.';
  return next;
end;
$$;

revoke all on function public.admin_provision_business_customer(text,text,text) from public, anon;
grant execute on function public.admin_provision_business_customer(text,text,text) to authenticated;
