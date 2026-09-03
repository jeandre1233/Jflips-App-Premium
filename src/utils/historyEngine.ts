/**
 * HISTORY ENGINE
 * ══════════════
 * History used to be maintained by ADDING each archive onto the totals already
 * stored on the month's row (`revenue: existing + new`, `sessions_json: [...old,
 * ...new]`). That is what made it impossible to keep correct:
 *
 *   • A class shared between two families is archived once per family. The
 *     second archive pushed the SAME session id in again, so its revenue and
 *     its session count were counted twice.
 *   • Editing or deleting a session after it was archived changed nothing — the
 *     stored total was a frozen sum with no link back to the work behind it.
 *   • A client with mixed work (a school that also runs classes) had whole
 *     streams dropped by an `if / else if` chain that assumed one kind only.
 *
 * Everything here exists to replace that with a single rule:
 *
 *   THE ARCHIVED SESSIONS ARE THE ONLY SOURCE OF TRUTH. Every money column on a
 *   history month is DERIVED from them, through the same pricing engine that
 *   draws the live invoices, and written as an ABSOLUTE value.
 *
 * The consequence is that archiving is idempotent: archiving the same session
 * twice, or recalculating a month a hundred times, always lands on the same
 * numbers. And because the totals are derived, an edit or a deletion is fixed by
 * recomputing the month rather than by trying to unwind an old addition.
 */

import { AttendanceSession } from '../../types';
import {
  PricingContext,
  PricedClientLine,
  PricedCoachLine,
  priceSessions,
  sumLines,
  billingMonthFor,
  MONTH_NAMES
} from './pricing';

const money = (n: number): number => Math.round((Number(n) || 0) * 100) / 100;

/** Money columns for one archived month, all derived — never accumulated. */
export interface MonthTotals {
  tumblingGross: number;
  tumblingCoachPay: number;
  tumblingNet: number;
  schoolsGross: number;
  schoolsCoachPay: number;
  gymsGross: number;
  gymsNet: number;
  merchGross: number;
  merchCost: number;
  merchNet: number;
  totalGross: number;
  totalCoachPayout: number;
  netProfit: number;
  sessionCount: number;
  /** What the clients were actually invoiced — the History tab's headline. */
  invoicesTotal: number;
  /** How many separate client invoices that total is made of. */
  invoiceCount: number;
  /** Per-client invoice breakdown, so the total can be audited on screen. */
  invoices: ArchivedInvoice[];
}

export interface ArchivedInvoice {
  familyId: string;
  amount: number;
  kind: 'class' | 'gym' | 'cheer' | 'merch';
}

export const EMPTY_MONTH_TOTALS: MonthTotals = {
  tumblingGross: 0,
  tumblingCoachPay: 0,
  tumblingNet: 0,
  schoolsGross: 0,
  schoolsCoachPay: 0,
  gymsGross: 0,
  gymsNet: 0,
  merchGross: 0,
  merchCost: 0,
  merchNet: 0,
  totalGross: 0,
  totalCoachPayout: 0,
  netProfit: 0,
  sessionCount: 0,
  invoicesTotal: 0,
  invoiceCount: 0,
  invoices: []
};

/**
 * Merge freshly archived sessions into the ones a month already holds, keyed by
 * session id so the same session can never appear twice.
 *
 * This is the function that makes a second archive of a shared class harmless,
 * and the mode is why it needs two behaviours:
 *
 * 'union' (archiving) — a class shared by two families is archived once per
 *   family, each time as that family's SLICE of the roster. Neither slice is
 *   the whole session, so the rosters are unioned and the session reassembles
 *   itself as each family is billed. Overwriting instead would delete the first
 *   family's revenue the moment the second one was archived, which is one of
 *   the ways the old totals went wrong.
 *
 * 'replace' (an edit or a correction) — the incoming row IS the truth about
 *   that session, including an athlete having been taken off it, so it wins
 *   outright.
 */
export function mergeArchivedSessions(
  existing: AttendanceSession[] = [],
  incoming: AttendanceSession[] = [],
  mode: 'union' | 'replace' = 'union'
): AttendanceSession[] {
  const byId = new Map<string, AttendanceSession>();
  (existing || []).forEach(s => { if (s && s.id) byId.set(s.id, s); });

  (incoming || []).forEach(s => {
    if (!s || !s.id) return;
    const prev = byId.get(s.id);
    if (!prev || mode === 'replace') {
      byId.set(s.id, s);
      return;
    }
    byId.set(s.id, {
      ...prev,
      ...s,
      studentIds: Array.from(new Set([...(prev.studentIds || []), ...(s.studentIds || [])]))
    });
  });

  return Array.from(byId.values()).sort((a, b) =>
    String(a.date || '').localeCompare(String(b.date || ''))
  );
}

/**
 * Split sessions into the billing months they file under, using the priced lines
 * rather than the bare date — a gym's billing day can move a session into the
 * next month, and the invoice the client received is the thing history must
 * agree with.
 */
export function groupSessionsByMonth(
  sessions: AttendanceSession[],
  ctx: PricingContext
): Map<string, { monthName: string; year: number; sessions: AttendanceSession[] }> {
  const out = new Map<string, { monthName: string; year: number; sessions: AttendanceSession[] }>();
  if (!sessions || sessions.length === 0) return out;

  const { clientLines, coachLines } = priceSessions(sessions, ctx);
  const monthOf = new Map<string, { key: string; monthName: string; year: number }>();
  [...clientLines, ...coachLines].forEach(l => {
    if (!monthOf.has(l.sessionId)) {
      monthOf.set(l.sessionId, {
        key: l.billingMonthKey,
        monthName: l.billingMonthName,
        year: l.billingYear
      });
    }
  });

  sessions.forEach(s => {
    // A session nobody is billed for (an empty roster, say) still belongs in
    // history — fall back to its calendar month so it is never silently lost.
    const m = monthOf.get(s.id) || (() => {
      const b = billingMonthFor(s.date);
      return { key: b.key, monthName: b.monthName, year: b.year };
    })();

    if (!out.has(m.key)) out.set(m.key, { monthName: m.monthName, year: m.year, sessions: [] });
    out.get(m.key)!.sessions.push(s);
  });

  return out;
}

