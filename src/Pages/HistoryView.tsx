import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History,
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Download,
  FileSpreadsheet,
  Layers,
  Sparkles,
  ShieldAlert,
  RefreshCw,
  ArrowUpRight,
  Clock,
  Building,
  School,
  Activity,
  CheckCircle2,
  X,
  Wallet,
  FileText,
  Loader2,
  ZoomIn,
  ZoomOut,
  Eye,
  Search
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { AppState, HistoryMonth, AttendanceSession, StaffProfile, StaffPayslip } from '../../types';
import { priceSessions, PricingContext, PricedCoachLine } from '../utils/pricing';
import { InvoiceTracker } from '../components/InvoiceTracker';

const money = (n: number): number => Math.round((Number(n) || 0) * 100) / 100;

interface HistoryViewProps {
  state: AppState;
  /** Tick invoices paid / unpaid. Backs the month tabs. */
  onSetInvoicePaid?: (paymentIds: string[], paid: boolean) => void;
  onFixInvoiceAmount?: (paymentId: string, amount: number) => void;
  onShowRecovery?: () => void;
  onRestoreSnapshot?: (snapshot: any) => void;
  /**
   * Rebuild a month (or every month) from its archived sessions. This is the
   * owner's route to the redundancy: a month archived by an older version of the
   * app, or edited while offline, reads right again after this runs.
   */
  onRecalculate?: (historyId?: string) => void;
  isRecalculating?: boolean;
  user?: any;
}

interface ArchivedPayslipA4DocProps {
  payslip: {
    monthName: string;
    year: number;
    reference: string;
    coach: any;
    allLines: PricedCoachLine[];
    totalHours: number;
    totalEarnings: number;
    sessionCount: number;
  };
  profile: any;
  gyms: any[];
  innerRef?: React.Ref<HTMLDivElement>;
}

