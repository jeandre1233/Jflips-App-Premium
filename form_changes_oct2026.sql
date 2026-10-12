-- ============================================================================
-- JFLIPS: OLD ATHLETES ARCHIVE, EMERGENCY CONTACT FOR COACHES, LOCKED CONSENT FORMS
--
-- 1. old_athletes: where a child's record goes when you remove them. Owner only.
--      documents  = the signed forms (kept until documents_keep_until)
--      profile    = everything else (deleted after profile_delete_after)
-- 2. coach_roster(): coaches now also get the emergency contact (and still no
--    signature, email, date of birth, signed record or custom rates).
-- 3. submit_consent(): a signed form can no longer be changed through the family's
--    link. The family asks you; you reopen the form; they sign again.
-- 4. reopen_consent(): the owner-only function behind the "Reopen" button.
-- Safe to run more than once.
-- ============================================================================

-- 1. OLD ATHLETES ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS old_athletes (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL,                       -- the owner
  original_id          TEXT NOT NULL,                       -- the child's id before removal
  source_table         TEXT NOT NULL DEFAULT 'tumbling_students',
  name                 TEXT,
  left_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  documents            JSONB NOT NULL DEFAULT '{}'::jsonb,  -- signed forms and the saved PDF
  documents_keep_until DATE,                                -- child's 19th birthday, or 5 years after an adult leaves
  profile              JSONB NOT NULL DEFAULT '{}'::jsonb,  -- everything else
  profile_delete_after DATE,                                -- 12 months after leaving
  profile_deleted_at   TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, original_id)
);

CREATE INDEX IF NOT EXISTS old_athletes_user_idx ON old_athletes (user_id);

ALTER TABLE old_athletes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "old_athletes_owner_all" ON old_athletes;
CREATE POLICY "old_athletes_owner_all" ON old_athletes
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 2. COACHES SEE THE EMERGENCY CONTACT ---------------------------------------
CREATE OR REPLACE FUNCTION coach_roster()
RETURNS SETOF JSONB
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT (to_jsonb(t) - 'signature_data' - 'parent1_email' - 'dob' - 'indemnity_record' - 'custom_group_rate' - 'custom_private_rate')
         || jsonb_build_object('parent_must_stay',
              CASE WHEN t.dob IS NOT NULL AND t.dob::text ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
                   THEN age(substring(t.dob::text from 1 for 10)::date) < interval '5 years'
                   ELSE false END)
         || jsonb_build_object('emergency_contact', t.indemnity_record -> 'emergency_contact')
  FROM tumbling_students t
  JOIN staff_profiles sp
    ON sp.id = auth.uid()
   AND sp.status = 'approved'
   AND sp.owner_id::text = t.user_id::text
   AND coalesce(sp.can_view_tumbling, false);
$$;

-- 3. A SIGNED FORM CANNOT BE CHANGED THROUGH THE LINK ------------------------
CREATE OR REPLACE FUNCTION submit_consent(
  p_token TEXT, p_kind TEXT, p_parent_name TEXT, p_parent_phone TEXT, p_parent_email TEXT,
  p_details JSONB, p_choices JSONB, p_signature TEXT, p_language TEXT, p_form_version TEXT,
  p_withdraw BOOLEAN DEFAULT false
)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r consent_records;
  k TEXT;
  media_keys TEXT[] := ARRAY['instagramFacebookPhotos','instagramFacebookVideos','firstNameOnly','website','printedMaterial','internalRecordings'];
  new_choices JSONB := '{}'::jsonb;
BEGIN
  IF p_token IS NULL OR length(p_token) < 24 THEN RAISE EXCEPTION 'invalid link'; END IF;
  SELECT * INTO r FROM consent_records WHERE token = p_token AND kind = p_kind FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid link'; END IF;

  -- A form that has been signed stays as signed. To change or withdraw, the family
  -- contacts JFLIPS, who reopen the form (reopen_consent) and send the link again.
  IF r.status <> 'pending' THEN
    RAISE EXCEPTION 'this form is already signed: please contact JFLIPS if you want to change it';
  END IF;
  IF p_withdraw THEN
    RAISE EXCEPTION 'to change or withdraw your consent please contact JFLIPS directly';
  END IF;

  IF length(coalesce(trim(p_parent_name), '')) < 2 THEN RAISE EXCEPTION 'name required'; END IF;
  IF p_signature IS NULL OR length(p_signature) < 100 OR length(p_signature) > 400000 THEN
    RAISE EXCEPTION 'signature required';
  END IF;

  IF p_kind = 'media' THEN
    FOREACH k IN ARRAY media_keys LOOP
      IF jsonb_typeof(p_choices -> k) IS DISTINCT FROM 'boolean' THEN
        RAISE EXCEPTION 'every choice must be answered';
      END IF;
      new_choices := new_choices || jsonb_build_object(k, (p_choices ->> k)::boolean);
    END LOOP;
  ELSE
    IF (p_choices ->> 'agreed') IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'agreement required'; END IF;
    new_choices := jsonb_build_object('agreed', true);
  END IF;

  UPDATE consent_records SET
    status = 'signed',
    parent_name = left(trim(p_parent_name), 120),
    parent_phone = left(coalesce(p_parent_phone, ''), 40),
    parent_email = left(coalesce(p_parent_email, ''), 160),
    details = jsonb_build_object(
      'relationship', left(coalesce(p_details ->> 'relationship', ''), 80),
      'audience', coalesce(r.details ->> 'audience', 'minor')),
    choices = new_choices,
    signature_data = p_signature,
    language = 'en',
    form_version = left(coalesce(p_form_version, ''), 20),
    signed_at = now(),
    updated_at = now()
  WHERE id = r.id;
  RETURN 'signed';
END;
$$;

-- 4. THE OWNER REOPENS A FORM ON REQUEST --------------------------------------
-- Keeps the signed state in the record's history (never overwritten), then makes the
-- form fillable again through the same link.
CREATE OR REPLACE FUNCTION reopen_consent(p_id UUID)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r consent_records;
BEGIN
  SELECT * INTO r FROM consent_records WHERE id = p_id AND user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;
  IF r.status = 'pending' THEN RETURN 'already open'; END IF;
  UPDATE consent_records SET
    history = history || jsonb_build_array(jsonb_build_object(
      'status', r.status, 'choices', r.choices, 'details', r.details,
      'parent_name', r.parent_name, 'parent_phone', r.parent_phone, 'parent_email', r.parent_email,
      'signature_data', r.signature_data, 'signed_at', r.signed_at,
      'form_version', r.form_version, 'language', r.language,
      'archived_at', now(), 'reopened_by_owner', true)),
    status = 'pending',
    updated_at = now()
  WHERE id = r.id;
  RETURN 'reopened';
END;
$$;

REVOKE ALL ON FUNCTION reopen_consent(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reopen_consent(UUID) TO authenticated;
REVOKE ALL ON FUNCTION coach_roster() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION coach_roster() TO authenticated;
REVOKE ALL ON FUNCTION submit_consent(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, TEXT, TEXT, TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION submit_consent(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, TEXT, TEXT, TEXT, BOOLEAN) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
