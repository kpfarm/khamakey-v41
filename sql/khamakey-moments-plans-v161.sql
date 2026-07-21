-- KhamaKey Moments v161
-- Piani Free / Plus / Pro per prodotto: storage + limiti contenuti.
-- Stripe price ID restano null — collegamento pagamento in seguito.
-- apply_moment_plan aggiorna solo plan_key: editor e Worker rileggono i limiti.

-- 1) Colonna piano su evento (prodotto / pezzo NFC)
alter table public.moment_events
  add column if not exists plan_key text not null default 'moments_free';

create index if not exists moment_events_plan_key_idx
  on public.moment_events (plan_key);

comment on column public.moment_events.plan_key is
  'Entitlement Moments: moments_free | moments_plus | moments_pro. Indipendente da moment_type (categoria).';

-- 2) Contatore storage R2 per evento
create table if not exists public.moment_media_usage (
  event_id uuid primary key references public.moment_events(id) on delete cascade,
  bytes_used bigint not null default 0 check (bytes_used >= 0),
  file_count integer not null default 0 check (file_count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.moment_media_usage enable row level security;

drop policy if exists moment_media_usage_select_owner on public.moment_media_usage;
create policy moment_media_usage_select_owner
  on public.moment_media_usage
  for select
  to authenticated
  using (
    exists (
      select 1 from public.moment_events me
      where me.id = moment_media_usage.event_id
        and (
          lower(me.owner_email) = lower((select auth.jwt() ->> 'email'))
          or app_private.current_user_has_platform_permission('moments.read')
          or app_private.current_user_has_platform_permission('moments.write')
          or app_private.current_user_has_platform_permission('admin.full')
        )
    )
  );

-- Scritture solo via RPC security definer
revoke insert, update, delete on public.moment_media_usage from anon, authenticated;
grant select on public.moment_media_usage to authenticated;

-- 3) Seed piani Moments (non tocca i piani Business esistenti)
insert into public.platform_plans (
  plan_key, name, description,
  price_monthly, price_yearly, setup_fee,
  features, limits, sort_order, active, public_visible
) values
(
  'moments_free',
  'Moments Free',
  'Incluso con il pezzo NFC. Spazio e contenuti base per un Moment completo.',
  0, 0, 0,
  array[
    '250 MB di spazio per prodotto',
    'Fino a 24 foto in galleria',
    '1 video e 1 audio',
    'Lettera al futuro con allegati base'
  ],
  '{
    "product":"moments",
    "storage_mb":250,
    "gallery_images":24,
    "video_clips":1,
    "music_audio":1,
    "letter_images":2,
    "letter_videos":1,
    "letter_audio":1,
    "letter_pdfs":1,
    "journey_steps":24,
    "max_image_mb":8,
    "max_video_mb":25,
    "max_audio_mb":12,
    "max_pdf_mb":15
  }'::jsonb,
  100, true, true
),
(
  'moments_plus',
  'Moments Plus',
  'Più foto, video e spazio per feste e matrimoni.',
  4.90, 39.00, 0,
  array[
    '1 GB di spazio per prodotto',
    'Fino a 48 foto in galleria',
    'Fino a 3 video e 4 audio',
    'Lettera al futuro arricchita + PDF'
  ],
  '{
    "product":"moments",
    "storage_mb":1024,
    "gallery_images":48,
    "video_clips":3,
    "music_audio":4,
    "letter_images":4,
    "letter_videos":2,
    "letter_audio":2,
    "letter_pdfs":3,
    "journey_steps":48,
    "max_image_mb":8,
    "max_video_mb":25,
    "max_audio_mb":12,
    "max_pdf_mb":15
  }'::jsonb,
  110, true, true
),
(
  'moments_pro',
  'Moments Pro',
  'Archivio ricco: tanti video, PDF e memoria estesa.',
  9.90, 79.00, 0,
  array[
    '3 GB di spazio per prodotto',
    'Fino a 100 foto in galleria',
    'Fino a 8 video e 10 audio',
    'Lettera al futuro completa + tanti PDF'
  ],
  '{
    "product":"moments",
    "storage_mb":3072,
    "gallery_images":100,
    "video_clips":8,
    "music_audio":10,
    "letter_images":8,
    "letter_videos":4,
    "letter_audio":4,
    "letter_pdfs":8,
    "journey_steps":100,
    "max_image_mb":8,
    "max_video_mb":25,
    "max_audio_mb":12,
    "max_pdf_mb":15
  }'::jsonb,
  120, true, true
)
on conflict (plan_key) do update set
  name = excluded.name,
  description = excluded.description,
  price_monthly = excluded.price_monthly,
  price_yearly = excluded.price_yearly,
  features = excluded.features,
  limits = excluded.limits,
  sort_order = excluded.sort_order,
  active = excluded.active,
  public_visible = excluded.public_visible,
  updated_at = now();

-- 4) Helper: limiti default Free se riga piano assente
create or replace function app_private.default_moments_plan_limits()
returns jsonb
language sql
immutable
as $$
  select '{
    "product":"moments",
    "storage_mb":250,
    "gallery_images":24,
    "video_clips":1,
    "music_audio":1,
    "letter_images":2,
    "letter_videos":1,
    "letter_audio":1,
    "letter_pdfs":1,
    "journey_steps":24,
    "max_image_mb":8,
    "max_video_mb":25,
    "max_audio_mb":12,
    "max_pdf_mb":15
  }'::jsonb
