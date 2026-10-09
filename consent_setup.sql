-- ============================================================================
-- JFLIPS: POPIA CONSENT (privacy notice + photo/video consent)
-- Safe to re-run. Additive only: creates one new table and three functions.
--
-- Security model:
--   * consent_records can only be read or changed by the signed-in OWNER.
--   * A parent's link can only reach its own rows, through the functions below,
--     and only by presenting the long random token. There is no way to list,
--     search or enumerate other families.
-- ============================================================================

CREATE TABLE IF NOT EXISTS consent_records (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL,                         -- the owner
  family_key        TEXT NOT NULL,                         -- groupKey, or the child's id when unlinked
  token             TEXT NOT NULL,                         -- unguessable link code, shared by both forms
  kind              TEXT NOT NULL CHECK (kind IN ('general', 'media')),
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed', 'withdrawn')),
  family_label      TEXT,
  child_first_names TEXT[] DEFAULT '{}',
  parent_name       TEXT,
  parent_phone      TEXT,
  parent_email      TEXT,
  details           JSONB NOT NULL DEFAULT '{}'::jsonb,    -- relationship, school/grade
  choices           JSONB NOT NULL DEFAULT '{}'::jsonb,    -- media: six true/false; general: {agreed:true}
  signature_data    TEXT,
  language          TEXT DEFAULT 'en',
  form_version      TEXT,
  signed_at         TIMESTAMPTZ,
  history           JSONB NOT NULL DEFAULT '[]'::jsonb,    -- every earlier state, never overwritten
  source            TEXT DEFAULT 'admin_link',
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE (token, kind),
  UNIQUE (user_id, family_key, kind)
);

CREATE INDEX IF NOT EXISTS consent_records_user_idx ON consent_records (user_id);

ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "consent_owner_all" ON consent_records;
CREATE POLICY "consent_owner_all" ON consent_records
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── 1. Read the rows behind one link ────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_consent_by_token(p_token TEXT)
RETURNS TABLE (
  kind TEXT, status TEXT, child_first_names TEXT[],
  parent_name TEXT, parent_phone TEXT, parent_email TEXT,
  details JSONB, choices JSONB, language TEXT, form_version TEXT, signed_at TIMESTAMPTZ
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT c.kind, c.status, c.child_first_names,
         c.parent_name, c.parent_phone, c.parent_email,
         c.details, c.choices, c.language, c.form_version, c.signed_at
  FROM consent_records c
  WHERE length(coalesce(p_token, '')) >= 24 AND c.token = p_token;
$$;

-- ── 2. Sign, change or withdraw one form behind a link ──────────────────────
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

  -- Keep the state being replaced. Nothing is ever overwritten.
  IF r.status <> 'pending' THEN
    r.history := r.history || jsonb_build_array(jsonb_build_object(
      'status', r.status, 'choices', r.choices, 'details', r.details,
      'parent_name', r.parent_name, 'parent_phone', r.parent_phone, 'parent_email', r.parent_email,
      'signature_data', r.signature_data, 'signed_at', r.signed_at,
      'form_version', r.form_version, 'language', r.language, 'archived_at', now()));
  END IF;

  IF p_withdraw THEN
    IF p_kind <> 'media' THEN
      RAISE EXCEPTION 'to withdraw the privacy notice please contact JFlips directly';
    END IF;
    FOREACH k IN ARRAY media_keys LOOP
      new_choices := new_choices || jsonb_build_object(k, false);
    END LOOP;
    UPDATE consent_records SET status = 'withdrawn', choices = new_choices, history = r.history,
      signed_at = now(), updated_at = now() WHERE id = r.id;
    RETURN 'withdrawn';
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
      'school_grade', left(coalesce(p_details ->> 'school_grade', ''), 120)),
    choices = new_choices,
    signature_data = p_signature,
    language = 'en',
    form_version = left(coalesce(p_form_version, ''), 20),
    signed_at = now(),
    history = r.history,
    updated_at = now()
  WHERE id = r.id;
  RETURN 'signed';
END;
$$;

