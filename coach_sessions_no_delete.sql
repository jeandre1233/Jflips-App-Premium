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

-- ============================================================================
-- A coach who edits a session and removes another coach from it needs the old row
-- of that other coach cleaned up. Coaches cannot delete directly any more, so this
-- narrow function does it: it removes ONLY the other rows of the session being
-- edited, and only for the owner or for a coach who is on that session.
-- ============================================================================
CREATE OR REPLACE FUNCTION remove_replaced_session_rows(p_group_id TEXT, p_keep_ids TEXT[])
RETURNS TEXT[]
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE removed TEXT[];
BEGIN
  IF p_group_id IS NULL OR length(p_group_id) < 3 THEN RETURN ARRAY[]::TEXT[]; END IF;
  WITH allowed AS (
    SELECT s.id::text AS sid FROM sessions s
    WHERE s.session_group_id = p_group_id
      AND NOT (s.id::text = ANY (coalesce(p_keep_ids, ARRAY[]::TEXT[])))
      AND (
        s.user_id::text = auth.uid()::text
        OR (
          EXISTS (SELECT 1 FROM staff_profiles sp WHERE sp.id = auth.uid() AND sp.status = 'approved' AND sp.owner_id::text = s.user_id::text)
          AND EXISTS (SELECT 1 FROM sessions g WHERE g.session_group_id = p_group_id AND g.coach_id = auth.uid()::text)
        )
      )
  ), del AS (
    DELETE FROM sessions WHERE id::text IN (SELECT sid FROM allowed) RETURNING id::text AS sid
  )
  SELECT coalesce(array_agg(sid), ARRAY[]::TEXT[]) INTO removed FROM del;
  RETURN removed;
END;
$$;

REVOKE ALL ON FUNCTION remove_replaced_session_rows(TEXT, TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION remove_replaced_session_rows(TEXT, TEXT[]) TO authenticated;

NOTIFY pgrst, 'reload schema';
