import { supabase } from '../../supabase';
import { Gym, ClassType, NotificationType } from '../../types';

/**
 * Central notification engine for JFLIPS.
 *
 * Every alert-worthy event goes through `notifyUser`, which does two things:
 *   1. Inserts a row into `notifications` — this is the in-app bell / notification centre.
 *   2. Invokes the `send-push-notification` Edge Function — this is the device-level
 *      (Firebase / FCM) alert that reaches the owner even when the app is closed.
 *
 * Local notifications on the *receiving* device are handled separately in App.tsx,
 * which listens for realtime inserts on `notifications` and calls sendLocalNotification().
 */

export const NOTIFICATION_TYPES = {
  STUDENT_SIGNUP: 'student_signup',
  CHEER_SIGNUP: 'cheer_signup',
  COACH_SIGNUP: 'coach_signup',
  SESSION_LOGGED: 'session_logged',
  CLASS_ADDED: 'class_added',
  SYSTEM: 'system',
} as const;

/** Notification titles, kept in one place so push + in-app always agree. */
export const NOTIFICATION_TITLES: Record<NotificationType, string> = {
  student_signup: 'New Student Signup',
  cheer_signup: 'New Cheer Registration',
  coach_signup: 'Coach Join Request',
  session_logged: 'Session Logged',
  class_added: 'New Class Added',
  system: 'JFLIPS',
};

/** "11 Aug 2026" — short, unambiguous, and fits inside a push notification. */
export function formatNotificationDate(date: string): string {
  if (!date) return 'an unknown date';
  const d = new Date(date);
  if (isNaN(d.getTime())) return date;
  return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface NotifyOptions {
  /** The user who should receive this — almost always the gym owner's user id. */
  userId: string;
  type: NotificationType;
  message: string;
  /** Overrides the default title from NOTIFICATION_TITLES. */
  title?: string;
  metadata?: Record<string, any>;
  /** The user who caused the event; they are excluded from the push fan-out. */
  actorId?: string;
  /** Deep link opened when the notification is tapped. */
  url?: string;
  /** Set false to write the in-app row only, with no device push. */
  push?: boolean;
}

/**
 * Write an in-app notification and fire the matching device push.
 * Never throws — a notification failure must not break the action that triggered it.
 */
export async function notifyUser(opts: NotifyOptions): Promise<void> {
  const { userId, type, message, metadata, actorId, url, push = true } = opts;
  if (!userId) return;

  const title = opts.title || NOTIFICATION_TITLES[type] || 'JFLIPS';

  // `id` is intentionally omitted so the table's own default generates it.
  const row: Record<string, any> = {
    user_id: userId,
    title,
    message,
    type,
    is_read: false,
    created_at: new Date().toISOString(),
    metadata: { ...(metadata || {}), actor_id: actorId || null },
  };

  try {
    let { error } = await supabase.from('notifications').insert(row);

    // Tolerate older deployments whose `notifications` table predates a column:
    // drop whichever optional column the error names and try once more.
    if (error) {
      const dropped = ['title', 'metadata'].filter(col =>
        new RegExp(`\\b${col}\\b`, 'i').test(error!.message)
      );
      if (dropped.length > 0) {
        const fallback = { ...row };
        dropped.forEach(col => delete fallback[col]);
        const retry = await supabase.from('notifications').insert(fallback);
        error = retry.error;
      }
    }

    if (error) console.warn('In-app notification insert failed:', error.message);
  } catch (err) {
    console.warn('In-app notification insert threw:', err);
  }

  if (!push) return;

  try {
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        userId,
        title,
        body: message,
        type,
        url: url || '/',
        excludeUserId: actorId || null,
      },
    });
    if (error || data?.error) {
      console.warn('Push notification notice:', error?.message || data?.error);
    }
  } catch (err) {
    console.warn('Push notification invoke failed:', err);
  }
}

// ── Session log message composition ──────────────────────────────────────────

