-- C25K session preference column
-- Run against both dev and production Supabase projects

ALTER TABLE members ADD COLUMN IF NOT EXISTS c25k_session text;

-- Valid values: 'tuesday' | 'thursday' | 'both'
-- NULL for non-C25K members
