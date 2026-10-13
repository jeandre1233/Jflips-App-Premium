import test from 'node:test';
import assert from 'node:assert/strict';
import { priceSessions, calculateCycleFinancials } from './pricing';
import { computeMonthTotals } from './historyEngine';

const ctx: any = {
  gyms: [
    { id: 'org', name: 'Dynamix', gym_type: 'tumbling', pay_amount: 0, custom_event_presets: ['Clinic:240:200'] },
    { id: 'blaze', name: 'Blaze', gym_type: 'tumbling', parent_gym_id: 'org', pay_amount: 240, coach_pay: 200 },
    { id: 'priv', name: 'Private', gym_type: 'tumbling', parent_gym_id: 'org', pay_amount: 350, coach_pay: 300 },
    { id: 'old', name: 'Old', gym_type: 'tumbling', parent_gym_id: 'org', pay_amount: 240 }
  ],
  classTypes: [],
  students: [],
  staff: [{ id: 'coach1', name: 'Coach', pay_rate: 180 }],
  profile: { id: 'owner' }
};

const row = (id: string, gymId: string, extra: any = {}) => ({
  id, date: '2026-09-10', classTypeId: gymId, studentIds: [], coach_id: 'coach1',
  hours_coached: 1, session_group_id: id, ...extra
});

const sum = (l: any[]) => l.reduce((t, x) => t + x.amount, 0);

test('a class with a coach amount pays the coach that and the business keeps the rest', () => {
  const { clientLines, coachLines } = priceSessions([row('s1', 'blaze')], ctx);
  assert.equal(sum(clientLines), 240);
  assert.equal(sum(coachLines), 200);
});

test('private lessons pay R300 to the coach and R50 to the business', () => {
  const { clientLines, coachLines } = priceSessions([row('s1', 'priv')], ctx);
  assert.equal(sum(clientLines), 350);
  assert.equal(sum(coachLines), 300);
});

test('a class with no coach amount still pays the coach their profile rate', () => {
  const { coachLines } = priceSessions([row('s1', 'old')], ctx);
  assert.equal(sum(coachLines), 180);
});

test('a preset with a third part overrides the class coach amount', () => {
  const { clientLines, coachLines } = priceSessions([row('s1', 'old', { custom_event_name: 'Clinic' })], ctx);
  assert.equal(sum(clientLines), 240);
  assert.equal(sum(coachLines), 200);
});

test('live totals take the coach share out of the gym net', () => {
  const sessions = [row('s1', 'blaze'), row('s2', 'priv')];
  const f = calculateCycleFinancials(priceSessions(sessions, ctx), sessions, undefined, 'owner');
  assert.equal(f.gyms.grossRevenue, 590);
  assert.equal(f.gyms.coachPay, 500);
  assert.equal(f.gyms.netProfit, 90);
  assert.equal(f.totals.totalCoachPayout, 500);
  assert.equal(f.totals.netCycleRevenue, 90);
});

test('the owner coaching a gym session is not paid by their own business', () => {
  const sessions = [row('s1', 'blaze', { coach_id: 'owner' })];
  const f = calculateCycleFinancials(priceSessions(sessions, ctx), sessions, undefined, 'owner');
  assert.equal(f.gyms.coachPay, 0);
  assert.equal(f.gyms.netProfit, 240);
});

test('history keeps gym coach pay out of tumbling and keeps overall profit the same', () => {
  const sessions = [row('s1', 'blaze'), row('s2', 'priv')];
  const t = computeMonthTotals(sessions as any, ctx);
  assert.equal(t.tumblingCoachPay, 0);
  assert.equal(t.gymsGross, 590);
  assert.equal(t.gymsNet, 90);
  assert.equal(t.totalCoachPayout, 500);
  assert.equal(t.netProfit, 90);
  assert.equal(t.coachPayouts[0].amount, 500);
});
