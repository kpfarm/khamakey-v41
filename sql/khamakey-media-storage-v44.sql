-- KhamaKey v44 - Supabase Storage per media clienti (Moments + Business)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'khamakey-media',
  'khamakey-media',
  true,
  8388608,
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Lettura pubblica (pagine NFC / worker)
drop policy if exists khamakey_media_public_read on storage.objects;
create policy khamakey_media_public_read on storage.objects
for select
to public
using (bucket_id = 'khamakey-media');

-- Moments: proprietario evento
drop policy if exists khamakey_media_moments_insert on storage.objects;
create policy khamakey_media_moments_insert on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'khamakey-media'
  and (storage.foldername(name))[1] = 'moments'
  and exists (
    select 1 from public.moment_events me
    where me.id::text = (storage.foldername(name))[2]
      and lower(me.owner_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

drop policy if exists khamakey_media_moments_update on storage.objects;
create policy khamakey_media_moments_update on storage.objects
for update
to authenticated
using (
  bucket_id = 'khamakey-media'
  and (storage.foldername(name))[1] = 'moments'
  and exists (
    select 1 from public.moment_events me
    where me.id::text = (storage.foldername(name))[2]
      and lower(me.owner_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

drop policy if exists khamakey_media_moments_delete on storage.objects;
create policy khamakey_media_moments_delete on storage.objects
for delete
to authenticated
using (
  bucket_id = 'khamakey-media'
  and (storage.foldername(name))[1] = 'moments'
  and exists (
    select 1 from public.moment_events me
    where me.id::text = (storage.foldername(name))[2]
      and lower(me.owner_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

-- Business: proprietario attività
drop policy if exists khamakey_media_business_insert on storage.objects;
create policy khamakey_media_business_insert on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'khamakey-media'
  and (storage.foldername(name))[1] = 'business'
  and exists (
    select 1 from public.businesses b
    where b.id::text = (storage.foldername(name))[2]
      and b.profile_id = auth.uid()
  )
);

drop policy if exists khamakey_media_business_update on storage.objects;
create policy khamakey_media_business_update on storage.objects
for update
to authenticated
using (
  bucket_id = 'khamakey-media'
  and (storage.foldername(name))[1] = 'business'
  and exists (
    select 1 from public.businesses b
    where b.id::text = (storage.foldername(name))[2]
      and b.profile_id = auth.uid()
  )
);

drop policy if exists khamakey_media_business_delete on storage.objects;
create policy khamakey_media_business_delete on storage.objects
for delete
to authenticated
using (
  bucket_id = 'khamakey-media'
  and (storage.foldername(name))[1] = 'business'
  and exists (
    select 1 from public.businesses b
    where b.id::text = (storage.foldername(name))[2]
      and b.profile_id = auth.uid()
  )
);

-- Admin piattaforma (supporto clienti)
drop policy if exists khamakey_media_admin_insert on storage.objects;
create policy khamakey_media_admin_insert on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'khamakey-media'
  and (
    app_private.current_user_has_platform_permission('moments.write')
    or app_private.current_user_has_platform_permission('admin.full')
  )
);

drop policy if exists khamakey_media_admin_update on storage.objects;
create policy khamakey_media_admin_update on storage.objects
for update
to authenticated
using (
  bucket_id = 'khamakey-media'
  and (
    app_private.current_user_has_platform_permission('moments.write')
    or app_private.current_user_has_platform_permission('admin.full')
  )
);

drop policy if exists khamakey_media_admin_delete on storage.objects;
create policy khamakey_media_admin_delete on storage.objects
for delete
to authenticated
using (
  bucket_id = 'khamakey-media'
  and (
    app_private.current_user_has_platform_permission('moments.write')
    or app_private.current_user_has_platform_permission('admin.full')
  )
);
