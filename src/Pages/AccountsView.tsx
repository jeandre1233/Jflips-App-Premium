import React, { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  ShoppingBag,
  Package,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Download,
  Calendar,
  CreditCard,
  Search,
  ZoomIn,
  ZoomOut,
  UserCircle,
  Loader2,
  RefreshCw,
  Wallet,
  Clock,
  Building2,
  Phone,
  Mail,
  Building,
  Plus,
  X,
  User,
  Users,
  History,
  Check
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { supabase } from '../../supabase';
import {
  AppState,
  Student,
  Gym,
  Payment,
  MerchBillToKind,
  MerchOrderStatus,
  MerchOrder,
  StaffProfile,
  StaffPayslip
} from '../../types';
import {
  priceSessions,
  openMerchOrders,
  merchOrdersForMonth,
  sumLines,
  MONTH_NAMES,
  PricingContext,
  PricedCoachLine
} from '../utils/pricing';
import {
  resolveAllocation,
  resolveBankDetails,
  sanitiseAllocations,
  sanitiseGroupDefaults,
  hasBusinessAccount,
  CLIENT_GROUPS,
  BankAllocation,
  InvoiceAllocations,
  GroupDefaults
} from '../utils/bankAccounts';

const MAX_ROWS_PER_PAGE = 15;

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04
    }
  }
};

const invoiceItemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } }
};

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

interface AccountsViewProps {
  state: AppState;
  user: any;
  monthLabel?: string;
  onUpdatePayment: (p: Partial<Payment>) => void;
  onResetInvoice: (id: string, label: string, mode: 'coaching' | 'merch') => void;
  onShowRecovery: () => void;
  onSaveAllocations?: (next: { allocations?: InvoiceAllocations; groupDefaults?: GroupDefaults }) => Promise<boolean>;
  onAddMerch?: (fixedBillTo?: { id: string; kind: MerchBillToKind; label: string }) => void;
  onDeleteMerchOrder?: (id: string) => void;
  onSetMerchStatus?: (id: string, status: MerchOrderStatus) => void;
}

