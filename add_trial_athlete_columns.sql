-- ==========================================================
-- TRIAL & TEMPORARY ATHLETE COLUMNS FOR TUMBLING CLASSES
-- Run this in your Supabase SQL Editor to support instant 
-- trial athlete capture and first-time attendance tracking.
-- ==========================================================

-- 1. Add trial/temporary athlete & rate columns to tumbling_students
ALTER TABLE tumbling_students ADD COLUMN IF NOT EXISTS is_temporary BOOLEAN DEFAULT false;
ALTER TABLE tumbling_students ADD COLUMN IF NOT EXISTS trial_notes TEXT;
ALTER TABLE tumbling_students ADD COLUMN IF NOT EXISTS created_by_coach_id UUID;
ALTER TABLE tumbling_students ADD COLUMN IF NOT EXISTS first_class_date DATE;
ALTER TABLE tumbling_students ADD COLUMN IF NOT EXISTS custom_group_rate NUMERIC;
ALTER TABLE tumbling_students ADD COLUMN IF NOT EXISTS custom_private_rate NUMERIC;

-- 2. Ensure owner_profiles default_group_rate column exists
ALTER TABLE owner_profiles ADD COLUMN IF NOT EXISTS default_group_rate NUMERIC DEFAULT 0;

-- 3. Ensure parent contact columns exist
ALTER TABLE tumbling_students ADD COLUMN IF NOT EXISTS parent1_name TEXT;
ALTER TABLE tumbling_students ADD COLUMN IF NOT EXISTS parent1_phone TEXT;
ALTER TABLE tumbling_students ADD COLUMN IF NOT EXISTS phone TEXT;

-- 3. Ensure Row Level Security permits both Gym Owners and Coaches to insert & select
DROP POLICY IF EXISTS "tumbling_students_coach_insert" ON tumbling_students;
CREATE POLICY "tumbling_students_coach_insert" ON tumbling_students
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM staff_profiles 
      WHERE staff_profiles.id = auth.uid() 
        AND staff_profiles.owner_id = tumbling_students.user_id 
        AND staff_profiles.status = 'approved'
    )
  );

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
