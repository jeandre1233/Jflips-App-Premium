import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { supabase } from '../../supabase';
import { getStudentSessionPrice } from '../../types';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase App & Auth conditionally to prevent invalid API key crashes on load
const hasFirebaseConfig = !!(
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== 'undefined' && 
  firebaseConfig.projectId
);

let app: any = null;
let auth: any = null;

if (hasFirebaseConfig) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
  } catch (error) {
    console.warn('Firebase failed to initialize on startup:', error);
  }
} else {
  console.info('Firebase credentials are not defined. Firebase auth will not be active (falling back to Supabase auth).');
}

export { auth };

const provider = new GoogleAuthProvider();
// Request Sheets and Calendar scopes
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/calendar');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Load/save sheet ID and calendar ID to localStorage
export function getSavedSpreadsheetId(): string | null {
  return localStorage.getItem('google_spreadsheet_id');
}

export function setSavedSpreadsheetId(id: string | null): void {
  if (id) {
    localStorage.setItem('google_spreadsheet_id', id.trim());
  } else {
    localStorage.removeItem('google_spreadsheet_id');
  }
}

export function getSavedCalendarId(): string | null {
  return localStorage.getItem('google_calendar_id');
}

export function setSavedCalendarId(id: string | null): void {
  if (id) {
    localStorage.setItem('google_calendar_id', id.trim());
  } else {
    localStorage.removeItem('google_calendar_id');
  }
}

// Persist the cached token to session or memory
export const initAuth = (
  onAuthSuccess?: (user: any, token: string) => void,
  onAuthFailure?: () => void
) => {
  const checkStoredAuth = () => {
    const storedToken = sessionStorage.getItem('google_access_token');
    const storedDisplayName = sessionStorage.getItem('google_user_display_name');
    const storedEmail = sessionStorage.getItem('google_user_email');
    const storedAvatar = sessionStorage.getItem('google_user_avatar');

    if (storedToken) {
      cachedAccessToken = storedToken;
      if (onAuthSuccess) {
        onAuthSuccess({
          displayName: storedDisplayName || 'Google Account',
          email: storedEmail || 'connected@gmail.com',
          photoURL: storedAvatar || '',
          uid: 'supabase-oauth'
        }, storedToken);
      }
      return true;
    }
    return false;
  };

  // Immediate check on load
  const hasLocalAuth = checkStoredAuth();

  // Listen to custom Google authentication changes
  const handleAuthChange = () => {
    if (!checkStoredAuth()) {
      const fbUser = auth ? auth.currentUser : null;
      if (fbUser && cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(fbUser, cachedAccessToken);
      } else {
        if (onAuthFailure) onAuthFailure();
      }
    }
  };

  window.addEventListener('google-auth-changed', handleAuthChange);

  // Monitor Firebase Auth as a fallback provider
  const unsubscribeFirebase = auth ? onAuthStateChanged(auth, async (user: User | null) => {
    const hasSupabase = checkStoredAuth();
    if (hasSupabase) return;

    if (user && cachedAccessToken) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else {
      if (!user) {
        cachedAccessToken = null;
        sessionStorage.removeItem('google_access_token');
      }
      if (onAuthFailure) onAuthFailure();
    }
  }) : null;

  return () => {
    window.removeEventListener('google-auth-changed', handleAuthChange);
    if (unsubscribeFirebase) unsubscribeFirebase();
  };
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  if (!auth) {
    console.info('Firebase auth is not configured. Falling back to Supabase Google OAuth...');
    // Trigger Supabase sign in with OAuth; requested scopes are included
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        },
        scopes: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/calendar'
      }
    });
    if (authError) {
      throw new Error('Supabase Google OAuth failed: ' + authError.message);
    }
    // Return null since browser is redirecting
    return null;
  }
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to retrieve Google Access Token');
    }

    cachedAccessToken = credential.accessToken;
    sessionStorage.setItem('google_access_token', cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const logoutGoogle = async () => {
  if (auth) {
    await auth.signOut();
  }
  cachedAccessToken = null;
  sessionStorage.removeItem('google_access_token');
};

export const getAccessToken = async (): Promise<string | null> => {
  if (!cachedAccessToken) {
    cachedAccessToken = sessionStorage.getItem('google_access_token');
  }
  return cachedAccessToken;
};

// --- GOOGLE CALENDAR INTEGRATION ---

export interface SyncScheduleItem {
  id: string;
  day_of_week: number; // 0 (Sun) - 6 (Sat)
  time: string; // "HH:MM"
  label?: string | null;
  color?: string | null;
  class_ids?: string[] | string;
  coach_id?: string | null;
}

/**
 * Creates or gets the "JFLIPS Class Schedule" Calendar
 */
export async function getOrCreateCalendar(accessToken: string): Promise<string> {
  const listRes = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!listRes.ok) {
    let details = '';
    try {
      const errJson = await listRes.json();
      details = errJson?.error?.message || JSON.stringify(errJson);
    } catch {
      try {
        details = await listRes.text();
      } catch {
        details = listRes.statusText;
      }
    }
    throw new Error(`Failed to list calendars: ${listRes.status} ${details}`);
  }
  
  const listData = await listRes.json();
  const existing = listData.items?.find((c: any) => c.summary === 'JFLIPS Class Schedule');
  if (existing) {
    setSavedCalendarId(existing.id);
    return existing.id;
  }

  // Create secondary calendar
  const createRes = await fetch('https://www.googleapis.com/calendar/v3/calendars', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      summary: 'JFLIPS Class Schedule',
      description: 'Recurring timetable schedules managed from the JFLIPS Portal.'
    })
  });
  if (!createRes.ok) {
    let details = '';
    try {
      const errJson = await createRes.json();
      details = errJson?.error?.message || JSON.stringify(errJson);
    } catch {
      try {
        details = await createRes.text();
      } catch {
        details = createRes.statusText;
      }
    }
    throw new Error(`Failed to create calendar: ${createRes.status} ${details}`);
  }
  const created = await createRes.json();
  setSavedCalendarId(created.id);
  return created.id;
}

