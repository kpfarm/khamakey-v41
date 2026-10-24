-- LAB ONLY: ybmnrtvksvndpdiofmqm. Never production.
begin;
do $$ begin
 if position('Business analytics disabled in laboratory' in pg_get_functiondef('public.track_business_event'::regproc)) = 0 then
  raise exception 'Dedicated laboratory marker missing';
 end if;
end $$;
alter default privileges in schema public revoke execute on functions from PUBLIC, anon, authenticated;
alter default privileges in schema app_private revoke execute on functions from PUBLIC, anon, authenticated;
alter function app_private.default_moments_plan_limits() set search_path = pg_catalog;
alter function app_private.random_moment_public_slug(integer) set search_path = pg_catalog;
alter function public.moment_page_editor_cap() set search_path = pg_catalog;
grant usage on schema public to anon, authenticated;
grant usage on schema app_private to authenticated;
grant execute on function app_private.current_user_has_platform_permission(text),
 app_private.current_user_is_platform_admin(),
 app_private.moment_jwt_is_accepted_member(uuid) to authenticated;
-- Read only; all existing RLS policies retained. No direct writes.
grant select on public.platform_members, public.moment_events, public.moment_pages,
 public.moment_activation_codes, public.moment_media_usage to authenticated;
-- Public lookup/PIN and upload limiter only. No integration or ingestion RPC.
grant execute on function public.get_public_moment(text,text,text),
 public.get_moment_activation_page(text), public.peek_moment_activation_code(text),
 public.resolve_khamakey_code(text), public.check_rate_limit(text,integer,integer,integer) to anon, authenticated;
-- Owned-event operations retain their internal ownership checks.
-- Batch generation retains moments.write/admin.full check.
grant execute on function public.list_my_moment_events(),public.get_moment_entitlements(uuid),
 public.moment_can_edit_event(uuid),
 public.save_my_moment_page(uuid,text,text,text,jsonb,boolean,boolean,text,timestamp with time zone),
 public.activate_moment_code(text,text,text,text,text),
 public.set_moment_media_usage(uuid,bigint,integer),
 public.record_moment_media_bytes(uuid,bigint,integer),
 public.create_moment_product_batch(integer,text,text,text,text,text,uuid) to authenticated;
commit;
