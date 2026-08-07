-- ============================================================================
-- JFLIPS Sessions & Notifications RLS Patch for Coaches
-- Run this in your Supabase SQL Editor to grant approved coaches full
-- permission to log sessions and generate notifications for their gym.
-- ============================================================================

-- 1. Helper function: checks if calling user is an approved coach under owner_id
CREATE OR REPLACE FUNCTION public.is_approved_staff(p_owner_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM staff_profiles
    WHERE id = auth.uid()
      AND owner_id = p_owner_id
      AND status = 'approved'
  );
$$;

-- 2. Sessions table policy update
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sessions_coach_own" ON sessions;
DROP POLICY IF EXISTS "sessions_staff_all" ON sessions;
DROP POLICY IF EXISTS "sessions_owner_all" ON sessions;

CREATE POLICY "sessions_staff_all" ON sessions
  FOR ALL
  USING (
    user_id::text = auth.uid()::text
    OR coach_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM staff_profiles
      WHERE staff_profiles.id = auth.uid()
        AND staff_profiles.owner_id::text = sessions.user_id::text
        AND staff_profiles.status = 'approved'
    )
  )
  WITH CHECK (
    user_id::text = auth.uid()::text
    OR coach_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM staff_profiles
      WHERE staff_profiles.id = auth.uid()
        AND staff_profiles.owner_id::text = sessions.user_id::text
        AND staff_profiles.status = 'approved'
    )
  );

-- 3. Notifications table policy update
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own notifications" ON notifications;
DROP POLICY IF EXISTS "notifications_owner_all" ON notifications;
DROP POLICY IF EXISTS "notifications_staff_insert" ON notifications;

CREATE POLICY "notifications_owner_all" ON notifications
  FOR ALL USING (user_id::text = auth.uid()::text);

CREATE POLICY "notifications_staff_insert" ON notifications
  FOR INSERT WITH CHECK (
    user_id::text = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM staff_profiles
      WHERE staff_profiles.id = auth.uid()
        AND staff_profiles.owner_id::text = notifications.user_id::text
        AND staff_profiles.status = 'approved'
    )
  );

-- 4. RPC function for logging sessions as a coach (bypasses direct client insert RLS bottlenecks)
CREATE OR REPLACE FUNCTION public.save_session_as_coach(
  p_id TEXT,
  p_date DATE,
  p_class_type_id TEXT,
  p_student_ids TEXT[],
  p_hours_coached NUMERIC,
  p_user_id UUID,
  p_coach_id TEXT,
  p_is_competition BOOLEAN DEFAULT FALSE,
  p_custom_event_name TEXT DEFAULT NULL,
  p_covering_coach_name TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() = p_user_id 
     OR auth.uid()::text = p_coach_id 
     OR EXISTS (
          SELECT 1 FROM staff_profiles 
          WHERE id = auth.uid() 
            AND owner_id = p_user_id 
            AND status = 'approved'
        ) THEN

    INSERT INTO sessions (
      id, date, class_type_id, student_ids, hours_coached, user_id, coach_id, is_competition, custom_event_name, covering_coach_name
    ) VALUES (
      p_id, p_date, p_class_type_id, p_student_ids, p_hours_coached, p_user_id, p_coach_id, p_is_competition, p_custom_event_name, p_covering_coach_name
    )
    ON CONFLICT (id) DO UPDATE SET
      date = EXCLUDED.date,
      class_type_id = EXCLUDED.class_type_id,
      student_ids = EXCLUDED.student_ids,
      hours_coached = EXCLUDED.hours_coached,
      user_id = EXCLUDED.user_id,
      coach_id = EXCLUDED.coach_id,
      is_competition = EXCLUDED.is_competition,
      custom_event_name = EXCLUDED.custom_event_name,
      covering_coach_name = EXCLUDED.covering_coach_name;
  ELSE
    RAISE EXCEPTION 'Unauthorized: You are not an approved coach for this gym.';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_session_as_coach TO authenticated, anon;
