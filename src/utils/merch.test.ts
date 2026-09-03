/**
 * MERCHANDISE INVOICING — arithmetic guards.
 *
 * Run with:  npx tsx src/utils/merch.test.ts
 *
 * These cover the rules that are easy to break by accident: a shirt must never
 * become a coaching session, never earn a coach a payout, never be touched by
 * the sibling discount, and never be billed twice — the last one being why
 * `openMerchOrders` and `merchOrdersForMonth` exist as separate selectors.
 */
import { priceSessions, priceMerch, openMerchOrders, merchOrdersForMonth, sumLines, calculateCycleFinancials } from './pricing';
import { computeMonthTotals } from './historyEngine';

let fails = 0;
const eq = (name: string, got: any, want: any) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) { fails++; console.log(`FAIL ${name}\n  got  ${JSON.stringify(got)}\n  want ${JSON.stringify(want)}`); }
  else console.log(`ok   ${name}`);
};

const students: any[] = [
  { id: 'a1', name: 'Emma', groupKey: 'fam1' },
  { id: 'a2', name: 'Lucas', groupKey: 'fam1' },
  { id: 'a3', name: 'Solo Kid' },
];
const classTypes: any[] = [{ id: 'c1', name: 'Group Class', price: 150 }];
const gyms: any[] = [{ id: 'g1', name: 'Northside', gym_type: 'tumbling', pay_amount: 500, session_types: 'Tumbling' }];
const base = { gyms, classTypes, students, staff: [], profile: { id: 'owner1', pay_rate: 0, name: 'Owner' } };

const orders: any[] = [
  { id: 'o1', bill_to_id: 'fam1', bill_to_kind: 'athlete', item_name: 'Team Shirt', unit_price: 250, unit_cost: 140, qty: 2, size: 'M', order_date: '2026-03-04', status: 'ordered', invoiced_month: null },
  { id: 'o2', bill_to_id: 'ext1', bill_to_kind: 'external', item_name: 'Bow', unit_price: 80, unit_cost: 30, qty: 1, order_date: '2026-03-06', status: 'ordered', invoiced_month: null },
  { id: 'o3', bill_to_id: 'a3', bill_to_kind: 'athlete', item_name: 'Cancelled Thing', unit_price: 999, qty: 1, order_date: '2026-03-06', status: 'cancelled', invoiced_month: null },
  { id: 'o4', bill_to_id: 'fam1', bill_to_kind: 'athlete', item_name: 'Old Shirt', unit_price: 200, unit_cost: 100, qty: 1, order_date: '2026-02-10', status: 'delivered', invoiced_month: 'February 2026' },
];
const merchClients: any[] = [{ id: 'ext1', name: 'Random Parent', phone: '0821112222' }];

// ── openMerchOrders / merchOrdersForMonth ───────────────────────────────────
eq('open excludes cancelled + already invoiced', openMerchOrders(orders).map(o => o.id), ['o1', 'o2']);
eq('month selector picks stamped rows', merchOrdersForMonth(orders, 'February 2026').map(o => o.id), ['o4']);

// ── priceMerch ──────────────────────────────────────────────────────────────
const liveCtx: any = { ...base, merchOrders: openMerchOrders(orders), merchClients };
const mLines = priceMerch(liveCtx);
eq('two live merch lines', mLines.length, 2);
eq('qty multiplies', mLines.find(l => l.sessionId === 'o1')!.amount, 500);
eq('cost multiplies', mLines.find(l => l.sessionId === 'o1')!.costAmount, 280);
eq('description carries size + qty', mLines.find(l => l.sessionId === 'o1')!.description, 'Team Shirt (Size M) × 2');
eq('single qty description is clean', mLines.find(l => l.sessionId === 'o2')!.description, 'Bow');
eq('sibling family named on line', mLines.find(l => l.sessionId === 'o1')!.targetName, 'Emma & Lucas');
eq('external client named on line', mLines.find(l => l.sessionId === 'o2')!.targetName, 'Random Parent');
eq('groupId is prefixed', mLines.find(l => l.sessionId === 'o1')!.groupId, 'merch:o1');
eq('files under order month', mLines.find(l => l.sessionId === 'o1')!.billingMonthKey, 'March 2026');

