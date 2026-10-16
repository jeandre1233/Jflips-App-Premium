import test from 'node:test';
import assert from 'node:assert/strict';
import { priceSessions, priceMerch, isMerchInvoiceLine, openMerchOrders, merchOrdersForMonth, sumLines } from './pricing';
import { computeMonthTotals } from './historyEngine';

const base: any = {
  gyms: [],
  classTypes: [{ id: 'c1', name: 'Group Class', price: 150 }],
  students: [{ id: 'a', name: 'Keela', groupKey: 'fam1' }, { id: 'b', name: 'Emma', groupKey: 'fam1' }],
  staff: [{ id: 'coach1', name: 'Coach', pay_rate: 100 }],
  profile: { id: 'owner' }
};

const extra = (over: any = {}) => ({
  id: 'x1', bill_to_id: 'fam1', bill_to_kind: 'athlete', item_name: 'Cousin Mia, class on 10 Oct',
  unit_price: 150, unit_cost: 0, qty: 1, order_date: '2026-10-10', status: 'ordered',
  invoiced_month: null, is_extra: true, ...over
});
const shirt = { ...extra({ id: 'm1', item_name: 'Tee', is_extra: false, unit_price: 200, qty: 2, size: 'M' }) };

const session = {
  id: 's1', date: '2026-10-10', classTypeId: 'c1', studentIds: ['a'], coach_id: 'coach1',
  hours_coached: 1, session_group_id: 'g1'
};

test('an extra prices as its typed text and amount, with no size or quantity added', () => {
  const [line] = priceMerch({ ...base, merchOrders: [extra()] });
  assert.equal(line.description, 'Cousin Mia, class on 10 Oct');
  assert.equal(line.amount, 150);
  assert.equal(line.isExtra, true);
});

test('an extra belongs on the normal invoice and a shirt stays on the merchandise one', () => {
  const lines = priceMerch({ ...base, merchOrders: [extra(), shirt] });
  const onNormal = lines.filter(l => !isMerchInvoiceLine(l));
  const onMerch = lines.filter(isMerchInvoiceLine);
  assert.equal(onNormal.length, 1);
  assert.equal(onNormal[0].description, 'Cousin Mia, class on 10 Oct');
  assert.equal(onMerch.length, 1);
  assert.equal(onMerch[0].amount, 400);
});

test('the normal invoice total is the classes plus the extra, with no sibling discount on it', () => {
  const ctx = { ...base, siblingDiscount: 20, merchOrders: [extra()] };
  const { clientLines } = priceSessions([session as any], ctx);
  const normal = clientLines.filter(l => l.billToId === 'fam1' && !isMerchInvoiceLine(l));
  assert.equal(sumLines(normal), 300);
});

test('a negative extra works as a credit', () => {
  const [line] = priceMerch({ ...base, merchOrders: [extra({ unit_price: -50, item_name: 'Credit' })] });
  assert.equal(line.amount, -50);
});

test('an archived extra drops off the open list and shows in its month', () => {
  const archived = extra({ invoiced_month: 'October 2026' });
  assert.equal(openMerchOrders([archived as any]).length, 0);
  assert.equal(merchOrdersForMonth([archived as any], 'October 2026').length, 1);
});

test('extras count as business income in the monthly totals and add no coach pay', () => {
  const t = computeMonthTotals([session as any], { ...base, merchOrders: [extra()] });
  assert.equal(t.tumblingGross, 150);
  assert.equal(t.merchGross, 150);
  assert.equal(t.merchCost, 0);
  assert.equal(t.totalGross, 300);
  assert.equal(t.totalCoachPayout, 100);
  assert.equal(t.netProfit, 200);
  assert.equal(t.invoiceCount, 1);
  assert.equal(t.invoicesTotal, 300);
});

test('a month with only an extra is still counted as revenue', () => {
  const t = computeMonthTotals([], { ...base, merchOrders: [extra()] });
  assert.equal(t.totalGross, 150);
  assert.equal(t.netProfit, 150);
});
