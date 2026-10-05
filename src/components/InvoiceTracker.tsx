import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Circle, Eye, MessageCircle, Receipt, Undo2, X } from 'lucide-react';
import { AppState, Payment } from '../../types';
import { MONTH_NAMES, PricedClientLine, merchOrdersForMonth, priceSessions } from '../utils/pricing';
import { parseMonthKey } from '../utils/historyEngine';
import { sendWhatsAppPaymentNudge } from '../utils/whatsapp';

interface InvoiceTrackerProps {
  state: AppState;
  onSetInvoicePaid?: (paymentIds: string[], paid: boolean) => void;
  /** Overwrite an invoice's amount with the archive's figure. */
  onFixInvoiceAmount?: (paymentId: string, amount: number) => void;
}

const cents = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const rand = (n: number) =>
  `R ${cents(n).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * One tab per month, each listing the invoices filed under it with a paid tick.
 * The month a payment sits in is its `invoice_id` ("July 2026"), which the
 * pricing engine already derives from the client's billing day, so a club
 * billed from the 20th lands in the month the invoice goes out.
 */
export const InvoiceTracker: React.FC<InvoiceTrackerProps> = ({ state, onSetInvoicePaid, onFixInvoiceAmount }) => {
  const [unpaidOnly, setUnpaidOnly] = useState(false);
  const [confirmAll, setConfirmAll] = useState(false);
  const [confirmFix, setConfirmFix] = useState(false);
  const [viewing, setViewing] = useState<Payment | null>(null);

  // Client invoices only — coach payouts are expenses, 'Active' is the live invoice.
  // If the same client + month appears more than once (an old double run), show
  // ONE row: a paid one in preference, otherwise the oldest.
  const invoices = useMemo(() => {
    const best = new Map<string, Payment>();
    (state.payments || []).forEach(p => {
      if (p.is_expense || Number(p.amount_due || 0) <= 0) return;
      if (!parseMonthKey(p.invoice_id)) return;
      const k = `${p.invoice_id}|${p.family_id}`;
      const cur = best.get(k);
      if (!cur
        || (!!p.is_paid && !cur.is_paid)
        || (!!p.is_paid === !!cur.is_paid && String(p.created_at || '') < String(cur.created_at || ''))) {
        best.set(k, p);
      }
    });
    return Array.from(best.values()).map(p => {
      const parsed = parseMonthKey(p.invoice_id)!;
      return { p, monthIdx: MONTH_NAMES.indexOf(parsed.monthName), year: parsed.year };
    });
  }, [state.payments]);

  // What the archive says each client owes, per month — the check on every amount.
  const archiveAmounts = useMemo(() => {
    const map = new Map<string, number>();
    (state.history || []).forEach(h => {
      const key = `${h.monthName} ${h.year}`;
      (h.snapshot_data?.invoices || []).forEach(i => map.set(`${key}|${i.familyId}`, cents(i.amount)));
    });
    return map;
  }, [state.history]);

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

  // The line items of one archived invoice, priced from the month's archived sessions.
  const linesFor = (p: Payment): PricedClientLine[] => {
    const parsed = parseMonthKey(p.invoice_id);
    if (!parsed) return [];
    const hist = (state.history || []).find(h => h.monthName === parsed.monthName && h.year === parsed.year);
    const ctx = {
      gyms: state.gyms || [],
      classTypes: state.classTypes || [],
      students: state.students || [],
      staff: state.staff || [],
      profile: state.profile,
      siblingDiscount: state.profile.sibling_discount,
      merchOrders: merchOrdersForMonth(state.merchOrders || [], p.invoice_id),
      merchClients: state.merchClients || []
    };
    return priceSessions(hist?.sessions || [], ctx).clientLines
      .filter(l => l.billToId === p.family_id)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));
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

  // Every invoice in this month whose amount disagrees with the archive.
  const drifted = rows.filter(r => {
    const a = archiveAmounts.get(`${r.invoice_id}|${r.family_id}`);
    return a !== undefined && Math.abs(a - Number(r.amount_due || 0)) >= 1;
  });

  const viewLines = viewing ? linesFor(viewing) : [];
  const viewLinesTotal = cents(viewLines.reduce((a, l) => a + l.amount, 0));

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
            onChange={e => { setYear(Number(e.target.value)); setConfirmAll(false); setConfirmFix(false); }}
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
                onClick={() => { setMonth(idx); setConfirmAll(false); setConfirmFix(false); }}
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
                    open > 0 ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'
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

        {drifted.length > 0 && onFixInvoiceAmount && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40">
            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-amber-700 dark:text-amber-300">
              <AlertTriangle size={14} />
              {drifted.length} {drifted.length === 1 ? 'invoice does' : 'invoices do'} not match the archive
            </span>
            {confirmFix ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    drifted.forEach(r => onFixInvoiceAmount(r.id, archiveAmounts.get(`${r.invoice_id}|${r.family_id}`)!));
                    setConfirmFix(false);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-[10px] font-black uppercase tracking-wider"
                >
                  Yes, correct {drifted.length}
                </button>
                <button
                  onClick={() => setConfirmFix(false)}
                  className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-wider"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmFix(true)}
                className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider"
              >
                Fix all to archive amounts
              </button>
            )}
          </div>
        )}

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
              confirmAll ? (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-500">
                    Mark {unpaidRows.length} as paid?
                  </span>
                  <button
                    onClick={() => { onSetInvoicePaid(unpaidRows.map(r => r.id), true); setConfirmAll(false); }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider"
                  >
                    Yes, mark paid
                  </button>
                  <button
                    onClick={() => setConfirmAll(false)}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmAll(true)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 text-[10px] font-black uppercase tracking-wider"
                >
                  Mark all paid
                </button>
              )
            )}

            {onSetInvoicePaid && unpaidRows.length === 0 && rows.length > 0 && (
              <button
                onClick={() => onSetInvoicePaid(rows.map(r => r.id), false)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-wider"
              >
                <Undo2 size={12} /> Undo all paid
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
            Everything for {monthLabel} is paid. Untick "Unpaid only" to see them.
          </p>
        ) : (
          <div className="space-y-2">
            {shown.map(r => {
              const phone = phoneFor(r);
              const archived = archiveAmounts.get(`${r.invoice_id}|${r.family_id}`);
              const drift = archived !== undefined && Math.abs(archived - Number(r.amount_due || 0)) >= 1;
              return (
                <div
                  key={r.id}
                  className={`p-3.5 rounded-xl border space-y-2 ${
                    r.is_paid
                      ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
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

                    <button
                      onClick={() => setViewing(r)}
                      title="View invoice"
                      className="shrink-0 p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-[#1e4da1] dark:text-blue-400 hover:bg-blue-100"
                    >
                      <Eye size={16} />
                    </button>

                    {r.is_paid ? (
                      <button
                        onClick={() => onSetInvoicePaid?.([r.id], false)}
                        title="Undo — mark as unpaid"
                        className="shrink-0 flex items-center gap-1 px-2.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-wider"
                      >
                        <Undo2 size={13} /> Undo
                      </button>
                    ) : (
                      <button
                        onClick={() => sendWhatsAppPaymentNudge(nameFor(r), phone, cents(Number(r.amount_due)), monthLabel)}
                        title={phone ? 'Send a WhatsApp reminder' : 'No phone number saved'}
                        className={`shrink-0 p-2 rounded-lg ${phone ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-100' : 'bg-slate-100 dark:bg-slate-800 text-slate-300'}`}
                      >
                        <MessageCircle size={16} />
                      </button>
                    )}
                  </div>

                  {drift && (
                    <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40">
                      <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-amber-700 dark:text-amber-300">
                        <AlertTriangle size={12} />
                        The archive says this invoice is {rand(archived!)}
                      </span>
                      {onFixInvoiceAmount && (
                        <button
                          onClick={() => onFixInvoiceAmount(r.id, archived!)}
                          className="px-2.5 py-1 rounded-md bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider"
                        >
                          Set to {rand(archived!)}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Archived invoice viewer */}
      {viewing && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setViewing(null)}>
          <div
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between p-5 border-b border-slate-100 dark:border-slate-800">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Archived invoice · {viewing.invoice_id}</p>
                <h3 className="text-base font-black uppercase text-slate-800 dark:text-white">{nameFor(viewing)}</h3>
                {viewing.bill_to_address && (
                  <p className="text-[10px] text-slate-400 mt-0.5">{viewing.bill_to_address}</p>
                )}
              </div>
              <button onClick={() => setViewing(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-2">
              {viewLines.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-400 font-medium">
                  The line items for this invoice aren't in the archive (the month was archived before sessions were kept), but the amount recorded is {rand(Number(viewing.amount_due))}.
                </p>
              ) : viewLines.map((l, i) => (
                <div key={`${l.sessionId}-${i}`} className="flex items-start justify-between gap-3 text-xs border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 dark:text-slate-100">{l.description}</p>
                    <p className="text-[10px] text-slate-400">{l.date}{l.targetName ? ` · ${l.targetName}` : ''}</p>
                  </div>
                  <span className="font-black tabular-nums text-slate-800 dark:text-slate-100 shrink-0">{rand(l.amount)}</span>
                </div>
              ))}
            </div>

            <div className="p-5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="font-black uppercase tracking-wider text-slate-500 text-[10px]">Amount on record</span>
                <span className="font-[1000] tabular-nums text-slate-900 dark:text-white">{rand(Number(viewing.amount_due))}</span>
              </div>
              {viewLines.length > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="font-black uppercase tracking-wider text-slate-500 text-[10px]">Line items add up to</span>
                  <span className={`font-[1000] tabular-nums ${Math.abs(viewLinesTotal - Number(viewing.amount_due)) >= 1 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {rand(viewLinesTotal)}
                  </span>
                </div>
              )}
              {viewLines.length > 0 && Math.abs(viewLinesTotal - Number(viewing.amount_due)) >= 1 && onFixInvoiceAmount && (
                <button
                  onClick={() => { onFixInvoiceAmount(viewing.id, viewLinesTotal); setViewing(null); }}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider"
                >
                  Set amount to {rand(viewLinesTotal)}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
