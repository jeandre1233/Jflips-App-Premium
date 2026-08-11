-- ============================================================================
-- JFLIPS — backup table cleanup
--
-- profiles_backup, staff_backup and students_backup have RLS ENABLED but ZERO
-- policies. That means deny-all: they are not reachable through the anon key,
-- so this is not an active breach. It is a data-retention problem.
--
-- Judging by the tables they were copied from, they hold:
--   students_backup  → children's names, DOB, medical notes, parent contacts,
--                      base64 signature images
--   profiles_backup  → owner banking details (account number, branch, type)
--   staff_backup     → coach banking details
--
-- Your app cannot read them (no policies), so they serve no function. Under
-- POPIA, holding this longer than needed is the problem in itself.
--
-- STEP 1 and STEP 2 are read-only. STEP 3 is destructive and commented out.
-- ============================================================================


-- ── STEP 1: how much is in there, and from when? ────────────────────────────
-- Read-only. Returns counts only — no personal data.

SELECT 'students_backup' AS table_name, count(*) AS rows FROM students_backup
UNION ALL
SELECT 'profiles_backup', count(*) FROM profiles_backup
UNION ALL
SELECT 'staff_backup',    count(*) FROM staff_backup;


-- ── STEP 2: confirm which sensitive columns actually exist ──────────────────
-- Read-only. Returns column names, not values. Run this to see exactly what
-- category of data you are holding before deciding.

SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('students_backup', 'profiles_backup', 'staff_backup')
  AND (
    column_name ~* 'account|bank|branch|signature|medical|allerg|dob|birth|phone|email|id_number|parent'
  )
ORDER BY table_name, column_name;


-- ── STEP 3: drop them (DESTRUCTIVE — uncomment only when ready) ─────────────
-- Do this only once you have confirmed the live tables are complete and, if you
-- want an archive, you have exported these to encrypted storage OUTSIDE the
-- database. There is no undo.
--
-- Verify the live data first:
--   SELECT count(*) FROM tumbling_students;   -- vs students_backup
--   SELECT count(*) FROM team_athletes;
--   SELECT count(*) FROM owner_profiles;      -- vs profiles_backup
--   SELECT count(*) FROM staff_profiles;      -- vs staff_backup
--
-- DROP TABLE IF EXISTS students_backup;
-- DROP TABLE IF EXISTS profiles_backup;
-- DROP TABLE IF EXISTS staff_backup;


-- ── ALTERNATIVE: if you must keep them ──────────────────────────────────────
-- Not recommended for banking and children's medical data, but if you need the
-- archive in-database for now, make the deny-all explicit rather than incidental.
-- Right now these tables are safe only because nobody has added a policy yet;
-- revoking grants means a future permissive policy still cannot expose them.
--
-- REVOKE ALL ON students_backup FROM anon, authenticated;
-- REVOKE ALL ON profiles_backup FROM anon, authenticated;
-- REVOKE ALL ON staff_backup    FROM anon, authenticated;
--
-- Then set yourself a reminder to delete them once the migration is proven.
-- ============================================================================
