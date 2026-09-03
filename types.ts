
export interface Student {
  id: string;
  name: string;
  phone?: string;
  groupKey?: string;
  is_gym_member?: boolean;
  associated_gym_id?: string;
  signup_source?: string;
  // New fields from signup form
  first_name?: string;
  last_name?: string;
  dob?: string;
  age?: number;
  class_name?: string;
  parent1_name?: string;
  parent1_phone?: string;
  parent1_email?: string;
  parent2_name?: string;
  parent2_phone?: string;
  medical_notes?: string;
  indemnity_signed?: boolean;
  indemnity_date?: string;
  signature_data?: string; // Base64 signature
  is_cheer?: boolean;
  sub_team_ids?: string[];
  custom_group_rate?: number;
  custom_private_rate?: number;
  is_temporary?: boolean;
  trial_notes?: string;
  created_by_coach_id?: string;
  first_class_date?: string;
}

export function getStudentSessionPrice(
  student: Student | undefined,
  session: { custom_event_name?: string },
  basePrice: number,
  className?: string
): number {
  if (!student) return basePrice;
  const eventName = (session.custom_event_name || className || '').toLowerCase();
  const isPrivate = eventName.includes('private');

  if (isPrivate && student.custom_private_rate != null && Number(student.custom_private_rate) > 0) {
    return Number(student.custom_private_rate);
  }
  if (!isPrivate && student.custom_group_rate != null && Number(student.custom_group_rate) > 0) {
    return Number(student.custom_group_rate);
  }
  return basePrice;
}

export interface Gym {
  id: string;
  name: string;
  session_types: string;
  pay_amount: number;
  competition_rate?: number;
  user_id: string;
  gym_type?: 'tumbling' | 'cheer';
  default_hours?: number;
  created_at?: string;
  bill_to_name?: string;
  bill_to_address?: string;
  bill_to_phone?: string;
  parent_gym_id?: string;
  coach_ids?: string[];
  coach_rates?: Record<string, number>;
  default_coach_id?: string;
  secondary_coach_id?: string;
  auto_reset_invoice?: boolean;
  billing_day?: number;
  custom_event_presets?: string[];
  coach_names?: string[];
}

export interface ClassType {
  id: string;
  name: string;
  price: number;
  studentIds?: string[];
  allow_signup?: boolean;
  auto_reset_invoice?: boolean;
}

export interface AttendanceSession {
  id: string;
  date: string;
  classTypeId: string;
  studentIds: string[];
  hours_coached?: number;
  coach_id?: string;
  is_competition?: boolean;
  created_at?: string;
  custom_event_name?: string;
  covering_coach_name?: string;
  /**
   * Rows sharing this id are ONE real-world coaching slot logged in one action.
   * The app writes one row per coach, so this is what lets the pricing engine
   * tell "one practice covered by two coaches" (split the team rate between
   * them) apart from "two separate practices" (each coach earns the full rate).
   * Null on rows logged before add_session_group_id.sql was run — those fall
   * back to grouping by date + team + event type.
   */
  session_group_id?: string | null;
}

export interface HistoryMonth {
  id: string;
  monthName: string;
  year: number;
  sessions: AttendanceSession[];
  revenue: number;
  tumblingGross?: number;
  tumblingCoachPay?: number;
  tumblingNet?: number;
  schoolsGross?: number;
  schoolsCoachPay?: number;
  gymsGross?: number;
  gymsNet?: number;
  totalGross?: number;
  totalCoachPayout?: number;
  netProfit?: number;
  sessionCount?: number;
  /**
   * What the clients were actually invoiced for this month — the History tab's
   * headline figure. Derived from the archived sessions, never accumulated, so
   * it stays right when a session is edited, deleted or archived twice.
   */
  invoicesTotal?: number;
  /** How many separate client invoices `invoicesTotal` is made of. */
  invoiceCount?: number;
  /** Last time this month was rebuilt from its archived sessions. */
  recalculatedAt?: string;
  recordedAt: string;
  snapshot_data?: {
    students: Student[];
    gyms: Gym[];
    staff?: any[];
    classTypes: ClassType[];
    payments: Payment[];
  };
}

export interface OwnerProfile {
  id: string; // id uuid primary key
  email?: string; // email text
  businessName?: string; // business_name text
  accessCode?: string; // access_code text
  bankName?: string; // bank_name text
  accountNumber?: string; // account_number text
  branchCode?: string; // branch_code text
  accountType?: string; // account_type text
  bizBankName?: string; // biz_bank_name text
  bizAccountNumber?: string; // biz_account_number text
  bizBranchCode?: string; // biz_branch_code text
  bizAccountType?: string; // biz_account_type text
  logo?: string; // logo text
  /** Rand taken off a class session when linked siblings attend it together. */
  siblingDiscount?: number; // sibling_discount numeric
  /** Seeds a NEW athlete's custom_group_rate. Never re-applied afterwards. */
  defaultGroupRate?: number; // default_group_rate numeric
  createdAt?: string; // created_at timestamptz
}

