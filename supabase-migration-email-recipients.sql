-- Per-member recipient selection for scheduled emails.
-- When scheduled_emails.recipient_filter = 'selected', the send targets exactly
-- the member ids listed here (still filtered to active + not opted out).
-- recipient_filter values: 'all' | 'selected' | a cohort value (e.g. 'c25k').
ALTER TABLE scheduled_emails
  ADD COLUMN IF NOT EXISTS recipient_member_ids uuid[] DEFAULT NULL;
