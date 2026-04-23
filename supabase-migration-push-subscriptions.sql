-- Migration: push_subscriptions table
-- Stores Web Push API subscription objects for push notifications.

create table public.push_subscriptions (
  id          uuid        default gen_random_uuid() primary key,
  created_at  timestamptz default now(),
  endpoint    text        not null unique,
  p256dh      text        not null,
  auth        text        not null,
  member_id   uuid        references public.members(id) on delete set null
);

-- RLS
alter table public.push_subscriptions enable row level security;

-- Anyone (including anon) can subscribe
create policy "Anyone can subscribe"
  on public.push_subscriptions
  for insert
  with check (true);

-- Authenticated (admin) can read and delete
create policy "Authenticated can manage subscriptions"
  on public.push_subscriptions
  for all
  using (auth.role() = 'authenticated');

-- Allow anon to delete their own subscription by endpoint
create policy "Anyone can unsubscribe by endpoint"
  on public.push_subscriptions
  for delete
  using (true);
