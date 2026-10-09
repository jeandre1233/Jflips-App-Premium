-- Adult signing path, signature record and young-athlete section (tasks 25, 28, 30). Additive.
ALTER TABLE tumbling_students ADD COLUMN IF NOT EXISTS young_athlete JSONB;
ALTER TABLE tumbling_students ADD COLUMN IF NOT EXISTS indemnity_record JSONB;
-- The submit_consent / create_signup_consents / coach_roster changes that go with this
-- are in consent_setup.sql and tighten_access.sql.
