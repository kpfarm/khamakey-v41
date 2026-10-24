-- Transactional synthetic checks, dedicated lab only; always rollback.
begin;
do $$ begin
 if position('Business analytics disabled in laboratory' in pg_get_functiondef('public.track_business_event'::regproc))=0 then raise exception 'Not lab'; end if;
end $$;
insert into public.moment_events(title,slug,owner_email,status) values
 ('LAB owner A','lab-test-isolation-a','owner-a@example.invalid','active'),
 ('LAB owner B','lab-test-isolation-b','owner-b@example.invalid','active');
set local role authenticated;
select set_config('request.jwt.claims','{"email":"owner-a@example.invalid","role":"authenticated"}',true);
do $$ declare v_other uuid; v_rejected boolean:=false; begin
 if (select count(*) from public.moment_events where slug like 'lab-test-isolation-%')<>1 then raise exception 'RLS isolation failed'; end if;
 if (select count(*) from public.list_my_moment_events() where slug like 'lab-test-isolation-%')<>1 then raise exception 'RPC isolation failed'; end if;
 if exists(select 1 from public.moment_events where slug='lab-test-isolation-b') then raise exception 'Other owner visible'; end if;
 begin perform public.create_moment_product_batch(1); exception when others then
  if position('Permesso moments.write richiesto' in sqlerrm)>0 then v_rejected:=true; else raise; end if;
 end;
 if not v_rejected then raise exception 'Customer can generate batch'; end if;
 if has_table_privilege(current_user,'public.moment_events','UPDATE') then raise exception 'Direct write granted'; end if;
 if has_function_privilege(current_user,'public.erase_my_moment_account(text)','EXECUTE') then raise exception 'Erase RPC open'; end if;
end $$;
reset role;
rollback;