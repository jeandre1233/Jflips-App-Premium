-- ============================================================================
-- JFLIPS PRO: COMPLETE SQL MIGRATION FOR UPDATED FEATURES
-- Run this script in your Supabase Project -> SQL Editor -> Run
-- ============================================================================

-- ============================================================================
-- 1. OWNER PROFILES (Default Logging Coach, Bank Allocations, Rates)
-- ============================================================================
ALTER TABLE IF EXISTS owner_profiles 
  ADD COLUMN IF NOT EXISTS default_logging_coach_id TEXT;

ALTER TABLE IF EXISTS owner_profiles 
  ADD COLUMN IF NOT EXISTS invoice_bank_allocations JSONB DEFAULT '{}'::jsonb;

ALTER TABLE IF EXISTS owner_profiles 
  ADD COLUMN IF NOT EXISTS bank_allocation_defaults JSONB DEFAULT '{}'::jsonb;

ALTER TABLE IF EXISTS owner_profiles 
  ADD COLUMN IF NOT EXISTS sibling_discount NUMERIC DEFAULT 0;

ALTER TABLE IF EXISTS owner_profiles 
  ADD COLUMN IF NOT EXISTS default_group_rate NUMERIC DEFAULT 0;

ALTER TABLE IF EXISTS owner_profiles 
  ADD COLUMN IF NOT EXISTS access_code TEXT;

ALTER TABLE IF EXISTS owner_profiles 
  ADD COLUMN IF NOT EXISTS biz_bank_name TEXT;

ALTER TABLE IF EXISTS owner_profiles 
  ADD COLUMN IF NOT EXISTS biz_account_number TEXT;

ALTER TABLE IF EXISTS owner_profiles 
  ADD COLUMN IF NOT EXISTS biz_branch_code TEXT;

ALTER TABLE IF EXISTS owner_profiles 
  ADD COLUMN IF NOT EXISTS biz_account_type TEXT DEFAULT 'Current';


-- ============================================================================
-- 2. STAFF PROFILES (Remuneration, Banking, Username & Permissions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS staff_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  phone TEXT,
  username TEXT,
  pay_rate NUMERIC DEFAULT 0,
  bank_name TEXT,
  account_number TEXT,
  branch_code TEXT,
  account_type TEXT DEFAULT 'Current',
  status TEXT DEFAULT 'pending',
  can_view_tumbling BOOLEAN DEFAULT false,
  can_view_school_gyms BOOLEAN DEFAULT false,
  assigned_cheer_org_ids TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ
);

-- Ensure all columns exist if table was already created
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS pay_rate NUMERIC DEFAULT 0;
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS account_number TEXT;
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS branch_code TEXT;
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'Current';
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS can_view_tumbling BOOLEAN DEFAULT false;
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS can_view_school_gyms BOOLEAN DEFAULT false;
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS assigned_cheer_org_ids TEXT[] DEFAULT '{}';
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Case-insensitive index for fast coach username lookups
CREATE UNIQUE INDEX IF NOT EXISTS staff_profiles_username_idx 
  ON staff_profiles (LOWER(username)) 
  WHERE username IS NOT NULL;

-- Enable RLS
ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;

-- Reset staff_profiles policies
DROP POLICY IF EXISTS "staff_profiles_select" ON staff_profiles;
DROP POLICY IF EXISTS "staff_profiles_update_own" ON staff_profiles;
DROP POLICY IF EXISTS "staff_profiles_update_owner" ON staff_profiles;
DROP POLICY IF EXISTS "staff_profiles_insert_own" ON staff_profiles;
DROP POLICY IF EXISTS "Users can manage their own staff profile" ON staff_profiles;
DROP POLICY IF EXISTS "Coaches can view and update their own profile" ON staff_profiles;

CREATE POLICY "staff_profiles_select" ON staff_profiles
  FOR SELECT USING (auth.uid() = id OR auth.uid() = owner_id);

