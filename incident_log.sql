-- JFLIPS: INCIDENT LOG (Management > Incidents). Safe to re-run. Additive only.
-- Owner: full access. Approved coaches: read and add incidents for their gym.

CREATE TABLE IF NOT EXISTS incident_reports (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL,          -- the owner
  incident_date        DATE NOT NULL,
  incident_time        TEXT,
  venue                TEXT,
  class_name           TEXT,
  athlete_names        TEXT,
  description          TEXT NOT NULL,
  injury_treatment     TEXT,
  first_aid_by         TEXT,
  emergency_services   BOOLEAN NOT NULL DEFAULT false,
  parent_notified      BOOLEAN NOT NULL DEFAULT false,
  parent_notified_note TEXT,
  follow_up            TEXT,
  reported_by          UUID,
  reported_by_name     TEXT,
  created_at           TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS incident_reports_user_date_idx ON incident_reports (user_id, incident_date DESC);

ALTER TABLE incident_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "incident_owner_all" ON incident_reports;
CREATE POLICY "incident_owner_all" ON incident_reports
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "incident_staff_select" ON incident_reports;
CREATE POLICY "incident_staff_select" ON incident_reports
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM staff_profiles sp
    WHERE sp.id = auth.uid() AND sp.owner_id::text = incident_reports.user_id::text AND sp.status = 'approved'));

DROP POLICY IF EXISTS "incident_staff_insert" ON incident_reports;
CREATE POLICY "incident_staff_insert" ON incident_reports
  FOR INSERT
  WITH CHECK (
    reported_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM staff_profiles sp
      WHERE sp.id = auth.uid() AND sp.owner_id::text = incident_reports.user_id::text AND sp.status = 'approved'));

NOTIFY pgrst, 'reload schema';
