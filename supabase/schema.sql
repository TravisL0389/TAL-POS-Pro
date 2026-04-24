create extension if not exists moddatetime schema extensions;

create table if not exists public.pos_businesses (
  id text primary key,
  name text not null,
  config jsonb not null default '{}'::jsonb,
  menu jsonb not null default '[]'::jsonb,
  orders jsonb not null default '[]'::jsonb,
  staff jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists pos_businesses_name_idx on public.pos_businesses (name);

drop trigger if exists handle_pos_businesses_updated_at on public.pos_businesses;
create trigger handle_pos_businesses_updated_at
before update on public.pos_businesses
for each row
execute procedure extensions.moddatetime(updated_at);

alter table public.pos_businesses enable row level security;

drop policy if exists "demo read pos businesses" on public.pos_businesses;
create policy "demo read pos businesses"
on public.pos_businesses
for select
to anon, authenticated
using (true);

drop policy if exists "demo upsert pos businesses" on public.pos_businesses;
create policy "demo upsert pos businesses"
on public.pos_businesses
for insert
to anon, authenticated
with check (true);

drop policy if exists "demo update pos businesses" on public.pos_businesses;
create policy "demo update pos businesses"
on public.pos_businesses
for update
to anon, authenticated
using (true)
with check (true);

comment on table public.pos_businesses is
'Snapshot-style LocalPOS Pro business store. Good for demos and starter projects. Tighten RLS before production use.';
