
import React, { useState, useEffect, useMemo, useRef, useCallback, memo, useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  BarChart, 
  Bar,
  Cell
} from 'recharts';
import {
  ClipboardCheck,
  Users,
  User,
  FileText,
  LayoutDashboard,
  Plus,
  X,
  Trash2,
  Pencil,
  ChevronRight,
  Download,
  RotateCcw,
  History,
  Settings2,
  Calendar,
  CreditCard,
  CheckCircle2,
  Check,
  Search,
  MessageSquare,
  ZoomIn,
  ZoomOut,
  BarChart3,
  UserCircle,
  UserCheck,
  Upload,
  Loader2,
  AlertTriangle,
  Settings,
  Moon,
  Sun,
  Database,
  CloudUpload,
  RefreshCw,
  LogOut,
  Mail,
  Lock,
  ArrowRight,
  Terminal,
  Bell,
  BellOff,
  Wallet,
  Clock,
  ShieldAlert,
  Key,
  Building2,
  RotateCcw as RevertIcon,
  CheckCircle,
  Trophy,
  Award,
  Zap,
  Star,
  Phone,
  Dumbbell,
  FileSpreadsheet,
  Flashlight,
  ZapOff,
  MapPin,
  BookOpen,
  Building,
  Globe,
  Link
} from 'lucide-react';
import { View, Student, Gym, ClassType, AttendanceSession, AppState, HistoryMonth, Profile, Payment, ClassSchedule, InvoiceSnapshot, AppNotification, Competition, getStudentSessionPrice, StaffProfile, OwnerProfile } from './types';
import { toPng } from 'html-to-image';
import { supabase, isSupabaseConfigured } from './supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import * as XLSX from 'xlsx';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

interface NativeNotificationPlugin {
  showTestNotification(options: { title: string; message: string }): Promise<{ status: string }>;
}

const NativeNotification = registerPlugin<NativeNotificationPlugin>('NativeNotification');

import { useNetworkStatus } from './src/hooks/useNetworkStatus';
import ShareSignupLink from './src/components/ShareSignupLink';
import { QuickLogModal } from './src/components/QuickLogModal';
import { addToQueue, getPendingItems, updateItemStatus, deleteSyncedItems } from './src/utils/offlineQueue';
import { OfflineBanner } from './src/components/OfflineBanner';
import { SyncStatusBadge } from './src/components/SyncStatusBadge';
import { sendWhatsAppAttendanceQuery, sendWhatsAppInvoiceReminder } from './src/utils/whatsapp';
import { sendCycleMonthReminderNotification, getDiscordWebhookUrl, setDiscordWebhookUrl } from './src/utils/discordNotifications';
import { 
  initAuth as initGoogleAuth, 
  googleSignIn, 
  logoutGoogle, 
  getAccessToken, 
  getSavedSpreadsheetId, 
  getSavedCalendarId, 
  syncSchedulesToCalendar, 
  syncFinancesToGoogleSheet 
} from './src/utils/googleWorkspace';

import { DashboardView } from './src/Pages/Dashboard';
import { RosterView } from './src/Pages/Setup';

export function getSessionBillingMonth(dateStr: string, billingDay: number = 1): { monthName: string, year: number } {
  const d = new Date(dateStr);
  const month = d.getMonth();
  const year = d.getFullYear();
  return { monthName: MONTHS[month], year };
}

async function generateIndemnityPDFFromStudent(student: Student) {
  if (!(window as any).jspdf) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load jsPDF'));
      document.head.appendChild(script);
    });
  }

  const { jsPDF } = (window as any).jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = 210;
  const margin = 20;
  const contentW = pageW - margin * 2;
  let y = 20;

  const rgb = (hex: string): [number, number, number] => [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];

  // Header bar
  doc.setFillColor(30, 77, 161);
  doc.rect(0, 0, pageW, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18); doc.setFont('helvetica', 'bolditalic');
  doc.text('JFLIPS', margin, 17);
  doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  doc.text('STUNTING & TUMBLING', margin + 28, 17);
  doc.setFontSize(9);
  doc.text('INDEMNITY & MEDICAL DECLARATION', pageW - margin, 17, { align: 'right' });
  y = 38;

  // Title
  doc.setTextColor(...rgb('#1e4da1'));
  doc.setFontSize(13); doc.setFont('helvetica', 'bold');
  doc.text('INDEMNITY & MEDICAL DECLARATION', margin, y);
  doc.setDrawColor(30, 77, 161); doc.setLineWidth(0.5);
  doc.line(margin, y + 3, pageW - margin, y + 3);
  y += 12;

  // Indemnity body text
  const studentName = student.name;
  doc.setTextColor(...rgb('#1e293b'));
  doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  const bodyText = `I, ${student.parent1_name || '___________________'}, Parent/Legal Guardian of the enrolled student ${studentName || '___________________'}, hereby indemnify and confirm that my child is physically, medically and mentally fit to become a member of JFLIPS TUMBLING and to participate in the sport of tumbling. I hereby acknowledge the possibility of injury occurring whilst doing tumbling.`;
  const bodyLines = doc.splitTextToSize(bodyText, contentW);
  doc.text(bodyLines, margin, y);
  y += bodyLines.length * 6 + 6;

  // Medical notes heading
  doc.setFont('helvetica', 'bold');
  const medLabel = 'Please list any physical disabilities, history of illness, or allergies the enrolled child has which we should be aware of (e.g. previous fractures, muscle tone, asthma, etc.):';
  const medLabelLines = doc.splitTextToSize(medLabel, contentW);
  doc.text(medLabelLines, margin, y);
  y += medLabelLines.length * 6 + 6;

  // Medical notes box
  doc.setDrawColor(...rgb('#e2e8f0')); doc.setLineWidth(0.4);
  doc.rect(margin, y, contentW, 20);
  doc.setFont('helvetica', 'normal'); doc.setTextColor(...rgb('#1e293b'));
  const medText = student.medical_notes?.trim() || 'None';
  doc.text(doc.splitTextToSize(medText, contentW - 6), margin + 3, y + 7);
  y += 28;

  // Divider
  doc.setDrawColor(...rgb('#e2e8f0')); doc.line(margin, y, pageW - margin, y); y += 8;

  // Student details section
  doc.setFillColor(248, 250, 252); doc.rect(margin, y, contentW, 6, 'F');
  doc.setTextColor(...rgb('#1e4da1')); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.text('STUDENT DETAILS', margin + 3, y + 4.5); y += 10;

  const studentFields = [
    ['Full Name', studentName || '—'],
    ['Date of Birth', student.dob || '—'],
    ['Age', student.age ? `${student.age} years` : '—'],
    ['Class Enrolled', student.class_name || '—'],
  ];
  doc.setFontSize(9); doc.setTextColor(...rgb('#475569'));
  studentFields.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold'); doc.text(`${label}:`, margin, y);
    doc.setFont('helvetica', 'normal'); doc.text(value, margin + 42, y);
    y += 7;
  });
  y += 4;

  // Parent details section
  doc.setFillColor(248, 250, 252); doc.rect(margin, y, contentW, 6, 'F');
  doc.setTextColor(...rgb('#1e4da1')); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.text('PARENT / GUARDIAN DETAILS', margin + 3, y + 4.5); y += 10;

  const parentFields = [
    ['Primary Parent', student.parent1_name || '—'],
    ['Phone', student.parent1_phone || '—'],
    ['Email', student.parent1_email || '—'],
    ['Secondary Parent', student.parent2_name || '—'],
    ['Secondary Phone', student.parent2_phone || '—'],
  ];
  parentFields.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold'); doc.text(`${label}:`, margin, y);
    doc.setFont('helvetica', 'normal'); doc.text(value, margin + 42, y);
    y += 7;
  });
  y += 12;

  // Signature section
  if (student.signature_data) {
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...rgb('#1e4da1'));
    doc.text('SIGNATURE OF PARENT / GUARDIAN', margin, y);
    y += 5;
    try {
      doc.addImage(student.signature_data, 'PNG', margin, y, 50, 20);
      y += 22;
    } catch (e) {
      doc.text('[Signature Image Error]', margin, y + 5);
      y += 10;
    }
    doc.setFontSize(8); doc.setTextColor(...rgb('#94a3b8'));
    doc.text(`Signed on: ${student.indemnity_date ? new Date(student.indemnity_date).toLocaleString() : new Date().toLocaleString()}`, margin, y);
  } else {
    doc.setFont('helvetica', 'italic'); doc.setTextColor(...rgb('#dc2626'));
    doc.text('No digital signature on record.', margin, y);
  }

  const fileName = `Indemnity_${studentName.replace(/\s+/g, '_')}.pdf`;
  if (Capacitor.isNativePlatform()) {
    const pdfBase64 = doc.output('datauristring');
    await saveAndShareFile(pdfBase64, fileName);
  } else {
    doc.save(fileName);
  }
}

async function saveAndShareFile(dataUrl: string, fileName: string) {
  if (Capacitor.isNativePlatform()) {
    try {
      const base64Data = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache,
      });

      await Share.share({
        title: fileName,
        text: `Sharing ${fileName}`,
        url: savedFile.uri,
        dialogTitle: `Share ${fileName}`,
      });
    } catch (e) {
      console.error('Native share failed', e);
      alert('Failed to share file on mobile.');
    }
  } else {
    const link = document.createElement('a');
    link.download = fileName;
    link.href = dataUrl;
    link.click();
  }
}

const THEME_KEY = 'jflips_theme_pref';

const getInitialTheme = (): 'light' | 'dark' => {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'light' || saved === 'dark') {
    return saved;
  }
  return 'dark'; // Always default to dark mode
};

const MAX_ROWS_PER_PAGE = 15;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const INITIAL_PROFILE: Profile = {
  businessName: 'JFLIPS',
  bankName: '',
  accountNumber: '',
  branchCode: '',
  accountType: 'Current',
  bizBankName: '',
  bizAccountNumber: '',
  bizBranchCode: '',
  bizAccountType: 'Current',
  logo: ''
};

const INITIAL_STATE: AppState = {
  students: [],
  gyms: [],
  classTypes: [
    { id: '1', name: 'Private Session', price: 300 },
    { id: '2', name: 'Group Class', price: 150 },
    { id: '3', name: 'Tumbling Intensive', price: 250 }
  ],
  sessions: [],
  history: [],
  payments: [],
  schedules: [],
  staff: [],
  competitions: [],
  profile: INITIAL_PROFILE,
  theme: getInitialTheme(),
  snapshots: [],
  notifications: [],
  pendingSyncCount: 0,
  cheerRegistrations: []
};

// --- ANIMATION VARIANTS ---

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
};

const athleteItemVariants: Variants = {
  hidden: { opacity: 0, x: -40 },
  show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 25 } }
};

const registerItemVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 400, damping: 22 } }
};

const invoiceItemVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 22 } }
};

// --- SPLASH SCREEN ---

const SplashScreen: React.FC<{ message?: string }> = ({ message = "Initializing Workspace" }) => {
  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-[#f8fafc] dark:bg-[#0f172a] transition-colors duration-700 overflow-hidden relative">
      <div className="absolute top-1/4 -left-20 w-64 h-64 bg-blue-500/5 dark:bg-blue-400/10 rounded-full blur-[80px] animate-[drift_20s_infinite_linear]"></div>
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-[#1e4da1]/5 dark:bg-indigo-500/10 rounded-full blur-[100px] animate-[drift_25s_infinite_linear_reverse]"></div>
      <div className="relative flex flex-col items-center">
        <div className="inline-flex items-center justify-center mb-12">
          <div className="overflow-visible pr-12">
            <h1 className="text-7xl font-[1000] italic text-[#1e4da1] dark:text-blue-500 tracking-tighter drop-shadow-2xl animate-[reveal-text_1.2s_cubic-bezier(0.77,0,0.175,1)_forwards] px-2">
              JFLIPS
            </h1>
          </div>
        </div>
        <div className="flex flex-col items-center gap-6 opacity-0 animate-[fade-in_0.8s_ease-out_1.2s_forwards]">
          <div className="w-32 h-[2px] bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden relative">
            <div className="absolute top-0 left-0 h-full bg-[#1e4da1] dark:bg-blue-400 rounded-full animate-[progress-scan_2s_infinite_ease-in-out]"></div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.4em] translate-y-2 animate-[slide-up-fade_1s_ease-out_forwards]">
              {message}
            </p>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes reveal-text {
          0% { clip-path: inset(0 100% 0 0); transform: translateX(-20px); filter: blur(10px); }
          100% { clip-path: inset(-20px -100px -20px -20px); transform: translateX(0); filter: blur(0); }
        }
        @keyframes fade-in { 0% { opacity: 0; } 100% { opacity: 1; } }
        @keyframes slide-up-fade { 0% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes progress-scan { 0% { left: -100%; width: 40%; } 50% { left: 30%; width: 60%; } 100% { left: 100%; width: 40%; } }
        @keyframes drift {
          0% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(30px, -50px) rotate(120deg); }
          66% { transform: translate(-20px, 20px) rotate(240deg); }
          100% { transform: translate(0, 0) rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

// --- APP COMPONENT ---

// ─── Desktop hook ────────────────────────────────────────────────────────────
const useIsDesktop = () => {
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 1024);
  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isDesktop;
};

// ─── Desktop Sidebar ──────────────────────────────────────────────────────────
const DesktopSidebar: React.FC<{
  activeView: View;
  onNav: (v: View) => void;
  collapsed: boolean;
  onToggle: () => void;
  theme: 'light' | 'dark';
  onSettings: () => void;
  onArchive: () => void;
  isSyncing: boolean;
  sessionCount: number;
  businessName: string;
}> = ({ activeView, onNav, collapsed, onToggle, theme, onSettings, onArchive, isSyncing, sessionCount, businessName }) => {
  const sidebarRef = useRef<HTMLElement>(null);
  const navItemsRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!sidebarRef.current) return;
    
    // Animate width with GSAP
    gsap.to(sidebarRef.current, {
      width: collapsed ? 68 : 220,
      duration: 0.6,
      ease: 'power4.inOut',
      overwrite: 'auto'
    });

    if (!collapsed) {
      // Staggered nav items entrance
      if (navItemsRef.current) {
        const items = navItemsRef.current.querySelectorAll('button');
        gsap.fromTo(items, 
          { x: -30, opacity: 0, scale: 0.9 },
          { x: 0, opacity: 1, scale: 1, duration: 0.5, stagger: 0.04, ease: 'back.out(1.7)', delay: 0.1 }
        );
      }
    }
  }, [collapsed]);

  const navItems = [
    { view: View.DASHBOARD,       icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { view: View.LOG_SESSION,     icon: <ClipboardCheck size={20} />,  label: 'Log Session' },
    { view: View.TEAM_MANAGEMENT, icon: <Settings size={20} />,          label: 'Management' },
    { view: View.INVOICES,        icon: <FileText size={20} />,        label: 'Invoices' },
    { view: View.HISTORY,         icon: <History size={20} />,         label: 'History' },
    { view: View.ROSTER,          icon: <Settings2 size={20} />,       label: 'Setup' },
  ];

  const isDark = theme === 'dark';

  return (
    <aside
      ref={sidebarRef}
      className={`
        relative flex flex-col h-screen sticky top-0 shrink-0 overflow-hidden z-40
        ${isDark ? 'bg-[#07090f] border-blue-900/30' : 'bg-[#1e3a6e] border-slate-200'}
        border-r shadow-2xl
      `}
      style={{ width: collapsed ? 68 : 220 }}
    >
      {/* Content wrapper */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Logo - Now the toggle */}
        <div 
          onClick={onToggle}
          className={`flex items-center gap-3 px-4 pt-7 pb-5 cursor-pointer hover:bg-white/5 transition-all active:scale-95 ${collapsed ? 'justify-center' : 'justify-between'}`}
        >
          {!collapsed ? (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col">
              <span className="text-2xl font-[1000] italic text-white tracking-tight leading-none">JFLIPS</span>
              <span className="text-[8px] font-bold tracking-[0.12em] uppercase text-blue-300 mt-0.5">{businessName || 'Stunting & Tumbling'}</span>
            </motion.div>
          ) : (
            <motion.span initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-xl font-[1000] italic text-white">J</motion.span>
          )}
        </div>

        {/* Sync pill */}
        {!collapsed && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="px-4 mb-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-900/40 rounded-full">
              <div className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-blue-300 animate-pulse' : 'bg-emerald-400'}`} />
              <span className="text-[9px] font-black uppercase tracking-widest text-blue-200">
                {isSyncing ? 'Syncing…' : `${sessionCount} Cloud Logs`}
              </span>
            </div>
          </motion.div>
        )}

        {/* Nav items */}
        <nav ref={navItemsRef} className="flex-1 flex flex-col gap-1 px-2 mt-1 overflow-y-auto no-scrollbar">
          {navItems.map(({ view, icon, label }, idx) => {
            const active = activeView === view;
            return (
              <button
                key={`${view}-${idx}`}
                onClick={() => onNav(view)}
                title={collapsed ? label : undefined}
                className={`
                  flex items-center gap-3 rounded-xl px-3 py-2.5 w-full text-left transition-all duration-150 group
                  ${active
                    ? 'bg-white/15 text-white shadow-sm'
                    : 'text-blue-200 hover:bg-white/10 hover:text-white'}
                `}
              >
                <span className="shrink-0">{icon}</span>
                {!collapsed && (
                  <span className="text-[11px] font-black uppercase tracking-widest">{label}</span>
                )}
                {active && !collapsed && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-300 shrink-0" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="px-2 pb-5 flex flex-col gap-1 mt-auto">
          <button
            onClick={onArchive}
            title={collapsed ? 'Archive Month' : undefined}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 w-full text-blue-300 hover:bg-white/10 hover:text-white transition-all"
          >
            <RotateCcw size={20} className="shrink-0" />
            {!collapsed && <span className="text-[11px] font-black uppercase tracking-widest">Archive</span>}
          </button>
          <button
            onClick={onSettings}
            title={collapsed ? 'Settings' : undefined}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 w-full text-blue-300 hover:bg-white/10 hover:text-white transition-all"
          >
            <Settings size={20} className="shrink-0" />
            {!collapsed && <span className="text-[11px] font-black uppercase tracking-widest">Settings</span>}
          </button>
        </div>
      </div>
    </aside>
  );
};

const handleLinkGoogle = async () => {
  try {
    const { error } = await supabase.auth.linkIdentity({
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
    if (error) {
      alert('Error linking Google account: ' + error.message);
    } else {
      alert('Google Account successfully linked! You can now log in using either method.');
    }
  } catch (err: any) {
    alert('Error linking Google account: ' + err.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────

const App: React.FC = () => {
  const { isOnline } = useNetworkStatus();
  const [activeView, setActiveView] = useState<View>(View.DASHBOARD);
  const isDesktop = useIsDesktop();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [pushToken, setPushToken] = useState<string | null>(null);

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
    
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('Service Worker registered', reg))
        .catch(err => console.error('Service Worker registration failed', err));
    }

    if (Capacitor.isNativePlatform()) {
      // Request and register push notifications
      PushNotifications.requestPermissions().then(result => {
        if (result.receive === 'granted') {
          PushNotifications.register();
        }
      }).catch(err => {
        console.error('Push notification permissions error:', err);
      });

      PushNotifications.addListener('registration', token => {
        console.log('Push registration success, token: ' + token.value);
        setPushToken(token.value);
      });

      PushNotifications.addListener('registrationError', error => {
        console.error('Push registration error: ' + error.error);
      });

      PushNotifications.addListener('pushNotificationReceived', notification => {
        console.log('Push notification received: ', notification);
      });

      PushNotifications.addListener('pushNotificationActionPerformed', notification => {
        console.log('Push notification action performed: ', notification);
      });
    }
  }, []);

  const requestNotificationPermission = async () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isAndroid = /Android/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    
    if (!('Notification' in window)) {
      if (isIOS) {
        alert("To enable notifications on iPhone:\n1. Tap the Share button (square with arrow)\n2. Tap 'Add to Home Screen'\n3. Open JFLIPS from your home screen\n4. Try enabling notifications again.");
      } else if (isAndroid) {
        if (!isStandalone) {
          alert("To enable notifications on Android:\n1. Open this page in Google Chrome\n2. Tap the three dots (menu)\n3. Tap 'Install app' or 'Add to Home Screen'\n4. Open JFLIPS from your home screen to enable alerts.");
        } else {
          alert("Notifications are not supported by this specific app wrapper or browser version. For the best experience, please use Google Chrome and 'Add to Home Screen'.");
        }
      } else {
        alert("Notifications are not supported on this browser or device. Please try using a modern browser like Chrome or Safari.");
      }
      return;
    }
    
    try {
      // Check if we are in an insecure context (Notification requires HTTPS)
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        alert("Notifications require a secure (HTTPS) connection. Please ensure you are accessing the app via its official URL.");
        return;
      }

      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === 'denied') {
        alert("Notification permission was denied. Please reset the permission in your browser settings to enable alerts.");
      } else if (permission === 'granted') {
        sendLocalNotification('Notifications Enabled', 'You will now receive updates for session logs and payments.');
      }
    } catch (err) {
      Notification.requestPermission((permission) => {
        setNotificationPermission(permission);
        if (permission === 'granted') {
          sendLocalNotification('Notifications Enabled', 'You will now receive updates for session logs and payments.');
        }
      });
    }
  };

  const [toast, setToast] = useState<{ title: string, body: string } | null>(null);

  const sendLocalNotification = (title: string, body: string, url: string = '/') => {
    // Always show in-app toast as fallback/complement
    setToast({ title, body });
    setTimeout(() => setToast(null), 5000);

    if (Capacitor.isNativePlatform()) {
      NativeNotification.showTestNotification({ title, message: body })
        .then(res => console.log('Native local notification sent successfully:', res))
        .catch(err => console.error('Failed to send native local notification:', err));
      return;
    }

    if (notificationPermission === 'granted') {
      // Try service worker notification first (works better on mobile)
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(title, {
            body,
            icon: 'https://cdn-icons-png.flaticon.com/512/3589/3589030.png',
            badge: 'https://cdn-icons-png.flaticon.com/512/3589/3589030.png',
            data: url,
            vibrate: [100, 50, 100],
          } as any);
        });
      } else {
        new Notification(title, { body, icon: 'https://cdn-icons-png.flaticon.com/512/3589/3589030.png' });
      }
    }
  };
  const [showAllLogs, setShowAllLogs] = useState(false);
  
  // showAllLogs is passed as a prop to DashboardView
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<string | null>(null);
  const [isResetConfirming, setIsResetConfirming] = useState(false);
  const [resetConfirmation, setResetConfirmation] = useState<{ familyId: string, label: string } | null>(null);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [archiveMonth, setArchiveMonth] = useState<string>(MONTHS[new Date().getMonth()]);
  const [archiveYear, setArchiveYear] = useState<number>(new Date().getFullYear());
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [selectedHistoryMonth, setSelectedHistoryMonth] = useState<HistoryMonth | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editingGym, setEditingGym] = useState<Gym | null>(null);
  const [editingClassType, setEditingClassType] = useState<ClassType | null>(null);
  const [editingSession, setEditingSession] = useState<AttendanceSession | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<ClassSchedule | null>(null);
  const [editingExtra, setEditingExtra] = useState<Partial<Student> | null>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkImportParentId, setBulkImportParentId] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [initialTeamIds, setInitialTeamIds] = useState<string[]>([]);
  const [initialDate, setInitialDate] = useState<string | null>(null);
  const [initialCoachId, setInitialCoachId] = useState<string | null>(null);
  const [initialAthleteIds, setInitialAthleteIds] = useState<string[]>([]);
  const [quickLogModalData, setQuickLogModalData] = useState<{ classIds: string[], date: string, coachId?: string, athleteIds?: string[] } | null>(null);
  const [rosterTab, setRosterTab] = useState<'students' | 'classes' | 'schedule' | 'staff' | 'profile'>('students');
  const [rosterEntityType, setRosterEntityType] = useState<'athletes' | 'gyms' | 'teams'>('athletes');
  const isOwner = state.profile.role === 'owner';

  // Save this device's push token against the logged-in user, so the
  // send-push-notification Edge Function knows where to deliver alerts.
  useEffect(() => {
    if (!user || !pushToken) return;
    supabase
      .from('device_tokens')
      .upsert(
        { user_id: user.id, fcm_token: pushToken, platform: 'android', updated_at: new Date().toISOString() },
        { onConflict: 'user_id,fcm_token' }
      )
      .then(({ error }) => {
        if (error) console.error('Failed to save push token:', error.message);
        else console.log('Push token saved for user', user.id);
      });
  }, [user, pushToken]);

  useEffect(() => {
    const checkInitialSession = async () => {
      try {
        const { error } = await supabase.auth.getSession();
        if (error) {
          console.warn('Initial session lookup error:', error);
          const errMsg = error.message ? error.message.toLowerCase() : '';
          if (
            errMsg.includes('refresh token') ||
            errMsg.includes('token not found') ||
            errMsg.includes('invalid grant') ||
            errMsg.includes('expired')
          ) {
            console.error('Detected active invalid refresh token on startup. Clean purging auth state...');
            await supabase.auth.signOut().catch(() => {});
            Object.keys(localStorage).forEach(key => {
              if (key.startsWith('sb-') && (key.endsWith('-auth-token') || key.includes('auth'))) {
                localStorage.removeItem(key);
              }
            });
            setUser(null);
            setIsAuthLoading(false);
          }
        }
      } catch (err) {
        console.error('Error during initial session verification check:', err);
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reasonStr = String(event?.reason?.message || event?.reason || '').toLowerCase();
      if (reasonStr.includes('refresh token') || reasonStr.includes('token not found') || reasonStr.includes('invalid grant')) {
        event.preventDefault();
        console.warn('Handled stale refresh token rejection.');
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-') && (key.endsWith('-auth-token') || key.includes('auth'))) {
            localStorage.removeItem(key);
          }
        });
      }
    };
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    checkInitialSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setUser(session.user);
        if (session.provider_token) {
          console.log('Intercepted Supabase Google provider_token:', session.provider_token);
          sessionStorage.setItem('google_access_token', session.provider_token);
          const metadata = session.user.user_metadata || {};
          sessionStorage.setItem('google_user_display_name', metadata.full_name || metadata.name || session.user.email?.split('@')[0] || 'Google Account');
          sessionStorage.setItem('google_user_email', session.user.email || '');
          sessionStorage.setItem('google_user_avatar', metadata.avatar_url || metadata.picture || '');
          window.dispatchEvent(new Event('google-auth-changed'));
        }
      } else {
        setUser(null);
      }

      if (event === 'INITIAL_SESSION') {
        setIsAuthLoading(false);
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed successfully');
      } else if (event === 'SIGNED_OUT') {
        sessionStorage.removeItem('google_access_token');
        sessionStorage.removeItem('google_user_display_name');
        sessionStorage.removeItem('google_user_email');
        sessionStorage.removeItem('google_user_avatar');
        window.dispatchEvent(new Event('google-auth-changed'));
      }
    });
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user?.id) loadCloudData(false);
  }, [user?.id]);

  useEffect(() => {
    if (state.theme === 'dark') {
      document.documentElement.classList.add('dark');
      try {
        StatusBar.setBackgroundColor({ color: '#07090f' }).catch(() => {});
        StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      } catch (e) {}
    } else {
      document.documentElement.classList.remove('dark');
      try {
        StatusBar.setBackgroundColor({ color: '#f8fafc' }).catch(() => {});
        StatusBar.setStyle({ style: Style.Light }).catch(() => {});
      } catch (e) {}
    }
  }, [state.theme]);



  const [coachStatus, setCoachStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);

  const loadCloudData = useCallback(async (silent = true) => {
    if (!user) return;
    if (!silent) setIsLoading(true);
    setIsSyncing(true);
    setDbError(null);
    setCoachStatus(null);

    try {
      // 1. Try fetching owner_profiles
      let { data: ownerP, error: ownerErr } = await supabase
        .from('owner_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      let isOwner = false;
      let targetUserId = user.id;
      let canViewTumbling = true;
      let assignedCheerOrgIds: string[] = [];
      let mappedProfile: Profile = { ...INITIAL_PROFILE, role: 'owner', id: user.id };
      let staffList: StaffProfile[] = [];

      if (ownerP) {
        isOwner = true;
        if (!ownerP.access_code) {
          const defaultKey = `JFLIPS-${Math.floor(1000 + Math.random() * 9000)}`;
          await supabase.from('owner_profiles').update({ access_code: defaultKey }).eq('id', user.id);
          ownerP.access_code = defaultKey;
        }

        const savedBizBank = localStorage.getItem(`jflips_biz_bankName_${user.id}`) || '';
        const savedBizAcc = localStorage.getItem(`jflips_biz_accountNumber_${user.id}`) || '';
        const savedBizBranch = localStorage.getItem(`jflips_biz_branchCode_${user.id}`) || '';
        const savedBizType = localStorage.getItem(`jflips_biz_accountType_${user.id}`) || 'Current';

        mappedProfile = {
          businessName: ownerP.business_name || INITIAL_PROFILE.businessName,
          bankName: ownerP.bank_name || INITIAL_PROFILE.bankName,
          accountNumber: ownerP.account_number || INITIAL_PROFILE.accountNumber,
          branchCode: ownerP.branch_code || INITIAL_PROFILE.branchCode,
          accountType: ownerP.account_type || INITIAL_PROFILE.accountType,
          bizBankName: ownerP.biz_bank_name || savedBizBank,
          bizAccountNumber: ownerP.biz_account_number || savedBizAcc,
          bizBranchCode: ownerP.biz_branch_code || savedBizBranch,
          bizAccountType: ownerP.biz_account_type || savedBizType,
          logo: ownerP.logo || INITIAL_PROFILE.logo,
          role: 'owner',
          access_code: ownerP.access_code,
          email: ownerP.email || user.email,
          id: user.id
        };

        // Fetch staff profiles for owner
        const { data: sData, error: sErr } = await supabase
          .from('staff_profiles')
          .select('*')
          .eq('owner_id', user.id);

        if (!sErr && sData) {
          staffList = sData.map(s => ({
            id: s.id,
            ownerId: s.owner_id,
            name: s.name,
            email: s.email,
            payRate: s.pay_rate,
            bankName: s.bank_name,
            accountNumber: s.account_number,
            branchCode: s.branch_code,
            accountType: s.account_type,
            status: s.status || 'pending',
            canViewTumbling: s.can_view_tumbling ?? false,
            assignedCheerOrgIds: s.assigned_cheer_org_ids || [],
            createdAt: s.created_at,
            approvedAt: s.approved_at
          }));
        }
      } else {
        // 2. Check staff_profiles
        let { data: staffP, error: staffErr } = await supabase
          .from('staff_profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (staffP) {
          if (staffP.status === 'pending') {
            setCoachStatus('pending');
            setIsLoading(false);
            setIsSyncing(false);
            return;
          }
          if (staffP.status === 'rejected') {
            setCoachStatus('rejected');
            setIsLoading(false);
            setIsSyncing(false);
            return;
          }

          // Approved coach
          setCoachStatus('approved');
          targetUserId = staffP.owner_id;
          canViewTumbling = staffP.can_view_tumbling ?? false;
          assignedCheerOrgIds = staffP.assigned_cheer_org_ids || [];

          // Fetch owner details for display
          const { data: coachOwnerP } = await supabase
            .from('owner_profiles')
            .select('*')
            .eq('id', staffP.owner_id)
            .maybeSingle();

          mappedProfile = {
            ...INITIAL_PROFILE,
            businessName: coachOwnerP?.business_name || INITIAL_PROFILE.businessName,
            logo: coachOwnerP?.logo || INITIAL_PROFILE.logo,
            role: 'coach',
            owner_id: staffP.owner_id,
            pay_rate: staffP.pay_rate,
            email: staffP.email || user.email,
            can_view_tumbling: canViewTumbling,
            assigned_cheer_org_ids: assignedCheerOrgIds,
            id: user.id
          };
        } else {
          // New owner auto-creation
          const defaultKey = `JFLIPS-${Math.floor(1000 + Math.random() * 9000)}`;
          const newOwner = {
            id: user.id,
            email: (user.email || '').toLowerCase().trim(),
            business_name: INITIAL_PROFILE.businessName,
            access_code: defaultKey
          };
          const { error: insErr } = await supabase.from('owner_profiles').insert(newOwner);
          if (!insErr) {
            isOwner = true;
            mappedProfile.role = 'owner';
            mappedProfile.access_code = defaultKey;
            mappedProfile.email = user.email;
          } else {
            console.error("Owner auto-creation error:", insErr.message);
          }
        }
      }

      // 3. Fetch data gated by permissions
      const fetchStudents = async () => {
        let tumblingStudents: any[] = [];
        let teamAthletes: any[] = [];

        // Tumbling students gating
        if (isOwner || canViewTumbling) {
          const tumb = await supabase.from('tumbling_students').select('*').eq('user_id', targetUserId);
          tumblingStudents = (tumb.data || []).map(s => ({ ...s, is_gym_member: false }));
        }

        // Team athletes gating
        if (isOwner) {
          const team = await supabase.from('team_athletes').select('*').eq('user_id', targetUserId);
          teamAthletes = (team.data || []).map(s => ({ ...s, is_gym_member: true }));
        } else if (assignedCheerOrgIds.length > 0) {
          const team = await supabase
            .from('team_athletes')
            .select('*')
            .eq('user_id', targetUserId)
            .in('associated_gym_id', assignedCheerOrgIds);
          teamAthletes = (team.data || []).map(s => ({ ...s, is_gym_member: true }));
        }

        return { data: [...tumblingStudents, ...teamAthletes], error: null };
      };

      const [studentsRes, gymsRes, classesRes, sessionsRes, historyRes, paymentsRes, schedulesRes, snapshotsRes, notificationsRes, competitionsRes, cheerRegistrationsRes] = await Promise.all([
        fetchStudents(),
        supabase.from('gyms').select('*').eq('user_id', targetUserId),
        supabase.from('class_types').select('*').eq('user_id', targetUserId),
        supabase.from('sessions').select('*').eq('user_id', targetUserId),
        supabase.from('history').select('*').eq('user_id', targetUserId),
        supabase.from('payments').select('*').eq('user_id', targetUserId),
        supabase.from('class_schedules').select('*').eq('user_id', targetUserId),
        supabase.from('invoice_snapshots').select('*').eq('coach_id', user.id).order('created_at', { ascending: false }),
        supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
        supabase.from('competitions').select('*').eq('user_id', targetUserId).order('date', { ascending: true }),
        supabase.from('cheer_registrations').select('*').eq('user_id', targetUserId).order('created_at', { ascending: false })
      ]);

      const errors = [
        studentsRes.error,
        gymsRes.error,
        classesRes.error,
        sessionsRes.error,
        historyRes.error,
        competitionsRes.error
      ];

      if (errors.some(e => e?.code === '42P01' || e?.code === 'PGRST205')) {
        setDbError('Database Setup Required');
        setIsSyncing(false);
        setIsLoading(false);
        return;
      }

      const rawPayments = paymentsRes.data || [];

      const mappedPayments: Payment[] = rawPayments.map(pay => ({
        ...pay,
        client_name: pay.client_name,
        bill_to_address: pay.bill_to_address,
        bill_to_phone: pay.bill_to_phone
      }));

      const rawStudentsList = studentsRes.data || [];
      const studentMap = new Map<string, any>();
      rawStudentsList.forEach((s: any) => {
        if (!studentMap.has(s.id)) {
          studentMap.set(s.id, s);
        } else {
          studentMap.set(s.id, { ...studentMap.get(s.id), ...s });
        }
      });
      const uniqueStudentsList = Array.from(studentMap.values());

      setState(prev => ({
        ...prev,
        students: uniqueStudentsList.map((s: any) => {
          let parsedSubTeamIds: string[] = [];
          if (s.sub_team_ids) {
            if (Array.isArray(s.sub_team_ids)) {
              parsedSubTeamIds = s.sub_team_ids;
            } else if (typeof s.sub_team_ids === 'string') {
              const trimmed = s.sub_team_ids.trim();
              if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                try {
                  parsedSubTeamIds = JSON.parse(trimmed);
                } catch (e) {
                  parsedSubTeamIds = [trimmed];
                }
              } else if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
                parsedSubTeamIds = trimmed.slice(1, -1).split(',').map((x: string) => x.trim().replace(/^"|"$/g, '')).filter(Boolean);
              } else {
                parsedSubTeamIds = trimmed.split(',').map((x: string) => x.trim()).filter(Boolean);
              }
            }
          }
          return { 
            ...s, 
            groupKey: s.group_key, 
            phone: s.phone, 
            is_gym_member: s.is_gym_member, 
            associated_gym_id: s.associated_gym_id,
            is_cheer: s.is_cheer,
            sub_team_ids: parsedSubTeamIds
          };
        }),
        gyms: (gymsRes.data || []).map((g: any) => ({
          ...g,
          pay_amount: g.pay_amount || 0,
          competition_rate: g.competition_rate || 0,
          gym_type: g.gym_type || 'tumbling',
          default_hours: g.default_hours || 1,
          bill_to_name: g.bill_to_name,
          bill_to_address: g.bill_to_address,
          bill_to_phone: g.bill_to_phone,
          parent_gym_id: g.parent_gym_id,
          custom_event_presets: g.custom_event_presets || [],
          coach_names: g.coach_names || []
        })),
        classTypes: (classesRes.data || []).map((ct: any) => ({ ...ct, studentIds: ct.enrolled_student_ids || [], coach_ids: ct.coach_ids || [] })),
        sessions: (sessionsRes.data || []).map(s => ({ ...s, classTypeId: s.class_type_id, studentIds: s.student_ids || [], hours_coached: s.hours_coached, coach_id: s.coach_id, is_competition: s.is_competition, custom_event_name: s.custom_event_name, covering_coach_name: s.covering_coach_name || s.covering_coach || undefined })),
        history: (historyRes.data || []).map(h => ({ 
          ...h, 
          monthName: h.month_name, 
          year: h.year, 
          recordedAt: h.recorded_at, 
          revenue: h.revenue, 
          sessions: h.sessions_json || [],
          snapshot_data: h.snapshot_json 
        })),
        payments: mappedPayments,
        schedules: (schedulesRes.data || []).map((sc: any) => {
          let color = sc.color || '';
          let athlete_ids: string[] = [];
          if (color.includes('|')) {
            const parts = color.split('|');
            color = parts[0];
            if (parts.length > 1 && parts[1]) {
              athlete_ids = parts[1].split(',');
            }
          }
          return {
            id: sc.id, 
            class_ids: sc.class_id ? sc.class_id.split(',') : [], 
            day_of_week: sc.day_of_week, 
            time: sc.time, 
            label: sc.label,
            coach_id: sc.coach_id,
            color: color,
            athlete_ids
          };
        }),
        staff: staffList,
        competitions: (competitionsRes.data || []).map((c: any) => ({
          ...c,
          gym_ids: c.gym_ids || []
        })),
        profile: mappedProfile,
        snapshots: (snapshotsRes.data || []).map((sn: any) => ({
          ...sn,
          snapshot_data: sn.snapshot_data
        })),
        notifications: notificationsRes.data || [],
        cheerRegistrations: cheerRegistrationsRes.data || []
      }));
    } catch (err: any) {
      console.error("Fetch failed", err);
    } finally {
      setIsSyncing(false);
      if (!silent) setIsLoading(false);
    }
  }, [user]);

  // ── BACKGROUND NOTIFICATION WATCHER ─────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const runBackgroundChecks = async () => {
      const now = new Date();

      // 2️⃣ Cycle Month Invoicing Reminder (on 30th/end of month if active sessions exist)
      const currentDayOfMonth = now.getDate();
      const isFeb = now.getMonth() === 1;
      const isEndMonth = currentDayOfMonth >= 30 || (isFeb && currentDayOfMonth >= 28);
      
      if (isEndMonth) {
        const monthLabel = MONTHS[now.getMonth()];
        const year = now.getFullYear();
        const cycleAlertKey = `discord_cycle_alert_sent_${now.getMonth()}_${year}`;

        // Check if we have active, unarchived sessions in current lists
        const hasUnarchivedSessions = (state.sessions || []).length > 0;

        if (hasUnarchivedSessions && !localStorage.getItem(cycleAlertKey)) {
          try {
            const success = await sendCycleMonthReminderNotification({
              monthName: monthLabel,
              year,
              unarchivedSessionsCount: state.sessions.length
            });
            if (success) {
              localStorage.setItem(cycleAlertKey, 'true');
            }
          } catch (err) {
            console.error('Failed to notify cycle month invoice reminder:', err);
          }
        }
      }
    };

    // Run the checks immediately on load, then every 10 minutes
    runBackgroundChecks();
    const interval = setInterval(runBackgroundChecks, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user, state.schedules, state.sessions, state.classTypes, state.gyms, state.staff, state.profile]);

  const handleSaveStudent = async (name: string, phone?: string, linkedSiblingId?: string, extraData?: Partial<Student>) => {
    if (!user) return;

    let finalGroupKey = '';
    if (linkedSiblingId && linkedSiblingId !== '') {
      const sibling = state.students.find(s => s.id === linkedSiblingId);
      if (sibling) {
        if (sibling.groupKey) { finalGroupKey = sibling.groupKey; }
        else {
          const newKey = `group_${Date.now()}`;
          finalGroupKey = newKey;
          const siblingTable = sibling.is_gym_member ? 'team_athletes' : 'tumbling_students';
          if (siblingTable === 'tumbling_students') {
            await supabase.from(siblingTable).update({ group_key: newKey }).eq('id', linkedSiblingId).eq('user_id', user.id);
          }
        }
      }
    }
    const studentId = editingStudent ? editingStudent.id : `stu_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const isGymMember = extraData?.is_gym_member ?? (editingStudent?.is_gym_member || false);
    const table = isGymMember ? 'team_athletes' : 'tumbling_students';
    
    // If athlete switched table type, remove from old table first to prevent duplicate entries
    if (editingStudent) {
      const oldTable = editingStudent.is_gym_member ? 'team_athletes' : 'tumbling_students';
      if (oldTable !== table) {
        await supabase.from(oldTable).delete().eq('id', editingStudent.id).eq('user_id', user.id);
      }
    }

    let payload: any;
    if (isGymMember) {
      payload = {
        id: studentId,
        user_id: user.id,
        name,
        associated_gym_id: extraData?.associated_gym_id || null,
        is_cheer: extraData?.is_cheer ?? true,
        sub_team_ids: extraData?.sub_team_ids || [],
        ...extraData
      };
      delete (payload as any).is_gym_member;
    } else {
      payload = {
        id: studentId,
        name,
        phone,
        group_key: finalGroupKey || null,
        user_id: user.id,
        ...extraData
      };
      delete (payload as any).is_gym_member;
      delete (payload as any).sub_team_ids;
    }

    let { error } = await supabase.from(table).upsert(payload);
    
    // If it fails on team_athletes (possibly due to sub_team_ids array/text type mismatch), retry with JSON string
    if (error && isGymMember && payload.sub_team_ids && Array.isArray(payload.sub_team_ids)) {
      const fallbackPayload = {
        ...payload,
        sub_team_ids: JSON.stringify(payload.sub_team_ids)
      };
      const { error: retryError } = await supabase.from(table).upsert(fallbackPayload);
      error = retryError;
    }

    if (error) { alert("Cloud Save Error: " + error.message); return; }
    setShowModal(null); setEditingStudent(null); loadCloudData(true);
  };

  const handleUpdateStudentTeam = async (studentId: string, gymId: string | null) => {
    if (!user) return;
    const student = state.students.find(s => s.id === studentId);
    if (!student) return;
    const table = student.is_gym_member ? 'team_athletes' : 'tumbling_students';
    const { error } = await supabase.from(table).update({ associated_gym_id: gymId }).eq('id', studentId).eq('user_id', user.id);
    if (error) { alert("Team Update Error: " + error.message); return; }
    loadCloudData(true);
  };

  const handleUpdateStudentSubTeams = async (studentId: string, subTeamIds: string[]) => {
    if (!user) return;
    const student = state.students.find(s => s.id === studentId);
    if (!student) return;
    const table = student.is_gym_member ? 'team_athletes' : 'tumbling_students';
    if (table !== 'team_athletes') {
      alert("Only team athletes can be assigned to sub-teams.");
      return;
    }

    let { error } = await supabase.from(table).update({ sub_team_ids: subTeamIds }).eq('id', studentId).eq('user_id', user.id);
    
    // If it fails with type or syntax related error, retry with JSON-serialized string
    if (error && (error.message.includes('array') || error.message.includes('text') || error.message.includes('syntax') || error.message.includes('column') || error.message.includes('malformed'))) {
      const { error: retryError } = await supabase.from(table).update({ sub_team_ids: JSON.stringify(subTeamIds) }).eq('id', studentId).eq('user_id', user.id);
      error = retryError;
    }

    if (error) { alert("Sub-team Update Error: " + error.message); return; }
    loadCloudData(true);
  };

  const handleUpdateStudentName = async (studentId: string, newName: string) => {
    if (!user) return;
    if (!newName.trim()) return;

    const student = state.students.find(s => s.id === studentId);
    if (!student) return;
    const table = student.is_gym_member ? 'team_athletes' : 'tumbling_students';
    const { error } = await supabase.from(table).update({ name: newName }).eq('id', studentId).eq('user_id', user.id);
    if (error) { alert("Name Update Error: " + error.message); return; }
    loadCloudData(true);
  };

  const handleUpdateCompetition = async (comp: Competition) => {
    if (!user) return;
    const payload = {
      id: comp.id,
      name: comp.name,
      date: comp.date,
      location: comp.location,
      gym_ids: comp.gym_ids,
      notes: comp.notes,
      user_id: user.id
    };
    const { error } = await supabase.from('competitions').upsert(payload);
    if (error) { alert("Competition Save Error: " + error.message); return; }
    loadCloudData(true);
  };

  const handleDeleteCompetition = async (id: string) => {
    if (!user) return;
    if (!confirm("Are you sure you want to delete this competition?")) return;
    const { error } = await supabase.from('competitions').delete().eq('id', id).eq('user_id', user.id);
    if (error) { alert("Delete Error: " + error.message); return; }
    loadCloudData(true);
  };

  const handleBulkImportAthletes = async (names: string[]) => {
    if (!user || !bulkImportParentId) return;
    setIsSyncing(true);

    const namesToAdd = Array.from(new Set(names.map(n => n.trim()).filter(Boolean)));

    if (namesToAdd.length === 0) {
      setIsSyncing(false);
      setShowBulkImport(false);
      return;
    }

    const newAthletes = namesToAdd.map(n => ({
      id: `team_ath_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: n,
      is_cheer: true,
      associated_gym_id: bulkImportParentId,
      user_id: user.id
    }));
    const { error } = await supabase.from('team_athletes').insert(newAthletes);
    if (error) {
      alert("Bulk Import Error: " + error.message);
    } else {
      setShowBulkImport(false);
      setBulkImportParentId(null);
      loadCloudData(true);
    }
    setIsSyncing(false);
  };

  const handleSaveGym = async (name: string, sessionTypes: string, payAmount: number, gymType: 'tumbling' | 'cheer', defaultHours: number, teamAthleteNames: string[], billToName?: string, billToAddress?: string, billToPhone?: string, parentGymId?: string, competitionRate?: number, coachIds?: string[], defaultCoachId?: string, secondaryCoachId?: string, autoResetInvoice: boolean = true, billingDay: number = 1, customEventPresets?: string[], coachNames?: string[]) => {
    if (!user) return;
    setIsSyncing(true);
    const gymId = (editingGym && editingGym.id) ? editingGym.id : `gym_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    const safePayAmount = isNaN(payAmount) ? 0 : payAmount;
    const safeDefaultHours = isNaN(defaultHours) ? 1 : defaultHours;
    const safeCompRate = isNaN(competitionRate || 0) ? 0 : (competitionRate || 0);

    // Build payload explicitly to ensure all fields are present
    const payload = {
      id: gymId,
      name,
      session_types: sessionTypes,
      pay_amount: safePayAmount,
      competition_rate: safeCompRate,
      gym_type: gymType,
      default_hours: safeDefaultHours,
      user_id: user.id,
      bill_to_name: billToName || null,
      bill_to_address: billToAddress || null,
      bill_to_phone: billToPhone || null,
      parent_gym_id: parentGymId || null,
      coach_ids: coachIds || [],
      default_coach_id: defaultCoachId || null,
      secondary_coach_id: secondaryCoachId || null,
      auto_reset_invoice: autoResetInvoice,
      billing_day: billingDay,
      custom_event_presets: customEventPresets || [],
      coach_names: coachNames || []
    };

    let { error: gymError } = await supabase.from('gyms').upsert(payload);

    if (gymError) {
      if (gymError.message.includes('coach_names') || gymError.message.includes('custom_event_presets') || gymError.message.includes('auto_reset_invoice') || gymError.message.includes('billing_day')) {
        const fallbackPayload = { ...payload };
        delete (fallbackPayload as any).coach_names;
        delete (fallbackPayload as any).custom_event_presets;
        delete (fallbackPayload as any).auto_reset_invoice;
        delete (fallbackPayload as any).billing_day;
        const { error: fallbackError } = await supabase.from('gyms').upsert(fallbackPayload);
        if (fallbackError) {
          console.error("Gym Save Error Details:", fallbackError);
          alert("Gym Save Error: " + fallbackError.message);
          setIsSyncing(false);
          return;
        }
      } else {
        console.error("Gym Save Error Details:", gymError);
        alert("Gym Save Error: " + gymError.message + "\n\nNote: If this is about missing columns, please update your Supabase schema using the SQL provided in the instructions.");
        setIsSyncing(false);
        return;
      }
    }

    const currentTeamAthletes = state.students.filter(s => s.associated_gym_id === gymId && s.is_gym_member);
    
    // Filter out duplicates from the input list itself
    const uniqueInputNames = Array.from(new Set(teamAthleteNames.map(n => n.trim()).filter(Boolean)));
    
    const namesToAdd = uniqueInputNames.filter(n => {
      return !currentTeamAthletes.some(a => a.name.toLowerCase().trim() === n.toLowerCase().trim());
    });

    const athletesToRemove = currentTeamAthletes.filter(a => !uniqueInputNames.some(n => n.toLowerCase().trim() === a.name.toLowerCase().trim()));

    if (athletesToRemove.length > 0) {
      await supabase.from('team_athletes').delete().in('id', athletesToRemove.map(a => a.id)).eq('user_id', user.id);
    }

    if (namesToAdd.length > 0) {
      const newAthletes = namesToAdd.map(n => ({
        id: crypto.randomUUID ? crypto.randomUUID() : `team_ath_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: n,
        associated_gym_id: gymId,
        user_id: user.id
      }));
      const { error: athletesError } = await supabase.from('team_athletes').insert(newAthletes);
      if (athletesError) {
        console.error("Athletes Save Error:", athletesError);
        alert("Team Roster Error: " + athletesError.message);
      }
    }

    setShowModal(null);
    setEditingGym(null);
    await loadCloudData(true);
    setIsSyncing(false);
  };

  const removeStudent = async (id: string) => {
    if (!user) return; if (!window.confirm("Delete athlete? This will remove all their records.")) return;
    setIsSyncing(true);
    const student = state.students.find(s => s.id === id);
    if (!student) { setIsSyncing(false); return; }
    const table = student.is_gym_member ? 'team_athletes' : 'tumbling_students';
    
    // Delete from main table
    const { error } = await supabase.from(table).delete().eq('id', id).eq('user_id', user.id);
    if (error) { alert("Delete failed: " + error.message); setIsSyncing(false); return; }

    // Clean up sessions
    const sessionsWithStudent = state.sessions.filter(s => s.studentIds?.includes(id));
    for (const session of sessionsWithStudent) {
      const newStudentIds = session.studentIds.filter(sid => sid !== id);
      await supabase.from('sessions').update({ student_ids: newStudentIds }).eq('id', session.id);
    }

    // Clean up class types
    const classesWithStudent = state.classTypes.filter(c => c.studentIds?.includes(id));
    for (const cls of classesWithStudent) {
      const newStudentIds = cls.studentIds!.filter(sid => sid !== id);
      await supabase.from('class_types').update({ enrolled_student_ids: newStudentIds }).eq('id', cls.id);
    }

    setShowModal(null); setEditingStudent(null); loadCloudData(true);
  };

  const removeGym = async (id: string) => {
    if (!user) return; if (!window.confirm("Delete gym?")) return;
    setIsSyncing(true);
    const { error } = await supabase.from('gyms').delete().eq('id', id).eq('user_id', user.id);
    if (error) { alert("Delete failed: " + error.message); setIsSyncing(false); return; }
    setShowModal(null); setEditingGym(null); loadCloudData(true);
  };

  const handleSaveClassType = async (name: string, price: number, studentIds: string[], coachIds?: string[], allowSignup: boolean = true, autoResetInvoice: boolean = true) => {
    if (!user) return;
    const isOwnerRole = state.profile.role === 'owner';
    const targetUserId = isOwnerRole ? user.id : state.profile.owner_id;
    const classId = editingClassType ? editingClassType.id : `cls_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const isNewClass = !editingClassType;
    const { error } = await supabase.from('class_types').upsert({ 
      id: classId, name, price, user_id: targetUserId, 
      enrolled_student_ids: studentIds,
      coach_ids: coachIds || [],
      allow_signup: allowSignup,
      auto_reset_invoice: autoResetInvoice
    });
    if (error) { 
      if (error.message.includes('allow_signup') || error.message.includes('auto_reset_invoice')) {
        const { error: fallbackError } = await supabase.from('class_types').upsert({ 
          id: classId, name, price, user_id: targetUserId, 
          enrolled_student_ids: studentIds,
          coach_ids: coachIds || []
        });
        if (fallbackError) { alert("Cloud Save Error: " + fallbackError.message); return; }
        alert("Class saved, but some features require a database update. Please add 'allow_signup' and 'auto_reset_invoice' boolean columns to the 'class_types' table in Supabase.");
      } else {
        alert("Cloud Save Error: " + error.message); return; 
      }
    }
    // Notify owner when adding a new class
    if (!isOwnerRole && isNewClass && targetUserId) {
      await supabase.from('notifications').insert({
        user_id: targetUserId,
        message: `New class added: "${name}"`,
        type: 'class_added',
        metadata: { class_id: classId, class_name: name, coach_id: user.id },
      });
    }
    setShowModal(null); setEditingClassType(null); loadCloudData(true);
  };

  const handleUpdateOrgCoaches = async (orgId: string, coachIds: string[], coachRates: Record<string, number>) => {
    if (!user) return;
    try {
      const payload: any = {
        coach_ids: coachIds,
        coach_rates: coachRates,
      };
      let { error } = await supabase.from('gyms').update(payload).eq('id', orgId).eq('user_id', user.id);
      if (error && (error.message.includes('coach_rates') || error.message.includes('column'))) {
        delete payload.coach_rates;
        const { error: err2 } = await supabase.from('gyms').update(payload).eq('id', orgId).eq('user_id', user.id);
        if (err2) alert('Error updating organization coaches: ' + err2.message);
      } else if (error) {
        alert('Error updating organization coaches: ' + error.message);
      }
      await loadCloudData(true);
    } catch (err: any) {
      console.error('Update org coaches exception:', err);
    }
  };

  const removeClassType = async (id: string) => {
    if (!user) return; if (!window.confirm("Delete class type?")) return;
    const { error = null } = await supabase.from('class_types').delete().eq('id', id).eq('user_id', user.id);
    if (error) alert("Delete failed: " + (error as any).message);
    loadCloudData(true);
  };

  const handleUpdateProfile = async (profile: Profile) => {
    if (!user) return;
    const isOwner = state.profile.role === 'owner';
    
    // Save business details in localStorage
    if (profile.bizBankName !== undefined) localStorage.setItem(`jflips_biz_bankName_${user.id}`, profile.bizBankName);
    if (profile.bizAccountNumber !== undefined) localStorage.setItem(`jflips_biz_accountNumber_${user.id}`, profile.bizAccountNumber);
    if (profile.bizBranchCode !== undefined) localStorage.setItem(`jflips_biz_branchCode_${user.id}`, profile.bizBranchCode);
    if (profile.bizAccountType !== undefined) localStorage.setItem(`jflips_biz_accountType_${user.id}`, profile.bizAccountType);

    if (isOwner) {
      const { error: pErr } = await supabase.from('owner_profiles').upsert({ 
        id: user.id, 
        business_name: profile.businessName, 
        bank_name: profile.bankName, 
        account_number: profile.accountNumber, 
        branch_code: profile.branchCode, 
        account_type: profile.accountType, 
        biz_bank_name: profile.bizBankName,
        biz_account_number: profile.bizAccountNumber,
        biz_branch_code: profile.bizBranchCode,
        biz_account_type: profile.bizAccountType,
        logo: profile.logo
      });
      if (pErr) { alert("Owner Profile Save Error: " + pErr.message); return; }
    } else {
      const { error: sErr } = await supabase.from('staff_profiles').update({
        bank_name: profile.bankName,
        account_number: profile.accountNumber,
        branch_code: profile.branchCode,
        account_type: profile.accountType
      }).eq('id', user.id);
      if (sErr) { alert("Coach Profile Save Error: " + sErr.message); return; }
    }

    loadCloudData(true);
  };

  const handleLogSession = async (classTypeIdOrData: any, studentIds?: string[], date?: string, hours?: number, coachId?: string, isCompetition?: boolean) => {
    if (!user) return;
    const isOwner = state.profile.role === 'owner';
    const targetUserId = isOwner ? user.id : state.profile.owner_id;
    const finalCoachId = coachId || (isOwner ? user.id : user.id); // Default to current user
    
    // Session Locking Check
    const checkDate = Array.isArray(classTypeIdOrData) ? classTypeIdOrData[0]?.date : (date || new Date().toISOString().split('T')[0]);
    const originalDate = editingSession?.date;

    const isLocked = (dStr: string) => {
      const parts = dStr.split('-');
      const mName = MONTHS[parseInt(parts[1], 10) - 1];
      const y = parseInt(parts[0], 10);
      return state.history.some(h => h.monthName === mName && h.year === y);
    };

    if (!isOwner) {
      if (checkDate && isLocked(checkDate)) {
        const d = new Date(checkDate);
        alert(`The date ${checkDate} falls in an archived month (${MONTHS[d.getMonth()]} ${d.getFullYear()}) and is locked.`);
        return;
      }
      if (originalDate && isLocked(originalDate)) {
        const d = new Date(originalDate);
        alert(`This session belongs to an archived month (${MONTHS[d.getMonth()]} ${d.getFullYear()}) and is locked.`);
        return;
      }
    }

    let sessionsToUpsert: any[] = [];
    
    if (Array.isArray(classTypeIdOrData)) {
      sessionsToUpsert = classTypeIdOrData.map((s, idx) => ({
        id: s.id || `sess_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 5)}`,
        date: s.date,
        class_type_id: s.classTypeId,
        student_ids: s.studentIds,
        hours_coached: s.hours || null,
        user_id: targetUserId,
        coach_id: s.coachId || finalCoachId,
        is_competition: s.isCompetition || isCompetition || false,
        custom_event_name: s.customEventName || null,
        covering_coach_name: s.covering_coach_name || s.coveringCoachName || null
      }));
    } else {
      const sessionId = (editingSession && editingSession.id) ? editingSession.id : `sess_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      sessionsToUpsert = [{
        id: sessionId,
        date: date || new Date().toISOString().split('T')[0],
        class_type_id: classTypeIdOrData,
        student_ids: studentIds || [],
        hours_coached: hours || null,
        user_id: targetUserId,
        coach_id: finalCoachId,
        is_competition: isCompetition || false,
        custom_event_name: editingSession?.custom_event_name || null,
        covering_coach_name: editingSession?.covering_coach_name || null
      }];
    }

    if (!isOnline) {
      for (const sess of sessionsToUpsert) {
        await addToQueue(sess);
      }
      handleViewChange(View.DASHBOARD);
      return;
    }

    let { error } = await supabase.from('sessions').upsert(sessionsToUpsert);
    if (error && (error.message.includes('covering_coach_name') || error.message.includes('column'))) {
      const fallbackSessions = sessionsToUpsert.map(s => {
        const copy = { ...s };
        delete copy.covering_coach_name;
        return copy;
      });
      const fallbackRes = await supabase.from('sessions').upsert(fallbackSessions);
      error = fallbackRes.error;
    }
    if (error) { alert("Session Save Error: " + error.message); return; }

    // Owner Notification
    if (!isOwner && targetUserId) {
      const coachName = state.staff.find(s => s.id === user.id)?.name || state.profile.businessName || user.email;
      const sessionCount = sessionsToUpsert.length;
      const hoursCount = sessionsToUpsert.reduce((acc, s) => acc + (s.hours_coached || 1), 0);
      const msg = `${coachName} logged ${sessionCount} session${sessionCount > 1 ? 's' : ''} totaling ${hoursCount} hours.`;
      
      await supabase.from('notifications').insert({
        user_id: targetUserId,
        message: msg,
        type: 'session_logged',
        metadata: { session_ids: sessionsToUpsert.map(s => s.id) }
      });

      // Send push notification
      sendLocalNotification('New Session Logged', msg);
    }

    handleViewChange(View.DASHBOARD); loadCloudData(true);
  };

  useEffect(() => {
    const syncOfflineData = async () => {
      if (isOnline && user) {
        const pending = await getPendingItems();
        if (pending.length === 0) return;

        let hasFailures = false;
        for (const item of pending) {
          const { error } = await supabase.from('sessions').upsert(item.payload);
          if (error) {
            await updateItemStatus(item.id, 'failed', error.message);
            hasFailures = true;
          } else {
            await updateItemStatus(item.id, 'synced');
          }
        }

        if (hasFailures) {
          alert("Some offline sessions failed to sync. Please check the sync status on your dashboard.");
        }
        
        await loadCloudData(true);
        await deleteSyncedItems();
      }
    };

    syncOfflineData();
  }, [isOnline, user, loadCloudData]);

  const removeSession = async (idOrIds: string | string[]) => {
    if (!user) return;
    const isOwner = state.profile.role === 'owner';
    const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
    
    // Locking Check
    if (!isOwner) {
      const sessionToDelete = state.sessions.find(s => ids.includes(s.id));
      if (sessionToDelete) {
        const d = new Date(sessionToDelete.date);
        const mName = MONTHS[d.getMonth()];
        const y = d.getFullYear();
        if (state.history.some(h => h.monthName === mName && h.year === y)) {
          alert(`This session belongs to an archived month (${mName} ${y}) and is locked.`);
          return;
        }
      }
    }

    const { error } = await supabase.from('sessions').delete().in('id', ids).eq('user_id', isOwner ? user.id : state.profile.owner_id);
    if (error) alert("Delete failed: " + error.message);
    loadCloudData(true);
  };

  const markNotificationRead = async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    if (!error) {
      setState(prev => ({
        ...prev,
        notifications: prev.notifications.map(n => n.id === id ? { ...n, is_read: true } : n)
      }));
    }
  };

  const clearNotifications = async () => {
    if (!user) return;
    const { error } = await supabase.from('notifications').delete().eq('user_id', user.id);
    if (!error) {
      setState(prev => ({ ...prev, notifications: [] }));
    }
  };

  const removeHistoryEntry = async (id: string) => {
    if (!user) return;
    if (!window.confirm("Delete history record?")) return;
    setIsSyncing(true);
    const { error = null } = await supabase.from('history').delete().eq('id', id).eq('user_id', user.id);
    if (error) {
      alert("Delete failed: " + (error as any).message);
      setIsSyncing(false);
      return;
    }
    loadCloudData(true);
  };

  const resetMonth = async (selectedIds: string[]) => {
    if (!user) return; if (state.sessions.length === 0 || selectedIds.length === 0) { setIsResetConfirming(false); return; }
    setIsSyncing(true);
    try {
      const sessionsToReset = state.sessions.filter(s => selectedIds.includes(s.classTypeId));
      
      if (sessionsToReset.length === 0) {
        setIsSyncing(false);
        setIsResetConfirming(false);
        return;
      }

      const snapshot_data = {
        students: state.students || [],
        gyms: state.gyms || [],
        staff: state.staff || [],
        classTypes: state.classTypes || [],
        payments: state.payments || []
      };

      const now = new Date();
      const dueDateStr = new Date(now.getFullYear(), now.getMonth() + 1, 3).toISOString().split('T')[0];

      // 1. Group Data by Billing Month
      const globalRevByMonth = new Map<string, { monthName: string, year: number, revenue: number }>();
      const familyRevByMonth = new Map<string, { monthLabel: string, famId: string, revenue: number, snapAddress: string, snapPhone: string, currentLabel: string }>();
      const coachRevByMonth = new Map<string, { monthLabel: string, coachId: string, revenue: number, currentLabel: string }>();

      sessionsToReset.forEach(sess => {
        const ct = (state.classTypes || []).find(c => c.id === sess.classTypeId);
        const gym = (state.gyms || []).find(g => g.id === sess.classTypeId);
        
        let price = ct ? ct.price : (gym ? gym.pay_amount : 0);
        if (gym && sess.custom_event_name) {
          const customPreset = gym.custom_event_presets?.find(p => {
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
        if (sess.is_competition && gym?.competition_rate) price = gym.competition_rate;

        let billingDay = gym?.billing_day || 1;
        if (gym?.parent_gym_id) {
          const parent = (state.gyms || []).find(g => g.id === gym.parent_gym_id);
          if (parent?.billing_day) billingDay = parent.billing_day;
        }
        const { monthName, year } = getSessionBillingMonth(sess.date, billingDay);
        const monthLabelKey = `${monthName} ${year}`;

        const className = ct ? ct.name : '';
        // -- Global --
        let sessionRev = 0;
        if (gym) {
          sessionRev = price * (sess.hours_coached || gym.default_hours || 1);
        } else {
          sessionRev = (sess.studentIds || []).reduce((sum, sid) => {
            const student = state.students.find(s => s.id === sid);
            return sum + getStudentSessionPrice(student, sess, price, className);
          }, 0);
        }
        
        if (!globalRevByMonth.has(monthLabelKey)) {
          globalRevByMonth.set(monthLabelKey, { monthName, year, revenue: 0 });
        }
        globalRevByMonth.get(monthLabelKey)!.revenue += sessionRev;

        // -- Families --
        const familiesToBill = new Set<string>();
        if (gym) {
          familiesToBill.add(gym.parent_gym_id || gym.id);
        } else {
          (sess.studentIds || []).forEach(sid => {
            const student = state.students.find(s => s.id === sid);
            if (student) {
              const famId = student.groupKey || student.id;
              const gymEnt = state.gyms.find(g => g.id === famId);
              familiesToBill.add(gymEnt?.parent_gym_id || famId);
            }
          });
        }

        familiesToBill.forEach(famId => {
          let famRev = 0;
          if (gym && (gym.id === famId || gym.parent_gym_id === famId)) {
            famRev = price * (sess.hours_coached || gym.default_hours || 1);
          } else {
            const familyStudents = (sess.studentIds || []).filter(sid => {
              const student = state.students.find(st => st.id === sid);
              if (!student) return false;
              const studentFamId = student.groupKey || student.id;
              const studentGym = state.gyms.find(g => g.id === studentFamId);
              return studentFamId === famId || studentGym?.parent_gym_id === famId;
            });
            famRev = familyStudents.reduce((sum, sid) => {
              const student = state.students.find(st => st.id === sid);
              return sum + getStudentSessionPrice(student, sess, price, className);
            }, 0);
          }

          if (famRev > 0) {
            const famKey = `${famId}_${monthLabelKey}`;
            if (!familyRevByMonth.has(famKey)) {
              let currentLabel = 'Client'; let snapAddress = ''; let snapPhone = '';
              const g2 = (state.gyms || []).find(g => g.id === famId);
              if (g2) {
                currentLabel = g2.bill_to_name || g2.name || 'Client';
                snapAddress = g2.bill_to_address || '';
                snapPhone = g2.bill_to_phone || '';
              } else {
                const members = (state.students || []).filter(s => s.groupKey === famId || (s.id === famId && !s.groupKey));
                if (members.length > 0) currentLabel = members.map(m => m.name).join(' & ');
              }
              familyRevByMonth.set(famKey, { monthLabel: monthLabelKey, famId, revenue: 0, snapAddress, snapPhone, currentLabel });
            }
            familyRevByMonth.get(famKey)!.revenue += famRev;
          }
        });

        // -- Coaches --
        if (sess.coach_id) {
          const coach = state.staff.find(s => s.id === sess.coach_id);
          const isMe = sess.coach_id === user.id;
          if (coach || isMe) {
            const rate = coach?.pay_rate || 0;
            const coachRev = rate * (sess.hours_coached || 1);
            if (coachRev > 0) {
              const coachKey = `${sess.coach_id}_${monthLabelKey}`;
              if (!coachRevByMonth.has(coachKey)) {
                coachRevByMonth.set(coachKey, { monthLabel: monthLabelKey, coachId: sess.coach_id, revenue: 0, currentLabel: coach?.name || 'Coach' });
              }
              coachRevByMonth.get(coachKey)!.revenue += coachRev;
            }
          }
        }
      });

      // 2. Global History DB Insert/Update
      for (const [monthLabelKey, data] of Array.from(globalRevByMonth.entries())) {
        const { data: existingHist } = await supabase.from('history').select('*').eq('month_name', data.monthName).eq('year', data.year).eq('user_id', user.id);
        
        const monthSessions = sessionsToReset.filter(sess => {
          const { monthName, year } = getSessionBillingMonth(sess.date);
          return monthName === data.monthName && year === data.year;
        });

        if (existingHist && existingHist.length > 0) {
          const currentSessions = existingHist[0].sessions_json || [];
          const updatedSessions = [...currentSessions, ...monthSessions];
          await supabase.from('history').update({
            revenue: Number(existingHist[0].revenue || 0) + data.revenue,
            sessions_json: updatedSessions,
            recorded_at: new Date().toISOString(),
            snapshot_json: snapshot_data
          }).eq('id', existingHist[0].id);
        } else {
          await supabase.from('history').insert({
            id: crypto.randomUUID ? crypto.randomUUID() : `uid_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            month_name: data.monthName,
            year: data.year,
            sessions_json: monthSessions,
            revenue: data.revenue,
            recorded_at: new Date().toISOString(),
            user_id: user.id,
            snapshot_json: snapshot_data
          });
        }
      }

      // 3. Family Payments
      for (const data of Array.from(familyRevByMonth.values())) {
        const { data: existingPay } = await supabase.from('payments').select('*').eq('invoice_id', data.monthLabel).eq('family_id', data.famId).eq('user_id', user.id);
        if (existingPay && existingPay.length > 0) {
          await supabase.from('payments').update({ amount_due: Number(existingPay[0].amount_due || 0) + data.revenue }).eq('id', existingPay[0].id);
        } else {
          await supabase.from('payments').insert({
            id: crypto.randomUUID ? crypto.randomUUID() : `uid_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            invoice_id: data.monthLabel,
            family_id: data.famId,
            client_name: data.currentLabel,
            bill_to_address: data.snapAddress || null,
            bill_to_phone: data.snapPhone || null,
            amount_due: data.revenue,
            due_date: dueDateStr,
            user_id: user.id
          });
        }
      }

      // 4. Coach Payments
      for (const data of Array.from(coachRevByMonth.values())) {
        const { data: existingCoachPay } = await supabase.from('payments').select('*').eq('invoice_id', data.monthLabel).eq('family_id', data.coachId).eq('user_id', user.id);
        if (existingCoachPay && existingCoachPay.length > 0) {
          await supabase.from('payments').update({ amount_due: Number(existingCoachPay[0].amount_due || 0) + data.revenue, is_expense: true }).eq('id', existingCoachPay[0].id);
        } else {
          await supabase.from('payments').insert({
            id: crypto.randomUUID ? crypto.randomUUID() : `uid_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            invoice_id: data.monthLabel,
            family_id: data.coachId,
            client_name: data.currentLabel,
            amount_due: data.revenue,
            due_date: dueDateStr,
            user_id: user.id,
            is_expense: true
          });
        }
      }

      // 5. Delete active pay if migrating? For simplicity, we just delete the 'Active' ones if we are resetting globally.
      for (const data of Array.from(familyRevByMonth.values())) {
        const { data: activePay } = await supabase.from('payments')
          .select('id')
          .eq('invoice_id', 'Active')
          .eq('family_id', data.famId)
          .eq('user_id', user.id);
        if (activePay && activePay.length > 0) {
          await supabase.from('payments').delete().eq('id', activePay[0].id);
        }
      }

      // 6. Cleanup ONLY the reset sessions
      const sessionIds = sessionsToReset.map(s => s.id);
      const { error: delErr } = await supabase.from('sessions').delete().in('id', sessionIds).eq('user_id', user.id);
      
      if (delErr) { alert("Delete Error: " + delErr.message); return; }

      // Automatically export to Google Sheets if enabled
      const googleTokenVal = await getAccessToken();
      const isSheetsSyncEnabled = localStorage.getItem('google_sheets_sync_enabled') === 'true';
      if (isSheetsSyncEnabled && googleTokenVal) {
        console.log('Automated Google Sheets finance syncing triggered...');
        try {
          // Construct the updated history list conforming to HistoryMonth
          const updatedHistory: HistoryMonth[] = [...(state.history || [])];
          for (const [_, data] of Array.from(globalRevByMonth.entries())) {
            const index = updatedHistory.findIndex(h => h.monthName === data.monthName && h.year === data.year);
            const histItem: HistoryMonth = {
              id: `hist_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              monthName: data.monthName,
              year: data.year,
              revenue: data.revenue,
              snapshot_data: snapshot_data,
              sessions: [],
              recordedAt: new Date().toISOString()
            };
            if (index >= 0) {
              updatedHistory[index] = {
                ...updatedHistory[index],
                revenue: Number(updatedHistory[index].revenue || 0) + data.revenue,
                snapshot_data: snapshot_data
              };
            } else {
              updatedHistory.push(histItem);
            }
          }

          await syncFinancesToGoogleSheet(
            [], // sessions are cleared on reset
            updatedHistory,
            state.classTypes || [],
            state.gyms || [],
            state.staff || [],
            googleTokenVal
          );
        } catch (sheetErr) {
          console.error('Automated Google Sheets export failed during archive:', sheetErr);
        }
      }

      loadCloudData(true);
      setIsResetConfirming(false);
      handleViewChange(View.HISTORY);
    } catch (err: any) {
      alert("Unexpected archive error: " + err?.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const createInvoiceSnapshot = async (label: string) => {
    if (!user) return;
    const snapshotData = {
      sessions: state.sessions,
      payments: state.payments,
      history: state.history
    };
    
    const { error } = await supabase.from('invoice_snapshots').insert({
      coach_id: user.id,
      label,
      snapshot_data: snapshotData
    });

    if (error) {
      console.error("Snapshot creation failed", error);
      return;
    }

    const { data: snapshots } = await supabase.from('invoice_snapshots')
      .select('id')
      .eq('coach_id', user.id)
      .order('created_at', { ascending: false });

    if (snapshots && snapshots.length > 5) {
      const toDelete = snapshots.slice(5).map(s => s.id);
      await supabase.from('invoice_snapshots').delete().in('id', toDelete);
    }
    loadCloudData(true);
  };

  const restoreInvoiceSnapshot = async (snapshot: InvoiceSnapshot) => {
    if (!user) return;
    setIsSyncing(true);
    try {
      // 1. Clear current active sessions
      await supabase.from('sessions').delete().eq('user_id', user.id);
      
      // 2. Restore sessions
      if (snapshot.snapshot_data.sessions.length > 0) {
        const sessionsToInsert = snapshot.snapshot_data.sessions.map(s => {
          const { id, ...rest } = s as any;
          return {
            ...rest,
            user_id: user.id,
            class_type_id: s.classTypeId,
            student_ids: s.studentIds
          };
        });
        await supabase.from('sessions').insert(sessionsToInsert);
      }

      // 3. Restore payments (optional based on user request "active sessions, payments, and invoice data")
      // We'll just restore sessions for now as they are the primary "active" data.
      // If we restore payments, we might conflict with existing IDs.
      
      alert("Snapshot restored successfully!");
      loadCloudData(true);
      setShowRecoveryModal(false);
    } catch (err) {
      console.error("Restore failed", err);
      alert("Restore failed. Please try again.");
    } finally {
      setIsSyncing(false);
    }
  };

  const resetSingleInvoice = async (familyId: string, label: string) => {
    setResetConfirmation({ familyId, label });
  };

  const executeResetSingleInvoice = async (familyId: string, label: string) => {
    if (!user) return;
    
    const sessionsToReset = (state.sessions || []).filter(s => {
      const gym = state.gyms.find(g => g.id === s.classTypeId);
      if (gym && (gym.id === familyId || gym.parent_gym_id === familyId)) return true;
      
      return (s.studentIds || []).some(sid => {
        const student = state.students.find(st => st.id === sid);
        if (!student) return false;
        const studentFamId = student.groupKey || student.id;
        const studentGym = state.gyms.find(g => g.id === studentFamId);
        return studentFamId === familyId || studentGym?.parent_gym_id === familyId;
      });
    });

    if (sessionsToReset.length === 0) {
      alert("No sessions found for this client in the current month.");
      return;
    }

    // 1. Take Snapshot
    const timestamp = new Date().toLocaleString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric', 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
    await createInvoiceSnapshot(`Pre-Reset Backup — ${timestamp}`);

    const snapshot_data = {
      students: state.students || [],
      gyms: state.gyms || [],
      staff: state.staff || [],
      classTypes: state.classTypes || [],
      payments: state.payments || []
    };

    // Group revenues by targeted billing month
    const revenueByMonth = new Map<string, { monthName: string, year: number, revenue: number }>();

    sessionsToReset.forEach(sess => {
      const ct = (state.classTypes || []).find(c => c.id === sess.classTypeId);
      const gym = (state.gyms || []).find(g => g.id === sess.classTypeId);
      let price = ct ? ct.price : (gym ? gym.pay_amount : 0);
      if (gym && sess.custom_event_name) {
        const customPreset = gym.custom_event_presets?.find(p => {
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
      let sessionRev = 0;
      if (gym) {
        sessionRev = price * (sess.hours_coached || gym.default_hours || 1);
      } else {
        const className = ct ? ct.name : '';
        sessionRev = (sess.studentIds || []).reduce((sum, sid) => {
          const student = state.students.find(s => s.id === sid);
          return sum + getStudentSessionPrice(student, sess, price, className);
        }, 0);
      }

      let billingDay = gym?.billing_day || 1;
      if (gym?.parent_gym_id) {
        const parent = (state.gyms || []).find(g => g.id === gym.parent_gym_id);
        if (parent?.billing_day) billingDay = parent.billing_day;
      }
      const { monthName, year } = getSessionBillingMonth(sess.date, billingDay);
      const key = `${monthName} ${year}`;
      
      if (!revenueByMonth.has(key)) {
        revenueByMonth.set(key, { monthName, year, revenue: 0 });
      }
      revenueByMonth.get(key)!.revenue += sessionRev;
    });

    const now = new Date();
    const dueDateStr = new Date(now.getFullYear(), now.getMonth() + 1, 3).toISOString().split('T')[0];

    for (const [monthLabelFull, data] of Array.from(revenueByMonth.entries())) {
      // 1. Handle Payment Record
      const { data: existingPay } = await supabase.from('payments')
        .select('*')
        .eq('invoice_id', monthLabelFull)
        .eq('family_id', familyId)
        .eq('user_id', user.id);

      if (existingPay && existingPay.length > 0) {
        const pay = existingPay[0];
        await supabase.from('payments').update({
          amount_due: Number(pay.amount_due || 0) + data.revenue
        }).eq('id', pay.id);
      } else {
        let snapAddress = '';
        let snapPhone = '';
        const gym = (state.gyms || []).find(g => g.id === familyId);
        if (gym) {
          snapAddress = gym.bill_to_address || '';
          snapPhone = gym.bill_to_phone || '';
        }
        
        await supabase.from('payments').insert({
          id: crypto.randomUUID ? crypto.randomUUID() : `uid_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          invoice_id: monthLabelFull,
          family_id: familyId,
          client_name: label,
          bill_to_address: snapAddress || null,
          bill_to_phone: snapPhone || null,
          amount_due: data.revenue,
          due_date: dueDateStr,
          user_id: user.id
        });
      }

      // 2. Handle History Record
      const { data: existingHist } = await supabase.from('history')
        .select('*')
        .eq('month_name', data.monthName)
        .eq('year', data.year)
        .eq('user_id', user.id);

      const monthSessions = sessionsToReset.filter(sess => {
        const { monthName, year } = getSessionBillingMonth(sess.date);
        return monthName === data.monthName && year === data.year;
      });

      if (existingHist && existingHist.length > 0) {
        const hist = existingHist[0];
        const updatedRevenue = Number(hist.revenue || 0) + data.revenue;
        const currentSessions = hist.sessions_json || [];
        const updatedSessions = [...currentSessions, ...monthSessions];
        
        await supabase.from('history').update({
          revenue: updatedRevenue,
          sessions_json: updatedSessions,
          recorded_at: new Date().toISOString(),
          snapshot_json: snapshot_data
        }).eq('id', hist.id);
      } else {
        await supabase.from('history').insert({
          id: crypto.randomUUID ? crypto.randomUUID() : `uid_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          month_name: data.monthName,
          year: data.year,
          sessions_json: monthSessions,
          revenue: data.revenue,
          recorded_at: new Date().toISOString(),
          user_id: user.id,
          snapshot_json: snapshot_data
        });
      }
    }

    // 3. Delete sessions
    const sessionIds = sessionsToReset.map(s => s.id);
    const { error: delErr } = await supabase.from('sessions').delete().in('id', sessionIds).eq('user_id', user.id);
    
    if (delErr) { alert("Delete Error: " + delErr.message); return; }

    // Also migrate any 'Active' payment to the first billing month if it exists
    const { data: activePay } = await supabase.from('payments')
        .select('*')
        .eq('invoice_id', 'Active')
        .eq('family_id', familyId)
        .eq('user_id', user.id);
    
    if (activePay && activePay.length > 0 && revenueByMonth.size > 0) {
      // We can just delete it, or update its month. Let's just delete 'Active' since we explicitly built the new months.
      await supabase.from('payments').delete().eq('id', activePay[0].id);
    }

    loadCloudData(true);
    alert(`${label} invoice has been reset and archived to their respective billing months.`);
  };

  const handleUpdatePayment = async (paymentData: Partial<Payment>) => {
    if (!user) return;
    const { error } = await supabase.from('payments').upsert({
      ...paymentData,
      user_id: user.id
    });
    if (error) { alert("Payment Save Error: " + error.message); return; }
    loadCloudData(true);
  };

  const handleSaveSchedule = async (classIds: string[], dayOfWeek: number, time: string, label?: string, color?: string) => {
    if (!user) return;
    const isOwner = state.profile.role === 'owner';
    const targetUserId = isOwner ? user.id : state.profile.owner_id;

    const scheduleId = editingSchedule ? editingSchedule.id : `sched_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const { error } = await supabase.from('class_schedules').upsert({ 
      id: scheduleId, 
      class_id: classIds.join(','), 
      day_of_week: dayOfWeek, 
      time, 
      label: label || null, 
      user_id: targetUserId,
      coach_id: targetUserId,
      color: color || null
    });
    if (error) { alert("Schedule Save Error: " + error.message); return; }

    // Automated Google Calendar sync
    const token = await getAccessToken();
    const isCalendarSyncEnabled = localStorage.getItem('google_calendar_sync_enabled') === 'true';
    if (isCalendarSyncEnabled && token) {
      try {
        const updatedSchedules = (state.schedules || []).filter(s => s.id !== scheduleId);
        updatedSchedules.push({
          id: scheduleId,
          class_ids: classIds,
          day_of_week: dayOfWeek,
          time,
          label: label || null,
          color: color || null,
          coach_id: targetUserId
        });
        await syncSchedulesToCalendar(
          updatedSchedules,
          state.classTypes || [],
          state.gyms || [],
          state.staff || [],
          token
        );
      } catch (calErr) {
        console.error('Automated Google Calendar background sync failed:', calErr);
      }
    }

    setShowModal(null); setEditingSchedule(null); loadCloudData(true);
  };

  const removeSchedule = async (id: string) => {
    if (!user) return; if (!window.confirm("Delete schedule?")) return;
    const { error } = await supabase.from('class_schedules').delete().eq('id', id).eq('user_id', user.id);
    if (error) { alert("Delete failed: " + error.message); return; }

    // Automated Google Calendar sync on remove
    const token = await getAccessToken();
    const isCalendarSyncEnabledOnDelete = localStorage.getItem('google_calendar_sync_enabled') === 'true';
    if (isCalendarSyncEnabledOnDelete && token) {
      try {
        const updatedSchedules = (state.schedules || []).filter(s => s.id !== id);
        await syncSchedulesToCalendar(
          updatedSchedules,
          state.classTypes || [],
          state.gyms || [],
          state.staff || [],
          token
        );
      } catch (calErr) {
        console.error('Automated Google Calendar background sync failed during deletion:', calErr);
      }
    }

    loadCloudData(true);
  };

  const handleQuickLog = (classIds: string | string[], date: string, coachId?: string, athleteIds?: string[]) => {
    const ids = Array.isArray(classIds) ? classIds : [classIds];
    const firstId = ids[0];
    const gym = (state.gyms || []).find(g => g.id === firstId);
    
    if (gym && gym.gym_type === 'cheer') {
      setInitialCoachId(coachId || null);
      setInitialAthleteIds(athleteIds || []);
      setInitialTeamIds(ids);
      setInitialDate(date);
      setActiveView(View.TEAM_ATTENDANCE);
    } else {
      setQuickLogModalData({ classIds: ids, date, coachId, athleteIds });
    }
  };

  const handleViewChange = (view: View) => {
    setActiveView(view);
    if (view === View.ROSTER) {
      setRosterTab('students');
      setRosterEntityType('athletes');
    }
    if (view === View.HISTORY) {
      setSelectedHistoryMonth(null);
    }
    // Clear transient states when switching views
    if (view !== View.TEAM_ATTENDANCE && view !== View.GYM_ATTENDANCE) {
      setInitialTeamIds([]);
      setInitialDate(null);
      setInitialAthleteIds([]);
    }
    if (view !== View.REGISTER) setEditingSession(null);
  };

  const startEditSession = (session: AttendanceSession) => {
    setEditingSession(session);
    const gym = state.gyms.find(g => g.id === session.classTypeId);
    if (gym) {
      if (gym.gym_type === 'cheer') {
        setActiveView(View.TEAM_ATTENDANCE);
      } else {
        setActiveView(View.GYM_ATTENDANCE);
      }
    } else {
      setActiveView(View.REGISTER);
    }
  };
  const toggleTheme = () => {
    setState(prev => {
      const nextTheme = prev.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem(THEME_KEY, nextTheme);
      return { ...prev, theme: nextTheme };
    });
  };
  const handleLogout = async () => { await supabase.auth.signOut(); setState(INITIAL_STATE); setShowSettingsModal(false); };

  const isStudentLinked = useCallback((student: Student) => {
    if (!student.groupKey) return false;
    return (state.students || []).filter(s => s.groupKey === student.groupKey).length > 1;
  }, [state.students]);

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-amber-500" />
          
          <div className="flex items-center justify-center w-12 h-12 bg-amber-500/10 rounded-full mb-6">
            <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <h2 className="text-xl font-bold text-slate-100 tracking-tight mb-2">
            Supabase Connection Required
          </h2>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            JFLIPS Pro is fully compiled but needs to connect to your Supabase project to start.
          </p>

          <div className="space-y-4 mb-6">
            <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800/80">
              <span className="text-xs font-mono text-slate-500 block mb-1">VARIABLE</span>
              <span className="text-sm font-semibold text-slate-200">VITE_SUPABASE_URL</span>
              <span className="float-right text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded border border-red-500/20 font-medium">Missing</span>
            </div>
            
            <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800/80">
              <span className="text-xs font-mono text-slate-500 block mb-1">VARIABLE</span>
              <span className="text-sm font-semibold text-slate-200">VITE_SUPABASE_ANON_KEY</span>
              <span className="float-right text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded border border-red-500/20 font-medium">Missing</span>
            </div>
          </div>

          <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-800 text-xs text-slate-400 space-y-2 leading-relaxed">
            <p className="font-semibold text-slate-300">How to fix this:</p>
            <ol className="list-decimal pl-4 space-y-1.5">
              <li>Go to your hosting dashboard (Vercel, Netlify, etc.) or open your local <code className="font-mono bg-slate-950 px-1 py-0.5 rounded text-amber-400">.env</code> file.</li>
              <li>Add the environment variables listed above.</li>
              <li>Re-deploy or restart your development server to apply the changes.</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  if (isAuthLoading) return <SplashScreen message="Verifying Identity" />;
  if (!user) return <LandingGate />;
  if (coachStatus === 'pending') return <PendingCoachScreen email={user.email} onLogout={handleLogout} onRefresh={() => loadCloudData(false)} />;
  if (coachStatus === 'rejected') return <RejectedCoachScreen email={user.email} onLogout={handleLogout} />;
  if (dbError) return <DatabaseSetupView message={dbError} onReload={() => loadCloudData(false)} />;
  if (isLoading) return <SplashScreen message="Syncing Elite Data" />;

  // ── Shared view content ─────────────────────────────────────────────────────
  const viewContent = (
    <div className="w-full">
      {activeView === View.DASHBOARD && (
        <DashboardView
          state={state}
          onEditSession={startEditSession}
          onRemoveSession={removeSession}
          onQuickLog={handleQuickLog}
          showAllLogs={showAllLogs}
          onShowAllLogs={setShowAllLogs}
        />
      )}
      {activeView === View.LOG_SESSION && <LogSessionView state={state} onNavigate={handleViewChange} />}
      {activeView === View.REGISTER && <RegisterView state={state} onSave={handleLogSession} onCancel={() => handleViewChange(View.LOG_SESSION)} initialSession={editingSession} />}
      {activeView === View.TEAM_ATTENDANCE && <TeamAttendanceView state={state} onSave={handleLogSession} initialTeamIds={initialTeamIds} initialDate={initialDate} initialCoachId={initialCoachId} initialSession={editingSession} gymType="cheer" />}
      {activeView === View.GYM_ATTENDANCE && <TeamAttendanceView state={state} onSave={handleLogSession} initialTeamIds={initialTeamIds} initialDate={initialDate} initialCoachId={initialCoachId} initialSession={editingSession} gymType="tumbling" />}
      {activeView === View.TEAM_MANAGEMENT && (
        <TeamManagementView 
          state={state} 
          onRemoveStudent={removeStudent} 
          onUpdateSubTeams={handleUpdateStudentSubTeams}
          onUpdateCompetition={handleUpdateCompetition} 
          onDeleteCompetition={handleDeleteCompetition} 
          onAddAthlete={(extra) => {
            setEditingStudent(null);
            setEditingExtra(extra);
            setShowModal('student');
          }}
          onUpdateStudentName={handleUpdateStudentName}
          onAddSubTeam={(parentId) => {
            setEditingGym({ id: '', name: '', session_types: '', pay_amount: 0, user_id: '', gym_type: 'cheer', parent_gym_id: parentId });
            setShowModal('gym');
          }}
          onBulkImport={(parentId) => {
            setBulkImportParentId(parentId);
            setShowBulkImport(true);
          }}
          onUpdateOrgCoaches={handleUpdateOrgCoaches}
          onRefresh={() => loadCloudData(true)}
        />
      )}
      {activeView === View.HISTORY && (
        !selectedHistoryMonth ? (
          <HistoryView state={state} onSelectMonth={(month) => setSelectedHistoryMonth(month)} onRemove={removeHistoryEntry} onOpenStats={() => handleViewChange(View.STATISTICS)} />
        ) : (
          <div className="pb-16">
            <button onClick={() => setSelectedHistoryMonth(null)} className="mb-4 text-slate-500 text-[10px] font-black uppercase tracking-widest py-2 hover:text-[#1e4da1] transition-colors">&larr; Back to History</button>
            <h2 className="text-xl font-black mb-5 uppercase tracking-tight text-[#1a1a1a] dark:text-white px-2 italic">{selectedHistoryMonth.monthName} {selectedHistoryMonth.year}</h2>
            <InvoicesView
              state={{
                ...state,
                sessions: selectedHistoryMonth.sessions || [],
                students: selectedHistoryMonth.snapshot_data?.students || state.students,
                gyms: selectedHistoryMonth.snapshot_data?.gyms || state.gyms,
                staff: selectedHistoryMonth.snapshot_data?.staff || state.staff,
                classTypes: selectedHistoryMonth.snapshot_data?.classTypes || state.classTypes,
                payments: selectedHistoryMonth.snapshot_data?.payments || state.payments
              }}
              user={user}
              monthLabel={`${selectedHistoryMonth.monthName} ${selectedHistoryMonth.year}`}
              onUpdatePayment={handleUpdatePayment}
              onResetInvoice={resetSingleInvoice}
              onShowRecovery={() => setShowRecoveryModal(true)}
            />
          </div>
        )
      )}
      {activeView === View.STATISTICS && (
        <StatisticsView 
          history={state.history} 
          classTypes={state.classTypes || []} 
          gyms={state.gyms || []} 
          students={state.students || []} 
          onBack={() => handleViewChange(View.HISTORY)} 
        />
      )}
      {activeView === View.INVOICES && <InvoicesView state={state} user={user} onUpdatePayment={handleUpdatePayment} onResetInvoice={resetSingleInvoice} onShowRecovery={() => setShowRecoveryModal(true)} />}
      {activeView === View.ROSTER && (
        <RosterView
          state={state}
          activeTab={rosterTab}
          onTabChange={setRosterTab}
          entityType={rosterEntityType}
          onEntityTypeChange={setRosterEntityType}
          onUpdateProfile={handleUpdateProfile}
          onAddStudent={() => { setEditingStudent(null); setShowModal('student'); }}
          onEditStudent={(s) => { setEditingStudent(s); setShowModal('student'); }}
          onRemoveStudent={removeStudent}
          onAddGym={(type?: 'tumbling' | 'cheer', parentId?: string) => { setEditingGym(type ? { gym_type: type, parent_gym_id: parentId } as Gym : null); setShowModal('gym'); }}
          onEditGym={(g) => { setEditingGym(g); setShowModal('gym'); }}
          onRemoveGym={removeGym}
          onAddClass={() => { setEditingClassType(null); setShowModal('class'); }}
          onEditClass={(c) => { setEditingClassType(c); setShowModal('class'); }}
          onRemoveClass={removeClassType}
          isStudentLinked={isStudentLinked}
          onAddSchedule={() => { setEditingSchedule(null); setShowModal('schedule'); }}
          onEditSchedule={(s) => { setEditingSchedule(s); setShowModal('schedule'); }}
          onRemoveSchedule={removeSchedule}
          onLogout={handleLogout}
          onRefreshStaff={() => loadCloudData(true)}
        />
      )}
    </div>
  );

  // ── Shared modals (rendered in both layouts) ─────────────────────────────────
  const sharedModals = (
    <AnimatePresence>
      {showAllLogs && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-[2.5rem] shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
          >
            <div className="flex justify-between items-center p-8 pb-6 bg-white dark:bg-slate-900 sticky top-0 z-10">
              <div>
                <h3 className="text-xl font-black italic uppercase text-slate-900 dark:text-white">Cycle Logs</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">All sessions for this period</p>
              </div>
              <button onClick={() => setShowAllLogs(false)} className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400 shadow-sm transition-all hover:bg-slate-100"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar px-8 pb-10 space-y-3">
              {(!state.sessions || state.sessions.length === 0) ? (
                <p className="text-center py-20 text-slate-400 text-[10px] font-black uppercase">No logs found</p>
              ) : (() => {
                const logs = [...(state.sessions || [])].sort((a, b) => {
                  const dateA = a.date ? new Date(a.date).getTime() : 0;
                  const dateB = b.date ? new Date(b.date).getTime() : 0;
                  if (dateB !== dateA) {
                    return dateB - dateA;
                  }
                  const createdA = a.created_at ? new Date(a.created_at).getTime() : 0;
                  const createdB = b.created_at ? new Date(b.created_at).getTime() : 0;
                  return createdB - createdA;
                });
                const grouped: (AttendanceSession & { groupIds?: string[] })[] = [];
                const seen = new Map<string, number>();

                logs.forEach(log => {
                  if (log.is_competition) {
                    const key = `${log.classTypeId}_${log.date}_comp`;
                    if (seen.has(key)) {
                      const index = seen.get(key)!;
                      if (!grouped[index].groupIds) grouped[index].groupIds = [grouped[index].id];
                      grouped[index].groupIds?.push(log.id);
                    } else {
                      seen.set(key, grouped.length);
                      grouped.push({ ...log, groupIds: [log.id] });
                    }
                  } else {
                    grouped.push(log);
                  }
                });

                return grouped.map((session, idx) => {
                  const ct = (state.classTypes || []).find(c => c.id === session.classTypeId);
                  const gym = (state.gyms || []).find(g => g.id === session.classTypeId);
                  return (
                    <motion.div key={`${session.id}-${idx}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-2xl">
                      <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-[#1e4da1] dark:text-blue-400 shrink-0 shadow-sm">
                        {gym ? <Building2 size={18} /> : ((session.studentIds?.length || 0) > 1 ? <Users size={18} /> : <User size={18} />)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="text-sm font-black text-[#1a1a1a] dark:text-slate-100 italic uppercase break-words leading-tight">
                            {(() => {
                              const baseName = ct?.name || gym?.name || 'Session';
                              const hasCompInName = baseName.toLowerCase().includes('competition');
                              const mainName = `${baseName}${session.is_competition && !hasCompInName ? ' Competition' : ''}`;
                              return session.custom_event_name ? `${mainName} (${session.custom_event_name})` : mainName;
                            })()}
                          </p>
                          {session.is_competition && <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest shrink-0">Comp</span>}
                        </div>
                        <p className="text-[9px] font-bold text-[#94a3b8] uppercase mt-0.5">{new Date(session.date).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => { setShowAllLogs(false); startEditSession(session); }} className="p-2 bg-white dark:bg-slate-700 text-slate-400 rounded-lg shadow-sm border border-slate-100 dark:border-slate-600"><Pencil size={12} /></button>
                        <button onClick={() => { if (window.confirm("Delete this log?")) removeSession(session.groupIds || session.id); }} className="p-2 bg-white dark:bg-slate-700 text-slate-400 rounded-lg shadow-sm border border-slate-100 dark:border-slate-600"><Trash2 size={12} /></button>
                      </div>
                    </motion.div>
                  );
                });
              })()}
            </div>
          </motion.div>
        </div>
      )}

      {showModal && (
        <Modal
          title={
            showModal === 'student' ? (editingStudent ? "Athlete Profile" : "New Athlete") :
              showModal === 'student_gym' ? "New Gym Athlete" :
                showModal === 'gym' ? (editingGym?.id ? (editingGym.gym_type === 'cheer' ? "Team Info" : "Gym Info") : (editingGym?.gym_type === 'cheer' ? "New Cheer Team" : "New Gym")) :
                  showModal === 'class' ? "Class Details" :
                    showModal === 'schedule' ? (editingSchedule ? "Edit Schedule" : "New Schedule") : ""
          }
          onClose={() => { setShowModal(null); setEditingStudent(null); setEditingGym(null); setEditingClassType(null); setEditingSchedule(null); }}>
          {showModal === 'student' || showModal === 'student_gym' ? (
            <AthleteProfileModal 
              otherStudents={(state.students || []).filter(s => s.id !== editingStudent?.id)} 
              initialData={editingStudent || undefined} 
              initialExtra={editingExtra}
              onSubmit={handleSaveStudent} 
              onDelete={removeStudent} 
              onCancel={() => setShowModal(null)} 
            />
          ) : showModal === 'gym' ? (
            <GymProfileModal state={state} initialData={editingGym || undefined} onSubmit={handleSaveGym} onDelete={removeGym} onCancel={() => setShowModal(null)} />
          ) : showModal === 'class' ? (
            <ClassTypeForm students={state.students || []} gyms={state.gyms || []} staff={state.staff || []} isOwner={state.profile.role === 'owner'} initialData={editingClassType || undefined} onSubmit={handleSaveClassType} onCancel={() => setShowModal(null)} />
          ) : showModal === 'schedule' ? (
            <ScheduleForm
              students={state.students || []}
              classTypes={state.classTypes || []}
              gyms={state.gyms || []}
              staff={state.staff || []}
              isOwner={state.profile.role === 'owner'}
              initialData={editingSchedule || undefined}
              onSubmit={handleSaveSchedule}
              onCancel={() => setShowModal(null)}
              onDelete={editingSchedule ? (id) => { removeSchedule(id); setShowModal(null); } : undefined}
            />
          ) : null}
        </Modal>
      )}
      {showBulkImport && (
        <Modal title="Bulk Import Athletes" onClose={() => setShowBulkImport(false)}>
          <BulkImportModal onImport={handleBulkImportAthletes} onCancel={() => setShowBulkImport(false)} />
        </Modal>
      )}
      {showSignupModal && (
        <ShareSignupLink 
          onClose={() => setShowSignupModal(false)} 
          ownerId={state.profile?.role === 'owner' ? user?.id : state.profile?.owner_id}
        />
      )}
      {quickLogModalData && (
        <Modal title="Quick Log Session" onClose={() => setQuickLogModalData(null)}>
          <QuickLogModal
            state={state}
            classIds={quickLogModalData.classIds}
            date={quickLogModalData.date}
            coachId={quickLogModalData.coachId}
            athleteIds={quickLogModalData.athleteIds}
            onConfirm={async (classTypeIdOrData, studentIds, date, hours, coachId, isCompetition) => {
              await handleLogSession(classTypeIdOrData, studentIds, date, hours, coachId, isCompetition);
              setQuickLogModalData(null);
            }}
            onCancel={() => setQuickLogModalData(null)}
          />
        </Modal>
      )}
      {showSettingsModal && (
        <AppSettingsModal 
          state={state} 
          toggleTheme={toggleTheme} 
          onLogout={handleLogout} 
          onLinkGoogle={handleLinkGoogle}
          onClose={() => setShowSettingsModal(false)} 
          onShowRecovery={() => setShowRecoveryModal(true)} 
        />
      )}
      {isResetConfirming && <ArchiveModal state={state} archiveMonth={archiveMonth} archiveYear={archiveYear} setArchiveMonth={setArchiveMonth} setArchiveYear={setArchiveYear} onConfirm={resetMonth} onCancel={() => setIsResetConfirming(false)} />}

      {resetConfirmation && (
        <Modal title="Confirm Reset" onClose={() => setResetConfirmation(null)}>
          <div className="space-y-6 p-2">
            <div className="flex items-center gap-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-800">
              <AlertTriangle className="text-amber-600 dark:text-amber-400 shrink-0" size={24} />
              <p className="text-sm text-amber-800 dark:text-amber-200 font-medium leading-relaxed">
                This will archive all sessions for <span className="font-black italic">{resetConfirmation.label}</span> to history and clear them from the current active logs.
              </p>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed px-1">A safety backup will be created automatically before the reset. You can restore this data later if needed.</p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setResetConfirmation(null)} className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
              <button onClick={() => { executeResetSingleInvoice(resetConfirmation.familyId, resetConfirmation.label); setResetConfirmation(null); }} className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-200 dark:shadow-none hover:bg-red-700 transition-all">Confirm Reset</button>
            </div>
          </div>
        </Modal>
      )}

      {showRecoveryModal && (
        <Modal title="Recover Invoice Data" onClose={() => setShowRecoveryModal(false)}>
          <div className="space-y-4 p-2 max-h-[70vh] overflow-y-auto no-scrollbar">
            {state.snapshots && state.snapshots.length > 0 ? (
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 px-1">Available Backups (Last 5)</p>
                {state.snapshots.map((snap, idx) => (
                  <div key={snap.id || `snap-${idx}`} className="p-4 bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-[#1e4da1] transition-all group">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-sm font-black text-slate-900 dark:text-white mb-1">{snap.label}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{snap.snapshot_data.sessions.length} Sessions · {snap.snapshot_data.payments.length} Payments</p>
                      </div>
                      <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-[#1e4da1] dark:text-blue-400"><History size={16} /></div>
                    </div>
                    <button onClick={() => restoreInvoiceSnapshot(snap)} className="w-full py-3 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:opacity-90 transition-all">Restore This Snapshot</button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center space-y-4">
                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mx-auto"><History size={24} className="text-slate-300" /></div>
                <p className="text-sm text-slate-400 font-bold uppercase tracking-wider">No backups found yet</p>
              </div>
            )}
          </div>
        </Modal>
      )}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 20, x: '-50%' }}
            exit={{ opacity: 0, y: -50, x: '-50%' }}
            className="fixed top-0 left-1/2 z-[9999] w-[90%] max-w-md bg-[#1e4da1] text-white p-4 rounded-2xl shadow-2xl border border-white/20 flex items-start gap-3"
          >
            <div className="bg-white/20 p-2 rounded-xl">
              <Bell size={18} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Notification</p>
              <p className="font-black text-sm italic">{toast.title}</p>
              <p className="text-xs opacity-90 mt-0.5">{toast.body}</p>
            </div>
            <button onClick={() => setToast(null)} className="opacity-40 hover:opacity-100">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {showNotifications && (
        <NotificationsModal 
          notifications={state.notifications} 
          onClose={() => setShowNotifications(false)} 
          onMarkRead={markNotificationRead}
          onClear={clearNotifications}
        />
      )}
    </AnimatePresence>
  );

  // ── Desktop layout ────────────────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <div className={`flex h-screen w-screen overflow-hidden bg-[#f0f4f8] dark:bg-[#07090f] transition-colors duration-300`}>
        <OfflineBanner isOnline={isOnline} />
        <DesktopSidebar
          activeView={activeView}
          onNav={(v) => { if (v === View.REGISTER) setEditingSession(null); handleViewChange(v); }}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(p => !p)}
          theme={state.theme}
          onSettings={() => setShowSettingsModal(true)}
          onArchive={() => { setArchiveMonth(MONTHS[new Date().getMonth()]); setArchiveYear(new Date().getFullYear()); setIsResetConfirming(true); }}
          isSyncing={isSyncing}
          sessionCount={state.sessions?.length || 0}
          businessName={state.profile.businessName}
        />

        {/* Content panel */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Desktop top bar */}
          <header className="shrink-0 flex items-center justify-between px-8 py-4 bg-white/80 dark:bg-[#0d1117]/90 backdrop-blur border-b border-slate-200/60 dark:border-white/5 print:hidden">
            <div>
              <h2 className="text-lg font-black italic uppercase tracking-tight text-slate-800 dark:text-white">
                {activeView === View.DASHBOARD ? 'Dashboard' :
                  activeView === View.LOG_SESSION ? 'Log Session' :
                  activeView === View.REGISTER ? 'Log Classes' :
                  activeView === View.TEAM_ATTENDANCE ? 'Team Attendance' :
                  activeView === View.GYM_ATTENDANCE ? 'Gym Attendance' :
                  activeView === View.TEAM_MANAGEMENT ? 'Team Management' :
                  activeView === View.INVOICES ? 'Invoices' :
                  activeView === View.HISTORY ? (selectedHistoryMonth ? `${selectedHistoryMonth.monthName} ${selectedHistoryMonth.year}` : 'History') :
                  activeView === View.STATISTICS ? 'Statistics' :
                  activeView === View.ROSTER ? 'Setup' : ''}
              </h2>
              <p className="text-[9px] font-bold tracking-[0.12em] uppercase text-slate-400 dark:text-slate-500 mt-0.5">JFLIPS V4 · Stunting & Tumbling Assistant</p>
            </div>
            <div className="flex items-center gap-3">
              <SyncStatusBadge />
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${isSyncing ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400' : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-blue-400 animate-pulse' : 'bg-emerald-400'}`} />
                {isSyncing ? 'Syncing…' : `${state.sessions?.length || 0} Logs`}
              </div>
              {isOwner && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowSignupModal(true)}
                  className="p-2 bg-blue-50 dark:bg-blue-900/20 text-[#1e4da1] dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all"
                  title="Parent Signup Link"
                  aria-label="Parent Signup Link"
                >
                  <Users size={16} />
                </motion.button>
              )}
              {isOwner && (
                <motion.button 
                  whileTap={{ scale: 0.9 }} 
                  onClick={() => setShowNotifications(true)} 
                  className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all relative"
                  aria-label="Notifications"
                >
                  <Bell size={16} />
                  {state.notifications.some(n => !n.is_read) && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-800" />
                  )}
                </motion.button>
              )}

              {activeView === View.ROSTER && (
                <motion.button whileTap={{ scale: 0.9 }} aria-label="Settings" onClick={() => setShowSettingsModal(true)} className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"><Settings size={16} /></motion.button>
              )}
            </div>
          </header>

          {/* Scrollable content */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden px-8 py-6 print:p-0">
            <div className="max-w-5xl mx-auto">
              {viewContent}
            </div>
          </main>
        </div>

        {sharedModals}
      </div>
    );
  }

  // ── Mobile layout (original, unchanged) ──────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto relative bg-[#f8fafc] dark:bg-[#07090f] transition-colors duration-300">
      <OfflineBanner isOnline={isOnline} />
      <header className="px-6 pt-8 pb-3 sticky top-0 z-20 bg-[#f8fafc] dark:bg-[#07090f] print:hidden">
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-[1000] italic text-[#1e4da1] dark:text-blue-400 tracking-tight animate-roll-in">JFLIPS</h1>
              {activeView === View.ROSTER && (
                <motion.button whileTap={{ scale: 0.8 }} onClick={() => setShowSettingsModal(true)} className="p-1.5 bg-white dark:bg-slate-800 text-[#1e4da1] dark:text-blue-400 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 transition-all"><Settings size={18} strokeWidth={2.5} /></motion.button>
              )}
            </div>
            <p className="text-[#94a3b8] dark:text-slate-400 text-[9px] font-bold tracking-[0.1em] uppercase mt-0.5">Stunting & Tumbling Assistant</p>
          </div>
          <div className="flex items-center gap-2">
            {isOwner && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowSignupModal(true)}
                className="w-10 h-10 flex items-center justify-center bg-blue-50 dark:bg-blue-900/20 text-[#1e4da1] dark:text-blue-400 rounded-full shadow-sm border border-blue-100 dark:border-blue-900 transition-all"
                title="Parent Signup Link"
              >
                <Users size={18} />
              </motion.button>
            )}
            {isOwner && (
              <motion.button 
                whileTap={{ scale: 0.9 }} 
                onClick={() => setShowNotifications(true)} 
                className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-800 text-[#94a3b8] rounded-full hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm border border-slate-100 dark:border-slate-700 relative"
              >
                <Bell size={18} />
                {state.notifications.some(n => !n.is_read) && (
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-800" />
                )}
              </motion.button>
            )}
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => { setArchiveMonth(MONTHS[new Date().getMonth()]); setArchiveYear(new Date().getFullYear()); setIsResetConfirming(true); }} className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-800 text-[#94a3b8] rounded-full hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm border border-slate-100 dark:border-slate-700"><RotateCcw size={18} /></motion.button>
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-3 justify-between">
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full transition-colors ${isSyncing ? 'bg-blue-400 animate-pulse' : 'bg-[#1e4da1] dark:bg-blue-400'}`}></div>
            <span className="text-[#1e4da1] dark:text-blue-400 text-[10px] font-black uppercase tracking-widest">{isSyncing ? 'Syncing...' : `${state.sessions?.length || 0} Cloud Logs`}</span>
          </div>
          <SyncStatusBadge />
        </div>
      </header>

      <main className="flex-1 px-6 pb-28 relative z-0 print:p-0 print:m-0 print:overflow-visible overflow-x-hidden min-h-[50vh]">
        <div className="w-full">
          {viewContent}
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white dark:bg-[#0d1117] border-t border-slate-100 dark:border-white/5 flex justify-between items-center py-2 px-4 z-30 print:hidden transition-colors duration-300">
        <NavButton active={activeView === View.DASHBOARD} icon={<LayoutDashboard size={18} />} label="Home" onClick={() => handleViewChange(View.DASHBOARD)} />
        <NavButton active={activeView === View.LOG_SESSION} icon={<ClipboardCheck size={18} />} label="Log" onClick={() => { setEditingSession(null); handleViewChange(View.LOG_SESSION); }} />
        <NavButton active={activeView === View.TEAM_MANAGEMENT} icon={<Settings size={18} />} label="Mgmt" onClick={() => handleViewChange(View.TEAM_MANAGEMENT)} />
        {/* Coaches see their own invoice tab; owners see invoices + history */}
        <NavButton active={activeView === View.INVOICES} icon={<FileText size={18} />} label={isOwner ? "Invs" : "My Pay"} onClick={() => handleViewChange(View.INVOICES)} />
        {isOwner && (
          <NavButton active={activeView === View.HISTORY} icon={<History size={18} />} label="Hist" onClick={() => handleViewChange(View.HISTORY)} />
        )}
        <NavButton active={activeView === View.ROSTER} icon={<Settings2 size={18} />} label="Setup" onClick={() => handleViewChange(View.ROSTER)} />
      </nav>

      {sharedModals}
    </div>
  );
};

// --- LANDING GATE (wraps landing page + auth view) ---

const LandingGate: React.FC = () => {
  return <AuthView />;
};

// --- DEMO REQUEST MODAL ---

const DemoRequestModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [form, setForm] = useState({ name: '', club: '', athletes: '', whatsapp: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.name || !form.club || !form.whatsapp) return;
    setLoading(true);
    try {
      await fetch('https://formspree.io/f/xwvrvldn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name, club: form.club,
          athletes: form.athletes, whatsapp: form.whatsapp,
          _subject: `New JFLIPS Demo Request — ${form.club}`
        })
      });
    } catch (_) {}
    setLoading(false);
    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-end sm:items-center justify-center p-4">
      <motion.div
        initial={{ y: 60, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 60, opacity: 0 }}
        className="bg-[#0a0c14] border border-white/10 w-full max-w-md rounded-[2rem] overflow-hidden shadow-2xl"
      >
        {submitted ? (
          <div className="p-10 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-900/30 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
              <svg width="28" height="28" fill="none" stroke="#34d399" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <h3 className="text-xl font-black uppercase italic text-white">Request Received!</h3>
            <p className="text-white/40 text-sm leading-relaxed">
              Thanks {form.name.split(' ')[0]}. We'll send your demo link to WhatsApp within 24 hours.
            </p>
            <button onClick={onClose} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors mt-2">Got It</button>
          </div>
        ) : (
          <>
            <div className="p-6 border-b border-white/5 flex justify-between items-start">
              <div>
                <h3 className="font-black text-lg uppercase italic text-white">Request Your Demo</h3>
                <p className="text-[10px] text-white/30 font-black uppercase tracking-widest mt-1">We'll set it up personally</p>
              </div>
              <button onClick={onClose} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {[
                { key: 'name', label: 'Your Name', placeholder: 'Jane Smith', type: 'text' },
                { key: 'club', label: 'Gym Name', placeholder: 'Elite Cheer Academy', type: 'text' },
                { key: 'athletes', label: 'Approx. Athletes', placeholder: '25', type: 'number' },
                { key: 'whatsapp', label: 'WhatsApp Number', placeholder: '071 234 5678', type: 'tel' },
              ].map(field => (
                <div key={field.key} className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/30 ml-1">{field.label}</label>
                  <input
                    type={field.type}
                    placeholder={field.placeholder}
                    value={form[field.key as keyof typeof form]}
                    onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                    className="w-full bg-white/5 border border-white/8 focus:border-blue-500/50 rounded-xl py-3.5 px-4 text-sm text-white placeholder-white/20 outline-none transition-colors font-medium"
                  />
                </div>
              ))}
              <button
                onClick={handleSubmit}
                disabled={loading || !form.name || !form.club || !form.whatsapp}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-black text-[11px] uppercase tracking-widest transition-all mt-2 flex items-center justify-center gap-2"
              >
                {loading
                  ? <Loader2 size={16} className="animate-spin" />
                  : <>Send Request <ArrowRight size={16} /></>
                }
              </button>
              <p className="text-[9px] text-white/20 text-center font-bold">No commitment · No credit card</p>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

// --- 3D CANVAS BACKGROUND ---

const ThreeDCanvas: React.FC<{ scrollY: number }> = ({ scrollY }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const animRef = React.useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const GRID = 16;
    const SPACING = 75;
    const FOCAL = 600;

    const project3D = (x: number, y: number, z: number) => {
      const scale = FOCAL / (FOCAL + z);
      return { sx: canvas.width / 2 + x * scale, sy: canvas.height / 2 + y * scale, scale };
    };

    const render = (timestamp: number) => {
      const t = timestamp * 0.0005;
      const scrollOffset = scrollY * 0.002;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = -GRID; i <= GRID; i++) {
        for (let j = -GRID; j <= GRID; j++) {
          const xi = i * SPACING * 0.6;
          const yi = j * SPACING * 0.6;
          const zi = Math.sin(i * 0.3 + t) * 120 + Math.cos(j * 0.3 + t * 0.7) * 80;
          const ry = t * 0.15 + scrollOffset;
          const rx = scrollOffset * 0.3 + 0.2;
          const cosY = Math.cos(ry), sinY = Math.sin(ry);
          const cosX = Math.cos(rx), sinX = Math.sin(rx);
          let x = xi * cosY - zi * sinY;
          let z = xi * sinY + zi * cosY;
          let y = yi * cosX - z * sinX;
          z = yi * sinX + z * cosX;
          if (z > -FOCAL + 50) {
            const { sx, sy, scale } = project3D(x, y, z);
            if (sx < 0 || sx > canvas.width || sy < 0 || sy > canvas.height) continue;
            const depth = (z + 400) / 800;
            const alpha = Math.max(0, Math.min(0.3, depth * 0.3));
            const size = Math.max(0.5, scale * 1.5);
            ctx.beginPath();
            ctx.arc(sx, sy, size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(56, 139, 253, ${alpha})`;
            ctx.fill();
          }
        }
      }

      ctx.strokeStyle = 'rgba(56, 139, 253, 0.035)';
      ctx.lineWidth = 0.5;
      for (let k = 0; k < 6; k++) {
        const phase = (k / 6) * Math.PI * 2;
        const radius = 280 + k * 70;
        ctx.beginPath();
        for (let a = 0; a < Math.PI * 2; a += 0.05) {
          const r = radius + Math.sin(a * 3 + t + phase) * 30;
          const sx = canvas.width / 2 + Math.cos(a) * r;
          const sy = canvas.height / 2 + Math.sin(a) * r * 0.28 + scrollY * 0.04;
          if (a === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
        }
        ctx.closePath();
        ctx.stroke();
      }

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);
    return () => {
      window.removeEventListener('resize', resize);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [scrollY]);

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full pointer-events-none z-0" style={{ opacity: 0.55 }} />;
};

// --- GLITCH TEXT ---

const GlitchText: React.FC<{ text: string; className?: string }> = ({ text, className }) => {
  const [glitching, setGlitching] = useState(false);
  useEffect(() => {
    const iv = setInterval(() => { setGlitching(true); setTimeout(() => setGlitching(false), 140); }, 4500);
    return () => clearInterval(iv);
  }, []);
  return (
    <span className={`relative inline-block ${className || ''}`} style={{
      textShadow: glitching ? '2px 0 #3b82f6, -2px 0 #f43f5e, 0 0 20px rgba(59,130,246,0.5)' : '0 0 40px rgba(59,130,246,0.12)',
      transition: 'text-shadow 0.05s',
      filter: glitching ? 'hue-rotate(15deg)' : 'none',
    }}>{text}</span>
  );
};

// --- SCROLL PROGRESS BAR ---

const ScrollProgressBar: React.FC = () => {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const handler = () => {
      const el = document.documentElement;
      setProgress(el.scrollTop / (el.scrollHeight - el.clientHeight));
    };
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);
  return (
    <div className="fixed top-0 left-0 right-0 h-[2px] bg-[#0a0c14] z-[100]">
      <div className="h-full bg-blue-500 origin-left transition-none" style={{ transform: `scaleX(${progress})` }} />
    </div>
  );
};

// --- HORIZONTAL MARQUEE ---

const Marquee: React.FC<{ items: string[] }> = ({ items }) => (
  <div className="overflow-hidden py-5 border-y border-white/5 bg-[#060810]/80 backdrop-blur-sm">
    <motion.div
      animate={{ x: ['0%', '-50%'] }}
      transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
      className="flex gap-16 whitespace-nowrap"
    >
      {[...items, ...items].map((item, i) => (
        <span key={i} className="text-[9px] font-black uppercase tracking-[0.5em] text-white/18 flex items-center gap-6">
          {item}
          <span className="w-1 h-1 bg-blue-500/35 rounded-full inline-block" />
        </span>
      ))}
    </motion.div>
  </div>
);

// --- 3D TILT CARD ---

const TiltCard: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({ children, delay = 0, className = '' }) => {
  const cardRef = React.useRef<HTMLDivElement>(null);
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    card.style.transform = `perspective(900px) rotateY(${x * 12}deg) rotateX(${-y * 12}deg) translateZ(6px)`;
  };
  const handleMouseLeave = () => {
    if (cardRef.current) cardRef.current.style.transform = 'perspective(900px) rotateY(0deg) rotateX(0deg) translateZ(0px)';
  };
  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ transition: 'transform 0.1s ease', transformStyle: 'preserve-3d' }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// --- SECTION TITLE ---

const SectionTitle: React.FC<{ eyebrow: string; title: string; accent: string; sub?: string }> = ({ eyebrow, title, accent, sub }) => (
  <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="text-center mb-20">
    <p className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-400 mb-4 flex items-center justify-center gap-3">
      <span className="w-8 h-px bg-blue-500/35" />{eyebrow}<span className="w-8 h-px bg-blue-500/35" />
    </p>
    <h2 className="text-5xl md:text-7xl font-black leading-[0.88] tracking-tighter uppercase mb-6">
      <span className="text-white">{title} </span>
      <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">{accent}</span>
    </h2>
    {sub && <p className="text-white/28 max-w-xl mx-auto text-sm font-medium leading-relaxed">{sub}</p>}
  </motion.div>
);

// --- LANDING PAGE 3D ---

const LandingPage3D: React.FC<{ onSignIn: () => void }> = ({ onSignIn }) => {
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [heroParallax, setHeroParallax] = useState({ y: 0, opacity: 1, scale: 1 });

  useEffect(() => {
    const handler = () => {
      const sy = window.scrollY;
      setScrollY(sy);
      setScrolled(sy > 50);
      const prog = Math.min(sy / (window.innerHeight * 0.5), 1);
      setHeroParallax({ y: -sy * 0.25, opacity: 1 - prog * 0.85, scale: 1 - prog * 0.08 });
    };
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const features = [
    { icon: <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>, title: 'Instant Session Logging', desc: 'Log attendance in seconds. Mark athletes present or absent, assign coaches, and track sessions before leaving the mat.' },
    { icon: <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>, title: 'Auto Invoicing', desc: 'Sessions logged during the month are automatically turned into accurate invoices for every athlete, team, or gym. Send via WhatsApp or download PDFs in one click.' },
    { icon: <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>, title: 'Multi-Coach Access', desc: 'Add coaches with controlled permissions. They only see the gyms, teams, and classes you assign them.' },
    { icon: <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>, title: '100% Your Brand', desc: 'Your logo. Your name. Your gym. A fully branded system that looks professional to parents and athletes.' },
    { icon: <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>, title: 'Revenue Analytics', desc: 'Track paid invoices, monthly income, yearly growth, and revenue trends with simple dashboards.' },
    { icon: <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>, title: 'Offline Ready', desc: 'No internet? Keep working as normal. Sessions sync automatically when you reconnect.' },
  ];

  const stats = [
    { value: '~8 hrs', label: 'Admin saved weekly' },
    { value: 'R0', label: 'Spreadsheet costs' },
    { value: '100%', label: 'Your branding' },
    { value: 'SA-Built', label: 'For local gyms' },
  ];

  const steps = [
    { num: '01', title: 'Request Demo', desc: 'Fill a short form. We build a live demo that looks like your actual gym.' },
    { num: '02', title: 'See It Live', desc: 'Explore at your pace or join a 15-min walkthrough call.' },
    { num: '03', title: 'We Configure', desc: 'Your logo, teams, roster, coaches — we set it all up for you.' },
    { num: '04', title: 'Go Live', desc: 'Start logging. Invoices generate. Spreadsheets become history.' },
  ];

  const pricing = [
    { tier: 'Basic', price: 'R299', desc: 'Per month', items: ['Attendance tracking', 'Quick invoices', 'Up to 50 athletes', 'Standard app interface'], highlight: false },
    { tier: 'Pro', price: 'R499', desc: 'Per month', items: ['All core app features', 'Quick invoices', 'Up to 100 athletes', 'Standard app interface'], highlight: true },
    { tier: 'Custom', price: 'Let\'s Talk', desc: 'Custom tailored pricing', items: ['All app features', 'Unlimited athletes', 'Fully tailored branding', 'Optional gym website'], highlight: false },
  ];

  return (
    <div className="min-h-screen bg-[#060810] text-white overflow-x-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      <AnimatePresence>
        {showDemoModal && <DemoRequestModal onClose={() => setShowDemoModal(false)} />}
      </AnimatePresence>

      <ThreeDCanvas scrollY={scrollY} />

      {/* Fixed ambient glow */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 20%, rgba(29,78,216,0.10) 0%, transparent 70%)', transition: 'opacity 0.5s', opacity: scrolled ? 0.5 : 1 }} />

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-500" style={{ background: scrolled ? 'rgba(6,8,16,0.88)' : 'transparent', backdropFilter: scrolled ? 'blur(20px)' : 'none', borderBottom: scrolled ? '1px solid rgba(255,255,255,0.04)' : '1px solid transparent' }}>
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} className="flex items-center gap-3">
            <span className="text-2xl font-black italic tracking-tight text-white">JFLIPS</span>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="hidden md:flex items-center gap-8">
            {['Features', 'How It Works', 'Pricing'].map(label => (
              <a key={label} href={`#${label.toLowerCase().replace(/ /g, '-')}`}
                onClick={e => { e.preventDefault(); document.getElementById(label.toLowerCase().replace(/ /g, '-'))?.scrollIntoView({ behavior: 'smooth' }); }}
                className="text-[10px] font-black uppercase tracking-widest text-white/28 hover:text-white transition-all duration-300">{label}</a>
            ))}
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} className="flex items-center gap-3">
            <button onClick={onSignIn} className="hidden sm:block px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white/28 hover:text-white transition-colors">Sign In</button>
            <button onClick={() => setShowDemoModal(true)} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all hover:scale-[1.02] active:scale-[0.98]">Request Demo</button>
          </motion.div>
        </div>
      </nav>

      {/* HERO */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ transform: `translateY(${heroParallax.y}px) scale(${heroParallax.scale})`, opacity: heroParallax.opacity, transition: 'none' }}>
        <div className="max-w-5xl mx-auto pt-32 pb-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-blue-500/8 border border-blue-500/15 rounded-full mb-10">
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-300">Built for Gyms</span>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.1, ease: [0.16, 1, 0.3, 1] }} className="text-[clamp(3.2rem,10vw,7.5rem)] font-black leading-[0.85] tracking-tighter uppercase mb-8">
            <span className="block text-white">Your Gym.</span>
            <span className="block">
              <GlitchText text="Run Smarter." className="text-transparent bg-clip-text bg-gradient-to-br from-blue-300 via-blue-400 to-blue-600" />
            </span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }} className="text-white/32 text-base md:text-lg font-medium max-w-2xl mx-auto leading-relaxed mb-3">
            JFLIPS is a fully branded gym management app built specifically for your gym or school. Attendance, invoicing, rosters — all under your name.
          </motion.p>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-white/14 text-sm max-w-lg mx-auto mb-14 font-medium">
            Not a generic platform. A custom-built tool for your gym, your coaches, and your athletes.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.5 }} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => setShowDemoModal(true)} className="group relative px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all duration-300 flex items-center gap-3 shadow-xl shadow-blue-900/40 hover:shadow-blue-900/60 hover:scale-[1.02] active:scale-[0.98]">
              Request a Free Demo
              <svg className="group-hover:translate-x-1 transition-transform" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
            <button onClick={onSignIn} className="px-8 py-4 text-white/24 hover:text-white font-black text-sm uppercase tracking-widest transition-all duration-300 flex items-center gap-2">
              Client Sign In <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </motion.div>
        </div>
      </div>

      {/* MARQUEE */}
      <div className="relative z-10 mt-20">
        <Marquee items={['Attendance Tracking','Auto Invoicing','Team Management','Coach Access','Competition Logs','Revenue Analytics','Offline Sync','Custom Branding']} />
      </div>

      {/* STATS */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-5">
          {stats.map((s, i) => (
            <TiltCard key={i} delay={i * 0.08} className="text-center p-8 bg-white/3 border border-white/5 rounded-3xl">
              <p className="text-3xl font-black italic text-blue-400 mb-2">{s.value}</p>
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/22">{s.label}</p>
            </TiltCard>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="relative z-10 py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <SectionTitle eyebrow="What You Get" title="Built For" accent="Your Gym" sub="Everything a gym owner needs — none of what they don't. Purpose-built for any gym to manage attendance and easily prepare monthly invoicing." />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <TiltCard key={i} delay={i * 0.07}>
                <div className="group relative overflow-hidden rounded-3xl p-7 border border-white/6 hover:border-white/12 transition-all duration-500 cursor-default h-full" style={{ background: 'linear-gradient(135deg, rgba(10,12,20,0.82), rgba(8,10,17,0.96))' }}>
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.055) 0%, transparent 70%)' }} />
                  <div className="relative z-10">
                    <div className="w-14 h-14 bg-blue-500/10 border border-blue-500/14 rounded-2xl flex items-center justify-center text-blue-400 mb-6 group-hover:bg-blue-500/16 transition-colors">{f.icon}</div>
                    <h3 className="text-base font-black uppercase italic tracking-tight text-white mb-3 leading-tight">{f.title}</h3>
                    <p className="text-[13px] text-white/32 leading-relaxed font-medium">{f.desc}</p>
                  </div>
                </div>
              </TiltCard>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="relative z-10 py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <SectionTitle eyebrow="The Process" title="How It" accent="Works" />
          <div className="relative">
            <div className="hidden lg:block absolute top-14 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/18 to-transparent" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {steps.map((step, i) => (
                <TiltCard key={i} delay={i * 0.1}>
                  <div className="relative p-8 rounded-3xl bg-[#0a0c14] border border-white/5 hover:border-white/10 transition-all duration-500">
                    <div className="text-[80px] font-black italic text-white/3 leading-none absolute -top-2 -right-2 select-none pointer-events-none">{step.num}</div>
                    <div className="relative z-10">
                      <div className="w-10 h-10 bg-blue-500/14 border border-blue-500/18 rounded-xl flex items-center justify-center text-blue-400 font-black text-[11px] uppercase mb-6">{step.num}</div>
                      <h3 className="text-base font-black uppercase italic text-white mb-3">{step.title}</h3>
                      <p className="text-[12px] text-white/32 leading-relaxed font-medium">{step.desc}</p>
                    </div>
                  </div>
                </TiltCard>
              ))}
            </div>
          </div>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.4 }} className="text-center mt-16">
            <button onClick={() => setShowDemoModal(true)} className="group px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all inline-flex items-center gap-3 hover:scale-[1.02]">
              Start With Step 01 <svg className="group-hover:translate-x-1 transition-transform" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </motion.div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="relative z-10 py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <SectionTitle eyebrow="Transparent Pricing" title="Simple," accent="Honest" sub="Choose the plan that best fits your gym's size and needs." />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pricing.map((tier, i) => (
              <TiltCard key={i} delay={i * 0.1}>
                <div className={`relative rounded-3xl p-8 border h-full flex flex-col ${tier.highlight ? 'border-blue-500/28 bg-blue-500/4' : 'border-white/5 bg-[#0a0c14]'}`} style={tier.highlight ? { boxShadow: '0 0 60px rgba(59,130,246,0.07), inset 0 0 60px rgba(59,130,246,0.03)' } : {}}>
                  {tier.highlight && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[8px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full">Most Popular</div>}
                  <div className="mb-8">
                    <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/22 mb-3">{tier.tier}</p>
                    <p className={`text-4xl font-black italic mb-1 ${tier.highlight ? 'text-blue-400' : 'text-white'}`}>{tier.price}</p>
                    <p className="text-[10px] text-white/18 font-bold uppercase">{tier.desc}</p>
                  </div>
                  <ul className="space-y-3 mb-8 flex-1">
                    {tier.items.map((item, j) => (
                      <li key={j} className="flex items-center gap-3 text-[11px] font-medium text-white/38">
                        <svg width="14" height="14" fill="none" stroke={tier.highlight ? '#60a5fa' : '#334155'} strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                        {item}
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => setShowDemoModal(true)} className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${tier.highlight ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-white/4 hover:bg-white/8 text-white/38 border border-white/7'}`}>Request Demo</button>
                </div>
              </TiltCard>
            ))}
          </div>
          <p className="text-center text-[9px] text-white/9 font-bold uppercase mt-8 tracking-widest">All pricing in ZAR · Invoiced monthly · Cancel anytime</p>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative z-10 py-28 px-6">
        <div className="max-w-3xl mx-auto">
          <TiltCard>
            <div className="relative overflow-hidden rounded-[3rem] p-14 text-center border border-white/5" style={{ background: 'linear-gradient(135deg, rgba(12,16,34,0.92) 0%, rgba(6,8,16,0.97) 100%)', boxShadow: '0 0 120px rgba(29,78,216,0.09), inset 0 0 120px rgba(29,78,216,0.025)' }}>
              <div className="relative z-10">
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-400 mb-6 flex items-center justify-center gap-3">
                  <span className="w-8 h-px bg-blue-500/35" />Ready to See It?<span className="w-8 h-px bg-blue-500/35" />
                </p>
                <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-white mb-6 leading-tight">See JFLIPS<br />For Your Gym</h2>
                <p className="text-white/22 mb-10 text-sm leading-relaxed max-w-md mx-auto font-medium">We'll build a live version pre-loaded with your gym's structure so you can see exactly what it looks like before committing.</p>
                <button onClick={() => setShowDemoModal(true)} className="group px-10 py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all inline-flex items-center gap-3 shadow-xl shadow-blue-900/40 hover:scale-[1.02]">
                  Request Your Free Demo
                  <svg className="group-hover:translate-x-1 transition-transform" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </button>
                <p className="text-white/9 text-[9px] font-bold uppercase mt-5 tracking-widest">No commitment · No credit card</p>
              </div>
            </div>
          </TiltCard>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-white/4 py-12 px-6 bg-[#030508]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <span className="font-black italic text-2xl text-white/13 tracking-tight">JFLIPS</span>
          </div>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/7">© {new Date().getFullYear()} JFLIPS · Custom Gym Management · South Africa</p>
          <button onClick={onSignIn} className="text-[9px] font-black uppercase tracking-widest text-white/9 hover:text-white/28 transition-colors">Client Sign In →</button>
        </div>
      </footer>

      <style>{`html { scroll-behavior: smooth; }`}</style>
    </div>
  );
};



// --- AUTH VIEW ---

const PendingCoachScreen: React.FC<{ email?: string; onLogout: () => void; onRefresh: () => void }> = ({ email, onLogout, onRefresh }) => {
  return (
    <div className="flex flex-col min-h-screen items-center justify-center p-6 bg-[#07090f] text-white">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md bg-[#0d1117] border border-amber-500/30 p-8 rounded-[2.5rem] shadow-2xl text-center space-y-6">
        <div className="w-16 h-16 bg-amber-500/10 text-amber-400 rounded-full flex items-center justify-center mx-auto border border-amber-500/30">
          <Clock size={32} />
        </div>
        <div>
          <h2 className="text-2xl font-black italic text-amber-400 uppercase tracking-tight">Pending Approval</h2>
          <p className="text-[10px] font-black uppercase text-white/40 tracking-widest mt-1">Waiting for Gym Owner Review</p>
        </div>
        <p className="text-xs text-white/70 leading-relaxed font-medium">
          Your coach registration for <span className="text-white font-bold">{email}</span> has been submitted successfully.
          Your gym owner must approve your account and assign your permissions before you can access the dashboard.
        </p>
        <div className="space-y-3 pt-2">
          <button onClick={onRefresh} className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3.5 rounded-2xl text-xs uppercase transition-all shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2 cursor-pointer">
            <RotateCcw size={16} /> Check Status
          </button>
          <button onClick={onLogout} className="w-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white font-black py-3.5 rounded-2xl text-xs uppercase transition-all flex items-center justify-center gap-2 cursor-pointer">
            <LogOut size={16} /> Log Out
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const RejectedCoachScreen: React.FC<{ email?: string; onLogout: () => void }> = ({ email, onLogout }) => {
  return (
    <div className="flex flex-col min-h-screen items-center justify-center p-6 bg-[#07090f] text-white">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md bg-[#0d1117] border border-rose-500/30 p-8 rounded-[2.5rem] shadow-2xl text-center space-y-6">
        <div className="w-16 h-16 bg-rose-500/10 text-rose-400 rounded-full flex items-center justify-center mx-auto border border-rose-500/30">
          <ShieldAlert size={32} />
        </div>
        <div>
          <h2 className="text-2xl font-black italic text-rose-400 uppercase tracking-tight">Access Declined</h2>
          <p className="text-[10px] font-black uppercase text-white/40 tracking-widest mt-1">Application Status</p>
        </div>
        <p className="text-xs text-white/70 leading-relaxed font-medium">
          Your coach registration request for <span className="text-white font-bold">{email}</span> was declined by the gym owner.
          If you believe this is a mistake, please reach out to your owner directly.
        </p>
        <button onClick={onLogout} className="w-full bg-white/5 hover:bg-white/10 text-white font-black py-3.5 rounded-2xl text-xs uppercase transition-all flex items-center justify-center gap-2 cursor-pointer">
          <LogOut size={16} /> Log Out
        </button>
      </motion.div>
    </div>
  );
};

const AuthView: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const [authMode, setAuthMode] = useState<'signin' | 'coach_signup' | 'owner_signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (authError) setError(authError.message);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleCoachSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!accessCode.trim()) {
        setError('Gym owner access code is required.');
        setLoading(false);
        return;
      }

      // 1. Validate Access Code against owner_profiles
      const { data: owner, error: codeErr } = await supabase
        .from('owner_profiles')
        .select('id, email, business_name')
        .eq('access_code', accessCode.trim().toUpperCase())
        .maybeSingle();

      if (codeErr || !owner) {
        setError('Invalid gym owner access code. Please verify the code with your owner.');
        setLoading(false);
        return;
      }

      // 2. Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      if (!authData.user) {
        setError('Registration failed to return user session.');
        setLoading(false);
        return;
      }

      // 3. Create staff_profiles row with status: 'pending'
      const { error: staffErr } = await supabase.from('staff_profiles').insert({
        id: authData.user.id,
        owner_id: owner.id,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        status: 'pending',
        can_view_tumbling: false,
        assigned_cheer_org_ids: []
      });

      if (staffErr) {
        setError(`Staff registration error: ${staffErr.message}`);
        setLoading(false);
        return;
      }

      // 4. Send email notification to owner via edge function
      try {
        const funcRes = await supabase.functions.invoke('send-staff-email', {
          body: {
            type: 'coach_registered',
            ownerEmail: owner.email,
            coachName: name.trim(),
            coachEmail: email.trim().toLowerCase(),
            businessName: owner.business_name
          }
        });
        if (funcRes.error || funcRes.data?.error) {
          console.warn('Owner email notification notice:', funcRes.error || funcRes.data?.error);
        }
      } catch (emailEx: any) {
        console.warn('Email trigger warning:', emailEx);
      }

      // Automatically sign in
      await supabase.auth.signInWithPassword({ email: email.trim(), password });
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  const handleOwnerSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      if (!authData.user) {
        setError('Registration failed.');
        setLoading(false);
        return;
      }

      const defaultKey = `JFLIPS-${Math.floor(1000 + Math.random() * 9000)}`;
      const { error: ownerErr } = await supabase.from('owner_profiles').insert({
        id: authData.user.id,
        email: email.trim().toLowerCase(),
        business_name: businessName.trim() || 'My Gym',
        access_code: defaultKey
      });

      if (ownerErr) {
        setError(`Owner profile creation error: ${ownerErr.message}`);
        setLoading(false);
        return;
      }

      await supabase.auth.signInWithPassword({ email: email.trim(), password });
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during owner registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen items-center justify-center p-6 bg-[#07090f]">
      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-6 left-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors cursor-pointer"
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back
        </button>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-6 bg-[#0d1117] border border-white/8 p-8 rounded-[2.5rem] shadow-2xl"
      >
        <div className="text-center">
          <h1 className="text-4xl font-[1000] italic text-blue-400 tracking-tighter mb-2">JFLIPS</h1>
          <p className="text-[10px] font-black uppercase text-white/40 tracking-[0.2em]">
            Gym Portal Access
          </p>
        </div>

        {/* Auth Mode Tabs */}
        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
          <button
            type="button"
            onClick={() => { setAuthMode('signin'); setError(null); }}
            className={`flex-1 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-wider transition-all cursor-pointer ${
              authMode === 'signin' ? 'bg-blue-600 text-white shadow-md' : 'text-white/40 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode('coach_signup'); setError(null); }}
            className={`flex-1 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-wider transition-all cursor-pointer ${
              authMode === 'coach_signup' ? 'bg-blue-600 text-white shadow-md' : 'text-white/40 hover:text-white'
            }`}
          >
            Coach Join
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode('owner_signup'); setError(null); }}
            className={`flex-1 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-wider transition-all cursor-pointer ${
              authMode === 'owner_signup' ? 'bg-blue-600 text-white shadow-md' : 'text-white/40 hover:text-white'
            }`}
          >
            Owner Register
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-xl text-red-400 text-[10px] font-bold uppercase text-center leading-relaxed">
            {error}
          </div>
        )}

        {authMode === 'signin' && (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[8px] font-black text-white/30 uppercase ml-4">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-white/5 border border-white/8 rounded-2xl py-3.5 pl-12 pr-4 text-xs font-bold outline-none text-white placeholder-white/20 focus:border-blue-500/50 transition-colors"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[8px] font-black text-white/30 uppercase ml-4">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/8 rounded-2xl py-3.5 pl-12 pr-4 text-xs font-bold outline-none text-white placeholder-white/20 focus:border-blue-500/50 transition-colors"
                  required
                />
              </div>
            </div>

            <div className="pt-2">
              <motion.button
                whileTap={{ scale: 0.95 }}
                disabled={loading}
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-black text-xs uppercase shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : 'Sign In'}
                {!loading && <ArrowRight size={18} />}
              </motion.button>
            </div>
          </form>
        )}

        {authMode === 'coach_signup' && (
          <form onSubmit={handleCoachSignUp} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-[8px] font-black text-white/30 uppercase ml-4">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Coach Name"
                  className="w-full bg-white/5 border border-white/8 rounded-2xl py-3.5 pl-12 pr-4 text-xs font-bold outline-none text-white placeholder-white/20 focus:border-blue-500/50 transition-colors"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[8px] font-black text-white/30 uppercase ml-4">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="coach@gym.com"
                  className="w-full bg-white/5 border border-white/8 rounded-2xl py-3.5 pl-12 pr-4 text-xs font-bold outline-none text-white placeholder-white/20 focus:border-blue-500/50 transition-colors"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[8px] font-black text-white/30 uppercase ml-4">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/8 rounded-2xl py-3.5 pl-12 pr-4 text-xs font-bold outline-none text-white placeholder-white/20 focus:border-blue-500/50 transition-colors"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[8px] font-black text-blue-400 uppercase ml-4">Gym Owner Access Code</label>
              <div className="relative">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400/50" size={16} />
                <input
                  type="text"
                  value={accessCode}
                  onChange={e => setAccessCode(e.target.value.toUpperCase())}
                  placeholder="JFLIPS-1234"
                  className="w-full bg-blue-950/30 border border-blue-500/30 rounded-2xl py-3.5 pl-12 pr-4 text-xs font-mono font-bold tracking-wider outline-none text-blue-300 placeholder-white/20 focus:border-blue-400 transition-colors uppercase"
                  required
                />
              </div>
            </div>

            <div className="pt-2">
              <motion.button
                whileTap={{ scale: 0.95 }}
                disabled={loading}
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-black text-xs uppercase shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : 'Register as Coach'}
                {!loading && <ArrowRight size={18} />}
              </motion.button>
            </div>
          </form>
        )}

        {authMode === 'owner_signup' && (
          <form onSubmit={handleOwnerSignUp} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-[8px] font-black text-white/30 uppercase ml-4">Gym / Business Name</label>
              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                <input
                  type="text"
                  value={businessName}
                  onChange={e => setBusinessName(e.target.value)}
                  placeholder="Apex Athletics Gym"
                  className="w-full bg-white/5 border border-white/8 rounded-2xl py-3.5 pl-12 pr-4 text-xs font-bold outline-none text-white placeholder-white/20 focus:border-blue-500/50 transition-colors"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[8px] font-black text-white/30 uppercase ml-4">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="owner@gym.com"
                  className="w-full bg-white/5 border border-white/8 rounded-2xl py-3.5 pl-12 pr-4 text-xs font-bold outline-none text-white placeholder-white/20 focus:border-blue-500/50 transition-colors"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[8px] font-black text-white/30 uppercase ml-4">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/8 rounded-2xl py-3.5 pl-12 pr-4 text-xs font-bold outline-none text-white placeholder-white/20 focus:border-blue-500/50 transition-colors"
                  required
                />
              </div>
            </div>

            <div className="pt-2">
              <motion.button
                whileTap={{ scale: 0.95 }}
                disabled={loading}
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-black text-xs uppercase shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : 'Register Gym Account'}
                {!loading && <ArrowRight size={18} />}
              </motion.button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
};


// --- HELPERS ---

  const getDayStatus = (day: number, month: number, year: number, state: AppState) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dow = new Date(year, month, day).getDay();
    
    const today = new Date();
    // Set today's time to 00:00:00 for accurate date comparison
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(year, month, day);

    const logged = (state.sessions || []).filter(s => s.date === dateStr);
    
    // If the date is in the past, we shouldn't show scheduled items unless they were logged
    const scheduled = (state.schedules || []).filter(s => s.day_of_week === dow);

    return { logged, scheduled };
  };

const StatusPips = ({ status, size = "w-1 h-1" }: { status: { logged: AttendanceSession[], scheduled: ClassSchedule[] }, size?: string }) => {
  const colorMap = new Map<string, boolean>();

  status.logged.forEach(ls => {
    const sched = status.scheduled.find(s => s.class_ids.includes(ls.classTypeId));
    const bg = sched?.color || 'bg-[#1e4da1]';
    colorMap.set(bg, true);
  });

  status.scheduled.forEach(s => {
    const allLogged = s.class_ids.every(cid => status.logged.some(ls => ls.classTypeId === cid));
    if (!allLogged) {
       const bg = s.color || 'bg-[#1e4da1]';
       if (!colorMap.has(bg)) {
           colorMap.set(bg, false);
       }
    }
  });

  if (colorMap.size === 0) return null;

  const getVibrantColor = (bg: string) => {
    const map: Record<string, string> = {
      'bg-[#0073E6]': 'bg-[#0073E6] dark:bg-[#0073E6]',
      'bg-[#4CA5FF]': 'bg-[#4CA5FF] dark:bg-[#4CA5FF]',
      'bg-[#062963]': 'bg-[#062963] dark:bg-[#062963]',
      'bg-[#1e4da1]': 'bg-[#1e4da1] dark:bg-blue-400',
      'bg-indigo-500': 'bg-indigo-500 dark:bg-indigo-400',
      'bg-emerald-500': 'bg-emerald-500 dark:bg-emerald-400',
      'bg-teal-500': 'bg-teal-500 dark:bg-teal-400',
      'bg-[#E42624]': 'bg-[#E42624] dark:bg-[#E42624]',
      'bg-rose-500': 'bg-rose-500 dark:bg-rose-400',
      'bg-[#FF8A00]': 'bg-[#FF8A00] dark:bg-[#FF8A00]',
      'bg-amber-500': 'bg-amber-500 dark:bg-amber-400',
      'bg-yellow-400': 'bg-yellow-400 dark:bg-yellow-300',
      'bg-purple-500': 'bg-purple-500 dark:bg-purple-400',
      'bg-pink-500': 'bg-pink-500 dark:bg-pink-400',
      'bg-slate-700': 'bg-slate-700 dark:bg-slate-400',
    };
    return map[bg] || bg;
  };

  const pipList = Array.from(colorMap.entries()).map(([bg, isLogged]) => ({ bg: getVibrantColor(bg), isLogged }));

  return (
    <div className="flex gap-0.5 justify-center flex-row absolute bottom-1 left-0 right-0 px-1 overflow-hidden">
      {pipList.slice(0, 3).map((pip, idx) => (
         <div 
            key={idx} 
            className={`${size} rounded-full ${pip.bg} ${pip.isLogged ? 'opacity-100 ring-1 ring-white/20' : 'opacity-40 dark:opacity-60'} shrink-0`} 
          />
      ))}
      {pipList.length > 3 && (
         <div className={`${size} rounded-full bg-slate-300 dark:bg-slate-600 shrink-0`} />
      )}
    </div>
  );
};

// --- SUB-COMPONENTS ---

const TeamAttendanceView = memo(({ state, onSave, initialTeamIds, initialDate, initialSession, initialCoachId, initialAthleteIds, gymType = 'cheer' }: { state: AppState, onSave: (ct: any, sids: string[], date: string, hrs?: number, coachId?: string, isComp?: boolean) => void, initialTeamIds?: string[], initialDate?: string | null, initialSession?: AttendanceSession | null, initialCoachId?: string | null, initialAthleteIds?: string[], gymType?: 'cheer' | 'tumbling' }) => {
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [isRosterView, setIsRosterView] = useState(false);
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);
  const [teamHours, setTeamHours] = useState<Record<string, number | string>>({});
  const [hours, setHours] = useState<number | string>(1);
  const [date, setDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [teamCoachIds, setTeamCoachIds] = useState<Record<string, string>>({});
  const [coveringCoachNames, setCoveringCoachNames] = useState<Record<string, string>>({});
  const [customCoveringInputs, setCustomCoveringInputs] = useState<Record<string, string>>({});
  const [compCoachHours, setCompCoachHours] = useState<Record<string, number | string>>({});
  const [compTargetGymIds, setCompTargetGymIds] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  
  const isOwner = state.profile.role === 'owner';

  const teams = useMemo(() => {
    // state.gyms is already filtered at fetch time for coaches —
    // it only contains gyms in their assigned_gym_ids list.
    // So for both owner and coach we just return all gyms of the specified type from state.
    return state.gyms.filter(g => g.gym_type === gymType);
  }, [state.gyms, gymType]);

  const filteredTeams = useMemo(() =>
    teams.filter(t => t.name.toLowerCase().includes(search.toLowerCase())),
    [teams, search]
  );

  const activeTeams = useMemo(() =>
    teams.filter(t => selectedTeamIds.includes(t.id)),
    [teams, selectedTeamIds]
  );

  const availablePresets = useMemo(() => {
    const mainOrgTeam = activeTeams.find(t => !t.parent_gym_id);
    const presets = (mainOrgTeam && mainOrgTeam.custom_event_presets && mainOrgTeam.custom_event_presets.length > 0)
      ? [...mainOrgTeam.custom_event_presets]
      : ['Class', 'Clinic', 'Camp', 'Workshop', 'Tryout'];
    
    const filtered = presets.map(p => p.includes(':') ? p.split(':')[0] : p).filter(p => p.toLowerCase() !== 'custom');
    
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const p of filtered) {
      const lower = p.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        unique.push(p);
      }
    }
    unique.push('Custom');
    return unique;
  }, [activeTeams]);

  const [selectedPreset, setSelectedPreset] = useState<string>(() => {
    if (initialSession?.custom_event_name) {
      const mainOrgTeam = state.gyms.find(g => g.id === initialSession.classTypeId);
      const rawPresets = mainOrgTeam?.custom_event_presets || ['Clinic', 'Class', 'Camp', 'Workshop', 'Tryout', 'Open Gym'];
      const savedPresets = rawPresets.map(p => p.includes(':') ? p.split(':')[0] : p);
      if (savedPresets.includes(initialSession.custom_event_name)) {
        return initialSession.custom_event_name;
      }
      return 'Custom';
    }
    return 'Class';
  });
  const [customEventName, setCustomEventName] = useState(initialSession?.custom_event_name || '');

  const isCompetition = useMemo(() => 
    activeTeams.some(t => t.gym_type === 'cheer' && !t.parent_gym_id), 
    [activeTeams]
  );

  const teamAthletes = useMemo(() => {
    if (gymType === 'tumbling') {
      return state.students.filter(s => !s.is_gym_member);
    }

    const selectedGyms = state.gyms.filter(g => selectedTeamIds.includes(g.id));
    let athletes: Student[] = [];
    
    selectedGyms.forEach(gym => {
      if (gym.parent_gym_id) {
        // Sub-team: filter by sub_team_ids
        const subAthletes = state.students.filter(s => s.sub_team_ids?.includes(gym.id));
        athletes = [...athletes, ...subAthletes];
      } else {
        // Main org: filter by associated_gym_id
        const orgAthletes = state.students.filter(s => s.associated_gym_id === gym.id);
        athletes = [...athletes, ...orgAthletes];
      }
    });

    // Remove duplicates
    return Array.from(new Map(athletes.map(a => [a.id, a])).values());
  }, [state.students, selectedTeamIds, state.gyms, gymType]);

  useEffect(() => {
    if (initialSession) {
      setSelectedTeamIds([initialSession.classTypeId]);
      setSelectedAthletes(initialSession.studentIds);
      setHours(initialSession.hours_coached || 1);
      setTeamHours({ [initialSession.classTypeId]: initialSession.hours_coached || 1 });
      setDate(initialSession.date);
      setTeamCoachIds({ [initialSession.classTypeId]: initialSession.coach_id || '' });
      if (initialSession.covering_coach_name) {
        setCoveringCoachNames({ [initialSession.classTypeId]: initialSession.covering_coach_name });
      }
      if (initialSession.is_competition && initialSession.coach_id) {
        setCompCoachHours({ [initialSession.coach_id]: initialSession.hours_coached || 1 });
      }
      if (initialSession.custom_event_name) {
        setCustomEventName(initialSession.custom_event_name);
        const matchingTeam = state.gyms.find(g => g.id === initialSession.classTypeId);
        const rawPresets = matchingTeam?.custom_event_presets || ['Clinic', 'Class', 'Camp', 'Workshop', 'Tryout', 'Open Gym'];
        const savedPresets = rawPresets.map(p => p.includes(':') ? p.split(':')[0] : p);
        if (savedPresets.includes(initialSession.custom_event_name)) {
          setSelectedPreset(initialSession.custom_event_name);
        } else {
          setSelectedPreset('Custom');
        }
      } else {
        setCustomEventName('');
        setSelectedPreset('Class');
      }
      setIsRosterView(true);
      return;
    }

    if (initialTeamIds && initialTeamIds.length > 0 && !isRosterView) {
      const firstTeam = state.gyms.find(g => g.id === initialTeamIds[0]);
      if (firstTeam) {
        setSelectedTeamIds(initialTeamIds);
        if (gymType === 'tumbling') {
          if (initialAthleteIds && initialAthleteIds.length > 0) {
             setSelectedAthletes(initialAthleteIds);
          } else {
             setSelectedAthletes(state.students.filter(s => !s.is_gym_member).map(s => s.id));
          }
        } else {
          const selectedGyms = state.gyms.filter(g => initialTeamIds.includes(g.id));
          let athletes: typeof state.students = [];
          
          selectedGyms.forEach(gym => {
            if (gym.parent_gym_id) {
              const subAthletes = state.students.filter(s => s.sub_team_ids?.includes(gym.id));
              athletes = [...athletes, ...subAthletes];
            } else {
              const orgAthletes = state.students.filter(s => s.associated_gym_id === gym.id);
              athletes = [...athletes, ...orgAthletes];
            }
          });
          const uniqueAthletes = Array.from(new Map(athletes.map(a => [a.id, a])).values());
          setSelectedAthletes(uniqueAthletes.map(a => a.id));
        }
        setHours(firstTeam.default_hours || 1);
        
        const initialHrsMap: Record<string, number> = {};
        initialTeamIds.forEach(tid => {
          const t = state.gyms.find(g => g.id === tid);
          initialHrsMap[tid] = t?.default_hours || 1;
        });
        setTeamHours(initialHrsMap);
        
        if (initialDate) setDate(initialDate);
        
        const initialMap: Record<string, string> = {};
        initialTeamIds.forEach(tid => {
          const t = state.gyms.find(g => g.id === tid);
          let coachIdFallback = '';
          if (t?.default_coach_id) coachIdFallback = t.default_coach_id;
          else if (t?.coach_ids && t.coach_ids.length > 0) coachIdFallback = t.coach_ids[0];
          else if (t?.parent_gym_id) {
            const p = state.gyms.find(g => g.id === t.parent_gym_id);
            if (p?.coach_ids && p.coach_ids.length > 0) coachIdFallback = p.coach_ids[0];
          }
          
          if (initialTeamIds.length === 1 && initialCoachId) {
            initialMap[tid] = initialCoachId;
          } else {
            initialMap[tid] = (state.profile.role === 'owner') ? coachIdFallback : (state.profile.id || '');
          }
        });
        setTeamCoachIds(initialMap);
        setIsRosterView(true);
      }
    }
  }, [initialTeamIds, initialDate, initialCoachId, initialAthleteIds, state.gyms, state.students, initialSession]);

  useEffect(() => {
    if (availablePresets.length > 0 && !availablePresets.includes(selectedPreset)) {
      if (selectedPreset === 'Custom' && availablePresets.includes('Custom')) {
        return;
      }
      setSelectedPreset(availablePresets[0]);
    }
  }, [availablePresets, selectedPreset]);

  const assignedCoachIds = useMemo(() => {
    const ids = new Set<string>();
    selectedTeamIds.forEach(tid => {
      const gym = state.gyms.find(g => g.id === tid);
      if (gym) {
        (gym.coach_ids || []).forEach(id => ids.add(id));
        if (gym.parent_gym_id) {
          const parent = state.gyms.find(p => p.id === gym.parent_gym_id);
          (parent?.coach_ids || []).forEach(id => ids.add(id));
        }
      }
    });
    return Array.from(ids);
  }, [selectedTeamIds, state.gyms]);

  const coachOptions = useMemo(() => {
    if (!isOwner && state.profile.id) {
      const self = { id: state.profile.id, name: state.profile.businessName || 'Me', role: 'coach' };
      const others = state.staff.filter(s => s.id !== state.profile.id);
      return [self, ...others];
    }
    const assigned = state.staff.filter(s => assignedCoachIds.includes(s.id));
    const others = state.staff.filter(s => !assignedCoachIds.includes(s.id));
    return [...assigned, ...others];
  }, [state.staff, assignedCoachIds, isOwner, state.profile]);

  const handleContinue = () => {
    if (selectedTeamIds.length === 0) return alert("Select at least one team.");
    const firstTeam = teams.find(t => t.id === selectedTeamIds[0]);

    setHours(firstTeam?.default_hours || 1);
    setSelectedAthletes(teamAthletes.map(a => a.id));

    // Auto-assign default coaches for all selected teams
    const initialMap: Record<string, string> = {};
    const initialHoursMap: Record<string, number> = {};
    const compCoachHoursMap: Record<string, number> = {};
    const defaultHrs = firstTeam?.default_hours || 1;
    
    // For competitions, default to ALL staff members being selected (owner)
    // or just this coach if they are a coach
    if (firstTeam && !firstTeam.parent_gym_id) {
      if (isOwner) {
        state.staff.forEach(s => {
          compCoachHoursMap[s.id] = defaultHrs;
        });
      } else {
        // Coach only logs for themselves
        if (state.profile.id) compCoachHoursMap[state.profile.id] = defaultHrs;
      }
    }

    selectedTeamIds.forEach(tid => {
      const t = state.gyms.find(g => g.id === tid);
      
      initialHoursMap[tid] = t?.default_hours || 1;
      
      let coachIdFallback = '';
      if (t?.default_coach_id) coachIdFallback = t.default_coach_id;
      else if (t?.coach_ids && t.coach_ids.length > 0) coachIdFallback = t.coach_ids[0];
      else if (t?.parent_gym_id) {
        const p = state.gyms.find(g => g.id === t.parent_gym_id);
        if (p?.coach_ids && p.coach_ids.length > 0) coachIdFallback = p.coach_ids[0];
      }
      // For multi-team non-competition: use per-team coach assignment for owners;
      // for coaches always use themselves
      if (!isCompetition && selectedTeamIds.length > 1) {
        initialMap[tid] = isOwner ? coachIdFallback : (state.profile.id || '');
      } else {
        initialMap[tid] = isOwner ? coachIdFallback : (state.profile.id || '');
      }
      
      // Also add assigned coaches for competition (owner only)
      if (isOwner && firstTeam && !firstTeam.parent_gym_id) {
        (t?.coach_ids || []).forEach(cid => {
          compCoachHoursMap[cid] = defaultHrs;
        });
        if (t?.default_coach_id) compCoachHoursMap[t.default_coach_id] = defaultHrs;
      }
    });
    
    setTeamCoachIds(initialMap);
    setTeamHours(initialHoursMap);
    setCompCoachHours(compCoachHoursMap);

    setIsRosterView(true);
  };

  const toggleTeamSelection = (id: string) => {
    setSelectedTeamIds(prev => prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]);
  };

  const toggleAthlete = (id: string) => {
    setSelectedAthletes(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
  };

  const handleConfirm = () => {
    if (selectedTeamIds.length === 0) return;
    
    const finalAthletes = isCompetition ? teamAthletes.map(a => a.id) : selectedAthletes;
    if (gymType !== 'tumbling' && finalAthletes.length === 0) return alert("Select at least one athlete.");
    
    let sessions: any[] = [];

    if (isCompetition && Object.keys(compCoachHours).length > 0) {
      // Create a session for EACH coach in competition mode
      Object.entries(compCoachHours).forEach(([coachId, coachHrs]) => {
        selectedTeamIds.forEach(teamId => {
          // If a specific sub-team was selected for this team, use it as classTypeId, keeping target to that sub-team.
          const targetTeamId = compTargetGymIds[teamId] || teamId;
          const targetTeam = state.gyms.find(g => g.id === targetTeamId);
          const isMainOrg = targetTeam && !targetTeam.parent_gym_id;
          const finalEventName = gymType === 'tumbling' ? (selectedPreset === 'Custom' ? customEventName : selectedPreset) : undefined;
          
          sessions.push({
            id: undefined,
            classTypeId: targetTeamId,
            studentIds: finalAthletes.filter(aid => {
              if (gymType === 'tumbling') return true;
              const student = state.students.find(s => s.id === aid);
              
              // Filter athletes accurately based on the actual targetTeam
              const targetTeamObj = state.gyms.find(g => g.id === targetTeamId);
              if (targetTeamObj && !targetTeamObj.parent_gym_id) {
                const subTeams = state.gyms.filter(g => g.parent_gym_id === targetTeamObj.id);
                return subTeams.some(st => st.id === student?.associated_gym_id);
              }
              // If it's a subteam
              return student?.associated_gym_id === targetTeamId || student?.sub_team_ids?.includes(targetTeamId);
            }),
            date,
            hours: Number(coachHrs) || 1,
            coachId: coachId,
            isCompetition: true,
            customEventName: finalEventName
          });
        });
      });
    } else {
      sessions = selectedTeamIds.map(teamId => {
        const team = state.gyms.find(g => g.id === teamId);
        const finalEventName = gymType === 'tumbling' ? (selectedPreset === 'Custom' ? customEventName : selectedPreset) : undefined;
        const covCoach = coveringCoachNames[teamId];
        const customInput = customCoveringInputs[teamId];
        const finalCoveringCoachName = covCoach === '__custom__' ? (customInput ? customInput.trim() : undefined) : (covCoach ? covCoach.trim() : undefined);
        return {
          id: (initialSession && initialSession.classTypeId === teamId) ? initialSession.id : undefined,
          classTypeId: teamId,
          studentIds: finalAthletes.filter(aid => {
            if (gymType === 'tumbling') return true;
            const student = state.students.find(s => s.id === aid);
            // If it's a parent team, we check if the student belongs to any of its sub-teams
            if (team && !team.parent_gym_id) {
              const subTeams = state.gyms.filter(g => g.parent_gym_id === team.id);
              return subTeams.some(st => st.id === student?.associated_gym_id);
            }
            return student?.associated_gym_id === teamId;
          }),
          date,
          hours: Number(selectedTeamIds.length > 1 ? (teamHours[teamId] !== "" && teamHours[teamId] !== undefined ? teamHours[teamId] : hours) : hours) || 1,
          coachId: teamCoachIds[teamId] || undefined,
          isCompetition,
          customEventName: finalEventName,
          covering_coach_name: finalCoveringCoachName
        };
      });
    }

    onSave(sessions, [], '', 0, undefined, isCompetition);
    setSelectedTeamIds([]);
    setIsRosterView(false);
  };

  if (isRosterView) {
    return (
      <div className="space-y-6 mt-4 pb-10">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsRosterView(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-500">
            <X size={20} />
          </button>
          <div>
            <h2 className="text-xl font-black uppercase italic text-[#1a1a1a] dark:text-white leading-tight">
              {activeTeams.length > 1 ? `${activeTeams.length} Teams Combined` : activeTeams[0]?.name}
            </h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Attendance Roster</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-2xl flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-blue-500" />
              <span className="text-[9px] font-black uppercase text-blue-600 dark:text-blue-400">Log Date</span>
            </div>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border-none rounded-xl p-2.5 text-xs font-black outline-none shadow-sm dark:text-white"
            />
          </div>
          {!isCompetition && activeTeams.length === 1 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-2xl flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-blue-500" />
                <span className="text-[9px] font-black uppercase text-blue-600 dark:text-blue-400">Hours</span>
              </div>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="24"
                value={hours}
                onFocus={e => e.target.select()}
                onChange={e => {
                  const val = e.target.value;
                  setHours(val === '' ? '' : (parseFloat(val) || ''));
                }}
                className="w-full bg-white dark:bg-slate-800 border-none rounded-xl p-2.5 text-xs font-black text-center outline-none shadow-sm dark:text-white"
              />
            </div>
          )}
        </div>

        {gymType === 'tumbling' && activeTeams.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl space-y-3">
            <div className="flex items-center gap-2">
              <ClipboardCheck size={14} className="text-blue-500" />
              <span className="text-[9px] font-black uppercase text-blue-600 dark:text-blue-400">Gym Event Type</span>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              {availablePresets.map((preset, presetIdx) => (
                <button
                  type="button"
                  key={`preset-${preset}-${presetIdx}`}
                  onClick={() => {
                    setSelectedPreset(preset);
                    if (preset !== 'Custom') {
                      setCustomEventName('');
                    }
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                    selectedPreset === preset
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-100 dark:border-slate-700'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            {selectedPreset === 'Custom' && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="pt-1"
              >
                <input
                  type="text"
                  placeholder="Enter custom event name (e.g. End of year clinic)"
                  value={customEventName}
                  onChange={e => setCustomEventName(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border-none rounded-xl p-3 text-xs font-black outline-none shadow-sm dark:text-white"
                />
              </motion.div>
            )}
          </div>
        )}

        {activeTeams.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <UserCircle size={14} className="text-blue-500" />
              <span className="text-[9px] font-black uppercase text-blue-600 dark:text-blue-400">
                {isCompetition ? 'Attending Coaches' : 'Assigned Coach & Covering'}
              </span>
            </div>
            
            {isCompetition ? (
              <div className="space-y-4">
                {/* Select Specific Sub-Teams for Competitions */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-1">
                    <Trophy size={14} className="text-amber-500" />
                    <span className="text-[9px] font-black uppercase text-amber-600 dark:text-amber-400">
                      Competition For Sub-Team (Optional)
                    </span>
                  </div>
                  {activeTeams.filter(t => !t.parent_gym_id).map((parentTeam, idx) => {
                    const subTeams = state.gyms.filter(g => g.parent_gym_id === parentTeam.id);
                    if (subTeams.length === 0) return null;
                    return (
                      <div key={`comp-subteam-${parentTeam.id}-${idx}`} className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-2xl flex flex-col gap-1.5">
                        <p className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 px-1">{parentTeam.name} Sub-Team</p>
                        <select
                          value={compTargetGymIds[parentTeam.id] || ''}
                          onChange={e => setCompTargetGymIds(prev => ({ ...prev, [parentTeam.id]: e.target.value }))}
                          className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-amber-100 dark:border-amber-800/40 rounded-xl p-2.5 text-xs font-black outline-none shadow-sm appearance-none cursor-pointer"
                        >
                          <option value="" className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100 font-bold">- All {parentTeam.name} -</option>
                          {subTeams.map((sub, sIdx) => (
                            <option key={`subteam-opt-${sub.id}-${sIdx}`} value={sub.id} className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100 font-bold">
                              {sub.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {coachOptions.map((coach, idx) => {
                    const isSelected = compCoachHours[coach.id] !== undefined;
                  return (
                  <div
                    key={`coach-log-${coach.id}-${idx}`}
                    className={`p-3 rounded-2xl border flex items-center gap-3 transition-all ${isSelected ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}
                  >
                    <button
                      onClick={() => {
                        const newMap = { ...compCoachHours };
                        if (isSelected) {
                          delete newMap[coach.id];
                        } else {
                          newMap[coach.id] = hours;
                        }
                        setCompCoachHours(newMap);
                      }}
                      className="flex items-center gap-3 flex-1"
                    >
                      <div className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-amber-500 text-white' : 'border-2 border-slate-200 dark:border-slate-600'}`}>
                        {isSelected && <Check size={12} />}
                      </div>
                      <span className={`text-[10px] font-black uppercase text-left ${isSelected ? 'text-amber-700 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`}>{coach.name}</span>
                    </button>
                    {isSelected && (
                      <div className="w-20 shrink-0">
                        <input
                          type="number"
                          step="0.5"
                          min="0.5"
                          max="24"
                          value={compCoachHours[coach.id] !== undefined ? compCoachHours[coach.id] : ''}
                          onFocus={e => e.target.select()}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCompCoachHours({
                              ...compCoachHours,
                              [coach.id]: val === '' ? '' : (parseFloat(val) || '')
                            });
                          }}
                          placeholder="Hrs"
                          className="w-full bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 rounded-lg p-2 text-xs font-black text-center outline-none shadow-sm dark:text-amber-100"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    )}
                  </div>
                )})}
                </div>
              </div>
            ) : (
              activeTeams.map((team, idx) => (
                <div key={`team-log-${team.id}-${idx}`} className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-2xl flex flex-col gap-1.5 border border-blue-100 dark:border-blue-900/30">
                  <div className="flex items-center justify-between mb-1 px-1">
                    <p className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">{team.name}</p>
                    {!isCompetition && activeTeams.length > 1 && (
                      <div className="flex items-center gap-1 opacity-70">
                        <Clock size={10} className="text-blue-500" />
                        <span className="text-[8px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-wider">Hours</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                    <select
                      value={teamCoachIds[team.id] || ''}
                      onChange={e => setTeamCoachIds(prev => ({ ...prev, [team.id]: e.target.value }))}
                      className="flex-1 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-none p-2.5 text-xs font-black outline-none appearance-none cursor-pointer"
                    >
                      <option value="" className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100 font-bold">- MYSELF -</option>
                      {coachOptions.map((s, sIdx) => (
                        <option key={`coach-opt-${s.id}-${sIdx}`} value={s.id} className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100 font-bold">
                          {s.name} {(team.coach_ids || []).includes(s.id) ? '★' : ''}
                        </option>
                      ))}
                    </select>
                    
                    {!isCompetition && activeTeams.length > 1 && (
                      <div className="flex border-l border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 w-16">
                        <input
                          type="number"
                          step="0.5"
                          min="0.5"
                          max="24"
                          value={teamHours[team.id] !== undefined ? teamHours[team.id] : ''}
                          onFocus={e => e.target.select()}
                          onChange={e => {
                            const val = e.target.value;
                            setTeamHours(prev => ({
                              ...prev,
                              [team.id]: val === '' ? '' : (parseFloat(val) || '')
                            }));
                          }}
                          className="w-full bg-transparent border-none p-2.5 text-xs font-black text-center outline-none dark:text-white"
                        />
                      </div>
                    )}
                  </div>

                  {(() => {
                    const customNames = team.coach_names || [];
                    const parentCustomNames = team.parent_gym_id ? (state.gyms.find(g => g.id === team.parent_gym_id)?.coach_names || []) : [];
                    const staffNames = state.staff.map(s => s.name);
                    const allAvailableNames = Array.from(new Set([...customNames, ...parentCustomNames, ...staffNames]));

                    return (
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center gap-1.5 px-1">
                          <UserCheck size={11} className="text-blue-500" />
                          <span className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400">
                            Covering for Coach (Optional)
                          </span>
                        </div>
                        <div className="flex bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                          <select
                            value={coveringCoachNames[team.id] || ''}
                            onChange={e => setCoveringCoachNames(prev => ({ ...prev, [team.id]: e.target.value }))}
                            className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-none p-2.5 text-xs font-black outline-none appearance-none cursor-pointer"
                          >
                            <option value="" className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100 font-bold">- NO COVER (REGULAR COACH) -</option>
                            {allAvailableNames.map((cName, cIdx) => (
                              <option key={`cover-opt-${team.id}-${cName}-${cIdx}`} value={cName} className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100 font-bold">
                                {cName}
                              </option>
                            ))}
                            <option value="__custom__" className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100 font-bold">+ Custom Name...</option>
                          </select>
                        </div>
                        {coveringCoachNames[team.id] === '__custom__' && (
                          <input
                            type="text"
                            placeholder="ENTER COACH NAME (E.G. BIANCA)"
                            value={customCoveringInputs[team.id] || ''}
                            onChange={e => setCustomCoveringInputs(prev => ({ ...prev, [team.id]: e.target.value }))}
                            className="w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-black uppercase outline-none dark:text-white"
                          />
                        )}
                      </div>
                    );
                  })()}
                </div>
              ))
            )}
          </div>
        )}

        {!isCompetition && gymType !== 'tumbling' ? (
          <div className="space-y-2">
            <div className="flex justify-between items-center px-1 mb-2">
              <span className="text-[10px] font-black text-slate-400 uppercase">{selectedAthletes.length} / {teamAthletes.length} Present</span>
              <button
                onClick={() => setSelectedAthletes(selectedAthletes.length === teamAthletes.length ? [] : teamAthletes.map(a => a.id))}
                className="text-[10px] font-black text-blue-500 uppercase"
              >
                {selectedAthletes.length === teamAthletes.length ? 'Clear All' : 'Select All'}
              </button>
            </div>
            {teamAthletes.map((athlete, idx) => {
              const team = teams.find(t => t.id === athlete.associated_gym_id);
              return (
                <motion.button
                  key={`athlete-log-${athlete.id}-${idx}`}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => toggleAthlete(athlete.id)}
                  className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all border ${selectedAthletes.includes(athlete.id) ? 'bg-white dark:bg-slate-800 border-blue-500 shadow-sm' : 'bg-slate-50 dark:bg-slate-900/50 border-transparent opacity-60'}`}
                >
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${selectedAthletes.includes(athlete.id) ? 'bg-blue-500 text-white' : 'border-2 border-slate-200 dark:border-slate-700 text-transparent'}`}>
                    <CheckCircle2 size={16} />
                  </div>
                  <div className="text-left flex-1">
                    <span className="text-sm font-black uppercase italic text-slate-900 dark:text-white block">{athlete.name}</span>
                    {(activeTeams.length > 1 || activeTeams.some(t => !t.parent_gym_id)) && <span className="text-[8px] font-black text-slate-400 uppercase">{team?.name}</span>}
                  </div>
                </motion.button>
              );
            })}
          </div>
        ) : gymType === 'tumbling' ? (
          <div className="p-10 text-center bg-blue-50 dark:bg-blue-900/10 rounded-3xl border-2 border-dashed border-blue-100 dark:border-blue-800/30">
            <Building size={48} className="mx-auto text-blue-200 mb-4" />
            <p className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400">Gym Session</p>
            <p className="text-[8px] font-bold text-blue-500/60 uppercase mt-1">No student registers required for gyms</p>
          </div>
        ) : (
          <div className="p-10 text-center bg-amber-50 dark:bg-amber-900/10 rounded-3xl border-2 border-dashed border-amber-100 dark:border-amber-800/30">
            <Users size={48} className="mx-auto text-amber-200 mb-4" />
            <p className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400">All {teamAthletes.length} athletes included</p>
            <p className="text-[8px] font-bold text-amber-500/60 uppercase mt-1">Attendance is automatic for competition logs</p>
          </div>
        )}

        <div className="sticky bottom-6 max-w-md mx-auto mt-10">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleConfirm}
            className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-[1000] text-sm uppercase tracking-widest shadow-2xl flex items-center justify-center gap-3"
          >
            Confirm Log <ArrowRight size={20} />
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-[#1a1a1a] dark:text-slate-100 uppercase italic">Team Selection</h2>
        {selectedTeamIds.length > 0 && (
          <span className="text-[10px] font-black text-blue-500 bg-blue-50 px-2 py-1 rounded-md uppercase">{selectedTeamIds.length} Selected</span>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          placeholder="Search teams..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-white dark:bg-slate-800 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-black shadow-sm outline-none"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 pb-32">
        {filteredTeams.map((team, idx) => (
          <motion.button
            key={`team-sel-${team.id}-${idx}`}
            whileTap={{ scale: 0.98 }}
            onClick={() => toggleTeamSelection(team.id)}
            className={`p-5 rounded-3xl border flex items-center justify-between shadow-sm group transition-all ${selectedTeamIds.includes(team.id) ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500' : 'bg-white dark:bg-slate-800 border-slate-50 dark:border-slate-800'}`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${selectedTeamIds.includes(team.id) ? 'bg-blue-500 text-white' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600'}`}>
                {selectedTeamIds.includes(team.id) ? <CheckCircle2 size={24} /> : <Trophy size={24} />}
              </div>
              <div className="text-left">
                <p className={`text-lg font-black uppercase italic transition-colors ${selectedTeamIds.includes(team.id) ? 'text-blue-700 dark:text-blue-400' : 'text-slate-800 dark:text-white group-hover:text-blue-500'}`}>{team.name}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {!team.parent_gym_id ? 'Main Organization' : `${state.students.filter(s => s.sub_team_ids?.includes(team.id)).length} Athletes`} • R{team.pay_amount}/hr
                </p>
              </div>
            </div>
          </motion.button>
        ))}
        {filteredTeams.length === 0 && (
          <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
            <ZapOff size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="text-[10px] font-black uppercase text-slate-400">No teams found. Create one in Setup.</p>
          </div>
        )}
      </div>

      {selectedTeamIds.length > 0 && (
        <div className="fixed bottom-24 left-6 right-6 max-w-md mx-auto">
          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleContinue}
            className="w-full bg-[#1e4da1] text-white py-5 rounded-[2rem] font-[1000] text-sm uppercase tracking-widest shadow-2xl flex items-center justify-center gap-3"
          >
            Continue to Roster <ChevronRight size={20} />
          </motion.button>
        </div>
      )}
    </div>
  );
});

const TeamManagementView = memo(({ state, onRemoveStudent, onUpdateSubTeams, onUpdateCompetition, onDeleteCompetition, onAddAthlete, onUpdateStudentName, onAddSubTeam, onBulkImport, onUpdateOrgCoaches, onRefresh }: { 
  state: AppState, 
  onRemoveStudent: (studentId: string) => void,
  onUpdateSubTeams: (studentId: string, subTeamIds: string[]) => void,
  onUpdateCompetition: (c: Competition) => void,
  onDeleteCompetition: (id: string) => void,
  onAddAthlete: (extra: Partial<Student>) => void,
  onUpdateStudentName: (studentId: string, newName: string) => void,
  onAddSubTeam: (parentGymId: string) => void,
  onBulkImport: (parentGymId: string) => void,
  onUpdateOrgCoaches?: (orgId: string, coachIds: string[], coachRates: Record<string, number>) => void,
  onRefresh?: () => void
}) => {
  const [activeTab, setActiveTab] = useState<'roster' | 'competitions' | 'registrations'>('roster');
  const [subTab, setSubTab] = useState<'roster' | 'attendance'>('roster');
  const [selectedMainId, setSelectedMainId] = useState<string | null>(null);
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [showAddComp, setShowAddComp] = useState(false);
  const [editingComp, setEditingComp] = useState<Competition | null>(null);
  const [search, setSearch] = useState('');
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');

  // Cheer Registration states
  const [searchCheer, setSearchCheer] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedReg, setSelectedReg] = useState<any>(null);
  const [editingReg, setEditingReg] = useState<any>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [copyStatus, setCopyStatus] = useState<{[key: string]: boolean}>({});

  const ownerIdForSharing = state.profile?.role === 'owner' ? state.profile.id : state.profile?.owner_id || '';

  const tumblingUrl = useMemo(() => {
    return `${window.location.origin}/#/signup?ownerId=${ownerIdForSharing}`;
  }, [ownerIdForSharing]);

  const cheerUrl = useMemo(() => {
    return `${window.location.origin}/#/signup-cheer?ownerId=${ownerIdForSharing}`;
  }, [ownerIdForSharing]);

  const handleCopy = (url: string, key: string) => {
    navigator.clipboard.writeText(url);
    setCopyStatus(prev => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopyStatus(prev => ({ ...prev, [key]: false }));
    }, 2000);
  };

  const formatDateToInput = (dobStr: string) => {
    if (!dobStr) return '';
    const parts = dobStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dobStr;
  };

  const formatDateToDb = (dobInput: string) => {
    if (!dobInput) return null;
    const parts = dobInput.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return dobInput;
  };

  const handleEditDobChange = (val: string, setEditForm: any) => {
    const rawValue = val.replace(/\D/g, '').slice(0, 8);
    let formattedDob = rawValue;
    if (rawValue.length > 4) {
      formattedDob = `${rawValue.slice(0, 2)}/${rawValue.slice(2, 4)}/${rawValue.slice(4)}`;
    } else if (rawValue.length > 2) {
      formattedDob = `${rawValue.slice(0, 2)}/${rawValue.slice(2)}`;
    }

    let ageStr = '';
    const parts = formattedDob.split(/[\/\-]/);
    if (parts.length === 3) {
      let d = parseInt(parts[0], 10);
      let m = parseInt(parts[1], 10);
      let y = parseInt(parts[2], 10);

      if (parts[0].length === 4) {
        y = parseInt(parts[0], 10);
        m = parseInt(parts[1], 10);
        d = parseInt(parts[2], 10);
      }

      if (y > 1900 && y < 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        const testDate = new Date(y, m - 1, d);
        if (testDate.getFullYear() === y && testDate.getMonth() === m - 1 && testDate.getDate() === d) {
          const birth = new Date(y, m - 1, d);
          const today = new Date();
          let calculatedAge = today.getFullYear() - birth.getFullYear();
          if (today.getMonth() - birth.getMonth() < 0 || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) {
            calculatedAge--;
          }
          if (calculatedAge >= 0) ageStr = String(calculatedAge);
        }
      }
    }

    setEditForm((prev: any) => ({ ...prev, dob: formattedDob, age: ageStr }));
  };

  const handleUpdateReg = async (updatedFields: any) => {
    const { error } = await supabase.from('cheer_registrations').update({
      parent_name: updatedFields.parent_name,
      parent_phone: updatedFields.parent_phone,
      parent_email: updatedFields.parent_email,
      preferred_parent_to_contact: updatedFields.preferred_parent_to_contact,
      second_parent_name: updatedFields.second_parent_name,
      second_parent_phone: updatedFields.second_parent_phone,
      athlete_name: updatedFields.athlete_name,
      athlete_surname: updatedFields.athlete_surname,
      dob: updatedFields.dob,
      age: updatedFields.age,
      medical_conditions: updatedFields.medical_conditions,
      allergies: updatedFields.allergies,
      emergency_contact_name: updatedFields.emergency_contact_name,
      emergency_contact_phone: updatedFields.emergency_contact_phone,
      status: updatedFields.status
    }).eq('id', updatedFields.id);

    if (error) {
      alert('Error updating registration: ' + error.message);
    } else {
      if (onRefresh) onRefresh();
      setShowEditModal(false);
      setEditingReg(null);
    }
  };

  const handleDeleteReg = async (id: string) => {
    if (confirm('Are you sure you want to delete this registration?')) {
      const { error } = await supabase.from('cheer_registrations').delete().eq('id', id);
      if (error) {
        alert('Error deleting registration: ' + error.message);
      } else {
        if (onRefresh) onRefresh();
      }
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'New':
        return 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30';
      case 'Added to Community':
        return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30';
      case 'Contacted':
        return 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30';
      case 'Active Athlete':
        return 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-100 dark:border-green-900/30';
      case 'Waiting List':
        return 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/30';
      case 'Declined':
        return 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30';
      default:
        return 'bg-slate-50 dark:bg-slate-900/20 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-900/30';
    }
  };

  const exportToCSV = (regs: any[]) => {
    const headers = [
      'Date Registered',
      'Athlete Name',
      'Athlete Surname',
      'DOB',
      'Age',
      'Parent 1 Name',
      'Parent 1 Phone',
      'Parent 1 Email',
      'Second Parent Name',
      'Second Parent Phone',
      'Preferred Contact Parent',
      'Medical Conditions',
      'Allergies',
      'Emergency Contact Name',
      'Emergency Contact Phone',
      'Consent Supplied Correct',
      'Consent Interest Only',
      'Consent Data Storage',
      'Status'
    ];

    const rows = regs.map(r => [
      r.created_at ? new Date(r.created_at).toLocaleDateString() : '',
      r.athlete_name || '',
      r.athlete_surname || '',
      r.dob || '',
      r.age || '',
      r.parent_name || '',
      r.parent_phone || '',
      r.parent_email || '',
      r.second_parent_name || '',
      r.second_parent_phone || '',
      r.preferred_parent_to_contact || 'First Parent',
      r.medical_conditions || '',
      r.allergies || '',
      r.emergency_contact_name || '',
      r.emergency_contact_phone || '',
      r.consent_correct ? 'Yes' : 'No',
      r.consent_interest ? 'Yes' : 'No',
      r.consent_storage ? 'Yes' : 'No',
      r.status || 'New'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `cheer_registrations_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = (reg: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Cheerleading & Tumbling Registration - \${reg.athlete_name} \${reg.athlete_surname}</title>
          <style>
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
            .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #1e4da1; padding-bottom: 20px; }
            .header h1 { margin: 0; font-size: 28px; font-style: italic; color: #1e4da1; font-weight: 900; }
            .header p { margin: 5px 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #94a3b8; }
            .section { margin-bottom: 30px; }
            .section-title { font-size: 14px; font-weight: bold; text-transform: uppercase; color: #1e4da1; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 12px; letter-spacing: 1px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
            .item { margin-bottom: 8px; }
            .label { font-size: 11px; font-weight: bold; text-transform: uppercase; color: #64748b; }
            .value { font-size: 14px; font-weight: 600; color: #1e293b; }
            .consent-item { display: flex; align-items: flex-start; gap: 8px; font-size: 12px; margin-bottom: 6px; }
            .checkbox { width: 14px; height: 14px; border: 1px solid #1e4da1; display: inline-flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; color: #1e4da1; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>JFLIPS</h1>
            <p>Competitive Cheer and Tumbling Registration</p>
          </div>
          
          <div class="section">
            <div class="section-title">Athlete Information</div>
            <div class="grid">
              <div class="item"><div class="label">Athlete Name</div><div class="value">\${reg.athlete_name} \${reg.athlete_surname}</div></div>
              <div class="item"><div class="label">Date of Birth</div><div class="value">\${reg.dob}</div></div>
              <div class="item"><div class="label">Age</div><div class="value">\${reg.age ? reg.age + ' Years' : 'N/A'}</div></div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Parent Information</div>
            <div class="grid">
              <div class="item"><div class="label">First Parent Name</div><div class="value">\${reg.parent_name}</div></div>
              <div class="item"><div class="label">First Parent Cell Number</div><div class="value">\${reg.parent_phone}</div></div>
              <div class="item"><div class="label">First Parent Email Address</div><div class="value">\${reg.parent_email}</div></div>
              <div class="item"><div class="label">Preferred Contact Parent</div><div class="value" style="color: #1e4da1;">\${reg.preferred_parent_to_contact || 'First Parent'}</div></div>
              \${reg.second_parent_name ? \`
                <div class="item"><div class="label">Second Parent Name</div><div class="value">\${reg.second_parent_name}</div></div>
                <div class="item"><div class="label">Second Parent Cell Number</div><div class="value">\${reg.second_parent_phone || 'N/A'}</div></div>
              \` : ''}
            </div>
          </div>

          <div class="section">
            <div class="section-title">Medical Information</div>
            <div class="grid">
              <div class="item" style="grid-column: span 2;"><div class="label">Medical Conditions</div><div class="value">\${reg.medical_conditions || 'None'}</div></div>
              <div class="item" style="grid-column: span 2;"><div class="label">Allergies</div><div class="value">\${reg.allergies || 'None'}</div></div>
              <div class="item"><div class="label">Emergency Contact</div><div class="value">\${reg.emergency_contact_name}</div></div>
              <div class="item"><div class="label">Emergency Number</div><div class="value">\${reg.emergency_contact_phone}</div></div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Consents & Declarations</div>
            <div class="consent-item">
              <span class="checkbox">\${reg.consent_correct ? '✓' : ''}</span>
              <span>I confirm the information supplied is correct.</span>
            </div>
            <div class="consent-item">
              <span class="checkbox">\${reg.consent_interest ? '✓' : ''}</span>
              <span>I understand that this registration is an expression of interest only and does not guarantee placement on a team.</span>
            </div>
            <div class="consent-item">
              <span class="checkbox">\${reg.consent_storage ? '✓' : ''}</span>
              <span>I consent to JFLIPS storing my information for athlete management purposes.</span>
            </div>
          </div>
          
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
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

  const handleDownloadTxt = (roster: Student[], title: string, filenamePrefix: string) => {
    if (roster.length === 0) {
      alert('No roster data found to export.');
      return;
    }

    let content = `${title.toUpperCase()}\n`;
    content += "========================================\n";
    content += `Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\n`;
    content += `Total Records: ${roster.length}\n`;
    content += "========================================\n\n";

    roster.forEach((s, idx) => {
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
    const filename = `${filenamePrefix}_roster_${new Date().toISOString().slice(0, 10)}.txt`;
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadCsv = (roster: Student[], title: string, filenamePrefix: string) => {
    if (roster.length === 0) {
      alert('No roster data found to export.');
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

    const rows = roster.map(s => [
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
    const filename = `${filenamePrefix}_roster_${new Date().toISOString().slice(0, 10)}.csv`;
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const mainOrgs = useMemo(() => state.gyms.filter(g => g.gym_type === 'cheer' && !g.parent_gym_id), [state.gyms]);
  const subTeams = useMemo(() => {
    if (!selectedMainId) return [];
    return state.gyms.filter(g => g.parent_gym_id === selectedMainId);
  }, [state.gyms, selectedMainId]);

  const mainOrgPool = useMemo(() => {
    if (!selectedMainId) return [];
    return state.students.filter(s => 
      s.is_cheer && 
      s.associated_gym_id === selectedMainId &&
      s.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [state.students, selectedMainId, search]);

  const subTeamRoster = useMemo(() => {
    if (!selectedSubId) return [];
    return mainOrgPool.filter(s => s.sub_team_ids?.includes(selectedSubId));
  }, [mainOrgPool, selectedSubId]);

  const poolAthletesNotInSubTeam = useMemo(() => {
    if (!selectedSubId) return [];
    return mainOrgPool.filter(s => !s.sub_team_ids?.includes(selectedSubId) && s.name.toLowerCase().includes(search.toLowerCase()));
  }, [mainOrgPool, selectedSubId, search]);

  const handleAddToSubTeam = (student: Student) => {
    if (!selectedSubId) return;
    const current = student.sub_team_ids || [];
    if (!current.includes(selectedSubId)) {
      onUpdateSubTeams(student.id, [...current, selectedSubId]);
    }
  };

  const handleRemoveFromSubTeam = (student: Student) => {
    if (!selectedSubId) return;
    const current = student.sub_team_ids || [];
    onUpdateSubTeams(student.id, current.filter(id => id !== selectedSubId));
  };

  const missedPractices = useMemo(() => {
    if (!selectedSubId) return [];
    const subSessions = state.sessions.filter(s => s.classTypeId === selectedSubId);
    const absences: { date: string, athletes: Student[] }[] = [];
    
    subSessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).forEach(session => {
      const missing = subTeamRoster.filter(a => !session.studentIds.includes(a.id));
      if (missing.length > 0) {
        absences.push({ date: session.date, athletes: missing });
      }
    });
    return absences;
  }, [state.sessions, selectedSubId, subTeamRoster]);

  return (
    <div className="space-y-6 mt-4">
      {/* Tabs */}
      <div className="flex gap-8 border-b border-slate-100 dark:border-slate-800 pb-0">
        <button 
          onClick={() => setActiveTab('roster')}
          className={`text-[10px] font-black uppercase tracking-[0.2em] pb-4 transition-all relative ${activeTab === 'roster' ? 'text-[#1e4da1] dark:text-blue-400' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Team Rosters
          {activeTab === 'roster' && <motion.div layoutId="tm-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1e4da1] dark:bg-blue-400" />}
        </button>
        <button 
          onClick={() => setActiveTab('competitions')}
          className={`text-[10px] font-black uppercase tracking-[0.2em] pb-4 transition-all relative ${activeTab === 'competitions' ? 'text-[#1e4da1] dark:text-blue-400' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Competition Schedule
          {activeTab === 'competitions' && <motion.div layoutId="tm-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1e4da1] dark:bg-blue-400" />}
        </button>
        <button 
          onClick={() => setActiveTab('registrations')}
          className={`text-[10px] font-black uppercase tracking-[0.2em] pb-4 transition-all relative ${activeTab === 'registrations' ? 'text-[#1e4da1] dark:text-blue-400' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Registrations
          {activeTab === 'registrations' && <motion.div layoutId="tm-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1e4da1] dark:bg-blue-400" />}
        </button>
      </div>

      {activeTab === 'roster' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Organization & Team List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Organizations</h3>
              <span className="text-[9px] font-bold text-slate-300 uppercase">{mainOrgs.length} Orgs</span>
            </div>
            <div className="space-y-3 max-h-[70vh] overflow-y-auto no-scrollbar pr-1">
              {mainOrgs.map((org, idx) => (
                <div key={`${org.id}-${idx}`} className="space-y-2">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      if (selectedMainId === org.id && selectedSubId !== null) {
                        setSelectedSubId(null);
                      } else {
                        setSelectedMainId(selectedMainId === org.id ? null : org.id);
                        setSelectedSubId(null);
                      }
                      setSearch('');
                    }}
                    className={`w-full p-4 rounded-3xl border text-left transition-all flex items-center justify-between group ${selectedMainId === org.id ? 'bg-[#1e4da1] border-[#1e4da1] text-white shadow-xl shadow-blue-900/20' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-200 dark:hover:border-blue-900/50'}`}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${selectedMainId === org.id ? 'bg-white/20' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-500'}`}>
                        <Building size={20} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black uppercase italic truncate">{org.name}</p>
                        <p className={`text-[9px] font-bold uppercase ${selectedMainId === org.id ? 'text-blue-200' : 'text-slate-400'}`}>
                          {state.students.filter(s => s.associated_gym_id === org.id).length} Athletes Pool
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={16} className={`shrink-0 transition-transform ${selectedMainId === org.id ? 'rotate-90' : 'opacity-20 group-hover:opacity-100'}`} />
                  </motion.button>

                  <AnimatePresence>
                    {selectedMainId === org.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden pl-4 space-y-1.5"
                      >
                        {subTeams.map((sub, sIdx) => (
                          <button
                            key={`${sub.id}-${sIdx}`}
                            onClick={() => { setSelectedSubId(sub.id); setSubTab('roster'); setSearch(''); }}
                            className={`w-full p-3 rounded-2xl text-left text-[11px] font-black uppercase italic transition-all flex items-center justify-between group ${selectedSubId === sub.id ? 'bg-blue-50 dark:bg-blue-900/30 text-[#1e4da1] dark:text-blue-400 border border-blue-100 dark:border-blue-900/50' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-1.5 h-1.5 rounded-full ${selectedSubId === sub.id ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                              {sub.name}
                            </div>
                            <span className="text-[9px] opacity-40">{state.students.filter(s => s.sub_team_ids?.includes(sub.id)).length}</span>
                          </button>
                        ))}
                        <button 
                          onClick={() => onAddSubTeam(org.id)}
                          className="w-full p-3 rounded-2xl text-left text-[9px] font-black uppercase tracking-widest text-slate-300 hover:text-blue-500 transition-colors flex items-center gap-3"
                        >
                          <Plus size={12} /> Add Sub-team
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>

          {/* Roster Management */}
          <div className="lg:col-span-2 space-y-6">
            {selectedSubId ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-700 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-xl font-black uppercase italic text-[#1e4da1] dark:text-blue-400">
                        {state.gyms.find(g => g.id === selectedSubId)?.name}
                      </h3>
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">Sub-team Management</p>
                    </div>
                    <div className="flex bg-slate-50 dark:bg-slate-900/40 p-1 rounded-xl">
                      <button onClick={() => setSubTab('roster')} className={`px-4 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all ${subTab === 'roster' ? 'bg-[#1e4da1] text-white' : 'text-slate-400'}`}>Roster</button>
                      <button onClick={() => setSubTab('attendance')} className={`px-4 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all ${subTab === 'attendance' ? 'bg-[#1e4da1] text-white' : 'text-slate-400'}`}>Attendance</button>
                    </div>
                  </div>
                  
                  <AnimatePresence mode="wait">
                    {subTab === 'roster' ? (
                      <motion.div key="roster" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="col-span-full mb-2 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                          <div>
                            <p className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-200 italic tracking-wider">Download Sub-Team Roster</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Save this specific team roster to your device</p>
                          </div>
                          <div className="flex gap-2 w-full sm:w-auto shrink-0">
                            <button
                              onClick={() => {
                                const subName = state.gyms.find(g => g.id === selectedSubId)?.name || 'sub_team';
                                handleDownloadTxt(subTeamRoster, `${subName} Sub-Team Roster`, subName.toLowerCase().replace(/\s+/g, '_'));
                              }}
                              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[#1a1a1a] dark:text-slate-200 rounded-xl text-[9px] font-black uppercase tracking-wider shadow-sm border border-slate-150 dark:border-slate-700 transition-all active:scale-95"
                            >
                              <Download size={11} className="text-slate-500" />
                              Download TXT
                            </button>
                            <button
                              onClick={() => {
                                const subName = state.gyms.find(g => g.id === selectedSubId)?.name || 'sub_team';
                                handleDownloadCsv(subTeamRoster, `${subName} Sub-Team Roster`, subName.toLowerCase().replace(/\s+/g, '_'));
                              }}
                              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 rounded-xl text-[9px] font-black uppercase tracking-wider shadow-sm border border-emerald-100/50 dark:border-emerald-900/30 transition-all active:scale-95"
                            >
                              <FileSpreadsheet size={11} className="text-emerald-500" />
                              Download Excel (CSV)
                            </button>
                          </div>
                        </div>

                        {subTeamRoster.length > 0 ? subTeamRoster.map((athlete, idx) => (
                          <div key={`${athlete.id}-${idx}`} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 group">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="w-8 h-8 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 shadow-sm shrink-0">
                                <User size={14} />
                              </div>
                              {editingNameId === athlete.id ? (
                                <input
                                  autoFocus
                                  value={editNameValue}
                                  onChange={e => setEditNameValue(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                      onUpdateStudentName(athlete.id, editNameValue);
                                      setEditingNameId(null);
                                    } else if (e.key === 'Escape') {
                                      setEditingNameId(null);
                                    }
                                  }}
                                  className="bg-white dark:bg-slate-800 border border-blue-500 rounded-lg px-2 py-1 text-xs font-black uppercase italic text-slate-700 dark:text-slate-200 w-full outline-none"
                                />
                              ) : (
                                <span className="text-xs font-black uppercase italic text-slate-700 dark:text-slate-200">{athlete.name}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 ml-2">
                              {editingNameId === athlete.id ? (
                                <>
                                  <button 
                                    onClick={() => {
                                      onUpdateStudentName(athlete.id, editNameValue);
                                      setEditingNameId(null);
                                    }}
                                    className="p-2 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-xl transition-colors"
                                  >
                                    <Check size={16} />
                                  </button>
                                  <button 
                                    onClick={() => setEditingNameId(null)}
                                    className="p-2 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors"
                                  >
                                    <X size={16} />
                                  </button>
                                </>
                              ) : (
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button 
                                    onClick={() => {
                                      setEditingNameId(athlete.id);
                                      setEditNameValue(athlete.name);
                                    }}
                                    className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors"
                                    title="Edit name inline"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  <button 
                                    onClick={() => handleRemoveFromSubTeam(athlete)}
                                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                                    title="Remove from sub-team"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )) : (
                          <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl">
                            <p className="text-[10px] font-black uppercase text-slate-300 tracking-widest">No athletes in this sub-team</p>
                          </div>
                        )}
                      </motion.div>
                    ) : (
                      <motion.div key="attendance" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-6">
                        {missedPractices.length > 0 ? missedPractices.map((abs, idx) => (
                          <div key={`${abs.date}-${idx}`} className="space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
                              <span className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">{new Date(abs.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                              <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {abs.athletes.map((athlete, aIdx) => (
                                <div key={`${athlete.id}-${aIdx}`} className="flex items-center gap-3 p-4 bg-red-50/50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/20">
                                  <div className="w-8 h-8 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-red-400 shadow-sm">
                                    <BellOff size={14} />
                                  </div>
                                  <div>
                                    <p className="text-xs font-black uppercase italic text-slate-700 dark:text-slate-200">{athlete.name}</p>
                                    <p className="text-[8px] font-bold text-red-400 uppercase">Missed Practice</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )) : (
                          <div className="py-12 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl">
                            <p className="text-[10px] font-black uppercase text-slate-300 tracking-widest">Perfect attendance recorded</p>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-700 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                      <h3 className="text-sm font-black uppercase italic text-slate-800 dark:text-slate-100">Assign from Pool</h3>
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">Athletes in {state.gyms.find(g => g.id === selectedMainId)?.name}</p>
                    </div>
                    <div className="relative max-w-xs w-full">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                      <input 
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search pool..."
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-[11px] font-bold outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {poolAthletesNotInSubTeam.map((athlete, idx) => (
                      <button
                        key={`${athlete.id}-${idx}`}
                        onClick={() => handleAddToSubTeam(athlete)}
                        className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-blue-500 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all group text-left w-full"
                      >
                        <span className="text-[11px] font-black uppercase italic text-slate-600 dark:text-slate-400 group-hover:text-[#1e4da1] dark:group-hover:text-blue-400">{athlete.name}</span>
                        <Plus size={16} className="text-slate-300 group-hover:text-[#1e4da1] dark:group-hover:text-blue-400" />
                      </button>
                    ))}
                    {poolAthletesNotInSubTeam.length === 0 && (
                      <div className="col-span-full py-8 text-center">
                        <p className="text-[10px] font-black uppercase text-slate-300 tracking-widest">No other athletes in pool</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : selectedMainId ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-700 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                      <h3 className="text-xl font-black uppercase italic text-[#1e4da1] dark:text-blue-400">
                        {state.gyms.find(g => g.id === selectedMainId)?.name} Pool
                      </h3>
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">All Athletes in Organization</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input 
                          value={search}
                          onChange={e => setSearch(e.target.value)}
                          placeholder="Search pool..."
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-[11px] font-bold outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button 
                          onClick={() => onBulkImport(selectedMainId)}
                          className="flex-1 sm:flex-none px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-[9px] font-[1000] uppercase tracking-widest flex items-center justify-center gap-2"
                        >
                          <Upload size={14} /> Bulk Import
                        </button>
                        <button 
                          onClick={() => onAddAthlete({ associated_gym_id: selectedMainId, is_cheer: true, is_gym_member: true })}
                          className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 text-white rounded-xl text-[9px] font-[1000] uppercase tracking-widest flex items-center justify-center gap-2"
                        >
                          <Plus size={14} /> Add to Pool
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-6 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-200 italic tracking-wider">Download Organization Pool Roster</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Save this full organization pool to your device</p>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto shrink-0">
                      <button
                        onClick={() => {
                          const orgName = state.gyms.find(g => g.id === selectedMainId)?.name || 'organization';
                          handleDownloadTxt(mainOrgPool, `${orgName} Organization Pool Roster`, orgName.toLowerCase().replace(/\s+/g, '_'));
                        }}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[#1a1a1a] dark:text-slate-200 rounded-xl text-[9px] font-black uppercase tracking-wider shadow-sm border border-slate-150 dark:border-slate-700 transition-all active:scale-95"
                      >
                        <Download size={11} className="text-slate-500" />
                        Download TXT
                      </button>
                      <button
                        onClick={() => {
                          const orgName = state.gyms.find(g => g.id === selectedMainId)?.name || 'organization';
                          handleDownloadCsv(mainOrgPool, `${orgName} Organization Pool Roster`, orgName.toLowerCase().replace(/\s+/g, '_'));
                        }}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 rounded-xl text-[9px] font-black uppercase tracking-wider shadow-sm border border-emerald-100/50 dark:border-emerald-900/30 transition-all active:scale-95"
                      >
                        <FileSpreadsheet size={11} className="text-emerald-500" />
                        Download Excel (CSV)
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {mainOrgPool.map((athlete, idx) => (
                      <div key={`${athlete.id}-${idx}`} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 group">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-8 h-8 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 shadow-sm shrink-0">
                            <User size={14} />
                          </div>
                          {editingNameId === athlete.id ? (
                            <input
                              autoFocus
                              value={editNameValue}
                              onChange={e => setEditNameValue(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  onUpdateStudentName(athlete.id, editNameValue);
                                  setEditingNameId(null);
                                } else if (e.key === 'Escape') {
                                  setEditingNameId(null);
                                }
                              }}
                              className="bg-white dark:bg-slate-800 border border-blue-500 rounded-lg px-2 py-1 text-xs font-black uppercase italic text-slate-700 dark:text-slate-200 w-full outline-none"
                            />
                          ) : (
                            <span className="text-xs font-black uppercase italic text-slate-700 dark:text-slate-200">{athlete.name}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          {editingNameId === athlete.id ? (
                            <>
                              <button 
                                onClick={() => {
                                  onUpdateStudentName(athlete.id, editNameValue);
                                  setEditingNameId(null);
                                }}
                                className="p-2 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-xl transition-colors"
                              >
                                <Check size={16} />
                              </button>
                              <button 
                                onClick={() => setEditingNameId(null)}
                                className="p-2 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors"
                              >
                                <X size={16} />
                              </button>
                            </>
                          ) : (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => {
                                  setEditingNameId(athlete.id);
                                  setEditNameValue(athlete.name);
                                }}
                                className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors"
                                title="Edit name inline"
                              >
                                <Pencil size={14} />
                              </button>
                              <button 
                                onClick={() => onRemoveStudent(athlete.id)}
                                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                                title="Remove from organization"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {mainOrgPool.length === 0 && (
                      <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl">
                        <p className="text-[10px] font-black uppercase text-slate-300 tracking-widest">No athletes in pool</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── ORGANIZATION COACHES & CUSTOM HOURLY RATES ─────────────────── */}
                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-700 shadow-sm space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-black uppercase italic text-[#1e4da1] dark:text-blue-400 flex items-center gap-2">
                        <Users size={20} />
                        Organization Coaches & Custom Rates
                      </h3>
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">
                        Assign coaches & set custom hourly pay rates for {state.gyms.find(g => g.id === selectedMainId)?.name}
                      </p>
                    </div>
                  </div>

                  {(() => {
                    const currentOrg = state.gyms.find(g => g.id === selectedMainId);
                    if (!currentOrg) return null;
                    const assignedCoachIds = currentOrg.coach_ids || [];
                    const coachRates = currentOrg.coach_rates || {};
                    const assignedCoaches = (state.staff || []).filter(st => assignedCoachIds.includes(st.id));
                    const unassignedCoaches = (state.staff || []).filter(st => !assignedCoachIds.includes(st.id));

                    const handleRateChange = (coachId: string, rate: number) => {
                      const newRates = { ...coachRates, [coachId]: rate };
                      if (onUpdateOrgCoaches) {
                        onUpdateOrgCoaches(currentOrg.id, assignedCoachIds, newRates);
                      }
                    };

                    const handleAddCoach = (coachId: string) => {
                      if (!coachId) return;
                      const newIds = Array.from(new Set([...assignedCoachIds, coachId]));
                      const coachObj = state.staff.find(s => s.id === coachId);
                      const newRates = { ...coachRates, [coachId]: coachRates[coachId] ?? (coachObj?.pay_rate || 150) };
                      if (onUpdateOrgCoaches) {
                        onUpdateOrgCoaches(currentOrg.id, newIds, newRates);
                      }
                    };

                    const handleRemoveCoach = (coachId: string) => {
                      const newIds = assignedCoachIds.filter(id => id !== coachId);
                      const newRates = { ...coachRates };
                      delete newRates[coachId];
                      if (onUpdateOrgCoaches) {
                        onUpdateOrgCoaches(currentOrg.id, newIds, newRates);
                      }
                    };

                    return (
                      <div className="space-y-4">
                        {assignedCoaches.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {assignedCoaches.map((coach, cIdx) => {
                              const currentRate = coachRates[coach.id] !== undefined ? coachRates[coach.id] : (coach.pay_rate || 150);
                              return (
                                <div key={`assigned-coach-${coach.id}-${cIdx}`} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-[#1e4da1] dark:text-blue-400 font-black italic flex items-center justify-center text-xs">
                                        {coach.name.charAt(0)}
                                      </div>
                                      <div>
                                        <p className="text-xs font-black uppercase italic text-slate-800 dark:text-slate-100">{coach.name}</p>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase">Default: R{coach.pay_rate || 0}/hr</p>
                                      </div>
                                    </div>
                                    <button 
                                      onClick={() => handleRemoveCoach(coach.id)}
                                      className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                                      title="Remove coach from organization"
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                  <div className="flex items-center gap-2 pt-2 border-t border-slate-200/50 dark:border-slate-800">
                                    <label className="text-[8px] font-black uppercase text-slate-500 shrink-0">Org Hourly Rate (R):</label>
                                    <input 
                                      type="number"
                                      value={currentRate}
                                      onChange={(e) => handleRateChange(coach.id, parseFloat(e.target.value) || 0)}
                                      className="w-24 px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-black text-[#1e4da1] dark:text-blue-400 outline-none focus:border-blue-500"
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="py-6 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                            <p className="text-[10px] font-black uppercase text-slate-300 tracking-widest">No coaches assigned to this organization</p>
                          </div>
                        )}

                        {unassignedCoaches.length > 0 && (
                          <div className="flex items-center gap-3 pt-2">
                            <select 
                              onChange={(e) => {
                                handleAddCoach(e.target.value);
                                e.target.value = '';
                              }}
                              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-black uppercase text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
                            >
                              <option value="">+ Assign Coach to {currentOrg.name}...</option>
                              {unassignedCoaches.map((c, uIdx) => (
                                <option key={`unassigned-coach-${c.id}-${uIdx}`} value={c.id}>{c.name} (Default: R{c.pay_rate || 0}/hr)</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                <div className="p-8 bg-blue-50 dark:bg-blue-900/10 rounded-[2.5rem] border border-blue-100 dark:border-blue-900/30">
                  <h4 className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-widest mb-2">How it works</h4>
                  <p className="text-[11px] text-blue-700/70 dark:text-blue-300/50 leading-relaxed italic">
                    1. Add athletes to the **Organization Pool** first.<br/>
                    2. Select a **Sub-team** from the left sidebar.<br/>
                    3. Assign athletes from the pool to that sub-team.
                  </p>
                </div>
              </motion.div>
            ) : (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-12 bg-slate-50 dark:bg-slate-900/30 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-slate-800">
                <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-[2rem] flex items-center justify-center text-slate-200 dark:text-slate-700 shadow-sm mb-6">
                  <Building size={40} />
                </div>
                <h3 className="text-lg font-black uppercase italic text-slate-400">Organization Management</h3>
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-2">Select an organization to manage its athletes and teams</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'competitions' && (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-black uppercase italic text-[#1a1a1a] dark:text-white">Competition Schedule</h3>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">Track upcoming events and team entries</p>
            </div>
            <button 
              onClick={() => { setEditingComp(null); setShowAddComp(true); }}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all shadow-lg shadow-blue-600/20"
            >
              <Plus size={16} /> Add Competition
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {state.competitions.map((comp, idx) => (
              <motion.div 
                key={`${comp.id}-${idx}`} 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-700 shadow-sm group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                
                <div className="flex items-start justify-between mb-6 relative z-10">
                  <div className="bg-blue-50 dark:bg-blue-900/20 w-12 h-12 rounded-2xl flex items-center justify-center text-blue-500">
                    <Trophy size={24} />
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditingComp(comp); setShowAddComp(true); }} className="p-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 rounded-xl transition-colors"><Pencil size={16} /></button>
                    <button onClick={() => onDeleteCompetition(comp.id)} className="p-2.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 rounded-xl transition-colors"><Trash2 size={16} /></button>
                  </div>
                </div>

                <div className="space-y-4 relative z-10">
                  <div>
                    <h4 className="text-xl font-black uppercase italic text-slate-800 dark:text-slate-100 leading-tight">{comp.name}</h4>
                    <div className="flex items-center gap-2 mt-2">
                      <Calendar size={14} className="text-blue-500" />
                      <span className="text-[11px] font-black uppercase text-slate-400 tracking-widest">
                        {new Date(comp.date).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  
                  {comp.location && (
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-slate-300" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase">{comp.location}</span>
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-50 dark:border-slate-700/50 space-y-3">
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Participating Teams</p>
                    <div className="flex flex-wrap gap-2">
                      {comp.gym_ids.length > 0 ? comp.gym_ids.map((gid, gIdx) => {
                        const team = state.gyms.find(g => g.id === gid);
                        return (
                          <span key={`${gid}-${gIdx}`} className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 text-[9px] font-black uppercase rounded-xl border border-slate-100 dark:border-slate-800">
                            {team?.name || 'Unknown Team'}
                          </span>
                        );
                      }) : (
                        <span className="text-[9px] font-bold text-slate-300 uppercase italic">No teams assigned</span>
                      )}
                    </div>
                  </div>

                  {comp.notes && (
                    <div className="pt-4">
                      <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Notes</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed italic">{comp.notes}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
            {state.competitions.length === 0 && (
              <div className="col-span-full py-24 text-center bg-slate-50 dark:bg-slate-900/30 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-slate-800">
                <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-[2rem] flex items-center justify-center text-slate-200 dark:text-slate-700 shadow-sm mx-auto mb-6">
                  <Trophy size={40} />
                </div>
                <h3 className="text-lg font-black uppercase italic text-slate-400">No Competitions Scheduled</h3>
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-2">Add your first competition to start tracking events</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'registrations' && (
        <div className="space-y-8">
          {/* Header */}
          <div>
            <h3 className="text-2xl font-black uppercase italic text-[#1a1a1a] dark:text-white">Registration Portal</h3>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">Manage public registrations and student signup links</p>
          </div>



          {/* Sharing Links Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tumbling Registration Card */}
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden flex flex-col md:flex-row justify-between gap-6">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full -mr-16 -mt-16 blur-2xl" />
              <div className="flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center shrink-0">
                      <User size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black uppercase italic text-slate-800 dark:text-slate-100 leading-tight">Tumbling Registration</h4>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Existing Public Enrollment Form</p>
                    </div>
                  </div>
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl">
                    <p className="text-[10px] font-mono break-all text-slate-500 dark:text-slate-400 select-all">
                      {tumblingUrl}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => handleCopy(tumblingUrl, 'tumbling')}
                    className="flex-1 py-3 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-slate-100 dark:border-slate-700 flex items-center justify-center gap-2"
                  >
                    {copyStatus['tumbling'] ? '✓ Copied' : 'Copy Link'}
                  </button>
                  <a
                    href={tumblingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 text-center"
                  >
                    Open Form
                  </a>
                </div>
              </div>

              {/* Tumbling QR Code Section */}
              <div className="flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/40 p-4 rounded-3xl border border-slate-100 dark:border-slate-800/80 shrink-0 w-full md:w-auto">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(tumblingUrl)}`}
                  alt="Tumbling signup QR code"
                  className="w-28 h-28 border border-slate-100 dark:border-slate-800 rounded-xl shadow-inner bg-white shrink-0"
                />
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider mt-2">Registration QR Code</span>
              </div>
            </div>

            {/* Competitive Cheer Registration Card */}
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden flex flex-col md:flex-row justify-between gap-6">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 rounded-full -mr-16 -mt-16 blur-2xl" />
              <div className="flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center shrink-0">
                      <Trophy size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black uppercase italic text-slate-800 dark:text-slate-100 leading-tight">Cheerleading Registration</h4>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Cheerleading and Tumbling Interest Form</p>
                    </div>
                  </div>
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl">
                    <p className="text-[10px] font-mono break-all text-slate-500 dark:text-slate-400 select-all">
                      {cheerUrl}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => handleCopy(cheerUrl, 'cheer')}
                    className="flex-1 py-3 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-slate-100 dark:border-slate-700 flex items-center justify-center gap-2"
                  >
                    {copyStatus['cheer'] ? '✓ Copied' : 'Copy Link'}
                  </button>
                  <a
                    href={cheerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 text-center"
                  >
                    Open Form
                  </a>
                </div>
              </div>
              
              {/* QR Code Section */}
              <div className="flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/40 p-4 rounded-3xl border border-slate-100 dark:border-slate-800/80 shrink-0 w-full md:w-auto">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(cheerUrl)}`}
                  alt="Cheer signup QR code"
                  className="w-28 h-28 border border-slate-100 dark:border-slate-800 rounded-xl shadow-inner bg-white shrink-0"
                />
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider mt-2">Registration QR Code</span>
              </div>
            </div>
          </div>

          {/* Cheer Registrations List */}
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
              <div>
                <h4 className="text-lg font-black uppercase italic text-slate-800 dark:text-slate-100">Cheerleading & Tumbling Submissions</h4>
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mt-0.5">Manage expressions of interest and athlete recruitment</p>
              </div>

              {/* Filters & Export */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative">
                  <input
                    type="text"
                    value={searchCheer}
                    onChange={(e) => setSearchCheer(e.target.value)}
                    placeholder="Search registrations..."
                    className="pl-8 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-200 outline-none w-48 focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors"
                  />
                  <div className="absolute left-2.5 top-2.5 text-slate-400">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  </div>
                </div>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                >
                  <option value="All" className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100 font-bold">All Statuses</option>
                  <option value="New" className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100 font-bold">New</option>
                  <option value="Added to Community" className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100 font-bold">Added to Community</option>
                  <option value="Contacted" className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100 font-bold">Contacted</option>
                  <option value="Active Athlete" className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100 font-bold">Active Athlete</option>
                  <option value="Waiting List" className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100 font-bold">Waiting List</option>
                  <option value="Declined" className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100 font-bold">Declined</option>
                </select>

                {/* Export CSV */}
                <button
                  onClick={() => {
                    const records = (state.cheerRegistrations || []).filter(r => {
                      const searchStr = `${r.athlete_name} ${r.athlete_surname} ${r.parent_name} ${r.parent_email} ${r.parent_phone}`.toLowerCase();
                      const matchesSearch = searchStr.includes(searchCheer.toLowerCase());
                      const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
                      return matchesSearch && matchesStatus;
                    });
                    exportToCSV(records);
                  }}
                  className="px-4 py-2 bg-[#1e4da1] hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-blue-500/10 flex items-center gap-2"
                >
                  Export CSV
                </button>
              </div>
            </div>

            {/* List Table / Grid */}
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-700 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      <th className="p-6">Athlete</th>
                      <th className="p-6">Parent Info</th>
                      <th className="p-6">Medical Notes</th>
                      <th className="p-6 text-center">Status</th>
                      <th className="p-6 text-center">Submitted</th>
                      <th className="p-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                    {((state.cheerRegistrations || []).filter(r => {
                      const searchStr = `${r.athlete_name} ${r.athlete_surname} ${r.parent_name} ${r.parent_email} ${r.parent_phone}`.toLowerCase();
                      const matchesSearch = searchStr.includes(searchCheer.toLowerCase());
                      const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
                      return matchesSearch && matchesStatus;
                    })).map((reg, rIdx) => (
                      <tr key={`${reg.id}-${rIdx}`} className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-all text-xs">
                        <td className="p-6">
                          <div className="font-black uppercase italic text-slate-800 dark:text-slate-100 text-[13px]">
                            {reg.athlete_name} {reg.athlete_surname}
                          </div>
                          <div className="text-[10px] text-slate-400 uppercase mt-0.5">
                            Age: {reg.age || '—'}
                          </div>
                        </td>
                        <td className="p-6">
                          <div className="font-semibold text-slate-700 dark:text-slate-300">
                            {reg.parent_name} <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-slate-500">P1</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{reg.parent_phone} • {reg.parent_email}</div>
                          {reg.second_parent_name && (
                            <div className="mt-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                              <div className="font-semibold text-slate-600 dark:text-slate-400">
                                {reg.second_parent_name} <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-slate-500">P2</span>
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">{reg.second_parent_phone || 'No phone'}</div>
                            </div>
                          )}
                          <div className="text-[9px] font-bold text-indigo-500 uppercase mt-1">
                            Contact: {reg.preferred_parent_to_contact || 'First Parent'}
                          </div>
                        </td>
                        <td className="p-6 max-w-[200px]">
                          <div className="truncate text-slate-500 dark:text-slate-400" title={reg.medical_conditions || 'None'}>
                            {reg.medical_conditions || <span className="italic text-slate-300 dark:text-slate-600">None declared</span>}
                          </div>
                          {reg.allergies && (
                            <div className="text-[9px] text-rose-500 font-bold uppercase mt-0.5 truncate" title={`Allergies: ${reg.allergies || 'None'}`}>
                              ⚠️ Allergies: {reg.allergies}
                            </div>
                          )}
                        </td>
                        <td className="p-6 text-center">
                          <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${getStatusBadgeClass(reg.status)}`}>
                            {reg.status || 'New'}
                          </span>
                        </td>
                        <td className="p-6 text-center text-slate-400 font-mono text-[10px]">
                          {reg.created_at ? new Date(reg.created_at).toLocaleDateString() : '—'}
                        </td>
                        <td className="p-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => { setSelectedReg(reg); setShowViewModal(true); }}
                              className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all"
                              title="View Registration"
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11-8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            </button>
                            <button
                              onClick={() => { setEditingReg({ ...reg, dob: formatDateToInput(reg.dob) }); setShowEditModal(true); }}
                              className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"
                              title="Edit Registration"
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            <button
                              onClick={() => handleDeleteReg(reg.id)}
                              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                              title="Delete Registration"
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {(state.cheerRegistrations || []).length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-24 text-center">
                          <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900/50 rounded-2xl flex items-center justify-center text-slate-300 dark:text-slate-700 mx-auto mb-4">
                            <Trophy size={32} />
                          </div>
                          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">No Cheer Registrations Yet</p>
                          <p className="text-[9px] text-slate-300 dark:text-slate-600 uppercase tracking-wider mt-1">Use the registration link above to capture public interest forms</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cheer View Modal */}
      {showViewModal && selectedReg && (
        <Modal title="Registration Details" onClose={() => { setShowViewModal(false); setSelectedReg(null); }}>
          <div className="space-y-6 text-slate-700 dark:text-slate-200">
            {/* Header / Meta */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <span className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${getStatusBadgeClass(selectedReg.status)}`}>
                  {selectedReg.status}
                </span>
                <p className="text-[9px] text-slate-400 uppercase font-mono mt-1.5">Submitted: {new Date(selectedReg.created_at).toLocaleString()}</p>
              </div>
              <button
                onClick={() => handlePrint(selectedReg)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 border border-slate-200/50 dark:border-slate-700"
              >
                🖨️ Print Document
              </button>
            </div>

            {/* Athlete Info */}
            <div className="space-y-3">
              <h5 className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Athlete Details</h5>
              <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/30 p-4 rounded-2xl border border-slate-100/50 dark:border-slate-800">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">First Name</span>
                  <p className="text-xs font-black uppercase italic mt-0.5">{selectedReg.athlete_name}</p>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Surname</span>
                  <p className="text-xs font-black uppercase italic mt-0.5">{selectedReg.athlete_surname}</p>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Date of Birth</span>
                  <p className="text-xs font-semibold mt-0.5">{selectedReg.dob ? new Date(selectedReg.dob).toLocaleDateString() : '—'}</p>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Calculated Age</span>
                  <p className="text-xs font-semibold mt-0.5">{selectedReg.age ? `${selectedReg.age} Years` : '—'}</p>
                </div>
              </div>
            </div>

            {/* Parent Info */}
            <div className="space-y-3">
              <h5 className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Parent Details</h5>
              <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/30 p-4 rounded-2xl border border-slate-100/50 dark:border-slate-800">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">First Parent Name</span>
                  <p className="text-xs font-semibold mt-0.5">{selectedReg.parent_name}</p>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Preferred Contact</span>
                  <p className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400 mt-0.5">{selectedReg.preferred_parent_to_contact || 'First Parent'}</p>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">First Parent Cell</span>
                  <p className="text-xs font-semibold font-mono mt-0.5">{selectedReg.parent_phone}</p>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">First Parent Email</span>
                  <p className="text-xs font-semibold font-mono mt-0.5">{selectedReg.parent_email}</p>
                </div>
                {selectedReg.second_parent_name && (
                  <>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Second Parent Name</span>
                      <p className="text-xs font-semibold mt-0.5">{selectedReg.second_parent_name}</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Second Parent Cell</span>
                      <p className="text-xs font-semibold font-mono mt-0.5">{selectedReg.second_parent_phone || '—'}</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Medical Info */}
            <div className="space-y-3">
              <h5 className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">Medical Details</h5>
              <div className="space-y-3.5 bg-slate-50 dark:bg-slate-900/30 p-4 rounded-2xl border border-slate-100/50 dark:border-slate-800">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Medical Conditions</span>
                  <p className="text-xs mt-0.5 whitespace-pre-wrap">{selectedReg.medical_conditions || 'None declared'}</p>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Allergies</span>
                  <p className="text-xs mt-0.5">{selectedReg.allergies || 'None declared'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Emergency Contact</span>
                    <p className="text-xs font-semibold mt-0.5">{selectedReg.emergency_contact_name}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Emergency Phone</span>
                    <p className="text-xs font-semibold font-mono mt-0.5">{selectedReg.emergency_contact_phone}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Consents */}
            <div className="space-y-3">
              <h5 className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Declarations & Consents</h5>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-100/50 dark:border-slate-800">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${selectedReg.consent_correct ? 'bg-emerald-500 text-white' : 'bg-slate-250 dark:bg-slate-700 text-slate-400 dark:text-slate-500'}`}>✓</div>
                  <span className="text-[11px] font-semibold">Information is true and correct</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-100/50 dark:border-slate-800">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${selectedReg.consent_interest ? 'bg-emerald-500 text-white' : 'bg-slate-250 dark:bg-slate-700 text-slate-400 dark:text-slate-500'}`}>✓</div>
                  <span className="text-[11px] font-semibold">Expression of interest only declaration acknowledged</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-100/50 dark:border-slate-800">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${selectedReg.consent_storage ? 'bg-emerald-500 text-white' : 'bg-slate-250 dark:bg-slate-700 text-slate-400 dark:text-slate-500'}`}>✓</div>
                  <span className="text-[11px] font-semibold">Consent for athlete data storage granted</span>
                </div>
              </div>
            </div>

            {/* Action footer */}
            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => { setShowViewModal(false); setSelectedReg(null); }}
                className="px-6 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-black uppercase tracking-wider rounded-xl transition-all"
              >
                Close View
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Cheer Edit Modal */}
      {showEditModal && editingReg && (
        <Modal title="Edit Registration" onClose={() => { setShowEditModal(false); setEditingReg(null); }}>
          <div className="space-y-6 text-slate-700 dark:text-slate-200 max-h-[75vh] overflow-y-auto no-scrollbar pr-1">
            
            {/* Status Dropdown */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 px-1">Registration Status *</label>
              <select
                value={editingReg.status || 'New'}
                onChange={(e) => setEditingReg((prev: any) => ({ ...prev, status: e.target.value }))}
                className="w-full px-4 py-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500 font-bold"
              >
                <option value="New" className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100 font-bold">New</option>
                <option value="Added to Community" className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100 font-bold">Added to Community</option>
                <option value="Contacted" className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100 font-bold">Contacted</option>
                <option value="Active Athlete" className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100 font-bold">Active Athlete</option>
                <option value="Waiting List" className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100 font-bold">Waiting List</option>
                <option value="Declined" className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100 font-bold">Declined</option>
              </select>
            </div>

            {/* Athlete Info */}
            <div className="space-y-3 pt-2">
              <h5 className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Athlete Details</h5>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase px-1">First Name *</label>
                  <input
                    type="text"
                    value={editingReg.athlete_name || ''}
                    onChange={(e) => setEditingReg((prev: any) => ({ ...prev, athlete_name: e.target.value }))}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500 font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase px-1">Surname *</label>
                  <input
                    type="text"
                    value={editingReg.athlete_surname || ''}
                    onChange={(e) => setEditingReg((prev: any) => ({ ...prev, athlete_surname: e.target.value }))}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500 font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase px-1">Date of Birth *</label>
                  <input
                    type="text"
                    placeholder="DD/MM/YYYY"
                    value={editingReg.dob || ''}
                    onChange={(e) => handleEditDobChange(e.target.value, setEditingReg)}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500 font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase px-1">Age</label>
                  <input
                    type="text"
                    readOnly
                    placeholder="Auto-filled"
                    value={editingReg.age || ''}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 text-slate-500 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Parent Info */}
            <div className="space-y-3 pt-2">
              <h5 className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Parent Details</h5>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase px-1">First Parent Full Name *</label>
                  <input
                    type="text"
                    value={editingReg.parent_name || ''}
                    onChange={(e) => setEditingReg((prev: any) => ({ ...prev, parent_name: e.target.value }))}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500 font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase px-1">First Parent Cell Number *</label>
                  <input
                    type="text"
                    value={editingReg.parent_phone || ''}
                    onChange={(e) => setEditingReg((prev: any) => ({ ...prev, parent_phone: e.target.value }))}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500 font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase px-1">First Parent Email Address *</label>
                  <input
                    type="email"
                    value={editingReg.parent_email || ''}
                    onChange={(e) => setEditingReg((prev: any) => ({ ...prev, parent_email: e.target.value }))}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500 font-semibold"
                  />
                </div>

                <div className="col-span-2 border-t border-dashed border-slate-100 dark:border-slate-800 pt-3 mt-1 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase px-1">Second Parent Full Name (Optional)</label>
                    <input
                      type="text"
                      value={editingReg.second_parent_name || ''}
                      onChange={(e) => setEditingReg((prev: any) => ({ ...prev, second_parent_name: e.target.value }))}
                      className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500 font-semibold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase px-1">Second Parent Cell Number (Optional)</label>
                    <input
                      type="text"
                      value={editingReg.second_parent_phone || ''}
                      onChange={(e) => setEditingReg((prev: any) => ({ ...prev, second_parent_phone: e.target.value }))}
                      className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500 font-semibold"
                    />
                  </div>
                </div>

                <div className="col-span-2 space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase px-1">Preferred Parent to Contact *</label>
                  <select
                    value={editingReg.preferred_parent_to_contact || 'First Parent'}
                    onChange={(e) => setEditingReg((prev: any) => ({ ...prev, preferred_parent_to_contact: e.target.value }))}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500 font-semibold"
                  >
                    <option value="First Parent" className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100 font-bold">First Parent</option>
                    <option value="Second Parent" className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100 font-bold">Second Parent</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Medical Info */}
            <div className="space-y-3 pt-2">
              <h5 className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">Medical Details</h5>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase px-1">Medical Conditions</label>
                  <textarea
                    value={editingReg.medical_conditions || ''}
                    onChange={(e) => setEditingReg((prev: any) => ({ ...prev, medical_conditions: e.target.value }))}
                    rows={2}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500 font-semibold resize-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase px-1">Allergies</label>
                  <input
                    type="text"
                    value={editingReg.allergies || ''}
                    onChange={(e) => setEditingReg((prev: any) => ({ ...prev, allergies: e.target.value }))}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500 font-semibold"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase px-1">Emergency Contact Name *</label>
                    <input
                      type="text"
                      value={editingReg.emergency_contact_name || ''}
                      onChange={(e) => setEditingReg((prev: any) => ({ ...prev, emergency_contact_name: e.target.value }))}
                      className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500 font-semibold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase px-1">Emergency Contact Phone *</label>
                    <input
                      type="text"
                      value={editingReg.emergency_contact_phone || ''}
                      onChange={(e) => setEditingReg((prev: any) => ({ ...prev, emergency_contact_phone: e.target.value }))}
                      className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500 font-semibold"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Action footer */}
            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => { setShowEditModal(false); setEditingReg(null); }}
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-black uppercase tracking-wider rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const dbDob = formatDateToDb(editingReg.dob);
                  handleUpdateReg({
                    ...editingReg,
                    dob: dbDob,
                    age: editingReg.age ? parseInt(editingReg.age, 10) : null
                  });
                }}
                className="px-6 py-3 bg-[#1e4da1] hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-blue-500/10"
              >
                Save Changes
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showAddComp && (
        <Modal title={editingComp ? "Edit Competition" : "Add Competition"} onClose={() => setShowAddComp(false)}>
          <CompetitionForm 
            initialData={editingComp} 
            teams={state.gyms.filter(g => g.gym_type === 'cheer')}
            onSubmit={(data) => {
              onUpdateCompetition(data);
              setShowAddComp(false);
            }} 
          />
        </Modal>
      )}
    </div>
  );
});

const CompetitionForm = ({ initialData, teams, onSubmit }: { initialData?: Competition | null, teams: Gym[], onSubmit: (data: any) => void }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
  const [location, setLocation] = useState(initialData?.location || '');
  const [selectedGymIds, setSelectedGymIds] = useState<string[]>(initialData?.gym_ids || []);
  const [notes, setNotes] = useState(initialData?.notes || '');

  const toggleTeam = (id: string) => {
    setSelectedGymIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Competition Name</label>
        <input 
          value={name} 
          onChange={e => setName(e.target.value)} 
          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 text-xs font-bold outline-none focus:border-blue-500 transition-colors" 
          placeholder="e.g. Nationals 2024" 
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Date</label>
          <input 
            type="date" 
            value={date} 
            onChange={e => setDate(e.target.value)} 
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 text-xs font-bold outline-none focus:border-blue-500 transition-colors" 
          />
        </div>
        <div className="space-y-2">
          <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Location</label>
          <input 
            value={location} 
            onChange={e => setLocation(e.target.value)} 
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 text-xs font-bold outline-none focus:border-blue-500 transition-colors" 
            placeholder="e.g. Cape Town" 
          />
        </div>
      </div>
      <div className="space-y-3">
        <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Participating Teams</label>
        <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto no-scrollbar p-1">
          {teams.map((team, idx) => (
            <button
              key={`${team.id}-${idx}`}
              onClick={() => toggleTeam(team.id)}
              className={`p-3 rounded-2xl border text-[10px] font-black uppercase italic transition-all ${selectedGymIds.includes(team.id) ? 'bg-[#1e4da1] text-white border-[#1e4da1] shadow-lg shadow-blue-900/20' : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-100 dark:border-slate-700 hover:border-blue-200'}`}
            >
              {team.name}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Notes</label>
        <textarea 
          value={notes} 
          onChange={e => setNotes(e.target.value)} 
          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 text-xs font-bold outline-none focus:border-blue-500 transition-colors" 
          rows={3} 
          placeholder="Additional details..." 
        />
      </div>
      <button 
        onClick={() => onSubmit({ id: initialData?.id || `comp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, name, date, location, gym_ids: selectedGymIds, notes })}
        className="w-full bg-[#1e4da1] text-white py-5 rounded-[2rem] font-[1000] text-sm uppercase tracking-widest shadow-2xl shadow-blue-900/30 transition-all active:scale-95"
      >
        {initialData ? 'Update Competition' : 'Schedule Competition'}
      </button>
    </div>
  );
};

const LogSessionView = memo(({ state, onNavigate }: { state: AppState, onNavigate: (view: View) => void }) => {
  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
          <ClipboardCheck size={20} />
        </div>
        <div>
          <h2 className="text-2xl font-[1000] text-slate-900 dark:text-white tracking-tight">Log Session</h2>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Choose the type of session to log</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button 
          onClick={() => onNavigate(View.REGISTER)}
          className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 flex flex-col items-center text-center gap-4 hover:scale-[1.02] transition-transform"
        >
          <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Users size={32} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Log Classes</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Log a private or group tumbling class</p>
          </div>
        </button>

        <button 
          onClick={() => onNavigate(View.TEAM_ATTENDANCE)}
          className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 flex flex-col items-center text-center gap-4 hover:scale-[1.02] transition-transform"
        >
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <ClipboardCheck size={32} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Log Team Practice</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Take attendance and log team practice</p>
          </div>
        </button>

        <button 
          onClick={() => onNavigate(View.GYM_ATTENDANCE)}
          className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 flex flex-col items-center text-center gap-4 hover:scale-[1.02] transition-transform"
        >
          <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <Settings size={32} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Log Gym Session</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">See all gyms and their classes to log</p>
          </div>
        </button>
      </div>
    </div>
  );
});

const RegisterView = memo(({ state, onSave, onCancel, initialSession }: { state: AppState, onSave: (ct: string, sids: string[], date: string, hrs?: number, coachId?: string, isComp?: boolean) => void, onCancel: () => void, initialSession?: AttendanceSession | null }) => {
  const [selectedClassId, setSelectedClassId] = useState(initialSession?.classTypeId || '');
  const [selectedStudents, setSelectedStudents] = useState<string[]>(initialSession?.studentIds || []);
  const [date, setDate] = useState(initialSession?.date || new Date().toISOString().split('T')[0]);
  const [hours, setHours] = useState<number | string>(initialSession?.hours_coached || '');
  const [coachId, setCoachId] = useState(
    initialSession?.coach_id || (state.profile.role === 'coach' ? (state.profile.id || '') : '')
  );
  const isOwner = state.profile.role === 'owner';

  interface ClassOption {
    id: string;
    name: string;
    price: number;
    isGym: boolean;
    gym_type?: 'tumbling' | 'cheer';
    default_hours?: number;
    studentIds?: string[];
    coach_ids?: string[];
    parent_gym_id?: string;
    default_coach_id?: string;
  }

  const classOptions = useMemo<ClassOption[]>(() => {
    return (state.classTypes || []).map(ct => ({ ...ct, isGym: false }));
  }, [state.classTypes]);

  const selectedOption = useMemo(() =>
    classOptions.find(opt => opt.id === selectedClassId),
    [classOptions, selectedClassId]
  );

  useEffect(() => {
    // No gym specific logic needed here anymore
  }, [selectedOption, initialSession]);

  const entitiesToShow = useMemo(() => {
    if (!selectedClassId) return [];

    const selectedClass = (state.classTypes || []).find(ct => ct.id === selectedClassId);
    const allTumbling = (state.students || []).filter(s => !s.is_gym_member);
    if (!selectedClass) return allTumbling;

    const assignedSet = new Set(selectedClass.studentIds || []);
    const assigned = allTumbling.filter(s => assignedSet.has(s.id));
    const unassigned = allTumbling.filter(s => !assignedSet.has(s.id));

    return [...assigned, ...unassigned];
  }, [selectedClassId, state.students, state.classTypes]);

  useEffect(() => {
    // Auto-select enrolled students when selecting a class
    if (selectedClassId && selectedStudents.length === 0) {
      const selectedClass = (state.classTypes || []).find(ct => ct.id === selectedClassId);
      if (selectedClass && selectedClass.studentIds && selectedClass.studentIds.length > 0) {
        setSelectedStudents(selectedClass.studentIds);
      }
    }
  }, [selectedClassId, state.classTypes]);

  const toggleEntity = useCallback((id: string) =>
    setSelectedStudents(prev => prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]),
    []);

  const assignedCoachIds = useMemo(() => {
    const ids = new Set<string>();
    return Array.from(ids);
  }, []);

  const coachOptions = useMemo(() => {
    return state.staff;
  }, [state.staff]);

  const handleSave = () => {
    if (!selectedClassId) return alert("Select class");
    if (selectedStudents.length === 0) return alert("Select at least one athlete");
    onSave(selectedClassId, selectedStudents, date, typeof hours === 'number' ? hours : parseFloat(hours as string), coachId || undefined, false);
  };

  return (
    <div className="space-y-6 mt-6 pb-10 px-1">
      <h2 className="text-2xl font-black text-[#1a1a1a] dark:text-slate-100 uppercase italic">Register</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-[#94a3b8] uppercase px-1">Training Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-white dark:bg-slate-800 border-none rounded-2xl p-4 text-sm font-black dark:text-slate-200 shadow-sm outline-none" />
        </div>
        {isOwner && (
          <div className="space-y-2">
            <label className="text-[10px] font-black text-[#94a3b8] uppercase px-1">Assign Coach</label>
            <select value={coachId} onChange={e => setCoachId(e.target.value)} className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-none rounded-2xl p-4 text-sm font-black shadow-sm outline-none appearance-none cursor-pointer">
              <option value="" className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100 font-bold">- MYSELF -</option>
              {coachOptions.map((s, idx) => (
                <option key={s.id || `coach-reg-${idx}`} value={s.id} className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100 font-bold">
                  {s.name} {assignedCoachIds.includes(s.id) ? '★' : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <label className="text-[10px] font-black text-[#94a3b8] uppercase px-1">Select Class / Individual Gym</label>
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid grid-cols-1 gap-2.5">
          {(classOptions || []).map((opt, idx) => (
            <motion.button key={`class-reg-${opt.isGym ? 'gym' : 'class'}-${opt.id}-${idx}`} variants={registerItemVariants} whileTap={{ scale: 0.98 }} onClick={() => { setSelectedClassId(opt.id); const ct = (state.classTypes || []).find(c => c.id === opt.id); setSelectedStudents(ct?.studentIds || []); }} className={`p-4 rounded-xl border text-left flex justify-between items-center transition-all ${selectedClassId === opt.id ? 'bg-[#1e4da1] dark:bg-blue-600 border-[#1e4da1] text-white shadow-lg' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-[#1a1a1a] dark:text-slate-300'}`}>
              <div className="flex items-center gap-2">
                {opt.isGym ? <Building2 size={14} className="opacity-70" /> : <Dumbbell size={14} className="opacity-70" />}
                <span className="font-black text-sm italic uppercase">{opt.name}</span>
                {opt.isGym && <span className="text-[8px] opacity-70 ml-1">{opt.gym_type === 'cheer' ? 'TEAM' : 'GYM'}</span>}
              </div>
              <span className="text-[10px] font-black opacity-60">R{opt.price}</span>
            </motion.button>
          ))}
        </motion.div>
      </div>

      <div className="space-y-3">
        <label className="text-[10px] font-black text-[#94a3b8] uppercase px-1">Attendance</label>

        <div className="space-y-2.5">
          {!selectedClassId ? (
            <div className="bg-white dark:bg-slate-800/40 border border-dashed border-slate-200 rounded-[2rem] p-12 text-center"><p className="text-[10px] text-slate-400 font-black uppercase">Choose session type above</p></div>
          ) : (selectedOption?.isGym && selectedOption.gym_type !== 'cheer') ? (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl p-8 text-center space-y-4">
              <div>
                <Building2 size={32} className="mx-auto text-blue-400 mb-2 opacity-50" />
                <p className="text-[10px] text-blue-600 dark:text-blue-400 font-black uppercase">Gym Coaching Session</p>
                <p className="text-[8px] text-blue-400 uppercase mt-1">Invoice will be sent to {selectedOption.name}</p>
              </div>
            </div>
          ) : (entitiesToShow || []).map((entity, idx) => {
            const selectedClass = (state.classTypes || []).find(ct => ct.id === selectedClassId);
            const isAssignedToClass = selectedClass?.studentIds?.includes(entity.id);

            return (
              <motion.button key={`entity-reg-${entity.id}-${idx}`} variants={registerItemVariants} whileTap={{ scale: 0.97 }} onClick={() => toggleEntity(entity.id)} className={`w-full p-4 rounded-xl border flex items-center justify-between transition-colors ${selectedStudents.includes(entity.id) ? 'bg-[#eff6ff] dark:bg-blue-900/30 border-[#1e4da1] text-[#1e4da1] shadow-md' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-[#1a1a1a] dark:text-slate-300'}`}>
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${selectedStudents.includes(entity.id) ? 'bg-[#1e4da1] border-[#1e4da1]' : 'border-slate-200'}`}>
                    {selectedStudents.includes(entity.id) && <CheckCircle2 size={12} className="text-white" />}
                  </div>
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <User size={14} className="opacity-50 shrink-0" />
                    <span className="font-black uppercase italic text-[13px] truncate">{entity.name}</span>
                  </div>
                  {isAssignedToClass && (
                    <span className="text-[8px] font-black uppercase px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-[#1e4da1] dark:text-blue-300 border border-blue-200 dark:border-blue-800 shrink-0">
                      Enrolled
                    </span>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="sticky bottom-6 max-w-md mx-auto flex gap-4 z-40 mt-10">
        <motion.button whileTap={{ scale: 0.95 }} onClick={handleSave} className="flex-[4] bg-[#1e4da1] dark:bg-blue-600 text-white py-4.5 rounded-2xl font-black text-[11px] uppercase shadow-2xl">Confirm Log</motion.button>
        <motion.button whileTap={{ scale: 0.9 }} onClick={onCancel} className="flex-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-[#94a3b8] p-4 rounded-2xl flex items-center justify-center shadow-lg"><X size={24} /></motion.button>
      </div>
    </div>
  );
});

const HistoryView = memo(({ state, onSelectMonth, onRemove, onOpenStats }: { state: AppState, onSelectMonth: (m: HistoryMonth) => void, onRemove: (id: string) => void, onOpenStats: () => void }) => {
  const currentYear = new Date().getFullYear();
  const yearlyRevenue = useMemo(() => (state.history || []).filter(m => m.year === currentYear).reduce((sum, m) => sum + (typeof m.revenue === 'string' ? parseFloat(m.revenue) : Number(m.revenue || 0)), 0), [state.history, currentYear]);

  const chartData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map((m, i) => {
      const monthData = (state.history || []).find(h => h.year === currentYear && h.monthName.startsWith(m));
      return {
        name: m,
        revenue: monthData ? (typeof monthData.revenue === 'string' ? parseFloat(monthData.revenue) : Number(monthData.revenue)) : 0
      };
    });
  }, [state.history, currentYear]);

  const averageMonthly = useMemo(() => {
    const activeMonths = chartData.filter(d => d.revenue > 0);
    return activeMonths.length > 0 ? yearlyRevenue / activeMonths.length : 0;
  }, [chartData, yearlyRevenue]);

  const growthRate = useMemo(() => {
    const activeMonths = chartData.filter(d => d.revenue > 0);
    if (activeMonths.length < 2) return 0;
    const last = activeMonths[activeMonths.length - 1].revenue;
    const prev = activeMonths[activeMonths.length - 2].revenue;
    return prev > 0 ? ((last - prev) / prev) * 100 : 0;
  }, [chartData]);

  return (
    <div className="space-y-6 mt-4 pb-20">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-[#1a1a1a] dark:text-slate-100 uppercase italic">Analytics & History</h2>
        <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-full border border-blue-100 dark:border-blue-800">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-[8px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">{currentYear} Live</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-50 dark:border-slate-800 shadow-sm">
          <p className="text-[#94a3b8] text-[8px] font-black uppercase mb-1">Yearly Total</p>
          <h3 className="text-xl font-black text-[#1e4da1] italic">R{yearlyRevenue.toLocaleString()}</h3>
          <div className="mt-2 flex items-center gap-1">
            <div className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${growthRate >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
              {growthRate >= 0 ? '+' : ''}{growthRate.toFixed(1)}%
            </div>
            <span className="text-[7px] text-slate-400 font-bold uppercase">vs prev month</span>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-50 dark:border-slate-800 shadow-sm">
          <p className="text-[#94a3b8] text-[8px] font-black uppercase mb-1">Avg Monthly</p>
          <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 italic">R{averageMonthly.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h3>
          <p className="text-[7px] text-slate-400 font-bold uppercase mt-2">Based on active months</p>
        </motion.div>
      </div>

      {/* Revenue Chart */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="bg-white dark:bg-slate-800/60 p-5 rounded-[2rem] border border-slate-50 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Revenue Trend</p>
            <p className="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase italic">Monthly Performance</p>
          </div>
          <BarChart3 size={18} className="text-blue-500 opacity-50" />
        </div>
        
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1e4da1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#1e4da1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 8, fontWeight: 900, fill: '#94a3b8' }}
                interval={0}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 8, fontWeight: 900, fill: '#94a3b8' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e4da1', 
                  border: 'none', 
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '10px',
                  fontWeight: '900',
                  textTransform: 'uppercase'
                }}
                itemStyle={{ color: '#fff' }}
                cursor={{ stroke: '#1e4da1', strokeWidth: 1 }}
              />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke="#1e4da1" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorRev)" 
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* History List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recent Records</p>
          <button onClick={onOpenStats} className="text-[9px] font-black text-blue-500 uppercase flex items-center gap-1">
            Full Report <ArrowRight size={10} />
          </button>
        </div>
        
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-3">
          {(!state.history || state.history.length === 0) ? (
            <div className="bg-slate-50 dark:bg-slate-900/40 p-10 rounded-3xl border-2 border-dashed border-slate-100 dark:border-slate-800 text-center">
              <History size={32} className="mx-auto text-slate-200 mb-2" />
              <p className="text-[9px] font-black text-slate-400 uppercase">No History Records</p>
            </div>
          ) : state.history.map((m, idx) => (
            <motion.div key={m.id || `history-${idx}`} variants={invoiceItemVariants} className="relative group">
              <motion.button whileTap={{ scale: 0.98 }} onClick={() => onSelectMonth(m)} className="w-full p-4 bg-white dark:bg-slate-800/60 border border-slate-50 dark:border-slate-800 rounded-2xl flex items-center justify-between shadow-sm hover:border-blue-200 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-900 dark:bg-slate-700 text-white rounded-xl flex flex-col items-center justify-center italic font-black">
                    <span className="text-[7px] uppercase opacity-40 leading-none">{m.monthName.slice(0, 3)}</span>
                    <span className="text-sm leading-none mt-0.5">{m.year % 100}</span>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black text-[#1a1a1a] dark:text-slate-100 uppercase italic leading-none">{m.monthName}</p>
                    <p className="text-[9px] text-[#1e4da1] font-black uppercase mt-1">R{Number(m.revenue).toLocaleString()}</p>
                  </div>
                </div>
                <ChevronRight className="text-slate-300 group-hover:text-blue-500 transition-colors" size={16} />
              </motion.button>
              <button onClick={(e) => { e.stopPropagation(); onRemove(m.id); }} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white p-1.5 rounded-full border-2 border-white dark:border-slate-900 shadow-md active:scale-90 transition-transform opacity-0 group-hover:opacity-100">
                <Trash2 size={12} />
              </button>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
});



const InvoicesView = memo(({ state, user, monthLabel, onUpdatePayment, onResetInvoice, onShowRecovery }: { state: AppState, user: any, monthLabel?: string, onUpdatePayment: (p: Partial<Payment>) => void, onResetInvoice: (id: string, label: string) => void, onShowRecovery: () => void }) => {
  const [sel, setSel] = useState<string | null>(null);
  const [allocations, setAllocations] = useState<Record<string, 'personal' | 'business'>>(() => {
    try {
      const saved = localStorage.getItem(`jflips_invoice_bank_allocations_${user?.id || 'default'}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [invoiceFilter, setInvoiceFilter] = useState<'all' | 'athletes' | 'teams' | 'gyms' | 'staff'>('all');
  const [scale, setScale] = useState(1);
  const [manualZoom, setManualZoom] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const invoiceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateScale = () => {
      if (manualZoom !== null) {
        setScale(manualZoom);
        return;
      }
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        const targetWidth = 820; 
        if (width < targetWidth) {
          setScale(width / targetWidth);
        } else {
          setScale(1);
        }
      }
    };
    updateScale();
    const timer = setTimeout(updateScale, 100);
    window.addEventListener('resize', updateScale);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateScale);
    };
  }, [sel, manualZoom]);

  const handleZoomIn = () => setManualZoom(prev => Math.min((prev || scale) + 0.1, 2));
  const handleZoomOut = () => setManualZoom(prev => Math.max((prev || scale) - 0.1, 0.3));
  const handleZoomReset = () => setManualZoom(null);

  const calendarProps = useMemo(() => {
    if (!monthLabel) {
      const now = new Date();
      return { month: now.getMonth(), year: now.getFullYear() };
    }
    const parts = monthLabel.split(' ');
    if (parts.length !== 2) return null;
    const mIndex = MONTHS.indexOf(parts[0]);
    const year = parseInt(parts[1]);
    if (mIndex === -1 || isNaN(year)) return null;
    return { month: mIndex, year };
  }, [monthLabel]);

  const groupedInvoices = useMemo(() => {
    if (monthLabel) {
      const monthPayments = (state.payments || []).filter(p => p.invoice_id === monthLabel);
      const uniqueMap = new Map<string, any>();
      
      monthPayments.forEach(p => {
        if (!uniqueMap.has(p.family_id)) {
          const staffMember = state.staff.find(s => s.id === p.family_id);
          const isMe = p.family_id === user?.id;
          uniqueMap.set(p.family_id, {
            id: p.family_id,
            label: p.client_name || 'Client',
            studentIds: [],
            family_id: p.family_id,
            isGym: state.gyms.some(g => g.id === p.family_id),
            isStaff: !!staffMember || isMe,
            isHistory: true
          });
        }
      });

      // Also add staff who had sessions in this month but no payment record yet
      (state.sessions || []).forEach(s => {
        if (s.coach_id && !uniqueMap.has(s.coach_id)) {
          const staffMember = state.staff.find(st => st.id === s.coach_id);
          // Only include if it's a team session
          const isTeamSession = state.gyms.some(g => g.id === s.classTypeId);
          if (staffMember && isTeamSession) {
            uniqueMap.set(s.coach_id, {
              id: s.coach_id,
              label: staffMember.name,
              studentIds: [],
              family_id: s.coach_id,
              isGym: false,
              isStaff: true,
              isHistory: true
            });
          }
        }
      });
      
      return Array.from(uniqueMap.values());
    }

    // ── COACH VIEW: only show their own payable invoice ───────────────────────
    if (state.profile.role === 'coach') {
      const myStaff = (state.staff || []).find(st => st.id === user?.id || (st.email && user?.email && st.email.toLowerCase() === user.email.toLowerCase()));
      const myIds = new Set([user?.id, myStaff?.id, myStaff?.email].filter(Boolean));
      const coachSessions = (state.sessions || []).filter(s => myIds.has(s.coach_id));
      if (coachSessions.length === 0) return [];
      return [{
        id: `coach-self-${user?.id || 'coach'}`,
        label: 'My Coaching Invoice',
        studentIds: [],
        family_id: user?.id || 'coach',
        isGym: false,
        isStaff: true,
        isHistory: false,
        isOrganization: false,
      }];
    }

    const groups: { [key: string]: (Student | Gym)[] } = {};
    const solos: (Student | Gym)[] = [];

    (state.students || []).filter(s => !s.is_gym_member).forEach(s => {
      if (s.groupKey) {
        if (!groups[s.groupKey]) groups[s.groupKey] = [];
        groups[s.groupKey].push(s);
      } else solos.push(s);
    });

    (state.gyms || []).forEach(g => {
      // If a gym has a parent, it belongs to that parent's invoice
      if (g.parent_gym_id) {
        if (!groups[g.parent_gym_id]) groups[g.parent_gym_id] = [];
        groups[g.parent_gym_id].push(g);
      } else if (g.gym_type === 'cheer') {
        // Only top-level cheer teams (parents) are soloed if they have no sub-teams yet
        if (!groups[g.id]) groups[g.id] = [];
        groups[g.id].push(g);
      } else {
        solos.push(g);
      }
    });

    const res = Object.entries(groups).filter(([_, list]) => list.length > 0).map(([groupId, list]) => {
      const parentGym = state.gyms.find(g => g.id === groupId);
      let label = list.map(item => item.name).join(' & ');
      if (parentGym) label = parentGym.name;
      
      return {
        id: `group-${groupId}`,
        label,
        studentIds: list.map(s => s.id),
        family_id: groupId,
        isGym: !!parentGym,
        isStaff: false,
        isHistory: false,
        isOrganization: !!parentGym
      };
    });

    (solos || []).forEach(s => {
      // Don't duplicate if already in a group
      if (res.some(r => r.family_id === s.id)) return;
      const isActuallyGym = 'pay_amount' in s || 'gym_type' in s;
      res.push({
        id: `solo-${s.id}`,
        label: s.name,
        studentIds: (!isActuallyGym) ? [s.id] : [],
        family_id: s.id,
        isGym: isActuallyGym,
        isStaff: false,
        isHistory: false,
        isOrganization: isActuallyGym
      });
    });

    // Add Staff Invoices (split into Turn-in & Organization invoices)
    if (state.profile.role === 'owner') {
      (state.staff || []).forEach(coach => {
        if (!coach.id) return;

        // 1. Turn-in Invoice (Owner pays coach for Tumbling/ClassType/Direct sessions)
        res.push({
          id: `staff-turnin-${coach.id}`,
          label: `${coach.name} - Turn-in`,
          subLabel: `Turn-in Pay (JFlips Owes Coach)`,
          studentIds: [],
          family_id: `turnin_${coach.id}`,
          coachId: coach.id,
          invoiceType: 'turnin',
          isGym: false,
          isStaff: true,
          isHistory: false,
          isOrganization: false
        } as any);

        // 2. Organization Invoices (Coaching for cheer organizations)
        const cheerOrgSessions = (state.sessions || []).filter(s => {
          if (s.coach_id !== coach.id) return false;
          const gym = state.gyms.find(g => g.id === s.classTypeId);
          return gym && gym.gym_type === 'cheer';
        });

        const orgsWithSessions = new Set<string>();
        cheerOrgSessions.forEach(s => {
          const gym = state.gyms.find(g => g.id === s.classTypeId);
          if (gym) {
            const parentId = gym.parent_gym_id || gym.id;
            orgsWithSessions.add(parentId);
          }
        });

        orgsWithSessions.forEach(orgId => {
          const org = state.gyms.find(g => g.id === orgId);
          res.push({
            id: `staff-org-${coach.id}-${orgId}`,
            label: `${coach.name} @ ${org?.name || 'Organization'}`,
            subLabel: `Org Invoice for ${org?.name || 'Organization'}`,
            studentIds: [],
            family_id: `org_${coach.id}_${orgId}`,
            coachId: coach.id,
            orgId: orgId,
            invoiceType: 'organization',
            isGym: false,
            isStaff: true,
            isHistory: false,
            isOrganization: false
          } as any);
        });
      });
    }

    return res;
  }, [state.students, state.gyms, state.payments, state.sessions, monthLabel]);

  const filteredInvoices = useMemo(() => {
    return (groupedInvoices || []).filter(g => {
      if (invoiceFilter === 'all') return true;
      if (invoiceFilter === 'staff') return g.isStaff;
      
      if (g.isStaff) return false;
      
      if (invoiceFilter === 'gyms') {
        const parentGym = state.gyms.find(gym => gym.id === g.family_id);
        return parentGym && parentGym.gym_type === 'tumbling';
      }
      
      if (invoiceFilter === 'teams') {
        const parentGym = state.gyms.find(gym => gym.id === g.family_id);
        return parentGym && parentGym.gym_type === 'cheer';
      }
      
      if (invoiceFilter === 'athletes') {
        return !g.isGym;
      }
      
      return true;
    });
  }, [groupedInvoices, invoiceFilter, state.gyms]);

  const selectedGroup = useMemo(() =>
    (groupedInvoices || []).find(g => g.family_id === sel),
    [groupedInvoices, sel]
  );

  const bankAllocation = selectedGroup ? (allocations[selectedGroup.family_id] || 'personal') : 'personal';

  const handleToggleBankAllocation = (type: 'personal' | 'business') => {
    if (!selectedGroup) return;
    const next = { ...allocations, [selectedGroup.family_id]: type };
    setAllocations(next);
    localStorage.setItem(`jflips_invoice_bank_allocations_${user?.id || 'default'}`, JSON.stringify(next));
  };

  const athleteSessions = useMemo(() => {
    if (!selectedGroup) return [];

    if (selectedGroup.isStaff) {
      const g = selectedGroup as any;
      const coachId = g.coachId || selectedGroup.family_id.replace(/^(turnin_|org_[^_]+_)/, '');
      const invoiceType = g.invoiceType || (selectedGroup.family_id.startsWith('org_') ? 'organization' : 'turnin');
      const orgId = g.orgId || (selectedGroup.family_id.startsWith('org_') ? selectedGroup.family_id.split('_')[2] : null);

      const coach = state.staff.find(st => st.id === coachId);
      const defaultPayRate = coach?.pay_rate || 0;

      if (invoiceType === 'organization' && orgId) {
        const orgGym = state.gyms.find(gym => gym.id === orgId);
        const orgPayRate = orgGym?.coach_rates?.[coachId] !== undefined ? orgGym.coach_rates[coachId] : defaultPayRate;

        return (state.sessions || []).filter(s => {
          if (s.coach_id !== coachId) return false;
          const gym = state.gyms.find(gm => gm.id === s.classTypeId);
          return gym && (gym.id === orgId || gym.parent_gym_id === orgId);
        }).map(s => {
          const gym = (state.gyms || []).find(gm => gm.id === s.classTypeId);
          const className = gym ? gym.name : 'Cheer Session';
          const coverSuffix = s.covering_coach_name ? ` - ${s.covering_coach_name}` : '';
          const customSuffix = s.custom_event_name ? ` - ${s.custom_event_name}` : '';
          
          return {
            ...s,
            targetStudentName: orgGym?.name || 'Organization Coaching',
            displayPrice: orgPayRate * (s.hours_coached || 1),
            displayClassName: `${className}${coverSuffix}${customSuffix}${s.is_competition ? ' Competition' : ''} (${s.hours_coached || 1} hrs)`
          };
        }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      } else {
        return (state.sessions || []).filter(s => {
          if (s.coach_id !== coachId) return false;
          const gym = state.gyms.find(gm => gm.id === s.classTypeId);
          return !gym || gym.gym_type !== 'cheer';
        }).map(s => {
          const gym = (state.gyms || []).find(gm => gm.id === s.classTypeId);
          const ct = (state.classTypes || []).find(c => c.id === s.classTypeId);
          const className = ct ? ct.name : (gym ? gym.name : 'Tumbling / Class Session');
          const coverSuffix = s.covering_coach_name ? ` - ${s.covering_coach_name}` : '';
          const customSuffix = s.custom_event_name ? ` - ${s.custom_event_name}` : '';
          
          return {
            ...s,
            targetStudentName: 'Turn-in Coaching Fee',
            displayPrice: defaultPayRate * (s.hours_coached || 1),
            displayClassName: `${className}${coverSuffix}${customSuffix}${s.is_competition ? ' Competition' : ''} (${s.hours_coached || 1} hrs)`
          };
        }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      }
    }

    let billableIds: string[] = [];
    if (monthLabel) {
      const familySessions = (state.sessions || []).filter(s => {
        const gym = state.gyms.find(g => g.id === s.classTypeId);
        if (gym && (gym.id === selectedGroup.family_id || gym.parent_gym_id === selectedGroup.family_id)) return true;
        
        return (s.studentIds || []).some(sid => {
          const student = state.students.find(st => st.id === sid);
          if (!student) return false;
          const studentFamId = student.groupKey || student.id;
          const studentGym = state.gyms.find(g => g.id === studentFamId);
          return studentFamId === selectedGroup.family_id || studentGym?.parent_gym_id === selectedGroup.family_id;
        });
      });
      billableIds = Array.from(new Set(familySessions.flatMap(s => s.studentIds)));
    } else {
      billableIds = selectedGroup.studentIds || [];
    }

    return (state.sessions || []).filter(s => {
      const gym = state.gyms.find(g => g.id === s.classTypeId);
      if (gym && (gym.id === selectedGroup.family_id || gym.parent_gym_id === selectedGroup.family_id)) {
        return true;
      }
      if (gym) return false; // Gym sessions are billed to the gym, not the athletes
      return (s.studentIds || []).some(sid => billableIds.includes(sid));
    }).flatMap(s => {
      const ct = (state.classTypes || []).find(c => c.id === s.classTypeId);
      const gym = (state.gyms || []).find(g => g.id === s.classTypeId);
      
      let price = ct ? ct.price : (gym ? gym.pay_amount : 0);
      if (gym && s.custom_event_name) {
        const customPreset = gym.custom_event_presets?.find(p => {
          const name = p.includes(':') ? p.split(':')[0] : p;
          return name.toLowerCase() === s.custom_event_name?.toLowerCase();
        });
        if (customPreset && customPreset.includes(':')) {
          const ratePart = customPreset.split(':')[1];
          const parsed = parseFloat(ratePart);
          if (!isNaN(parsed)) {
            price = parsed;
          }
        }
      }

      const className = ct ? ct.name : (gym ? gym.name : 'Session');
      const baseClassName = className;
      const coverSuffix = s.covering_coach_name ? ` - ${s.covering_coach_name}` : '';
      const customSuffix = s.custom_event_name ? ` - ${s.custom_event_name}` : '';

      if (gym && (gym.id === selectedGroup.family_id || gym.parent_gym_id === selectedGroup.family_id)) {
        let currentPrice = price;
        if (s.is_competition && gym.competition_rate) {
          currentPrice = gym.competition_rate;
        }

        const lineTotal = currentPrice * (s.hours_coached || gym.default_hours || 1);
        const displayName = s.custom_event_name 
          ? `${s.custom_event_name}${coverSuffix} (${s.hours_coached || gym.default_hours || 1} hrs)${s.is_competition ? ' - COMPETITION' : ''}`
          : `${baseClassName}${coverSuffix}${customSuffix} (${s.hours_coached || gym.default_hours || 1} hrs)${s.is_competition ? ' - COMPETITION' : ''}`;

        return [{
          ...s,
          targetStudentName: gym.name,
          displayPrice: lineTotal,
          displayClassName: displayName
        }];
      }

      const matching = (s.studentIds || []).filter(sid => billableIds.includes(sid));
      return matching.map(sid => {
        const studentObj = state.students.find(st => st.id === sid);
        const studentPrice = getStudentSessionPrice(studentObj, s, price, baseClassName);
        const displayName = s.custom_event_name 
          ? `${s.custom_event_name}${coverSuffix} (${s.hours_coached || gym?.default_hours || 1} hrs)${s.is_competition ? ' - COMPETITION' : ''}`
          : `${baseClassName}${coverSuffix}${customSuffix}`;
        return {
          ...s,
          targetStudentName: studentObj?.name || (sid === selectedGroup?.family_id ? selectedGroup.label : 'Client'),
          displayPrice: studentPrice || 0,
          displayClassName: displayName
        };
      });
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [state.sessions, selectedGroup, state.students, state.classTypes, state.gyms, monthLabel]);

  const currentDisplay = useMemo(() => {
    if (monthLabel) return monthLabel;
    if (!athleteSessions || athleteSessions.length === 0) {
      return new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
    }

    const dates = athleteSessions.map(s => new Date(s.date));
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

    const formatMonth = (d: Date) => d.toLocaleString('en-US', { month: 'long' });
    const formatYear = (d: Date) => d.getFullYear();

    if (formatMonth(minDate) === formatMonth(maxDate) && formatYear(minDate) === formatYear(maxDate)) {
      return `${formatMonth(minDate)} ${formatYear(minDate)}`;
    }

    if (formatYear(minDate) === formatYear(maxDate)) {
      return `${formatMonth(minDate)} - ${formatMonth(maxDate)} ${formatYear(minDate)}`;
    }

    return `${formatMonth(minDate)} ${formatYear(minDate)} - ${formatMonth(maxDate)} ${formatYear(maxDate)}`;
  }, [monthLabel, athleteSessions]);

  const dbInvoiceId = useMemo(() => monthLabel || 'Active', [monthLabel]);

  const calculateTotal = useCallback((group: { family_id: string, studentIds?: string[], isGym?: boolean, isStaff?: boolean }) => {
    if (group.isStaff) {
      const g = group as any;
      const coachId = g.coachId || group.family_id.replace(/^(turnin_|org_[^_]+_)/, '');
      const invoiceType = g.invoiceType || (group.family_id.startsWith('org_') ? 'organization' : 'turnin');
      const orgId = g.orgId || (group.family_id.startsWith('org_') ? group.family_id.split('_')[2] : null);

      const coach = state.staff.find(s => s.id === coachId);
      const defaultPayRate = coach?.pay_rate || 0;

      if (invoiceType === 'organization' && orgId) {
        const orgGym = state.gyms.find(gym => gym.id === orgId);
        const orgPayRate = orgGym?.coach_rates?.[coachId] !== undefined ? orgGym.coach_rates[coachId] : defaultPayRate;
        return (state.sessions || []).filter(s => {
          if (s.coach_id !== coachId) return false;
          const gym = state.gyms.find(gm => gm.id === s.classTypeId);
          return gym && (gym.id === orgId || gym.parent_gym_id === orgId);
        }).reduce((acc: number, s) => acc + (orgPayRate * (s.hours_coached || 1)), 0);
      } else {
        return (state.sessions || []).filter(s => {
          if (s.coach_id !== coachId) return false;
          const gym = state.gyms.find(gm => gm.id === s.classTypeId);
          return !gym || gym.gym_type !== 'cheer';
        }).reduce((acc: number, s) => acc + (defaultPayRate * (s.hours_coached || 1)), 0);
      }
    }
    const billableSessions = (state.sessions || []).filter(s => {
      const gym = state.gyms.find(g => g.id === s.classTypeId);
      if (gym && (gym.id === group.family_id || gym.parent_gym_id === group.family_id)) {
        return true;
      }
      if (gym) return false; // Gym sessions don't bill athletes
      
      return (s.studentIds || []).some(sid => {
        if (monthLabel) {
          const student = state.students.find(st => st.id === sid);
          if (!student) return false;
          const studentFamId = student.groupKey || student.id;
          const studentGym = state.gyms.find(g => g.id === studentFamId);
          return studentFamId === group.family_id || studentGym?.parent_gym_id === group.family_id;
        }
        return (group.studentIds || []).includes(sid);
      });
    });

    return billableSessions.reduce((acc: number, s) => {
      const ct = (state.classTypes || []).find(c => c.id === s.classTypeId);
      const gym = (state.gyms || []).find(g => g.id === s.classTypeId);
      
      let price = ct ? ct.price : (gym ? gym.pay_amount : 0);
      if (gym && s.custom_event_name) {
        const customPreset = gym.custom_event_presets?.find(p => {
          const name = p.includes(':') ? p.split(':')[0] : p;
          return name.toLowerCase() === s.custom_event_name?.toLowerCase();
        });
        if (customPreset && customPreset.includes(':')) {
          const ratePart = customPreset.split(':')[1];
          const parsed = parseFloat(ratePart);
          if (!isNaN(parsed)) {
            price = parsed;
          }
        }
      }
      if (s.is_competition && gym?.competition_rate) {
        price = gym.competition_rate;
      }

      if (gym && (gym.id === group.family_id || gym.parent_gym_id === group.family_id)) {
        return acc + (price * (s.hours_coached || gym.default_hours || 1));
      } else {
        const className = ct ? ct.name : (gym ? gym.name : '');
        const matchingStudents = (s.studentIds || []).filter(sid => {
          if (monthLabel) {
            const student = state.students.find(st => st.id === sid);
            if (!student) return false;
            const studentFamId = student.groupKey || student.id;
            const studentGym = state.gyms.find(g => g.id === studentFamId);
            return studentFamId === group.family_id || studentGym?.parent_gym_id === group.family_id;
          }
          return (group.studentIds || []).includes(sid);
        });
        const sessionSum = matchingStudents.reduce((sum, sid) => {
          const student = state.students.find(st => st.id === sid);
          return sum + getStudentSessionPrice(student, s, price, className);
        }, 0);
        return acc + sessionSum;
      }
    }, 0);
  }, [state.sessions, state.classTypes, state.gyms, state.students, monthLabel]);

  const total = useMemo(() =>
    selectedGroup ? calculateTotal(selectedGroup) : 0,
    [selectedGroup, calculateTotal]
  );

  const currentPayment = useMemo(() => {
    if (!selectedGroup) return null;
    return (state.payments || []).find(p => p.family_id === selectedGroup.family_id && p.invoice_id === dbInvoiceId);
  }, [state.payments, selectedGroup, dbInvoiceId]);

  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [downloadAllProgress, setDownloadAllProgress] = useState(0);
  const batchRenderRef = useRef<HTMLDivElement>(null);

  const handleDownloadImage = async () => {
    if (!selectedGroup || !invoiceRef.current) return;
    setIsGenerating(true);
    
    const wasDark = document.documentElement.classList.contains('dark');
    if (wasDark) {
      document.documentElement.classList.remove('dark');
    }
    
    try {
      await new Promise(r => setTimeout(r, 600));
      const dataUrl = await toPng(invoiceRef.current, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        cacheBust: true,
        includeQueryParams: true,
        style: { borderRadius: '2rem' }
      });
      const fileName = `Invoice_${selectedGroup.label.replace(/\s+/g, '_')}.png`;
      await saveAndShareFile(dataUrl, fileName);
    } catch (e) {
      console.error('Invoice capture failed:', e);
    } finally { 
      if (wasDark) {
        document.documentElement.classList.add('dark');
      }
      setIsGenerating(false); 
    }
  };

  const handleDownloadPdf = async () => {
    if (!selectedGroup || !invoiceRef.current) return;
    setIsGenerating(true);
    
    // Load jsPDF if not loaded
    if (!(window as any).jspdf) {
      try {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load jsPDF'));
          document.head.appendChild(script);
        });
      } catch (e) {
        setIsGenerating(false);
        alert('Failed to load PDF library.');
        return;
      }
    }

    const wasDark = document.documentElement.classList.contains('dark');
    if (wasDark) {
      document.documentElement.classList.remove('dark');
    }
    
    try {
      await new Promise(r => setTimeout(r, 600));
      const dataUrl = await toPng(invoiceRef.current, {
        backgroundColor: '#ffffff',
        pixelRatio: 3, // slightly higher quality for PDF
        cacheBust: true,
        includeQueryParams: true,
      });

      const { jsPDF } = (window as any).jspdf;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      
      const pdfW = 210;
      const margin = 10;
      const contentW = pdfW - (margin * 2);

      // get image dimensions from dataUrl to maintain ratio
      const imgProps = doc.getImageProperties(dataUrl);
      const pdfH = (imgProps.height * contentW) / imgProps.width;
      
      doc.addImage(dataUrl, 'PNG', margin, margin, contentW, pdfH);
      const fileName = `Invoice_${selectedGroup.label.replace(/\s+/g, '_')}.pdf`;
      if (Capacitor.isNativePlatform()) {
        const pdfBase64 = doc.output('datauristring');
        await saveAndShareFile(pdfBase64, fileName);
      } else {
        doc.save(fileName);
      }
    } catch (e) {
      console.error('PDF generation failed:', e);
      alert('Failed to generate PDF');
    } finally {
      if (wasDark) {
        document.documentElement.classList.add('dark');
      }
      setIsGenerating(false);
    }
  };

  const handleDownloadAll = async () => {
    if (!filteredInvoices || filteredInvoices.length === 0) return;
    setIsDownloadingAll(true);
    setDownloadAllProgress(0);

    const wasDark = document.documentElement.classList.contains('dark');
    if (wasDark) {
      document.documentElement.classList.remove('dark');
    }

    const dataUrls: { name: string; url: string }[] = [];

    for (let i = 0; i < filteredInvoices.length; i++) {
      const group = filteredInvoices[i];
      setDownloadAllProgress(Math.round(((i) / filteredInvoices.length) * 100));

      try {
        // Temporarily select the group so the invoice renders into batchRenderRef
        setSel(group.family_id);
        // Wait for React to render + fonts/images to settle
        await new Promise(r => setTimeout(r, 900));

        if (!invoiceRef.current) continue;
        const dataUrl = await toPng(invoiceRef.current, {
          backgroundColor: '#ffffff',
          pixelRatio: 2,
          cacheBust: true,
          includeQueryParams: true,
        });
        dataUrls.push({ name: `Invoice_${group.label.replace(/\s+/g, '_')}.png`, url: dataUrl });
      } catch (e) {
        console.error(`Failed to capture invoice for ${group.label}`, e);
      }
    }

    // Reset selection after capturing
    setSel(null);
    setDownloadAllProgress(100);

    if (wasDark) {
      document.documentElement.classList.add('dark');
    }

    // Try Web Share API first (works on iOS Safari, Android Chrome)
    const canShare = typeof navigator.share === 'function' && typeof navigator.canShare === 'function';
    if (canShare) {
      try {
        const files: File[] = dataUrls.map(({ name, url }) => {
          const byteStr = atob(url.split(',')[1]);
          const arr = new Uint8Array(byteStr.length);
          for (let j = 0; j < byteStr.length; j++) arr[j] = byteStr.charCodeAt(j);
          return new File([arr], name, { type: 'image/png' });
        });
        if (navigator.canShare({ files })) {
          await navigator.share({ files, title: 'JFLIPS Invoices' });
          setIsDownloadingAll(false);
          setDownloadAllProgress(0);
          return;
        }
      } catch (e) {
        // Share cancelled or failed — fall through to sequential download
      }
    }

    // Fallback: sequential anchor downloads (desktop / browsers without Share API)
    for (const { name, url } of dataUrls) {
      await new Promise<void>(resolve => {
        const link = document.createElement('a');
        link.download = name;
        link.href = url;
        link.click();
        setTimeout(resolve, 400); // small gap so browser doesn't block
      });
    }

    setIsDownloadingAll(false);
    setDownloadAllProgress(0);
  };

  if (sel && selectedGroup) {
    const gymEntity = state.gyms.find(g => g.id === selectedGroup.family_id);
    const isCheerTeam = gymEntity && gymEntity.gym_type === 'cheer';

    return (
      <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 mt-4 pb-32 w-full px-2">
        <div className="flex justify-between items-center mb-2">
          <button onClick={() => setSel(null)} className="text-slate-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 hover:text-[#1e4da1]">&larr; Back</button>
            <div className="flex gap-2">
              {!monthLabel && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => onResetInvoice(selectedGroup.family_id, selectedGroup.label)}
                className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800 px-3 py-2 rounded-xl font-black text-[9px] uppercase shadow-md flex items-center gap-2"
              >
                <RefreshCw size={12} /> Reset
              </motion.button>
            )}
            {!monthLabel && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onShowRecovery}
                className="bg-blue-50 dark:bg-blue-900/20 text-[#1e4da1] dark:text-blue-400 border border-blue-100 dark:border-blue-800 px-3 py-2 rounded-xl font-black text-[9px] uppercase shadow-md flex items-center gap-2"
              >
                <History size={12} /> Recover
              </motion.button>
            )}
            <motion.button whileTap={{ scale: 0.95 }} onClick={handleDownloadPdf} disabled={isGenerating} title="Download PDF" className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-3 py-2 rounded-xl font-black text-[9px] uppercase shadow-lg flex items-center gap-2 disabled:opacity-70 transition-all">{isGenerating ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}</motion.button>
            <motion.button whileTap={{ scale: 0.95 }} onClick={handleDownloadImage} disabled={isGenerating} title="Download PNG" className="bg-[#1e4da1] text-white px-3 py-2 rounded-xl font-black text-[9px] uppercase shadow-lg flex items-center gap-2 disabled:opacity-70 transition-all">{isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}</motion.button>
          </div>
        </div>

        {!selectedGroup.isStaff && (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase italic tracking-wider">Payout Account</h3>
              <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase leading-relaxed tracking-wider">
                Select which of your bank accounts should display on this client's invoice PDF/PNG.
              </p>
            </div>
            <div className="flex w-full md:w-auto bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl gap-1">
              <button 
                onClick={() => handleToggleBankAllocation('personal')} 
                className={`flex-1 md:flex-initial flex items-center justify-center text-center px-5 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all duration-300 ${bankAllocation === 'personal' ? 'bg-[#1e4da1] text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                Personal Acc
              </button>
              <button 
                onClick={() => handleToggleBankAllocation('business')} 
                className={`flex-1 md:flex-initial flex items-center justify-center text-center px-5 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all duration-300 ${bankAllocation === 'business' ? 'bg-[#1e4da1] text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                Business Acc
              </button>
            </div>
          </div>
        )}

        <div ref={containerRef} className="w-full overflow-x-auto no-scrollbar py-4 -mx-2 px-2 relative">
          {/* Zoom Controls */}
          <div className="sticky left-4 bottom-6 z-50 flex items-center gap-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-fit mb-4">
            <motion.button whileTap={{ scale: 0.9 }} onClick={handleZoomOut} className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400 transition-colors"><ZoomOut size={18} /></motion.button>
            <span className="text-xs font-black tabular-nums text-slate-700 dark:text-slate-200 w-12 text-center">{Math.round(scale * 100)}%</span>
            <motion.button whileTap={{ scale: 0.9 }} onClick={handleZoomIn} className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400 transition-colors"><ZoomIn size={18} /></motion.button>
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
            <motion.button whileTap={{ scale: 0.9 }} onClick={handleZoomReset} className="px-3 py-2 text-[10px] font-black uppercase text-white bg-[#1e4da1] rounded-xl shadow-md transition-colors">Reset</motion.button>
          </div>

          {/* ───── INVOICE DOCUMENT ───── */}
          <div
            style={{ 
              width: 794, 
              zoom: scale,
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" 
            }}
            className="bg-white dark:bg-[#0f172a] shadow-2xl mx-auto origin-top"
          >
            <div ref={invoiceRef}>
              {/* ── Chunk sessions into pages ── */}
              {(() => {
                const chunks: (typeof athleteSessions)[] = [];
                for (let i = 0; i < athleteSessions.length; i += MAX_ROWS_PER_PAGE) {
                  chunks.push(athleteSessions.slice(i, i + MAX_ROWS_PER_PAGE));
                }
                if (chunks.length === 0) chunks.push([]); // always render at least one page

                return chunks.map((chunk, pageIdx) => {
                  const isFirstPage = pageIdx === 0;
                  const isLastPage = pageIdx === chunks.length - 1;

                  return (
                    <div
                      key={pageIdx}
                      style={{ width: 794, minHeight: isLastPage ? undefined : 1123, padding: '48px 56px' }}
                      className="relative bg-white dark:bg-[#0f172a]"
                    >
                      {/* ── Blue accent bar ── */}
                      <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#1e4da1]" />

                      {/* ════ HEADER (first page only) ════ */}
                      {isFirstPage && (
                        <>
                          {/* Logo + Invoice meta row */}
                          <div className="flex justify-between items-start mb-8">
                            <div>
                              {state.profile.logo
                                ? <img src={state.profile.logo} className="w-20 h-20 object-contain rounded-xl mb-3" />
                                : <p className="text-3xl font-black italic text-[#1e4da1] mb-3">{state.profile.businessName}</p>
                              }
                              <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">Invoice</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[13px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Period</p>
                              <p className="text-lg font-black text-slate-900 dark:text-slate-100">{currentDisplay}</p>
                              <p className="text-[13px] text-slate-400 mt-2 font-bold">Generated {new Date().toLocaleDateString('en-GB')}</p>
                            </div>
                          </div>

                          {/* Divider */}
                          <div className="w-full h-px bg-slate-200 dark:bg-slate-700 mb-6" />

                          {/* Bill To */}
                          <div className="mb-8">
                            <p className="text-[12px] font-black uppercase tracking-[0.3em] text-[#1e4da1] mb-2">Bill To</p>
                            {(() => {
                              const targetId = selectedGroup?.isStaff ? (selectedGroup as any).orgId : selectedGroup?.family_id;
                              const gymEntity = state.gyms.find(g => g.id === targetId);
                              const isCheerTeam = gymEntity?.gym_type === 'cheer';
                              
                              if (selectedGroup?.isStaff) {
                                const g = selectedGroup as any;
                                const coachId = g.coachId || selectedGroup.family_id.replace(/^(turnin_|org_[^_]+_)/, '');
                                const invoiceType = g.invoiceType || (selectedGroup.family_id.startsWith('org_') ? 'organization' : 'turnin');
                                const orgId = g.orgId || (selectedGroup.family_id.startsWith('org_') ? selectedGroup.family_id.split('_')[2] : null);
                                const coach = state.staff.find(s => s.id === coachId);
                                const orgGym = orgId ? state.gyms.find(gym => gym.id === orgId) : null;

                                if (invoiceType === 'organization' && orgGym) {
                                  return (
                                    <>
                                      <p className="text-xl font-black uppercase italic text-slate-900 dark:text-slate-100">{orgGym?.bill_to_name || orgGym?.name}</p>
                                      {orgGym?.bill_to_address && <p className="text-[12px] text-slate-500 mt-1 whitespace-pre-wrap leading-relaxed">{orgGym.bill_to_address}</p>}
                                      {orgGym?.bill_to_phone && <p className="text-[12px] text-slate-500 mt-1">{orgGym.bill_to_phone}</p>}
                                      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Coached by</p>
                                        <p className="text-[14px] font-black uppercase italic text-[#1e4da1]">{coach?.name}</p>
                                      </div>
                                    </>
                                  );
                                } else {
                                  return (
                                    <>
                                      <p className="text-xl font-black uppercase italic text-slate-900 dark:text-slate-100">{coach?.name || 'Coach'}</p>
                                      <p className="text-[12px] text-slate-500 mt-1">Coach Turn-in Payout (Jay Flips Payout)</p>
                                    </>
                                  );
                                }
                              }

                              if (currentPayment?.bill_to_address || currentPayment?.bill_to_phone) {
                                return (
                                  <>
                                    <p className="text-xl font-black uppercase italic text-slate-900 dark:text-slate-100">{currentPayment.client_name}</p>
                                    {currentPayment.bill_to_address && <p className="text-[12px] text-slate-500 mt-1 whitespace-pre-wrap leading-relaxed">{currentPayment.bill_to_address}</p>}
                                    {currentPayment.bill_to_phone && <p className="text-[12px] text-slate-500 mt-1">{currentPayment.bill_to_phone}</p>}
                                  </>
                                );
                              }
                              if (isCheerTeam && gymEntity?.bill_to_name) {
                                return (
                                  <>
                                    <p className="text-xl font-black uppercase italic text-slate-900 dark:text-slate-100">{gymEntity.bill_to_name}</p>
                                    {gymEntity.bill_to_address && <p className="text-[12px] text-slate-500 mt-1 whitespace-pre-wrap leading-relaxed">{gymEntity.bill_to_address}</p>}
                                    {gymEntity.bill_to_phone && <p className="text-[12px] text-slate-500 mt-1">{gymEntity.bill_to_phone}</p>}
                                  </>
                                );
                              }
                              return <p className="text-xl font-black uppercase italic text-slate-900 dark:text-slate-100">{selectedGroup?.label}</p>;
                            })()}
                          </div>
                        </>
                      )}

                      {/* ── Continued label for subsequent pages ── */}
                      {!isFirstPage && (
                        <div className="flex justify-between items-center mb-6">
                          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 italic">
                            {state.profile.businessName} — {selectedGroup?.label}
                          </p>
                          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                            {currentDisplay} · Page {pageIdx + 1}
                          </p>
                        </div>
                      )}

                      {/* ════ SESSION TABLE ════ */}
                      {/* Column headers — repeated on every page */}
                      <div
                        style={{ display: 'grid', gridTemplateColumns: '100px 1fr 90px', gap: '12px' }}
                        className="mb-2 px-2"
                      >
                        <span className="text-[13px] font-black text-slate-400 uppercase tracking-widest">Date</span>
                        <span className="text-[13px] font-black text-slate-400 uppercase tracking-widest">Description</span>
                        <span className="text-[13px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</span>
                      </div>
                      <div className="w-full h-[2px] bg-slate-900 dark:bg-slate-500 mb-2" />

                      {/* Rows */}
                      {chunk.length > 0 ? (
                        chunk.map((s: any, idx: number) => {
                          const globalIdx = pageIdx * MAX_ROWS_PER_PAGE + idx;
                          const isEven = globalIdx % 2 === 0;
                          return (
                            <div
                              key={idx}
                              style={{ display: 'grid', gridTemplateColumns: '100px 1fr 90px', gap: '12px' }}
                              className={`items-start px-2 py-3 ${isEven ? 'bg-slate-50 dark:bg-slate-800/40' : 'bg-white dark:bg-transparent'} rounded`}
                            >
                              <span className="text-[13px] font-bold text-slate-400 pt-0.5 tabular-nums">
                                {new Date(s.date).toLocaleDateString('en-GB')}
                              </span>
                              <div>
                                <p className="text-[14px] font-black text-slate-900 dark:text-slate-100 uppercase italic leading-tight">
                                  {s.displayClassName}
                                </p>
                                {selectedGroup?.studentIds && selectedGroup.studentIds.length > 1 && (
                                  <p className="text-[12px] text-slate-400 font-bold mt-0.5 normal-case not-italic">{s.targetStudentName}</p>
                                )}
                              </div>
                              <span className="text-[14px] font-black text-slate-900 dark:text-slate-100 text-right tabular-nums">
                                R{s.displayPrice}
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <div className="py-8 text-center">
                          <p className="text-[10px] text-slate-400 font-black uppercase">No sessions logged</p>
                        </div>
                      )}

                      {/* ════ FOOTER (last page only) ════ */}
                      {isLastPage && (
                        <>
                          <div className="w-full h-px bg-slate-200 dark:bg-slate-700 mt-4 mb-6" />

                          {/* Totals + Bank Details row */}
                          <div className="flex justify-between items-end">
                            {/* Bank details */}
                            <div className="space-y-1">
                              <p className="text-[12px] font-black uppercase tracking-[0.25em] text-[#1e4da1] mb-2">Banking Details</p>
                              {(() => {
                                const coach = selectedGroup?.isStaff ? state.staff.find(s => s.id === selectedGroup.family_id) : null;
                                const hasCoachBank = coach && coach.bank_name && coach.account_number;
                                
                                let bankName = hasCoachBank ? coach.bank_name : state.profile.bankName;
                                let accountNumber = hasCoachBank ? coach.account_number : state.profile.accountNumber;
                                let branchCode = hasCoachBank ? coach.branch_code : state.profile.branchCode;
                                let accountType = hasCoachBank ? coach.account_type : state.profile.accountType;

                                if (!hasCoachBank && bankAllocation === 'business') {
                                  bankName = state.profile.bizBankName || state.profile.bankName;
                                  accountNumber = state.profile.bizAccountNumber || state.profile.accountNumber;
                                  branchCode = state.profile.bizBranchCode || state.profile.branchCode;
                                  accountType = state.profile.bizAccountType || state.profile.accountType;
                                }

                                return [
                                  ['Bank', bankName],
                                  ['Account', accountNumber],
                                  ['Branch', branchCode],
                                  ['Type', accountType],
                                ].map(([label, value]) => value ? (
                                  <div key={label} className="flex gap-4">
                                    <span className="text-[12px] font-black uppercase text-slate-400 w-16">{label}</span>
                                    <span className="text-[12px] font-black uppercase text-slate-700 dark:text-slate-300">{value}</span>
                                  </div>
                                ) : null);
                              })()}
                            </div>

                            {/* Total amount */}
                            <div className="text-right">
                              <p className="text-[13px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Total Due</p>
                              <p className="text-6xl font-black italic text-[#1e4da1] dark:text-blue-400 leading-none tabular-nums">
                                R{total}
                              </p>
                            </div>
                          </div>

                          {/* Footer rule */}
                          <div className="w-full h-px bg-slate-100 dark:bg-slate-800 mt-8 mb-3" />
                      <p className="text-[10px] text-slate-300 dark:text-slate-600 font-bold uppercase text-center tracking-widest">
                        Generated by JFLIPS
                      </p>
                        </>
                      )}

                      {/* ── Page number on non-last pages ── */}
                      {!isLastPage && (
                        <div className="absolute bottom-6 right-14">
                          <p className="text-[8px] text-slate-300 font-bold uppercase tracking-widest">
                            Page {pageIdx + 1} of {chunks.length}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6 mt-4 px-2 pb-24">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-[#1a1a1a] dark:text-slate-100 uppercase italic">Invoices</h2>
        {filteredInvoices && filteredInvoices.length > 0 && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleDownloadAll}
            disabled={isDownloadingAll}
            className="flex items-center gap-2 bg-[#1e4da1] text-white px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg disabled:opacity-70 transition-all"
          >
            {isDownloadingAll ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>{downloadAllProgress}%</span>
              </>
            ) : (
              <>
                <Download size={13} />
                <span>All</span>
              </>
            )}
          </motion.button>
        )}
      </div>

      <div className="flex overflow-x-auto gap-2 pb-2 hide-scrollbar">
        {['all', 'athletes', 'teams', 'gyms', 'staff'].map(type => (
          <button
            key={type}
            onClick={() => setInvoiceFilter(type as any)}
            className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest whitespace-nowrap transition-colors ${
              invoiceFilter === type
                ? 'bg-[#1e4da1] text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {type === 'staff' ? 'Coaches' : type}
          </button>
        ))}
      </div>

      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-3">
        {(!filteredInvoices || filteredInvoices.length === 0) ? <div className="bg-white dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-10 text-center shadow-sm"><UserCircle className="mx-auto text-slate-200 dark:text-slate-600 mb-4" size={48} /><p className="text-[#94a3b8] text-[10px] font-black uppercase">No Invoices Found</p></div> : filteredInvoices.map((group, idx) => {
          const count = (state.sessions || []).filter(sess => {
            if (group.isStaff) {
              const g = group as any;
              const coachId = g.coachId || group.family_id.replace(/^(turnin_|org_[^_]+_)/, '');
              const invoiceType = g.invoiceType || (group.family_id.startsWith('org_') ? 'organization' : 'turnin');
              const orgId = g.orgId || (group.family_id.startsWith('org_') ? group.family_id.split('_')[2] : null);

              if (invoiceType === 'organization' && orgId) {
                return sess.coach_id === coachId && state.gyms.some(gm => (gm.id === orgId || gm.parent_gym_id === orgId) && gm.id === sess.classTypeId);
              } else {
                return sess.coach_id === coachId && (!state.gyms.some(gm => gm.id === sess.classTypeId && gm.gym_type === 'cheer'));
              }
            }
            
            const gym = state.gyms.find(g => g.id === sess.classTypeId);
            if (gym && (gym.id === group.family_id || gym.parent_gym_id === group.family_id)) return true;
            if (gym) return false; // Gym sessions are billed to the gym, not the athletes
            
            return (sess.studentIds || []).some(sid => {
              if (monthLabel) {
                const student = state.students.find(st => st.id === sid);
                if (!student) return false;
                const studentFamId = student.groupKey || student.id;
                const studentGym = state.gyms.find(g => g.id === studentFamId);
                return studentFamId === group.family_id || studentGym?.parent_gym_id === group.family_id;
              }
              return (group.studentIds || []).includes(sid);
            });
          }).length;

          const groupPayment = (state.payments || []).find(p => p.family_id === group.family_id && p.invoice_id === dbInvoiceId);
          return (
            <motion.div
              key={`invoice-group-${group.family_id || group.id || 'idx'}-${idx}`}
              variants={invoiceItemVariants}
              whileTap={{ scale: 0.97 }}
              onClick={() => setSel(group.family_id)}
              className="w-full p-4.5 bg-white dark:bg-slate-800/60 border border-slate-50 dark:border-slate-800 rounded-3xl flex items-center justify-between shadow-sm group text-left cursor-pointer"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSel(group.family_id); }}
            >
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center italic font-black text-white shrink-0 ${group.isStaff ? 'bg-emerald-600' : (group.isGym) ? 'bg-blue-600' : (group.studentIds && group.studentIds.length > 1) ? 'bg-[#1e4da1] dark:bg-blue-600' : 'bg-slate-400 dark:bg-slate-600'}`}>
                  {group.isStaff ? <User size={18} /> : (group.isGym) ? <Building2 size={18} /> : (group.studentIds && group.studentIds.length > 1) ? <Users size={18} /> : <User size={18} />}
                </div>
                <div className="overflow-hidden flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-black text-slate-800 dark:text-slate-100 text-[17px] uppercase italic group-hover:text-[#1e4da1] transition-colors">{group.label}</p>
                    {(group as any).subLabel && (
                      <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900/40 uppercase tracking-wider">
                        {(group as any).subLabel}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5"><Calendar size={9} className="text-[#94a3b8]" /><p className="text-[9px] text-slate-500 font-black uppercase">{count} logs</p></div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-2">
                <ChevronRight className="text-slate-300 group-hover:text-[#1e4da1]" size={20} />
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
});

// --- HELPER COMPONENTS ---

const NavButton = memo(({ active, icon, label, onClick }: { active: boolean, icon: React.ReactNode, label: string, onClick: () => void }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-[#1e4da1] dark:text-blue-400' : 'text-[#94a3b8] dark:text-slate-600'}`}>
    <div className={`p-2 rounded-xl transition-all duration-300 ${active ? 'bg-[#eff6ff] dark:bg-blue-900/30 scale-110' : 'bg-transparent'}`}>{icon}</div>
    <span className={`text-[8px] font-black uppercase tracking-widest ${active ? 'opacity-100' : 'opacity-60'}`}>{label}</span>
  </button>
));

const Modal: React.FC<{ title: string, onClose: () => void, children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-3 sm:p-4">
    <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="bg-white dark:bg-[#1e293b] w-full max-w-lg rounded-t-[2rem] sm:rounded-[2rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
      <div className="p-6 pb-3 flex justify-between items-center border-b border-slate-50 dark:border-slate-800 shrink-0"><h3 className="font-black text-[10px] uppercase tracking-widest text-[#94a3b8]">{title}</h3><button onClick={onClose} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-[#94a3b8]"><X size={16} /></button></div>
      <div className="p-6 pt-4 no-scrollbar overflow-y-auto flex-1">{children}</div>
    </motion.div>
  </div>
);

const BulkImportModal: React.FC<{ onImport: (names: string[]) => void, onCancel: () => void }> = ({ onImport, onCancel }) => {
  const [text, setText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    reader.onload = (event) => {
      const data = event.target?.result;
      if (isExcel) {
        try {
          const workbook = XLSX.read(data, { type: 'array' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
          const names = json
            .filter(row => row.length >= 1)
            .map(row => {
              const f = String(row[0] || '').trim();
              const l = String(row[1] || '').trim();
              return `${f} ${l}`.trim();
            })
            .filter(n => n.length > 0 && !['name', 'firstname', 'first name', 'surname', 'last name'].includes(n.toLowerCase()));
          setText(prev => prev ? prev + '\n' + names.join('\n') : names.join('\n'));
        } catch (_) { alert("Excel error"); }
      } else {
        const t = data as string;
        const names = t.split(/\r?\n/).map(l => l.split(',')[0].trim()).filter(n => n.length > 0);
        setText(prev => prev ? prev + '\n' + names.join('\n') : names.join('\n'));
      }
    };
    if (isExcel) reader.readAsArrayBuffer(file);
    else reader.readAsText(file);
  };

  return (
    <div className="space-y-4">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Paste names (one per line) or upload a file</p>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Athlete Name 1&#10;Athlete Name 2"
        className="w-full h-48 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl font-black uppercase text-[10px] outline-none dark:text-slate-200 resize-none"
      />
      <div className="flex gap-2">
        <button onClick={() => fileInputRef.current?.click()} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2">
          <Upload size={14} /> Upload Excel/CSV
        </button>
        <input type="file" ref={fileInputRef} onChange={handleFile} accept=".csv,.xlsx,.xls" className="hidden" />
      </div>
      <div className="flex gap-2 pt-2">
        <button 
          onClick={() => onImport(text.split(/\r?\n/).map(n => n.trim()).filter(n => n.length > 0))}
          className="flex-[2] py-4 bg-[#1e4da1] text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg"
        >
          Import Athletes
        </button>
        <button onClick={onCancel} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-widest">Cancel</button>
      </div>
    </div>
  );
};

const AthleteProfileModal: React.FC<any> = ({ otherStudents, initialData, onSubmit, onDelete, onCancel, initialExtra }) => {
  const [name, setName] = useState(initialData?.name || '');

  // Registration fields
  const [firstName, setFirstName] = useState(initialData?.first_name || '');
  const [lastName, setLastName] = useState(initialData?.last_name || '');
  const [dob, setDob] = useState(initialData?.dob || '');
  const [age, setAge] = useState(initialData?.age?.toString() || '');
  const [medicalNotes, setMedicalNotes] = useState(initialData?.medical_notes || '');
  const [parent1Name, setParent1Name] = useState(initialData?.parent1_name || '');
  const [parent1Phone, setParent1Phone] = useState(initialData?.parent1_phone || '');
  const [parent1Email, setParent1Email] = useState(initialData?.parent1_email || '');
  const [parent2Name, setParent2Name] = useState(initialData?.parent2_name || '');
  const [parent2Phone, setParent2Phone] = useState(initialData?.parent2_phone || '');
  const [customGroupRate, setCustomGroupRate] = useState<string>(
    initialData?.custom_group_rate != null ? initialData.custom_group_rate.toString() : ''
  );
  const [customPrivateRate, setCustomPrivateRate] = useState<string>(
    initialData?.custom_private_rate != null ? initialData.custom_private_rate.toString() : ''
  );
  const [isDownloading, setIsDownloading] = useState(false);

  const isTeamOnly = initialData?.is_gym_member || initialExtra?.is_cheer;

  const initialSiblingId = useMemo(() => {
    if (!initialData?.groupKey) return '';
    const sibling = (otherStudents || []).find((s: Student) => s.groupKey === initialData.groupKey);
    return sibling ? sibling.id : '';
  }, [initialData, otherStudents]);

  const [linkedSiblingId, setLinkedSiblingId] = useState<string>(initialSiblingId);

  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDob = e.target.value;
    let ageStr = age;

    const parts = newDob.split(/[\/\-]/);
    if (parts.length === 3) {
      let d = parseInt(parts[0], 10);
      let m = parseInt(parts[1], 10);
      let y = parseInt(parts[2], 10);

      if (parts[0].length === 4) {
        y = parseInt(parts[0], 10);
        m = parseInt(parts[1], 10);
        d = parseInt(parts[2], 10);
      }

      if (y > 1900 && y < 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        const birth = new Date(y, m - 1, d);
        const today = new Date();
        let calcAge = today.getFullYear() - birth.getFullYear();
        if (today.getMonth() - birth.getMonth() < 0 || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) calcAge--;
        if (calcAge >= 0) ageStr = String(calcAge);
      }
    }

    setDob(newDob);
    setAge(ageStr);
  };

  const handleDownload = async () => {
    if (!initialData) return;
    setIsDownloading(true);
    try {
      await generateIndemnityPDFFromStudent(initialData);
    } catch (e) {
      console.error(e);
      alert("Failed to generate PDF");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleConfirm = () => {
    // Auto-generate display name if first/last name changed and name was empty or matched old pattern
    const newName = (firstName && lastName) ? `${firstName} ${lastName}`.trim() : name;
    
    // Format DOB to YYYY-MM-DD for Postgres
    let dobForDb = dob;
    if (dob) {
      const parts = dob.split(/[\/\-]/);
      if (parts.length === 3) {
        let y = parts[2], m = parts[1], d = parts[0];
        if (parts[0].length === 4) { y = parts[0]; m = parts[1]; d = parts[2]; }
        if (y.length === 4) { dobForDb = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`; }
      }
    }

    onSubmit(newName, undefined, linkedSiblingId, { 
      first_name: firstName, 
      last_name: lastName, 
      dob: dobForDb, 
      age: age ? parseInt(age) : null, 
      medical_notes: medicalNotes, 
      parent1_name: parent1Name, 
      parent1_phone: parent1Phone, 
      parent1_email: parent1Email, 
      parent2_name: parent2Name, 
      parent2_phone: parent2Phone,
      custom_group_rate: customGroupRate ? parseFloat(customGroupRate) : null,
      custom_private_rate: customPrivateRate ? parseFloat(customPrivateRate) : null,
      ...initialExtra
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex bg-slate-50 dark:bg-slate-900/40 p-1 rounded-xl">
        <button className={`flex-1 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all bg-[#1e4da1] text-white`}>Student Info</button>
      </div>

      <div className="space-y-4 max-h-[60vh] overflow-y-auto no-scrollbar pr-1 pb-4">
        <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><label className="text-[8px] font-black text-[#94a3b8] uppercase ml-1">First Name</label><input placeholder="FIRST NAME" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl font-black uppercase text-[10px] outline-none dark:text-slate-200" /></div>
              <div className="space-y-1"><label className="text-[8px] font-black text-[#94a3b8] uppercase ml-1">Last Name</label><input placeholder="LAST NAME" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl font-black uppercase text-[10px] outline-none dark:text-slate-200" /></div>
            </div>
            {!isTeamOnly && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><label className="text-[8px] font-black text-[#94a3b8] uppercase ml-1">DOB</label><input type="text" placeholder="DD/MM/YYYY" value={dob} onChange={handleDobChange} className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl font-black uppercase text-[10px] outline-none dark:text-slate-200" /></div>
                <div className="space-y-1"><label className="text-[8px] font-black text-[#94a3b8] uppercase ml-1">Age</label><input placeholder="AGE" value={age} onChange={e => setAge(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl font-black uppercase text-[10px] outline-none dark:text-slate-200" /></div>
              </div>
            )}

            {!isTeamOnly && (
              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1"><label className="text-[8px] font-black text-[#94a3b8] uppercase ml-1">Link Sibling</label><select value={linkedSiblingId} onChange={e => setLinkedSiblingId(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl font-black uppercase text-[10px] outline-none dark:text-slate-200 appearance-none"><option value="">- NONE -</option>{(otherStudents || []).map((s: any, idx: number) => <option key={`${s.id}-${idx}`} value={s.id}>{s.name}</option>)}</select></div>
              </div>
            )}

            {/* Custom Athlete Pricing (Gauges) */}
            {!isTeamOnly && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 space-y-4">
                <div>
                  <p className="text-[9px] font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">Custom Athlete Session Rates (Rand)</p>
                  <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-0.5">Set individual custom rates for class tumbling vs private sessions</p>
                </div>

                {/* Group Class Rate */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase">Class / Group Tumbling Rate</label>
                    <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400">
                      {customGroupRate ? `R${customGroupRate} / session` : 'Standard Rate'}
                    </span>
                  </div>

                  {/* Price Gauges */}
                  <div className="flex flex-wrap gap-1.5">
                    {[100, 150, 200, 250, 300, 350, 400].map(amount => (
                      <button
                        key={`group-gauge-${amount}`}
                        type="button"
                        onClick={() => setCustomGroupRate(customGroupRate === amount.toString() ? '' : amount.toString())}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                          customGroupRate === amount.toString()
                            ? 'bg-[#1e4da1] text-white shadow-md scale-105'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-blue-400'
                        }`}
                      >
                        R{amount}
                      </button>
                    ))}
                    {customGroupRate && (
                      <button
                        type="button"
                        onClick={() => setCustomGroupRate('')}
                        className="px-2 py-1.5 rounded-lg text-[9px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-red-500"
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  {/* Manual Amount Input */}
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-black text-slate-400">R</span>
                    <input
                      type="number"
                      placeholder="CUSTOM GROUP AMOUNT"
                      value={customGroupRate}
                      onChange={e => setCustomGroupRate(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-800/80 rounded-xl font-black uppercase text-[10px] outline-none dark:text-slate-200 border border-slate-200 dark:border-slate-700 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Private Session Rate */}
                <div className="space-y-2 pt-2 border-t border-emerald-100/60 dark:border-emerald-900/30">
                  <div className="flex items-center justify-between">
                    <label className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase">Private Session Rate</label>
                    <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400">
                      {customPrivateRate ? `R${customPrivateRate} / session` : 'Standard Private Rate'}
                    </span>
                  </div>

                  {/* Price Gauges */}
                  <div className="flex flex-wrap gap-1.5">
                    {[100, 150, 200, 250, 300, 350, 400].map(amount => (
                      <button
                        key={`private-gauge-${amount}`}
                        type="button"
                        onClick={() => setCustomPrivateRate(customPrivateRate === amount.toString() ? '' : amount.toString())}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                          customPrivateRate === amount.toString()
                            ? 'bg-[#1e4da1] text-white shadow-md scale-105'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-blue-400'
                        }`}
                      >
                        R{amount}
                      </button>
                    ))}
                    {customPrivateRate && (
                      <button
                        type="button"
                        onClick={() => setCustomPrivateRate('')}
                        className="px-2 py-1.5 rounded-lg text-[9px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-red-500"
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  {/* Manual Amount Input */}
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-black text-slate-400">R</span>
                    <input
                      type="number"
                      placeholder="CUSTOM PRIVATE AMOUNT"
                      value={customPrivateRate}
                      onChange={e => setCustomPrivateRate(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-800/80 rounded-xl font-black uppercase text-[10px] outline-none dark:text-slate-200 border border-slate-200 dark:border-slate-700 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {!isTeamOnly && (
              <>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30 space-y-3">
                  <p className="text-[8px] font-black text-[#1e4da1] dark:text-blue-400 uppercase tracking-widest">Parent / Guardian 1</p>
                  <div className="space-y-1"><label className="text-[8px] font-black text-[#94a3b8] uppercase ml-1">Full Name</label><input placeholder="NAME" value={parent1Name} onChange={e => setParent1Name(e.target.value)} className="w-full p-3 bg-white dark:bg-slate-800/50 rounded-xl font-black uppercase text-[10px] outline-none dark:text-slate-200" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><label className="text-[8px] font-black text-[#94a3b8] uppercase ml-1">Phone</label><input placeholder="PHONE" value={parent1Phone} onChange={e => setParent1Phone(e.target.value)} className="w-full p-3 bg-white dark:bg-slate-800/50 rounded-xl font-black uppercase text-[10px] outline-none dark:text-slate-200" /></div>
                    <div className="space-y-1"><label className="text-[8px] font-black text-[#94a3b8] uppercase ml-1">Email</label><input placeholder="EMAIL" value={parent1Email} onChange={e => setParent1Email(e.target.value)} className="w-full p-3 bg-white dark:bg-slate-800/50 rounded-xl font-black uppercase text-[10px] outline-none dark:text-slate-200" /></div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-3">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Parent / Guardian 2 (Optional)</p>
                  <div className="space-y-1"><label className="text-[8px] font-black text-[#94a3b8] uppercase ml-1">Full Name</label><input placeholder="NAME" value={parent2Name} onChange={e => setParent2Name(e.target.value)} className="w-full p-3 bg-white dark:bg-slate-800/50 rounded-xl font-black uppercase text-[10px] outline-none dark:text-slate-200" /></div>
                  <div className="space-y-1"><label className="text-[8px] font-black text-[#94a3b8] uppercase ml-1">Phone</label><input placeholder="PHONE" value={parent2Phone} onChange={e => setParent2Phone(e.target.value)} className="w-full p-3 bg-white dark:bg-slate-800/50 rounded-xl font-black uppercase text-[10px] outline-none dark:text-slate-200" /></div>
                </div>
              </>
            )}

            <div className="space-y-1">
              <label className="text-[8px] font-black text-[#94a3b8] uppercase ml-1">Medical Notes</label>
              <textarea 
                placeholder="MEDICAL NOTES / ALLERGIES" 
                value={medicalNotes} 
                onChange={e => setMedicalNotes(e.target.value)} 
                className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl font-black uppercase text-[10px] outline-none dark:text-slate-200 min-h-[80px] resize-none"
              />
            </div>

            {initialData?.signature_data && (
              <div className="pt-2">
                <button 
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="w-full py-4 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg"
                >
                  {isDownloading ? <Loader2 className="animate-spin" size={14} /> : <Download size={14} />}
                  Download Indemnity Form (PDF)
                </button>
                <p className="text-center text-[8px] font-bold text-slate-400 uppercase mt-2 italic">Digitally signed on {initialData.indemnity_date ? new Date(initialData.indemnity_date).toLocaleDateString() : 'N/A'}</p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <div className="flex gap-2">
                <motion.button whileTap={{ scale: 0.95 }} onClick={handleConfirm} className="flex-[4] bg-[#1e4da1] dark:bg-blue-600 text-white py-4 rounded-xl font-black text-[10px] uppercase shadow-lg">Save Registration</motion.button>
                <motion.button whileTap={{ scale: 0.9 }} onClick={onCancel} className="flex-1 bg-slate-100 dark:bg-slate-800 text-[#94a3b8] rounded-xl flex items-center justify-center"><X size={16} /></motion.button>
              </div>
              
              {initialData && (
                <button
                  onClick={() => onDelete(initialData.id)}
                  className="w-full py-3 text-[9px] font-black uppercase trackingest text-red-500 flex items-center justify-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors"
                >
                  <Trash2 size={12} /> Delete Athlete
                </button>
              )}
            </div>
    </div>
  );
};

const GymProfileModal: React.FC<any> = ({ state, initialData, onSubmit, onDelete, onCancel }) => {
  const isSubTeam = !!(initialData?.parent_gym_id);
  const [name, setName] = useState(initialData?.name || '');
  const [sessionTypes, setSessionTypes] = useState(initialData?.session_types || '');
  const [payAmount, setPayAmount] = useState(initialData?.pay_amount?.toString() || '');
  const [gymType, setGymType] = useState<'tumbling' | 'cheer'>(initialData?.gym_type || 'tumbling');
  const [defaultHours, setDefaultHours] = useState(initialData?.default_hours?.toString() || '1');
  const [billToName, setBillToName] = useState(initialData?.bill_to_name || '');
  const [billToAddress, setBillToAddress] = useState(initialData?.bill_to_address || '');
  const [billToPhone, setBillToPhone] = useState(initialData?.bill_to_phone || '');
  const [parentGymId, setParentGymId] = useState(initialData?.parent_gym_id || '');
  const [competitionRate, setCompetitionRate] = useState(initialData?.competition_rate?.toString() || '');
  const [selectedCoachIds, setSelectedCoachIds] = useState<string[]>(initialData?.coach_ids || []);
  const [defaultCoachId, setDefaultCoachId] = useState<string>(initialData?.default_coach_id || '');
  const [autoResetInvoice, setAutoResetInvoice] = useState<boolean>(initialData?.auto_reset_invoice !== false);
  const [billingDay, setBillingDay] = useState<number | string>(initialData?.billing_day || 1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [coachNames, setCoachNames] = useState<string[]>(initialData?.coach_names || []);
  const [newCoachNameInput, setNewCoachNameInput] = useState('');

  const handleAddCoachName = () => {
    const trimmed = newCoachNameInput.trim();
    if (!trimmed) return;
    if (coachNames.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      alert("This coach name is already added.");
      return;
    }
    setCoachNames([...coachNames, trimmed]);
    setNewCoachNameInput('');
  };

  const handleRemoveCoachName = (nameToRemove: string) => {
    setCoachNames(coachNames.filter(c => c !== nameToRemove));
  };

  const [customEventPresets, setCustomEventPresets] = useState<string[]>(() => {
    const raw = initialData?.custom_event_presets || ['Class', 'Clinic', 'Camp', 'Workshop', 'Tryout'];
    const seen = new Set<string>();
    return raw.filter(p => {
      const lower = p.toLowerCase();
      if (seen.has(lower)) return false;
      seen.add(lower);
      return true;
    });
  });
  const [newPresetInput, setNewPresetInput] = useState('');
  const [newPresetRate, setNewPresetRate] = useState('');

  const handleAddPreset = () => {
    const trimmedName = newPresetInput.trim();
    if (!trimmedName) return;

    // Check if name already exists
    const existingNames = customEventPresets.map(p => (p.includes(':') ? p.split(':')[0] : p).toLowerCase());
    if (existingNames.includes(trimmedName.toLowerCase())) {
      alert("This event type already exists!");
      return;
    }

    const trimmedRate = newPresetRate.trim();
    const finalPreset = trimmedRate ? `${trimmedName}:${trimmedRate}` : trimmedName;

    setCustomEventPresets([...customEventPresets, finalPreset]);
    setNewPresetInput('');
    setNewPresetRate('');
  };

  const handleRemovePreset = (presetToRemove: string) => {
    setCustomEventPresets(customEventPresets.filter(p => p !== presetToRemove));
  };

  const [teamRosterText, setTeamRosterText] = useState(
    state.students.filter((s: Student) => s.associated_gym_id === initialData?.id && s.is_gym_member).map((s: Student) => s.name).join('\n')
  );

  const handleBulkImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

      reader.onload = (event) => {
        const data = event.target?.result;
        if (isExcel) {
          try {
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

            const names = json
              .filter(row => row.length >= 1)
              .map(row => {
                const firstName = String(row[0] || '').trim();
                const lastName = String(row[1] || '').trim();
                return `${firstName} ${lastName}`.trim();
              })
              .filter(name => name.length > 0 &&
                !['name', 'firstname', 'first name', 'surname', 'last name'].includes(name.toLowerCase()));

            setTeamRosterText(prev => (prev ? prev + '\n' + names.join('\n') : names.join('\n')));
          } catch (err) {
            alert("Excel parsing failed. Please check the file format.");
          }
        } else {
          const text = data as string;
          const names = text.split(/\r?\n/).map(line => line.split(',')[0].trim()).filter(n => n.length > 0);
          setTeamRosterText(prev => (prev ? prev + '\n' + names.join('\n') : names.join('\n')));
        }
      };

      if (isExcel) {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsText(file);
      }
    }
  };

  const handleConfirm = () => {
    if (!name.trim()) return alert(`Please enter a name.`);

    const parsedPay = parseFloat(payAmount);
    const parsedHours = parseFloat(defaultHours);
    const parsedComp = parseFloat(competitionRate);

    onSubmit(
      name, 
      isSubTeam ? sessionTypes : '', 
      isSubTeam ? (isNaN(parsedPay) ? 0 : parsedPay) : 0, 
      gymType, 
      isSubTeam ? (isNaN(parsedHours) ? 1 : parsedHours) : 1, 
      isSubTeam ? teamRosterText.split(/\r?\n/).map(n => n.trim()).filter(n => n.length > 0) : [], 
      '', // No billing info in main gym profile
      '', 
      '', 
      parentGymId, 
      isSubTeam && gymType === 'cheer' ? (isNaN(parsedComp) ? 0 : parsedComp) : 0,
      isSubTeam ? selectedCoachIds : [], // No assigned coaches for main gym
      isSubTeam ? defaultCoachId : '',
      undefined,
      true, // Auto-reset invoice always defaults to true
      !isSubTeam ? (Number(billingDay) || 1) : 1, // Billing cycle is only in main gym profile
      customEventPresets,
      coachNames
    );
  };

  const toggleCoach = (id: string) => {
    setSelectedCoachIds(prev => prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-4">
      {!initialData?.id && !parentGymId && (
        <div className="flex bg-slate-50 dark:bg-slate-900/40 p-1 rounded-xl">
          <button onClick={() => setGymType('tumbling')} className={`flex-1 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all ${gymType === 'tumbling' ? 'bg-[#1e4da1] text-white' : 'text-slate-400'}`}>Tumbling Gym</button>
          <button onClick={() => setGymType('cheer')} className={`flex-1 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all ${gymType === 'cheer' ? 'bg-[#1e4da1] text-white' : 'text-slate-400'}`}>Cheer Team</button>
        </div>
      )}

      <div className="space-y-1">
        <label className="text-[8px] font-black text-[#94a3b8] uppercase ml-1">
          {isSubTeam ? (gymType === 'cheer' ? 'Sub-Team Name' : 'Class Name') : (gymType === 'cheer' ? 'Organization / School Name' : 'Gym Name')}
        </label>
        <input
          placeholder={isSubTeam ? (gymType === 'cheer' ? "E.G. TEAM 1 / COED" : "E.G. BEGINNER TUMBLING") : "E.G. TITANS ELITE"}
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl font-black uppercase text-[10px] outline-none dark:text-slate-200"
        />
      </div>

      {isSubTeam && (
        <>
          <div className="grid grid-cols-2 gap-3">
            {gymType === 'cheer' && (
              <div className="space-y-1">
                <label className="text-[8px] font-black text-[#94a3b8] uppercase ml-1">Session Description</label>
                <div className="relative">
                  <Dumbbell className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                  <input
                    placeholder="E.G. TUMBLING"
                    value={sessionTypes}
                    onChange={e => setSessionTypes(e.target.value)}
                    className="w-full p-4 pl-10 bg-slate-50 dark:bg-slate-800/50 rounded-xl font-black uppercase text-[10px] outline-none dark:text-slate-200"
                  />
                </div>
              </div>
            )}
            <div className={`space-y-1 ${gymType === 'tumbling' ? 'col-span-2' : ''}`}>
              <label className="text-[8px] font-black text-[#94a3b8] uppercase ml-1">Rate per Hour (R)</label>
              <div className="relative">
                <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                <input
                  type="number"
                  placeholder="300"
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  className="w-full p-4 pl-10 bg-slate-50 dark:bg-slate-800/50 rounded-xl font-black uppercase text-[10px] outline-none dark:text-slate-200"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className={`space-y-1 ${gymType === 'tumbling' ? 'col-span-2' : ''}`}>
              <label className="text-[8px] font-black text-[#94a3b8] uppercase ml-1">Session Length (Hours)</label>
              <div className="relative">
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  placeholder="2"
                  value={defaultHours}
                  onChange={e => setDefaultHours(e.target.value)}
                  className="w-full p-4 pl-10 bg-slate-50 dark:bg-slate-800/50 rounded-xl font-black uppercase text-[10px] outline-none dark:text-slate-200"
                />
              </div>
            </div>
            {gymType === 'cheer' && (
              <div className="space-y-1">
                <label className="text-[8px] font-black text-[#94a3b8] uppercase ml-1">Competition Rate (R/Hour)</label>
                <div className="relative">
                  <Trophy className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                  <input
                    type="number"
                    placeholder="500"
                    value={competitionRate}
                    onChange={e => setCompetitionRate(e.target.value)}
                    className="w-full p-4 pl-10 bg-slate-50 dark:bg-slate-800/50 rounded-xl font-black uppercase text-[10px] outline-none dark:text-slate-200"
                  />
                </div>
              </div>
            )}
          </div>

          {gymType === 'cheer' && (
            <>
              <div className="space-y-1">
                <label className="text-[8px] font-black text-[#94a3b8] uppercase ml-1">Assigned Coaches</label>
                <div className="flex flex-wrap gap-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl min-h-[50px]">
                  {state.staff.map((coach: any, idx: number) => (
                    <button
                      key={coach.id || `coach-gym-assign-${idx}`}
                      onClick={() => toggleCoach(coach.id)}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all flex items-center gap-1.5 ${selectedCoachIds.includes(coach.id) ? 'bg-[#1e4da1] text-white' : 'bg-white dark:bg-slate-700 text-slate-400 border border-slate-100 dark:border-slate-600'}`}
                    >
                      {selectedCoachIds.includes(coach.id) ? <CheckCircle2 size={10} /> : <Plus size={10} />}
                      {coach.name}
                    </button>
                  ))}
                  {state.staff.length === 0 && <p className="text-[8px] text-slate-400 font-bold uppercase p-2">No staff members found</p>}
                </div>
              </div>

              {selectedCoachIds.length > 0 && (
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-[#94a3b8] uppercase ml-1">Default Coach (Auto-Assign)</label>
                  <select 
                    value={defaultCoachId} 
                    onChange={e => setDefaultCoachId(e.target.value)}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl font-black uppercase text-[10px] outline-none dark:text-slate-200 appearance-none"
                  >
                    <option value="">- NONE -</option>
                    {state.staff.filter((s: any) => selectedCoachIds.includes(s.id)).map((s: any, idx: number) => (
                      <option key={s.id || `coach-opt-${idx}`} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[8px] font-black text-[#94a3b8] uppercase">Team Roster (Names)</label>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1 text-[8px] font-black text-[#1e4da1] uppercase bg-blue-50 px-2 py-1 rounded-md"
                  >
                    <FileSpreadsheet size={10} /> Import CSV/Excel
                  </button>
                  <input ref={fileInputRef} type="file" accept=".csv,.txt,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" onChange={handleBulkImport} className="hidden" />
                </div>
                <textarea
                  placeholder="Enter names here (one per line)..."
                  value={teamRosterText}
                  onChange={e => setTeamRosterText(e.target.value)}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl font-bold uppercase text-[10px] outline-none dark:text-slate-200 min-h-[120px] resize-none"
                />
              </div>
            </>
          )}
        </>
      )}

      <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl space-y-3">
        <div className="flex items-center gap-2">
          <UserCheck size={14} className="text-[#1e4da1] dark:text-blue-400" />
          <span className="text-[8px] font-black uppercase text-slate-500 dark:text-slate-400">Coaches / Covering Coaches (Names)</span>
        </div>
        <p className="text-[8px] text-slate-400 leading-relaxed">
          Enter coach names (e.g. Bianca, Sarah) that can be selected when logging sessions for this gym or sub-team class.
        </p>

        <div className="flex flex-wrap gap-1.5 pt-1">
          {coachNames.map((cName, cIdx) => (
            <div 
              key={`coach-name-chip-${cName}-${cIdx}`}
              className="flex items-center gap-1.5 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-100 dark:border-slate-600 shadow-sm"
            >
              <span className="text-[9px] font-black uppercase tracking-wider">{cName}</span>
              <button 
                type="button"
                onClick={() => handleRemoveCoachName(cName)}
                className="text-red-500 hover:text-red-700 p-0.5"
              >
                <X size={10} />
              </button>
            </div>
          ))}
          {coachNames.length === 0 && (
            <p className="text-[8px] text-slate-400 font-bold uppercase py-1">No custom coach names added yet.</p>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <input
            type="text"
            placeholder="E.G. BIANCA, SARAH"
            value={newCoachNameInput}
            onChange={e => setNewCoachNameInput(e.target.value)}
            className="flex-1 min-w-0 w-full px-3 py-2 bg-white dark:bg-slate-700 rounded-lg text-[9px] font-black uppercase outline-none border border-slate-100 dark:border-slate-600 dark:text-white"
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddCoachName();
              }
            }}
          />
          <button
            type="button"
            onClick={handleAddCoachName}
            className="bg-[#1e4da1] dark:bg-blue-600 text-white px-3 py-2 rounded-lg font-black text-[9px] uppercase hover:opacity-90 tracking-widest transition-all shrink-0"
          >
            Add Coach
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 mt-4">
        {!isSubTeam && (
          <>
            <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl space-y-3">
              <div className="flex items-center gap-2">
                <ClipboardCheck size={14} className="text-[#1e4da1] dark:text-blue-400" />
                <span className="text-[8px] font-black uppercase text-slate-500 dark:text-slate-400">Custom Event Types (Presets)</span>
              </div>
              
              <p className="text-[8px] text-slate-400 leading-relaxed">
                Add and manage custom buttons that show up when logging a session for this gym. Add any preset (e.g. Clinic, Camp, Workshop) and delete options you do not need.
              </p>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {customEventPresets.map((preset, idx) => {
                  const [pName, pRate] = preset.includes(':') ? preset.split(':') : [preset, ''];
                  return (
                    <div 
                      key={`${preset}-${idx}`}
                      className="flex items-center gap-1.5 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-100 dark:border-slate-600 shadow-sm"
                    >
                      <span className="text-[9px] font-black uppercase tracking-wider">
                        {pName} {pRate ? `(R${pRate}/hr)` : ''}
                      </span>
                      <button 
                        type="button"
                        onClick={() => handleRemovePreset(preset)}
                        className="text-red-500 hover:text-red-700 p-0.5"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  );
                })}
                {customEventPresets.length === 0 && (
                  <p className="text-[8px] text-amber-500 font-bold uppercase py-1">No custom presets. Will fallback to default ones.</p>
                )}
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="E.G. CLINIC, CAMP, TRYOUT"
                    value={newPresetInput}
                    onChange={e => setNewPresetInput(e.target.value)}
                    className="flex-[2] min-w-0 w-full px-3 py-2 bg-white dark:bg-slate-700 rounded-lg text-[9px] font-black uppercase outline-none border border-slate-100 dark:border-slate-600 dark:text-white"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddPreset();
                      }
                    }}
                  />
                  <input
                    type="number"
                    placeholder="RATE (R/HR) OPTIONAL"
                    value={newPresetRate}
                    onChange={e => setNewPresetRate(e.target.value)}
                    className="flex-1 min-w-0 w-full px-3 py-2 bg-white dark:bg-slate-700 rounded-lg text-[9px] font-black uppercase outline-none border border-slate-100 dark:border-slate-600 dark:text-white"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddPreset();
                      }
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddPreset}
                  className="w-full bg-[#1e4da1] dark:bg-blue-600 text-white py-2.5 rounded-lg font-black text-[9px] uppercase hover:opacity-90 tracking-widest transition-all"
                >
                  Add Preset
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[8px] font-black text-[#94a3b8] uppercase ml-1">Billing Cycle Start Day</label>
              <input
                type="number"
                min="1"
                max="31"
                value={billingDay}
                onChange={e => {
                  const val = e.target.value;
                  setBillingDay(val === '' ? '' : (parseInt(val) || 1));
                }}
                placeholder="e.g. 20"
                className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl font-black uppercase text-[10px] outline-none dark:text-slate-200"
              />
              <p className="text-[8px] text-slate-400 mt-1 ml-1 leading-relaxed">By default, billing runs from month-to-month. If set to 20, sessions on or after the 20th are billed to the next month.</p>
            </div>
          </>
        )}
        <div className="flex gap-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleConfirm}
            className="flex-[4] bg-[#1e4da1] dark:bg-blue-600 text-white py-4 rounded-xl font-black text-[10px] uppercase shadow-lg"
          >
            Confirm {gymType === 'cheer' ? 'Team' : 'Gym'}
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onCancel} className="flex-1 bg-slate-100 dark:bg-slate-800 text-[#94a3b8] rounded-xl flex items-center justify-center"><X size={16} /></motion.button>
        </div>

        {initialData && (
          <button
            onClick={() => onDelete(initialData.id)}
            className="w-full py-3 text-[9px] font-black uppercase tracking-widest text-red-500 flex items-center justify-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors"
          >
            <Trash2 size={12} /> Delete {gymType === 'cheer' ? 'Team' : 'Gym'}
          </button>
        )}
      </div>
    </div>
  );
};

const ScheduleForm: React.FC<{
  students?: Student[],
  classTypes: ClassType[],
  gyms: Gym[],
  staff: any[],
  isOwner: boolean,
  initialData?: ClassSchedule,
  onSubmit: (classIds: string[], dayOfWeek: number, time: string, label?: string, color?: string) => void,
  onCancel: () => void,
  onDelete?: (id: string) => void
}> = ({ students, classTypes, gyms, staff, isOwner, initialData, onSubmit, onCancel, onDelete }) => {
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>(initialData?.class_ids || []);
  const [dayOfWeek, setDayOfWeek] = useState(initialData?.day_of_week ?? 1);
  const [time, setTime] = useState(initialData?.time || '16:00');
  const [label, setLabel] = useState(initialData?.label || '');
  const [coachId, setCoachId] = useState(initialData?.coach_id || '');
  const [color, setColor] = useState(initialData?.color || 'bg-[#1e4da1]');
  const [athleteIds, setAthleteIds] = useState<string[]>(initialData?.athlete_ids || []);

  const COLOR_OPTIONS = [
    { value: 'bg-[#1e4da1]', name: 'Blue' },
    { value: 'bg-[#0073E6]', name: 'JFLIPS Blue' },
    { value: 'bg-[#4CA5FF]', name: 'JFLIPS Light Blue' },
    { value: 'bg-[#062963]', name: 'JFLIPS Navy' },
    { value: 'bg-[#FF8A00]', name: 'JFLIPS Orange' },
    { value: 'bg-[#E42624]', name: 'JFLIPS Red' },
    { value: 'bg-indigo-500', name: 'Indigo' },
    { value: 'bg-emerald-500', name: 'Green' },
    { value: 'bg-teal-500', name: 'Teal' },
    { value: 'bg-rose-500', name: 'Ambient Red' },
    { value: 'bg-amber-500', name: 'Ambient Orange' },
    { value: 'bg-yellow-400', name: 'Yellow' },
    { value: 'bg-purple-500', name: 'Purple' },
    { value: 'bg-pink-500', name: 'Pink' },
    { value: 'bg-slate-700', name: 'Dark' },
  ];

  const classOptions = useMemo(() => [
    ...(classTypes || []).map(ct => ({ id: ct.id, name: ct.name, isGym: false, type: 'class', combinedId: `class-${ct.id}` })),
    ...(gyms || []).map(g => ({ id: g.id, name: g.name, isGym: true, type: g.gym_type, combinedId: `gym-${g.id}` }))
  ], [classTypes, gyms]);

  const DAY_OPTIONS = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' }
  ];

  const assignedCoachIds = useMemo(() => {
    const ids = new Set<string>();
    selectedClassIds.forEach(cid => {
      const gym = gyms.find(g => g.id === cid);
      if (gym) {
        (gym.coach_ids || []).forEach(id => ids.add(id));
        if (gym.parent_gym_id) {
          const parent = gyms.find(p => p.id === gym.parent_gym_id);
          (parent?.coach_ids || []).forEach(id => ids.add(id));
        }
      }
    });
    return Array.from(ids);
  }, [selectedClassIds, gyms]);

  const toggleClass = (id: string) => {
    setSelectedClassIds(prev => prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-4 pb-6">
      <div className="space-y-1">
        <label className="text-[8px] font-black text-[#94a3b8] uppercase ml-1">Class / Gym / Team (Select Multiple)</label>
        <div className="space-y-1.5 mt-1 max-h-40 overflow-y-auto pr-1">
          {classOptions.map((opt, idx) => (
            <motion.button
              whileTap={{ scale: 0.98 }}
              key={opt.combinedId || `sched-opt-${idx}`}
              onClick={() => toggleClass(opt.id)}
              className={`w-full p-3 rounded-xl border flex items-center gap-2 text-left transition-all ${selectedClassIds.includes(opt.id) ? 'bg-blue-50 dark:bg-blue-900/20 border-[#1e4da1] text-[#1e4da1]' : 'bg-slate-50 dark:bg-slate-800/50 border-transparent text-slate-500'}`}
            >
              <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedClassIds.includes(opt.id) ? 'bg-[#1e4da1] border-[#1e4da1]' : 'border-slate-300'}`}>
                {selectedClassIds.includes(opt.id) && <CheckCircle2 size={10} className="text-white" />}
              </div>
              {opt.isGym ? (opt.type === 'cheer' ? <Trophy size={10} className="opacity-50" /> : <Building2 size={10} className="opacity-50" />) : <User size={10} className="opacity-50" />}
              <span className="text-[10px] font-black uppercase italic">{opt.name}</span>
            </motion.button>
          ))}
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-[8px] font-black text-[#94a3b8] uppercase ml-1">Assigned Athletes (For Privates)</label>
        <div className="space-y-1.5 mt-1 max-h-40 overflow-y-auto pr-1">
          {(students || []).filter(s => !s.is_gym_member).map((s, idx) => (
             <motion.button
               whileTap={{ scale: 0.98 }}
               key={`sched-ath-${s.id}-${idx}`}
               onClick={() => setAthleteIds(prev => prev.includes(s.id) ? prev.filter(aid => aid !== s.id) : [...prev, s.id])}
               className={`w-full p-3 rounded-xl border flex items-center gap-2 text-left transition-all ${athleteIds.includes(s.id) ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 text-indigo-500' : 'bg-slate-50 dark:bg-slate-800/50 border-transparent text-slate-500'}`}
             >
               <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${athleteIds.includes(s.id) ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300'}`}>
                 {athleteIds.includes(s.id) && <CheckCircle2 size={10} className="text-white" />}
               </div>
               <User size={10} className="opacity-50" />
               <span className="text-[10px] font-black uppercase italic">{s.name}</span>
             </motion.button>
          ))}
          {(!students || students.filter(s => !s.is_gym_member).length === 0) && <p className="text-[9px] text-slate-400 font-bold uppercase py-2 px-1">No students</p>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[8px] font-black text-[#94a3b8] uppercase ml-1">Day</label>
          <select value={dayOfWeek} onChange={e => setDayOfWeek(Number(e.target.value))} className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl font-black uppercase text-[10px] outline-none dark:text-slate-200 appearance-none">
            {DAY_OPTIONS.map((d, idx) => (
              <option key={d.value || `day-${idx}`} value={d.value} className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100 font-bold">
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[8px] font-black text-[#94a3b8] uppercase ml-1">Time</label>
          <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl font-black uppercase text-[10px] outline-none dark:text-slate-200" />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-[8px] font-black text-[#94a3b8] uppercase ml-1">Label (Optional)</label>
        <input placeholder="e.g. Tumbling — Tuesdays" value={label} onChange={e => setLabel(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl font-black uppercase text-[10px] outline-none dark:text-slate-200" />
      </div>
      <div className="space-y-1">
        <label className="text-[8px] font-black text-[#94a3b8] uppercase ml-1">Color Display</label>
        <div className="flex gap-2">
          {COLOR_OPTIONS.map((c) => (
            <button
              key={c.value}
              onClick={() => setColor(c.value)}
              className={`w-8 h-8 rounded-full ${c.value} ${color === c.value ? 'ring-2 ring-offset-2 ring-slate-800 dark:ring-white dark:ring-offset-slate-900' : 'opacity-70'}`}
              title={c.name}
              type="button"
            />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2.5 mt-6">
        <div className="flex gap-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (selectedClassIds.length === 0) return alert('Select at least one class or gym');
              let finalColor = color;
              if (athleteIds.length > 0) {
                finalColor += '|' + athleteIds.join(',');
              }
              onSubmit(selectedClassIds, dayOfWeek, time, label || undefined, finalColor);
            }}
            className="flex-[4] bg-[#1e4da1] dark:bg-blue-600 text-white py-4 rounded-xl font-black text-[10px] uppercase shadow-lg"
          >
            Save Schedule
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onCancel} className="flex-1 bg-slate-100 dark:bg-slate-800 text-[#94a3b8] rounded-xl flex items-center justify-center font-black text-[10px] uppercase">
            Cancel
          </motion.button>
        </div>
        {initialData && onDelete && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => {
              if (confirm("Are you sure you want to delete this schedule item?")) {
                onDelete(initialData.id);
              }
            }}
            className="w-full py-3.5 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-900/50 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
          >
            <Trash2 size={14} /> Delete Schedule
          </motion.button>
        )}
      </div>
    </div>
  );
};

const ClassTypeForm: React.FC<any> = ({ students, gyms, staff, isOwner, initialData, onSubmit, onCancel }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [price, setPrice] = useState(initialData?.price?.toString() || '');
  const [selectedEntityIds, setSelectedEntityIds] = useState<string[]>(initialData?.studentIds || []);
  const [selectedCoachIds, setSelectedCoachIds] = useState<string[]>(initialData?.coach_ids || []);
  const [allowSignup, setAllowSignup] = useState<boolean>(initialData?.allow_signup ?? true);
  const [autoResetInvoice, setAutoResetInvoice] = useState<boolean>(initialData?.auto_reset_invoice !== false);

  const combined = useMemo(() => [
    ...(students || []).filter((s: any) => !s.is_gym_member).map((s: any, idx: number) => ({ ...s, isGym: false, combinedId: `student-${s.id || idx}` }))
  ], [students]);

  const toggleEntity = (id: string) => setSelectedEntityIds(prev => prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]);
  const toggleCoach = (id: string) => setSelectedCoachIds(prev => prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]);

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto no-scrollbar">
      <div className="space-y-1"><label className="text-[8px] font-black text-[#94a3b8] uppercase ml-1">Class Name</label><input placeholder="NAME" value={name} onChange={e => setName(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl font-black uppercase text-[10px] outline-none dark:text-slate-200" /></div>
      <div className="space-y-1"><label className="text-[8px] font-black text-[#94a3b8] uppercase ml-1">Price per session</label><input placeholder="PRICE" type="number" value={price} onChange={e => setPrice(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl font-black uppercase text-[10px] outline-none dark:text-slate-200" /></div>
      
      {isOwner && staff && staff.length > 0 && (
        <div className="space-y-1">
          <label className="text-[8px] font-black text-[#94a3b8] uppercase ml-1">Assigned Coaches (leave blank = owner default)</label>
          <div className="flex flex-wrap gap-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl min-h-[44px]">
            {(staff || []).map((coach: any, idx: number) => (
              <button key={`class-form-coach-${coach.id}-${idx}`} type="button" onClick={() => toggleCoach(coach.id)}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all flex items-center gap-1.5 ${selectedCoachIds.includes(coach.id) ? 'bg-[#1e4da1] text-white' : 'bg-white dark:bg-slate-700 text-slate-400 border border-slate-100 dark:border-slate-600'}`}>
                {selectedCoachIds.includes(coach.id) ? <CheckCircle2 size={10} /> : <Plus size={10} />}
                {coach.name}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="space-y-1">
        <label className="text-[8px] font-black text-[#94a3b8] uppercase ml-1">Tumbling Athletes</label>
        <div className="space-y-1.5 mt-1 max-h-40 overflow-y-auto pr-1">
          {(combined || []).map((entity: any, idx: number) => (
            <motion.button 
              whileTap={{ scale: 0.98 }} 
              key={`class-form-entity-${entity.combinedId}-${idx}`} 
              onClick={() => toggleEntity(entity.id)} 
              className={`w-full p-3 rounded-xl border flex items-center gap-2 text-left transition-all ${selectedEntityIds.includes(entity.id) ? 'bg-blue-50 dark:bg-blue-900/20 border-[#1e4da1] text-[#1e4da1]' : 'bg-slate-50 dark:bg-slate-800/50 border-transparent text-slate-500'}`}
            >
              <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedEntityIds.includes(entity.id) ? 'bg-[#1e4da1] border-[#1e4da1]' : 'border-slate-300'}`}>
                {selectedEntityIds.includes(entity.id) && <CheckCircle2 size={10} className="text-white" />}
              </div>
              {entity.isGym ? (entity.gym_type === 'cheer' ? <Trophy size={10} className="opacity-50" /> : <Building2 size={10} className="opacity-50" />) : <User size={10} className="opacity-50" />}
              <span className="text-[10px] font-black uppercase italic">{entity.name}</span>
            </motion.button>
          ))}
          {(!combined || combined.length === 0) && <p className="text-[9px] text-slate-400 font-bold uppercase py-2">No data</p>}
        </div>
      </div>
      <div className="flex gap-2 pt-2"><motion.button whileTap={{ scale: 0.95 }} onClick={() => onSubmit(name, parseFloat(price || '0'), selectedEntityIds, selectedCoachIds, allowSignup, true)} className="flex-[4] bg-[#1e4da1] dark:bg-blue-600 text-white py-4 rounded-xl font-black text-[10px] uppercase shadow-lg">Save</motion.button><motion.button whileTap={{ scale: 0.9 }} onClick={onCancel} className="flex-1 bg-slate-100 dark:bg-slate-800 text-[#94a3b8] rounded-xl flex items-center justify-center transition-transform"><X size={16} /></motion.button></div>
    </div>
  );
};

const AppSettingsModal: React.FC<any> = ({ state, toggleTheme, onLogout, onLinkGoogle, onClose, onShowRecovery }) => (
  <Modal title="Settings" onClose={onClose}>
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
        <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-[#1e4da1] dark:text-blue-400">{state.theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}</div><span className="font-black uppercase text-[10px] tracking-widest text-[#161d2a] dark:text-slate-300">Dark Mode</span></div>
        <button onClick={toggleTheme} className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${state.theme === 'dark' ? 'bg-[#1e4da1]' : 'bg-slate-300'}`}><div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${state.theme === 'dark' ? 'translate-x-6' : 'translate-x-0'}`}></div></button>
      </div>

      <button type="button" onClick={() => { onShowRecovery(); onClose(); }} className="w-full flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl transition-colors">
        <div className="flex items-center gap-3">
          <History size={18} className="text-[#1e4da1] dark:text-blue-400" />
          <span className="font-black uppercase text-[10px] text-[#1e4da1] dark:text-blue-400">Recover Invoice Data</span>
        </div>
        <ArrowRight size={14} className="text-[#1e4da1] dark:text-blue-400 opacity-50" />
      </button>

      <div className="h-px bg-slate-100 dark:bg-slate-800 my-2"></div>
      <button type="button" onClick={onLogout} className="w-full flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-800/80 rounded-xl transition-colors"><div className="flex items-center gap-3"><LogOut size={18} className="text-slate-600 dark:text-slate-400" /><span className="font-black uppercase text-[10px] text-slate-600 dark:text-slate-400">Log Out</span></div><ArrowRight size={14} className="text-slate-400 opacity-50" /></button>
    </div>
  </Modal>
);

const NotificationsModal: React.FC<{ 
  notifications: AppNotification[], 
  onClose: () => void, 
  onMarkRead: (id: string) => void, 
  onClear: () => void 
}> = ({ notifications, onClose, onMarkRead, onClear }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700"
      >
        <div className="p-6 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-[#1e4da1] dark:text-blue-400">
              <Bell size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black text-[#1a1a1a] dark:text-slate-100 uppercase italic">Notifications</h2>
              <p className="text-[8px] font-black text-[#94a3b8] uppercase tracking-widest">Recent Activity</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-white dark:bg-slate-700 text-slate-400 rounded-xl shadow-sm border border-slate-100 dark:border-slate-600"><X size={18} /></button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-3 no-scrollbar">
          {notifications.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900/50 rounded-full flex items-center justify-center text-slate-200 dark:text-slate-700 mb-4">
                <Bell size={32} />
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No new notifications</p>
            </div>
          ) : (
            notifications.map((n, idx) => (
              <motion.div 
                key={n.id || `notif-${idx}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`p-4 rounded-2xl border transition-all ${n.is_read ? 'bg-white dark:bg-slate-800 border-slate-50 dark:border-slate-700 opacity-60' : 'bg-blue-50/30 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800 shadow-sm'}`}
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1">
                    <p className={`text-[11px] font-bold leading-relaxed ${n.is_read ? 'text-slate-500 dark:text-slate-400' : 'text-slate-800 dark:text-slate-100'}`}>
                      {n.message}
                    </p>
                    <p className="text-[8px] font-black text-slate-400 uppercase mt-2 tracking-wider">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </div>
                  {!n.is_read && (
                    <button 
                      onClick={() => onMarkRead(n.id)}
                      className="p-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 transition-colors"
                    >
                      <Check size={12} strokeWidth={3} />
                    </button>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>

        {notifications.length > 0 && (
          <div className="p-4 bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-50 dark:border-slate-700">
            <button 
              onClick={onClear}
              className="w-full py-4 bg-white dark:bg-slate-800 text-red-500 dark:text-red-400 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-slate-100 dark:border-slate-700 shadow-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Clear All Notifications
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
const ArchiveModal: React.FC<any> = ({ state, archiveMonth, archiveYear, setArchiveMonth, setArchiveYear, onConfirm, onCancel }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [availableItems, setAvailableItems] = useState<{id: string, name: string, defaultSelected: boolean}[]>([]);

  useEffect(() => {
    const uniqueIds = Array.from(new Set((state.sessions || []).map((s: any) => s.classTypeId)));
    const items = uniqueIds.map(id => {
      const gym = state.gyms.find((g: any) => g.id === id);
      const ct = state.classTypes.find((c: any) => c.id === id);
      const name = gym ? gym.name : (ct ? ct.name : 'Unknown');
      const autoReset = gym ? gym.auto_reset_invoice !== false : (ct ? ct.auto_reset_invoice !== false : true);
      return { id: id as string, name: name as string, defaultSelected: autoReset as boolean };
    });
    setAvailableItems(items);
    setSelectedIds(items.filter(i => i.defaultSelected).map(i => i.id as string));
  }, [state.sessions, state.gyms, state.classTypes]);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <Modal title="Archive" onClose={onCancel}>
      <div className="space-y-4">
        <p className="text-slate-600 dark:text-slate-400 text-xs font-medium uppercase text-center">Export logs to history.</p>
        <p className="text-[9px] font-black text-slate-400 uppercase text-center leading-relaxed">
          This will archive the selected logs. 
          Gyms already reset will not be affected.
        </p>
        
        <div className="max-h-48 overflow-y-auto space-y-2 border border-slate-100 dark:border-slate-700 rounded-xl p-2">
          {availableItems.length === 0 ? (
            <p className="text-center text-xs text-slate-500 py-4">No active sessions to archive.</p>
          ) : (
            availableItems.map((item, idx) => (
              <label key={`${item.id}-${idx}`} className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={selectedIds.includes(item.id)}
                  onChange={() => toggleSelection(item.id)}
                  className="w-4 h-4 rounded border-slate-300 text-[#1e4da1] focus:ring-[#1e4da1]"
                />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{item.name}</span>
              </label>
            ))
          )}
        </div>

        <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
          <p className="text-[10px] text-blue-700 dark:text-blue-300 font-bold tracking-wide">
            Dates will be automatically assigned to the correct billing month.
          </p>
        </div>
        <div className="flex gap-3 pt-2">
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => onConfirm(selectedIds)} className="flex-1 bg-[#1e4da1] dark:bg-blue-600 text-white py-3 rounded-xl font-black text-[10px] uppercase shadow-lg">Confirm</motion.button>
          <button onClick={onCancel} className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-500 py-3 rounded-xl font-black text-[10px] uppercase">Cancel</button>
        </div>
      </div>
    </Modal>
  );
};

const DatabaseSetupView: React.FC<{ message: string, onReload: () => void }> = ({ message, onReload }) => (
  <div className="flex flex-col min-h-screen items-center justify-center p-8 bg-[#f8fafc] dark:bg-[#0f172a] text-center">
    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mb-6"><Terminal size={32} /></div>
    <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic mb-2">{message}</h2>
    <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 max-w-xs">Tables missing. Check Supabase setup.</p>
    <button onClick={onReload} className="mt-8 bg-[#1e4da1] text-white px-8 py-3 rounded-xl font-black text-xs uppercase flex items-center gap-2"><RefreshCw size={14} /> Reload</button>
  </div>
);

interface StatisticsViewProps {
  history: HistoryMonth[];
  classTypes: ClassType[];
  gyms: Gym[];
  students: Student[];
  onBack: () => void;
}

const StatisticsView: React.FC<StatisticsViewProps> = ({ history, classTypes, gyms, students, onBack }) => {
  const validHistory = history || [];

  // Sort chronologically
  const sortedData = useMemo(() => {
    return [...validHistory].sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      const MONTH_ORDER: Record<string, number> = {
        'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
        'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11,
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'Jun': 5, 'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
      };
      const aMonth = MONTH_ORDER[a.monthName] ?? 0;
      const bMonth = MONTH_ORDER[b.monthName] ?? 0;
      return aMonth - bMonth;
    });
  }, [validHistory]);

  // Total Students directly queried from active state list of students
  const totalStudents = students.length;

  // Revenue totals
  const totalRevenue = useMemo(() => {
    return validHistory.reduce((acc: number, h) => {
      const rev = typeof h.revenue === 'string' ? parseFloat(h.revenue) : Number(h.revenue || 0);
      return acc + rev;
    }, 0);
  }, [validHistory]);

  const avgMonthly = useMemo(() => {
    return validHistory.length > 0 ? totalRevenue / validHistory.length : 0;
  }, [validHistory, totalRevenue]);

  // Dynamically build map of class ID -> Name from active properties and fallback snapshot data
  const classTypeMap = useMemo(() => {
    const map: Record<string, string> = {};

    // 1. Populate from active class types
    classTypes.forEach(ct => {
      if (ct.id && ct.name) {
        map[ct.id] = ct.name;
      }
    });

    // 2. Populate from active gyms/teams
    gyms.forEach(g => {
      if (g.id && g.name) {
        map[g.id] = g.name;
      }
    });

    // 3. Fallback to snapshot files for deleted elements
    validHistory.forEach(month => {
      if (month.snapshot_data?.classTypes) {
        month.snapshot_data.classTypes.forEach(ct => {
          if (ct.id && ct.name && !map[ct.id]) {
            map[ct.id] = ct.name;
          }
        });
      }
      if (month.snapshot_data?.gyms) {
        month.snapshot_data.gyms.forEach(g => {
          if (g.id && g.name && !map[g.id]) {
            map[g.id] = g.name;
          }
        });
      }
    });

    return map;
  }, [validHistory, classTypes, gyms]);

  const getClassName = useCallback((id: string) => {
    if (classTypeMap[id]) return classTypeMap[id];
    if (id === '1') return 'Private Session';
    if (id === '2') return 'Group Class';
    if (id === '3') return 'Tumbling Intensive';
    return `Class ${id}`;
  }, [classTypeMap]);

  // Count sessions per class type
  const sessionsByClass = useMemo(() => {
    const map: Record<string, number> = {};
    validHistory.forEach(month => {
      if (month.sessions) {
        month.sessions.forEach(session => {
          const cid = session.classTypeId;
          if (cid) {
            map[cid] = (map[cid] || 0) + 1;
          }
        });
      }
    });
    return map;
  }, [validHistory]);

  // Busiest class calculations
  const busiestClass = useMemo(() => {
    let bestId = '';
    let maxSessions = 0;
    Object.entries(sessionsByClass).forEach(([cid, count]) => {
      if (count > maxSessions) {
        maxSessions = count;
        bestId = cid;
      }
    });
    return {
      name: bestId ? getClassName(bestId) : 'None',
      count: maxSessions
    };
  }, [sessionsByClass, getClassName]);

  // Format data for Recharts AreaChart (monthly revenue)
  const areaChartData = useMemo(() => {
    return sortedData.map(h => {
      const rev = typeof h.revenue === 'string' ? parseFloat(h.revenue) : Number(h.revenue || 0);
      return {
        name: `${h.monthName.substring(0, 3)} ${h.year}`,
        Revenue: rev
      };
    });
  }, [sortedData]);

  // Format data for Recharts BarChart (sessions per class type)
  const barChartData = useMemo(() => {
    return Object.entries(sessionsByClass).map(([classTypeId, count]) => ({
      name: getClassName(classTypeId),
      Sessions: count
    }));
  }, [sessionsByClass, getClassName]);

  return (
    <div className="space-y-6 mt-4 pb-20">
      <button onClick={onBack} className="text-slate-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 hover:text-[#1e4da1]">&larr; Back</button>
      <h2 className="text-xl font-black text-[#1a1a1a] dark:text-slate-100 uppercase italic">Analytics</h2>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Stat Card 1: Total Students */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[#94a3b8] text-[9px] font-black uppercase tracking-wider mb-1">Total Students</p>
            <h3 className="text-2xl font-black italic text-slate-800 dark:text-slate-100">{totalStudents}</h3>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-[#1e4da1] dark:text-blue-400">
            <Users size={18} />
          </div>
        </div>

        {/* Stat Card 2: Avg Monthly Revenue */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[#94a3b8] text-[9px] font-black uppercase tracking-wider mb-1">Avg Monthly Rev</p>
            <h3 className="text-2xl font-black italic text-emerald-600 dark:text-emerald-400">R{Math.round(avgMonthly)}</h3>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CreditCard size={18} />
          </div>
        </div>

        {/* Stat Card 3: Busiest Class */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[#94a3b8] text-[9px] font-black uppercase tracking-wider mb-1">Busiest Class</p>
            <h3 className="text-lg font-black italic text-[#1e4da1] dark:text-blue-400 truncate max-w-[150px] md:max-w-[180px]">{busiestClass.name}</h3>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">{busiestClass.count} sessions</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center text-orange-500 dark:text-orange-400 flex-shrink-0">
            <Zap size={18} />
          </div>
        </div>
      </div>

      {/* Charts List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Chart 1: Revenue Trend */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
          <p className="text-[#94a3b8] text-[10px] font-black uppercase mb-4 tracking-widest">Monthly Revenue Trend</p>
          {areaChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={areaChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1e4da1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#1e4da1" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-700" />
                <XAxis 
                  dataKey="name" 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} 
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(v) => `R${v}`} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    borderRadius: '12px', 
                    border: 'none', 
                    color: '#fff',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' 
                  }} 
                  itemStyle={{ color: '#60a5fa', fontWeight: 'bold' }}
                  labelStyle={{ color: '#94a3b8', fontSize: '10px', fontWeight: 'bold' }}
                  formatter={(value) => [`R${value}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="Revenue" stroke="#1e4da1" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center">
              <p className="text-slate-400 text-[10px] font-black uppercase italic">No history data available</p>
            </div>
          )}
        </div>

        {/* Chart 2: Sessions per Class Type */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
          <p className="text-[#94a3b8] text-[10px] font-black uppercase mb-4 tracking-widest">Sessions by Class Type</p>
          {barChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-700" />
                <XAxis 
                  dataKey="name" 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} 
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    borderRadius: '12px', 
                    border: 'none', 
                    color: '#fff',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' 
                  }} 
                  itemStyle={{ color: '#38bdf8', fontWeight: 'bold' }}
                  labelStyle={{ color: '#94a3b8', fontSize: '10px', fontWeight: 'bold' }}
                  formatter={(value) => [value, 'Sessions']}
                />
                <Bar dataKey="Sessions" fill="#0284c7" radius={[6, 6, 0, 0]} maxBarSize={45}>
                  {barChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#1e4da1' : '#0ea5e9'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center">
              <p className="text-slate-400 text-[10px] font-black uppercase italic">No session data available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;