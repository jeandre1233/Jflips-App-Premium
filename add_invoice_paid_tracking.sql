-- Invoice paid tracking for the History tab.
-- Run once in the Supabase SQL Editor. Safe to re-run.

ALTER TABLE IF EXISTS payments ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS payments ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- Every invoice that exists today starts as unpaid, so nothing is silently
-- treated as settled. Mark the old ones off from History.
UPDATE payments SET is_paid = false WHERE is_paid IS NULL;
