import test from 'node:test';
import assert from 'node:assert/strict';
import { documentsKeepUntil, profileDeleteAfter } from './retention';

test("a child's signed forms are kept until they turn 19", () => {
  assert.equal(documentsKeepUntil('2015-03-10', new Date(2026, 9, 12)), '2034-03-10');
  assert.equal(documentsKeepUntil('2020-01-01T00:00:00', new Date(2026, 0, 5)), '2039-01-01');
});

test("an adult's signed forms are kept 5 years after they leave", () => {
  assert.equal(documentsKeepUntil('1990-06-01', new Date(2026, 9, 12)), '2031-10-12');
  // someone who turned 18 yesterday counts as an adult
  assert.equal(documentsKeepUntil('2008-10-11', new Date(2026, 9, 12)), '2031-10-12');
});

test('a child who turns 18 tomorrow is still a child', () => {
  assert.equal(documentsKeepUntil('2008-10-13', new Date(2026, 9, 12)), '2027-10-13');
});

test('no date of birth means no date is made up', () => {
  assert.equal(documentsKeepUntil(undefined, new Date()), null);
  assert.equal(documentsKeepUntil('', new Date()), null);
  assert.equal(documentsKeepUntil('not a date', new Date()), null);
});

test('other details are deleted from 12 months after leaving', () => {
  assert.equal(profileDeleteAfter(new Date(2026, 9, 12)), '2027-10-12');
  assert.equal(profileDeleteAfter(new Date(2026, 11, 31)), '2027-12-31');
});
