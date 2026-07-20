
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
  default_coach_id?: string;
  secondary_coach_id?: string;
  auto_reset_invoice?: boolean;
  billing_day?: number;
  custom_event_presets?: string[];
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
}

export interface HistoryMonth {
  id: string;
  monthName: string;
  year: number;
  sessions: AttendanceSession[];
  revenue: number;
  recordedAt: string;
  snapshot_data?: {
    students: Student[];
    gyms: Gym[];
    staff: Staff[];
    classTypes: ClassType[];
    payments: Payment[];
  };
}

export interface Profile {
  id?: string;
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
  role?: 'owner' | 'coach';
  owner_id?: string; // If coach, this links to their owner
  pay_rate?: number; // Default pay rate for coach
  email?: string;
}

export interface Staff {
  id: string;
  email: string;
  name: string;
  role: 'coach';
  pay_rate: number;
  owner_id: string;
  created_at?: string;
  bank_name?: string;
  account_number?: string;
  branch_code?: string;
  account_type?: string;
  password?: string;
  is_owner?: boolean;
  assigned_gym_ids?: string[];    // gyms/teams this coach can access
  assigned_class_ids?: string[];  // class types this coach can access
}

export interface AppNotification {
  id: string;
  user_id: string;
  message: string;
  type: 'session_logged' | 'system';
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
  staff: Staff[];
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
