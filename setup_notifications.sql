-- ============================================================================
-- JFLIPS Notification Engine — database setup
-- Run this once in your Supabase SQL Editor.
--
-- Covers the three notification events:
--   • student_signup / cheer_signup  (public signup forms → owner)
--   • coach_signup                   (coach requests to join → owner)
--   • session_logged                 (coach logs a session → owner)
-- ============================================================================

-- ── 1. notifications table: new columns ─────────────────────────────────────
-- `title` is the push notification headline; `type` drives the icon/routing.
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Make sure inserts that omit `id` work (the app relies on this default).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'id' AND column_default IS NOT NULL
  ) THEN
    BEGIN
      ALTER TABLE notifications ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
    EXCEPTION WHEN others THEN
      ALTER TABLE notifications ALTER COLUMN id SET DEFAULT gen_random_uuid();
    END;
  END IF;
END $$;

-- If a CHECK constraint restricts `type`, widen it to the full set.
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'student_signup',
    'cheer_signup',
    'coach_signup',
    'session_logged',
    'class_added',
    'system'
  ));

CREATE INDEX IF NOT EXISTS notifications_user_created_idx
  ON notifications (user_id, created_at DESC);

-- ── 2. device_tokens table (FCM push targets) ───────────────────────────────
-- One row per device per user. The app upserts on (user_id, fcm_token).
CREATE TABLE IF NOT EXISTS device_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fcm_token  TEXT NOT NULL,
  platform   TEXT DEFAULT 'android',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Required for the client's .upsert({ onConflict: 'user_id,fcm_token' }).
CREATE UNIQUE INDEX IF NOT EXISTS device_tokens_user_token_key
  ON device_tokens (user_id, fcm_token);

ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "device_tokens_own" ON device_tokens;
CREATE POLICY "device_tokens_own" ON device_tokens
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
-- The send-push-notification Edge Function reads this table with the service
-- role key, which bypasses RLS — no extra policy needed for it.

-- ── 3. notifications RLS: let a PENDING coach alert the owner ───────────────
-- fix_sessions_rls.sql only allows inserts from coaches whose status is
-- 'approved'. A coach signing up is still 'pending', so their join request
-- could never reach the owner's bell. This policy scopes the gap tightly:
-- you may insert a notification addressed to an owner you actually have a
-- staff_profiles row under, at any status.
DROP POLICY IF EXISTS "notifications_pending_staff_insert" ON notifications;
CREATE POLICY "notifications_pending_staff_insert" ON notifications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_profiles
      WHERE staff_profiles.id = auth.uid()
        AND staff_profiles.owner_id::text = notifications.user_id::text
    )
  );

-- ── 4. Realtime: push new notifications to an open app instantly ────────────
-- This is what lets the owner's device raise a LOCAL notification the moment a
-- coach logs a session, without waiting for an FCM round trip.
ALTER TABLE notifications REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
EXCEPTION
  WHEN duplicate_object THEN NULL;  -- already in the publication
  WHEN undefined_object THEN NULL;  -- publication not present on this project
END $$;

-- ============================================================================
-- After running this, deploy the push function and add the Firebase secret:
--
--   supabase secrets set FIREBASE_SERVICE_ACCOUNT_JSON="$(cat service-account.json)"
--   supabase functions deploy send-push-notification --no-verify-jwt
--
-- Get service-account.json from:
--   Firebase Console → Project Settings → Service accounts → Generate new private key
-- ============================================================================
