import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History,
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
  ChevronRight,
  ChevronDown,
  Download,
  FileSpreadsheet,
  Layers,
  Sparkles,
  ShieldAlert,
  ArrowUpRight,
  Clock,
  Building,
  School,
  Activity,
  CheckCircle2,
  X
} from 'lucide-react';
import { AppState, HistoryMonth, AttendanceSession } from '../../types';

interface HistoryViewProps {
  state: AppState;
  onShowRecovery?: () => void;
  onRestoreSnapshot?: (snapshot: any) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  state,
  onShowRecovery,
  onRestoreSnapshot
}) => {
  const [selectedMonth, setSelectedMonth] = useState<HistoryMonth | null>(null);
  const [expandedMonthId, setExpandedMonthId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStreamFilter, setSelectedStreamFilter] = useState<'all' | 'tumbling' | 'schools' | 'gyms'>('all');

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

    historyRecords.forEach(h => {
      const tGross = Number(h.tumblingGross ?? 0);
      const tCoach = Number(h.tumblingCoachPay ?? 0);
      const tNet = Number(h.tumblingNet ?? (tGross - tCoach));

      const sGross = Number(h.schoolsGross ?? 0);
      const sCoach = Number(h.schoolsCoachPay ?? 0);

      const gGross = Number(h.gymsGross ?? 0);
      const gNet = Number(h.gymsNet ?? gGross);

      const totalG = Number(h.totalGross ?? h.revenue ?? (tGross + sGross + gGross));
      const totalC = Number(h.totalCoachPayout ?? (tCoach + sCoach));
      const totalN = Number(h.netProfit ?? (tNet + gNet));

      gross += totalG;
      coachPay += totalC;
      net += totalN;
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

    return {
      gross,
      coachPay,
      net,
      sessions,
      tumblingGross,
      tumblingCoachPay,
      tumblingNet,
      schoolsGross,
      schoolsCoachPay,
      gymsGross,
      gymsNet,
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
      ['External Gyms Gross (R)', (Number(m.gymsGross ?? 0)).toFixed(2), '', '', '']
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
              Turn-ins & cheer pass-through
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
              <span className="text-slate-400 font-medium">Coach Turn-In:</span>
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
            {filteredHistory.map((m) => {
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

              const isExpanded = expandedMonthId === m.id;

              return (
                <div
                  key={m.id}
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
                      </div>
                    </div>

                    {/* Financial Pill Highlights */}
                    <div className="flex flex-wrap items-center gap-3 md:gap-6">
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
                              <span>Coach Turn-In Cost:</span>
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

                        {/* Actions for Month */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                          <div className="flex items-center gap-2">
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
                          </div>

                          <div className="text-[10px] font-mono text-slate-400">
                            ID: {m.id}
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
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                      Archived Cycle
                    </span>
                    <h3 className="text-lg font-black uppercase text-slate-800 dark:text-white">
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
              <div className="p-6 overflow-y-auto flex-1 space-y-3">
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
                        key={sess.id || idx}
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
