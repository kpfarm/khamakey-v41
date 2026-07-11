-- KhamaKey v74 - Business analytics: RPC aggregata per editor + owner read affidabile
-- Corregge conteggi oltre il limite client (1000 righe) e centralizza la logica.

create or replace function public.get_business_analytics(p_business_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  cutoff timestamptz := now() - interval '30 days';
  visits bigint;
  visits30 bigint;
  interactions bigint;
  interactions30 bigint;
  devices jsonb;
  sources jsonb;
  last_events jsonb;
begin
  if p_business_id is null then
    raise exception 'business id required';
  end if;

  if not exists (
    select 1
    from public.businesses b
    where b.id = p_business_id
      and (
        b.profile_id = auth.uid()
        or app_private.current_user_has_platform_permission('analytics.read')
        or app_private.current_user_has_platform_permission('pages.read')
        or app_private.current_user_has_platform_permission('admin.full')
      )
  ) then
    raise exception 'not authorized';
  end if;

  select count(distinct visitor_id)
  into visits
  from public.analytics_events
  where business_id = p_business_id
    and tipo = 'page_view'
    and coalesce(visitor_id, '') <> '';

  select count(distinct visitor_id)
  into visits30
  from public.analytics_events
  where business_id = p_business_id
    and tipo = 'page_view'
    and created_at >= cutoff
    and coalesce(visitor_id, '') <> '';

  select coalesce(sum(case when tipo in (
    'click_whatsapp','click_phone','click_maps','click_reviews',
    'click_booking','click_catalog','add_to_cart','order_sent'
  ) then 1 else 0 end), 0)
  into interactions
  from public.analytics_events
  where business_id = p_business_id;

  select coalesce(sum(case when tipo in (
    'click_whatsapp','click_phone','click_maps','click_reviews',
    'click_booking','click_catalog','add_to_cart','order_sent'
  ) then 1 else 0 end), 0)
  into interactions30
  from public.analytics_events
  where business_id = p_business_id
    and created_at >= cutoff;

  select coalesce(jsonb_object_agg(device_key, device_count), '{}'::jsonb)
  into devices
  from (
    select coalesce(nullif(dispositivo, ''), 'unknown') as device_key, count(*) as device_count
    from public.analytics_events
    where business_id = p_business_id
      and tipo = 'page_view'
    group by 1
    order by device_count desc
    limit 6
  ) d;

  select coalesce(jsonb_object_agg(source_key, source_count), '{}'::jsonb)
  into sources
  from (
    select coalesce(nullif(source, ''), 'unknown') as source_key, count(*) as source_count
    from public.analytics_events
    where business_id = p_business_id
      and tipo in ('page_view', 'nfc_tap')
    group by 1
    order by source_count desc
    limit 6
  ) s;

  select coalesce(jsonb_agg(row_to_json(e)::jsonb), '[]'::jsonb)
  into last_events
  from (
    select
      tipo as type,
      coalesce(dispositivo, '') as device,
      coalesce(source, '') as source,
      created_at
    from public.analytics_events
    where business_id = p_business_id
    order by created_at desc
    limit 12
  ) e;

  return jsonb_build_object(
    'nfc', (select count(*) from public.analytics_events where business_id = p_business_id and tipo = 'nfc_tap'),
    'pageViews', (select count(*) from public.analytics_events where business_id = p_business_id and tipo = 'page_view'),
    'visits', visits,
    'whatsapp', (select count(*) from public.analytics_events where business_id = p_business_id and tipo = 'click_whatsapp'),
    'phone', (select count(*) from public.analytics_events where business_id = p_business_id and tipo = 'click_phone'),
    'maps', (select count(*) from public.analytics_events where business_id = p_business_id and tipo = 'click_maps'),
    'reviews', (select count(*) from public.analytics_events where business_id = p_business_id and tipo = 'click_reviews'),
    'booking', (select count(*) from public.analytics_events where business_id = p_business_id and tipo = 'click_booking'),
    'catalog', (select count(*) from public.analytics_events where business_id = p_business_id and tipo = 'click_catalog'),
    'addToCart', (select count(*) from public.analytics_events where business_id = p_business_id and tipo = 'add_to_cart'),
    'orders', (select count(*) from public.analytics_events where business_id = p_business_id and tipo = 'order_sent'),
    'interactions', interactions,
    'interactionsPer100Visitors', case when visits > 0 then round((interactions::numeric / visits) * 1000) / 10 else 0 end,
    'last30', jsonb_build_object(
      'nfc', (select count(*) from public.analytics_events where business_id = p_business_id and tipo = 'nfc_tap' and created_at >= cutoff),
      'pageViews', (select count(*) from public.analytics_events where business_id = p_business_id and tipo = 'page_view' and created_at >= cutoff),
      'visits', visits30,
      'whatsapp', (select count(*) from public.analytics_events where business_id = p_business_id and tipo = 'click_whatsapp' and created_at >= cutoff),
      'phone', (select count(*) from public.analytics_events where business_id = p_business_id and tipo = 'click_phone' and created_at >= cutoff),
      'maps', (select count(*) from public.analytics_events where business_id = p_business_id and tipo = 'click_maps' and created_at >= cutoff),
      'reviews', (select count(*) from public.analytics_events where business_id = p_business_id and tipo = 'click_reviews' and created_at >= cutoff),
      'booking', (select count(*) from public.analytics_events where business_id = p_business_id and tipo = 'click_booking' and created_at >= cutoff),
      'catalog', (select count(*) from public.analytics_events where business_id = p_business_id and tipo = 'click_catalog' and created_at >= cutoff),
      'addToCart', (select count(*) from public.analytics_events where business_id = p_business_id and tipo = 'add_to_cart' and created_at >= cutoff),
      'orders', (select count(*) from public.analytics_events where business_id = p_business_id and tipo = 'order_sent' and created_at >= cutoff),
      'interactions', interactions30
    ),
    'devices', coalesce(devices, '{}'::jsonb),
    'sources', coalesce(sources, '{}'::jsonb),
    'lastEvents', coalesce(last_events, '[]'::jsonb),
    'updatedAt', to_jsonb(now())
  );
end;
$function$;

revoke all on function public.get_business_analytics(uuid) from public;
grant execute on function public.get_business_analytics(uuid) to authenticated;