$$;

revoke all on function app_private.default_moments_plan_limits() from public;

create or replace function app_private.can_access_moment_event(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.moment_events me
    where me.id = p_event_id
      and (
        lower(coalesce(me.owner_email, '')) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
        or app_private.current_user_has_platform_permission('moments.read')
        or app_private.current_user_has_platform_permission('moments.write')
        or app_private.current_user_has_platform_permission('admin.full')
      )
  )
$$;

revoke all on function app_private.can_access_moment_event(uuid) from public;

-- 5) Entitlements per editor / Worker (JWT utente)
create or replace function public.get_moment_entitlements(p_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan_key text;
  v_limits jsonb;
  v_bytes bigint := 0;
  v_files integer := 0;
  v_name text;
  v_price_m numeric;
  v_price_y numeric;
begin
  if p_event_id is null then
    raise exception 'event_id obbligatorio';
  end if;
  if not app_private.can_access_moment_event(p_event_id) then
    raise exception 'Accesso non autorizzato';
  end if;

  select coalesce(nullif(trim(me.plan_key), ''), 'moments_free')
  into v_plan_key
  from public.moment_events me
  where me.id = p_event_id;

  if v_plan_key is null then
    raise exception 'Evento non trovato';
  end if;

  select pp.limits, pp.name, pp.price_monthly, pp.price_yearly
  into v_limits, v_name, v_price_m, v_price_y
  from public.platform_plans pp
  where pp.plan_key = v_plan_key
    and pp.active = true
  limit 1;

  if v_limits is null or coalesce(v_limits->>'product', '') <> 'moments' then
    v_plan_key := 'moments_free';
    v_limits := app_private.default_moments_plan_limits();
    v_name := 'Moments Free';
    v_price_m := 0;
    v_price_y := 0;
  end if;

  select coalesce(u.bytes_used, 0), coalesce(u.file_count, 0)
  into v_bytes, v_files
  from public.moment_media_usage u
  where u.event_id = p_event_id;

  return jsonb_build_object(
    'event_id', p_event_id,
    'plan_key', v_plan_key,
    'plan_name', coalesce(v_name, v_plan_key),
    'price_monthly', coalesce(v_price_m, 0),
    'price_yearly', coalesce(v_price_y, 0),
    'limits', v_limits,
    'bytes_used', coalesce(v_bytes, 0),
    'file_count', coalesce(v_files, 0),
    'storage_mb', coalesce((v_limits->>'storage_mb')::int, 250)
  );
end;
$$;

revoke all on function public.get_moment_entitlements(uuid) from public;
grant execute on function public.get_moment_entitlements(uuid) to authenticated;

-- 6) Aggiorna contatore byte (upload + / delete -)
create or replace function public.record_moment_media_bytes(
  p_event_id uuid,
  p_delta_bytes bigint,
  p_delta_files integer default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bytes bigint;
  v_files integer;
begin
  if p_event_id is null then
    raise exception 'event_id obbligatorio';
  end if;
  if not app_private.can_access_moment_event(p_event_id) then
    raise exception 'Accesso non autorizzato';
  end if;

  insert into public.moment_media_usage (event_id, bytes_used, file_count, updated_at)
  values (
    p_event_id,
    greatest(0, coalesce(p_delta_bytes, 0)),
    greatest(0, coalesce(p_delta_files, 0)),
    now()
  )
  on conflict (event_id) do update set
    bytes_used = greatest(0, public.moment_media_usage.bytes_used + coalesce(p_delta_bytes, 0)),
    file_count = greatest(0, public.moment_media_usage.file_count + coalesce(p_delta_files, 0)),
    updated_at = now()
  returning bytes_used, file_count into v_bytes, v_files;

  return jsonb_build_object(
    'event_id', p_event_id,
    'bytes_used', v_bytes,
    'file_count', v_files
  );
end;
$$;

revoke all on function public.record_moment_media_bytes(uuid, bigint, integer) from public;
grant execute on function public.record_moment_media_bytes(uuid, bigint, integer) to authenticated;

-- 7) Applica piano (admin ora; webhook Stripe dopo)
create or replace function public.apply_moment_plan(
  p_event_id uuid,
  p_plan_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text := lower(trim(coalesce(p_plan_key, '')));
  v_ok boolean;
begin
  if p_event_id is null or v_key = '' then
    raise exception 'event_id e plan_key obbligatori';
  end if;
  if not (
    app_private.current_user_has_platform_permission('moments.write')
    or app_private.current_user_has_platform_permission('admin.full')
  ) then
    raise exception 'Solo lo staff può cambiare il piano';
  end if;

  select exists (
    select 1 from public.platform_plans pp
    where pp.plan_key = v_key
      and pp.active = true
      and coalesce(pp.limits->>'product', '') = 'moments'
  ) into v_ok;

  if not v_ok then
    raise exception 'Piano Moments non valido: %', v_key;
  end if;

  update public.moment_events
  set plan_key = v_key
  where id = p_event_id;

  if not found then
    raise exception 'Evento non trovato';
  end if;

  return public.get_moment_entitlements(p_event_id);
end;
$$;

revoke all on function public.apply_moment_plan(uuid, text) from public;
grant execute on function public.apply_moment_plan(uuid, text) to authenticated;
