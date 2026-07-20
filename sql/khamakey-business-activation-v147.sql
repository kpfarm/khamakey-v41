-- KhamaKey v147 — attivazione codice Business (come Moments)
-- Tabella inventario codici NFC business + RPC activate_business_code

create table if not exists public.business_activation_codes (
  code text primary key,
  status text not null default 'available'
    check (status in ('available','claimed','paused','archived')),
  public_slug text,
  claimed_by_email text,
  claimed_business_id uuid references public.businesses(id) on delete set null,
  claimed_at timestamptz,
  batch_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_activation_codes_status_idx
  on public.business_activation_codes(status);

alter table public.business_activation_codes enable row level security;

-- Seed codici già attivi da nfc_tags esistenti
insert into public.business_activation_codes (code, status, claimed_by_email, claimed_business_id, claimed_at)
select upper(n.code), 'claimed', lower(p.email), n.business_id, coalesce(n.created_at, now())
from public.nfc_tags n
join public.businesses b on b.id = n.business_id
join public.profiles p on p.id = b.profile_id
where n.code is not null and n.code <> ''
on conflict (code) do update set
  status = excluded.status,
  claimed_by_email = excluded.claimed_by_email,
  claimed_business_id = excluded.claimed_business_id,
  claimed_at = coalesce(public.business_activation_codes.claimed_at, excluded.claimed_at),
  updated_at = now();

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
declare
  v_user_id uuid := auth.uid();
  v_email text := lower(auth.jwt() ->> 'email');
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
    raise exception 'Accesso richiesto.';
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

  insert into public.nfc_tags (business_id, profile_id, stato, code, url)
  values (v_business_id, v_user_id, 'attivo', v_code, v_nfc_url)
  on conflict do nothing;

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

revoke all on function public.activate_business_code(text,text) from public;
revoke all on function public.activate_business_code(text,text) from anon;
grant execute on function public.activate_business_code(text,text) to authenticated;
