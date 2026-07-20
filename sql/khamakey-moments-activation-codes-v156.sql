-- KhamaKey v156 — codici attivazione Moments leggibili + barcode confezione separato
-- Attivazione: 12 caratteri alfanumerici (alfabeto senza O/0/I/1/L) → es. M7K2-9XPL-H3WN
-- Barcode confezione: 12 cifre numeriche solo magazzino (scan etichetta)

alter table public.moment_activation_codes
  add column if not exists packaging_barcode text;

create unique index if not exists moment_activation_codes_packaging_barcode_uidx
  on public.moment_activation_codes(packaging_barcode)
  where packaging_barcode is not null;

create or replace function app_private.random_moment_activation_code(p_len integer default 12)
returns text
language plpgsql
volatile
set search_path = public, app_private
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_len integer := least(32, greatest(4, coalesce(p_len, 12)));
  v_out text := '';
  i integer := 0;
begin
  while i < v_len loop
    v_out := v_out || substr(v_alphabet, (floor(random() * 32)::integer) + 1, 1);
    i := i + 1;
  end loop;
  return v_out;
end;
$$;

create or replace function app_private.random_moment_packaging_barcode()
returns text
language plpgsql
volatile
set search_path = public, app_private
as $$
declare
  v_out text;
begin
  loop
    v_out := lpad((floor(random() * 1000000000000)::bigint)::text, 12, '0');
    exit when v_out !~ '^0+$';
  end loop;
  return v_out;
end;
$$;

drop function if exists public.create_moment_product_batch(integer, text, text, text, text, text, uuid);

create or replace function public.create_moment_product_batch(
  p_quantity integer,
  p_prefix text default 'MOMENT',
  p_product_type text default 'free',
  p_batch_label text default null,
  p_product_line text default null,
  p_sold_channel text default null,
  p_assigned_agent_id uuid default null
)
returns table (
  out_code text,
  packaging_barcode text,
  public_slug text,
  product_type text,
  product_line text,
  batch_label text,
  sold_channel text,
  assigned_agent_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quantity integer := least(500, greatest(1, coalesce(p_quantity, 1)));
  v_type text := coalesce(nullif(p_product_type,''), 'free');
  v_line text := nullif(trim(coalesce(p_product_line,'')), '');
  v_batch text := nullif(trim(coalesce(p_batch_label,'')), '');
  v_channel text := nullif(trim(coalesce(p_sold_channel,'')), '');
  v_agent uuid := p_assigned_agent_id;
  v_code text;
  v_packaging text;
  v_slug text;
  i integer := 0;
begin
  if not (
    app_private.current_user_has_platform_permission('moments.write')
    or app_private.current_user_has_platform_permission('admin.full')
  ) then
    raise exception 'Permesso moments.write richiesto.';
  end if;
  if v_type not in ('free','wedding','party','travel','memory','memorial','portfolio') then
    v_type := 'free';
  end if;
  if v_channel is not null and v_channel not in ('direct','agent','reseller','gift','other') then
    v_channel := 'other';
  end if;

  while i < v_quantity loop
    v_code := app_private.random_moment_activation_code(12);
    v_packaging := app_private.random_moment_packaging_barcode();
    v_slug := lower(v_code);
    begin
      insert into public.moment_activation_codes (
        code,
        packaging_barcode,
        status,
        public_slug,
        product_type,
        product_line,
        product_label,
        batch_label,
        public_url,
        sold_channel,
        assigned_agent_id
      )
      values (
        v_code,
        v_packaging,
        'available',
        v_slug,
        v_type,
        v_line,
        coalesce(v_line, 'KhamaKey Moments'),
        v_batch,
        '/m/' || v_slug,
        v_channel,
        v_agent
      );
      i := i + 1;
      out_code := v_code;
      packaging_barcode := v_packaging;
      public_slug := v_slug;
      product_type := v_type;
      product_line := v_line;
      batch_label := v_batch;
      sold_channel := v_channel;
      assigned_agent_id := v_agent;
      return next;
    exception when unique_violation then
      null;
    end;
  end loop;
end;
$$;

revoke all on function public.create_moment_product_batch(integer,text,text,text,text,text,uuid) from public;
revoke all on function public.create_moment_product_batch(integer,text,text,text,text,text,uuid) from anon;
grant execute on function public.create_moment_product_batch(integer,text,text,text,text,text,uuid) to authenticated;
