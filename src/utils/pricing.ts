/**
 * ============================================================================
 *  JFLIPS — SINGLE SOURCE OF TRUTH FOR ALL INVOICE ARITHMETIC
 * ============================================================================
 *
 *  Every rand figure in the app must come from priceSessions(). Before this
 *  file existed the same pricing rules were re-implemented four times (invoice
 *  rows, invoice totals, month-end archive, single-invoice reset) and they had
 *  drifted apart — which is why line items and "Total Due" disagreed.
 *
 *  ── THE RULES ──────────────────────────────────────────────────────────────
 *
 *  A logical session ("group") is one real-world coaching slot. Because the app
 *  writes ONE ROW PER COACH, a slot covered by two coaches is two rows. Rows are
 *  collapsed back into a group by `session_group_id` (exact) or, for legacy rows
 *  written before that column existed, by date + entity + event + competition.
 *
 *  CLASS SESSION (class_types) — private / group classes billed to athletes
 *      client : class.price × athletes present, ONCE per group
 *      coach  : each coach earns their own profile hourly rate × hours
 *
 *  TUMBLING GYM SESSION (gyms, gym_type='tumbling')
 *      client : rate × hours, ONCE per group
 *      coach  : each coach earns their own profile hourly rate × hours
 *
 *  CHEER / SCHOOL PRACTICE (gyms, gym_type='cheer')
 *      coach  : (sub-team rate ÷ number of coaches on that group) × own hours
 *      client : the sum of that group's coach lines
 *
 *  CHEER / SCHOOL COMPETITION (is_competition = true)
 *      Competitions DO NOT split. Every coach is at the competition working, so
 *      each bills the full competition rate for their own hours and the school
 *      pays for all of them.
 *      coach  : competition rate × own hours
 *      client : the sum of that group's coach lines
 *
 *  The cheer client charge is DERIVED from the coach lines rather than computed
 *  alongside them. That makes the invariant exact to the cent:
 *
 *      Σ (per-coach school invoices)  ===  school master invoice
 *
 *  With the usual equal-hours case this reduces to plain `rate × hours`:
 *      2 coaches, R600/hr, 2 hrs → R600 each → R1200 master → 600 × 2 ✓
 *
 *  Covering coaches (free-text names with no staff record) never count toward
 *  the divisor — they have no invoice to receive the money, so including them
 *  would make it vanish.
 *
 *  ── RATE RESOLUTION (gym / cheer) ──────────────────────────────────────────
 *      1. `custom_event_presets` entry matching the event, stored "Clinic:450"
 *         (checked on the entity AND its parent — presets are configured on the
 *         parent, so a sub-team's own list is always empty)
 *      2. `competition_rate` when the session is flagged competition
 *      3. `pay_amount`, falling back to the parent's
 *
 *  ── NO DATE RESTRICTION ────────────────────────────────────────────────────
 *  A live invoice carries EVERY un-archived session, whatever month it falls in.
 *  Log a class in July, send the invoice in August, and both July and August
 *  work appear on it. Resetting an invoice is what closes a period — never the
 *  calendar. `billingMonthKey` exists only to label archived history.
 *
 *  ── WHO GETS AN INVOICE ────────────────────────────────────────────────────
 *  Families      : one per family/athlete — class name, hours, amount
 *  Tumbling gym  : one organization invoice. Gyms never produce per-coach
 *                  invoices; only cheer schools involve external staff.
 *  Cheer school  : one organization master invoice (sub-team AND main-org logs),
 *                  plus one invoice per staff coach who worked there.
 *  Staff coach   : "<Coach> - Tumbling" for class work, and "<Coach> - <Org>"
 *                  for each school. Two separate documents.
 *  The OWNER     : never gets an invoice. They still count toward a cheer split
 *                  (they were in the room), so the school is billed in full —
 *                  their own share simply isn't rendered as a document.
 * ============================================================================
 */

import {
  AttendanceSession,
  ClassType,
  Gym,
  Student,
  getStudentSessionPrice
} from '../../types';

/** A session row as it exists in state, plus the grouping column. */
type SessionRow = AttendanceSession & { session_group_id?: string | null };

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * The calendar month of a session, used only to LABEL archived history.
 *
 * There is deliberately NO date restriction anywhere in invoicing. A session
 * logged in July stays on the active invoice until it is reset, and appears on
 * whatever invoice you send — including an August one. `billing_day` is
 * intentionally not applied here: the reset action is what closes an invoice
 * period, not the calendar.
 */
