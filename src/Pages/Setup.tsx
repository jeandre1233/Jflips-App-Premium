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
  Download
} from 'lucide-react';
import { 
  AppState, 
  Profile, 
  Student, 
  Gym, 
  ClassType, 
  ClassSchedule, 
  Staff 
} from '../../types';
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

export const RosterView = memo(({ state, activeTab, onTabChange, entityType, onEntityTypeChange, onUpdateProfile, onAddStudent, onEditStudent, onRemoveStudent, onAddGym, onEditGym, onRemoveGym, onAddClass, onEditClass, onRemoveClass, isStudentLinked, onAddSchedule, onEditSchedule, onRemoveSchedule, onLogout, onAddStaff, onEditStaff, onRemoveStaff }: {
  state: AppState,
  activeTab: 'students' | 'classes' | 'schedule' | 'profile' | 'staff',
  onTabChange: (tab: 'students' | 'classes' | 'schedule' | 'profile' | 'staff') => void,
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
  onAddStaff?: () => void,
  onEditStaff?: (s: Staff) => void,
  onRemoveStaff?: (id: string) => void
}) => {
  const [search, setSearch] = useState('');
  const [profileForm, setProfileForm] = useState<Profile>(state.profile);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isOwner = state.profile.role === 'owner';

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
            <div className="flex items-center gap-3 mb-4">{profileForm.logo ? <img src={profileForm.logo} alt="Logo" className="w-16 h-16 rounded-2xl object-cover border-2 shadow-sm" /> : <div className="w-16 h-16 bg-[#1e4da1] rounded-2xl flex items-center justify-center text-white italic font-black text-xl">JF</div>}<div><h2 className="text-xl font-black text-[#1a1a1a] dark:text-slate-100 uppercase italic">Coach Profile</h2><p className="text-[8px] font-black text-[#94a3b8] uppercase">Details & Logo</p></div></div>
            <form onSubmit={handleProfileSubmit} className="space-y-4 bg-white dark:bg-slate-800/60 p-6 rounded-3xl border border-slate-50 dark:border-slate-800 shadow-sm">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center gap-2 cursor-pointer" onClick={() => fileInputRef.current?.click()}>{profileForm.logo ? <div className="relative"><img src={profileForm.logo} alt="Logo" className="h-24 w-auto object-contain rounded-lg" /><button type="button" onClick={(e) => { e.stopPropagation(); setProfileForm({ ...profileForm, logo: '' }); }} className="absolute -top-2 -right-2 bg-white dark:bg-slate-800 text-red-500 rounded-full p-1 shadow-md"><X size={12} /></button></div> : <div className="flex flex-col items-center py-2"><Upload size={20} className="text-slate-300 mb-1" /><span className="text-[9px] font-black text-slate-400 uppercase">Logo Upload</span></div>}<input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" /></div>
              <input placeholder="BUSINESS NAME" value={profileForm.businessName} onChange={e => setProfileForm({ ...profileForm, businessName: e.target.value })} className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl font-black uppercase text-[10px] outline-none dark:text-slate-200" />
              
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
              <motion.button whileTap={{ scale: 0.95 }} type="submit" className="w-full bg-[#1e4da1] dark:bg-blue-600 text-white py-4 mt-4 rounded-xl font-black text-[10px] uppercase shadow-xl flex items-center justify-center gap-2">Save <CheckCircle2 size={16} /></motion.button>
              <div className="h-px bg-slate-100 dark:bg-slate-800 my-4"></div>
              <motion.button whileTap={{ scale: 0.95 }} type="button" onClick={onLogout} className="w-full bg-slate-50 dark:bg-slate-800/50 text-[#94a3b8] py-4 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2">Log Out <LogOut size={16} /></motion.button>
            </form>

            <div className="bg-white dark:bg-slate-800/60 p-6 rounded-3xl border border-slate-50 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase italic">Discord Webhook Integration</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${discordEnabled ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'}`}>
                      {discordEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5 leading-relaxed">Configure automated Discord messaging alerts for student signups, schedulers, and monthly billings.</p>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleDiscord(!discordEnabled)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${discordEnabled ? 'bg-[#1e4da1] dark:bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${discordEnabled ? 'translate-x-5' : 'translate-x-0'}`}
                  />
                </button>
              </div>

              {!discordEnabled && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 p-3 rounded-xl text-[9px] font-bold text-amber-800 dark:text-amber-300">
                  🚫 Discord notifications are currently <strong>disabled</strong>. No webhook alerts will be sent for signups or billing cycles.
                </div>
              )}
              
              <form onSubmit={handleSaveDiscordWebhook} className="space-y-3">
                <input 
                  type="text" 
                  placeholder="DISCORD WEBHOOK URL" 
                  value={discordWebhookInput} 
                  onChange={e => setDiscordWebhookInput(e.target.value)} 
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl font-black text-[10px] outline-none dark:text-slate-200" 
                />
                
                <div className="grid grid-cols-2 gap-3">
                  <motion.button 
                    whileTap={{ scale: 0.95 }} 
                    type="submit" 
                    className="w-full bg-[#1e4da1] dark:bg-blue-600 text-white py-3.5 px-2 rounded-xl font-black text-[8px] uppercase flex items-center justify-center gap-2"
                  >
                    Save Settings <Check size={14} />
                  </motion.button>
                  
                  <motion.button 
                    whileTap={{ scale: 0.95 }} 
                    type="button" 
                    onClick={handleTestDiscordWebhook}
                    disabled={!discordWebhookInput || testStatus === 'sending'}
                    className="w-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 py-3.5 px-2 rounded-xl font-black text-[8px] uppercase flex items-center justify-center gap-2 border border-emerald-100/50 dark:border-emerald-900/20 disabled:opacity-50"
                  >
                    {testStatus === 'sending' ? 'Sending...' : testStatus === 'success' ? 'Success!' : testStatus === 'error' ? 'Failed' : 'Send Test Msg'} 
                    <Bell size={14} />
                  </motion.button>
                </div>
              </form>
            </div>

            {/* Google Workspace Integration */}
            <div className="bg-white dark:bg-slate-800/60 p-6 rounded-3xl border border-slate-50 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase italic flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full inline-block ${googleUser ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                    Google Workspace
                  </h3>
                  <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5 leading-relaxed">
                    Automate Finances on Sheets and sync lesson schedules to Calendar.
                  </p>
                </div>
                {googleUser && (
                  <span className="text-[7px] font-black uppercase text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded">
                    Connected
                  </span>
                )}
              </div>

              {!googleUser ? (
                <div className="space-y-3">
                  <p className="text-[9px] text-slate-500 font-bold">Connect your Google account with Sheets and Calendar permissions to enable automation triggers.</p>
                  <motion.button 
                    whileTap={{ scale: 0.95 }} 
                    type="button" 
                    onClick={handleGoogleSignIn}
                    className="w-full flex items-center justify-center gap-3 bg-slate-900 dark:bg-slate-700 text-white py-3.5 px-4 rounded-xl font-black text-[9px] uppercase tracking-wider shadow-md hover:bg-slate-800 transition-colors"
                  >
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4 shrink-0">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    </svg>
                    Sign in with Google
                  </motion.button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Account detail */}
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/20 rounded-xl border border-slate-100 dark:border-slate-800/40">
                    <div className="flex items-center gap-2">
                      {googleUser.photoURL ? (
                        <img src={googleUser.photoURL} alt="Avatar" className="w-6 h-6 rounded-full" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-[#1e4da1] text-white flex items-center justify-center font-bold text-[8px]">
                          G
                        </div>
                      )}
                      <div>
                        <p className="text-[9px] font-black text-slate-800 dark:text-slate-200 leading-none">{googleUser.displayName || 'Google Account'}</p>
                        <p className="text-[7px] text-slate-400 font-bold lowercase truncate mt-0.5 max-w-[130px]">{googleUser.email}</p>
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={handleGoogleSignOut}
                      className="text-[7px] font-black uppercase text-red-500 hover:text-red-600 transition-colors cursor-pointer"
                    >
                      Disconnect
                    </button>
                  </div>

                  {/* Sheets Config */}
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/20 rounded-xl border border-slate-100 dark:border-slate-800/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-black uppercase text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                        <FileSpreadsheet size={12} className="text-emerald-500" />
                        Google Sheets Sync
                      </span>
                      <input 
                        type="checkbox" 
                        checked={googleSheetsSyncEnabled} 
                        onChange={(e) => {
                          const val = e.target.checked;
                          setGoogleSheetsSyncEnabled(val);
                          localStorage.setItem('google_sheets_sync_enabled', val ? 'true' : 'false');
                        }}
                        className="rounded accent-emerald-500 focus:ring-0 cursor-pointer" 
                      />
                    </div>
                    <p className="text-[7px] text-slate-400 font-bold leading-normal">
                      Export end-of-month finances on invoice archive automatically.
                    </p>
                    {spreadsheetId && (
                      <a 
                        href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-[7px] font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1 truncate max-w-full italic transition-all block"
                      >
                        Open Linked Google Sheet &rarr;
                      </a>
                    )}
                    <motion.button 
                      whileTap={{ scale: 0.98 }} 
                      type="button" 
                      onClick={syncSheetsFinances}
                      disabled={isSyncing}
                      className="w-full mt-2 py-3 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-[8px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-200 flex items-center justify-center gap-2 shadow-sm shrink-0 disabled:opacity-50"
                    >
                      {isSyncing ? 'Synchronizing...' : 'Refresh Financials Sheet'}
                      <FileSpreadsheet size={14} className="text-emerald-500 shrink-0" />
                    </motion.button>
                  </div>

                  {/* Calendar Config */}
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/20 rounded-xl border border-slate-100 dark:border-slate-800/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-black uppercase text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                        <Calendar size={12} className="text-[#1e4da1]" />
                        Google Calendar Sync
                      </span>
                      <input 
                        type="checkbox" 
                        checked={googleCalendarSyncEnabled} 
                        onChange={(e) => {
                          const val = e.target.checked;
                          setGoogleCalendarSyncEnabled(val);
                          localStorage.setItem('google_calendar_sync_enabled', val ? 'true' : 'false');
                        }}
                        className="rounded accent-[#1e4da1] focus:ring-0 cursor-pointer" 
                      />
                    </div>
                    <p className="text-[7px] text-slate-400 font-bold leading-normal">
                      Automatically synchronize lesson timings with your primary Google Calendar schedules.
                    </p>
                    {calendarId && (
                      <a 
                        href={`https://calendar.google.com/calendar/r?cid=${calendarId}`} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-[7px] font-black text-[#1e4da1] dark:text-blue-400 flex items-center gap-1 mt-1 truncate max-w-full italic transition-all block"
                      >
                        Open Connected Google Calendar &rarr;
                      </a>
                    )}
                    <motion.button 
                      whileTap={{ scale: 0.98 }} 
                      type="button" 
                      onClick={syncSchedules}
                      disabled={isSyncing}
                      className="w-full mt-2 py-3 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-[8px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-200 flex items-center justify-center gap-2 shadow-sm shrink-0 disabled:opacity-50"
                    >
                      {isSyncing ? 'Synchronizing...' : 'Sync schedules with calendar'}
                      <Calendar size={14} className="text-[#1e4da1] shrink-0" />
                    </motion.button>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-slate-800/60 p-6 rounded-3xl border border-slate-50 dark:border-slate-800 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase italic">Athlete Onboarding Link</h3>
                <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5 leading-relaxed">
                  Share this custom URL with new families to complete their child profile and indemnity form asynchronously.
                </p>
              </div>
              
              <div className="flex flex-col gap-3">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800/40 break-all text-[10px] font-bold text-slate-600 dark:text-slate-300 select-all font-mono leading-tight">
                  {onboardingUrl}
                </div>
                <div className="flex gap-2">
                  <motion.button 
                    whileTap={{ scale: 0.95 }} 
                    type="button" 
                    onClick={handleCopyLink}
                    className={`flex-1 py-3 px-2 rounded-xl font-black text-[9px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow ${
                      copiedLink
                        ? 'bg-emerald-500 text-white'
                        : 'bg-[#1e4da1] dark:bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {copiedLink ? 'Copied!' : 'Copy Link'}
                  </motion.button>
                  <motion.button 
                    whileTap={{ scale: 0.95 }} 
                    type="button" 
                    onClick={() => setShowSimulator(true)}
                    className="flex-1 py-3 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow border border-slate-200 dark:border-slate-700"
                  >
                    Test Link
                  </motion.button>
                </div>
              </div>

              {/* Scan this link preview & diagnostics */}
              <div className="p-4 bg-slate-50/50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-4 flex flex-col items-center justify-center">
                <div className="flex flex-col items-center text-center w-full">
                  <div className="p-2.5 bg-white rounded-2xl inline-block shadow-sm border border-slate-150">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&dpi=300&data=${encodeURIComponent(onboardingUrl)}`} 
                      alt="Onboarding Link QR" 
                      width={140}
                      height={140} 
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      className="rounded-lg object-contain block"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <p className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider mt-3">
                    Scan this link for the preview
                  </p>
                  <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-1 leading-normal max-w-[200px]">
                    Point your camera at the QR code to open the signup page
                  </p>
                </div>

                <div className="w-full pt-3 border-t border-slate-200/50 dark:border-slate-800/40 space-y-2">
                  <div className="flex items-center justify-between text-[8px] font-black uppercase text-slate-400 dark:text-slate-500">
                    <span>Link Status</span>
                    <span className={state.profile?.id ? "text-emerald-500" : "text-amber-500"}>
                      ● {state.profile?.id ? "Configured" : "Missing Owner ID"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[8px] font-black uppercase text-slate-400 dark:text-slate-500">
                    <span>Active Public Classes</span>
                    <span className="text-[#1e4da1] dark:text-blue-400">
                      {state.classTypes?.filter(ct => ct.allow_signup !== false).length || 0} Listed
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-center text-slate-400 dark:text-slate-500">
              <span className="text-[20px] font-black italic text-[#1e4da1] dark:text-blue-400">JFLIPS</span>
              <p className="text-[8px] font-black uppercase tracking-[0.2em] mt-0.5">Professional Edition • v1.4.2</p>
            </div>
          </div>
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
        ) : activeTab === 'staff' ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-2xl font-black text-[#1a1a1a] dark:text-slate-100 uppercase italic">Coaches</h2>
                <p className="text-[8px] font-black text-[#94a3b8] uppercase">Staff Access</p>
              </div>
              {isOwner && onAddStaff && (
                <motion.button whileTap={{ scale: 0.8 }} onClick={onAddStaff} className="w-10 h-10 bg-[#1e4da1] text-white rounded-xl flex items-center justify-center shadow-lg">
                  <Plus size={20} strokeWidth={3} />
                </motion.button>
              )}
            </div>
            <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-3 pb-20">
              {(!state.staff || state.staff.length === 0) ? (
                <div className="py-12 bg-white dark:bg-slate-850 border border-slate-100 rounded-3xl text-center"><p className="text-slate-400 text-[10px] font-black uppercase">No Staff Registered</p></div>
              ) : state.staff.map((item, idx) => (
                <motion.div key={`staff-${item.id}-${idx}`} variants={athleteItemVariants} onClick={isOwner && onEditStaff ? () => onEditStaff(item) : undefined} className={`p-4 bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-between shadow-sm ${isOwner && onEditStaff ? 'cursor-pointer hover:border-blue-100/50' : ''}`}>
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm italic shrink-0 bg-[#eff6ff] dark:bg-blue-900/30 text-[#1e4da1] dark:text-blue-400">
                      {item.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-black text-[#1a1a1a] dark:text-slate-100 uppercase italic">{item.name}</p>
                        {item.is_owner && <span className="bg-[#eff6ff] dark:bg-blue-950 text-[#1e4da1] text-[6px] font-black px-1 py-0.5 rounded uppercase tracking-wider shrink-0">Owner</span>}
                      </div>
                      <p className="text-[8px] text-slate-400 font-bold uppercase">{item.email} • R{item.pay_rate || 0}/hr{item.password ? ` • Password: ${item.password}` : ''}</p>
                    </div>
                  </div>
                  {isOwner && onEditStaff && <ChevronRight size={18} className="text-slate-300" />}
                </motion.div>
              ))}
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
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center gap-3">
                <h2
                  onClick={() => onEntityTypeChange('athletes')}
                  className={`text-2xl font-black uppercase italic cursor-pointer transition-colors ${entityType === 'athletes' ? 'text-[#1a1a1a] dark:text-slate-100' : 'text-slate-300 dark:text-slate-700'}`}
                >
                  Athletes
                </h2>
                <h2
                  onClick={() => onEntityTypeChange('gyms')}
                  className={`text-2xl font-black uppercase italic cursor-pointer transition-colors ${entityType === 'gyms' ? 'text-[#1e4da1] dark:text-blue-400' : 'text-slate-300 dark:text-slate-700'}`}
                >
                  Gyms
                </h2>
                <h2
                  onClick={() => onEntityTypeChange('teams')}
                  className={`text-2xl font-black uppercase italic cursor-pointer transition-colors ${entityType === 'teams' ? 'text-blue-600 dark:text-blue-500' : 'text-slate-300 dark:text-slate-700'}`}
                >
                  Teams
                </h2>
              </div>
              <motion.button
                whileTap={{ scale: 0.8 }}
                onClick={entityType === 'athletes' ? onAddStudent : () => onAddGym(entityType === 'teams' ? 'cheer' : 'tumbling')}
                className={`w-10 h-10 ${(entityType === 'gyms' || entityType === 'teams') ? 'bg-blue-600' : 'bg-[#1e4da1]'} text-white rounded-xl flex items-center justify-center shadow-lg`}
              >
                <Plus size={20} strokeWidth={3} />
              </motion.button>
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