/**
 * Encourages reliable base32hex ID representation of schedule record
 * valid alphanumeric [a-v0-9] from 5 to 1024 characters
 */
export function encodeScheduleIdToEventId(id: string): string {
  let hex = '';
  for (let i = 0; i < id.length; i++) {
    hex += id.charCodeAt(i).toString(16).toLowerCase();
  }
  // Hex characters are [0-9a-f], which is a subset of [a-v0-9].
  // Prefix 'jflips' contains only characters from a-v: j(10), f(6), l(12), i(9), p(16), s(19).
  // Thus 'jflips' + hex is 100% compliant with Google's a-v0-9 event ID restrictions.
  return 'jflips' + hex;
}

/**
 * Sync schedules to Google Calendar
 */
export async function syncSchedulesToCalendar(
  schedules: SyncScheduleItem[],
  classTypes: any[],
  gyms: any[],
  staff: any[],
  accessToken: string
): Promise<void> {
  const calendarId = await getOrCreateCalendar(accessToken);

  // 1. Fetch all existing events in this calendar to map and clear/update
  const eventsRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?maxResults=2500`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!eventsRes.ok) {
    let details = '';
    try {
      const errJson = await eventsRes.json();
      details = errJson?.error?.message || JSON.stringify(errJson);
    } catch {
      try {
        details = await eventsRes.text();
      } catch {
        details = eventsRes.statusText;
      }
    }
    throw new Error(`Failed to list existing calendar events: ${eventsRes.status} ${details}`);
  }

  const eventsData = await eventsRes.json();
  const existingEvents: any[] = eventsData.items || [];

  // Define active IDs and mappings
  const activeEventIds = new Set<string>();
  for (const item of schedules) {
    activeEventIds.add(encodeScheduleIdToEventId(item.id));
  }

  // 2. Identify and delete orphaned and legacy events.
  // - Legacy events: No ID or ID does not start with ours (this sweeps prior dynamic/duplicated syncs)
  // - Orphaned events: Valid ID but belongs to a schedule no longer active
  const toDelete = existingEvents.filter(e => {
    const isLegacy = !e.id || !e.id.startsWith('jflips');
    const isOrphaned = !activeEventIds.has(e.id);
    return isLegacy || isOrphaned;
  });

  for (const event of toDelete) {
    if (!event.id) continue;
    try {
      const delRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${event.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!delRes.ok && delRes.status !== 410 && delRes.status !== 404) {
        console.warn(`Failed to delete legacy/orphaned calendar event ${event.id}: ${delRes.statusText}`);
      }
    } catch (err) {
      console.error(`Error deleting calendar event ${event.id}:`, err);
    }
  }

  // Day codes for recurring events
  const dayCodes = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

  // Helper to find the next upcoming date for a specific day of week
  const getNextDateForDay = (targetDay: number): Date => {
    const today = new Date();
    const currentDay = today.getDay();
    let daysToAdd = targetDay - currentDay;
    if (daysToAdd <= 0) {
      daysToAdd += 7;
    }
    const result = new Date(today);
    result.setDate(today.getDate() + daysToAdd);
    return result;
  };

  // 3. Upsert active schedules to Google Calendar (keeps them updated, prevents any duplicates)
  for (const item of schedules) {
    const eventId = encodeScheduleIdToEventId(item.id);
    const existingEvent = existingEvents.find(e => e.id === eventId);

    const classIds = Array.isArray(item.class_ids) 
      ? item.class_ids 
      : (typeof item.class_ids === 'string' ? item.class_ids.split(',') : []);
    
    // Resolve class or gym names
    const names = classIds.map(cid => {
      const ct = classTypes.find(c => c.id === cid);
      const gym = gyms.find(g => g.id === cid);
      return ct?.name || gym?.name;
    }).filter(Boolean);

    const title = item.label || names.join(' & ') || 'Class';
    const coach = staff.find(s => s.id === item.coach_id);
    const coachLabel = coach ? `Coach: ${coach.name}` : 'Coach: Unassigned';

    // Calculate start date time
    const eventDate = getNextDateForDay(item.day_of_week);
    const [hours, minutes] = item.time.split(':').map(Number);
    eventDate.setHours(hours || 0, minutes || 0, 0, 0);

    const startISO = eventDate.toISOString();
    // Default duration is 1 hour
    const endDate = new Date(eventDate);
    endDate.setHours(eventDate.getHours() + 1);
    const endISO = endDate.toISOString();

    const rrule = `RRULE:FREQ=WEEKLY;BYDAY=${dayCodes[item.day_of_week]}`;

    const eventPayload = {
      id: eventId,
      summary: title,
      description: `📝 JFLIPS Scheduled Lesson\n🤸 Schedule ID: ${item.id}\n👤 ${coachLabel}\n🏫 Includes: ${names.join(', ') || 'General'}`,
      start: {
        dateTime: startISO,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
      },
      end: {
        dateTime: endISO,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
      },
      recurrence: [rrule],
      reminders: {
        useDefault: true
      }
    };

    if (existingEvent) {
      // Event exists: PUT request updates it
      const updateRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventPayload)
      });
      if (!updateRes.ok) {
        let details = '';
        try {
          details = await updateRes.text();
        } catch {}
        console.error(`Failed to update calendar event ${eventId}: ${updateRes.status} ${details}`);
      }
    } else {
      // Event does not exist: POST request creates it with the deterministic ID
      const createRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventPayload)
      });
      if (!createRes.ok) {
        let details = '';
        try {
          details = await createRes.text();
        } catch {}
        console.error(`Failed to create calendar event ${eventId}: ${createRes.status} ${details}`);
      }
    }
  }
}

// --- GOOGLE SHEETS FINANCE INTEGRATION ---

/**
 * Creates or retrieves the "JFLIPS Finance & Class Records" spreadsheet
 */
export async function getOrCreateSpreadsheet(accessToken: string): Promise<string> {
  const savedId = getSavedSpreadsheetId();
  if (savedId) {
    // Check if it still exists and is accessible
    const checkRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${savedId}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (checkRes.ok) {
      return savedId;
    }
  }

  // Create a beautiful, structured finance spreadsheet
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        title: 'JFLIPS Finance & Class Records'
      },
      sheets: [
        {
          properties: {
            title: 'Monthly Summaries',
            gridProperties: { rowCount: 100, columnCount: 10 }
          }
        },
        {
          properties: {
            title: 'Classes Log',
            gridProperties: { rowCount: 1000, columnCount: 10 }
          }
        }
      ]
    })
  });

  if (!createRes.ok) {
    let details = '';
    try {
      const errJson = await createRes.json();
      details = errJson?.error?.message || JSON.stringify(errJson);
    } catch {
      try {
        details = await createRes.text();
      } catch {
        details = createRes.statusText;
      }
    }
    throw new Error(`Failed to create spreadsheet: ${createRes.status} ${details}`);
  }
  const spread = await createRes.json();
  const id = spread.spreadsheetId;
  setSavedSpreadsheetId(id);

  // Style the newly created subsheets
  await formatSpreadsheetSheets(id, accessToken);

  return id;
}

/**
 * Initial formatting and styles for sheets to make them look distinct and professional!
 */
async function formatSpreadsheetSheets(spreadsheetId: string, accessToken: string): Promise<void> {
  // Let's write the headers for our sheets
  const headersPayload = {
    valueInputOption: 'USER_ENTERED',
    data: [
      {
        range: 'Monthly Summaries!A1:E1',
        values: [['Month (YYYY-MM)', 'Total Revenue (Aesthetic)', 'Total Sessions', 'Expenses (Coach Pay)', 'Net Income']]
      },
      {
        range: 'Classes Log!A1:H1',
        values: [['Date', 'Class/Gym Name', 'Coach Name', 'Enrolled Count', 'Is Competition', 'Hours Coached', 'Rate/Price', 'Calculated Revenue']]
      }
    ]
  };

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(headersPayload)
  });
}

/**
 * Exports all active sessions and archived history into Google Sheets.
 * Overwrites spreadsheets to build a clean single source of truth!
 */
export async function syncFinancesToGoogleSheet(
  sessions: any[],
  history: any[],
  classTypes: any[],
  gyms: any[],
  staff: any[],
  accessToken: string
): Promise<string> {
  const spreadsheetId = await getOrCreateSpreadsheet(accessToken);

  // Gather ALL sessions: some from active list, some from the history archives!
  interface CombinedSession {
    date: string;
    name: string;
    coachName: string;
    studentCount: number;
    isCompetition: boolean;
    hoursCoached: number;
    rate: number;
    revenue: number;
  }

  const allRecords: CombinedSession[] = [];

  // Helper to map and compute a single session
  const processSession = (sess: any, sStudents: any[], sGyms: any[], sClassTypes: any[], sStaff: any[]) => {
    const ct = sClassTypes.find((c: any) => c.id === sess.classTypeId);
    const gym = sGyms.find((g: any) => g.id === sess.classTypeId);
    
    let price = ct ? ct.price : (gym ? gym.pay_amount : 0);
    if (gym && sess.custom_event_name) {
      const customPreset = gym.custom_event_presets?.find((p: string) => {
        const name = p.includes(':') ? p.split(':')[0] : p;
        return name.toLowerCase() === sess.custom_event_name?.toLowerCase();
      });
      if (customPreset && customPreset.includes(':')) {
        const ratePart = customPreset.split(':')[1];
        const parsed = parseFloat(ratePart);
        if (!isNaN(parsed)) {
          price = parsed;
        }
      }
    }
    if (sess.is_competition && gym?.competition_rate) {
      price = gym.competition_rate;
    }

    const className = ct?.name || gym?.name || 'Session';
    let revenue = 0;
    if (gym) {
      revenue = price * (sess.hours_coached || gym.default_hours || 1);
    } else {
      revenue = (sess.studentIds || []).reduce((sum: number, sid: string) => {
        const student = sStudents.find((s: any) => s.id === sid);
        return sum + getStudentSessionPrice(student, sess, price, className);
      }, 0);
    }

    const coach = sStaff.find((s: any) => s.id === sess.coach_id);
    const coachName = coach ? coach.name : 'Unassigned';

    return {
      date: sess.date || new Date().toISOString().split('T')[0],
      name: className,
      coachName,
      studentCount: sess.studentIds?.length || (gym ? 1 : 0),
      isCompetition: !!sess.is_competition,
      hoursCoached: Number(sess.hours_coached || gym?.default_hours || 1),
      rate: price,
      revenue: revenue
    };
  };

  // 1. Process active sessions
  sessions.forEach(sess => {
    allRecords.push(processSession(sess, [], gyms, classTypes, staff));
  });

  // 2. Process archived history sessions (from snapshots!)
  history.forEach(hist => {
    const snapshot = hist.snapshot_data || hist.snapshot_json || {};
    const hSessions = hist.sessions || hist.sessions_json || snapshot.sessions || [];
    const hGyms = snapshot.gyms || gyms;
    const hClassTypes = snapshot.classTypes || classTypes;
    const hStaff = snapshot.staff || staff;

    hSessions.forEach((sess: any) => {
      allRecords.push(processSession(sess, [], hGyms, hClassTypes, hStaff));
    });
  });

  // Sort sessions by Date descending
  allRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Prepare "Classes Log" values to write
  const rawClassesRows = allRecords.map(r => [
    r.date,
    r.name,
    r.coachName,
    r.studentCount,
    r.isCompetition ? 'Yes' : 'No',
    r.hoursCoached,
    r.rate,
    r.revenue
  ]);

  // Group by Monthly summaries in memory to output perfectly formatted dynamic entries
  const monthlyGroups = new Map<string, { revenue: number; count: number; expenses: number }>();
  
  allRecords.forEach(r => {
    const monthKey = r.date.substring(0, 7); // "YYYY-MM"
    if (!monthlyGroups.has(monthKey)) {
      monthlyGroups.set(monthKey, { revenue: 0, count: 0, expenses: 0 });
    }
    const grp = monthlyGroups.get(monthKey)!;
    grp.revenue += r.revenue;
    grp.count += 1;

    // Approximate coach pay as expenses
    // Find coach hourly payrate
    const coachMatched = staff.find((s: any) => s.name === r.coachName);
    const rate = coachMatched?.pay_rate || 0;
    grp.expenses += rate * r.hoursCoached;
  });

  const sortedMonths = Array.from(monthlyGroups.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  const monthlySummaryRows = sortedMonths.map(([m, data]) => [
    m,
    data.revenue,
    data.count,
    data.expenses,
    data.revenue - data.expenses // Net profit
  ]);

  // 1. Clear both sheets first
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/MonthlySummaries!A2:E100:clear`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/ClassesLog!A2:H1000:clear`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  // 2. Write Headers (to make sure they are exact and clean)
  await formatSpreadsheetSheets(spreadsheetId, accessToken);

  // 3. Batch update values
  const writePayload = {
    valueInputOption: 'USER_ENTERED',
    data: [
      {
        range: 'Monthly Summaries!A2',
        values: monthlySummaryRows
      },
      {
        range: 'Classes Log!A2',
        values: rawClassesRows
      }
    ]
  };

  const writeRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(writePayload)
  });

  if (!writeRes.ok) {
    let details = '';
    try {
      const errJson = await writeRes.json();
      details = errJson?.error?.message || JSON.stringify(errJson);
    } catch {
      try {
        details = await writeRes.text();
      } catch {
        details = writeRes.statusText;
      }
    }
    throw new Error(`Failed to update spreadsheet data: ${writeRes.status} ${details}`);
  }

  return spreadsheetId;
}
