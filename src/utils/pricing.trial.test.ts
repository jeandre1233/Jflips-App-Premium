import test from 'node:test';
import assert from 'node:assert/strict';
import { priceSessions, isFreeTrialSession } from './pricing';

const ctx = (students: any[]): any => ({
  gyms: [],
  classTypes: [{ id: 'c1', name: 'Group Class', price: 200 }],
  students,
  staff: [{ id: 'coach1', name: 'Coach', pay_rate: 100 }],
  profile: { id: 'owner' }
});
const reg = (id: string, date: string, studentIds: string[]) => ({
  id, date, classTypeId: 'c1', studentIds, coach_id: 'coach1', hours_coached: 1, session_group_id: `g_${id}`
});
const total = (r: any) => r.clientLines.reduce((t: number, l: any) => t + l.amount, 0);

const trial = { id: 'stu_temp_1', name: 'Trial Kid', is_temporary: true, first_class_date: '2026-10-07' };
const regular = { id: 'a', name: 'Regular Kid' };

test('a trial athlete is not charged for their first class', () => {
  const r = priceSessions([reg('s1', '2026-10-07', ['stu_temp_1'])], ctx([trial]));
  assert.equal(total(r), 0);
  assert.match(r.clientLines[0].description, /FREE TRIAL CLASS/);
});

test('their next class is charged at the normal rate', () => {
  const r = priceSessions([reg('s2', '2026-10-14', ['stu_temp_1'])], ctx([trial]));
  assert.equal(total(r), 200);
});

test('a registered child in the same class still pays', () => {
  const r = priceSessions([reg('s1', '2026-10-07', ['stu_temp_1', 'a'])], ctx([trial, regular]));
  assert.equal(total(r), 200);                                   // only the regular child
});

test('a trial record with no first class date is charged (nothing to anchor the free class to)', () => {
  const noDate = { id: 'stu_temp_2', name: 'No Date', is_temporary: true };
  assert.equal(total(priceSessions([reg('s1', '2026-10-07', ['stu_temp_2'])], ctx([noDate]))), 200);
});

test('isFreeTrialSession only matches the exact first-class day', () => {
  assert.equal(isFreeTrialSession(trial, '2026-10-07'), true);
  assert.equal(isFreeTrialSession(trial, '2026-10-08'), false);
  assert.equal(isFreeTrialSession(regular, '2026-10-07'), false);
});
