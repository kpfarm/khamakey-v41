-- KhamaKey v180
-- I visitatori (ruolo anon) non possono più chiamare le funzioni di staff,
-- contatori file e commissioni. NFC, pagina pubblica, RSVP, guestbook,
-- anniversari e webhook restano chiamabili: il Worker le usa con la chiave pubblica.
-- authenticated e service_role restano.

revoke execute on function public.apply_moment_plan(uuid, text) from anon;
revoke execute on function public.distribute_network_commissions(uuid, text, text, numeric, uuid, text) from anon;
revoke execute on function public.get_business_analytics(uuid) from anon;
revoke execute on function public.get_moment_entitlements(uuid) from anon;
revoke execute on function public.record_agent_delivery(uuid, text, text, text, integer, numeric, text, uuid, text, text) from anon;
revoke execute on function public.record_moment_media_bytes(uuid, bigint, integer) from anon;
revoke execute on function public.set_moment_media_usage(uuid, bigint, integer) from anon;
revoke execute on function public.trg_apply_order_commissions() from anon, public;