/**
 * Price a month's archived sessions and return every history column.
 *
 * Stream rules match the live invoice exactly:
 *   tumbling — client lines of kind 'class'; coach cost is the turn-in owed to
 *              STAFF (never the owner, who is not paid by their own business, so
 *              an expense row for them would be fictional).
 *   schools  — client lines of kind 'cheer'; coach cost is every line tagged
 *              with an org, since those are a breakdown of the school's own
 *              master invoice.
 *   gyms     — client lines of kind 'gym'; the full amount is business revenue,
 *              there is no coach cost against it.
 */
export function computeMonthTotals(
  sessions: AttendanceSession[],
  ctx: PricingContext
): MonthTotals {
  const hasSessions = sessions && sessions.length > 0;
  const hasMerch = ctx?.merchOrders && ctx.merchOrders.length > 0;
  if (!hasSessions && !hasMerch) {
    return { ...EMPTY_MONTH_TOTALS, invoices: [] };
  }

  const { clientLines, coachLines } = priceSessions(sessions || [], ctx);
  const ownerId = ctx.profile?.id;

  const byKind = (k: PricedClientLine['kind']) => clientLines.filter(l => l.kind === k);
  const isStaffTurnIn = (l: PricedCoachLine) => l.orgId === null && l.coachId !== ownerId;

  const tumblingGross    = sumLines(byKind('class'));
  const tumblingCoachPay = sumLines(coachLines.filter(isStaffTurnIn));
  const tumblingNet      = money(tumblingGross - tumblingCoachPay);

  const schoolsGross     = sumLines(byKind('cheer'));
  const schoolsCoachPay  = sumLines(coachLines.filter(l => l.orgId !== null));

  const gymsGross        = sumLines(byKind('gym'));
  const gymsNet          = gymsGross;

  const merchLines       = byKind('merch');
  const merchGross       = sumLines(merchLines);
  const merchCost        = money(merchLines.reduce((acc, l) => acc + (l.costAmount || 0), 0));
  const merchNet         = money(merchGross - merchCost);

  const totalGross       = money(tumblingGross + schoolsGross + gymsGross + merchGross);
  const totalCoachPayout = money(tumblingCoachPay + schoolsCoachPay);
  const netProfit        = money(tumblingNet + gymsNet + merchNet);

  // One invoice per client, exactly as the client received it. Zero and negative
  // lines are folded in so a discounted invoice still totals what was sent, but
  // a client whose invoice nets nothing is not counted as an invoice.
  const perClient = new Map<string, ArchivedInvoice>();
  clientLines.forEach(l => {
    const found = perClient.get(l.billToId);
    if (found) found.amount = money(found.amount + l.amount);
    else perClient.set(l.billToId, { familyId: l.billToId, amount: money(l.amount), kind: l.kind });
  });
  const invoices = Array.from(perClient.values()).filter(i => i.amount > 0);

  return {
    tumblingGross,
    tumblingCoachPay,
    tumblingNet,
    schoolsGross,
    schoolsCoachPay,
    gymsGross,
    gymsNet,
    merchGross,
    merchCost,
    merchNet,
    totalGross,
    totalCoachPayout,
    netProfit,
    sessionCount: (sessions || []).length,
    invoicesTotal: money(invoices.reduce((a, i) => a + i.amount, 0)),
    invoiceCount: invoices.length,
    invoices
  };
}

/** The `payments.invoice_id` / `archived_sessions.month_key` for a month. */
export function monthKeyOf(monthName: string, year: number): string {
  return `${monthName} ${year}`;
}

/** Parse "August 2026" back into its parts. Returns null if it isn't one. */
export function parseMonthKey(key: string): { monthName: string; year: number } | null {
  const m = String(key || '').trim().match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (!m) return null;
  const monthName = MONTH_NAMES.find(n => n.toLowerCase() === m[1].toLowerCase());
  if (!monthName) return null;
  return { monthName, year: Number(m[2]) };
}

/** Shape an app-side session into an `archived_sessions` row. */
export function toArchivedRow(
  s: AttendanceSession,
  userId: string,
  historyId: string | null,
  monthName: string,
  year: number
) {
  return {
    id: s.id,
    user_id: userId,
    history_id: historyId,
    month_key: monthKeyOf(monthName, year),
    month_name: monthName,
    year,
    date: s.date,
    class_type_id: s.classTypeId || null,
    student_ids: s.studentIds || [],
    coach_id: s.coach_id || null,
    hours_coached: s.hours_coached ?? null,
    is_competition: !!s.is_competition,
    custom_event_name: s.custom_event_name || null,
    covering_coach_name: s.covering_coach_name || null,
    session_group_id: s.session_group_id || null
  };
}

/** Turn an `archived_sessions` row back into an app-side session. */
export function fromArchivedRow(row: any): AttendanceSession {
  return {
    id: row.id,
    date: row.date,
    classTypeId: row.class_type_id,
    studentIds: row.student_ids || [],
    hours_coached: row.hours_coached ?? undefined,
    coach_id: row.coach_id ?? undefined,
    is_competition: !!row.is_competition,
    custom_event_name: row.custom_event_name ?? undefined,
    covering_coach_name: row.covering_coach_name ?? undefined,
    session_group_id: row.session_group_id ?? undefined
  };
}
