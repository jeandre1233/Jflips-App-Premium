-- ============================================================================
-- JFLIPS: TIGHTEN WHO CAN READ WHAT  (step 2 of 2: REMOVE the old broad rules)
--
-- DO NOT RUN YET. Run this only after ALL of these are true:
--   1. tighten_access.sql (step 1) has been run.
--   2. The new app version is deployed (it uses the functions from step 1).
--   3. A test sign-up works, and the child shows up in the class they picked.
--   4. You have logged in as a COACH and checked: the class list, session logging,
--      the list of children and the colleague picker all still work.
--
-- Each line only removes one broad rule. They are independent, so if something
-- breaks you can put a rule back by re-creating it.
-- ============================================================================

-- 1. Anyone with the public key could read the class list, including the ids of
--    every enrolled child. The sign-up page now uses get_signup_classes().
DROP POLICY IF EXISTS "public_read_signup_class_types" ON class_types;

-- 2. Coaches could read EVERY column of every child (signature image, parent email,
--    date of birth). The app now uses coach_roster().
DROP POLICY IF EXISTS "tumbling_coach_read" ON tumbling_students;

-- 3. Coaches could read every colleague's bank details and pay rate. The app now
--    uses coach_directory(), which returns names only.
DROP POLICY IF EXISTS "staff_can_see_colleagues" ON staff_profiles;

NOTIFY pgrst, 'reload schema';

-- Still to do later (needs the coach screens tested first):
--   tumbling_students_coach_update lets any coach edit ANY column of any child
--   (medical notes, parent details, the rate a child is charged). It should be
--   replaced by a function that only lets coaches change the few fields they edit.
