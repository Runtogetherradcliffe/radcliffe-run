-- Add name column to route_descriptions table
-- Run this in the Supabase SQL Editor AFTER the initial route_descriptions migration

alter table route_descriptions
  alter column description drop not null,
  add column if not exists name text;
