-- ================================================================
-- radcliffe.run  —  Supabase schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ================================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";


-- ── MEMBERS ──────────────────────────────────────────────────────
-- Stores runner registrations from the join form
create table if not exists public.members (
  id                    uuid primary key default gen_random_uuid(),
  created_at            timestamptz not null default now(),
  first_name            text not null,
  last_name             text not null,
  email                 text not null,
  mobile                text,
  emergency_name        text not null,
  emergency_phone       text not null,
  emergency_relationship text not null,
  medical_info          text,
  consent_data          boolean not null default false,
  health_declaration    boolean not null default false,
  status                text not null default 'active' check (status in ('active', 'inactive'))
);

-- RLS: anyone can insert (join form), only admin can read/update/delete
alter table public.members enable row level security;

create policy "members_insert_anon"
  on public.members for insert
  to anon
  with check (true);

create policy "members_all_authenticated"
  on public.members for all
  to authenticated
  using (true)
  with check (true);


-- ── RUNS ─────────────────────────────────────────────────────────
-- Upcoming run schedule shown on homepage and upcoming page
create table if not exists public.runs (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  date          date not null,
  title         text not null,
  description   text,
  route_slug    text,
  distance_km   numeric(5,1),
  terrain       text check (terrain in ('road', 'trail', 'mixed')),
  meeting_point text not null default 'Radcliffe Market',
  leader_name   text,
  cancelled     boolean not null default false
);

-- RLS: public can read, only admin can write
alter table public.runs enable row level security;

create policy "runs_select_anon"
  on public.runs for select
  to anon
  using (true);

create policy "runs_all_authenticated"
  on public.runs for all
  to authenticated
  using (true)
  with check (true);


-- ── ROUNDUP POSTS ────────────────────────────────────────────────
create table if not exists public.roundup_posts (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  weekend_of    date not null unique,
  intro         text,
  published     boolean not null default false,
  published_at  timestamptz
);

-- RLS: public can read published posts only
alter table public.roundup_posts enable row level security;

create policy "roundup_posts_select_published"
  on public.roundup_posts for select
  to anon
  using (published = true);

create policy "roundup_posts_all_authenticated"
  on public.roundup_posts for all
  to authenticated
  using (true)
  with check (true);


-- ── PARKRUN RESULTS ──────────────────────────────────────────────
create table if not exists public.parkrun_results (
  id          uuid primary key default gen_random_uuid(),
  roundup_id  uuid not null references public.roundup_posts(id) on delete cascade,
  venue       text not null,
  location    text,
  narrative   text not null,
  milestone   integer,
  pb          boolean not null default false,
  podium      text,
  sort_order  integer not null default 0
);

alter table public.parkrun_results enable row level security;

create policy "parkrun_results_select_anon"
  on public.parkrun_results for select
  to anon
  using (
    exists (
      select 1 from public.roundup_posts
      where id = parkrun_results.roundup_id and published = true
    )
  );

create policy "parkrun_results_all_authenticated"
  on public.parkrun_results for all
  to authenticated
  using (true)
  with check (true);


-- ── RACE RESULTS ─────────────────────────────────────────────────
create table if not exists public.race_results (
  id          uuid primary key default gen_random_uuid(),
  roundup_id  uuid not null references public.roundup_posts(id) on delete cascade,
  name        text not null,
  distance    text not null,
  terrain     text not null check (terrain in ('road', 'trail', 'mixed')),
  date        date not null,
  location    text not null,
  narrative   text not null,
  podium      text,
  sort_order  integer not null default 0
);

alter table public.race_results enable row level security;

create policy "race_results_select_anon"
  on public.race_results for select
  to anon
  using (
    exists (
      select 1 from public.roundup_posts
      where id = race_results.roundup_id and published = true
    )
  );

create policy "race_results_all_authenticated"
  on public.race_results for all
  to authenticated
  using (true)
  with check (true);


-- ── SOCIAL RUNS (roundup) ────────────────────────────────────────
create table if not exists public.social_run_results (
  id          uuid primary key default gen_random_uuid(),
  roundup_id  uuid not null references public.roundup_posts(id) on delete cascade,
  name        text not null,
  date        date not null,
  location    text not null,
  narrative   text not null,
  sort_order  integer not null default 0
);

alter table public.social_run_results enable row level security;

create policy "social_run_results_select_anon"
  on public.social_run_results for select
  to anon
  using (
    exists (
      select 1 from public.roundup_posts
      where id = social_run_results.roundup_id and published = true
    )
  );

create policy "social_run_results_all_authenticated"
  on public.social_run_results for all
  to authenticated
  using (true)
  with check (true);


-- ── ROUNDUP PHOTOS ───────────────────────────────────────────────
create table if not exists public.roundup_photos (
  id          uuid primary key default gen_random_uuid(),
  roundup_id  uuid not null references public.roundup_posts(id) on delete cascade,
  url         text not null,
  alt         text not null,
  caption     text,
  credit      text,
  tall        boolean not null default false,
  sort_order  integer not null default 0
);

alter table public.roundup_photos enable row level security;

create policy "roundup_photos_select_anon"
  on public.roundup_photos for select
  to anon
  using (
    exists (
      select 1 from public.roundup_posts
      where id = roundup_photos.roundup_id and published = true
    )
  );

create policy "roundup_photos_all_authenticated"
  on public.roundup_photos for all
  to authenticated
  using (true)
  with check (true);


-- ── STORAGE BUCKET ───────────────────────────────────────────────
-- Run this separately if you want Supabase Storage for photos
-- insert into storage.buckets (id, name, public) values ('roundup-photos', 'roundup-photos', true);
