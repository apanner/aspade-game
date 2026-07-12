-- Run once in Supabase Dashboard → SQL Editor
-- Keeps free-tier projects active via daily SELECT/UPDATE pings

-- Option A: lightweight ping table (recommended)
create table if not exists public._keepalive (
  id int primary key default 1,
  pinged_at timestamptz not null default now()
);

insert into public._keepalive (id) values (1)
on conflict (id) do nothing;

alter table public._keepalive enable row level security;

drop policy if exists "anon read keepalive" on public._keepalive;
create policy "anon read keepalive"
  on public._keepalive for select to anon using (true);

drop policy if exists "anon update keepalive" on public._keepalive;
create policy "anon update keepalive"
  on public._keepalive for update to anon using (true);

-- Option B: RPC fallback (used if table ping fails)
create or replace function public.keepalive()
returns int
language sql
security definer
set search_path = public
as $$
  select 1;
$$;

grant execute on function public.keepalive() to anon, authenticated;
