/**
 * HOW LONG A REMOVED ATHLETE'S INFORMATION IS KEPT (the privacy notice, "How long we keep it").
 * Signed forms: until a child's 19th birthday, or 5 years after an adult leaves.
 * Everything else: deleted from 12 months after leaving.
 * Financial records (7 years) are not moved, so they have no date here.
 */

const pad = (n: number) => String(n).padStart(2, '0');
const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** The date the signed forms are kept until, or null when it cannot be worked out. */
export function documentsKeepUntil(dob: string | null | undefined, leftAt: Date): string | null {
  const m = String(dob || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const y = Number(m[1]), mo = Number(m[2]) - 1, d = Number(m[3]);
  let age = leftAt.getFullYear() - y;
  if (leftAt < new Date(leftAt.getFullYear(), mo, d)) age--;
  // A child (under 18) is kept until they turn 19. An adult: 5 years after leaving.
  return age < 18
    ? isoDate(new Date(y + 19, mo, d))
    : isoDate(new Date(leftAt.getFullYear() + 5, leftAt.getMonth(), leftAt.getDate()));
}

/** Everything else is deleted from 12 months after leaving. */
export function profileDeleteAfter(leftAt: Date): string {
  return isoDate(new Date(leftAt.getFullYear() + 1, leftAt.getMonth(), leftAt.getDate()));
}
