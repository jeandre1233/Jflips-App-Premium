import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Search, 
  ChevronRight, 
  Building2, 
  Building, 
  Trophy, 
  Dumbbell, 
  Trash2, 
  Users, 
  X, 
  Upload, 
  CheckCircle2, 
  Check, 
  AlertCircle,
  LogOut, 
  Bell, 
  FileSpreadsheet, 
  Calendar,
  Settings2,
  Download,
  Zap,
  Key,
  Copy
} from 'lucide-react';
import { 
  AppState, 
  Profile, 
  Student, 
  Gym, 
  ClassType, 
  ClassSchedule,
  StaffProfile 
} from '../../types';
import { supabase } from '../../supabase';
import { 
  initAuth as initGoogleAuth, 
  googleSignIn, 
  logoutGoogle, 
  getAccessToken, 
  getSavedSpreadsheetId, 
  getSavedCalendarId, 
  syncSchedulesToCalendar, 
  syncFinancesToGoogleSheet 
} from '../utils/googleWorkspace';
import { getDiscordWebhookUrl, setDiscordWebhookUrl, isDiscordNotificationsEnabled, setDiscordNotificationsEnabled } from '../utils/discordNotifications';

const athleteItemVariants = {
  hidden: { y: 15, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const CoachApprovalCard: React.FC<{
  coach: StaffProfile;
  cheerGyms: Gym[];
  ownerBusinessName?: string;
  onRefreshStaff?: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}> = ({ coach, cheerGyms, ownerBusinessName, onRefreshStaff, showToast }) => {
  const [canViewTumbling, setCanViewTumbling] = useState<boolean>(coach.canViewTumbling);
  const [canViewSchoolGyms, setCanViewSchoolGyms] = useState<boolean>(coach.canViewSchoolGyms ?? false);
  const [assignedCheerOrgIds, setAssignedCheerOrgIds] = useState<string[]>(coach.assignedCheerOrgIds || []);
  const [payRate, setPayRate] = useState<number>(coach.payRate || 0);
  const [username, setUsername] = useState<string>(coach.username || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setCanViewTumbling(coach.canViewTumbling);
    setCanViewSchoolGyms(coach.canViewSchoolGyms ?? false);
    setAssignedCheerOrgIds(coach.assignedCheerOrgIds || []);
    setPayRate(coach.payRate || 0);
    setUsername(coach.username || '');
  }, [coach.canViewTumbling, coach.canViewSchoolGyms, coach.assignedCheerOrgIds, coach.payRate, coach.username]);

  const toggleCheerGym = (gymId: string) => {
    if (assignedCheerOrgIds.includes(gymId)) {
      setAssignedCheerOrgIds(assignedCheerOrgIds.filter(id => id !== gymId));
    } else {
      setAssignedCheerOrgIds([...assignedCheerOrgIds, gymId]);
    }
  };

  const handleApproveOrUpdate = async (status: 'approved' | 'rejected') => {
    setIsSubmitting(true);
    try {
      const cleanUsername = username.trim().replace(/^@/, '').toLowerCase();
      const updateData: any = {
        status,
        can_view_tumbling: canViewTumbling,
        can_view_school_gyms: canViewSchoolGyms,
        assigned_cheer_org_ids: assignedCheerOrgIds,
        pay_rate: payRate,
        username: cleanUsername || null
      };
      if (status === 'approved') {
        updateData.approved_at = new Date().toISOString();
      }

      let { data: updated, error: dbErr } = await supabase
        .from('staff_profiles')
        .update(updateData)
        .eq('id', coach.id)
        .select('*')
        .single();

      if (dbErr && (dbErr.message.includes('can_view_school_gyms') || dbErr.message.includes('username') || dbErr.message.includes('column'))) {
        if (dbErr.message.includes('can_view_school_gyms')) delete updateData.can_view_school_gyms;
        const retry = await supabase
          .from('staff_profiles')
          .update(updateData)
          .eq('id', coach.id)
          .select('*')
          .single();
        dbErr = retry.error;
      }

      if (dbErr) {
        showToast(`Failed to update coach status: ${dbErr.message}`, 'error');
        setIsSubmitting(false);
        return;
      }

      // Trigger email notification to coach
      if (coach.email) {
        try {
          const emailRes = await supabase.functions.invoke('send-staff-email', {
            body: {
              type: 'coach_approval',
              coachEmail: coach.email,
              coachName: coach.name || 'Coach',
              businessName: ownerBusinessName || 'JFLIPS Gym',
              outcome: status
            }
          });
          if (emailRes.error || (emailRes.data && emailRes.data.error)) {
            console.warn('Staff notification email warning:', emailRes.error || emailRes.data.error);
          }
        } catch (emailErr: any) {
          console.warn('Staff notification exception:', emailErr);
        }
      }

      showToast(
        status === 'approved' 
          ? `Coach ${coach.name || coach.email} approved and updated!` 
          : `Coach request for ${coach.name || coach.email} marked as rejected.`,
        status === 'approved' ? 'success' : 'info'
      );

      if (onRefreshStaff) onRefreshStaff();
    } catch (err: any) {
      showToast(`Error: ${err.message || 'An error occurred'}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-sm space-y-4">
      {/* Header: Name, Email, Username & Status */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 text-[#1e4da1] dark:text-blue-400 font-black rounded-2xl flex items-center justify-center uppercase">
            {(coach.name || coach.email || 'C').charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-black text-slate-900 dark:text-white italic uppercase">
                {coach.name || 'Unnamed Coach'}
              </p>
              {coach.username && (
                <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-mono font-bold text-[8px] rounded-md">
                  @{coach.username}
                </span>
              )}
            </div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              {coach.email}
            </p>
          </div>
        </div>

        <span className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-wider ${
          coach.status === 'approved'
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
            : coach.status === 'rejected'
            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
            : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 animate-pulse'
        }`}>
          {coach.status}
        </span>
      </div>

      {/* Permissions & Credentials Configuration */}
      <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl space-y-3 border border-slate-100 dark:border-slate-800/80">
        <p className="text-[9px] font-black uppercase tracking-widest text-[#1e4da1] dark:text-blue-400">
          Coach Credentials & Access Permissions
        </p>

        {/* Coach Username Input */}
        <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-transparent flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-800 dark:text-slate-200 block">
              Coach Username
            </span>
            <span className="text-[8px] text-slate-400 font-bold">
              Used for instant login without entering email
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs font-mono font-black text-slate-400">@</span>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))}
              className="w-36 p-2 bg-slate-50 dark:bg-slate-900 rounded-lg text-xs font-mono font-bold outline-none text-left dark:text-slate-200 border border-slate-100 dark:border-slate-800 focus:border-blue-400"
              placeholder="username"
            />
          </div>
        </div>

        {/* Tumbling Toggle */}
        <label className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl cursor-pointer hover:border-blue-200 transition-colors border border-transparent">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-800 dark:text-slate-200 block">
              Tumbling Access
            </span>
            <span className="text-[8px] text-slate-400 font-bold">
              Grants access to tumbling roster & student records
            </span>
          </div>
          <input
            type="checkbox"
            checked={canViewTumbling}
            onChange={e => setCanViewTumbling(e.target.checked)}
            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
        </label>

        {/* Tumbling Hourly Rate */}
        <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-transparent flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-800 dark:text-slate-200 block">
              Tumbling Hourly Rate (R/hr)
            </span>
            <span className="text-[8px] text-slate-400 font-bold">
              Coach base rate for coaching tumbling sessions
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs font-black text-slate-400">R</span>
            <input
              type="number"
              value={payRate}
              onChange={e => setPayRate(parseFloat(e.target.value) || 0)}
              className="w-20 p-2 bg-slate-50 dark:bg-slate-900 rounded-lg text-xs font-black outline-none text-right dark:text-slate-200 border border-slate-100 dark:border-slate-800"
              placeholder="150"
            />
          </div>
        </div>

        {/* School Gym Toggle */}
        <label className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl cursor-pointer hover:border-blue-200 transition-colors border border-transparent">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-800 dark:text-slate-200 block">
              School Gym
            </span>
            <span className="text-[8px] text-slate-400 font-bold">
              Grants access to school gym classes & schedules
            </span>
          </div>
          <input
            type="checkbox"
            checked={canViewSchoolGyms}
            onChange={e => setCanViewSchoolGyms(e.target.checked)}
            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
        </label>

        {/* Cheer Gyms Multi-Select */}
        <div className="space-y-2 pt-1">
          <span className="text-[9px] font-black uppercase text-slate-700 dark:text-slate-300 block">
            Assigned Cheer Teams / Organizations ({assignedCheerOrgIds.length} Selected)
          </span>

          {cheerGyms.length === 0 ? (
            <p className="text-[8px] text-slate-400 italic">No cheer team organizations created yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {cheerGyms.map((gym, gIdx) => {
                const isChecked = assignedCheerOrgIds.includes(gym.id);
                return (
                  <label
                    key={`cheer-gym-${coach.id || 'c'}-${gym.id || 'g'}-${gIdx}`}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-[9px] font-black uppercase cursor-pointer transition-colors ${
                      isChecked
                        ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500/40 text-blue-700 dark:text-blue-300'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleCheerGym(gym.id)}
                      className="w-3.5 h-3.5 rounded text-blue-600"
                    />
                    <span className="truncate">{gym.name}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-1">
        {coach.status === 'pending' ? (
          <>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleApproveOrUpdate('approved')}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-black text-[9px] uppercase tracking-wider shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 size={14} /> Approve & Grant Permissions
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleApproveOrUpdate('rejected')}
              className="px-4 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 hover:bg-rose-100 py-3 rounded-xl font-black text-[9px] uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <X size={14} /> Reject
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleApproveOrUpdate('approved')}
            className="w-full bg-[#1e4da1] hover:bg-blue-600 text-white py-3 rounded-xl font-black text-[9px] uppercase tracking-wider shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Check size={14} /> Update Coach & Permissions
          </button>
        )}
      </div>
    </div>
  );
};

const StaffManagementSection: React.FC<{
  state: AppState;
  onRefreshStaff?: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}> = ({ state, onRefreshStaff, showToast }) => {
  const staffList: StaffProfile[] = (state.staff || []).map(s => ({
    id: s.id,
    ownerId: s.ownerId || (s as any).owner_id,
    name: s.name || 'Unnamed Coach',
    email: s.email || '',
    username: s.username || (s as any).username || '',
    payRate: s.payRate || (s as any).pay_rate,
    status: s.status || 'pending',
    canViewTumbling: s.canViewTumbling ?? (s as any).can_view_tumbling ?? false,
    assignedCheerOrgIds: s.assignedCheerOrgIds || (s as any).assigned_cheer_org_ids || []
  }));

  const cheerGyms = (state.gyms || []).filter(g => g.gym_type === 'cheer');

  const pendingStaff = staffList.filter(s => s.status === 'pending');
  const managedStaff = staffList.filter(s => s.status === 'approved' || s.status === 'rejected');

  const [accessCodeCopied, setAccessCodeCopied] = useState(false);

  const copyAccessCode = () => {
    if (state.profile?.access_code) {
      navigator.clipboard.writeText(state.profile.access_code);
      setAccessCodeCopied(true);
      setTimeout(() => setAccessCodeCopied(false), 2000);
      showToast('Owner Access Code copied to clipboard!', 'success');
    }
  };

  return (
    <div className="space-y-6">
      {/* Access Code Banner */}
      <div className="bg-gradient-to-r from-blue-900/20 via-blue-800/10 to-indigo-900/20 p-6 rounded-3xl border border-blue-500/20 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Key size={18} className="text-blue-400" />
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase italic">Gym Owner Access Code</h3>
          </div>
          <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-1">
            Share this unique access code with coaches so they can register under your gym.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
          <div className="px-4 py-2.5 bg-slate-900 text-blue-400 font-mono font-black text-sm tracking-wider rounded-xl border border-blue-500/30">
            {state.profile?.access_code || 'No Code Set'}
          </div>
          <button
            type="button"
            onClick={copyAccessCode}
            className="p-2.5 bg-[#1e4da1] hover:bg-blue-600 text-white rounded-xl transition-all shadow-md flex items-center justify-center cursor-pointer"
            title="Copy Access Code"
          >
            {accessCodeCopied ? <Check size={18} /> : <Copy size={18} />}
          </button>
        </div>
      </div>

      {/* PENDING COACHES SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-[#1a1a1a] dark:text-slate-100 uppercase italic flex items-center gap-2">
              Pending Coach Requests
              {pendingStaff.length > 0 && (
                <span className="px-2 py-0.5 text-[9px] bg-amber-500 text-slate-950 font-black rounded-full">
                  {pendingStaff.length}
                </span>
              )}
            </h2>
            <p className="text-[8px] font-black text-[#94a3b8] uppercase">Review, approve, and set access permissions</p>
          </div>
        </div>

        {pendingStaff.length === 0 ? (
          <div className="py-10 bg-white dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-3xl text-center">
            <CheckCircle2 size={24} className="mx-auto text-emerald-500 mb-2" />
            <p className="text-slate-400 text-[10px] font-black uppercase">No pending coach requests</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingStaff.map((coach, pIdx) => (
              <CoachApprovalCard
                key={`pending-coach-${coach.id || 'p'}-${pIdx}`}
                coach={coach}
                cheerGyms={cheerGyms}
                ownerBusinessName={state.profile?.businessName}
                onRefreshStaff={onRefreshStaff}
                showToast={showToast}
              />
            ))}
          </div>
        )}
      </div>

      {/* MANAGED COACHES SECTION */}
      <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-black text-[#1a1a1a] dark:text-slate-100 uppercase italic">
            Approved & Managed Staff
          </h2>
          <p className="text-[8px] font-black text-[#94a3b8] uppercase">Manage active coach permissions and team access</p>
        </div>

        {managedStaff.length === 0 ? (
          <div className="py-10 bg-white dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-3xl text-center">
            <Users size={24} className="mx-auto text-slate-400 mb-2" />
            <p className="text-slate-400 text-[10px] font-black uppercase">No active staff members yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {managedStaff.map((coach, mIdx) => (
              <CoachApprovalCard
                key={`managed-coach-${coach.id || 'm'}-${mIdx}`}
                coach={coach}
                cheerGyms={cheerGyms}
                ownerBusinessName={state.profile?.businessName}
                onRefreshStaff={onRefreshStaff}
                showToast={showToast}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const RosterView = memo(({ state, activeTab, onTabChange, entityType, onEntityTypeChange, onUpdateProfile, onAddStudent, onEditStudent, onRemoveStudent, onAddGym, onEditGym, onRemoveGym, onAddClass, onEditClass, onRemoveClass, isStudentLinked, onAddSchedule, onEditSchedule, onRemoveSchedule, onLogout, onRefreshStaff }: {
  state: AppState,
  activeTab: 'students' | 'classes' | 'schedule' | 'staff' | 'profile',
  onTabChange: (tab: 'students' | 'classes' | 'schedule' | 'staff' | 'profile') => void,
  entityType: 'athletes' | 'gyms' | 'teams',
  onEntityTypeChange: (type: 'athletes' | 'gyms' | 'teams') => void,
  onUpdateProfile: (p: Profile) => void,
  onAddStudent: () => void,
  onEditStudent: (s: Student) => void,
  onRemoveStudent: (id: string) => void,
  onAddGym: (type?: 'tumbling' | 'cheer', parentId?: string) => void,
  onEditGym: (g: Gym) => void,
  onRemoveGym: (id: string) => void,
  onAddClass: () => void,
  onEditClass: (c: ClassType) => void,
  onRemoveClass: (id: string) => void,
  isStudentLinked: (s: Student) => boolean,
  onAddSchedule: () => void,
  onEditSchedule: (s: ClassSchedule) => void,
  onRemoveSchedule: (id: string) => void,
  onLogout: () => void,
  onRefreshStaff?: () => void
}) => {
  const [search, setSearch] = useState('');
  const [profileForm, setProfileForm] = useState<Profile>(state.profile);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isOwner = state.profile.role === 'owner';

  useEffect(() => {
    setProfileForm(state.profile);
  }, [state.profile]);

  const [googleUser, setGoogleUser] = useState<any>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(getSavedSpreadsheetId());
  const [calendarId, setCalendarId] = useState<string | null>(getSavedCalendarId());
  const [googleSheetsSyncEnabled, setGoogleSheetsSyncEnabled] = useState<boolean>(() => {
    return localStorage.getItem('google_sheets_sync_enabled') === 'true';
  });
  const [googleCalendarSyncEnabled, setGoogleCalendarSyncEnabled] = useState<boolean>(() => {
    return localStorage.getItem('google_calendar_sync_enabled') === 'true';
  });
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const onboardingUrl = `${window.location.origin}/#/signup?ownerId=${state.profile?.id || ''}`;
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(onboardingUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error('Failed to copy onboarding link', err);
    }
  };

  useEffect(() => {
    const unsubscribe = initGoogleAuth(
      (u, token) => {
        setGoogleUser(u);
        setGoogleToken(token);
        setSpreadsheetId(getSavedSpreadsheetId());
        setCalendarId(getSavedCalendarId());
      },
      () => {
        setGoogleUser(null);
        setGoogleToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setGoogleToken(result.accessToken);
        setSpreadsheetId(getSavedSpreadsheetId());
        setCalendarId(getSavedCalendarId());
        showToast('Successfully connected your Google account!', 'success');
      }
    } catch (err: any) {
      showToast('Google Sign-In failed: ' + err.message, 'error');
    }
  };

  const handleGoogleSignOut = async () => {
    if (window.confirm('Sign out of your connected Google account?')) {
      await logoutGoogle();
      setGoogleUser(null);
      setGoogleToken(null);
      showToast('Google account disconnected successfully.', 'success');
    }
  };

  const syncSchedules = async () => {
    const token = await getAccessToken();
    if (!token) {
      showToast('Please connect your Google account first!', 'info');
      return;
    }
    setIsSyncing(true);
    try {
      await syncSchedulesToCalendar(
        state.schedules || [],
        state.classTypes || [],
        state.gyms || [],
        state.staff || [],
        token
      );
      setCalendarId(getSavedCalendarId());
      showToast('Timetable successfully synchronized to Google Calendar!', 'success');
    } catch (err: any) {
      showToast('Calendar Sync failed: ' + err.message, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const syncSheetsFinances = async () => {
    const token = await getAccessToken();
    if (!token) {
      showToast('Please connect your Google account first!', 'info');
      return;
    }
    const confirmed = window.confirm(
      'Refresh spreadsheet? This will export active sessions & archived records to make Sheets the single source of truth.'
    );
    if (!confirmed) return;

    setIsSyncing(true);
    try {
      const sheetId = await syncFinancesToGoogleSheet(
        state.sessions || [],
        state.history || [],
        state.classTypes || [],
        state.gyms || [],
        state.staff || [],
        token
      );
      setSpreadsheetId(sheetId);
      showToast('Finances successfully synchronized to Google Sheets!', 'success');
    } catch (err: any) {
      showToast('Sheets Sync failed: ' + err.message, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const [discordEnabled, setDiscordEnabled] = useState(isDiscordNotificationsEnabled());
  const [discordWebhookInput, setDiscordWebhookInput] = useState(getDiscordWebhookUrl() || '');
  const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const handleToggleDiscord = (enabled: boolean) => {
    setDiscordEnabled(enabled);
    setDiscordNotificationsEnabled(enabled);
    showToast(enabled ? 'Discord notifications enabled' : 'Discord notifications disabled', enabled ? 'success' : 'info');
  };

  const handleTestDiscordWebhook = async () => {
    setTestStatus('sending');
    try {
      const response = await fetch(discordWebhookInput, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: '🔔 **JFLIPS Notification Engine Connected!**\nYour Discord notification system is connected and working perfectly. 🤸'
        })
      });
      if (response.ok) {
        setTestStatus('success');
      } else {
        setTestStatus('error');
      }
    } catch (err) {
      console.error(err);
      setTestStatus('error');
    }
  };

  const handleSaveDiscordWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    setDiscordWebhookUrl(discordWebhookInput);
    setDiscordNotificationsEnabled(discordEnabled);
    showToast('Discord settings saved successfully!', 'success');
  };

  const tabs = isOwner 
    ? (['students', 'classes', 'schedule', 'staff', 'profile'] as const)
    : (['students', 'classes', 'schedule', 'profile'] as const);

  const filteredAthletes = useMemo(() =>
    (state.students || []).filter(s => !s.is_gym_member && s.name.toLowerCase().includes(search.toLowerCase())),
    [state.students, search]
  );

  const filteredGyms = useMemo(() => {
    const allGyms = (state.gyms || []).filter(g => g.gym_type !== 'cheer');
    const parents = allGyms.filter(g => !g.parent_gym_id);
    const children = allGyms.filter(g => g.parent_gym_id);
    
    const searchLower = search.toLowerCase();
    
    // Group them
    return parents.map(parent => ({
      ...parent,
      subClasses: children.filter(c => c.parent_gym_id === parent.id)
    })).filter(p => 
      p.name.toLowerCase().includes(searchLower) || 
      p.subClasses.some(sc => sc.name.toLowerCase().includes(searchLower))
    );
  }, [state.gyms, search]);

  const filteredTeams = useMemo(() => {
    const allTeams = (state.gyms || []).filter(g => g.gym_type === 'cheer');
    const parents = allTeams.filter(g => !g.parent_gym_id);
    const children = allTeams.filter(g => g.parent_gym_id);
    
    const searchLower = search.toLowerCase();
    
    // Group them
    return parents.map(parent => ({
      ...parent,
      subTeams: children.filter(c => c.parent_gym_id === parent.id)
    })).filter(p => 
      p.name.toLowerCase().includes(searchLower) || 
      p.subTeams.some(st => st.name.toLowerCase().includes(searchLower))
    );
  }, [state.gyms, search]);

  const handleProfileSubmit = (e: React.FormEvent) => { e.preventDefault(); onUpdateProfile(profileForm); showToast('Business profile config saved successfully!', 'success'); };
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => setProfileForm({ ...profileForm, logo: reader.result as string }); reader.readAsDataURL(file); }
  };

  const getStudentAffiliation = (student: Student) => {
    const affiliations: string[] = [];
    if (student.associated_gym_id) {
      const mainGym = (state.gyms || []).find(g => g.id === student.associated_gym_id);
      if (mainGym) {
        affiliations.push(mainGym.name);
      }
    }
    if (student.sub_team_ids && student.sub_team_ids.length > 0) {
      student.sub_team_ids.forEach(id => {
        const subTeam = (state.gyms || []).find(g => g.id === id);
        if (subTeam) {
          affiliations.push(subTeam.name);
        }
      });
    }
    if (student.class_name) {
      affiliations.push(student.class_name);
    }
    return affiliations.join(' / ') || 'None';
  };

  const downloadRosterAsTxt = (type: 'athletes' | 'cheer' | 'all') => {
    let listToExport = state.students || [];
    let title = "ALL CLIENTS ROSTER";
    
    if (type === 'athletes') {
      listToExport = listToExport.filter(s => !s.is_gym_member);
      title = "ATHLETES ROSTER (TUMBLING)";
    } else if (type === 'cheer') {
      listToExport = listToExport.filter(s => s.is_gym_member);
      title = "CHEER TEAM ATHLETES ROSTER";
    }

    if (search) {
      const searchLower = search.toLowerCase();
      listToExport = listToExport.filter(s => s.name.toLowerCase().includes(searchLower));
    }

    if (listToExport.length === 0) {
      showToast('No roster data found to export.', 'error');
      return;
    }

    let content = `${title}\n`;
    content += "========================================\n";
    content += `Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\n`;
    content += `Total Records: ${listToExport.length}\n`;
    if (search) {
      content += `Filtered by Search: "${search}"\n`;
    }
    content += "========================================\n\n";

    listToExport.forEach((s, idx) => {
      content += `${idx + 1}. ${s.name.toUpperCase()}\n`;
      content += `   -------------------------------------\n`;
      content += `   First Name: ${s.first_name || 'N/A'}\n`;
      content += `   Last Name:  ${s.last_name || 'N/A'}\n`;
      content += `   Age/DOB:    ${s.age || 'N/A'} (DOB: ${s.dob || 'N/A'})\n`;
      content += `   Phone:      ${s.phone || 'N/A'}\n`;
      content += `   Affiliation: ${getStudentAffiliation(s)}\n`;
      content += `   Parent 1:   ${s.parent1_name || 'N/A'} (${s.parent1_phone || 'N/A'} | ${s.parent1_email || 'N/A'})\n`;
      if (s.parent2_name) {
        content += `   Parent 2:   ${s.parent2_name || 'N/A'} (${s.parent2_phone || 'N/A'})\n`;
      }
      if (s.medical_notes) {
        content += `   Medical:    ${s.medical_notes}\n`;
      }
      content += `   Indemnity:  ${s.indemnity_signed ? `Signed (${s.indemnity_date || 'N/A'})` : 'Not Signed'}\n`;
      content += `\n`;
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const filename = `${type}_roster_${new Date().toISOString().slice(0, 10)}.txt`;
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Successfully downloaded ${filename}!`, 'success');
  };

  const downloadRosterAsCsv = (type: 'athletes' | 'cheer' | 'all') => {
    let listToExport = state.students || [];
    let title = "all_clients";

    if (type === 'athletes') {
      listToExport = listToExport.filter(s => !s.is_gym_member);
      title = "tumbling_athletes";
    } else if (type === 'cheer') {
      listToExport = listToExport.filter(s => s.is_gym_member);
      title = "cheer_athletes";
    }

    if (search) {
      const searchLower = search.toLowerCase();
      listToExport = listToExport.filter(s => s.name.toLowerCase().includes(searchLower));
    }

    if (listToExport.length === 0) {
      showToast('No roster data found to export.', 'error');
      return;
    }

    const headers = [
      "Full Name",
      "First Name",
      "Last Name",
      "Age",
      "DOB",
      "Phone",
      "Affiliations",
      "Parent 1 Name",
      "Parent 1 Phone",
      "Parent 1 Email",
      "Parent 2 Name",
      "Parent 2 Phone",
      "Medical Notes",
      "Indemnity Signed",
      "Indemnity Date"
    ];

    const escapeCsvValue = (val: any) => {
      if (val === undefined || val === null) return '""';
      const str = String(val);
      const escaped = str.replace(/"/g, '""');
      return `"${escaped}"`;
    };

    const rows = listToExport.map(s => [
      escapeCsvValue(s.name),
      escapeCsvValue(s.first_name || ''),
      escapeCsvValue(s.last_name || ''),
      escapeCsvValue(s.age || ''),
      escapeCsvValue(s.dob || ''),
      escapeCsvValue(s.phone || ''),
      escapeCsvValue(getStudentAffiliation(s)),
      escapeCsvValue(s.parent1_name || ''),
      escapeCsvValue(s.parent1_phone || ''),
      escapeCsvValue(s.parent1_email || ''),
      escapeCsvValue(s.parent2_name || ''),
      escapeCsvValue(s.parent2_phone || ''),
      escapeCsvValue(s.medical_notes || ''),
      escapeCsvValue(s.indemnity_signed ? 'Yes' : 'No'),
      escapeCsvValue(s.indemnity_date || '')
    ]);

    const csvContent = "\uFEFF" + [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const filename = `${title}_roster_${new Date().toISOString().slice(0, 10)}.csv`;
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Successfully downloaded ${filename}!`, 'success');
  };

  return (
    <div className="space-y-6 mt-4">
      <div className="flex bg-slate-100/50 dark:bg-slate-800/40 p-1 rounded-xl relative overflow-x-auto no-scrollbar">
        {tabs.map((tab, idx) => (
          <button key={`${tab}-${idx}`} onClick={() => onTabChange(tab)} className={`flex-1 min-w-[55px] py-3 rounded-lg font-black text-[8px] uppercase tracking-widest transition-colors duration-300 relative z-10 ${activeTab === tab ? 'text-white' : 'text-[#94a3b8]'}`}>
            {tab === 'students' ? 'Clients' : tab === 'schedule' ? 'Sched' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            {activeTab === tab && <motion.div layoutId="rosterTabBg" className="absolute inset-0 bg-[#1e4da1] dark:bg-blue-600 rounded-lg shadow-md -z-10" transition={{ type: "spring", bounce: 0.2, duration: 0.5 }} />}
          </button>
        ))}
      </div>

      <div className="w-full">
        {activeTab === 'profile' ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              {isOwner && profileForm.logo ? (
                <img src={profileForm.logo} alt="Logo" className="w-16 h-16 rounded-2xl object-cover border-2 shadow-sm" />
              ) : (
                <div className="w-16 h-16 bg-[#1e4da1] rounded-2xl flex items-center justify-center text-white italic font-black text-xl">
                  {isOwner ? 'JF' : (profileForm.businessName?.substring(0, 2).toUpperCase() || 'C')}
                </div>
              )}
              <div>
                <h2 className="text-xl font-black text-[#1a1a1a] dark:text-slate-100 uppercase italic">
                  {isOwner ? 'Coach Profile' : 'My Profile'}
                </h2>
                <p className="text-[8px] font-black text-[#94a3b8] uppercase">
                  {isOwner ? 'Details & Logo' : 'Personal & Bank Details'}
                </p>
              </div>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-4 bg-white dark:bg-slate-800/60 p-6 rounded-3xl border border-slate-50 dark:border-slate-800 shadow-sm">
              {isOwner ? (
                <>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center gap-2 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    {profileForm.logo ? (
                      <div className="relative">
                        <img src={profileForm.logo} alt="Logo" className="h-24 w-auto object-contain rounded-lg" />
                        <button type="button" onClick={(e) => { e.stopPropagation(); setProfileForm({ ...profileForm, logo: '' }); }} className="absolute -top-2 -right-2 bg-white dark:bg-slate-800 text-red-500 rounded-full p-1 shadow-md"><X size={12} /></button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center py-2"><Upload size={20} className="text-slate-300 mb-1" /><span className="text-[9px] font-black text-slate-400 uppercase">Logo Upload</span></div>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </div>
                  <input placeholder="BUSINESS NAME" value={profileForm.businessName} onChange={e => setProfileForm({ ...profileForm, businessName: e.target.value })} className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl font-black uppercase text-[10px] outline-none dark:text-slate-200" />
                </>
              ) : (
                <>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Coach Name</label>
                    <input placeholder="NAME" value={profileForm.businessName} onChange={e => setProfileForm({ ...profileForm, businessName: e.target.value })} className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl font-black uppercase text-[10px] outline-none dark:text-slate-200" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Username (Login Handle)</label>
                    <div className="relative flex items-center">
                      <span className="absolute left-4 text-xs font-mono font-black text-slate-400">@</span>
                      <input 
                        placeholder="username" 
                        value={profileForm.username || ''} 
                        onChange={e => setProfileForm({ ...profileForm, username: e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, '') })} 
                        className="w-full p-4 pl-9 bg-slate-50 dark:bg-slate-800/50 rounded-xl font-mono font-bold text-[10px] outline-none dark:text-slate-200" 
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Email Address</label>
                    <input placeholder="EMAIL" value={profileForm.email || ''} readOnly className="w-full p-4 bg-slate-100 dark:bg-slate-900/50 rounded-xl font-black text-[10px] text-slate-500 outline-none cursor-not-allowed" />
                  </div>
                </>
              )}
              
              <div className="space-y-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-[#1e4da1] dark:text-blue-400 mt-2">Personal Bank Account</p>
                <input placeholder="PERSONAL BANK" value={profileForm.bankName} onChange={e => setProfileForm({ ...profileForm, bankName: e.target.value })} className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl font-black uppercase text-[10px] outline-none dark:text-slate-200" />
                <input placeholder="PERSONAL ACC NUMBER" value={profileForm.accountNumber} onChange={e => setProfileForm({ ...profileForm, accountNumber: e.target.value })} className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl font-black uppercase text-[10px] outline-none dark:text-slate-200" />
                <div className="grid grid-cols-2 gap-3">
                  <input placeholder="BRANCH" value={profileForm.branchCode} onChange={e => setProfileForm({ ...profileForm, branchCode: e.target.value })} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl font-black uppercase text-[10px] outline-none dark:text-slate-200" />
                  <select value={profileForm.accountType} onChange={e => setProfileForm({ ...profileForm, accountType: e.target.value })} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl font-black uppercase text-[10px] outline-none dark:text-slate-200 appearance-none">
                    <option value="Current" className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100">Current</option>
                    <option value="Savings" className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100">Savings</option>
                    <option value="Transact" className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100">Transact</option>
                  </select>
                </div>
              </div>

              {isOwner && (
                <div className="space-y-3 pt-2">
                  <p className="text-[9px] font-black uppercase tracking-widest text-[#1e4da1] dark:text-blue-400">Business Bank Account</p>
                  <input placeholder="BUSINESS BANK" value={profileForm.bizBankName || ''} onChange={e => setProfileForm({ ...profileForm, bizBankName: e.target.value })} className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl font-black uppercase text-[10px] outline-none dark:text-slate-200" />
                  <input placeholder="BUSINESS ACC NUMBER" value={profileForm.bizAccountNumber || ''} onChange={e => setProfileForm({ ...profileForm, bizAccountNumber: e.target.value })} className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl font-black uppercase text-[10px] outline-none dark:text-slate-200" />
                  <div className="grid grid-cols-2 gap-3">
                    <input placeholder="BRANCH" value={profileForm.bizBranchCode || ''} onChange={e => setProfileForm({ ...profileForm, bizBranchCode: e.target.value })} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl font-black uppercase text-[10px] outline-none dark:text-slate-200" />
                    <select value={profileForm.bizAccountType || 'Current'} onChange={e => setProfileForm({ ...profileForm, bizAccountType: e.target.value })} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl font-black uppercase text-[10px] outline-none dark:text-slate-200 appearance-none">
                      <option value="Current" className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100">Current</option>
                      <option value="Savings" className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100">Savings</option>
                      <option value="Transact" className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100">Transact</option>
                    </select>
                  </div>
                </div>
              )}
              <motion.button whileTap={{ scale: 0.95 }} type="submit" className="w-full bg-[#1e4da1] dark:bg-blue-600 text-white py-4 mt-4 rounded-xl font-black text-[10px] uppercase shadow-xl flex items-center justify-center gap-2">Save <CheckCircle2 size={16} /></motion.button>
              <div className="h-px bg-slate-100 dark:bg-slate-800 my-4"></div>
              <motion.button whileTap={{ scale: 0.95 }} type="button" onClick={onLogout} className="w-full bg-slate-50 dark:bg-slate-800/50 text-[#94a3b8] py-4 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2">Log Out <LogOut size={16} /></motion.button>
            </form>

            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-center text-slate-400 dark:text-slate-500">
              <span className="text-[20px] font-black italic text-[#1e4da1] dark:text-blue-400">JFLIPS</span>
              <p className="text-[8px] font-black uppercase tracking-[0.2em] mt-0.5">Professional Edition • v1.4.2</p>
            </div>
          </div>
        ) : activeTab === 'staff' ? (
          <StaffManagementSection state={state} onRefreshStaff={onRefreshStaff} showToast={showToast} />
        ) : activeTab === 'schedule' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-black text-[#1a1a1a] dark:text-slate-100 uppercase italic">Timetable</h2>
                <p className="text-[8px] font-black text-[#94a3b8] uppercase">Class Timings</p>
              </div>
              {isOwner && (
                <motion.button whileTap={{ scale: 0.8 }} onClick={onAddSchedule} className="w-10 h-10 bg-[#1e4da1] text-white rounded-xl flex items-center justify-center shadow-lg">
                  <Plus size={20} strokeWidth={3} />
                </motion.button>
              )}
            </div>
            
            <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-3 pb-20">
              {(!state.schedules || state.schedules.length === 0) ? (
                <div className="py-12 bg-white dark:bg-slate-850 border border-slate-100 rounded-3xl text-center"><p className="text-slate-400 text-[10px] font-black uppercase">No Schedules Set</p></div>
              ) : [...state.schedules].sort((a, b) => {
                if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
                return a.time.localeCompare(b.time);
              }).map((item, idx) => {
                const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                const bgClass = item.color || 'bg-blue-500';
                const names = (item.class_ids || []).map(cid => {
                  const ct = (state.classTypes || []).find(c => c.id === cid);
                  const gym = (state.gyms || []).find(g => g.id === cid);
                  return ct?.name || gym?.name;
                }).filter(Boolean);
                const className = item.label || names.join(' & ') || 'Class';
                const coach = state.staff?.find(s => s.id === item.coach_id);

                return (
                  <motion.div key={`sched-${item.id}-${idx}`} variants={athleteItemVariants} onClick={isOwner ? () => onEditSchedule(item) : undefined} className={`p-4 bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden ${isOwner ? 'cursor-pointer hover:border-blue-100' : ''}`}>
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${bgClass}`}></div>
                    <div className="flex items-center gap-3 ml-2 overflow-hidden">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black ${bgClass.replace('bg-', 'bg-opacity-10 bg-')} ${bgClass.replace('bg-', 'text-')}`}>
                        <Calendar size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-[#1a1a1a] dark:text-slate-100 uppercase italic line-clamp-1">{className}</p>
                        <p className="text-[8px] text-slate-400 font-bold uppercase">{daysOfWeek[item.day_of_week]} • {item.time} {coach && `• Coach: ${coach.name}`}</p>
                      </div>
                    </div>
                    {isOwner ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveSchedule(item.id);
                          }}
                          className="p-2 text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-all"
                          title="Delete Schedule"
                          aria-label="Delete Schedule"
                        >
                          <Trash2 size={16} />
                        </button>
                        <ChevronRight size={18} className="text-slate-300" />
                      </div>
                    ) : (
                      <span className="text-[7px] font-black text-[#1e4da1] bg-[#eff6ff] dark:bg-blue-900/30 px-2 py-1 rounded uppercase tracking-wider">{item.time}</span>
                    )}
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        ) : activeTab === 'classes' ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-1">
              <div>
                <h2 className="text-2xl font-black text-[#1a1a1a] dark:text-slate-100 uppercase italic">Class Types</h2>
                <p className="text-[8px] font-black text-[#94a3b8] uppercase">Tumbling Hourly Fees</p>
              </div>
              {isOwner && (
                <motion.button whileTap={{ scale: 0.8 }} onClick={onAddClass} className="w-10 h-10 bg-[#1e4da1] text-white rounded-xl flex items-center justify-center shadow-lg">
                  <Plus size={20} strokeWidth={3} />
                </motion.button>
              )}
            </div>

            <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-4 pb-20">
              {(state.classTypes || []).map((item, idx) => (
                <motion.div
                  key={`classes-type-${item.id}-${idx}`}
                  variants={athleteItemVariants}
                  onClick={isOwner ? () => onEditClass(item) : undefined}
                  className="p-4 bg-white dark:bg-slate-800/60 border border-slate-50 dark:border-slate-800 rounded-2xl flex items-center justify-between shadow-sm cursor-pointer hover:border-blue-200 dark:hover:border-blue-900 transition-colors"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm italic shrink-0 bg-[#eff6ff] dark:bg-blue-900/30 text-[#1e4da1] dark:text-blue-400">
                      <Settings2 size={20} />
                    </div>
                    <div className="">
                      <p className="text-sm font-black text-[#1a1a1a] dark:text-slate-100 uppercase italic">{item.name}</p>
                      <p className="text-[8px] text-[#94a3b8] font-bold uppercase">R{item.price}</p>
                    </div>
                  </div>
                  {isOwner && (
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={(e) => { e.stopPropagation(); onRemoveClass(item.id); }} aria-label="Remove Class" className="p-2.5 bg-slate-50 dark:bg-slate-700 rounded-lg text-[#94a3b8] hover:text-red-500 active:scale-90"><Trash2 size={14} /></button>
                    </div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-1">
              <div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => onEntityTypeChange('athletes')}
                    className={`text-xl sm:text-2xl font-black uppercase italic transition-colors ${entityType === 'athletes' ? 'text-[#1a1a1a] dark:text-slate-100 underline decoration-[#1e4da1] underline-offset-4' : 'text-slate-300 dark:text-slate-700 hover:text-slate-500'}`}
                  >
                    Tumbling Students
                  </button>
                  <span className="text-slate-300 dark:text-slate-700 font-bold">•</span>
                  <button
                    type="button"
                    onClick={() => onEntityTypeChange('gyms')}
                    className={`text-xl sm:text-2xl font-black uppercase italic transition-colors ${entityType === 'gyms' ? 'text-[#1e4da1] dark:text-blue-400 underline decoration-[#1e4da1] underline-offset-4' : 'text-slate-300 dark:text-slate-700 hover:text-slate-500'}`}
                  >
                    External Gym Orgs
                  </button>
                  <span className="text-slate-300 dark:text-slate-700 font-bold">•</span>
                  <button
                    type="button"
                    onClick={() => onEntityTypeChange('teams')}
                    className={`text-xl sm:text-2xl font-black uppercase italic transition-colors ${entityType === 'teams' ? 'text-blue-600 dark:text-blue-500 underline decoration-blue-600 underline-offset-4' : 'text-slate-300 dark:text-slate-700 hover:text-slate-500'}`}
                  >
                    Cheer Teams
                  </button>
                </div>
                <p className="text-[9px] font-black uppercase text-[#94a3b8] mt-1">
                  {entityType === 'athletes' 
                    ? 'JFlips internal student records & tumbling roster'
                    : entityType === 'gyms'
                    ? 'Partner gyms, clubs & schools coached outside JFlips'
                    : 'All-Star cheerleading squads & team rosters'}
                </p>
              </div>
              {isOwner && (
                <motion.button
                  whileTap={{ scale: 0.8 }}
                  onClick={entityType === 'athletes' ? onAddStudent : () => onAddGym(entityType === 'teams' ? 'cheer' : 'tumbling')}
                  className={`w-10 h-10 ${(entityType === 'gyms' || entityType === 'teams') ? 'bg-blue-600' : 'bg-[#1e4da1]'} text-white rounded-xl flex items-center justify-center shadow-lg shrink-0 self-end sm:self-auto`}
                >
                  <Plus size={20} strokeWidth={3} />
                </motion.button>
              )}
            </div>

            {activeTab === 'students' && (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]" size={16} />
                  <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-white dark:bg-slate-800 border-none rounded-xl py-3 pl-11 pr-4 text-xs font-bold shadow-sm outline-none dark:text-slate-200" />
                </div>
                
                <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-[10px] font-black uppercase text-[#1a1a1a] dark:text-slate-100 italic tracking-wider">Export Roster Data</h4>
                      <p className="text-[8px] font-bold text-slate-400 uppercase">Download {entityType === 'athletes' ? 'Athletes (Tumbling)' : entityType === 'teams' ? 'Cheer Team' : 'All'} roster data to text or Excel format</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => downloadRosterAsTxt(entityType === 'athletes' ? 'athletes' : entityType === 'teams' ? 'cheer' : 'all')}
                      className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[#1a1a1a] dark:text-slate-200 rounded-xl text-[9px] font-black uppercase tracking-wider shadow-sm border border-slate-150 dark:border-slate-750 transition-all active:scale-95"
                    >
                      <Download size={11} className="text-slate-500" />
                      Download TXT
                    </button>
                    <button
                      onClick={() => downloadRosterAsCsv(entityType === 'athletes' ? 'athletes' : entityType === 'teams' ? 'cheer' : 'all')}
                      className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 px-3 py-2.5 bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 rounded-xl text-[9px] font-black uppercase tracking-wider shadow-sm border border-emerald-100/50 dark:border-emerald-900/30 transition-all active:scale-95"
                    >
                      <FileSpreadsheet size={11} className="text-emerald-500" />
                      Download Excel (CSV)
                    </button>
                  </div>
                </div>
              </div>
            )}

            <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-4 pb-20">
              {entityType === 'teams' || entityType === 'gyms' ? (
                ((entityType === 'teams' ? filteredTeams : filteredGyms) as any[]).map((parent, idx) => (
                  <div key={`${entityType}-parent-${parent.id}-${idx}`} className="space-y-2">
                    <motion.div
                      variants={athleteItemVariants}
                      onClick={() => onEditGym(parent)}
                      className="p-4 bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-between shadow-sm cursor-pointer hover:border-blue-200 dark:hover:border-blue-900 transition-colors"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className={`w-10 h-10 text-white rounded-xl flex items-center justify-center font-black text-sm italic shrink-0 ${entityType === 'teams' ? 'bg-blue-600' : 'bg-[#1e4da1]'}`}>
                          {entityType === 'teams' ? <Building size={20} /> : <Building2 size={20} />}
                        </div>
                        <div className="">
                          <p className="text-sm font-black text-[#1a1a1a] dark:text-slate-100 uppercase italic">{parent.name}</p>
                          <p className="text-[8px] text-slate-400 font-bold uppercase">{entityType === 'teams' ? 'Main Organization / School' : 'Main Gym'}</p>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-slate-300" />
                    </motion.div>
                    
                    <div className="ml-6 space-y-2 border-l-2 border-slate-100 dark:border-slate-800 pl-4">
                      {(entityType === 'teams' ? parent.subTeams : parent.subClasses).map((sub: any, sIdx: number) => (
                        <motion.div
                          key={`${entityType}-sub-${sub.id}-${sIdx}`}
                          variants={athleteItemVariants}
                          onClick={() => onEditGym(sub)}
                          className="p-3 bg-white/50 dark:bg-slate-800/30 border border-slate-50 dark:border-slate-800/50 rounded-xl flex items-center justify-between shadow-sm cursor-pointer hover:border-blue-200 dark:hover:border-blue-900 transition-colors"
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs italic shrink-0 ${entityType === 'teams' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600' : 'bg-[#eff6ff] dark:bg-blue-900/30 text-[#1e4da1]'}`}>
                               {entityType === 'teams' ? <Trophy size={14} /> : <Dumbbell size={14} />}
                            </div>
                            <div className="">
                              <p className="text-xs font-black text-[#1a1a1a] dark:text-slate-100 uppercase italic">{sub.name}</p>
                              <p className="text-[7px] text-slate-400 font-bold uppercase">R{sub.pay_amount}/hr {entityType === 'teams' && `• R${sub.competition_rate || 0} Comp`}</p>
                            </div>
                          </div>
                          <ChevronRight size={14} className="text-slate-300" />
                        </motion.div>
                      ))}
                      <button 
                        onClick={() => onAddGym(entityType === 'teams' ? 'cheer' : 'tumbling', parent.id)}
                        className="w-full p-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-[8px] font-black text-slate-400 uppercase hover:text-blue-500 hover:border-blue-200 transition-all"
                      >
                        + Add {entityType === 'teams' ? 'Sub-Team' : 'Class'} to {parent.name}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                (filteredAthletes || []).map((item, idx) => (
                  <motion.div
                    key={`entity-list-athletes-${item.id}-${idx}`}
                    variants={athleteItemVariants}
                    onClick={() => onEditStudent(item as Student)}
                    className="p-4 bg-white dark:bg-slate-800/60 border border-slate-50 dark:border-slate-800 rounded-2xl flex items-center justify-between shadow-sm cursor-pointer hover:border-blue-200 dark:hover:border-blue-900 transition-colors"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm italic shrink-0 bg-[#eff6ff] dark:bg-blue-900/30 text-[#1e4da1] dark:text-blue-400">
                        {isStudentLinked(item as Student) ? <Users size={16} /> : item.name.charAt(0)}
                      </div>
                      <div className="">
                        <p className="text-sm font-black text-[#1a1a1a] dark:text-slate-100 uppercase italic">{item.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => onEditStudent(item as Student)}
                        className="p-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl transition-all text-slate-400"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          </div>
        )}
      </div>
      {showSimulator && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[500] flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl relative flex flex-col h-[85vh] max-h-[720px]">
            {/* Phone notch mockup / header */}
            <div className="bg-[#0f172a] p-3 text-center border-b border-slate-800 flex items-center justify-between px-6 shrink-0">
              <div className="text-[10px] text-slate-400 font-bold font-mono">12:00</div>
              <div className="w-20 h-4 bg-black rounded-lg mx-auto"></div>
              <button 
                onClick={() => setShowSimulator(false)}
                className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-850 hover:bg-slate-800 px-3 py-1 rounded-full cursor-pointer transition-all border border-slate-800"
              >
                Close
              </button>
            </div>
            
            {/* Actual dynamic simulated iframe */}
            <div className="flex-1 bg-white relative">
              <iframe 
                src={onboardingUrl} 
                title="Google AIS Studio JFLIPS Parent Sign Up Simulator Preview Frame"
                className="w-full h-full border-none"
              />
            </div>
          </div>
        </div>
      )}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`fixed bottom-6 right-6 z-[600] p-4 rounded-2xl shadow-xl flex items-center gap-2.5 border text-[10px] font-black uppercase tracking-wider ${
              toast.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-slate-900/95 dark:text-emerald-400 dark:border-emerald-900/40'
                : toast.type === 'error'
                ? 'bg-red-50 text-red-800 border-red-200 dark:bg-slate-900/95 dark:text-red-400 dark:border-red-900/40'
                : 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-slate-900/95 dark:text-blue-400 dark:border-blue-900/40'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 size={14} className="text-emerald-500" />
            ) : (
              <AlertCircle size={14} className={toast.type === 'error' ? "text-red-500" : "text-blue-500"} />
            )}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

RosterView.displayName = 'RosterView';
