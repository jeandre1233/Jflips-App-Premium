import test from 'node:test';
import assert from 'node:assert/strict';
import { parentMustStay } from './youngAthlete';
import { audienceForAge } from './indemnityText';

const yearsAgo = (y: number, extraDays = 0) => {
  const d = new Date(); d.setFullYear(d.getFullYear() - y); d.setDate(d.getDate() + extraDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

test('a child under 5 must have a parent stay, worked out from the date of birth', () => {
  assert.equal(parentMustStay({ dob: yearsAgo(2) }), true);
  assert.equal(parentMustStay({ dob: yearsAgo(4, 5) }), true);   // turns 5 in 5 days
  assert.equal(parentMustStay({ dob: yearsAgo(5) }), false);     // 5th birthday today: tag is gone
  assert.equal(parentMustStay({ dob: yearsAgo(9) }), false);
});

test('coach accounts get the answer from the database instead of a date of birth', () => {
  assert.equal(parentMustStay({ parent_must_stay: true }), true);
  assert.equal(parentMustStay({ parent_must_stay: false, dob: yearsAgo(2) }), false);
});

test('school and team athletes are never tagged', () => {
  assert.equal(parentMustStay({ dob: yearsAgo(3), is_gym_member: true }), false);
});

test('age is the fallback when there is no date of birth', () => {
  assert.equal(parentMustStay({ age: 3 }), true);
  assert.equal(parentMustStay({ age: '4' }), true);
  assert.equal(parentMustStay({ age: 8 }), false);
  assert.equal(parentMustStay({}), false);
});

test('18 and over signs for themselves, under 18 a parent signs', () => {
  assert.equal(audienceForAge(17), 'minor');
  assert.equal(audienceForAge('18'), 'adult');
  assert.equal(audienceForAge(40), 'adult');
  assert.equal(audienceForAge(''), 'minor');
  assert.equal(audienceForAge(undefined), 'minor');
});