export interface StaffProfile {
  id: string; // id uuid primary key
  ownerId?: string; // owner_id uuid
  name?: string; // name text
  email?: string; // email text
  username?: string; // username text
  payRate?: number; // pay_rate numeric
  bankName?: string; // bank_name text
  accountNumber?: string; // account_number text
  branchCode?: string; // branch_code text
  accountType?: string; // account_type text
  status: 'pending' | 'approved' | 'rejected'; // status text
  canViewTumbling: boolean; // can_view_tumbling boolean
  canViewSchoolGyms?: boolean; // can_view_school_gyms boolean
  assignedCheerOrgIds: string[]; // assigned_cheer_org_ids text[]
  createdAt?: string; // created_at timestamptz
  approvedAt?: string; // approved_at timestamptz
}

export interface Profile {
  id?: string;
  /** The signed-in person's own name (coaches: their staff_profiles.name). */
  name?: string;
  username?: string;
  businessName: string;
  bankName: string;
  accountNumber: string;
  branchCode: string;
  accountType: string;
  bizBankName?: string;
  bizAccountNumber?: string;
  bizBranchCode?: string;
  bizAccountType?: string;
  logo?: string;
  role?: string;
  owner_id?: string;
  pay_rate?: number;
  email?: string;
  access_code?: string;
  status?: string;
  is_approved?: boolean;
  can_view_tumbling?: boolean;
  can_view_school_gyms?: boolean;
  assigned_cheer_org_ids?: string[];
  /**
   * Rand deducted once from a class session when two or more linked siblings
   * attend it together. Owner-level setting; 0 or absent disables it.
   */
  sibling_discount?: number;
  /**
   * The group rate a NEWLY created tumbling athlete is given. Copied onto the
   * athlete's own custom_group_rate at creation and never consulted again, so
   * changing it never moves an athlete who already exists. 0 disables it.
   */
  default_group_rate?: number;
  /**
   * Which bank account prints on ONE client's invoice: `{ "<family_id>":
   * "business" }`. Lives in the database — it used to be localStorage only,
   * which is why the selection kept reverting to the personal account.
   */
  invoice_bank_allocations?: Record<string, 'personal' | 'business'>;
  /**
   * The account a client follows when no explicit choice was made for them,
   * per client group: `{ schools, gyms, tumbling }`. Set in the Management tab.
   */
  bank_allocation_defaults?: Partial<Record<'schools' | 'gyms' | 'tumbling', 'personal' | 'business'>>;
}

export type NotificationType =
  | 'student_signup'
  | 'cheer_signup'
  | 'coach_signup'
  | 'session_logged'
  | 'class_added'
  | 'system';

export interface AppNotification {
  id: string;
  user_id: string;
  title?: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
  metadata?: any;
}

export interface Payment {
  id: string;
  invoice_id: string; // Linked to history.id or a virtual ID for current month
  family_id: string;   // groupKey or studentId
  client_name?: string; // Captured at time of archive
  bill_to_address?: string; // Snapshot for cheer teams
  bill_to_phone?: string;   // Snapshot for cheer teams
  amount_due: number;
  due_date: string;
  created_at?: string;
  is_expense?: boolean; // True if this is a payment TO a coach
}

export interface Skill {
  id: string;
  name: string;
  category: string;
}

export interface AthleteSkill {
  id: string;
  athlete_id: string;
  skill_id: string;
  achieved: boolean;
  date_achieved?: string;
  notes?: string;
}

export interface ClassSchedule {
  id: string;
  class_ids: string[];
  day_of_week: number; // 0=Sun, 1=Mon, …, 6=Sat
  time: string;        // "16:00" (HH:mm)
  label?: string;
  coach_id?: string;
  color?: string;
  athlete_ids?: string[]; // Encoded in color in DB
}

export interface InvoiceSnapshot {
  id: string;
  coach_id: string;
  label: string;
  snapshot_data: {
    sessions: AttendanceSession[];
    payments: Payment[];
    history: HistoryMonth[];
  };
  created_at: string;
}

export interface Competition {
  id: string;
  name: string;
  date: string;
  location?: string;
  gym_ids: string[]; // Teams participating
  notes?: string;
  created_at?: string;
}

export interface AppState {
  students: Student[];
  gyms: Gym[];
  classTypes: ClassType[];
  sessions: AttendanceSession[];
  history: HistoryMonth[];
  payments: Payment[];
  schedules: ClassSchedule[];
  staff?: any[];
  competitions: Competition[];
  profile: Profile;
  theme: 'light' | 'dark';
  snapshots: InvoiceSnapshot[];
  notifications: AppNotification[];
  pendingSyncCount: number;
  cheerRegistrations?: any[];
}

export enum View {
  DASHBOARD = 'DASHBOARD',
  LOG_SESSION = 'LOG_SESSION',
  REGISTER = 'REGISTER', // Used for Log Classes
  TEAM_ATTENDANCE = 'TEAM_ATTENDANCE', // Used for Log Team Practice
  GYM_ATTENDANCE = 'GYM_ATTENDANCE', // Used for Log Gym Session
  TEAM_MANAGEMENT = 'TEAM_MANAGEMENT',
  ROSTER = 'ROSTER',
  INVOICES = 'INVOICES',
  HISTORY = 'HISTORY',
  STATISTICS = 'STATISTICS',
  SCHEDULE = 'SCHEDULE',
  ALL_LOGS = 'ALL_LOGS'
}
