-- ============================================================================
-- JFLIPS: TIGHTEN WHO CAN READ WHAT  (step 1 of 2: ADD the safe functions)
-- Additive only. Nothing is dropped here, so nothing can break by running it.
-- The old broad policies are removed in step 2 (tighten_access_step2.sql), only
-- after the new app version is live and a coach login has been tested.
-- ============================================================================

-- 1. Sign-up page: the class list WITHOUT the enrolled children's ids.
CREATE OR REPLACE FUNCTION get_signup_classes(p_owner_id TEXT)
RETURNS TABLE (id TEXT, name TEXT, price NUMERIC)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT ct.id::text, ct.name::text, ct.price::numeric
  FROM class_types ct
  WHERE ct.user_id::text = p_owner_id AND ct.allow_signup IS NOT FALSE
  ORDER BY ct.name;
$$;

-- 2. Sign-up page: put a newly registered child into the class they chose.
--    Only works for a child that registered through the sign-up form for this
--    owner, into a class that accepts sign-ups.
CREATE OR REPLACE FUNCTION signup_enrol_student(p_owner_id TEXT, p_class_id TEXT, p_student_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM tumbling_students s
    WHERE s.id::text = p_student_id AND s.user_id::text = p_owner_id
      AND s.signup_source = 'parent_signup_form'
  ) THEN
    RETURN FALSE;
  END IF;

  UPDATE class_types
     SET enrolled_student_ids =
       CASE WHEN coalesce(enrolled_student_ids, '[]'::jsonb) @> to_jsonb(p_student_id)
            THEN coalesce(enrolled_student_ids, '[]'::jsonb)
            ELSE coalesce(enrolled_student_ids, '[]'::jsonb) || to_jsonb(p_student_id) END
   WHERE id::text = p_class_id AND user_id::text = p_owner_id AND allow_signup IS NOT FALSE;
  RETURN FOUND;
END;
$$;

-- 3. Coaches: the children's records WITHOUT the parent's signature image, the
--    parent's email address or the child's date of birth. Coaches keep name, age,
--    medical notes and the parents' phone numbers, which they need for safety.
CREATE OR REPLACE FUNCTION coach_roster()
RETURNS SETOF JSONB
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT (to_jsonb(t) - 'signature_data' - 'parent1_email' - 'dob' - 'indemnity_record' - 'custom_group_rate' - 'custom_private_rate')
         || jsonb_build_object('parent_must_stay',
              CASE WHEN t.dob IS NOT NULL AND t.dob::text ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
                   THEN age(substring(t.dob::text from 1 for 10)::date) < interval '5 years'
                   ELSE false END)
  FROM tumbling_students t
  JOIN staff_profiles sp
    ON sp.id = auth.uid()
   AND sp.status = 'approved'
   AND sp.owner_id::text = t.user_id::text
   AND coalesce(sp.can_view_tumbling, false);
$$;

-- 4. Coaches: colleagues' NAMES only (never bank details, pay rate, email, phone).
CREATE OR REPLACE FUNCTION coach_directory()
RETURNS TABLE (id TEXT, name TEXT, username TEXT, status TEXT)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT s.id::text, s.name::text, s.username::text, s.status::text
  FROM staff_profiles s
  WHERE s.status = 'approved'
    AND s.owner_id::text = (
      SELECT me.owner_id::text FROM staff_profiles me
      WHERE me.id = auth.uid() AND me.status = 'approved' LIMIT 1);
$$;

REVOKE ALL ON FUNCTION get_signup_classes(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION signup_enrol_student(TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION coach_roster() FROM PUBLIC;
REVOKE ALL ON FUNCTION coach_directory() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_signup_classes(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION signup_enrol_student(TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION coach_roster() TO authenticated;
GRANT EXECUTE ON FUNCTION coach_directory() TO authenticated;

NOTIFY pgrst, 'reload schema';
