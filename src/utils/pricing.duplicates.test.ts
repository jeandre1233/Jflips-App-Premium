import test from 'node:test';
import assert from 'node:assert/strict';
import { priceSessions } from './pricing';

const ctx: any = {
  gyms: [],
  classTypes: [{ id: 'c1', name: 'Group Class', price: 150 }],
  students: [
    { id: 'a', name: 'Keela' },
    { id: 'b', name: 'Emma' }
  ],
  staff: [{ id: 'coach1', name: 'Coach', pay_rate: 100 }],
  profile: { id: 'owner' }
};

const reg = (id: string, group: string, studentIds: string[]) => ({
  id, date: '2026-09-10', classTypeId: 'c1', studentIds, coach_id: 'coach1',
  hours_coached: 1, session_group_id: group
});

test('the same register logged twice bills each athlete once and pays the coach once', () => {
  const { clientLines, coachLines } = priceSessions([reg('s1', 'g1', ['a']), reg('s2', 'g2', ['a'])], ctx);
  assert.equal(clientLines.reduce((t, l) => t + l.amount, 0), 150);
  assert.equal(coachLines.length, 1);
});

test('a second register that adds a late arrival only bills the newcomer', () => {
  const { clientLines } = priceSessions([reg('s1', 'g1', ['a']), reg('s2', 'g2', ['a', 'b'])], ctx);
  assert.equal(clientLines.reduce((t, l) => t + l.amount, 0), 300);
});

test('the same athlete on different days is still billed for both', () => {
  const later = { ...reg('s2', 'g2', ['a']), date: '2026-09-17' };
  const { clientLines } = priceSessions([reg('s1', 'g1', ['a']), later], ctx);
  assert.equal(clientLines.reduce((t, l) => t + l.amount, 0), 300);
});