/** The minimum shape needed to describe a logged session (matches the DB row). */
export interface LoggedSessionLike {
  date: string;
  class_type_id: string;
  student_ids?: string[] | null;
  hours_coached?: number | null;
  custom_event_name?: string | null;
}

type SessionKind = 'school' | 'cheer' | 'class';

/**
 * A session's `class_type_id` can point at three different things:
 *   • a Gym with gym_type 'tumbling'  → external partner gym / school organisation
 *   • a Gym with gym_type 'cheer'     → cheer team or sub-team practice
 *   • a ClassType                     → an in-house JFLIPS class
 * Sub-teams inherit their type from the parent organisation.
 */
function resolveSessionTarget(
  classTypeId: string,
  gyms: Gym[],
  classTypes: ClassType[]
): { name: string; kind: SessionKind } {
  const gym = (gyms || []).find(g => g.id === classTypeId);

  if (gym) {
    const parent = gym.parent_gym_id ? (gyms || []).find(g => g.id === gym.parent_gym_id) : undefined;
    const effectiveType = parent?.gym_type || gym.gym_type || 'tumbling';
    const name = parent ? `${gym.name} (${parent.name})` : gym.name;
    return { name, kind: effectiveType === 'cheer' ? 'cheer' : 'school' };
  }

  const classType = (classTypes || []).find(c => c.id === classTypeId);
  return { name: classType?.name || 'Session', kind: 'class' };
}

function describeOneSession(
  session: LoggedSessionLike,
  target: { name: string; kind: SessionKind },
  includeDate: boolean,
  /** "a school session…" reads well alone but not inside a list of sessions. */
  leadingArticle = true
): string {
  const datePart = includeDate ? ` on ${formatNotificationDate(session.date)}` : '';

  // School / partner gym sessions are billed by hours, not by attendance, so
  // there is no student count to report — just the gym, the date and the hours.
  if (target.kind === 'school') {
    const hours = session.hours_coached ? ` (${session.hours_coached}h)` : '';
    return `${leadingArticle ? 'a ' : ''}school session at ${target.name}${datePart}${hours}`;
  }

  const noun = target.kind === 'cheer' ? 'athlete' : 'student';
  const label = session.custom_event_name || target.name;
  const count = (session.student_ids || []).length;
  const attendance = count > 0
    ? `${count} ${noun}${count === 1 ? '' : 's'} attended`
    : `no ${noun}s marked present`;

  return `${label}${datePart} — ${attendance}`;
}

/**
 * Build the title + message for a "coach logged a session" notification.
 *
 * Class / cheer sessions report the attendance count; school organisation
 * sessions report only that a school session was logged, plus hours.
 */
export function describeSessionLog(input: {
  coachName: string;
  sessions: LoggedSessionLike[];
  gyms: Gym[];
  classTypes: ClassType[];
}): { title: string; message: string } {
  const { coachName, sessions, gyms, classTypes } = input;

  if (!sessions || sessions.length === 0) {
    return { title: 'Session Logged', message: `${coachName} logged a session.` };
  }

  const uniqueDates = Array.from(new Set(sessions.map(s => s.date)));
  const sameDate = uniqueDates.length === 1;

  if (sessions.length === 1) {
    const only = sessions[0];
    const detail = describeOneSession(
      only,
      resolveSessionTarget(only.class_type_id, gyms, classTypes),
      true,
      true
    );
    return { title: 'Session Logged', message: `${coachName} logged ${detail}.` };
  }

  // In a list, each entry carries its own date only when the dates differ.
  const parts = sessions.map(s =>
    describeOneSession(s, resolveSessionTarget(s.class_type_id, gyms, classTypes), !sameDate, false)
  );

  const lead = sameDate
    ? `${coachName} logged ${sessions.length} sessions on ${formatNotificationDate(uniqueDates[0])}`
    : `${coachName} logged ${sessions.length} sessions`;

  return {
    title: `${sessions.length} Sessions Logged`,
    message: `${lead}: ${parts.join('; ')}.`,
  };
}
