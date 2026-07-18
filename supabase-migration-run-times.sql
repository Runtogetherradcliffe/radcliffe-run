-- Give runs that set their own start time somewhere to keep it.
--
-- The social sheet has "Start Time" / "End Time" columns (e.g. the 19 Jul 2026
-- Steel Cotton Rail trail stage sets off at 10:30 from Hathersage Train Station)
-- but the sync dropped them because `runs` had nowhere to put them, so the site
-- and app could only ever fall back to the club convention or say nothing.
--
-- NULL is meaningful: it means "the club convention applies" (Thursday runs and
-- C25K: 7:00pm, meet from 6:45pm). The Thursday sheet has no time column, so
-- those rows stay NULL rather than being stamped with 19:00 - a display default
-- must stay distinguishable from a real sheet value.
--
-- Grants: `runs` SELECT is granted at table level to anon/authenticated, so the
-- new columns are covered without a re-grant.

alter table runs
  add column if not exists start_time time,
  add column if not exists end_time   time;

comment on column runs.start_time is
  'Local start time for runs that set their own (socials, walks). NULL = the club convention applies (Thursday runs and C25K: 7:00pm, meet from 6:45pm).';

comment on column runs.end_time is
  'Local end time from the social sheet. Feeds calendar events so they need not invent a duration; not a finish-time promise to render on a run card.';
