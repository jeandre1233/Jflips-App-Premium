-- ============================================================================
-- JFLIPS: HISTORY REDUNDANCY (stands in for history_and_banking.sql)
-- Run in Supabase -> SQL Editor. Safe to re-run: everything is IF NOT EXISTS.
--
-- 1. Adds every column the History engine writes, so no month is saved
--    "without its invoice total" on an older database.
-- 2. Creates archived_sessions: a real table holding each archived session, so
--    a month can be rebuilt even if its sessions_json copy is lost.
-- 3. Re-states the payments / owner_profiles columns from
--    supabase_updated_features.sql, in case that file was never run.
-- ============================================================================

-- ── 1. history: derived money columns ───────────────────────────────────────
ALTER TABLE IF EXISTS history ADD COLUMN IF NOT EXISTS sessions_json      JSONB;
ALTER TABLE IF EXISTS history ADD COLUMN IF NOT EXISTS snapshot_json      JSONB;
ALTER TABLE IF EXISTS history ADD COLUMN IF NOT EXISTS session_count      INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS history ADD COLUMN IF NOT EXISTS revenue            NUMERIC DEFAULT 0;
ALTER TABLE IF EXISTS history ADD COLUMN IF NOT EXISTS total_gross        NUMERIC DEFAULT 0;
ALTER TABLE IF EXISTS history ADD COLUMN IF NOT EXISTS tumbling_gross     NUMERIC DEFAULT 0;
ALTER TABLE IF EXISTS history ADD COLUMN IF NOT EXISTS tumbling_coach_pay NUMERIC DEFAULT 0;
ALTER TABLE IF EXISTS history ADD COLUMN IF NOT EXISTS tumbling_net       NUMERIC DEFAULT 0;
ALTER TABLE IF EXISTS history ADD COLUMN IF NOT EXISTS schools_gross      NUMERIC DEFAULT 0;
ALTER TABLE IF EXISTS history ADD COLUMN IF NOT EXISTS schools_coach_pay  NUMERIC DEFAULT 0;
ALTER TABLE IF EXISTS history ADD COLUMN IF NOT EXISTS gyms_gross         NUMERIC DEFAULT 0;
ALTER TABLE IF EXISTS history ADD COLUMN IF NOT EXISTS gyms_net           NUMERIC DEFAULT 0;
ALTER TABLE IF EXISTS history ADD COLUMN IF NOT EXISTS merch_gross        NUMERIC DEFAULT 0;
ALTER TABLE IF EXISTS history ADD COLUMN IF NOT EXISTS merch_cost         NUMERIC DEFAULT 0;
ALTER TABLE IF EXISTS history ADD COLUMN IF NOT EXISTS merch_net          NUMERIC DEFAULT 0;
ALTER TABLE IF EXISTS history ADD COLUMN IF NOT EXISTS total_coach_payout NUMERIC DEFAULT 0;
ALTER TABLE IF EXISTS history ADD COLUMN IF NOT EXISTS net_profit         NUMERIC DEFAULT 0;
ALTER TABLE IF EXISTS history ADD COLUMN IF NOT EXISTS invoices_total     NUMERIC DEFAULT 0;
ALTER TABLE IF EXISTS history ADD COLUMN IF NOT EXISTS invoice_count      INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS history ADD COLUMN IF NOT EXISTS recorded_at        TIMESTAMPTZ DEFAULT now();
ALTER TABLE IF EXISTS history ADD COLUMN IF NOT EXISTS recalculated_at    TIMESTAMPTZ;

-- ── 2. archived_sessions: the redundant copy of every archived session ──────
CREATE TABLE IF NOT EXISTS archived_sessions (
  id                  TEXT PRIMARY KEY,          -- the ORIGINAL session id, so re-archiving upserts
  user_id             UUID NOT NULL,
  history_id          TEXT,
  month_key           TEXT NOT NULL,             -- e.g. 'July 2026'
  month_name          TEXT NOT NULL,
  year                INTEGER NOT NULL,
  date                TEXT,
  class_type_id       TEXT,
  student_ids         TEXT[] DEFAULT '{}',
  coach_id            TEXT,
  hours_coached       NUMERIC,
  is_competition      BOOLEAN DEFAULT false,
  custom_event_name   TEXT,
  covering_coach_name TEXT,
  session_group_id    TEXT,
  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS archived_sessions_user_month_idx
  ON archived_sessions (user_id, month_key);
CREATE INDEX IF NOT EXISTS archived_sessions_history_idx
  ON archived_sessions (history_id);

ALTER TABLE archived_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "archived_sessions_owner_all" ON archived_sessions;
CREATE POLICY "archived_sessions_owner_all" ON archived_sessions
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── 3. payments: coach-payout marker (separates expenses from client income) ─
ALTER TABLE IF EXISTS payments ADD COLUMN IF NOT EXISTS is_expense BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS payments ADD COLUMN IF NOT EXISTS coach_id   TEXT;
ALTER TABLE IF EXISTS payments ADD COLUMN IF NOT EXISTS invoice_id TEXT;
ALTER TABLE IF EXISTS payments ADD COLUMN IF NOT EXISTS family_id  TEXT;
ALTER TABLE IF EXISTS payments ADD COLUMN IF NOT EXISTS client_name      TEXT;
ALTER TABLE IF EXISTS payments ADD COLUMN IF NOT EXISTS bill_to_address  TEXT;
ALTER TABLE IF EXISTS payments ADD COLUMN IF NOT EXISTS bill_to_phone    TEXT;

-- ── 4. owner_profiles: which bank account prints on which invoice ───────────
ALTER TABLE IF EXISTS owner_profiles ADD COLUMN IF NOT EXISTS invoice_bank_allocations JSONB DEFAULT '{}'::jsonb;
ALTER TABLE IF EXISTS owner_profiles ADD COLUMN IF NOT EXISTS bank_allocation_defaults JSONB DEFAULT '{}'::jsonb;

-- ── 5. sessions: groups per-coach rows of one real practice ─────────────────
ALTER TABLE IF EXISTS sessions ADD COLUMN IF NOT EXISTS session_group_id TEXT;

-- Make the API pick up the new columns straight away.
NOTIFY pgrst, 'reload schema';
