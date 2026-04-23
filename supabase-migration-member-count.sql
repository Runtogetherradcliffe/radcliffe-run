-- Migration: public member count function
-- Returns the total number of registered members without exposing any member data.
-- SECURITY DEFINER bypasses RLS so anonymous users can call it.

create or replace function public.get_member_count()
returns integer
language sql
security definer
set search_path = public
as $$
  select count(*)::integer from public.members;
$$;

-- Allow anonymous (unauthenticated) callers to execute it
grant execute on function public.get_member_count() to anon;