export const AccountsView: React.FC<AccountsViewProps> = memo(({
  state,
  user,
  monthLabel,
  onUpdatePayment,
  onResetInvoice,
  onShowRecovery,
  onSaveAllocations,
  onAddMerch,
  onDeleteMerchOrder,
  onSetMerchStatus
}) => {
  const isOwner = state.profile.role === 'owner';
  const isCoach = state.profile.role === 'coach';

  // ── Top-level Tab: 1. Invoices | 2. Payslips | 3. Merchandise (far right) ──
  const [activeMainTab, setActiveMainTab] = useState<'invoices' | 'payslips' | 'merchandise'>(
    isCoach ? 'payslips' : 'invoices'
  );

  // ── Sub-tabs under Invoices: 'clients' vs 'teams_clubs' ──
  const [invoicesSubTab, setInvoicesSubTab] = useState<'clients' | 'teams_clubs'>('clients');

  // Selection states
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  // If coach: identify their staff record by auth id or email
  const currentCoachStaff = useMemo(() => {
    if (!isCoach) return null;
    return (state.staff || []).find(st =>
      st.id === user?.id ||
      (st.email && user?.email && st.email.toLowerCase() === user.email.toLowerCase())
    );
  }, [isCoach, state.staff, user]);

  const currentCoachId = isCoach
    ? (currentCoachStaff?.id || user?.id || state.profile.id || null)
    : null;

  const [selectedCoachId, setSelectedCoachId] = useState<string | null>(null);
  const activeCoachId = isCoach ? currentCoachId : selectedCoachId;

  // ── Historical continuity for payslips (My Pay & Owner lookup) ──
  const [selectedHistoryMonthKey, setSelectedHistoryMonthKey] = useState<string>('active');

  const availablePayslipPeriods = useMemo(() => {
    const list = [{ key: 'active', label: 'Current Period (Active)' }];
    (state.history || []).forEach(h => {
      const key = `${h.monthName} ${h.year}`;
      if (!list.some(p => p.key === key)) {
        list.push({ key, label: `${h.monthName} ${h.year}` });
      }
    });
    return list;
  }, [state.history]);

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [scale, setScale] = useState(1);
  const [manualZoom, setManualZoom] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);
  const payslipRef = useRef<HTMLDivElement>(null);

  // Batch download state
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [downloadAllProgress, setDownloadAllProgress] = useState(0);

  // Bank Allocations
  const allocations = useMemo(
    () => sanitiseAllocations(state.profile.invoice_bank_allocations),
    [state.profile.invoice_bank_allocations]
  );
  const groupDefaults = useMemo(
    () => sanitiseGroupDefaults(state.profile.bank_allocation_defaults),
    [state.profile.bank_allocation_defaults]
  );

  // Auto-scale invoice preview for mobile
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
  }, [selectedInvoiceId, activeCoachId, manualZoom]);

  const handleZoomIn = () => setManualZoom(prev => Math.min((prev || scale) + 0.1, 2));
  const handleZoomOut = () => setManualZoom(prev => Math.max((prev || scale) - 0.1, 0.3));
  const handleZoomReset = () => setManualZoom(null);

  // Pricing context
  const pricingContext: PricingContext = useMemo(() => ({
    gyms: state.gyms || [],
    classTypes: state.classTypes || [],
    students: state.students || [],
    staff: state.staff || [],
    profile: { id: state.profile.id, pay_rate: state.profile.pay_rate, name: state.profile.name },
    siblingDiscount: state.profile.sibling_discount,
    merchOrders: monthLabel
      ? merchOrdersForMonth(state.merchOrders, monthLabel)
      : openMerchOrders(state.merchOrders),
    merchClients: state.merchClients || []
  }), [state.gyms, state.classTypes, state.students, state.staff, state.profile, state.merchOrders, state.merchClients, monthLabel]);

  // Master priced data for current active sessions
  const priced = useMemo(
    () => priceSessions(state.sessions || [], pricingContext),
    [state.sessions, pricingContext]
  );

  // Effective coach lines: if viewing a past archived month, price that month's sessions
  const effectiveCoachLines = useMemo(() => {
    if (selectedHistoryMonthKey === 'active') {
      return priced.coachLines;
    }
    const hist = (state.history || []).find(h => `${h.monthName} ${h.year}` === selectedHistoryMonthKey);
    if (!hist || !hist.sessions || hist.sessions.length === 0) {
      return [];
    }
    const histPriced = priceSessions(hist.sessions, pricingContext);
    return histPriced.coachLines;
  }, [selectedHistoryMonthKey, priced.coachLines, state.history, pricingContext]);

  const activeMonthKey = useMemo(() => {
    if (selectedHistoryMonthKey !== 'active') {
      return selectedHistoryMonthKey;
    }
    if (!monthLabel) {
      const now = new Date();
      return `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;
    }
    return monthLabel;
  }, [monthLabel, selectedHistoryMonthKey]);

  // Temporary athlete detection
  const isTempGroup = useCallback((group: any) => {
    if (!group || group.isStaff || group.isGym) return false;
    const ids = group.studentIds || [];
    return (state.students || []).some(s => {
      const isTemp = !!s.is_temporary || (s.id && String(s.id).startsWith('stu_temp_'));
      if (!isTemp) return false;
      if (ids.includes(s.id)) return true;
      if (s.id === group.family_id) return true;
      if (s.groupKey && s.groupKey === group.family_id) return true;
      if (s.name && group.label && s.name.toLowerCase() === group.label.toLowerCase()) return true;
      return false;
    });
  }, [state.students]);

  // ════════════════════════════════════════════════════════════════════════════
  // 1. INVOICE GROUPS (Clients & Clubs/Teams)
  // ════════════════════════════════════════════════════════════════════════════
  const allInvoiceGroups = useMemo(() => {
    const groups: { [key: string]: (Student | Gym)[] } = {};
    const solos: (Student | Gym)[] = [];

    (state.students || []).filter(s => !s.is_gym_member).forEach(s => {
      if (s.groupKey) {
        if (!groups[s.groupKey]) groups[s.groupKey] = [];
        groups[s.groupKey].push(s);
      } else {
        solos.push(s);
      }
    });

    (state.gyms || []).forEach(g => {
      if (g.parent_gym_id) {
        if (!groups[g.parent_gym_id]) groups[g.parent_gym_id] = [];
        groups[g.parent_gym_id].push(g);
      } else if (g.gym_type === 'cheer') {
        if (!groups[g.id]) groups[g.id] = [];
        groups[g.id].push(g);
      } else {
        solos.push(g);
      }
    });

    const res: any[] = Object.entries(groups).filter(([_, list]) => list.length > 0).map(([groupId, list]) => {
      const parentGym = state.gyms.find(g => g.id === groupId);
      let label = list.map(item => item.name).join(' & ');
      if (parentGym) label = parentGym.name;
      return {
        id: `group-${groupId}`,
        label,
        studentIds: list.map(s => s.id),
        family_id: groupId,
        isGym: !!parentGym,
        gymType: parentGym?.gym_type,
        isStaff: false,
        isOrganization: !!parentGym
      };
    });

    (solos || []).forEach(s => {
      if (res.some(r => r.family_id === s.id)) return;
      const isActuallyGym = 'pay_amount' in s || 'gym_type' in s;
      const gymType = isActuallyGym ? (s as Gym).gym_type : undefined;
      res.push({
        id: `solo-${s.id}`,
        label: s.name,
        studentIds: !isActuallyGym ? [s.id] : [],
        family_id: s.id,
        isGym: isActuallyGym,
        gymType,
        isStaff: false,
        isOrganization: isActuallyGym
      });
    });

    // Merchandise external clients
    (state.merchClients || []).forEach(mc => {
      if (!mc?.id) return;
      if (res.some(r => r.family_id === mc.id)) return;
      res.push({
        id: `merchclient-${mc.id}`,
        label: mc.name,
        subLabel: 'Merchandise Client',
        studentIds: [],
        family_id: mc.id,
        isGym: false,
        isStaff: false,
        isOrganization: false,
        isMerchClient: true
      });
    });

    return res;
  }, [state.students, state.gyms, state.merchClients]);

  // Lines for an invoice
  const getInvoiceLines = useCallback((group: any, mode: 'coaching' | 'merch' = 'coaching') => {
    if (!group) return [];
    return priced.clientLines.filter(l =>
      l.billToId === group.family_id &&
      (mode === 'merch' ? l.kind === 'merch' : l.kind !== 'merch') &&
      (!monthLabel || l.billingMonthKey === activeMonthKey)
    );
  }, [priced.clientLines, monthLabel, activeMonthKey]);

  // Filtered lists for Invoices sub-tabs
  const clientInvoices = useMemo(() => {
    return allInvoiceGroups.filter(g => {
      if (g.isStaff || g.isGym || g.isOrganization || g.isMerchClient) return false;
      if (searchQuery.trim()) {
        return g.label.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    });
  }, [allInvoiceGroups, searchQuery]);

  const teamAndClubInvoices = useMemo(() => {
    return allInvoiceGroups.filter(g => {
      if (!g.isGym && !g.isOrganization) return false;
      if (g.isStaff) return false;
      if (searchQuery.trim()) {
        return g.label.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    });
  }, [allInvoiceGroups, searchQuery]);

  // Merchandise invoices list
  const merchInvoices = useMemo(() => {
    return allInvoiceGroups.filter(g => {
      if (g.isStaff) return false;
      const lines = getInvoiceLines(g, 'merch');
      if (lines.length === 0) return false;
      if (searchQuery.trim()) {
        return g.label.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    });
  }, [allInvoiceGroups, getInvoiceLines, searchQuery]);

  // Selected invoice entity
  const selectedGroup = useMemo(() => {
    if (!selectedInvoiceId) return null;
    return allInvoiceGroups.find(g => g.family_id === selectedInvoiceId);
  }, [allInvoiceGroups, selectedInvoiceId]);

  const selectedInvoiceMode: 'coaching' | 'merch' = activeMainTab === 'merchandise' ? 'merch' : 'coaching';

  const selectedInvoiceLines = useMemo(() => {
    if (!selectedGroup) return [];
    const multiAthlete = !!(selectedGroup.studentIds && selectedGroup.studentIds.length > 1);
    return getInvoiceLines(selectedGroup, selectedInvoiceMode).map(l => ({
      id: l.sessionId,
      date: l.date,
      targetStudentName: l.targetName,
      displayPrice: l.amount,
      displayClassName: l.description,
      subLine: (l.coachNames && l.coachNames.length > 0)
        ? `Coaches: ${l.coachNames.join(', ')}`
        : (multiAthlete ? l.targetName : '')
    }));
  }, [selectedGroup, getInvoiceLines, selectedInvoiceMode]);

  const selectedInvoiceTotal = useMemo(
    () => sumLines(selectedInvoiceLines.map(s => ({ amount: s.displayPrice }))),
    [selectedInvoiceLines]
  );

  // Bank allocation resolution
  const resolvedAllocation = useMemo(
    () => resolveAllocation(selectedGroup?.family_id, state.gyms || [], allocations, groupDefaults),
    [selectedGroup, state.gyms, allocations, groupDefaults]
  );
  const bankAllocation = resolvedAllocation.allocation;

  const handleToggleBankAllocation = (type: BankAllocation) => {
    if (!selectedGroup || !onSaveAllocations) return;
    onSaveAllocations({ allocations: { ...allocations, [selectedGroup.family_id]: type } });
  };

  const handleFollowGroupDefault = () => {
    if (!selectedGroup || !onSaveAllocations) return;
    const next = { ...allocations };
    delete next[selectedGroup.family_id];
    onSaveAllocations({ allocations: next });
  };

  // ════════════════════════════════════════════════════════════════════════════
  // 2. UNIFIED COACH PAYSLIPS ARCHITECTURE
  // ════════════════════════════════════════════════════════════════════════════

  // All coaches roster: combine state.staff + anyone in priced.coachLines
  const coachesRoster = useMemo(() => {
    const list: any[] = [];
    const seen = new Set<string>();

    (state.staff || []).forEach(st => {
      if (!st.id || seen.has(st.id)) return;
      if (isOwner && st.id === state.profile.id) return;
      seen.add(st.id);
      list.push({
        id: st.id,
        name: st.name || st.username || 'Staff Coach',
        email: st.email || '',
        phone: st.phone || '',
        payRate: st.payRate ?? st.pay_rate ?? 0,
        bankName: st.bankName || st.bank_name || '',
        accountNumber: st.accountNumber || st.account_number || '',
        branchCode: st.branchCode || st.branch_code || '',
        accountType: st.accountType || st.account_type || 'Current'
      });
    });

    effectiveCoachLines.forEach(l => {
      if (l.coachId && !seen.has(l.coachId)) {
        if (isOwner && l.coachId === state.profile.id) return;
        seen.add(l.coachId);
        list.push({
          id: l.coachId,
          name: l.targetName || 'Coach',
          email: '',
          phone: '',
          payRate: l.rate || 0,
          bankName: '',
          accountNumber: '',
          branchCode: '',
          accountType: 'Current'
        });
      }
    });

    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [state.staff, effectiveCoachLines]);

  // Aggregate payslip data for every coach across ALL streams
  const coachesPayslipData = useMemo(() => {
    const dataMap = new Map<string, {
      coach: any;
      allLines: PricedCoachLine[];
      totalHours: number;
      totalEarnings: number;
      sessionCount: number;
    }>();

    coachesRoster.forEach(coach => {
      const coachLines = effectiveCoachLines.filter(l =>
        l.coachId === coach.id &&
        (!monthLabel || l.billingMonthKey === activeMonthKey)
      );

      const totalHours = coachLines.reduce((acc, curr) => acc + (Number(curr.hours) || 0), 0);
      const totalEarnings = coachLines.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
      const sessionCount = new Set(coachLines.map(l => l.groupId)).size;

      dataMap.set(coach.id, {
        coach,
        allLines: coachLines,
        totalHours: Math.round(totalHours * 10) / 10,
        totalEarnings: Math.round(totalEarnings * 100) / 100,
        sessionCount
      });
    });

    return dataMap;
  }, [coachesRoster, effectiveCoachLines, monthLabel, activeMonthKey]);

  // Active selected coach payslip
  const selectedCoachPayslip = useMemo(() => {
    if (!activeCoachId) return null;
    return coachesPayslipData.get(activeCoachId) || null;
  }, [coachesPayslipData, activeCoachId]);

  // ════════════════════════════════════════════════════════════════════════════
  // 3. EXPORT HANDLERS (PDF, PNG)
  // ════════════════════════════════════════════════════════════════════════════

  // Capture Invoice to PNG
  const handleDownloadInvoiceImage = async () => {
    if (!selectedGroup || !invoiceRef.current) return;
    setIsGenerating(true);
    const wasDark = document.documentElement.classList.contains('dark');
    if (wasDark) document.documentElement.classList.remove('dark');

    try {
      await new Promise(r => setTimeout(r, 600));
      const dataUrl = await toPng(invoiceRef.current, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        cacheBust: true,
        style: { borderRadius: '1rem' }
      });
      const fileName = `${selectedInvoiceMode === 'merch' ? 'Merch_Invoice' : 'Invoice'}_${selectedGroup.label.replace(/\s+/g, '_')}.png`;
      await saveAndShareFile(dataUrl, fileName);
    } catch (e) {
      console.error('Invoice capture failed:', e);
    } finally {
      if (wasDark) document.documentElement.classList.add('dark');
      setIsGenerating(false);
    }
  };

  // Capture Invoice to PDF
  const handleDownloadInvoicePdf = async () => {
    if (!selectedGroup || !invoiceRef.current) return;
    setIsGenerating(true);

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
    if (wasDark) document.documentElement.classList.remove('dark');

    try {
      await new Promise(r => setTimeout(r, 600));
      const dataUrl = await toPng(invoiceRef.current, {
        backgroundColor: '#ffffff',
        pixelRatio: 3,
        cacheBust: true
      });

      const { jsPDF } = (window as any).jspdf;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfW = 210;
      const margin = 10;
      const contentW = pdfW - (margin * 2);
      const imgProps = doc.getImageProperties(dataUrl);
      const pdfH = (imgProps.height * contentW) / imgProps.width;

      doc.addImage(dataUrl, 'PNG', margin, margin, contentW, pdfH);
      const fileName = `${selectedInvoiceMode === 'merch' ? 'Merch_Invoice' : 'Invoice'}_${selectedGroup.label.replace(/\s+/g, '_')}.pdf`;
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
      if (wasDark) document.documentElement.classList.add('dark');
      setIsGenerating(false);
    }
  };

  // Capture Payslip to PNG
  const handleDownloadPayslipImage = async () => {
    if (!selectedCoachPayslip || !payslipRef.current) return;
    setIsGenerating(true);
    const wasDark = document.documentElement.classList.contains('dark');
    if (wasDark) document.documentElement.classList.remove('dark');

    try {
      await new Promise(r => setTimeout(r, 600));
      const dataUrl = await toPng(payslipRef.current, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        cacheBust: true,
        style: { borderRadius: '1rem' }
      });
      const fileName = `Payslip_${selectedCoachPayslip.coach.name.replace(/\s+/g, '_')}_${activeMonthKey.replace(/\s+/g, '_')}.png`;
      await saveAndShareFile(dataUrl, fileName);
    } catch (e) {
      console.error('Payslip capture failed:', e);
    } finally {
      if (wasDark) document.documentElement.classList.add('dark');
      setIsGenerating(false);
    }
  };

  // Capture Payslip to PDF
  const handleDownloadPayslipPdf = async () => {
    if (!selectedCoachPayslip || !payslipRef.current) return;
    setIsGenerating(true);

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
    if (wasDark) document.documentElement.classList.remove('dark');

    try {
      await new Promise(r => setTimeout(r, 600));
      const dataUrl = await toPng(payslipRef.current, {
        backgroundColor: '#ffffff',
        pixelRatio: 3,
        cacheBust: true
      });

      const { jsPDF } = (window as any).jspdf;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfW = 210;
      const margin = 10;
      const contentW = pdfW - (margin * 2);
      const imgProps = doc.getImageProperties(dataUrl);
      const pdfH = (imgProps.height * contentW) / imgProps.width;

      doc.addImage(dataUrl, 'PNG', margin, margin, contentW, pdfH);
      const fileName = `Payslip_${selectedCoachPayslip.coach.name.replace(/\s+/g, '_')}_${activeMonthKey.replace(/\s+/g, '_')}.pdf`;
      if (Capacitor.isNativePlatform()) {
        const pdfBase64 = doc.output('datauristring');
        await saveAndShareFile(pdfBase64, fileName);
      } else {
        doc.save(fileName);
      }
    } catch (e) {
      console.error('Payslip PDF failed:', e);
      alert('Failed to generate PDF');
    } finally {
      if (wasDark) document.documentElement.classList.add('dark');
      setIsGenerating(false);
    }
  };

  // Batch download for current invoice sub-tab
  const handleBatchDownloadInvoices = async () => {
    const listToDownload = invoicesSubTab === 'clients' ? clientInvoices : teamAndClubInvoices;
    if (!listToDownload || listToDownload.length === 0) return;
    setIsDownloadingAll(true);
    setDownloadAllProgress(0);

    const wasDark = document.documentElement.classList.contains('dark');
    if (wasDark) document.documentElement.classList.remove('dark');

    const dataUrls: { name: string; url: string }[] = [];

    for (let i = 0; i < listToDownload.length; i++) {
      const grp = listToDownload[i];
      setDownloadAllProgress(Math.round((i / listToDownload.length) * 100));

      try {
        setSelectedInvoiceId(grp.family_id);
        await new Promise(r => setTimeout(r, 900));

        if (!invoiceRef.current) continue;
        const dataUrl = await toPng(invoiceRef.current, {
          backgroundColor: '#ffffff',
          pixelRatio: 2,
          cacheBust: true
        });
        dataUrls.push({
          name: `Invoice_${grp.label.replace(/\s+/g, '_')}.png`,
          url: dataUrl
        });
      } catch (e) {
        console.error(`Failed to capture invoice for ${grp.label}`, e);
      }
    }

    setSelectedInvoiceId(null);
    setDownloadAllProgress(100);
    if (wasDark) document.documentElement.classList.add('dark');

    for (const { name, url } of dataUrls) {
      await new Promise<void>(resolve => {
        const link = document.createElement('a');
        link.download = name;
        link.href = url;
        link.click();
        setTimeout(resolve, 400);
      });
    }

    setIsDownloadingAll(false);
    setDownloadAllProgress(0);
  };

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER: 1. FULL INVOICE VIEWER (When an invoice is selected)
  // ════════════════════════════════════════════════════════════════════════════
  if (selectedInvoiceId && selectedGroup) {
    const gymEntity = state.gyms.find(g => g.id === selectedGroup.family_id);

    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 mt-4 pb-32 w-full px-2">
        {/* Top bar controls */}
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setSelectedInvoiceId(null)}
              className="text-slate-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 hover:text-[#1e4da1]"
            >
              <ChevronLeft size={14} /> Back to Accounts
            </button>
            {isTempGroup(selectedGroup) && (
              <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300/90 dark:border-amber-800 tracking-wider shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Temp Athlete
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {!monthLabel && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => onResetInvoice(selectedGroup.family_id, selectedGroup.label, selectedInvoiceMode)}
                className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800 px-3 py-2 rounded-xl font-black text-[9px] uppercase shadow-md flex items-center gap-1.5"
              >
                <RefreshCw size={12} /> Reset
              </motion.button>
            )}
            {!monthLabel && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onShowRecovery}
                className="bg-blue-50 dark:bg-blue-900/20 text-[#1e4da1] dark:text-blue-400 border border-blue-100 dark:border-blue-800 px-3 py-2 rounded-xl font-black text-[9px] uppercase shadow-md flex items-center gap-1.5"
              >
                <History size={12} /> Recover
              </motion.button>
            )}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleDownloadInvoicePdf}
              disabled={isGenerating}
              title="Download PDF"
              className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-3 py-2 rounded-xl font-black text-[9px] uppercase shadow-lg flex items-center gap-1.5 disabled:opacity-70 transition-all"
            >
              {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
              <span>PDF</span>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleDownloadInvoiceImage}
              disabled={isGenerating}
              title="Download PNG"
              className="bg-[#1e4da1] text-white px-3 py-2 rounded-xl font-black text-[9px] uppercase shadow-lg flex items-center gap-1.5 disabled:opacity-70 transition-all"
            >
              {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
              <span>PNG</span>
            </motion.button>
          </div>
        </div>

        {/* Bank allocation toggle */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase italic tracking-wider">
              Payout Bank Account
            </h3>
            <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase leading-relaxed tracking-wider">
              Choose which account prints on this client's invoice PDF/PNG.
            </p>
            {resolvedAllocation.source === 'group' && (
              <p className="text-[9px] font-black text-[#1e4da1] dark:text-blue-400 uppercase tracking-wider">
                Following {CLIENT_GROUPS.find(g => g.key === resolvedAllocation.group)?.label} default
              </p>
            )}
            {resolvedAllocation.source === 'invoice' && (
              <button
                onClick={handleFollowGroupDefault}
                className="text-[9px] font-black text-slate-400 hover:text-[#1e4da1] dark:hover:text-blue-400 uppercase tracking-wider underline decoration-dotted"
              >
                Reset to group default
              </button>
            )}
          </div>
          <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl gap-1">
            <button
              onClick={() => handleToggleBankAllocation('personal')}
              className={`px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${
                bankAllocation === 'personal' ? 'bg-[#1e4da1] text-white shadow-md' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Personal
            </button>
            <button
              onClick={() => handleToggleBankAllocation('business')}
              className={`px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${
                bankAllocation === 'business' ? 'bg-[#1e4da1] text-white shadow-md' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Business
            </button>
          </div>
        </div>

        {/* Invoice preview container */}
        <div ref={containerRef} className="w-full overflow-x-auto no-scrollbar py-4 -mx-2 px-2 relative">
          {/* Zoom controls */}
          <div className="sticky left-4 bottom-6 z-40 flex items-center gap-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 w-fit mb-4">
            <motion.button whileTap={{ scale: 0.9 }} onClick={handleZoomOut} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400">
              <ZoomOut size={16} />
            </motion.button>
            <span className="text-xs font-black tabular-nums text-slate-700 dark:text-slate-200 w-12 text-center">
              {Math.round(scale * 100)}%
            </span>
            <motion.button whileTap={{ scale: 0.9 }} onClick={handleZoomIn} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400">
              <ZoomIn size={16} />
            </motion.button>
            <div className="w-px h-5 bg-slate-200 dark:bg-slate-700" />
            <motion.button whileTap={{ scale: 0.9 }} onClick={handleZoomReset} className="px-2.5 py-1.5 text-[9px] font-black uppercase text-white bg-[#1e4da1] rounded-lg shadow-sm">
              Reset
            </motion.button>
          </div>

          {/* ════ THE INVOICE DOCUMENT ════ */}
          <div
            style={{
              width: 794,
              zoom: scale,
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"
            }}
            className="bg-white dark:bg-[#0f172a] shadow-2xl mx-auto origin-top"
          >
            <div ref={invoiceRef}>
              {(() => {
                const chunks: (typeof selectedInvoiceLines)[] = [];
                for (let i = 0; i < selectedInvoiceLines.length; i += MAX_ROWS_PER_PAGE) {
                  chunks.push(selectedInvoiceLines.slice(i, i + MAX_ROWS_PER_PAGE));
                }
                if (chunks.length === 0) chunks.push([]);

                return chunks.map((chunk, pageIdx) => {
                  const isFirstPage = pageIdx === 0;
                  const isLastPage = pageIdx === chunks.length - 1;

                  return (
                    <div
                      key={pageIdx}
                      style={{ width: 794, minHeight: isLastPage ? undefined : 1123, padding: '48px 56px' }}
                      className="relative bg-white dark:bg-[#0f172a]"
                    >
                      {/* Top blue bar */}
                      <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#1e4da1]" />

                      {/* Header (First page) */}
                      {isFirstPage && (
                        <>
                          <div className="flex justify-between items-start mb-8">
                            <div>
                              {/* Prominent /Invoice.png Logo Header */}
                              <img
                                src="/Invoice.png"
                                alt="JFLIPS"
                                className="h-16 md:h-20 object-contain rounded-xl mb-3"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                              <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">
                                {selectedInvoiceMode === 'merch' ? 'Merchandise Invoice' : 'Tax Invoice / Account'}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Billing Period</p>
                              <p className="text-lg font-black text-slate-900 dark:text-slate-100">{activeMonthKey}</p>
                              <p className="text-[11px] text-slate-400 mt-1 font-bold">
                                Generated {new Date().toLocaleDateString('en-GB')}
                              </p>
                            </div>
                          </div>

                          <div className="w-full h-px bg-slate-200 dark:bg-slate-700 mb-6" />

                          {/* Bill To */}
                          <div className="mb-8">
                            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#1e4da1] mb-2">Billed To</p>
                            <p className="text-xl font-black uppercase italic text-slate-900 dark:text-slate-100">
                              {selectedGroup.label}
                            </p>
                            {selectedGroup.isGym && gymEntity?.bill_to_address && (
                              <p className="text-[11px] text-slate-500 mt-1 whitespace-pre-wrap leading-relaxed">
                                {gymEntity.bill_to_address}
                              </p>
                            )}
                            {selectedGroup.isGym && gymEntity?.bill_to_phone && (
                              <p className="text-[11px] text-slate-500 mt-1">
                                {gymEntity.bill_to_phone}
                              </p>
                            )}
                          </div>
                        </>
                      )}

                      {!isFirstPage && (
                        <div className="flex justify-between items-center mb-6">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">
                            JFLIPS — {selectedGroup.label}
                          </p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            {activeMonthKey} · Page {pageIdx + 1}
                          </p>
                        </div>
                      )}

                      {/* Line items table */}
                      <div
                        style={{ display: 'grid', gridTemplateColumns: '100px 1fr 100px', gap: '12px' }}
                        className="mb-2 px-2"
                      >
                        <span className="text-[12px] font-black text-slate-400 uppercase tracking-widest">Date</span>
                        <span className="text-[12px] font-black text-slate-400 uppercase tracking-widest">Description</span>
                        <span className="text-[12px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</span>
                      </div>
                      <div className="w-full h-[2px] bg-slate-900 dark:bg-slate-500 mb-2" />

                      {chunk.length > 0 ? (
                        chunk.map((s, idx) => {
                          const globalIdx = pageIdx * MAX_ROWS_PER_PAGE + idx;
                          const isEven = globalIdx % 2 === 0;
                          return (
                            <div
                              key={idx}
                              style={{ display: 'grid', gridTemplateColumns: '100px 1fr 100px', gap: '12px' }}
                              className={`items-start px-2 py-3 ${isEven ? 'bg-slate-50 dark:bg-slate-800/40' : 'bg-white dark:bg-transparent'} rounded`}
                            >
                              <span className="text-[12px] font-bold text-slate-400 pt-0.5 tabular-nums">
                                {new Date(s.date).toLocaleDateString('en-GB')}
                              </span>
                              <div>
                                <p className="text-[13px] font-black text-slate-900 dark:text-slate-100 uppercase italic leading-tight">
                                  {s.displayClassName}
                                </p>
                                {s.subLine && (
                                  <p className="text-[11px] text-slate-400 font-bold mt-0.5 normal-case not-italic">{s.subLine}</p>
                                )}
                              </div>
                              <span className="text-[13px] font-black text-slate-900 dark:text-slate-100 text-right tabular-nums">
                                R{Number(s.displayPrice || 0).toFixed(2)}
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <div className="py-8 text-center">
                          <p className="text-[10px] text-slate-400 font-black uppercase">No billed line items</p>
                        </div>
                      )}

                      {/* Footer (Last page) */}
                      {isLastPage && (
                        <>
                          <div className="w-full h-px bg-slate-200 dark:bg-slate-700 mt-4 mb-6" />

                          <div className="flex justify-between items-end">
                            {/* Banking details */}
                            <div className="space-y-1">
                              <p className="text-[11px] font-black uppercase tracking-[0.25em] text-[#1e4da1] mb-2">
                                Banking Details (EFT)
                              </p>
                              {(() => {
                                const { bankName, accountNumber, branchCode, accountType } =
                                  resolveBankDetails(state.profile, bankAllocation, null);

                                return [
                                  ['Bank', bankName],
                                  ['Account', accountNumber],
                                  ['Branch', branchCode],
                                  ['Type', accountType],
                                ].map(([label, value], idx) => value ? (
                                  <div key={`inv-bank-${label}-${idx}`} className="flex gap-4">
                                    <span className="text-[11px] font-black uppercase text-slate-400 w-16">{label}</span>
                                    <span className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-300">{value}</span>
                                  </div>
                                ) : null);
                              })()}
                            </div>

                            {/* Total amount */}
                            <div className="text-right">
                              <p className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Total Due</p>
                              <p className="text-5xl font-black italic text-[#1e4da1] dark:text-blue-400 leading-none tabular-nums">
                                R{selectedInvoiceTotal.toFixed(2)}
                              </p>
                            </div>
                          </div>

                          <div className="w-full h-px bg-slate-100 dark:bg-slate-800 mt-8 mb-3" />
                          <p className="text-[9px] text-slate-300 dark:text-slate-600 font-bold uppercase text-center tracking-widest">
                            Generated by JFLIPS Gymnastics
                          </p>
                        </>
                      )}

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

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER: 2. UNIFIED COACH PAYSLIP VIEWER (When a coach payslip is open)
  // ════════════════════════════════════════════════════════════════════════════
  if (selectedCoachPayslip && (activeCoachId || isCoach)) {
    const { coach, allLines, totalHours, totalEarnings, sessionCount } = selectedCoachPayslip;

    // Permanent formatted reference ID for the payslip
    const payslipReference = `PAY-${(monthLabel || (selectedHistoryMonthKey === 'active' ? new Date().toISOString().slice(0, 7) : selectedHistoryMonthKey)).replace(/\s+/g, '-')}-${coach.id.slice(0, 6).toUpperCase()}`;

    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 mt-4 pb-32 w-full px-2">
        {/* Top bar controls */}
        <div className="flex flex-wrap justify-between items-center gap-3 mb-2">
          <div className="flex items-center gap-2.5">
            {isOwner && (
              <button
                onClick={() => setSelectedCoachId(null)}
                className="text-slate-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 hover:text-[#1e4da1]"
              >
                <ChevronLeft size={14} /> Back to Staff Roster
              </button>
            )}
            {/* Historical period selector for coach/owner continuity */}
            <div className="flex items-center gap-1.5">
              <Calendar size={13} className="text-slate-400" />
              <select
                value={selectedHistoryMonthKey}
                onChange={e => setSelectedHistoryMonthKey(e.target.value)}
                className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-black uppercase outline-none focus:ring-2 focus:ring-[#1e4da1]"
              >
                {availablePayslipPeriods.map(p => (
                  <option key={`p-opt-${p.key}`} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleDownloadPayslipPdf}
              disabled={isGenerating}
              className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-3.5 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider shadow-lg flex items-center gap-1.5 disabled:opacity-70 transition-all"
            >
              {isGenerating ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
              <span>Download PDF</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleDownloadPayslipImage}
              disabled={isGenerating}
              className="bg-[#1e4da1] text-white px-3.5 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider shadow-lg flex items-center gap-1.5 disabled:opacity-70 transition-all"
            >
              {isGenerating ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              <span>Download PNG</span>
            </motion.button>
          </div>
        </div>

        {/* Payslip Document Preview */}
        <div ref={containerRef} className="w-full overflow-x-auto no-scrollbar py-4 -mx-2 px-2 relative">
          {/* Zoom controls */}
          <div className="sticky left-4 bottom-6 z-40 flex items-center gap-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 w-fit mb-4">
            <motion.button whileTap={{ scale: 0.9 }} onClick={handleZoomOut} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400">
              <ZoomOut size={16} />
            </motion.button>
            <span className="text-xs font-black tabular-nums text-slate-700 dark:text-slate-200 w-12 text-center">
              {Math.round(scale * 100)}%
            </span>
            <motion.button whileTap={{ scale: 0.9 }} onClick={handleZoomIn} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400">
              <ZoomIn size={16} />
            </motion.button>
            <div className="w-px h-5 bg-slate-200 dark:bg-slate-700" />
            <motion.button whileTap={{ scale: 0.9 }} onClick={handleZoomReset} className="px-2.5 py-1.5 text-[9px] font-black uppercase text-white bg-[#1e4da1] rounded-lg shadow-sm">
              Reset
            </motion.button>
          </div>

          {/* ════ THE CLEAN PAYSLIP DOCUMENT ════ */}
          <div
            style={{
              width: 794,
              zoom: scale,
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"
            }}
            className="bg-white dark:bg-[#0f172a] shadow-2xl mx-auto origin-top"
          >
            <div ref={payslipRef}>
              <div
                style={{ width: 794, padding: '48px 56px' }}
                className="relative bg-white dark:bg-[#0f172a]"
              >
                {/* Top blue bar */}
                <div className="absolute top-0 left-0 right-0 h-2 bg-[#1e4da1]" />

                {/* ════ HEADER ════ */}
                <div className="flex justify-between items-start mb-6">
                  <div>
                    {/* Prominent /Invoice.png Logo Header */}
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
                    <p className="text-xl font-black text-slate-900 dark:text-slate-100">{activeMonthKey}</p>
                    <p className="text-[11px] text-slate-400 mt-1 font-bold">
                      Date Issued: {new Date().toLocaleDateString('en-GB')}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      REF: {payslipReference}
                    </p>
                  </div>
                </div>

                <div className="w-full h-px bg-slate-200 dark:bg-slate-700 mb-6" />

                {/* ════ RECIPIENT & EMPLOYER ════ */}
                <div className="grid grid-cols-2 gap-8 mb-8">
                  {/* Employer */}
                  <div className="space-y-1">
                    <p className="text-[11px] font-black uppercase tracking-[0.25em] text-[#1e4da1]">
                      Employer
                    </p>
                    <p className="text-base font-black uppercase italic text-slate-900 dark:text-slate-100">
                      {state.profile.businessName || 'JFLIPS'}
                    </p>
                    {state.profile.email && <p className="text-[11px] text-slate-500">{state.profile.email}</p>}
                  </div>

                  {/* Coach */}
                  <div className="space-y-1">
                    <p className="text-[11px] font-black uppercase tracking-[0.25em] text-[#1e4da1]">
                      Coach
                    </p>
                    <p className="text-lg font-black uppercase italic text-slate-900 dark:text-slate-100">
                      {coach.name}
                    </p>
                    {coach.email && <p className="text-[11px] text-slate-500">{coach.email}</p>}
                    {coach.phone && <p className="text-[11px] text-slate-500">{coach.phone}</p>}
                  </div>
                </div>

                {/* ════ BANKING DETAILS ════ */}
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
                        {coach.bankName || 'Not Provided'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase">Account Number</p>
                      <p className="text-[12px] font-black font-mono text-slate-800 dark:text-slate-200">
                        {coach.accountNumber || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase">Branch Code</p>
                      <p className="text-[12px] font-black font-mono text-slate-800 dark:text-slate-200">
                        {coach.branchCode || 'Default'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase">Account Type</p>
                      <p className="text-[12px] font-black uppercase text-slate-800 dark:text-slate-200">
                        {coach.accountType || 'Current'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* ════ 5-COLUMN PAYSLIP BREAKDOWN TABLE ════ */}
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
                    {allLines.length > 0 ? (
                      allLines.map((line, idx) => {
                        const isEven = idx % 2 === 0;
                        const org = line.orgId ? state.gyms.find(g => g.id === line.orgId) : null;
                        const subText = org ? `${org.name}` : 'Tumbling Class';

                        return (
                          <div
                            key={`coach-line-${idx}`}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '95px 1fr 100px 95px 110px',
                              gap: '10px'
                            }}
                            className={`items-center px-3 py-2.5 ${
                              isEven ? 'bg-white dark:bg-slate-900/40' : 'bg-slate-50/70 dark:bg-slate-800/20'
                            }`}
                          >
                            {/* 1. Date */}
                            <span className="text-[11px] font-bold text-slate-500 tabular-nums">
                              {new Date(line.date).toLocaleDateString('en-GB')}
                            </span>

                            {/* 2. Session or Class */}
                            <div className="min-w-0 pr-2">
                              <p className="text-[12px] font-black text-slate-900 dark:text-slate-100 uppercase italic truncate">
                                {line.description}
                              </p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">
                                {subText}
                                {line.splitCount > 1 ? ` · Split (${line.splitCount} coaches)` : ''}
                              </p>
                            </div>

                            {/* 3. Hourly Rate */}
                            <span className="text-[12px] font-bold text-slate-600 dark:text-slate-300 text-right tabular-nums">
                              R{Number(line.rate || 0).toFixed(2)}/hr
                            </span>

                            {/* 4. Hours Coached */}
                            <span className="text-[12px] font-black text-slate-800 dark:text-slate-200 text-right tabular-nums">
                              {Number(line.hours || 0).toFixed(1)} hrs
                            </span>

                            {/* 5. Total Earnings */}
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

                {/* ════ SUMMARY CARD & FOOTER ════ */}
                <div className="mt-8 pt-4 border-t-2 border-slate-200 dark:border-slate-700">
                  <div className="flex justify-between items-end">
                    {/* Activity summary */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-6">
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Total Sessions</p>
                          <p className="text-xl font-black text-slate-800 dark:text-slate-200">{sessionCount}</p>
                        </div>
                        <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Total Hours Coached</p>
                          <p className="text-xl font-black text-slate-800 dark:text-slate-200">{totalHours} hrs</p>
                        </div>
                      </div>
                    </div>

                    {/* Total Earnings Due */}
                    <div className="text-right">
                      <p className="text-[12px] font-black uppercase tracking-[0.2em] text-[#1e4da1] dark:text-blue-400 mb-1">
                        Total Remuneration Due
                      </p>
                      <p className="text-5xl font-black italic text-[#1e4da1] dark:text-blue-400 leading-none tabular-nums">
                        R{totalEarnings.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="w-full h-px bg-slate-100 dark:bg-slate-800 mt-8 mb-3" />
                  <p className="text-[9px] text-slate-300 dark:text-slate-600 font-bold uppercase text-center tracking-widest">
                    Official Remuneration Advice · Generated by JFLIPS Gymnastics
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER: 3. MAIN ACCOUNTS HUB (TABS: Invoices | Payslips | Merchandise)
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6 mt-4 px-2 pb-24">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 uppercase italic tracking-tight">
            {isCoach ? 'My Pay & Remuneration' : 'Accounts & Billing Hub'}
          </h2>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-0.5">
            {isCoach ? 'Your coaching payslip and session records' : 'Client Invoices, Staff Payslips, and Merchandise Billing'}
          </p>
        </div>

        {/* Global actions: Batch download or New Merch Sale */}
        <div className="flex items-center gap-2">
          {activeMainTab === 'merchandise' && onAddMerch && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => onAddMerch()}
              className="flex items-center gap-1.5 bg-[#1e4da1] text-white px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all"
            >
              <Plus size={14} strokeWidth={3} />
              <span>New Sale</span>
            </motion.button>
          )}

          {activeMainTab === 'invoices' && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleBatchDownloadInvoices}
              disabled={isDownloadingAll}
              className="flex items-center gap-1.5 bg-[#1e4da1] text-white px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg disabled:opacity-70 transition-all"
            >
              {isDownloadingAll ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>{downloadAllProgress}%</span>
                </>
              ) : (
                <>
                  <Download size={13} />
                  <span>Download All</span>
                </>
              )}
            </motion.button>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          3 PRIMARY TABS:
          1. Invoices | 2. Payslips | 3. Merchandise (far right)
      ════════════════════════════════════════════════════════════════════════ */}
      {isOwner && (
        <div className="flex bg-slate-100/80 dark:bg-slate-800/50 p-1.5 rounded-2xl relative border border-slate-200/50 dark:border-slate-700/50">
          {[
            { key: 'invoices' as const, label: 'Invoices', icon: <FileText size={15} /> },
            { key: 'payslips' as const, label: 'Payslips', icon: <Wallet size={15} /> },
            { key: 'merchandise' as const, label: 'Merchandise', icon: <ShoppingBag size={15} /> }
          ].map(tab => {
            const isActive = activeMainTab === tab.key;
            return (
              <button
                key={`main-tab-${tab.key}`}
                onClick={() => {
                  setActiveMainTab(tab.key);
                  setSelectedInvoiceId(null);
                  setSelectedCoachId(null);
                  setSearchQuery('');
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all duration-200 relative z-10 ${
                  isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="mainTabIndicator"
                    className="absolute inset-0 bg-[#1e4da1] dark:bg-blue-600 rounded-xl shadow-md -z-10"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          TAB 1: INVOICES (With Clients vs Clubs & Teams Sub-Tabs)
      ════════════════════════════════════════════════════════════════════════ */}
      {activeMainTab === 'invoices' && (
        <div className="space-y-4">
          {/* Sub-tabs: Clients vs Clubs & Teams */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
              <button
                onClick={() => setInvoicesSubTab('clients')}
                className={`px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                  invoicesSubTab === 'clients'
                    ? 'bg-white dark:bg-slate-700 text-[#1e4da1] dark:text-blue-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
              >
                <Users size={13} />
                <span>Clients ({clientInvoices.length})</span>
              </button>
              <button
                onClick={() => setInvoicesSubTab('teams_clubs')}
                className={`px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                  invoicesSubTab === 'teams_clubs'
                    ? 'bg-white dark:bg-slate-700 text-[#1e4da1] dark:text-blue-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
              >
                <Building2 size={13} />
                <span>Clubs & Teams ({teamAndClubInvoices.length})</span>
              </button>
            </div>

            {/* Quick search input */}
            <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={invoicesSubTab === 'clients' ? 'Search athlete or family...' : 'Search club or cheer team...'}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-[#1e4da1] dark:text-white"
              />
            </div>
          </div>

          {/* Invoices List */}
          {(() => {
            const listToRender = invoicesSubTab === 'clients' ? clientInvoices : teamAndClubInvoices;

            if (listToRender.length === 0) {
              return (
                <div className="bg-white dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-10 text-center shadow-sm">
                  <UserCircle className="mx-auto text-slate-200 dark:text-slate-600 mb-3" size={44} />
                  <p className="text-slate-400 text-[11px] font-black uppercase">
                    {invoicesSubTab === 'clients' ? 'No Client Invoices Found' : 'No Clubs or Teams Found'}
                  </p>
                  <p className="text-[9px] font-bold text-slate-400 mt-1">
                    {searchQuery ? 'Try clearing your search query' : 'Sessions logged will populate here automatically'}
                  </p>
                </div>
              );
            }

            return (
              <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-2.5">
                {listToRender.map((group, idx) => {
                  const lines = getInvoiceLines(group, 'coaching');
                  const count = new Set(lines.map(l => l.groupId)).size;
                  const groupTotal = sumLines(lines);

                  return (
                    <motion.div
                      key={`invoice-group-${group.family_id}-${idx}`}
                      variants={invoiceItemVariants}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedInvoiceId(group.family_id)}
                      className="w-full p-4 bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-between shadow-sm group cursor-pointer hover:border-blue-200 dark:hover:border-blue-900/60 transition-all"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-white shrink-0 ${
                          group.isGym
                            ? 'bg-blue-600'
                            : (group.studentIds && group.studentIds.length > 1)
                              ? 'bg-[#1e4da1]'
                              : 'bg-slate-500'
                        }`}>
                          {group.isGym ? (
                            <Building2 size={17} />
                          ) : (group.studentIds && group.studentIds.length > 1) ? (
                            <Users size={17} />
                          ) : (
                            <User size={17} />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-black text-slate-800 dark:text-slate-100 text-[15px] uppercase italic group-hover:text-[#1e4da1] transition-colors truncate">
                              {group.label}
                            </p>
                            {group.gymType && (
                              <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50">
                                {group.gymType === 'cheer' ? 'Cheer Team' : 'Gym Club'}
                              </span>
                            )}
                            {isTempGroup(group) && (
                              <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300/90 tracking-wider shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                Temp
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] text-slate-400 font-bold uppercase">
                              {count} session{count === 1 ? '' : 's'}
                            </span>
                            <span className="text-slate-300 dark:text-slate-700">·</span>
                            <span className="text-[9px] text-slate-400 font-bold uppercase">
                              {activeMonthKey}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 ml-2">
                        <p className="text-[16px] font-black italic tabular-nums text-slate-900 dark:text-slate-100">
                          R{groupTotal.toFixed(2)}
                        </p>
                        <ChevronRight className="text-slate-300 group-hover:text-[#1e4da1]" size={18} />
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            );
          })()}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          TAB 2: PAYSLIPS (Consolidated Single Remuneration Document Per Coach)
      ════════════════════════════════════════════════════════════════════════ */}
      {activeMainTab === 'payslips' && (
        <div className="space-y-5">
          {/* Summary statistics bar for owner */}
          {isOwner && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 dark:from-blue-950/40 dark:to-indigo-950/40 p-4 rounded-2xl border border-blue-200/60 dark:border-blue-900/40">
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Total Remuneration Due</p>
                <p className="text-2xl font-black italic text-[#1e4da1] dark:text-blue-400 mt-0.5 tabular-nums">
                  R{Array.from(coachesPayslipData.values()).reduce((sum, c) => sum + c.totalEarnings, 0).toFixed(2)}
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Total Hours Coached</p>
                <p className="text-2xl font-black italic text-slate-800 dark:text-slate-200 mt-0.5 tabular-nums">
                  {Array.from(coachesPayslipData.values()).reduce((sum, c) => sum + c.totalHours, 0).toFixed(1)} hrs
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Staff Coaches</p>
                <p className="text-2xl font-black italic text-slate-800 dark:text-slate-200 mt-0.5">
                  {coachesRoster.length}
                </p>
              </div>
            </div>
          )}

          {/* Search bar for coaches */}
          {isOwner && (
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search coach by name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-[#1e4da1] dark:text-white"
              />
            </div>
          )}

          {/* Coach payslips list */}
          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-3">
            {coachesRoster
              .filter(coach => {
                if (searchQuery.trim()) {
                  return coach.name.toLowerCase().includes(searchQuery.toLowerCase());
                }
                return true;
              })
              .map(coach => {
                const data = coachesPayslipData.get(coach.id);
                const totalHours = data?.totalHours || 0;
                const totalEarnings = data?.totalEarnings || 0;
                const sessionCount = data?.sessionCount || 0;

                return (
                  <motion.div
                    key={`coach-card-${coach.id}`}
                    variants={invoiceItemVariants}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedCoachId(coach.id)}
                    className="w-full p-4.5 bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-3xl flex items-center justify-between shadow-sm group cursor-pointer hover:border-blue-200 dark:hover:border-blue-900/60 transition-all"
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center font-black text-white text-base shrink-0 shadow-md">
                        {coach.name.charAt(0).toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="font-black text-slate-800 dark:text-slate-100 text-[16px] uppercase italic group-hover:text-[#1e4da1] transition-colors truncate">
                          {coach.name}
                        </p>

                        <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500 font-bold uppercase tracking-wider flex-wrap">
                          <span>{sessionCount} sessions</span>
                          <span>·</span>
                          <span>{totalHours} hrs coached</span>
                          {coach.bankName && (
                            <>
                              <span>·</span>
                              <span className="text-slate-400">{coach.bankName}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      <div className="text-right">
                        <p className="text-[17px] font-black italic tabular-nums text-[#1e4da1] dark:text-blue-400">
                          R{totalEarnings.toFixed(2)}
                        </p>
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                          Total Remuneration
                        </p>
                      </div>
                      <ChevronRight className="text-slate-300 group-hover:text-[#1e4da1]" size={20} />
                    </div>
                  </motion.div>
                );
              })}
          </motion.div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          TAB 3: MERCHANDISE (On the Far Right)
      ════════════════════════════════════════════════════════════════════════ */}
      {activeMainTab === 'merchandise' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase italic tracking-wider">
                Merchandise Client Invoices & Apparel Billing
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                Gear, tracksuits, shirts, and apparel billed separately from coaching sessions
              </p>
            </div>
            {onAddMerch && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => onAddMerch()}
                className="bg-[#1e4da1] text-white px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center gap-1.5 shrink-0"
              >
                <Plus size={14} strokeWidth={3} />
                <span>New Sale</span>
              </motion.button>
            )}
          </div>

          {merchInvoices.length === 0 ? (
            <div className="bg-white dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-10 text-center shadow-sm space-y-2">
              <ShoppingBag className="mx-auto text-slate-200 dark:text-slate-600 mb-2" size={48} />
              <p className="text-slate-400 text-[11px] font-black uppercase">No Open Merchandise Invoices</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                Tap 'New Sale' to bill apparel, shirts, or gear to an athlete, team, or parent
              </p>
            </div>
          ) : (
            <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-2.5">
              {merchInvoices.map((group, idx) => {
                const lines = getInvoiceLines(group, 'merch');
                const groupTotal = sumLines(lines);

                return (
                  <motion.div
                    key={`merch-inv-${group.family_id}-${idx}`}
                    variants={invoiceItemVariants}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedInvoiceId(group.family_id)}
                    className="w-full p-4 bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-between shadow-sm group cursor-pointer hover:border-blue-200 dark:hover:border-blue-900/60 transition-all"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-white shrink-0">
                        <ShoppingBag size={17} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-black text-slate-800 dark:text-slate-100 text-[15px] uppercase italic group-hover:text-[#1e4da1] transition-colors truncate">
                          {group.label}
                        </p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                          {lines.length} item{lines.length === 1 ? '' : 's'} · Merchandise Order
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      <p className="text-[16px] font-black italic tabular-nums text-slate-900 dark:text-slate-100">
                        R{groupTotal.toFixed(2)}
                      </p>
                      <ChevronRight className="text-slate-300 group-hover:text-[#1e4da1]" size={18} />
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
});
