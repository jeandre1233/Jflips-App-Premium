-- ============================================================================
-- JFLIPS: FIND DUPLICATES (READ ONLY — changes nothing)
-- Run each query on its own in Supabase -> SQL Editor.
-- ============================================================================

-- 1. LIVE sessions: an athlete logged more than once for the same class on the
--    same day. Each row is a child who would have been billed twice before the
--    pricing fix. `session_ids` are the registers they appear in.
SELECT s.class_type_id,
       s.date,
       sid                          AS student_id,
       (SELECT name FROM students st WHERE st.id = sid LIMIT 1) AS student_name,
       COUNT(DISTINCT COALESCE(s.session_group_id, s.id)) AS registers,
       ARRAY_AGG(DISTINCT s.id)     AS session_ids
FROM sessions s,
     LATERAL jsonb_array_elements_text(to_jsonb(s.student_ids)) AS sid
GROUP BY s.user_id, s.class_type_id, s.date, LOWER(COALESCE(s.custom_event_name, '')), sid
HAVING COUNT(DISTINCT COALESCE(s.session_group_id, s.id)) > 1
ORDER BY s.date DESC;

-- 2. ARCHIVED sessions: same check on months you have already reset.
SELECT a.month_key,
       a.class_type_id,
       a.date,
       sid                          AS student_id,
       (SELECT name FROM students st WHERE st.id = sid LIMIT 1) AS student_name,
       COUNT(DISTINCT COALESCE(a.session_group_id, a.id)) AS registers,
       ARRAY_AGG(DISTINCT a.id)     AS session_ids
FROM archived_sessions a,
     LATERAL jsonb_array_elements_text(to_jsonb(a.student_ids)) AS sid
GROUP BY a.user_id, a.month_key, a.class_type_id, a.date, LOWER(COALESCE(a.custom_event_name, '')), sid
HAVING COUNT(DISTINCT COALESCE(a.session_group_id, a.id)) > 1
ORDER BY a.date DESC;

-- 3. Invoice rows: more than one per client per month. After
--    fix_duplicate_invoices.sql this should return nothing.
SELECT user_id, invoice_id, family_id, COUNT(*) AS copies, SUM(amount_due) AS total_if_added
FROM payments
WHERE COALESCE(is_expense, false) = false
GROUP BY user_id, invoice_id, family_id
HAVING COUNT(*) > 1;

-- 4. Every invoice for one month, biggest first, to eyeball against what you
--    actually sent. Change 'September 2026' to the month you want.
SELECT client_name, amount_due, is_paid, created_at
FROM payments
WHERE invoice_id = 'September 2026'
  AND COALESCE(is_expense, false) = false
ORDER BY amount_due DESC;
