-- Route description overrides
-- Run this in the Supabase SQL Editor (dev project first, then production when ready)

create table if not exists route_descriptions (
  slug text primary key,
  description text not null,
  updated_at timestamptz not null default now()
);

-- RLS: anon can read, authenticated can read+write
alter table route_descriptions enable row level security;

create policy "Anyone can read route descriptions"
  on route_descriptions for select
  using (true);

create policy "Authenticated users can insert route descriptions"
  on route_descriptions for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update route descriptions"
  on route_descriptions for update
  to authenticated
  using (true);

-- Auto-update updated_at on change
create or replace function update_route_descriptions_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger route_descriptions_updated_at
  before update on route_descriptions
  for each row
  execute function update_route_descriptions_updated_at();
