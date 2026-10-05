-- ============================================================================
-- JFLIPS: REMOVE DUPLICATE PAYSLIPS / INVOICES, AND STOP THEM COMING BACK
-- Run in Supabase -> SQL Editor. Safe to re-run.
--
-- Older versions saved a NEW payslip and ADDED onto the invoice amount on every
-- reset, so running a reset more than once stacked copies. The app no longer
-- does that; this file cleans what is already there and then makes the database
-- itself refuse a second copy.
--
-- After running it: open History and press "Recalculate All". Any invoice whose
-- amount differs from the archive is flagged with a one-tap "Set to R..." fix.
-- ============================================================================

-- 1. Payslips: keep ONE per coach per month (a paid one first, then the oldest).
DELETE FROM staff_payslips a
USING (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY owner_id, coach_id, period_month
           ORDER BY CASE status WHEN 'paid' THEN 0 WHEN 'processing' THEN 1 ELSE 2 END,
                    created_at ASC NULLS LAST,
                    id
         ) AS rn
  FROM staff_payslips
) d
WHERE a.id = d.id AND d.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS staff_payslips_one_per_coach_month
  ON staff_payslips (owner_id, coach_id, period_month);

-- 2. Client invoices: keep ONE per client per month (a paid one first, then the
--    OLDEST, which is the original invoice rather than a later duplicate run).
DELETE FROM payments a
USING (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY user_id, invoice_id, family_id
           ORDER BY (CASE WHEN is_paid IS TRUE THEN 0 ELSE 1 END),
                    created_at ASC NULLS LAST,
                    id
         ) AS rn
  FROM payments
  WHERE COALESCE(is_expense, false) = false
) d
WHERE a.id = d.id AND d.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS payments_one_invoice_per_client_month
  ON payments (user_id, invoice_id, family_id)
  WHERE COALESCE(is_expense, false) = false;

-- 3. Coach payout rows: same rule.
DELETE FROM payments a
USING (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY user_id, invoice_id, family_id
           ORDER BY created_at ASC NULLS LAST, id
         ) AS rn
  FROM payments
  WHERE is_expense IS TRUE
) d
WHERE a.id = d.id AND d.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS payments_one_payout_per_coach_month
  ON payments (user_id, invoice_id, family_id)
  WHERE is_expense IS TRUE;

NOTIFY pgrst, 'reload schema';
