-- KhamaKey v77 — Pulizia periodica tabelle di rate limiting (v75/v76)
-- Applica dopo v76 su Supabase. Idempotente.
--
-- moment_pin_attempts e platform_rate_limits accumulano una riga per slug/visitatore o per
-- bucket_key: senza pulizia crescono senza limite. cleanup_rate_limit_tables() rimuove solo le
-- righe scadute da oltre un giorno e non più in lockout attivo — stesso pattern ingest-key già
-- usato per i cron esistenti (anniversari, lettera al futuro).

create or replace function public.cleanup_rate_limit_tables(p_ingest_key text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text := nullif(trim(coalesce(p_ingest_key, '')), '');
  v_expected text := nullif(trim(coalesce(current_setting('app.khamakey_webhook_ingest_key', true), '')), '');
  v_pin_deleted integer;
  v_rate_deleted integer;
begin
  if v_expected is null or v_key is distinct from v_expected then
    raise exception 'Chiave ingest non valida.';
  end if;

  delete from public.moment_pin_attempts
  where window_start < now() - interval '1 day'
    and (locked_until is null or locked_until < now());
  get diagnostics v_pin_deleted = row_count;

  delete from public.platform_rate_limits
  where window_start < now() - interval '1 day'
    and (locked_until is null or locked_until < now());
  get diagnostics v_rate_deleted = row_count;

  return jsonb_build_object(
    'ok', true,
    'pin_attempts_deleted', v_pin_deleted,
    'rate_limits_deleted', v_rate_deleted
  );
end;
$$;

revoke all on function public.cleanup_rate_limit_tables(text) from public;
grant execute on function public.cleanup_rate_limit_tables(text) to anon, authenticated;
