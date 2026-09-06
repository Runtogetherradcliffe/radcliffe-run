-- push_tokens: what each device is actually running (Sept 2026).
--
-- Why: Play Console has no per-tester installed-version view (TestFlight
-- does), and the app told the server nothing about itself, so "has every
-- Android tester moved to the new build" was a WhatsApp question. The app
-- now sends three optional fields on every POST /api/push/register
-- (rtr-app src/lib/pushDeviceInfo.ts) and this table keeps the latest
-- value per device token. That makes push_tokens the per-device fleet
-- record for BOTH platforms: retiring an entry from rtr-app's
-- fleet-runtimes.json is a query here, not a console hunt.
--
--   runtime    the Expo Updates runtime fingerprint (full hash) the device
--              is on - the value fleet-runtimes.json records
--   update_id  the OTA update id currently applied, NULL when the device is
--              running the bundle embedded in the binary
--   app_build  the native build identifier: iOS build number, Android
--              versionCode, as text
--
-- All nullable: older app versions send nothing and must keep registering.
-- Written only by the service-role route (push_tokens stays service-role
-- only - AGENTS.md, admin-only tables). Nothing reads them yet beyond ad-hoc
-- admin queries; no index.
--
-- Apply to BOTH dev and production BEFORE deploying code that uses it.

ALTER TABLE push_tokens
  ADD COLUMN IF NOT EXISTS runtime    text,
  ADD COLUMN IF NOT EXISTS update_id  text,
  ADD COLUMN IF NOT EXISTS app_build  text;

COMMENT ON COLUMN push_tokens.runtime   IS 'Expo Updates runtime fingerprint the device reported at last registration (fleet-runtimes.json value)';
COMMENT ON COLUMN push_tokens.update_id IS 'OTA update id applied on the device at last registration; NULL = embedded bundle';
COMMENT ON COLUMN push_tokens.app_build IS 'Native build id reported at last registration: iOS build number or Android versionCode, as text';