// ── merch joins clientLines, and does NOT create coach lines ────────────────
const sessions: any[] = [
  { id: 's1', date: '2026-03-03', classTypeId: 'c1', studentIds: ['a1', 'a2'], hours_coached: 1, coach_id: 'owner1', session_group_id: 'sg1' },
];
const priced = priceSessions(sessions, liveCtx);
eq('client lines = 1 class + 2 merch', priced.clientLines.length, 3);
eq('no coach line refers to merch', priced.coachLines.filter(l => l.groupId.startsWith('merch:')).length, 0);

const famLines = priced.clientLines.filter(l => l.billToId === 'fam1');
// Class is R150 per athlete present: R300 for the two siblings, plus R500 of shirts.
eq('family invoice total', sumLines(famLines), 800);
eq('external invoice total', sumLines(priced.clientLines.filter(l => l.billToId === 'ext1')), 80);

// ── sibling discount must not touch merch ───────────────────────────────────
const discCtx: any = { ...liveCtx, siblingDiscount: 50 };
const discPriced = priceSessions(sessions, discCtx);
eq('discount hits the class only', sumLines(discPriced.clientLines.filter(l => l.billToId === 'fam1')), 750);
eq('shirt line unchanged by discount', discPriced.clientLines.find(l => l.sessionId === 'o1')!.amount, 500);

// ── no merch in context = nothing added (the archive/reset path) ─────────────
const noMerch = priceSessions(sessions, { ...base } as any);
eq('empty merch context adds nothing', noMerch.clientLines.length, 1);

// ── cycle financials ────────────────────────────────────────────────────────
const fin = calculateCycleFinancials(priced, sessions);
eq('merch gross', fin.merch.grossRevenue, 580);
eq('merch cost of goods', fin.merch.costOfGoods, 310);
eq('merch net', fin.merch.netProfit, 270);
eq('merch units', fin.merch.unitsSold, 3);
eq('merch not counted as a session', fin.totals.totalSessions, 1);
eq('gross invoiced includes merch', fin.totals.grossInvoiced, 880);
eq('tumbling stream untouched by merch', fin.tumbling.grossRevenue, 300);

// ── history month totals ────────────────────────────────────────────────────
const febCtx: any = { ...base, merchOrders: merchOrdersForMonth(orders, 'February 2026'), merchClients };
const febTotals = computeMonthTotals([], febCtx);
eq('merch-only month is not empty', febTotals.merchGross, 200);
eq('merch-only month total gross', febTotals.totalGross, 200);
eq('merch-only month net', febTotals.netProfit, 100);
eq('merch-only month invoices', febTotals.invoiceCount, 1);
eq('merch-only month invoiced total', febTotals.invoicesTotal, 200);

const emptyTotals = computeMonthTotals([], { ...base } as any);
eq('truly empty month stays empty', emptyTotals.totalGross, 0);

const marTotals = computeMonthTotals(sessions, { ...base, merchOrders: merchOrdersForMonth(orders, 'March 2026'), merchClients } as any);
eq('march has no stamped merch yet', marTotals.merchGross, 0);
eq('march gross is the class only', marTotals.totalGross, 300);

// ── THE TWO BOOKS ───────────────────────────────────────────────────────────
// The Invoices screen splits client lines by kind: a coaching invoice must
// never show a shirt, and a merchandise invoice must never show a session.
// These assert the exact filter the screen applies.
const coachingBook = (billToId: string) =>
  priced.clientLines.filter(l => l.billToId === billToId && l.kind !== 'merch');
const merchBook = (billToId: string) =>
  priced.clientLines.filter(l => l.billToId === billToId && l.kind === 'merch');

eq('coaching book excludes merch', coachingBook('fam1').some(l => l.kind === 'merch'), false);
eq('coaching book total is sessions only', sumLines(coachingBook('fam1')), 300);
eq('merch book holds only merch', merchBook('fam1').every(l => l.kind === 'merch'), true);
eq('merch book total is goods only', sumLines(merchBook('fam1')), 500);
eq('the two books sum to the whole', sumLines(coachingBook('fam1')) + sumLines(merchBook('fam1')), 800);
eq('external client has no coaching invoice', coachingBook('ext1').length, 0);
eq('external client has a merch invoice', sumLines(merchBook('ext1')), 80);

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILED`);
process.exit(fails === 0 ? 0 : 1);