export function billingMonthFor(
  dateStr: string,
  _billingDay: number = 1
): { monthName: string; year: number; key: string } {
  const d = new Date(dateStr);
  const monthName = MONTH_NAMES[d.getMonth()];
  const year = d.getFullYear();
  return { monthName, year, key: `${monthName} ${year}` };
}

export interface PricingContext {
  gyms: Gym[];
  classTypes: ClassType[];
  students: Student[];
  staff: any[];
  /** The signed-in owner — they can coach too, but are not in `staff`. */
  profile: { id?: string; pay_rate?: number; name?: string };
}

/** One charge on a client-facing invoice (family, tumbling gym, or school). */
export interface PricedClientLine {
  sessionId: string;
  groupId: string;
  date: string;
  /** family_id this bills to: a groupKey, a student id, a gym id, or an org id. */
  billToId: string;
  targetName: string;
  description: string;
  amount: number;
  kind: 'class' | 'gym' | 'cheer';
  /** Who coached it — shown under the line so a split total can be audited. */
  coachNames?: string[];
  /** Invoice month this belongs to, after applying the gym's billing day. */
  billingMonthKey: string;
  billingMonthName: string;
  billingYear: number;
}

/** One earning on a coach-facing invoice. */
export interface PricedCoachLine {
  sessionId: string;
  groupId: string;
  date: string;
  coachId: string;
  /** Cheer org this was coached for, or null for a tumbling/class turn-in line. */
  orgId: string | null;
  targetName: string;
  description: string;
  amount: number;
  /** Effective per-hour rate after any split. */
  rate: number;
  hours: number;
  /** How many coaches shared this group's rate. 1 = no split. */
  splitCount: number;
  /** Invoice month this belongs to, after applying the gym's billing day. */
  billingMonthKey: string;
  billingMonthName: string;
  billingYear: number;
}

export interface PricedResult {
  clientLines: PricedClientLine[];
  coachLines: PricedCoachLine[];
}

// ── small helpers ───────────────────────────────────────────────────────────

const num = (v: any, fallback = 0): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/** Money is always 2dp. Avoids R83.33333 turning up on a PDF. */
const money = (n: number): number => Math.round(n * 100) / 100;