CREATE POLICY "staff_profiles_update_own" ON staff_profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "staff_profiles_update_owner" ON staff_profiles
  FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "staff_profiles_insert_own" ON staff_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);


-- ============================================================================
-- 3. PAYMENTS TABLE (Coach Payouts / Expense Tracking)
-- ============================================================================
ALTER TABLE IF EXISTS payments ADD COLUMN IF NOT EXISTS is_expense BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS payments ADD COLUMN IF NOT EXISTS coach_id TEXT;
ALTER TABLE IF EXISTS payments ADD COLUMN IF NOT EXISTS invoice_id TEXT;
ALTER TABLE IF EXISTS payments ADD COLUMN IF NOT EXISTS family_id TEXT;


-- ============================================================================
-- 4. STAFF PAYSLIPS (Archived & Active Coach Payslips with EFT Tracking)
-- ============================================================================
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
  reference_id TEXT,
  notes TEXT,
  snapshot_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE staff_payslips ADD COLUMN IF NOT EXISTS reference_id TEXT;

-- Enable RLS on staff_payslips
ALTER TABLE staff_payslips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_payslips_select_policy" ON staff_payslips;
DROP POLICY IF EXISTS "staff_payslips_insert_policy" ON staff_payslips;
DROP POLICY IF EXISTS "staff_payslips_update_policy" ON staff_payslips;
DROP POLICY IF EXISTS "staff_payslips_delete_policy" ON staff_payslips;

-- Coaches can view their own payslips (coach_id = auth.uid())
-- Owners can view, create, update, and delete payslips for their gym
CREATE POLICY "staff_payslips_select_policy" ON staff_payslips
  FOR SELECT USING (auth.uid() = coach_id OR auth.uid() = owner_id);

CREATE POLICY "staff_payslips_insert_policy" ON staff_payslips
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "staff_payslips_update_policy" ON staff_payslips
  FOR UPDATE USING (auth.uid() = owner_id OR auth.uid() = coach_id)
  WITH CHECK (auth.uid() = owner_id OR auth.uid() = coach_id);

CREATE POLICY "staff_payslips_delete_policy" ON staff_payslips
  FOR DELETE USING (auth.uid() = owner_id);

CREATE INDEX IF NOT EXISTS idx_staff_payslips_coach_id ON staff_payslips(coach_id);
CREATE INDEX IF NOT EXISTS idx_staff_payslips_owner_id ON staff_payslips(owner_id);
CREATE INDEX IF NOT EXISTS idx_staff_payslips_period ON staff_payslips(period_month);


-- ============================================================================
-- 5. MERCHANDISE TABLES (Items, Clients, Orders & Invoices)
-- ============================================================================
CREATE TABLE IF NOT EXISTS merch_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'Apparel',
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  stock_quantity INTEGER DEFAULT 0,
  sizes TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE merch_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "merch_items_owner_policy" ON merch_items;
CREATE POLICY "merch_items_owner_policy" ON merch_items
  FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS merch_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  client_type TEXT DEFAULT 'Athlete',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE merch_clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "merch_clients_owner_policy" ON merch_clients;
CREATE POLICY "merch_clients_owner_policy" ON merch_clients
  FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS merch_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_type TEXT DEFAULT 'Athlete',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'unpaid',
  payment_method TEXT,
  order_date TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  invoice_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE merch_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "merch_orders_owner_policy" ON merch_orders;
CREATE POLICY "merch_orders_owner_policy" ON merch_orders
  FOR ALL USING (auth.uid() = user_id);


-- ============================================================================
-- 6. REALTIME REPLICATION (For Realtime UI Updates)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE staff_payslips;
    ALTER PUBLICATION supabase_realtime ADD TABLE staff_profiles;
    ALTER PUBLICATION supabase_realtime ADD TABLE merch_orders;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 7. NOTIFY POSTGREST TO RELOAD SCHEMA CACHE
-- ============================================================================
NOTIFY pgrst, 'reload schema';
