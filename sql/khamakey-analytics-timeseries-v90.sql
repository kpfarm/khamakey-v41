-- KhamaKey v90 — Analytics storiche: serie temporale giornaliera + confronto periodo precedente
-- Alimenta il grafico "andamento nel tempo" nell'editor/admin. Sola lettura, nessun dato toccato.
-- Stessi controlli di accesso di get_business_analytics (proprietario o permessi piattaforma).

create or replace function public.get_business_analytics_timeseries(
  p_business_id uuid,
  p_days integer default 30
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days integer := greatest(1, least(coalesce(p_days, 30), 365));
  v_start date := (now() - make_interval(days => v_days - 1))::date;
  v_prev_start date := (now() - make_interval(days => v_days * 2 - 1))::date;
  v_prev_end date := (now() - make_interval(days => v_days))::date;
  v_series jsonb;
  v_cur_visits bigint;
  v_prev_visits bigint;
  v_cur_interactions bigint;
  v_prev_interactions bigint;
begin
  if p_business_id is null then
    raise exception 'business id required';
  end if;
  if not exists (
    select 1 from public.businesses b
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

  -- Serie giornaliera: ogni giorno del periodo, anche quelli senza eventi (0).
  select coalesce(jsonb_agg(jsonb_build_object(
    'date', d.day,
    'pageViews', coalesce(e.page_views, 0),
    'visits', coalesce(e.visits, 0),
    'interactions', coalesce(e.interactions, 0)
  ) order by d.day), '[]'::jsonb)
  into v_series
  from generate_series(v_start, now()::date, interval '1 day') as d(day)
  left join (
    select
      created_at::date as day,
      count(*) filter (where tipo = 'page_view') as page_views,
      count(distinct visitor_id) filter (where tipo = 'page_view' and coalesce(visitor_id,'') <> '') as visits,
      count(*) filter (where tipo in ('click_whatsapp','click_phone','click_maps','click_reviews','click_booking','click_catalog','add_to_cart','order_sent')) as interactions
    from public.analytics_events
    where business_id = p_business_id
      and created_at::date >= v_start
    group by created_at::date
  ) e on e.day = d.day::date;

  -- Totali periodo corrente vs precedente (per il confronto "vs periodo scorso").
  select
    count(distinct visitor_id) filter (where tipo='page_view' and created_at::date >= v_start and coalesce(visitor_id,'')<>''),
    count(distinct visitor_id) filter (where tipo='page_view' and created_at::date >= v_prev_start and created_at::date <= v_prev_end and coalesce(visitor_id,'')<>''),
    count(*) filter (where tipo in ('click_whatsapp','click_phone','click_maps','click_reviews','click_booking','click_catalog','add_to_cart','order_sent') and created_at::date >= v_start),
    count(*) filter (where tipo in ('click_whatsapp','click_phone','click_maps','click_reviews','click_booking','click_catalog','add_to_cart','order_sent') and created_at::date >= v_prev_start and created_at::date <= v_prev_end)
  into v_cur_visits, v_prev_visits, v_cur_interactions, v_prev_interactions
  from public.analytics_events
  where business_id = p_business_id;

  return jsonb_build_object(
    'days', v_days,
    'series', v_series,
    'current', jsonb_build_object('visits', v_cur_visits, 'interactions', v_cur_interactions),
    'previous', jsonb_build_object('visits', v_prev_visits, 'interactions', v_prev_interactions)
  );
end;
$$;

revoke all on function public.get_business_analytics_timeseries(uuid, integer) from public, anon;
grant execute on function public.get_business_analytics_timeseries(uuid, integer) to authenticated;
