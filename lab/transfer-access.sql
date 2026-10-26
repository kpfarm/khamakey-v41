-- Dedicated laboratory only. Original ownership guards remain mandatory.
begin;
do $$ begin if position('Business analytics disabled in laboratory' in pg_get_functiondef('public.track_business_event'::regproc))=0 then raise exception 'Not laboratory';end if;end $$;
grant execute on function public.request_moment_ownership_transfer(uuid,text),
 public.cancel_moment_ownership_transfer(uuid),public.get_moment_ownership_transfer(uuid),
 public.accept_moment_ownership_transfer(text),public.decline_moment_ownership_transfer(text) to authenticated;
grant execute on function public.peek_moment_ownership_transfer(text) to anon, authenticated;
commit;
