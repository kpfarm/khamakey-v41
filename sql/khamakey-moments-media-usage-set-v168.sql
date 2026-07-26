-- v168 — Imposta usage media Moments in modo assoluto (sync da R2)
-- Usato dal Worker dopo upload/delete e da POST /api/media/usage-sync.
-- Non cancella dati utente: solo aggiorna contatori in moment_media_usage.

create or replace function public.set_moment_media_usage(
  p_event_id uuid,
  p_bytes_used bigint,
  p_file_count integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bytes bigint;
  v_files integer;
begin
  if p_event_id is null then
    raise exception 'event_id obbligatorio';
  end if;
  if not app_private.can_access_moment_event(p_event_id) then
    raise exception 'Accesso non autorizzato';
  end if;

  v_bytes := greatest(0, coalesce(p_bytes_used, 0));
  v_files := greatest(0, coalesce(p_file_count, 0));

  insert into public.moment_media_usage (event_id, bytes_used, file_count, updated_at)
  values (p_event_id, v_bytes, v_files, now())
  on conflict (event_id) do update set
    bytes_used = excluded.bytes_used,
    file_count = excluded.file_count,
    updated_at = now()
  returning bytes_used, file_count into v_bytes, v_files;

  return jsonb_build_object(
    'event_id', p_event_id,
    'bytes_used', v_bytes,
    'file_count', v_files
  );
end;
$$;

revoke all on function public.set_moment_media_usage(uuid, bigint, integer) from public;
grant execute on function public.set_moment_media_usage(uuid, bigint, integer) to authenticated;
