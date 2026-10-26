-- Dedicated lab only. No email delivery or broad table grants.
begin;
do $$ begin if position('Business analytics disabled in laboratory' in pg_get_functiondef('public.track_business_event'::regproc))=0 then raise exception 'Not laboratory';end if;end $$;
grant execute on function public.invite_moment_page_editor(uuid,text),
 public.list_moment_page_editors(uuid),public.accept_moment_page_invite(text),
 public.revoke_moment_page_editor(uuid,text) to authenticated;
grant execute on function public.peek_moment_page_invite(text) to anon, authenticated;
commit;