const positive = (v: any, fallback: number): number => {
  const n = num(v, NaN);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

/**
 * Collapse the per-coach rows the app writes back into one logical session.
 *
 * `session_group_id` is exact. Without it we fall back to a heuristic — note
 * that hours are deliberately NOT part of the key, so a competition where each
 * coach logs different hours still groups (and therefore still splits).
 *
 * The heuristic cannot tell "one practice, two coaches" apart from "a morning
 * practice by A and an afternoon practice by B" — that ambiguity is exactly
 * what `session_group_id` exists to remove for all newly logged sessions.
 */
export function sessionGroupKey(s: SessionRow): string {
  if (s.session_group_id) return `sgid:${s.session_group_id}`;
  return [
    'grp',
    s.date || '',
    s.classTypeId || '',
    (s.custom_event_name || '').toLowerCase(),
    s.is_competition ? '1' : '0'
  ].join('|');
}

/**
 * Resolve a coach's own hourly rate — used for tumbling & class work only.
 *
 * The signed-in user's OWN profile rate wins. This matters when a coach is
 * viewing their own invoice: they load only the id and name of staff records
 * (never colleagues' pay rates), so their own staff row carries no rate. Looking
 * at the staff record first would find a rate-less row and return R0, which is
 * exactly what blanked out a coach's tumbling invoice.
 */
export function resolveCoachProfileRate(coachId: string, ctx: PricingContext): number {
  const isSelf = !!coachId && coachId === ctx.profile?.id;
  const ownRate = num(ctx.profile?.pay_rate, 0);

  if (isSelf && ownRate > 0) return ownRate;

  // staff_profiles is mapped to camelCase on load; tolerate both shapes.
  const member = (ctx.staff || []).find(st => st.id === coachId);
  const memberRate = num(member?.payRate ?? member?.pay_rate, 0);
  if (memberRate > 0) return memberRate;

  return isSelf ? ownRate : 0;
}

/** True when this coach id belongs to someone who actually receives an invoice. */
function isInvoiceableCoach(coachId: string | undefined, ctx: PricingContext): boolean {
  if (!coachId) return false;
  if (coachId === ctx.profile?.id) return true;
  return (ctx.staff || []).some(st => st.id === coachId);
}

function coachName(coachId: string, ctx: PricingContext): string {
  const member = (ctx.staff || []).find(st => st.id === coachId);
  if (member?.name) return member.name;
  if (coachId === ctx.profile?.id) return ctx.profile.name || 'Owner';
  return 'Coach';
}

/** Look up a "Clinic:450" style rate override on the entity, then its parent. */
function presetRate(gym: Gym | undefined, parent: Gym | undefined, eventName?: string): number | null {
  if (!eventName) return null;
  const wanted = eventName.toLowerCase();
  for (const source of [gym, parent]) {
    const presets = source?.custom_event_presets;
    if (!presets || presets.length === 0) continue;
    const hit = presets.find(p => {
      const name = p.includes(':') ? p.split(':')[0] : p;
      return name.trim().toLowerCase() === wanted;
    });
    if (hit && hit.includes(':')) {
      const parsed = parseFloat(hit.split(':')[1]);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
  }
  return null;
}

/** The hourly rate a gym/team session is worth, before any coach split. */
function resolveEntityRate(gym: Gym, parent: Gym | undefined, s: SessionRow): number {
  const preset = presetRate(gym, parent, s.custom_event_name);
  if (preset !== null) return preset;

  // A competition uses the sub-team's Competition Rate when one is entered, and
  // otherwise falls straight through to the sub-team's ordinary hourly rate.
  // Leaving the competition field blank is therefore safe — it just means
  // "charge the normal rate for this competition".
  if (s.is_competition) {
    const comp = num(gym.competition_rate, 0) || num(parent?.competition_rate, 0);
    if (comp > 0) return comp;
  }

  return num(gym.pay_amount, 0) || num(parent?.pay_amount, 0);
}

/** Hours for one row. Falls back to the entity default on BOTH sides now. */
function resolveHours(s: SessionRow, gym?: Gym): number {
  return positive(s.hours_coached, positive(gym?.default_hours, 1));
}

/**
 * Build a line description.
 *
 * Client invoices pass `hours` so the gym or school can see what they are paying
 * for. COACH invoices pass nothing — they show the team that was coached and the
 * amount earned, and that is all.
 */
function describe(
  base: string,
  s: SessionRow,
  opts: { hours?: number } = {}
): string {
  let out = base;
  if (s.covering_coach_name) out += ` - ${s.covering_coach_name}`;
  if (s.custom_event_name && s.custom_event_name.toLowerCase() !== base.toLowerCase()) {
    out += ` - ${s.custom_event_name}`;
  }
  if (opts.hours !== undefined) out += ` (${opts.hours} hrs)`;
  if (s.is_competition) out += ' - COMPETITION';
  return out;
}

/** Which invoice a student's charges land on (mirrors the invoice grouping). */
function billToForStudent(student: Student, ctx: PricingContext): string {
  const famId = student.groupKey || student.id;
  const gymEnt = ctx.gyms.find(g => g.id === famId);
  return gymEnt?.parent_gym_id || famId;
}

// ── the engine ──────────────────────────────────────────────────────────────

/**
 * Price a set of session rows. Returns every client charge and every coach
 * earning they imply. Callers filter by `billToId` / `coachId` / `orgId`.
 */
export function priceSessions(sessions: SessionRow[], ctx: PricingContext): PricedResult {
  const clientLines: PricedClientLine[] = [];
  const coachLines: PricedCoachLine[] = [];

  // 1. Collapse per-coach rows into logical sessions.
  const groups = new Map<string, SessionRow[]>();
  (sessions || []).forEach(s => {
    if (!s || !s.date) return;
    const key = sessionGroupKey(s);
    const bucket = groups.get(key);
    if (bucket) bucket.push(s);
    else groups.set(key, [s]);
  });

  for (const [groupId, rows] of groups) {
    const head = rows[0];
    const gym = ctx.gyms.find(g => g.id === head.classTypeId);
    const parent = gym?.parent_gym_id ? ctx.gyms.find(g => g.id === gym.parent_gym_id) : undefined;
    const classType = gym ? undefined : ctx.classTypes.find(c => c.id === head.classTypeId);

    // Distinct coaches on this slot who can actually receive an invoice.
    const coachIds = Array.from(
      new Set(rows.map(r => r.coach_id).filter((id): id is string => isInvoiceableCoach(id, ctx)))
    );

    // Calendar month only — this labels archived history and never filters what
    // appears on a live invoice.
    const bm = billingMonthFor(head.date);
    const monthStamp = {
      billingMonthKey: bm.key,
      billingMonthName: bm.monthName,
      billingYear: bm.year
    };

    // ── CHEER / SCHOOL ────────────────────────────────────────────────────
    if (gym && gym.gym_type === 'cheer') {
      const orgId = gym.parent_gym_id || gym.id;
      const org = parent || gym;
      const rate = resolveEntityRate(gym, parent, head);

      // COMPETITIONS DO NOT SPLIT. Every coach is at the competition working, so
      // each one bills the full competition rate for their own hours and the
      // school pays for all of them. Ordinary practices DO split: the sub-team's
      // hourly rate is divided between the coaches who covered that slot.
      const isComp = !!head.is_competition;
      const splitCount = isComp ? 1 : coachIds.length;
      const perCoachRate = (!isComp && coachIds.length > 0) ? rate / coachIds.length : rate;

      const baseName = gym.session_types
        ? `${gym.name} — ${gym.session_types}`
        : gym.name;

      let groupTotal = 0;

      // One coach line per row, so each coach bills their own hours.
      for (const coachId of coachIds) {
        const row = rows.find(r => r.coach_id === coachId) || head;
        const hours = resolveHours(row, gym);
        const amount = money(perCoachRate * hours);
        groupTotal += amount;

        coachLines.push({
          sessionId: row.id,
          groupId,
          date: row.date,
          coachId,
          orgId,
          targetName: org.name,
          // Team name and amount only — no hours, no split annotation.
          description: describe(baseName, row),
          amount,
          rate: money(perCoachRate),
          hours,
          splitCount,
          ...monthStamp
        });
      }

      // The school is billed the sum of the coach lines — invariant by design.
      // With no resolvable coach we cannot split, so bill the slot outright
      // rather than silently charging the school nothing.
      const clientAmount = coachIds.length > 0 ? money(groupTotal) : money(rate * resolveHours(head, gym));
      const displayHours = rate > 0 ? money(clientAmount / rate) : resolveHours(head, gym);

      clientLines.push({
        sessionId: head.id,
        groupId,
        date: head.date,
        billToId: orgId,
        targetName: gym.name,
        description: describe(baseName, head, { hours: displayHours }),
        amount: clientAmount,
        kind: 'cheer',
        coachNames: coachIds.map(id => coachName(id, ctx)),
        ...monthStamp
      });

      continue;
    }

    // ── TUMBLING GYM ──────────────────────────────────────────────────────
    if (gym) {
      const rate = resolveEntityRate(gym, parent, head);
      const hours = resolveHours(head, gym);

      clientLines.push({
        sessionId: head.id,
        groupId,
        date: head.date,
        billToId: gym.parent_gym_id || gym.id,
        targetName: gym.name,
        description: describe(gym.name, head, { hours }),
        amount: money(rate * hours),
        kind: 'gym',
        coachNames: coachIds.map(id => coachName(id, ctx)),
        ...monthStamp
      });

      // Every coach earns their own full profile rate — no splitting.
      for (const coachId of coachIds) {
        const row = rows.find(r => r.coach_id === coachId) || head;
        const coachRate = resolveCoachProfileRate(coachId, ctx);
        const coachHours = resolveHours(row, gym);
        coachLines.push({
          sessionId: row.id,
          groupId,
          date: row.date,
          coachId,
          orgId: null,
          targetName: 'Turn-in Coaching Fee',
          description: describe(gym.name, row),
          amount: money(coachRate * coachHours),
          rate: coachRate,
          hours: coachHours,
          splitCount: 1,
          ...monthStamp
        });
      }

      continue;
    }

    // ── CLASS (class_types) ───────────────────────────────────────────────
    const className = classType ? classType.name : 'Session';
    const basePrice = num(classType?.price, 0);

    // Athletes are identical across the group's rows; union defensively so a
    // multi-coach class is charged once, not once per coach.
    const athleteIds = Array.from(new Set(rows.flatMap(r => r.studentIds || [])));
    const classHours = resolveHours(head);

    for (const sid of athleteIds) {
      const student = ctx.students.find(st => st.id === sid);
      if (!student) continue;
      clientLines.push({
        sessionId: head.id,
        groupId,
        date: head.date,
        billToId: billToForStudent(student, ctx),
        targetName: student.name,
        // The parent's invoice shows the class and the hours trained.
        description: describe(className, head, { hours: classHours }),
        amount: money(getStudentSessionPrice(student, head, basePrice, className)),
        kind: 'class',
        ...monthStamp
      });
    }

    for (const coachId of coachIds) {
      const row = rows.find(r => r.coach_id === coachId) || head;
      const coachRate = resolveCoachProfileRate(coachId, ctx);
      const coachHours = resolveHours(row);
      coachLines.push({
        sessionId: row.id,
        groupId,
        date: row.date,
        coachId,
        orgId: null,
        targetName: 'Turn-in Coaching Fee',
        description: describe(className, row),
        amount: money(coachRate * coachHours),
        rate: coachRate,
        hours: coachHours,
        splitCount: 1,
        ...monthStamp
      });
    }
  }

  const byDate = (a: { date: string }, b: { date: string }) =>
    new Date(a.date).getTime() - new Date(b.date).getTime();

  clientLines.sort(byDate);
  coachLines.sort(byDate);

  return { clientLines, coachLines };
}

/** Total of a set of lines, safe against float drift. */
export function sumLines(lines: { amount: number }[]): number {
  return money((lines || []).reduce((acc, l) => acc + num(l.amount, 0), 0));
}

export interface CycleFinancials {
  tumbling: {
    grossRevenue: number;
    coachTurnInPay: number;
    netProfit: number;
    sessionCount: number;
    studentAttendanceCount: number;
  };
  schools: {
    grossInvoiced: number;
    coachPay: number;
    netImpact: number;
    sessionCount: number;
    hoursCoached: number;
  };
  gyms: {
    grossRevenue: number;
    netProfit: number;
    sessionCount: number;
    hoursCoached: number;
  };
  totals: {
    grossInvoiced: number;
    totalCoachPayout: number;
    netCycleRevenue: number;
    totalSessions: number;
  };
  itemized: Array<{
    id: string;
    groupId: string;
    date: string;
    title: string;
    category: 'tumbling' | 'schools' | 'gyms';
    grossAmount: number;
    coachCost: number;
    netAmount: number;
    subtext: string;
  }>;
}

/**
 * Calculates cycle revenue and stream breakdowns strictly based on the current
 * live invoice state (pricedResult), ensuring zero drift when sessions are added,
 * edited, or deleted.
 */
export function calculateCycleFinancials(
  priced: PricedResult,
  sessions: SessionRow[] = [],
  monthFilter?: { month: number; year: number }
): CycleFinancials {
  const filterFn = (dateStr: string) => {
    if (!monthFilter) return true;
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d.getMonth() === monthFilter.month && d.getFullYear() === monthFilter.year;
  };

  const clientLines = priced.clientLines.filter(l => filterFn(l.date));
  const coachLines = priced.coachLines.filter(l => filterFn(l.date));

  // Map coachLines by groupId for fast lookup of coach costs per session
  const coachLinesByGroup = new Map<string, PricedCoachLine[]>();
  coachLines.forEach(cl => {
    const list = coachLinesByGroup.get(cl.groupId) || [];
    list.push(cl);
    coachLinesByGroup.set(cl.groupId, list);
  });

  // Client lines grouped by groupId
  const clientLinesByGroup = new Map<string, PricedClientLine[]>();
  clientLines.forEach(cl => {
    const list = clientLinesByGroup.get(cl.groupId) || [];
    list.push(cl);
    clientLinesByGroup.set(cl.groupId, list);
  });

  // 1. Tumbling
  const tumblingClientLines = clientLines.filter(l => l.kind === 'class');
  const tumblingGross = sumLines(tumblingClientLines);
  
  // Tumbling coach costs: coachLines corresponding to class groups
  const tumblingCoachLines = coachLines.filter(l => {
    const cLines = clientLinesByGroup.get(l.groupId);
    return cLines && cLines.some(cl => cl.kind === 'class');
  });
  const tumblingCoachCost = sumLines(tumblingCoachLines);
  const tumblingNet = money(tumblingGross - tumblingCoachCost);
  const tumblingGroupIds = new Set(tumblingClientLines.map(l => l.groupId));

  // 2. Schools (Cheer)
  const schoolClientLines = clientLines.filter(l => l.kind === 'cheer');
  const schoolsGross = sumLines(schoolClientLines);
  const schoolCoachLines = coachLines.filter(l => l.orgId !== null);
  const schoolsCoachPay = sumLines(schoolCoachLines);
  const schoolsGroupIds = new Set(schoolClientLines.map(l => l.groupId));
  
  // Calculate total school hours coached
  const schoolsHours = money(schoolCoachLines.reduce((acc, l) => acc + num(l.hours, 0), 0));

  // 3. Gyms (External partner gym coaching)
  const gymClientLines = clientLines.filter(l => l.kind === 'gym');
  const gymsGross = sumLines(gymClientLines);
  const gymsNet = gymsGross; // 100% straight to business
  const gymsGroupIds = new Set(gymClientLines.map(l => l.groupId));
  
  const gymSessionsFiltered = (sessions || []).filter(s => {
    if (!filterFn(s.date)) return false;
    const gKey = sessionGroupKey(s);
    return gymsGroupIds.has(gKey);
  });
  const gymsHours = money(gymSessionsFiltered.reduce((acc, s) => acc + positive(s.hours_coached, 1), 0));

  // Itemized breakdown per group
  const allGroupIds = Array.from(new Set([...tumblingGroupIds, ...schoolsGroupIds, ...gymsGroupIds]));
  const itemized: CycleFinancials['itemized'] = [];

  allGroupIds.forEach(gid => {
    const cLines = clientLinesByGroup.get(gid) || [];
    const kLines = coachLinesByGroup.get(gid) || [];
    if (cLines.length === 0 && kLines.length === 0) return;

    const firstClient = cLines[0];
    const category = firstClient ? (firstClient.kind === 'cheer' ? 'schools' : firstClient.kind === 'gym' ? 'gyms' : 'tumbling') : 'schools';
    const date = firstClient?.date || kLines[0]?.date || '';
    const title = firstClient ? (category === 'tumbling' ? (firstClient.description.split(' (')[0] || firstClient.targetName) : firstClient.targetName) : (kLines[0]?.targetName || 'Session');
    
    const grossAmount = sumLines(cLines);
    let coachCost = 0;
    let netAmount = grossAmount;
    let subtext = '';

    if (category === 'tumbling') {
      coachCost = sumLines(kLines);
      netAmount = money(grossAmount - coachCost);
      const studentCount = cLines.length;
      const coachText = kLines.length > 0 ? ` • ${kLines.length} Coach${kLines.length > 1 ? 'es' : ''} (R${coachCost} turn-in)` : ' • Owner coached';
      subtext = `${studentCount} Athlete${studentCount !== 1 ? 's' : ''}${coachText}`;
    } else if (category === 'schools') {
      coachCost = sumLines(kLines);
      netAmount = 0; // Pass-through
      const coachNames = firstClient?.coachNames?.join(', ') || (kLines.length > 0 ? `${kLines.length} coaches` : 'Coaches');
      subtext = `School Pass-Through • ${coachNames} (R${coachCost} paid)`;
    } else { // gyms
      coachCost = 0;
      netAmount = grossAmount;
      subtext = `Gym Org • Direct Business Revenue`;
    }

    itemized.push({
      id: gid,
      groupId: gid,
      date,
      title,
      category,
      grossAmount,
      coachCost,
      netAmount,
      subtext
    });
  });

  itemized.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Totals
  const totalGrossInvoiced = money(tumblingGross + schoolsGross + gymsGross);
  const totalCoachPayout = money(tumblingCoachCost + schoolsCoachPay);
  const netCycleRevenue = money(tumblingNet + gymsNet); // + schoolsNet which is 0
  const totalSessions = tumblingGroupIds.size + schoolsGroupIds.size + gymsGroupIds.size;

  return {
    tumbling: {
      grossRevenue: tumblingGross,
      coachTurnInPay: tumblingCoachCost,
      netProfit: tumblingNet,
      sessionCount: tumblingGroupIds.size,
      studentAttendanceCount: tumblingClientLines.length
    },
    schools: {
      grossInvoiced: schoolsGross,
      coachPay: schoolsCoachPay,
      netImpact: 0,
      sessionCount: schoolsGroupIds.size,
      hoursCoached: schoolsHours
    },
    gyms: {
      grossRevenue: gymsGross,
      netProfit: gymsNet,
      sessionCount: gymsGroupIds.size,
      hoursCoached: gymsHours
    },
    totals: {
      grossInvoiced: totalGrossInvoiced,
      totalCoachPayout,
      netCycleRevenue,
      totalSessions
    },
    itemized
  };
}
