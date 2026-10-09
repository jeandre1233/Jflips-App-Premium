-- ============================================================================
-- JFLIPS: COACHES CAN EDIT SESSIONS BUT NOT DELETE THEM
--
-- Run after the app version without the coach delete buttons is deployed.
-- Replaces the single "sessions_staff_all" rule (which allowed everything) with four:
-- coaches (and the owner) can read, add and edit; ONLY the owner can delete.
-- Tested by simulating a coach and the owner inside the database (rolled back):
--   coach edit -> 1 row changed, coach delete -> 0 rows, owner delete -> works.
-- ============================================================================

DROP POLICY IF EXISTS "sessions_staff_all" ON sessions;

CREATE POLICY "sessions_select" ON sessions FOR SELECT USING (
  (user_id)::text = (auth.uid())::text OR coach_id = (auth.uid())::text OR EXISTS (
    SELECT 1 FROM staff_profiles sp WHERE sp.id = auth.uid()
      AND (sp.owner_id)::text = (sessions.user_id)::text AND sp.status = 'approved'));

CREATE POLICY "sessions_insert" ON sessions FOR INSERT WITH CHECK (
  (user_id)::text = (auth.uid())::text OR coach_id = (auth.uid())::text OR EXISTS (
    SELECT 1 FROM staff_profiles sp WHERE sp.id = auth.uid()
      AND (sp.owner_id)::text = (sessions.user_id)::text AND sp.status = 'approved'));

CREATE POLICY "sessions_update" ON sessions FOR UPDATE USING (
  (user_id)::text = (auth.uid())::text OR coach_id = (auth.uid())::text OR EXISTS (
    SELECT 1 FROM staff_profiles sp WHERE sp.id = auth.uid()
      AND (sp.owner_id)::text = (sessions.user_id)::text AND sp.status = 'approved'))
  WITH CHECK (
  (user_id)::text = (auth.uid())::text OR coach_id = (auth.uid())::text OR EXISTS (
    SELECT 1 FROM staff_profiles sp WHERE sp.id = auth.uid()
      AND (sp.owner_id)::text = (sessions.user_id)::text AND sp.status = 'approved'));

CREATE POLICY "sessions_owner_delete" ON sessions FOR DELETE USING (
  (user_id)::text = (auth.uid())::text);

NOTIFY pgrst, 'reload schema';
