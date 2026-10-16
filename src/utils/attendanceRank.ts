import { AttendanceSession } from '../../types';

/** How often one athlete has been at one class, and when they last were. */
export interface AttendanceCount {
  count: number;
  /** Latest attended date, YYYY-MM-DD, or '' when never. */
  last: string;
}

type SessionLike = AttendanceSession & { session_group_id?: string | null };

/**
 * How many times each athlete has attended a class, across the live sessions AND
 * every archived month, so a reset never makes the regulars forget their class.
 *
 * Counted per SESSION, not per row: a session logged by two coaches is two rows
 * but one class, and a class shared between families is archived once per family
 * with a slice of the roster, so the same session can appear several times. Each
 * (session, athlete) pair is counted once.
 */
export function attendanceCountsForClass(
  classTypeId: string,
  liveSessions: SessionLike[] = [],
  archivedSessions: SessionLike[] = []
): Map<string, AttendanceCount> {
  const out = new Map<string, AttendanceCount>();
  const seen = new Set<string>();

  for (const s of [...liveSessions, ...archivedSessions]) {
    if (!s || s.classTypeId !== classTypeId) continue;
    const sessionKey = s.session_group_id
      ? `sgid:${s.session_group_id}`
      : [s.date || '', s.classTypeId, (s as any).custom_event_name || '', s.id].join('|');
    for (const athleteId of s.studentIds || []) {
      const key = `${sessionKey}#${athleteId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const cur = out.get(athleteId) || { count: 0, last: '' };
      cur.count += 1;
      const d = String(s.date || '').slice(0, 10);
      if (d > cur.last) cur.last = d;
      out.set(athleteId, cur);
    }
  }
  return out;
}

/**
 * Orders athletes for the quick-log list: most visits to THIS class first, then
 * whoever was there most recently, then athletes enrolled in the class, then
 * alphabetically. Athletes who have never been come last, in the same order the
 * list used before (enrolled first).
 */
export function rankByAttendance<T extends { id: string; name: string }>(
  athletes: T[],
  counts: Map<string, AttendanceCount>,
  enrolledIds: Set<string> = new Set()
): T[] {
  return [...athletes].sort((a, b) => {
    const ca = counts.get(a.id), cb = counts.get(b.id);
    const na = ca?.count || 0, nb = cb?.count || 0;
    if (na !== nb) return nb - na;
    const la = ca?.last || '', lb = cb?.last || '';
    if (la !== lb) return la < lb ? 1 : -1;
    const ea = enrolledIds.has(a.id) ? 1 : 0, eb = enrolledIds.has(b.id) ? 1 : 0;
    if (ea !== eb) return eb - ea;
    return a.name.localeCompare(b.name);
  });
}
