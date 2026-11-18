-- C25K weeks 5, 6 and 7 in the admin's own words (18 Nov 2026).
-- Shape: { "5": { "title": "...", "tue": {"intervals": "...", "totalRun": "..."}, "thu": {...}, "solo": {...} }, "6": {...}, "7": {...} }
-- NULL means the NHS plan with the chosen session order (c25k_session_order).
-- Read by the members' programme page, the session generator, the C25K email and
-- the native app (site_settings is readable by anon and authenticated, as before).
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS c25k_week_overrides jsonb;
