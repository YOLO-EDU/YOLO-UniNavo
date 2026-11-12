-- UniNavo shared storage. Separate from the YOLO Education app.
-- The anon key alone can read or write nothing: the table has RLS on and no
-- policies. Every read and write goes through the two functions below, which
-- require the family link secret. Only its SHA-256 hash is stored.

create table if not exists public.uninavo_space (
  id text primary key,
  secret_hash text not null
);

create table if not exists public.uninavo_state (
  space_id text not null references public.uninavo_space (id) on delete cascade,
  key text not null check (key ~ '^[a-z-]{1,32}$'),
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (space_id, key)
);

alter table public.uninavo_space enable row level security;
alter table public.uninavo_state enable row level security;
revoke all on public.uninavo_space, public.uninavo_state from anon, authenticated;

create or replace function public.uninavo_space_for(p_secret text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.uninavo_space
  where length(p_secret) >= 24
    and secret_hash = encode(sha256(convert_to(p_secret, 'UTF8')), 'hex');
$$;

create or replace function public.uninavo_pull(p_secret text)
returns table (key text, value jsonb, updated_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_space text := public.uninavo_space_for(p_secret);
begin
  if v_space is null then
    raise exception 'invalid link' using errcode = '28000';
  end if;
  return query
    select s.key, s.value, s.updated_at
    from public.uninavo_state s
    where s.space_id = v_space;
end;
$$;

create or replace function public.uninavo_push(p_secret text, p_key text, p_value jsonb)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_space text := public.uninavo_space_for(p_secret);
  v_at timestamptz := now();
begin
  if v_space is null then
    raise exception 'invalid link' using errcode = '28000';
  end if;
  if octet_length(p_value::text) > 1000000 then
    raise exception 'value too large';
  end if;
  insert into public.uninavo_state (space_id, key, value, updated_at)
  values (v_space, p_key, p_value, v_at)
  on conflict (space_id, key)
  do update set value = excluded.value, updated_at = excluded.updated_at;
  return v_at;
end;
$$;

revoke all on function public.uninavo_space_for(text) from public, anon, authenticated;
revoke all on function public.uninavo_pull(text) from public;
revoke all on function public.uninavo_push(text, text, jsonb) from public;
grant execute on function public.uninavo_pull(text) to anon;
grant execute on function public.uninavo_push(text, text, jsonb) to anon;
