-- ============================================================================
-- JFLIPS RLS Security Hardening
--
-- Based on an audit of the live pg_policies output. Run this in the Supabase
-- SQL Editor. Every statement is idempotent and safe to re-run.
--
-- KEY PRINCIPLE: RLS policies are PERMISSIVE and OR'd together. One policy with
-- `USING (true)` or `WITH CHECK (true)` makes every stricter policy on that
-- table irrelevant. Several tables here had exactly that, which is why the
-- carefully-scoped coach policies were not actually protecting anything.
--
-- Read the notes on PART 1 before running — it is the only part that could
-- affect a feature outside this codebase.
-- ============================================================================


-- ── PART 0: helper function ─────────────────────────────────────────────────
-- An RLS policy's subqueries are themselves subject to RLS. `owner_profiles` is
-- only readable by its owner, so a policy checking "does this owner exist?"
-- would always be FALSE for an anonymous visitor and would block every public
-- signup. SECURITY DEFINER sidesteps that. It leaks nothing: it answers only
-- yes/no for an id the caller already has.
-- Two overloads on purpose: `user_id` is uuid on some tables (tumbling_students,
-- cheer_registrations) and text on others (notifications — which is why every
-- pre-existing policy there casts with ::text). Postgres picks the right one, so
-- the policies below work without knowing each column's type.
CREATE OR REPLACE FUNCTION public.is_gym_owner(p_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM owner_profiles WHERE id = p_id);
$$;

-- The text variant validates the uuid shape first. A plain `p_id::uuid` would
-- raise 22P02 on any non-uuid value and, inside an RLS check, that surfaces as a
-- failed insert rather than a clean "not permitted".
CREATE OR REPLACE FUNCTION public.is_gym_owner(p_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF p_id IS NULL
     OR p_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  THEN
    RETURN false;
  END IF;
  RETURN EXISTS (SELECT 1 FROM owner_profiles WHERE id = p_id::uuid);
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_gym_owner(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_gym_owner(TEXT) TO anon, authenticated;


-- ── PART 1: portal token tables — CRITICAL ──────────────────────────────────
-- Both tables had `SELECT USING (true)`, meaning ANY anonymous caller with the
-- public anon key could run `select * from portal_tokens` and download every
-- token you have ever issued. A policy named "Anyone can read portal by token"
-- does NOT restrict reads to a known token — RLS filters rows, it cannot force
-- a WHERE clause. Whoever holds a token holds whatever it unlocks, so this was
-- a full parent-data exposure.
--
-- Neither table is referenced anywhere in this codebase, so dropping these is
-- expected to have zero effect here. IF you have a parent portal running in
-- another deployment, it will stop reading tokens — tell me and we will replace
-- it with the safe pattern: a SECURITY DEFINER function that takes the token
-- and returns only the matching row, so tokens cannot be enumerated.
--
-- To roll back:
--   CREATE POLICY "portal_public_read" ON parent_portal_tokens FOR SELECT USING (true);

DROP POLICY IF EXISTS "portal_public_read" ON parent_portal_tokens;
DROP POLICY IF EXISTS "Anyone can read portal by token" ON portal_tokens;


-- ── PART 2: notifications ───────────────────────────────────────────────────
-- Three problems:
--   • "Allow public insert for notifications"  → WITH CHECK (true): anyone,
--     unauthenticated, could write a notification into any account.
--   • "Authenticated users can insert notifications" → any logged-in user could
--     forge a notification to any other user, including fake "session logged"
--     and "coach approved" messages.
--   • Those two made the scoped staff policies decorative.
-- Replaced with: staff insert (scoped to their own gym) + a narrow public policy
-- that only permits the two signup types, only for real gym owners.

DROP POLICY IF EXISTS "Allow public insert for notifications" ON notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON notifications;
DROP POLICY IF EXISTS "notifications_staff_insert" ON notifications;
DROP POLICY IF EXISTS "notifications_pending_staff_insert" ON notifications;
DROP POLICY IF EXISTS "notifications_public_signup_insert" ON notifications;

-- Coaches and owners: may notify themselves, or the owner they are attached to.
-- Any staff status is allowed so a PENDING coach's join request still reaches
-- the owner. staff_profiles is self-readable, so no SECURITY DEFINER needed.
CREATE POLICY "notifications_staff_insert" ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id::text = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM staff_profiles
      WHERE staff_profiles.id = auth.uid()
        AND staff_profiles.owner_id::text = notifications.user_id::text
    )
  );

-- Public signup forms: signup alerts only, addressed to a real owner, unread.
-- A spammer can still generate signup noise for a gym they know, but can no
-- longer forge session/coach/system notifications or target arbitrary accounts.
CREATE POLICY "notifications_public_signup_insert" ON notifications
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    type IN ('student_signup', 'cheer_signup')
    AND is_read = false
    AND public.is_gym_owner(user_id)
  );


