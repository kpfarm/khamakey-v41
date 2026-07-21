-- v166 — FIX urgente: ripristina USAGE su app_private
-- Causa: v165 aveva `revoke all on schema app_private from … authenticated`
-- Effetto: admin Moments non poteva generare stock (create_moment_product_batch / RLS helpers).
-- Sicurezza: la tabella secrets resta senza grant ad anon/authenticated.

grant usage on schema app_private to authenticated, service_role;

revoke all on table app_private.khamakey_secrets from public, anon, authenticated;
grant select, insert, update on table app_private.khamakey_secrets to postgres, service_role;

grant execute on function public.create_moment_product_batch(integer, text, text, text, text, text, uuid) to authenticated;
revoke all on function public.create_moment_product_batch(integer, text, text, text, text, text, uuid) from anon, public;