const ArchivedPayslipA4Doc: React.FC<ArchivedPayslipA4DocProps> = ({ payslip, profile, gyms, innerRef }) => {
  return (
    <div
      ref={innerRef}
      style={{
        width: 794,
        padding: '48px 56px',
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"
      }}
      className="relative bg-white dark:bg-[#0f172a]"
    >
      {/* Top blue bar */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-[#1e4da1]" />

      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <img
            src="/Invoice.png"
            alt="JFLIPS"
            className="h-16 md:h-20 object-contain rounded-xl mb-1"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <p className="text-base font-black uppercase tracking-[0.25em] text-[#1e4da1] dark:text-blue-400 mt-1">
            PAYSLIP
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Pay Period</p>
          <p className="text-xl font-black text-slate-900 dark:text-slate-100">{payslip.monthName} {payslip.year}</p>
          <p className="text-[11px] text-slate-400 mt-1 font-bold">
            Date Issued: {new Date().toLocaleDateString('en-GB')}
          </p>
          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
            REF: {payslip.reference}
          </p>
        </div>
      </div>

      <div className="w-full h-px bg-slate-200 dark:bg-slate-700 mb-6" />

      {/* Recipient & Employer */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div className="space-y-1">
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-[#1e4da1]">
            Employer
          </p>
          <p className="text-base font-black uppercase italic text-slate-900 dark:text-slate-100">
            {profile?.businessName || 'JFLIPS'}
          </p>
          {profile?.email && <p className="text-[11px] text-slate-500">{profile.email}</p>}
        </div>

        <div className="space-y-1">
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-[#1e4da1]">
            Coach
          </p>
          <p className="text-lg font-black uppercase italic text-slate-900 dark:text-slate-100">
            {payslip.coach?.name || 'Coach'}
          </p>
          {payslip.coach?.email && <p className="text-[11px] text-slate-500">{payslip.coach.email}</p>}
          {payslip.coach?.phone && <p className="text-[11px] text-slate-500">{payslip.coach.phone}</p>}
        </div>
      </div>

      {/* Banking Details */}
      <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 rounded-2xl p-4 mb-6">
        <div className="mb-2">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1e4da1] dark:text-blue-400">
            Banking Details
          </p>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase">Bank Name</p>
            <p className="text-[12px] font-black uppercase text-slate-800 dark:text-slate-200">
              {payslip.coach?.bankName || 'Not Provided'}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase">Account Number</p>
            <p className="text-[12px] font-black font-mono text-slate-800 dark:text-slate-200">
              {payslip.coach?.accountNumber || '—'}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase">Branch Code</p>
            <p className="text-[12px] font-black font-mono text-slate-800 dark:text-slate-200">
              {payslip.coach?.branchCode || 'Default'}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase">Account Type</p>
            <p className="text-[12px] font-black uppercase text-slate-800 dark:text-slate-200">
              {payslip.coach?.accountType || 'Current'}
            </p>
          </div>
        </div>
      </div>

      {/* 5-Column Table */}
      <div className="mb-2">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '95px 1fr 100px 95px 110px',
            gap: '10px'
          }}
          className="px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-t-xl"
        >
          <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Date</span>
          <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Session or Class</span>
          <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider text-right">Hourly Rate</span>
          <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider text-right">Hours Coached</span>
          <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider text-right">Total Earnings</span>
        </div>

        <div className="border border-slate-200 dark:border-slate-700/80 rounded-b-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
          {payslip.allLines && payslip.allLines.length > 0 ? (
            payslip.allLines.map((line, idx) => {
              const isEven = idx % 2 === 0;
              const org = line.orgId ? gyms.find(g => g.id === line.orgId) : null;
              const subText = org ? `${org.name}` : 'Tumbling Class';

              return (
                <div
                  key={`arch-coach-line-doc-${idx}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '95px 1fr 100px 95px 110px',
                    gap: '10px'
                  }}
                  className={`items-center px-3 py-2.5 ${
                    isEven ? 'bg-white dark:bg-slate-900/40' : 'bg-slate-50/70 dark:bg-slate-800/20'
                  }`}
                >
                  <span className="text-[11px] font-bold text-slate-500 tabular-nums">
                    {new Date(line.date).toLocaleDateString('en-GB')}
                  </span>
                  <div className="min-w-0 pr-2">
                    <p className="text-[12px] font-black text-slate-900 dark:text-slate-100 uppercase italic truncate">
                      {line.description}
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">
                      {subText}
                      {line.splitCount > 1 ? ` · Split (${line.splitCount} coaches)` : ''}
                    </p>
                  </div>
                  <span className="text-[12px] font-bold text-slate-600 dark:text-slate-300 text-right tabular-nums">
                    R{Number(line.rate || 0).toFixed(2)}/hr
                  </span>
                  <span className="text-[12px] font-black text-slate-800 dark:text-slate-200 text-right tabular-nums">
                    {Number(line.hours || 0).toFixed(1)} hrs
                  </span>
                  <span className="text-[13px] font-black text-slate-900 dark:text-slate-100 text-right tabular-nums">
                    R{Number(line.amount || 0).toFixed(2)}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center">
              <p className="text-[11px] text-slate-400 font-black uppercase tracking-wider">
                No coaching sessions recorded for this period
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Summary & Footer */}
      <div className="mt-8 pt-4 border-t-2 border-slate-200 dark:border-slate-700">
        <div className="flex justify-between items-end">
          <div className="space-y-2">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Total Sessions</p>
                <p className="text-xl font-black text-slate-800 dark:text-slate-200">{payslip.sessionCount}</p>
              </div>
              <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Total Hours Coached</p>
                <p className="text-xl font-black text-slate-800 dark:text-slate-200">{Number(payslip.totalHours || 0).toFixed(1)} hrs</p>
              </div>
            </div>
          </div>

          <div className="text-right">
            <p className="text-[12px] font-black uppercase tracking-[0.2em] text-[#1e4da1] dark:text-blue-400 mb-1">
              Total Remuneration Due
            </p>
            <p className="text-5xl font-black italic text-[#1e4da1] dark:text-blue-400 leading-none tabular-nums">
              R{Number(payslip.totalEarnings || 0).toFixed(2)}
            </p>
          </div>
        </div>

        <div className="w-full h-px bg-slate-100 dark:bg-slate-800 mt-8 mb-3" />
        <p className="text-[9px] text-slate-300 dark:text-slate-600 font-bold uppercase text-center tracking-widest">
          Official Remuneration Advice · Generated by JFLIPS Gymnastics
        </p>
      </div>
    </div>
  );
};

export const HistoryView: React.FC<HistoryViewProps> = ({
  state,
  onShowRecovery,
  onRestoreSnapshot,
  onRecalculate,
  isRecalculating,
  onSetInvoicePaid,
  onFixInvoiceAmount,
  user
}) => {
  const [selectedMonth, setSelectedMonth] = useState<HistoryMonth | null>(null);
  const [expandedMonthId, setExpandedMonthId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStreamFilter, setSelectedStreamFilter] = useState<'all' | 'tumbling' | 'schools' | 'gyms'>('all');

  // Archived Payslip Inspection State
  const [selectedArchivedPayslip, setSelectedArchivedPayslip] = useState<{
    monthName: string;
    year: number;
    reference: string;
    coach: any;
    allLines: PricedCoachLine[];
    totalHours: number;
    totalEarnings: number;
    sessionCount: number;
  } | null>(null);
  const [isGeneratingPayslipPdf, setIsGeneratingPayslipPdf] = useState(false);
  const payslipDocRef = React.useRef<HTMLDivElement>(null);
  const payslipContainerRef = useRef<HTMLDivElement>(null);
  const [payslipScale, setPayslipScale] = useState(1);
  const [payslipManualZoom, setPayslipManualZoom] = useState<number | null>(null);

  // Auto-scale payslip preview for mobile (identical to AccountsView)
  useEffect(() => {
    const updateScale = () => {
      if (payslipManualZoom !== null) {
        setPayslipScale(payslipManualZoom);
        return;
      }
      if (payslipContainerRef.current) {
        const width = payslipContainerRef.current.offsetWidth;
        const targetWidth = 820;
        if (width < targetWidth) {
          setPayslipScale(width / targetWidth);
        } else {
          setPayslipScale(1);
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
  }, [selectedArchivedPayslip, payslipManualZoom]);

  const handlePayslipZoomIn = () => setPayslipManualZoom(prev => Math.min((prev || payslipScale) + 0.1, 2));
  const handlePayslipZoomOut = () => setPayslipManualZoom(prev => Math.max((prev || payslipScale) - 0.1, 0.3));
  const handlePayslipZoomReset = () => setPayslipManualZoom(null);
  const handlePayslipZoom100 = () => setPayslipManualZoom(1.0);

  const pricingContext: PricingContext = useMemo(() => ({
    gyms: state.gyms || [],
    classTypes: state.classTypes || [],
    students: state.students || [],
    staff: state.staff || [],
    profile: state.profile
  }), [state.gyms, state.classTypes, state.students, state.staff, state.profile]);

  const saveAndShareFile = async (dataUrl: string, fileName: string) => {
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
  };

  const handleDownloadArchivedPdf = async () => {
    if (!selectedArchivedPayslip || !payslipDocRef.current) return;
    setIsGeneratingPayslipPdf(true);
    const wasDark = document.documentElement.classList.contains('dark');
    if (wasDark) document.documentElement.classList.remove('dark');

    try {
      await new Promise(r => setTimeout(r, 600));
      const dataUrl = await toPng(payslipDocRef.current, {
        backgroundColor: '#ffffff',
        pixelRatio: 3,
        cacheBust: true
      });

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfW = 210;
      const margin = 10;
      const contentW = pdfW - (margin * 2);
      const imgProps = doc.getImageProperties(dataUrl);
      const pdfH = (imgProps.height * contentW) / imgProps.width;

      doc.addImage(dataUrl, 'PNG', margin, margin, contentW, pdfH);
      const fileName = `Payslip_${selectedArchivedPayslip.coach.name.replace(/\s+/g, '_')}_${selectedArchivedPayslip.monthName}_${selectedArchivedPayslip.year}.pdf`;
      
      if (Capacitor.isNativePlatform()) {
        const pdfBase64 = doc.output('datauristring');
        await saveAndShareFile(pdfBase64, fileName);
      } else {
        doc.save(fileName);
      }
    } catch (e) {
      console.error('Archived payslip PDF failed:', e);
      alert('Failed to generate PDF');
    } finally {
      if (wasDark) document.documentElement.classList.add('dark');
      setIsGeneratingPayslipPdf(false);
    }
  };

  const handleDownloadArchivedPng = async () => {
    if (!selectedArchivedPayslip || !payslipDocRef.current) return;
    setIsGeneratingPayslipPdf(true);
    const wasDark = document.documentElement.classList.contains('dark');
    if (wasDark) document.documentElement.classList.remove('dark');

    try {
      await new Promise(r => setTimeout(r, 600));
      const dataUrl = await toPng(payslipDocRef.current, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        cacheBust: true,
        style: { borderRadius: '1rem' }
      });
      const fileName = `Payslip_${selectedArchivedPayslip.coach.name.replace(/\s+/g, '_')}_${selectedArchivedPayslip.monthName}_${selectedArchivedPayslip.year}.png`;
      await saveAndShareFile(dataUrl, fileName);
    } catch (e) {
      console.error('Archived payslip PNG failed:', e);
      alert('Failed to capture PNG');
    } finally {
      if (wasDark) document.documentElement.classList.add('dark');
      setIsGeneratingPayslipPdf(false);
    }
  };

  const getArchivedMonthPayslips = (m: HistoryMonth) => {
    const monthKey = `${m.monthName} ${m.year}`;
    // One payslip per coach: older versions saved a copy on every reset, so keep
    // the best of each (paid first, then the newest).
    const rank = (st?: string) => (st === 'paid' ? 0 : st === 'processing' ? 1 : 2);
    const bestByCoach = new Map<string, StaffPayslip>();
    (state.payslips || []).filter(p => p.period_month === monthKey).forEach(p => {
      const cur = bestByCoach.get(p.coach_id);
      if (!cur || rank(p.status) < rank(cur.status) ||
          (rank(p.status) === rank(cur.status) && String(p.created_at || '') > String(cur.created_at || ''))) {
        bestByCoach.set(p.coach_id, p);
      }
    });

    // Compute session coach lines for this month as fallback if saved snapshot has empty lines
    let fallbackCoachLines: PricedCoachLine[] = [];
    if (m.sessions && m.sessions.length > 0) {
      try {
        const res = priceSessions(m.sessions, pricingContext);
        fallbackCoachLines = res.coachLines || [];
      } catch (_) {}
    }

    const matchingSaved = Array.from(bestByCoach.values());
    if (matchingSaved.length > 0) {
      return matchingSaved.map(p => {
        let snap: any = p.snapshot_data || {};
        if (typeof snap === 'string') {
          try { snap = JSON.parse(snap); } catch {}
        }
        const staffObj = (state.staff || []).find(st => st.id === p.coach_id);
        const snapCoach = snap?.coach || {};
        const combinedCoach = {
          id: p.coach_id,
          name: staffObj?.name || staffObj?.username || snapCoach?.name || 'Coach',
          email: staffObj?.email || snapCoach?.email || '',
          phone: staffObj?.phone || snapCoach?.phone || '',
          bankName: staffObj?.bankName || staffObj?.bank_name || snapCoach?.bankName || snapCoach?.bank_name || '',
          accountNumber: staffObj?.accountNumber || staffObj?.account_number || snapCoach?.accountNumber || snapCoach?.account_number || '',
          branchCode: staffObj?.branchCode || staffObj?.branch_code || snapCoach?.branchCode || snapCoach?.branch_code || '',
          accountType: staffObj?.accountType || staffObj?.account_type || snapCoach?.accountType || snapCoach?.account_type || 'Current'
        };

        let lines: PricedCoachLine[] = Array.isArray(snap?.lines) ? snap.lines : [];
        if (lines.length === 0 && fallbackCoachLines.length > 0) {
          lines = fallbackCoachLines.filter(l => l.coachId === p.coach_id);
        }

        const totalHours = Number(p.total_hours || (lines.length > 0 ? Math.round(lines.reduce((a, l) => a + Number(l.hours || 0), 0) * 10) / 10 : 0));
        const totalEarnings = Number(p.gross_amount || (lines.length > 0 ? Math.round(lines.reduce((a, l) => a + Number(l.amount || 0), 0) * 100) / 100 : 0));
        const sessionCount = Number(p.total_sessions || (lines.length > 0 ? new Set(lines.map(l => l.groupId)).size : 0));

        return {
          id: p.id,
          reference: p.reference_id || `PAY-${m.year}-${m.monthName.slice(0, 3).toUpperCase()}-${p.coach_id.slice(0, 6).toUpperCase()}`,
          coach: combinedCoach,
          totalHours,
          totalEarnings,
          sessionCount,
          allLines: lines
        };
      });
    }

    if (!m.sessions || m.sessions.length === 0) return [];
    const { coachLines } = priceSessions(m.sessions, pricingContext);
    const byCoach = new Map<string, {
      id: string;
      reference: string;
      coach: any;
      totalHours: number;
      totalEarnings: number;
      sessionCount: number;
      allLines: PricedCoachLine[];
    }>();

    coachLines.forEach(l => {
      if (!l.coachId) return;
      const staffObj = (state.staff || []).find(s => s.id === l.coachId) || {
        id: l.coachId,
        name: l.targetName || 'Coach',
        email: '',
        phone: '',
        bankName: '',
        accountNumber: '',
        branchCode: '',
        accountType: 'Current'
      };

      if (!byCoach.has(l.coachId)) {
        byCoach.set(l.coachId, {
          id: `arch_${m.id}_${l.coachId}`,
          reference: `PAY-${m.year}-${m.monthName.slice(0, 3).toUpperCase()}-${l.coachId.slice(0, 6).toUpperCase()}`,
          coach: staffObj,
          totalHours: 0,
          totalEarnings: 0,
          sessionCount: 0,
          allLines: []
        });
      }

      const entry = byCoach.get(l.coachId)!;
      entry.allLines.push(l);
      entry.totalHours += Number(l.hours || 0);
      entry.totalEarnings += Number(l.amount || 0);
    });

    byCoach.forEach(entry => {
      entry.sessionCount = new Set(entry.allLines.map(l => l.groupId)).size;
      entry.totalHours = Math.round(entry.totalHours * 10) / 10;
      entry.totalEarnings = Math.round(entry.totalEarnings * 100) / 100;
    });

    return Array.from(byCoach.values());
  };

  const historyRecords = useMemo(() => {
    const list = [...(state.history || [])];
    // Sort descending by year and month
    const monthOrder: Record<string, number> = {
      january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
      july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
    };

    return list.sort((a, b) => {
      const yearDiff = (b.year || 0) - (a.year || 0);
      if (yearDiff !== 0) return yearDiff;
      const mA = monthOrder[a.monthName?.toLowerCase()] ?? 0;
      const mB = monthOrder[b.monthName?.toLowerCase()] ?? 0;
      return mB - mA;
    });
  }, [state.history]);

  const isOwner = state.profile.role === 'owner';

  // Identity of the coach viewing the history (if logged in as staff)
  const myStaff = useMemo(() => {
    return (state.staff || []).find(st =>
      st.id === user?.id ||
      (st.email && user?.email && st.email.toLowerCase() === user.email.toLowerCase())
    );
  }, [state.staff, user]);

  const currentCoachId = myStaff?.id || user?.id || state.profile.id;
  const coachName = myStaff?.name || state.profile.name || 'Staff Coach';

  // All archived payslips specific to this coach across previous months
  const coachArchivedPayslips = useMemo(() => {
    if (isOwner) return [];

    const list: Array<{
      monthId: string;
      monthName: string;
      year: number;
      payslip: {
        id: string;
        reference: string;
        coach: any;
        totalHours: number;
        totalEarnings: number;
        sessionCount: number;
        allLines: PricedCoachLine[];
      };
      status?: string;
      paidAt?: string;
    }> = [];

    const seenMonthKeys = new Set<string>();

    // 1. From historyRecords (newest first)
    (historyRecords || []).forEach(m => {
      const monthKey = `${m.monthName} ${m.year}`;
      seenMonthKeys.add(monthKey);
      const mPayslips = getArchivedMonthPayslips(m);
      const mine = mPayslips.find(p =>
        p.coach.id === currentCoachId ||
        p.coach.id === user?.id ||
        (myStaff && p.coach.id === myStaff.id) ||
        (user?.email && p.coach.email && p.coach.email.toLowerCase() === user.email.toLowerCase()) ||
        (state.profile.email && p.coach.email && p.coach.email.toLowerCase() === state.profile.email.toLowerCase())
      );
      if (mine) {
        const saved = (state.payslips || []).find(sp =>
          sp.period_month === monthKey &&
          (sp.coach_id === currentCoachId || sp.coach_id === user?.id || (myStaff && sp.coach_id === myStaff.id))
        );
        list.push({
          monthId: m.id,
          monthName: m.monthName,
          year: m.year,
          payslip: mine,
          status: saved?.status || (mine as any).status || 'unpaid',
          paidAt: saved?.paid_at || (mine as any).paidAt
        });
      }
    });

    // 2. From state.payslips for any month not in historyRecords
    (state.payslips || []).forEach(p => {
      if (
        p.coach_id !== currentCoachId &&
        p.coach_id !== user?.id &&
        (!myStaff || p.coach_id !== myStaff.id)
      ) return;
      if (seenMonthKeys.has(p.period_month)) return;
      seenMonthKeys.add(p.period_month);

      const parts = p.period_month.split(' ');
      const mName = parts[0] || 'Period';
      const mYear = parts[1] ? parseInt(parts[1], 10) : new Date().getFullYear();

      let snap: any = p.snapshot_data || {};
      if (typeof snap === 'string') {
        try { snap = JSON.parse(snap); } catch {}
      }
      const snapCoach = snap?.coach || {};
      const staffObj = myStaff || (state.staff || []).find(st => st.id === p.coach_id);
      const combinedCoach = {
        id: p.coach_id,
        name: staffObj?.name || staffObj?.username || snapCoach?.name || coachName,
        email: staffObj?.email || snapCoach?.email || '',
        phone: staffObj?.phone || snapCoach?.phone || '',
        bankName: staffObj?.bankName || staffObj?.bank_name || snapCoach?.bankName || snapCoach?.bank_name || '',
        accountNumber: staffObj?.accountNumber || staffObj?.account_number || snapCoach?.accountNumber || snapCoach?.account_number || '',
        branchCode: staffObj?.branchCode || staffObj?.branch_code || snapCoach?.branchCode || snapCoach?.branch_code || '',
        accountType: staffObj?.accountType || staffObj?.account_type || snapCoach?.accountType || snapCoach?.account_type || 'Current'
      };

      const lines: PricedCoachLine[] = Array.isArray(snap?.lines) ? snap.lines : [];

      list.push({
        monthId: p.id,
        monthName: mName,
        year: mYear,
        payslip: {
          id: p.id,
          reference: p.reference_id || `PAY-${mYear}-${mName.slice(0, 3).toUpperCase()}-${p.coach_id.slice(0, 6).toUpperCase()}`,
          coach: combinedCoach,
          totalHours: Number(p.total_hours || (lines.length > 0 ? Math.round(lines.reduce((a, l) => a + Number(l.hours || 0), 0) * 10) / 10 : 0)),
          totalEarnings: Number(p.gross_amount || (lines.length > 0 ? Math.round(lines.reduce((a, l) => a + Number(l.amount || 0), 0) * 100) / 100 : 0)),
          sessionCount: Number(p.total_sessions || (lines.length > 0 ? new Set(lines.map(l => l.groupId)).size : 0)),
          allLines: lines
        },
        status: p.status || 'unpaid',
        paidAt: p.paid_at
      });
    });

    return list;
  }, [isOwner, historyRecords, state.history, state.payslips, currentCoachId, myStaff, coachName, getArchivedMonthPayslips, user, state.profile.email]);

  /**
   * WHAT THE CLIENTS WERE ACTUALLY INVOICED, cross-checked two ways.
   *
   * `stored` is the figure the archive derived from the month's sessions.
   * `fromPayments` re-adds the archived payment rows for the same month — a
   * second, independent record of the same money. When the two disagree the
   * month is showing a warning rather than quietly picking one, because a
   * mismatch is the signal that the month needs recalculating.
   *
   * Coach payouts are excluded: they are an expense, not something invoiced.
   */
  const invoiceTotals = useMemo(() => {
    const paidByMonth = new Map<string, { total: number; count: number }>();
    (state.payments || []).forEach(p => {
      if (p.is_expense) return;
      const key = p.invoice_id;
      if (!key || key === 'Active') return;
      const entry = paidByMonth.get(key) || { total: 0, count: 0 };
      entry.total += Number(p.amount_due || 0);
      entry.count += 1;
      paidByMonth.set(key, entry);
    });

    const byHistoryId = new Map<string, {
      stored: number;
      fromPayments: number;
      invoiceCount: number;
      mismatch: boolean;
    }>();

    historyRecords.forEach(h => {
      const key = `${h.monthName} ${h.year}`;
      const pay = paidByMonth.get(key);
      const stored = Number(h.invoicesTotal ?? h.totalGross ?? h.revenue ?? 0);
      const fromPayments = pay ? Math.round(pay.total * 100) / 100 : 0;
      byHistoryId.set(h.id, {
        stored,
        fromPayments,
        invoiceCount: Number(h.invoiceCount ?? pay?.count ?? 0),
        // A cent of float drift is not a mismatch; a rand is.
        mismatch: !!pay && Math.abs(stored - fromPayments) >= 1
      });
    });

    const grandTotal = money(historyRecords.reduce(
      (acc, h) => acc + (byHistoryId.get(h.id)?.stored || 0), 0
    ));
    const anyMismatch = Array.from(byHistoryId.values()).some(v => v.mismatch);

    return { byHistoryId, grandTotal, anyMismatch };
  }, [historyRecords, state.payments]);

  // Overall Financial Totals
  const overallTotals = useMemo(() => {
    let gross = 0;
    let coachPay = 0;
    let net = 0;
    let sessions = 0;
    let tumblingGross = 0;
    let tumblingCoachPay = 0;
    let tumblingNet = 0;
    let schoolsGross = 0;
    let schoolsCoachPay = 0;
    let gymsGross = 0;
    let gymsNet = 0;
    let merchGross = 0;
    let merchNet = 0;

    historyRecords.forEach(h => {
      const tGross = Number(h.tumblingGross ?? 0);
      const tCoach = Number(h.tumblingCoachPay ?? 0);
      const tNet = Number(h.tumblingNet ?? (tGross - tCoach));

      const sGross = Number(h.schoolsGross ?? 0);
      const sCoach = Number(h.schoolsCoachPay ?? 0);

      const gGross = Number(h.gymsGross ?? 0);
      const gNet = Number(h.gymsNet ?? gGross);

      const mGross = Number(h.merchGross ?? 0);
      const mNet = Number(h.merchNet ?? 0);

      const totalG = Number(h.totalGross ?? h.revenue ?? (tGross + sGross + gGross + mGross));
      const totalC = Number(h.totalCoachPayout ?? (tCoach + sCoach));
      const totalN = Number(h.netProfit ?? (tNet + gNet + mNet));

      gross += totalG;
      coachPay += totalC;
      net += totalN;
      merchGross += mGross;
      merchNet += mNet;
      sessions += Number(h.sessionCount ?? (h.sessions?.length || 0));

      tumblingGross += tGross;
      tumblingCoachPay += tCoach;
      tumblingNet += tNet;
      schoolsGross += sGross;
      schoolsCoachPay += sCoach;
      gymsGross += gGross;
      gymsNet += gNet;
    });

    const profitMargin = gross > 0 ? Math.round((net / gross) * 100) : 0;

    // Sum first, round once at the end, so cents of float drift never pile up
    // across dozens of months.
    return {
      gross: money(gross),
      coachPay: money(coachPay),
      net: money(net),
      sessions,
      tumblingGross: money(tumblingGross),
      tumblingCoachPay: money(tumblingCoachPay),
      tumblingNet: money(tumblingNet),
      schoolsGross: money(schoolsGross),
      schoolsCoachPay: money(schoolsCoachPay),
      gymsGross: money(gymsGross),
      gymsNet: money(gymsNet),
      merchGross: money(merchGross),
      merchNet: money(merchNet),
      profitMargin
    };
  }, [historyRecords]);

  // Filtered History
  const filteredHistory = useMemo(() => {
    return historyRecords.filter(h => {
      const name = `${h.monthName} ${h.year}`.toLowerCase();
      return name.includes(searchQuery.toLowerCase());
    });
  }, [historyRecords, searchQuery]);

  // Export Full History to CSV
  const exportAllHistoryCSV = () => {
    if (historyRecords.length === 0) return;

    const headers = [
      'Month',
      'Year',
      'Total Gross Revenue (R)',
      'Total Coach Payouts (R)',
      'Net Business Profit (R)',
      'Tumbling Gross (R)',
      'Tumbling Coach Pay (R)',
      'Tumbling Net (R)',
      'Schools Invoiced (R)',
      'Schools Coach Pay (R)',
      'External Gyms Gross (R)',
      'External Gyms Net (R)',
      'Merchandise Invoiced (R)',
      'Merchandise Net (R)',
      'Session Count',
      'Recorded At'
    ];

    const rows = historyRecords.map(h => [
      `"${h.monthName}"`,
      h.year,
      (Number(h.totalGross ?? h.revenue ?? 0)).toFixed(2),
      (Number(h.totalCoachPayout ?? 0)).toFixed(2),
      (Number(h.netProfit ?? (Number(h.totalGross ?? h.revenue ?? 0) - Number(h.totalCoachPayout ?? 0)))).toFixed(2),
      (Number(h.tumblingGross ?? 0)).toFixed(2),
      (Number(h.tumblingCoachPay ?? 0)).toFixed(2),
      (Number(h.tumblingNet ?? 0)).toFixed(2),
      (Number(h.schoolsGross ?? 0)).toFixed(2),
      (Number(h.schoolsCoachPay ?? 0)).toFixed(2),
      (Number(h.gymsGross ?? 0)).toFixed(2),
      (Number(h.gymsNet ?? 0)).toFixed(2),
      (Number(h.merchGross ?? 0)).toFixed(2),
      (Number(h.merchNet ?? 0)).toFixed(2),
      Number(h.sessionCount ?? (h.sessions?.length || 0)),
      `"${h.recordedAt || ''}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `jflips_gross_revenue_history_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Single Month CSV
  const exportSingleMonthCSV = (m: HistoryMonth) => {
    const headers = [
      'Session Date',
      'Category / Class',
      'Athletes / Coach',
      'Hours',
      'Event Details'
    ];

    const rows = (m.sessions || []).map(s => {
      const gym = (state.gyms || []).find(g => g.id === s.classTypeId);
      const classType = (state.classTypes || []).find(c => c.id === s.classTypeId);
      const title = gym ? gym.name : classType ? classType.name : 'Class';
      const coach = (state.staff || []).find(st => st.id === s.coach_id);
      const coachName = coach?.name || s.covering_coach_name || (s.coach_id === state.profile.id ? 'Owner' : 'Coach');

      return [
        `"${s.date}"`,
        `"${title}"`,
        `"${coachName}"`,
        s.hours_coached || 1,
        `"${s.custom_event_name || (s.is_competition ? 'Competition' : 'Regular')}"`
      ];
    });

    const summarySection = [
      ['---', '---', '---', '---', '---'],
      ['Cycle Summary', `${m.monthName} ${m.year}`, '', '', ''],
      ['Total Gross Invoiced (R)', (Number(m.totalGross ?? m.revenue ?? 0)).toFixed(2), '', '', ''],
      ['Total Coach Payouts (R)', (Number(m.totalCoachPayout ?? 0)).toFixed(2), '', '', ''],
      ['Net Business Profit (R)', (Number(m.netProfit ?? 0)).toFixed(2), '', '', ''],
      ['Tumbling Gross (R)', (Number(m.tumblingGross ?? 0)).toFixed(2), '', '', ''],
      ['Schools Invoiced (R)', (Number(m.schoolsGross ?? 0)).toFixed(2), '', '', ''],
      ['External Gyms Gross (R)', (Number(m.gymsGross ?? 0)).toFixed(2), '', '', ''],
      ['Merchandise Invoiced (R)', (Number(m.merchGross ?? 0)).toFixed(2), '', '', '']
    ];

    const csvContent = '\uFEFF' + [
      headers.join(','),
      ...rows.map(r => r.join(',')),
      ...summarySection.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${m.monthName}_${m.year}_cycle_financials.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER: ARCHIVED COACH PAYSLIP VIEWER (Identical to AccountsView)
  // ════════════════════════════════════════════════════════════════════════════
  if (selectedArchivedPayslip) {
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 mt-4 pb-32 w-full px-2">
        {/* Top bar controls */}
        <div className="flex flex-wrap justify-between items-center gap-3 mb-2">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setSelectedArchivedPayslip(null)}
              className="text-slate-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 hover:text-[#1e4da1] cursor-pointer"
            >
              <ChevronLeft size={14} /> {isOwner ? 'Back to History' : 'Back to My Payslips'}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleDownloadArchivedPdf}
              disabled={isGeneratingPayslipPdf}
              className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-3.5 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider shadow-lg flex items-center gap-1.5 disabled:opacity-70 transition-all cursor-pointer"
            >
              {isGeneratingPayslipPdf ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
              <span>Download PDF</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleDownloadArchivedPng}
              disabled={isGeneratingPayslipPdf}
              className="bg-[#1e4da1] text-white px-3.5 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider shadow-lg flex items-center gap-1.5 disabled:opacity-70 transition-all cursor-pointer"
            >
              {isGeneratingPayslipPdf ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              <span>Download PNG</span>
            </motion.button>
          </div>
        </div>

        {/* Payslip Document Preview */}
        <div ref={payslipContainerRef} className="w-full overflow-x-auto no-scrollbar py-4 -mx-2 px-2 relative">
          {/* Zoom controls */}
          <div className="sticky left-4 bottom-6 z-40 flex items-center gap-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 w-fit mb-4">
            <motion.button whileTap={{ scale: 0.9 }} onClick={handlePayslipZoomOut} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400 cursor-pointer">
              <ZoomOut size={16} />
            </motion.button>
            <span className="text-xs font-black tabular-nums text-slate-700 dark:text-slate-200 w-12 text-center">
              {Math.round(payslipScale * 100)}%
            </span>
            <motion.button whileTap={{ scale: 0.9 }} onClick={handlePayslipZoomIn} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400 cursor-pointer">
              <ZoomIn size={16} />
            </motion.button>
            <div className="w-px h-5 bg-slate-200 dark:bg-slate-700" />
            <motion.button whileTap={{ scale: 0.9 }} onClick={handlePayslipZoomReset} className="px-2.5 py-1.5 text-[9px] font-black uppercase text-white bg-[#1e4da1] rounded-lg shadow-sm cursor-pointer">
              Fit
            </motion.button>
            <motion.button whileTap={{ scale: 0.9 }} onClick={handlePayslipZoom100} className="px-2.5 py-1.5 text-[9px] font-black uppercase text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-lg shadow-sm hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer">
              100%
            </motion.button>
          </div>

          {/* ════ THE CLEAN PAYSLIP DOCUMENT ════ */}
          <div
            style={{
              width: 794,
              zoom: payslipScale,
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"
            }}
            className="bg-white dark:bg-[#0f172a] shadow-2xl mx-auto origin-top"
          >
            <div ref={payslipDocRef}>
              <ArchivedPayslipA4Doc
                payslip={selectedArchivedPayslip}
                profile={state.profile}
                gyms={state.gyms || []}
              />
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER: COACH / STAFF PAYSLIP HISTORY (When logged in as staff)
  // ════════════════════════════════════════════════════════════════════════════
  if (!isOwner) {
    const totalPastEarnings = coachArchivedPayslips.reduce((s, item) => s + (Number(item.payslip.totalEarnings) || 0), 0);
    const totalPastHours = coachArchivedPayslips.reduce((s, item) => s + (Number(item.payslip.totalHours) || 0), 0);

    const filteredPayslips = coachArchivedPayslips.filter(item => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.monthName.toLowerCase().includes(q) ||
        String(item.year).includes(q) ||
        item.payslip.reference.toLowerCase().includes(q)
      );
    });

    return (
      <div className="space-y-6 animate-fade-in pb-24 px-1 sm:px-2">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-br from-[#1e3a6e] to-[#0f1d38] p-6 md:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="relative z-10 space-y-2">
            <div className="flex items-center gap-2">
              <div className="px-2.5 py-1 rounded-full bg-blue-400/20 text-blue-300 font-mono text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 border border-blue-400/30">
                <Sparkles size={12} />
                Staff Remuneration Records
              </div>
            </div>
            <h1 className="text-2xl md:text-3xl font-[1000] italic uppercase tracking-tight text-white">
              My Payslip History
            </h1>
            <p className="text-xs text-blue-200/80 font-bold max-w-xl">
              Access and download your official payslips from previous months. Only your individual coaching records are shown here.
            </p>
          </div>
        </div>

        {/* Quick Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 dark:from-blue-950/40 dark:to-indigo-950/40 p-4 rounded-2xl border border-blue-200/60 dark:border-blue-900/40 shadow-sm">
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Total Past Earnings</p>
            <p className="text-2xl font-black italic text-[#1e4da1] dark:text-blue-400 mt-0.5 tabular-nums">
              R{totalPastEarnings.toFixed(2)}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-sm">
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Total Hours Coached</p>
            <p className="text-2xl font-black italic text-slate-800 dark:text-slate-200 mt-0.5 tabular-nums">
              {totalPastHours.toFixed(1)} hrs
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-sm">
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Completed Months</p>
            <p className="text-2xl font-black italic text-slate-800 dark:text-slate-200 mt-0.5">
              {coachArchivedPayslips.length}
            </p>
          </div>
        </div>

        {/* Search */}
        {coachArchivedPayslips.length > 2 && (
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search previous payslips by month or year..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-[#1e4da1] dark:text-white"
            />
          </div>
        )}

        {/* List of Previous Payslips */}
        {filteredPayslips.length === 0 ? (
          <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center shadow-sm space-y-3">
            <Wallet className="mx-auto text-slate-300 dark:text-slate-600" size={44} />
            <p className="text-slate-700 dark:text-slate-300 text-sm font-black uppercase tracking-wider">
              {searchQuery ? 'No Matching Payslips Found' : 'No Previous Payslips Available Yet'}
            </p>
            <p className="text-[11px] text-slate-400 font-bold max-w-md mx-auto leading-relaxed">
              {searchQuery
                ? 'Try searching with a different month name or year.'
                : 'Your payslips from previous months will appear here once archived by your gym administrator. You can also view your active coaching period in My Pay.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPayslips.map(item => {
              const p = item.payslip;
              const isPaid = item.status === 'paid' || (p as any).status === 'paid';
              return (
                <div
                  key={`coach-hist-card-${item.monthId}-${p.id}`}
                  className="p-4 sm:p-5 bg-white dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-blue-300 dark:hover:border-blue-800 transition-all"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1e4da1] to-blue-700 flex items-center justify-center font-black text-white shrink-0 shadow-md">
                      <FileText size={20} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-base font-black text-slate-900 dark:text-slate-100 uppercase italic">
                          {item.monthName} {item.year}
                        </p>
                        {isPaid && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            Paid
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                        {p.reference}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-bold">
                        <span>{p.sessionCount} sessions</span>
                        <span>·</span>
                        <span>{Number(p.totalHours || 0).toFixed(1)} hrs coached</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-700/60">
                    <div className="text-left sm:text-right">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                        Remuneration Due
                      </p>
                      <p className="text-xl font-black italic text-[#1e4da1] dark:text-blue-400 tabular-nums">
                        R{Number(p.totalEarnings || 0).toFixed(2)}
                      </p>
                    </div>

                    <button
                      onClick={() =>
                        setSelectedArchivedPayslip({
                          monthName: item.monthName,
                          year: item.year,
                          reference: p.reference,
                          coach: p.coach,
                          allLines: p.allLines,
                          totalHours: p.totalHours,
                          totalEarnings: p.totalEarnings,
                          sessionCount: p.sessionCount
                        })
                      }
                      className="px-4 py-2.5 bg-[#1e4da1] hover:bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shrink-0"
                    >
                      <FileText size={14} />
                      <span>View Payslip</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Top Header & Export Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-br from-[#1e3a6e] to-[#0f1d38] p-6 md:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2">
            <div className="px-2.5 py-1 rounded-full bg-blue-400/20 text-blue-300 font-mono text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 border border-blue-400/30">
              <Sparkles size={12} />
              Owner Financial Intelligence
            </div>
          </div>
          <h1 className="text-2xl md:text-3xl font-[1000] italic uppercase tracking-tight">
            Revenue & Cycle History
          </h1>
          <p className="text-xs text-blue-200/80 font-medium max-w-xl">
            Track gross business earnings, coach payouts, and net profit archived across tumbling classes, cheer school organizations, and external gym cycles.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3">
          {historyRecords.length > 0 && (
            <button
              onClick={exportAllHistoryCSV}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 active:scale-95 border border-white/20 rounded-xl text-xs font-black uppercase tracking-wider transition-all backdrop-blur"
              title="Download full history as CSV spreadsheet"
            >
              <Download size={14} />
              Export All to CSV
            </button>
          )}

          {onRecalculate && historyRecords.length > 0 && (
            <button
              onClick={() => onRecalculate()}
              disabled={isRecalculating}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50"
              title="Rebuild every archived month from the sessions stored in it"
            >
              <RefreshCw size={14} className={isRecalculating ? 'animate-spin' : ''} />
              {isRecalculating ? 'Recalculating' : 'Recalculate All'}
            </button>
          )}

          {onShowRecovery && (
            <button
              onClick={onShowRecovery}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
            >
              <Layers size={14} />
              Recovery & Snapshots
            </button>
          )}
        </div>
      </div>

      {/* ── Invoices archived: the headline figure ────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              All Invoices Archived
            </span>
            <div className="text-4xl font-[1000] tracking-tight text-[#1e4da1] dark:text-blue-400 tabular-nums">
              R {invoiceTotals.grandTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              {historyRecords.length} archived {historyRecords.length === 1 ? 'month' : 'months'} · {overallTotals.sessions} classes logged
            </p>
          </div>

          {invoiceTotals.anyMismatch && (
            <div className="flex items-start gap-2.5 px-4 py-3 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 max-w-sm">
              <ShieldAlert size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[10px] font-bold text-amber-700 dark:text-amber-300 leading-relaxed uppercase tracking-wide">
                A month's stored total does not match its invoice records — usually a
                session edited or deleted after it was archived. Recalculate to fix it.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Month tabs: which invoices are paid ───────────────────────────── */}
      <InvoiceTracker state={state} onSetInvoicePaid={onSetInvoicePaid} onFixInvoiceAmount={onFixInvoiceAmount} />

      {/* Main Stats KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Revenue */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              All-Time Gross Invoiced
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-[#1e4da1] dark:text-blue-400 flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-[1000] tracking-tight text-slate-900 dark:text-white">
              R {overallTotals.gross.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
              From all closed cycles
            </p>
          </div>
        </motion.div>

        {/* Coach Payouts */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Total Coach Payouts
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Users size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-[1000] tracking-tight text-purple-600 dark:text-purple-400">
              R {overallTotals.coachPay.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
              Staff Coaching Remuneration
            </p>
          </div>
        </motion.div>

        {/* Net Business Profit */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-emerald-200/60 dark:border-emerald-900/40 shadow-sm flex flex-col justify-between bg-gradient-to-br from-emerald-50/40 to-transparent dark:from-emerald-950/20"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              Net Business Profit
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-[1000] tracking-tight text-emerald-600 dark:text-emerald-400">
              R {overallTotals.net.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                {overallTotals.profitMargin}% Margin
              </span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                Retained Profit
              </span>
            </div>
          </div>
        </motion.div>

        {/* Total Sessions */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Total Sessions Coached
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Activity size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-[1000] tracking-tight text-slate-900 dark:text-white">
              {overallTotals.sessions}
            </div>
            <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
              Across all cycles
            </p>
          </div>
        </motion.div>
      </div>

      {/* 3-Stream Lifetime Totals Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <Layers size={14} className="text-[#1e4da1] dark:text-blue-400" />
            Revenue Breakdown by Data Stream
          </h2>
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
            Categorized Invoicing Architecture
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Stream 1: Tumbling */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-[#1e4da1] dark:text-blue-400">
              <span className="text-base">🤸</span>
              <span className="text-[10px] font-black uppercase tracking-widest">Tumbling Classes</span>
            </div>
            <div className="flex items-baseline justify-between pt-1">
              <span className="text-xs text-slate-500 font-bold">Gross Invoiced:</span>
              <span className="text-sm font-black text-slate-800 dark:text-slate-100">
                R {overallTotals.tumblingGross.toFixed(2)}
              </span>
            </div>
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-slate-400 font-medium">Coach Remuneration:</span>
              <span className="font-bold text-purple-600 dark:text-purple-400">
                - R {overallTotals.tumblingCoachPay.toFixed(2)}
              </span>
            </div>
            <div className="flex items-baseline justify-between text-xs pt-1 border-t border-slate-200/60 dark:border-slate-700">
              <span className="font-black text-emerald-600 dark:text-emerald-400">Net Profit:</span>
              <span className="font-black text-emerald-600 dark:text-emerald-400">
                R {overallTotals.tumblingNet.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Stream 2: Schools / Cheer */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
              <span className="text-base">📣</span>
              <span className="text-[10px] font-black uppercase tracking-widest">Cheer School Orgs</span>
            </div>
            <div className="flex items-baseline justify-between pt-1">
              <span className="text-xs text-slate-500 font-bold">School Master Invoiced:</span>
              <span className="text-sm font-black text-slate-800 dark:text-slate-100">
                R {overallTotals.schoolsGross.toFixed(2)}
              </span>
            </div>
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-slate-400 font-medium">Coach Pass-Through Pay:</span>
              <span className="font-bold text-purple-600 dark:text-purple-400">
                R {overallTotals.schoolsCoachPay.toFixed(2)}
              </span>
            </div>
            <div className="flex items-baseline justify-between text-xs pt-1 border-t border-slate-200/60 dark:border-slate-700">
              <span className="font-bold text-slate-400">Impact:</span>
              <span className="font-bold text-slate-400">Pass-Through (100% to Coaches)</span>
            </div>
          </div>

          {/* Stream 3: External Gyms */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <span className="text-base">🏋️</span>
              <span className="text-[10px] font-black uppercase tracking-widest">External Gyms</span>
            </div>
            <div className="flex items-baseline justify-between pt-1">
              <span className="text-xs text-slate-500 font-bold">Direct Coaching Billed:</span>
              <span className="text-sm font-black text-slate-800 dark:text-slate-100">
                R {overallTotals.gymsGross.toFixed(2)}
              </span>
            </div>
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-slate-400 font-medium">Coach Expense:</span>
              <span className="font-bold text-slate-400">R 0.00 (Direct)</span>
            </div>
            <div className="flex items-baseline justify-between text-xs pt-1 border-t border-slate-200/60 dark:border-slate-700">
              <span className="font-black text-emerald-600 dark:text-emerald-400">Net Profit:</span>
              <span className="font-black text-emerald-600 dark:text-emerald-400">
                R {overallTotals.gymsNet.toFixed(2)} (100%)
              </span>
            </div>
          </div>
        </div>

        {overallTotals.merchGross > 0 && (
          <div className="flex items-baseline justify-between text-xs px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
            <span className="font-black uppercase tracking-widest text-[10px] text-slate-500">👕 Merchandise</span>
            <span className="font-bold text-slate-700 dark:text-slate-200">
              Invoiced R {overallTotals.merchGross.toFixed(2)} ·{' '}
              <span className="text-emerald-600 dark:text-emerald-400">Net R {overallTotals.merchNet.toFixed(2)}</span>
            </span>
          </div>
        )}
      </div>

      {/* Month-by-Month Cycle Cards */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Calendar size={16} className="text-[#1e4da1] dark:text-blue-400" />
              Monthly Cycle History ({filteredHistory.length})
            </h2>
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
              Closed billing cycles and archived financials
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search month or year..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="px-3.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:border-blue-500 dark:text-white"
            />
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200/80 dark:border-slate-800 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-900/20 text-[#1e4da1] dark:text-blue-400 flex items-center justify-center mx-auto shadow-inner">
              <History size={28} />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h3 className="text-base font-black uppercase italic text-slate-800 dark:text-slate-200">
                No Closed Cycles Yet
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                When you reset an active billing cycle (via single gym reset or monthly reset), it will automatically archive the gross revenue, coach payouts, and profit streams here.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredHistory.map((m, mIdx) => {
              const totalGross = Number(m.totalGross ?? m.revenue ?? 0);
              const totalCoachPay = Number(m.totalCoachPayout ?? 0);
              const netProfit = Number(m.netProfit ?? (totalGross - totalCoachPay));
              const tGross = Number(m.tumblingGross ?? 0);
              const tCoach = Number(m.tumblingCoachPay ?? 0);
              const tNet = Number(m.tumblingNet ?? (tGross - tCoach));
              const sGross = Number(m.schoolsGross ?? 0);
              const sCoach = Number(m.schoolsCoachPay ?? 0);
              const gGross = Number(m.gymsGross ?? 0);
              const gNet = Number(m.gymsNet ?? gGross);
              const sessionCount = Number(m.sessionCount ?? (m.sessions?.length || 0));
              const inv = invoiceTotals.byHistoryId.get(m.id);

              const isExpanded = expandedMonthId === m.id;

              return (
                <div
                  key={`hist-card-${m.id || `${m.year}-${m.monthName}`}-${mIdx}`}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden transition-all hover:border-slate-300 dark:hover:border-slate-700"
                >
                  {/* Card Header & Primary Stats */}
                  <div
                    onClick={() => setExpandedMonthId(isExpanded ? null : m.id)}
                    className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-[#1e3a6e] text-white flex flex-col items-center justify-center font-black uppercase shadow-md shrink-0">
                        <span className="text-[9px] tracking-widest text-blue-200">{m.year}</span>
                        <span className="text-xs tracking-tight">{m.monthName?.slice(0, 3)}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-black uppercase text-slate-800 dark:text-white">
                            {m.monthName} {m.year}
                          </h3>
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {sessionCount} Sessions
                          </span>
                        </div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                          Archived on {m.recordedAt ? new Date(m.recordedAt).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Cycle Reset'}
                        </p>
                        {inv?.mismatch && (
                          <p className="text-[9px] font-black uppercase tracking-wider mt-1 text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <ShieldAlert size={11} />
                            Invoice records say R {inv.fromPayments.toFixed(2)} — recalculate
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Financial Pill Highlights */}
                    <div className="flex flex-wrap items-center gap-3 md:gap-6">
                      <div className="text-left md:text-right">
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                          Invoices Totalled
                        </span>
                        <span className="text-sm font-[1000] text-[#1e4da1] dark:text-blue-400">
                          R {(inv?.stored ?? totalGross).toFixed(2)}
                        </span>
                        {!!inv?.invoiceCount && (
                          <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                            {inv.invoiceCount} {inv.invoiceCount === 1 ? 'invoice' : 'invoices'}
                          </span>
                        )}
                      </div>

                      <div className="text-left md:text-right">
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Gross Invoiced</span>
                        <span className="text-sm font-[1000] text-slate-900 dark:text-white">
                          R {totalGross.toFixed(2)}
                        </span>
                      </div>

                      <div className="text-left md:text-right">
                        <span className="text-[9px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 block">Coach Payouts</span>
                        <span className="text-sm font-[1000] text-purple-600 dark:text-purple-400">
                          R {totalCoachPay.toFixed(2)}
                        </span>
                      </div>

                      <div className="text-left md:text-right">
                        <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">Net Profit</span>
                        <span className="text-sm font-[1000] text-emerald-600 dark:text-emerald-400">
                          R {netProfit.toFixed(2)}
                        </span>
                      </div>

                      <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400">
                        {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Multi-Stream Details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 p-5 space-y-4"
                      >
                        {/* 3 Streams Detailed breakdown */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {/* Tumbling Breakdown */}
                          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-black text-[#1e4da1] dark:text-blue-400 uppercase tracking-wider">
                              <span>🤸 Tumbling</span>
                              <span>R {tNet.toFixed(2)} Net</span>
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex justify-between">
                              <span>Athlete Invoiced:</span>
                              <span className="font-bold text-slate-800 dark:text-slate-200">R {tGross.toFixed(2)}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex justify-between">
                              <span>Coach Remuneration:</span>
                              <span className="font-bold text-purple-600 dark:text-purple-400">R {tCoach.toFixed(2)}</span>
                            </div>
                          </div>

                          {/* Schools Breakdown */}
                          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-black text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                              <span>📣 Schools / Cheer</span>
                              <span>Pass-Through</span>
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex justify-between">
                              <span>School Master Total:</span>
                              <span className="font-bold text-slate-800 dark:text-slate-200">R {sGross.toFixed(2)}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex justify-between">
                              <span>Coach Distributed:</span>
                              <span className="font-bold text-purple-600 dark:text-purple-400">R {sCoach.toFixed(2)}</span>
                            </div>
                          </div>

                          {/* External Gyms Breakdown */}
                          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                              <span>🏋️ External Gyms</span>
                              <span>100% Net</span>
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex justify-between">
                              <span>Coaching Fee Invoiced:</span>
                              <span className="font-bold text-slate-800 dark:text-slate-200">R {gGross.toFixed(2)}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex justify-between">
                              <span>Retained Profit:</span>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">R {gNet.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Archived Staff Payslips Section */}
                        {(() => {
                          const monthPayslips = getArchivedMonthPayslips(m);
                          if (monthPayslips.length === 0) return null;
                          return (
                            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <FileText size={16} className="text-[#1e4da1] dark:text-blue-400" />
                                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                    Archived Staff Payslips ({monthPayslips.length})
                                  </h4>
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">
                                  Total: R{monthPayslips.reduce((s, p) => s + Number(p.totalEarnings || 0), 0).toFixed(2)}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                {monthPayslips.map((p, pIdx) => (
                                  <div
                                    key={`month-payslip-${p.id || pIdx}`}
                                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-black uppercase text-slate-800 dark:text-slate-100 truncate">
                                        {p.coach.name}
                                      </p>
                                      <p className="text-[10px] text-slate-400 font-mono truncate">
                                        {p.reference}
                                      </p>
                                      <p className="text-[10px] font-bold text-purple-600 dark:text-purple-400 mt-0.5">
                                        R{Number(p.totalEarnings || 0).toFixed(2)} · {Number(p.totalHours || 0).toFixed(1)} hrs ({p.sessionCount} sessions)
                                      </p>
                                    </div>
                                    <button
                                      onClick={() => setSelectedArchivedPayslip({
                                        monthName: m.monthName,
                                        year: m.year,
                                        reference: p.reference,
                                        coach: p.coach,
                                        allLines: p.allLines,
                                        totalHours: p.totalHours,
                                        totalEarnings: p.totalEarnings,
                                        sessionCount: p.sessionCount
                                      })}
                                      className="shrink-0 px-3 py-1.5 bg-[#1e4da1] hover:bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1 cursor-pointer transition-all"
                                    >
                                      <FileText size={12} /> View Payslip
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Actions for Month */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={() => exportSingleMonthCSV(m)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-wider transition-all"
                            >
                              <Download size={12} />
                              Export Month CSV
                            </button>

                            <button
                              onClick={() => setSelectedMonth(m)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-[#1e4da1] dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-[10px] font-black uppercase tracking-wider transition-all"
                            >
                              <Layers size={12} />
                              View Session Archive ({sessionCount})
                            </button>

                            {onRecalculate && (
                              <button
                                onClick={() => onRecalculate(m.id)}
                                disabled={isRecalculating}
                                title="Reprice this month from the sessions archived in it"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50"
                              >
                                <RefreshCw size={12} className={isRecalculating ? 'animate-spin' : ''} />
                                Recalculate
                              </button>
                            )}
                          </div>

                          <div className="text-[10px] font-mono text-slate-400">
                            {m.recalculatedAt
                              ? `Recalculated ${new Date(m.recalculatedAt).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' })}`
                              : `ID: ${m.id}`}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Drill-down Session Inspector Modal */}
      <AnimatePresence>
        {selectedMonth && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-2.5 sm:p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl max-h-[88vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                      Archived Cycle
                    </span>
                    <h3 className="text-base sm:text-lg font-black uppercase text-slate-800 dark:text-white">
                      {selectedMonth.monthName} {selectedMonth.year}
                    </h3>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                    {selectedMonth.sessions?.length || 0} Archived Sessions · Gross: R {(Number(selectedMonth.totalGross ?? selectedMonth.revenue ?? 0)).toFixed(2)}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedMonth(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Sessions List */}
              <div className="p-3.5 sm:p-6 overflow-y-auto flex-1 space-y-2.5">
                {(!selectedMonth.sessions || selectedMonth.sessions.length === 0) ? (
                  <div className="text-center py-8 text-slate-400 text-xs font-medium">
                    No raw session records preserved in this month's archive snapshot.
                  </div>
                ) : (
                  selectedMonth.sessions.map((sess, idx) => {
                    const gym = (state.gyms || []).find(g => g.id === sess.classTypeId);
                    const classType = (state.classTypes || []).find(c => c.id === sess.classTypeId);
                    const coach = (state.staff || []).find(st => st.id === sess.coach_id);
                    const coachName = coach?.name || sess.covering_coach_name || (sess.coach_id === state.profile.id ? 'Owner' : 'Coach');

                    return (
                      <div
                        key={`hist-modal-sess-${sess.id || 's'}-${idx}`}
                        className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <span>{gym?.name || classType?.name || 'Class Session'}</span>
                            {sess.is_competition && (
                              <span className="px-1.5 py-0.5 text-[8px] font-black uppercase rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                                Competition
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {sess.date} · Coach: <span className="font-bold text-slate-600 dark:text-slate-300">{coachName}</span> · {sess.hours_coached || 1} hr{(sess.hours_coached || 1) !== 1 ? 's' : ''}
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">
                            {sess.studentIds?.length || 0} Athletes
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => exportSingleMonthCSV(selectedMonth)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200"
                >
                  <Download size={14} />
                  Download CSV
                </button>

                <button
                  onClick={() => setSelectedMonth(null)}
                  className="px-5 py-2 rounded-xl bg-[#1e4da1] hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
