-- LAB ONLY. Synthetic identities and data, rolled back; no Auth user changes.
begin;
do $$ begin if position('Business analytics disabled in laboratory' in pg_get_functiondef('public.track_business_event'::regproc))=0 then raise exception 'Not laboratory'; end if; end $$;
insert into public.platform_members(email,role,status,permissions) values('staff@example.invalid','collaborator','active',array['moments.write']);
set local role authenticated;
select set_config('request.jwt.claims','{"email":"staff@example.invalid","role":"authenticated"}',true);
do $$ declare r record; begin
 select * into r from public.create_moment_product_batch(1,'LAB','free','LAB-ROLLBACK-ONLY');
 if length(r.out_code)<>12 or r.packaging_barcode !~ '^[0-9]{12}$' or lower(r.out_code)=lower(r.public_slug) then raise exception 'Batch code/slug/barcode contract failed';end if;
 if not exists(select 1 from public.moment_activation_codes where code=r.out_code and public_url='/m/'||r.public_slug) then raise exception 'Public URL mismatch';end if;
 perform set_config('lab.test_code',r.out_code,true);
end $$;
select set_config('request.jwt.claims','{"email":"owner-a@example.invalid","role":"authenticated"}',true);
do $$ declare r record; begin
 select * into r from public.activate_moment_code(current_setting('lab.test_code'),'LAB Page',null,'free','lab-pin-hash');
 perform set_config('lab.event_id',r.event_id::text,true);perform set_config('lab.slug',r.slug,true);
 perform public.save_my_moment_page(r.event_id,'LAB Saved','free','', '{"title":"LAB Saved","sections":{}}'::jsonb,true,true,'lab-pin-hash',null);
 if not exists(select 1 from public.moment_events where id=r.event_id and title='LAB Saved') then raise exception 'Owned save failed';end if;
end $$;
select set_config('request.jwt.claims','{"email":"owner-b@example.invalid","role":"authenticated"}',true);
do $$ declare denied boolean:=false; begin
 if exists(select 1 from public.moment_events where id=current_setting('lab.event_id')::uuid) then raise exception 'Cross-account select leak';end if;
 if public.moment_can_edit_event(current_setting('lab.event_id')::uuid) then raise exception 'Cross-account edit permitted';end if;
 begin perform public.save_my_moment_page(current_setting('lab.event_id')::uuid,'UNAUTHORIZED','free','', '{}'::jsonb,true,false,null,null);exception when others then
  if position('non trovato per questo account' in sqlerrm)>0 then denied:=true;else raise;end if;
 end;
 if not denied then raise exception 'Cross-account save accepted';end if;
end $$;
set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
do $$ declare r record; begin
 select * into r from public.get_public_moment(current_setting('lab.slug'),null,'lab-visitor');
 if not found then raise exception 'PIN-gated page missing';end if;
 if r.pin_valid or r.state is not null or r.title is not null then raise exception 'PIN content leak';end if;
 select * into r from public.get_public_moment(current_setting('lab.slug'),'lab-pin-hash','lab-visitor');
 if not found then raise exception 'PIN page missing';end if;
 if not r.pin_valid or r.title<>'LAB Saved' then raise exception 'Correct PIN failed';end if;
 if not exists(select 1 from public.resolve_khamakey_code(current_setting('lab.test_code')) where slug=current_setting('lab.slug')) then raise exception 'NFC resolution mismatch';end if;
end $$;
reset role;
rollback;