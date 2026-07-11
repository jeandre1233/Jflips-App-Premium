-- Fix Row Level Security (RLS) policies for the Registration Form

-- 1. Allow public inserts for new tumbling students
DROP POLICY IF EXISTS "Allow public insert for tumbling students" ON tumbling_students;
CREATE POLICY "Allow public insert for tumbling students" 
  ON tumbling_students FOR INSERT 
  WITH CHECK (true);

-- 2. Allow public inserts for new team athletes
DROP POLICY IF EXISTS "Allow public insert for team athletes" ON team_athletes;
CREATE POLICY "Allow public insert for team athletes" 
  ON team_athletes FOR INSERT 
  WITH CHECK (true);

-- 3. Allow public inserts for signup submissions
DROP POLICY IF EXISTS "Allow public insert for signup submissions" ON signup_submissions;
CREATE POLICY "Allow public insert for signup submissions" 
  ON signup_submissions FOR INSERT 
  WITH CHECK (true);

-- 4. REMOVED: The previous open UPDATE policy on class_types allowed any anonymous
--    user to overwrite any gym's class data. This was a critical security risk.
--
--    Instead, enrolled_student_ids updates are now handled server-side via the
--    service role key (in api/signup.ts), not via a public client policy.
--    If you need a client-side fallback, scope it tightly, e.g.:
--
--    CREATE POLICY "Allow enrolled_student_ids update only"
--      ON class_types FOR UPDATE
--      USING (true)
--      WITH CHECK (
--        -- Only the enrolled_student_ids column is allowed to change;
--        -- all other columns must remain identical to the existing row.
--        name = (SELECT name FROM class_types WHERE id = class_types.id) AND
--        user_id = (SELECT user_id FROM class_types WHERE id = class_types.id)
--      );
--
--    The cleanest solution is to handle this in a Supabase Edge Function
--    or your existing api/signup.ts using the SUPABASE_SERVICE_ROLE_KEY.
DROP POLICY IF EXISTS "Allow public update for class types" ON class_types;

-- 5. Allow public inserts for notifications (to alert gym owners of new signups)
DROP POLICY IF EXISTS "Allow public insert for notifications" ON notifications;
CREATE POLICY "Allow public insert for notifications" 
  ON notifications FOR INSERT 
  WITH CHECK (true);