-- ── 3. New registrations: record both forms signed on the signup page ───────
-- Only works for a child that exists for that owner, and never overwrites a
-- family that already has records (the existing token is simply returned).
CREATE OR REPLACE FUNCTION create_signup_consents(
  p_owner_id UUID, p_family_key TEXT, p_family_label TEXT, p_child_first_names TEXT[],
  p_parent_name TEXT, p_parent_phone TEXT, p_parent_email TEXT, p_details JSONB,
  p_general_signature TEXT, p_media_choices JSONB, p_media_signature TEXT,
  p_general_version TEXT, p_media_version TEXT, p_token TEXT
)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  existing TEXT;
  k TEXT;
  media_keys TEXT[] := ARRAY['instagramFacebookPhotos','instagramFacebookVideos','firstNameOnly','website','printedMaterial','internalRecordings'];
  clean_media JSONB := '{}'::jsonb;
  det JSONB;
BEGIN
  IF p_owner_id IS NULL OR p_family_key IS NULL OR length(coalesce(p_token, '')) < 24 THEN
    RAISE EXCEPTION 'invalid request';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM tumbling_students WHERE id::text = p_family_key AND user_id::text = p_owner_id::text) THEN
    RAISE EXCEPTION 'unknown child';
  END IF;

  -- A family that already has records is left untouched. The existing link code is
  -- NEVER returned: anyone who learned a child's id could otherwise open that
  -- family's consent page.
  SELECT token INTO existing FROM consent_records
   WHERE user_id = p_owner_id AND family_key = p_family_key LIMIT 1;
  IF existing IS NOT NULL THEN RETURN NULL; END IF;

  IF length(coalesce(trim(p_parent_name), '')) < 2 THEN RAISE EXCEPTION 'name required'; END IF;
  IF length(coalesce(p_general_signature, '')) < 100 OR length(p_general_signature) > 400000
     OR length(coalesce(p_media_signature, '')) < 100 OR length(p_media_signature) > 400000 THEN
    RAISE EXCEPTION 'signatures required';
  END IF;
  FOREACH k IN ARRAY media_keys LOOP
    IF jsonb_typeof(p_media_choices -> k) IS DISTINCT FROM 'boolean' THEN
      RAISE EXCEPTION 'every choice must be answered';
    END IF;
    clean_media := clean_media || jsonb_build_object(k, (p_media_choices ->> k)::boolean);
  END LOOP;

  det := jsonb_build_object(
    'relationship', left(coalesce(p_details ->> 'relationship', ''), 80),
    'school_grade', left(coalesce(p_details ->> 'school_grade', ''), 120));

  INSERT INTO consent_records (user_id, family_key, token, kind, status, family_label, child_first_names,
    parent_name, parent_phone, parent_email, details, choices, signature_data, language, form_version, signed_at, source)
  VALUES
   (p_owner_id, p_family_key, p_token, 'general', 'signed', left(p_family_label, 160), p_child_first_names,
    left(trim(p_parent_name), 120), left(coalesce(p_parent_phone, ''), 40), left(coalesce(p_parent_email, ''), 160),
    det, '{"agreed": true}'::jsonb, p_general_signature, 'en', left(p_general_version, 20), now(), 'signup'),
   (p_owner_id, p_family_key, p_token, 'media', 'signed', left(p_family_label, 160), p_child_first_names,
    left(trim(p_parent_name), 120), left(coalesce(p_parent_phone, ''), 40), left(coalesce(p_parent_email, ''), 160),
    det, clean_media, p_media_signature, 'en', left(p_media_version, 20), now(), 'signup');
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION get_consent_by_token(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION submit_consent(TEXT,TEXT,TEXT,TEXT,TEXT,JSONB,JSONB,TEXT,TEXT,TEXT,BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION create_signup_consents(UUID,TEXT,TEXT,TEXT[],TEXT,TEXT,TEXT,JSONB,TEXT,JSONB,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_consent_by_token(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION submit_consent(TEXT,TEXT,TEXT,TEXT,TEXT,JSONB,JSONB,TEXT,TEXT,TEXT,BOOLEAN) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_signup_consents(UUID,TEXT,TEXT,TEXT[],TEXT,TEXT,TEXT,JSONB,TEXT,JSONB,TEXT,TEXT,TEXT,TEXT) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
