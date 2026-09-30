-- ============================================================================
-- JFLIPS ACCOUNTS & UNIFIED STAFF PAYSLIPS MIGRATION
-- Run this script in your Supabase Project -> SQL Editor -> Run
-- ============================================================================

-- 1. Ensure staff_profiles has all banking and remuneration columns
ALTER TABLE IF EXISTS staff_profiles ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE IF EXISTS staff_profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE IF EXISTS staff_profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE IF EXISTS staff_profiles ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE IF EXISTS staff_profiles ADD COLUMN IF NOT EXISTS pay_rate NUMERIC DEFAULT 0;
ALTER TABLE IF EXISTS staff_profiles ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE IF EXISTS staff_profiles ADD COLUMN IF NOT EXISTS account_number TEXT;
ALTER TABLE IF EXISTS staff_profiles ADD COLUMN IF NOT EXISTS branch_code TEXT;
ALTER TABLE IF EXISTS staff_profiles ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'Current';
ALTER TABLE IF EXISTS staff_profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved';

-- 2. Ensure payments table supports coach payouts (expenses) and coach IDs
ALTER TABLE IF EXISTS payments ADD COLUMN IF NOT EXISTS is_expense BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS payments ADD COLUMN IF NOT EXISTS coach_id TEXT;

-- 3. Create staff_payslips table for tracking unified coach payslips and EFT settlements
CREATE TABLE IF NOT EXISTS staff_payslips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  period_month TEXT NOT NULL, -- e.g. 'September 2026' or 'Active'
  total_hours NUMERIC(7,2) DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  gross_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'unpaid', -- 'unpaid' | 'paid' | 'processing'
  paid_at TIMESTAMPTZ,
  payment_method TEXT DEFAULT 'EFT',
  notes TEXT,
  snapshot_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable Row Level Security (RLS) on staff_payslips
ALTER TABLE staff_payslips ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies to avoid duplicates
DROP POLICY IF EXISTS "staff_payslips_select_policy" ON staff_payslips;
DROP POLICY IF EXISTS "staff_payslips_insert_policy" ON staff_payslips;
DROP POLICY IF EXISTS "staff_payslips_update_policy" ON staff_payslips;
DROP POLICY IF EXISTS "staff_payslips_delete_policy" ON staff_payslips;

-- 6. RLS Policies:
-- Coaches can view their own payslips (coach_id = auth.uid())
-- Owners can view, create, update, and delete payslips for their academy
CREATE POLICY "staff_payslips_select_policy" ON staff_payslips
  FOR SELECT USING (
    auth.uid() = coach_id OR auth.uid() = owner_id
  );

CREATE POLICY "staff_payslips_insert_policy" ON staff_payslips
  FOR INSERT WITH CHECK (
    auth.uid() = owner_id
  );

CREATE POLICY "staff_payslips_update_policy" ON staff_payslips
  FOR UPDATE USING (
    auth.uid() = owner_id OR auth.uid() = coach_id
  ) WITH CHECK (
    auth.uid() = owner_id OR auth.uid() = coach_id
  );

CREATE POLICY "staff_payslips_delete_policy" ON staff_payslips
  FOR DELETE USING (
    auth.uid() = owner_id
  );

-- 7. Performance indexes
CREATE INDEX IF NOT EXISTS idx_staff_payslips_coach_id ON staff_payslips(coach_id);
CREATE INDEX IF NOT EXISTS idx_staff_payslips_owner_id ON staff_payslips(owner_id);
CREATE INDEX IF NOT EXISTS idx_staff_payslips_period ON staff_payslips(period_month);

-- 8. Add staff_payslips to realtime publication if available
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE staff_payslips;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 9. Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
