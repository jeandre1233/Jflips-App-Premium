-- ============================================================================
-- JFLIPS PRO: FIX COACH PROFILE & BANKING DETAILS IN SUPABASE
-- Run this script in your Supabase Project -> SQL Editor -> Run
-- ============================================================================

-- 1. Ensure all coach profile and banking columns exist on staff_profiles
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS account_number TEXT;
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS branch_code TEXT;
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'Current';
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS pay_rate NUMERIC DEFAULT 0;
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS can_view_tumbling BOOLEAN DEFAULT false;
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS can_view_school_gyms BOOLEAN DEFAULT false;
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS assigned_cheer_org_ids TEXT[] DEFAULT '{}';
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- 2. Create index for fast unique username lookups (case-insensitive, ignoring nulls)
CREATE UNIQUE INDEX IF NOT EXISTS staff_profiles_username_idx 
  ON staff_profiles (LOWER(username)) 
  WHERE username IS NOT NULL;

-- 3. Enable Row Level Security (RLS) on staff_profiles
ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;

-- 4. Clean up any existing policies to avoid conflicts
DROP POLICY IF EXISTS "staff_profiles_select" ON staff_profiles;
DROP POLICY IF EXISTS "staff_profiles_update_own" ON staff_profiles;
DROP POLICY IF EXISTS "staff_profiles_update_owner" ON staff_profiles;
DROP POLICY IF EXISTS "staff_profiles_insert_own" ON staff_profiles;
DROP POLICY IF EXISTS "staff_profiles_all_manage" ON staff_profiles;
DROP POLICY IF EXISTS "Users can manage their own staff profile" ON staff_profiles;
DROP POLICY IF EXISTS "Coaches can view and update their own profile" ON staff_profiles;

-- 5. SELECT Policy: Coaches can read their own profile & colleagues under their gym; owners can read all staff under their gym
CREATE POLICY "staff_profiles_select" ON staff_profiles
  FOR SELECT USING (
    auth.uid() = id OR auth.uid() = owner_id
  );

-- 6. UPDATE Policy for Coaches: Allows coaches to update their own profile (name, username, bank details)
CREATE POLICY "staff_profiles_update_own" ON staff_profiles
  FOR UPDATE 
  USING (auth.uid() = id) 
  WITH CHECK (auth.uid() = id);

-- 7. UPDATE Policy for Gym Owners: Allows gym owners to manage coaches (pay rate, approval status, permissions)
CREATE POLICY "staff_profiles_update_owner" ON staff_profiles
  FOR UPDATE 
  USING (auth.uid() = owner_id) 
  WITH CHECK (auth.uid() = owner_id);

-- 8. INSERT Policy for Coaches: Allows newly registered coaches to insert their own join request
CREATE POLICY "staff_profiles_insert_own" ON staff_profiles
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Notify schema reload
NOTIFY pgrst, 'reload schema';
