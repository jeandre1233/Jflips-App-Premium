/**
 * "Parent must stay" for the youngest children.
 *
 * Worked out from the date of birth every time, never stored, so the tag
 * disappears on the child's 5th birthday without anyone remembering to remove it.
 * Coach accounts do not receive the date of birth (it is withheld by the
 * coach_roster() database function), so for them the database works the same
 * answer out and sends it as `parent_must_stay`.
 */
export interface YoungAthleteInfo {
  stays?: boolean;
  adultName?: string;
  adultPhone?: string;
  collectors?: { name: string; phone: string }[];
  notes?: string;
}

export function parentMustStay(s: {
  dob?: string | null;
  age?: number | string | null;
  parent_must_stay?: boolean | null;
  is_gym_member?: boolean;
}): boolean {
  if (s.is_gym_member) return false;           // school and team athletes are the school's
  if (typeof s.parent_must_stay === 'boolean') return s.parent_must_stay;

  const m = String(s.dob || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const born = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    const now = new Date();
    let years = now.getFullYear() - born.getFullYear();
    if (now.getMonth() < born.getMonth() || (now.getMonth() === born.getMonth() && now.getDate() < born.getDate())) years--;
    return years >= 0 && years < 5;
  }
  const a = typeof s.age === 'string' ? parseInt(s.age, 10) : s.age;
  return typeof a === 'number' && Number.isFinite(a) && a >= 0 && a <= 4;
}
