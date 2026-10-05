import React, { useMemo, useState } from 'react';
import { CheckCircle2, Circle, MessageCircle, Receipt } from 'lucide-react';
import { AppState, Payment } from '../../types';
import { MONTH_NAMES } from '../utils/pricing';
import { parseMonthKey } from '../utils/historyEngine';
import { sendWhatsAppPaymentNudge } from '../utils/whatsapp';

interface InvoiceTrackerProps {
  state: AppState;
  onSetInvoicePaid?: (paymentIds: string[], paid: boolean) => void;
}

const cents = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const rand = (n: number) =>
  `R ${cents(n).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * One tab per month, each listing the invoices filed under it with a paid tick.
 * The month a payment sits in is its `invoice_id` ("July 2026"), which the
 * pricing engine already derives from the client's billing day — so a club
 * billed from the 20th lands in the month the invoice goes out.
 */
export const InvoiceTracker: React.FC<InvoiceTrackerProps> = ({ state, onSetInvoicePaid }) => {
  const [unpaidOnly, setUnpaidOnly] = useState(false);

  // Client invoices only — coach payouts are expenses, 'Active' is the live invoice.
  const invoices = useMemo(() => {
    return (state.payments || []).flatMap(p => {
      if (p.is_expense || Number(p.amount_due || 0) <= 0) return [];
      const parsed = parseMonthKey(p.invoice_id);
      if (!parsed) return [];
      return [{ p, monthIdx: MONTH_NAMES.indexOf(parsed.monthName), year: parsed.year }];
    });
  }, [state.payments]);

  const years = useMemo(() => {
    const set = new Set<number>(invoices.map(i => i.year));
    set.add(new Date().getFullYear());
    return Array.from(set).sort((a, b) => b - a);
  }, [invoices]);

  // Open on the newest month that still has something to chase, else the newest with data.
  const initial = useMemo(() => {
    const rank = (i: { monthIdx: number; year: number }) => i.year * 12 + i.monthIdx;
    const open = invoices.filter(i => !i.p.is_paid).sort((a, b) => rank(b) - rank(a))[0];
    const any = [...invoices].sort((a, b) => rank(b) - rank(a))[0];
    const pick = open || any;
    const now = new Date();
    return pick
      ? { year: pick.year, month: pick.monthIdx }
      : { year: now.getFullYear(), month: now.getMonth() };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);

  const byMonth = useMemo(() => {
    const map = new Map<number, Payment[]>();
    invoices.filter(i => i.year === year).forEach(i => {
      const list = map.get(i.monthIdx) || [];
      list.push(i.p);
      map.set(i.monthIdx, list);
    });
    return map;
  }, [invoices, year]);

  const phoneFor = (p: Payment): string => {
    if (p.bill_to_phone) return p.bill_to_phone;
    const gym = (state.gyms || []).find(g => g.id === p.family_id);
    if (gym?.bill_to_phone) return gym.bill_to_phone;
    const mc = (state.merchClients || []).find(c => c.id === p.family_id);
    if (mc?.phone) return mc.phone;
    const kid = (state.students || []).find(s => (s.groupKey || s.id) === p.family_id);
    return kid?.parent1_phone || kid?.parent2_phone || kid?.phone || '';
  };

  const nameFor = (p: Payment): string => {
    if (p.client_name) return p.client_name;
    const gym = (state.gyms || []).find(g => g.id === p.family_id);
    if (gym) return gym.bill_to_name || gym.name;
    const kid = (state.students || []).find(s => (s.groupKey || s.id) === p.family_id);
    return kid?.parent1_name || kid?.name || 'Client';
  };

  const monthLabel = `${MONTH_NAMES[month]} ${year}`;
  const rows = (byMonth.get(month) || [])
    .slice()
    .sort((a, b) => Number(!!a.is_paid) - Number(!!b.is_paid) || nameFor(a).localeCompare(nameFor(b)));
  const shown = unpaidOnly ? rows.filter(r => !r.is_paid) : rows;

  const invoiced = cents(rows.reduce((a, r) => a + Number(r.amount_due || 0), 0));
  const paid = cents(rows.filter(r => r.is_paid).reduce((a, r) => a + Number(r.amount_due || 0), 0));
  const outstanding = cents(invoiced - paid);
  const unpaidRows = rows.filter(r => !r.is_paid);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Receipt size={16} className="text-[#1e4da1] dark:text-blue-400" />
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
              Invoice Payments
            </h2>
          </div>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black dark:text-white outline-none"
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {/* Month tabs */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
          {MONTH_NAMES.map((name, idx) => {
            const list = byMonth.get(idx) || [];
            const open = list.filter(r => !r.is_paid).length;
            const active = idx === month;
            return (
              <button
                key={name}
                onClick={() => setMonth(idx)}
                className={`relative shrink-0 px-3.5 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${
                  active
                    ? 'bg-[#1e4da1] text-white shadow-md'
                    : list.length === 0
                      ? 'bg-slate-50 dark:bg-slate-800/50 text-slate-300 dark:text-slate-600'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {name.slice(0, 3)}
                {list.length > 0 && (
                  <span className={`ml-1.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[9px] ${
                    open > 0
                      ? 'bg-amber-500 text-white'
                      : 'bg-emerald-500 text-white'
                  }`}>
                    {open > 0 ? open : '✓'}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Month summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Invoiced</span>
            <span className="text-sm font-[1000] text-slate-900 dark:text-white tabular-nums">{rand(invoiced)}</span>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20">
            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">Paid</span>
            <span className="text-sm font-[1000] text-emerald-600 dark:text-emerald-400 tabular-nums">{rand(paid)}</span>
          </div>
          <div className={`p-3 rounded-2xl ${outstanding > 0 ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-slate-50 dark:bg-slate-800/40'}`}>
            <span className="text-[9px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 block">Outstanding</span>
            <span className="text-sm font-[1000] text-amber-600 dark:text-amber-400 tabular-nums">{rand(outstanding)}</span>
          </div>
        </div>

        {rows.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={unpaidOnly}
                onChange={e => setUnpaidOnly(e.target.checked)}
                className="accent-[#1e4da1]"
              />
              Unpaid only
            </label>
            {onSetInvoicePaid && unpaidRows.length > 0 && (
              <button
                onClick={() => {
                  if (confirm(`Mark all ${unpaidRows.length} ${monthLabel} invoices as paid?`)) {
                    onSetInvoicePaid(unpaidRows.map(r => r.id), true);
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 text-[10px] font-black uppercase tracking-wider"
              >
                Mark all paid
              </button>
            )}
          </div>
        )}

        {/* Invoice list */}
        {rows.length === 0 ? (
          <p className="py-8 text-center text-xs font-medium text-slate-400">
            No invoices archived for {monthLabel}.
          </p>
        ) : shown.length === 0 ? (
          <p className="py-8 text-center text-xs font-bold text-emerald-600 dark:text-emerald-400">
            Everything for {monthLabel} is paid.
          </p>
        ) : (
          <div className="space-y-2">
            {shown.map(r => {
              const phone = phoneFor(r);
              return (
                <div
                  key={r.id}
                  className={`p-3.5 rounded-xl border flex items-center gap-3 ${
                    r.is_paid
                      ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800'
                  }`}
                >
                  <button
                    onClick={() => onSetInvoicePaid?.([r.id], !r.is_paid)}
                    disabled={!onSetInvoicePaid}
                    title={r.is_paid ? 'Paid — tap to undo' : 'Mark as paid'}
                    className={`shrink-0 ${r.is_paid ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600 hover:text-emerald-500'}`}
                  >
                    {r.is_paid ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                  </button>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black uppercase text-slate-800 dark:text-slate-100 truncate">
                      {nameFor(r)}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400">
                      {r.is_paid && r.paid_at
                        ? `Paid ${new Date(r.paid_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}`
                        : r.due_date ? `Due ${r.due_date}` : 'Awaiting payment'}
                    </p>
                  </div>

                  <span className={`text-sm font-[1000] tabular-nums ${r.is_paid ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                    {rand(Number(r.amount_due))}
                  </span>

                  {!r.is_paid && (
                    <button
                      onClick={() => sendWhatsAppPaymentNudge(nameFor(r), phone, cents(Number(r.amount_due)), monthLabel)}
                      title={phone ? 'Send a WhatsApp reminder' : 'No phone number saved'}
                      className={`shrink-0 p-2 rounded-lg ${phone ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-100' : 'bg-slate-100 dark:bg-slate-800 text-slate-300'}`}
                    >
                      <MessageCircle size={16} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
