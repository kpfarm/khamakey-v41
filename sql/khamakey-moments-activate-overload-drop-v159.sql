-- KhamaKey v159 — rimuove overload obsoleto di activate_moment_code (4 args senza pin)
-- PostgREST poteva risolvere la versione sbagliata; resta solo la firma a 5 argomenti (v157).

drop function if exists public.activate_moment_code(text, text, text, text);

revoke all on function public.activate_moment_code(text, text, text, text, text) from public;
revoke all on function public.activate_moment_code(text, text, text, text, text) from anon;
grant execute on function public.activate_moment_code(text, text, text, text, text) to authenticated;
