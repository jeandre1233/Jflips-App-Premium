import test from 'node:test';
import assert from 'node:assert/strict';
import { accessStateFor, loggingAccess } from './access';

const gyms: any[] = [
  { id: 'ext1', name: 'Partner Gym', gym_type: 'tumbling' },
  { id: 'ext1a', name: 'Partner Gym Juniors', parent_gym_id: 'ext1' },            // no type: follows parent
  { id: 'cheerA', name: 'Team A', gym_type: 'cheer' },
  { id: 'cheerA1', name: 'Team A Seniors', parent_gym_id: 'cheerA' },
  { id: 'cheerB', name: 'Team B', gym_type: 'cheer' }
];
const schedules: any[] = [
  { id: 's1', class_ids: ['classA'] },
  { id: 's2', class_ids: ['ext1'] },
  { id: 's3', class_ids: ['cheerB'] },
  { id: 's4', class_ids: ['cheerA1'] }
];
const make = (profile: any): any => ({ gyms, schedules, classTypes: [{ id: 'classA' }], profile });

test('the owner sees everything', () => {
  const s = make({ role: 'owner' });
  assert.equal(accessStateFor(s).gyms.length, 5);
  assert.equal(accessStateFor(s).schedules.length, 4);
});

test('a coach with no permissions sees no external gyms or cheer teams', () => {
  const a = accessStateFor(make({ role: 'staff' }));
  assert.deepEqual(a.gyms, []);
  assert.deepEqual(a.schedules.map(s => s.id), ['s1']);        // only the ordinary class
});

test('"School Gym" unlocks external gyms and their sub-teams, but not cheer teams', () => {
  const a = accessStateFor(make({ role: 'staff', can_view_school_gyms: true }));
  assert.deepEqual(a.gyms.map(g => g.id), ['ext1', 'ext1a']);
  assert.deepEqual(a.schedules.map(s => s.id), ['s1', 's2']);
});

test('an assigned cheer team unlocks only that team and its sub-teams', () => {
  const a = accessStateFor(make({ role: 'staff', assigned_cheer_org_ids: ['cheerA'] }));
  assert.deepEqual(a.gyms.map(g => g.id), ['cheerA', 'cheerA1']);
  assert.deepEqual(a.schedules.map(s => s.id), ['s1', 's4']);
});

test('logging options follow the same permissions', () => {
  const none = make({ role: 'staff' });
  assert.deepEqual(loggingAccess(accessStateFor(none)), { tumbling: false, cheer: false, external: false });

  const tumblingOnly = make({ role: 'staff', can_view_tumbling: true });
  assert.deepEqual(loggingAccess(accessStateFor(tumblingOnly)), { tumbling: true, cheer: false, external: false });

  const gymOnly = make({ role: 'staff', can_view_tumbling: true, can_view_school_gyms: true });
  assert.deepEqual(loggingAccess(accessStateFor(gymOnly)), { tumbling: true, cheer: false, external: true });

  const cheerOnly = make({ role: 'staff', assigned_cheer_org_ids: ['cheerB'] });
  assert.deepEqual(loggingAccess(accessStateFor(cheerOnly)), { tumbling: false, cheer: true, external: false });

  assert.deepEqual(loggingAccess(accessStateFor(make({ role: 'owner' }))), { tumbling: true, cheer: true, external: true });
});