-- ── PART 3: tumbling_students ───────────────────────────────────────────────
-- Was WITH CHECK (true): anyone could inject unlimited student records into any
-- gym's roster. Now the row must belong to a real owner and be marked as having
-- come from the signup form, which is what Signup.tsx already sets.
DROP POLICY IF EXISTS "Allow public insert for tumbling students" ON tumbling_students;
DROP POLICY IF EXISTS "tumbling_students_public_signup_insert" ON tumbling_students;

CREATE POLICY "tumbling_students_public_signup_insert" ON tumbling_students
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    public.is_gym_owner(user_id)
    AND signup_source = 'parent_signup_form'
  );


-- ── PART 4: team_athletes ───────────────────────────────────────────────────
-- Was WITH CHECK (true). Nothing public writes to this table — the cheer form
-- writes to cheer_registrations, and the tumbling form to tumbling_students.
-- Owners keep full access via team_athletes_owner_all, so this simply closes an
-- unused hole rather than replacing it.
DROP POLICY IF EXISTS "Allow public insert for team athletes" ON team_athletes;


-- ── PART 5: signup_submissions ──────────────────────────────────────────────
-- Two duplicate policies, both WITH CHECK (true). Collapsed into one scoped policy.
DROP POLICY IF EXISTS "Allow public insert for signup submissions" ON signup_submissions;
DROP POLICY IF EXISTS "Allow public signup inserts" ON signup_submissions;
DROP POLICY IF EXISTS "signup_submissions_public_insert" ON signup_submissions;

CREATE POLICY "signup_submissions_public_insert" ON signup_submissions
  FOR INSERT TO anon, authenticated
  WITH CHECK (public.is_gym_owner(user_id));


-- ── PART 6: cheer_registrations ─────────────────────────────────────────────
-- Was WITH CHECK (true). This table holds children's DOB, medical conditions,
-- allergies and emergency contacts, so unbounded anonymous writes are the worst
-- kind of noise to have here.
DROP POLICY IF EXISTS "Allow public inserts for cheer_registrations" ON cheer_registrations;
DROP POLICY IF EXISTS "cheer_registrations_public_insert" ON cheer_registrations;

CREATE POLICY "cheer_registrations_public_insert" ON cheer_registrations
  FOR INSERT TO anon, authenticated
  WITH CHECK (public.is_gym_owner(user_id));


-- ── PART 7: class_types public read ─────────────────────────────────────────
-- "public_read_class_types" was SELECT USING (true): every gym's full class
-- list, pricing and enrolment arrays were readable by anyone, for every gym on
-- the platform. The signup form genuinely needs to list classes, so this is
-- narrowed to classes actually opted in to signup rather than removed.
--
-- NOTE: `allow_signup IS NOT FALSE` deliberately matches the client's
-- `allow_signup !== false`, so rows where the column is NULL keep working. Using
-- `= true` here would make existing classes vanish from the signup form.
DROP POLICY IF EXISTS "public_read_class_types" ON class_types;
DROP POLICY IF EXISTS "public_read_signup_class_types" ON class_types;

CREATE POLICY "public_read_signup_class_types" ON class_types
  FOR SELECT TO anon
  USING (allow_signup IS NOT FALSE);


-- ── PART 8: contact_messages ────────────────────────────────────────────────
-- Public insert with no constraint. Not referenced in this codebase, so it is
-- left functional but this is a plain unauthenticated write endpoint: if it is
-- in use anywhere, it needs a captcha in front of it. Flagged, not changed.


-- ── PART 9: duplicate policy cleanup ────────────────────────────────────────
-- device_tokens had two identical policies (one pre-existing, one added by the
-- notification work). Harmless but confusing when auditing; keep one.
DROP POLICY IF EXISTS "Users manage their own device tokens" ON device_tokens;


-- ============================================================================
-- VERIFY — run these after the migration.
--
-- 1. No blanket policies should remain. Anything this returns is world-open:
--
--    SELECT tablename, policyname, cmd
--    FROM pg_policies
--    WHERE schemaname = 'public'
--      AND (qual = 'true' OR with_check = 'true')
--    ORDER BY tablename;
--
--    Expect: only contact_messages (see PART 8).
--
-- 2. STILL OUTSTANDING — pg_policies cannot show this. A table with RLS turned
--    OFF ignores every policy and is fully readable via the public anon key.
--    Run this and send me the result:
--
--    SELECT tablename, rowsecurity
--    FROM pg_tables
--    WHERE schemaname = 'public'
--    ORDER BY rowsecurity, tablename;
--
--    Every row must show rowsecurity = true. Pay attention to any leftover
--    `students` table from the tumbling_students/team_athletes migration — if it
--    still exists with RLS off, it holds the same children's data.
--
-- 3. Smoke-test before you consider this done:
--    • open a parent signup link while logged out and submit a registration
--    • open a cheer signup link while logged out and submit
--    • register a new coach with a gym access code
--    • log a session as a coach and confirm the owner's bell updates
--    If any of those fail, the cause is in this file and it is one DROP POLICY
--    away from being reverted.
-- ============================================================================
