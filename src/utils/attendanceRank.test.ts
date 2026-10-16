import test from 'node:test';
import assert from 'node:assert/strict';
import { attendanceCountsForClass, rankByAttendance } from './attendanceRank';

const row = (id: string, date: string, studentIds: string[], extra: any = {}) =>
  ({ id, date, classTypeId: 'fri', studentIds, coach_id: 'c1', hours_coached: 1, ...extra }) as any;

const kids = [
  { id: 'a', name: 'Amy' }, { id: 'b', name: 'Ben' }, { id: 'c', name: 'Cara' }, { id: 'd', name: 'Dan' }
];

test('counts visits to this class only, live and archived together', () => {
  const live = [row('s1', '2026-10-09', ['a', 'b']), row('x', '2026-10-09', ['c'], { classTypeId: 'other' })];
  const archived = [row('s0', '2026-09-25', ['a'])];
  const m = attendanceCountsForClass('fri', live, archived);
  assert.equal(m.get('a')?.count, 2);
  assert.equal(m.get('b')?.count, 1);
  assert.equal(m.get('c'), undefined);
  assert.equal(m.get('a')?.last, '2026-10-09');
});

test('a session logged by two coaches, or archived per family, counts once', () => {
  const live = [
    row('s1', '2026-10-09', ['a'], { session_group_id: 'g1' }),
    row('s2', '2026-10-09', ['a'], { session_group_id: 'g1', coach_id: 'c2' })
  ];
  const archived = [row('s1', '2026-10-09', ['a'], { session_group_id: 'g1' })];
  assert.equal(attendanceCountsForClass('fri', live, archived).get('a')?.count, 1);
});

test('the regulars come first, ties go to who came most recently, then enrolled, then name', () => {
  const sessions = [
    row('1', '2026-10-02', ['a', 'b']), row('2', '2026-10-09', ['a', 'c']), row('3', '2026-10-16', ['a'])
  ];
  const counts = attendanceCountsForClass('fri', sessions);
  const order = rankByAttendance(kids, counts, new Set(['d'])).map(k => k.name);
  // Amy 3, then Ben/Cara 1 each (Cara more recent), then Dan (never, but enrolled)
  assert.deepEqual(order, ['Amy', 'Cara', 'Ben', 'Dan']);
});

test('with no history the old order holds: enrolled first, then by name', () => {
  const order = rankByAttendance(kids, new Map(), new Set(['c'])).map(k => k.name);
  assert.deepEqual(order, ['Cara', 'Amy', 'Ben', 'Dan']);
});
