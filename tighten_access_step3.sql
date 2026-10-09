-- ============================================================================
-- JFLIPS: TIGHTEN WHO CAN READ WHAT  (step 3 of 3)
--
-- Run ONLY after the app version that includes coach_classes() and the plain-insert
-- fix for new athletes is deployed. Tested by simulating a real coach account inside
-- the database (rolled back): with both rules gone a coach still gets their students,
-- classes (without prices) and colleagues' names, and can still add a trial athlete,
-- but can no longer read the tables directly or edit an existing child.
-- ============================================================================

-- Coaches could read every column of every class, including the price parents pay.
-- The app now uses coach_classes(), which leaves the price out.
DROP POLICY IF EXISTS "class_types_coach_read" ON class_types;

-- Coaches could edit ANY column of ANY child (medical notes, parent details, the rate
-- a child is charged). Coaches have no screen for editing a child any more.
DROP POLICY IF EXISTS "tumbling_students_coach_update" ON tumbling_students;

NOTIFY pgrst, 'reload schema';
