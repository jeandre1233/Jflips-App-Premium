import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Package, ShoppingBag, User, UserPlus } from 'lucide-react';
import {
  AppState,
  MerchBillToKind,
  MerchClient,
  MerchOrder,
  resolveBillToId
} from '../../types';

/**
 * What the modal hands back. The parent does the database writes.
 *
 * `newClient` is set only when the user typed a brand-new external person; the
 * parent must insert that first so the order can reference its id.
 */
export interface MerchOrderDraft {
  order: Omit<MerchOrder, 'id'>;
  newClient?: Omit<MerchClient, 'id'>;
}

interface MerchOrderModalProps {
  state: AppState;
  /** Pre-selects the client when opened from inside one client's invoice. */
  fixedBillTo?: { id: string; kind: MerchBillToKind; label: string };
  onSubmit: (draft: MerchOrderDraft) => Promise<void> | void;
  onCancel: () => void;
}

const CUSTOM_ITEM = '__custom__';
const NEW_CLIENT = '__new__';

const todayStr = () => new Date().toISOString().split('T')[0];

export const MerchOrderModal: React.FC<MerchOrderModalProps> = ({
  state,
  fixedBillTo,
  onSubmit,
  onCancel
}) => {
  // ── WHO IS BEING BILLED ───────────────────────────────────────────────────
  const [kind, setKind] = useState<MerchBillToKind>(fixedBillTo?.kind || 'athlete');
  const [billToId, setBillToId] = useState<string>(fixedBillTo?.id || '');

  const [newClient, setNewClient] = useState({ name: '', address: '', phone: '', email: '' });

  // ── WHAT WAS ORDERED ──────────────────────────────────────────────────────
  const [itemId, setItemId] = useState<string>('');
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [customCost, setCustomCost] = useState('');
  const [size, setSize] = useState('');
  const [qty, setQty] = useState('1');
  const [orderDate, setOrderDate] = useState(todayStr());
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  /**
   * Athlete invoice targets, keyed by the SAME id their sessions bill to —
   * linked siblings collapse onto one family, exactly as on the invoice list.
   */
  const athleteTargets = useMemo(() => {
    const map = new Map<string, string[]>();
    (state.students || []).filter(s => !s.is_gym_member).forEach(s => {
      const id = resolveBillToId(s);
      const names = map.get(id) || [];
      names.push(s.name);
      map.set(id, names);
    });
    return Array.from(map.entries())
      .map(([id, names]) => ({ id, label: names.join(' & ') }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [state.students]);

  const gymTargets = useMemo(
    () => (state.gyms || [])
      .filter(g => !g.parent_gym_id)
      .map(g => ({ id: g.id, label: g.bill_to_name || g.name, isCheer: g.gym_type === 'cheer' }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    [state.gyms]
  );

  const activeItems = useMemo(
    () => (state.merchItems || []).filter(i => i.active !== false),
    [state.merchItems]
  );

  const selectedItem = activeItems.find(i => i.id === itemId);
  const isCustom = itemId === CUSTOM_ITEM;

  const unitPrice = isCustom ? Number(customPrice || 0) : Number(selectedItem?.price || 0);
  const unitCost = isCustom ? Number(customCost || 0) : Number(selectedItem?.cost_price || 0);
  const qtyNum = Math.max(1, Math.round(Number(qty) || 1));
  const lineTotal = Math.round(unitPrice * qtyNum * 100) / 100;

  const switchKind = (next: MerchBillToKind) => {
    setKind(next);
    setBillToId('');
  };

  const handleSubmit = async () => {
    setError('');

    const itemName = isCustom ? customName.trim() : (selectedItem?.name || '');
    if (!itemName) return setError('Choose an item, or name a custom one.');
    if (unitPrice <= 0) return setError('The item needs a price above R0.');

    let resolvedClient: Omit<MerchClient, 'id'> | undefined;
    if (kind === 'external' && billToId === NEW_CLIENT) {
      if (!newClient.name.trim()) return setError("Enter the person's name.");
      resolvedClient = {
        name: newClient.name.trim(),
        address: newClient.address.trim() || undefined,
        phone: newClient.phone.trim() || undefined,
        email: newClient.email.trim() || undefined
      };
    } else if (!billToId) {
      return setError('Choose who this invoice is made out to.');
    }

    // A brand-new person has no id yet — the parent inserts the client first
    // and substitutes the real id before writing the order.
    const draft: MerchOrderDraft = {
      order: {
        bill_to_id: resolvedClient ? '' : billToId,
        bill_to_kind: kind,
        item_id: isCustom ? undefined : selectedItem?.id,
        item_name: itemName,
        unit_price: unitPrice,
        unit_cost: unitCost,
        qty: qtyNum,
        size: size || undefined,
        order_date: orderDate || todayStr(),
        status: 'ordered',
        invoiced_month: null,
        notes: notes.trim() || undefined
      },
      newClient: resolvedClient
    };

    setSaving(true);
    try {
      await onSubmit(draft);
    } catch (e: any) {
      setError(e?.message || 'Could not save the order.');
    } finally {
      setSaving(false);
    }
  };

  const label = 'text-[10px] font-black text-[#94a3b8] uppercase tracking-widest mb-2 block';
  const input = 'w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-[#1e4da1]';

  return (
    <div className="space-y-6">
      {/* ── BILL TO ─────────────────────────────────────────────────────────── */}
      {fixedBillTo ? (
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
          <span className={label}>Bill To</span>
          <p className="text-sm font-black uppercase italic text-slate-900 dark:text-slate-100">{fixedBillTo.label}</p>
        </div>
      ) : (
        <div className="space-y-3">
          <span className={label}>Bill To</span>
          <div className="grid grid-cols-3 gap-2">
            {([
              { k: 'athlete' as MerchBillToKind, icon: <User size={13} />, text: 'Athlete' },
              { k: 'gym' as MerchBillToKind, icon: <Building2 size={13} />, text: 'Team / Gym' },
              { k: 'external' as MerchBillToKind, icon: <UserPlus size={13} />, text: 'Other Person' }
            ]).map(opt => (
              <motion.button
                whileTap={{ scale: 0.97 }}
                type="button"
                key={opt.k}
                onClick={() => switchKind(opt.k)}
                className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl font-black text-[9px] uppercase tracking-wider border transition-colors ${
                  kind === opt.k
                    ? 'bg-[#1e4da1] text-white border-[#1e4da1]'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-700'
                }`}
              >
                {opt.icon}
                {opt.text}
              </motion.button>
            ))}
          </div>

          {kind === 'athlete' && (
            <select className={input} value={billToId} onChange={e => setBillToId(e.target.value)}>
              <option value="">Select athlete / family…</option>
              {athleteTargets.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          )}

          {kind === 'gym' && (
            <select className={input} value={billToId} onChange={e => setBillToId(e.target.value)}>
              <option value="">Select team / gym…</option>
              {gymTargets.map(t => (
                <option key={t.id} value={t.id}>{t.isCheer ? '🏆 ' : '🏢 '}{t.label}</option>
              ))}
            </select>
          )}

          {kind === 'external' && (
            <>
              <select className={input} value={billToId} onChange={e => setBillToId(e.target.value)}>
                <option value="">Select person…</option>
                {(state.merchClients || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                <option value={NEW_CLIENT}>+ New person…</option>
              </select>
              {billToId === NEW_CLIENT && (
                <div className="space-y-2 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 leading-relaxed">
                    Anyone at all — they do not need to be registered on the app.
                    These details print in the Bill To block on their invoice.
                  </p>
                  <input className={input} placeholder="Full name *" value={newClient.name}
                    onChange={e => setNewClient({ ...newClient, name: e.target.value })} />
                  <textarea className={input} rows={2} placeholder="Address (optional)" value={newClient.address}
                    onChange={e => setNewClient({ ...newClient, address: e.target.value })} />
                  <input className={input} placeholder="Phone (optional)" value={newClient.phone}
                    onChange={e => setNewClient({ ...newClient, phone: e.target.value })} />
                  <input className={input} placeholder="Email (optional)" value={newClient.email}
                    onChange={e => setNewClient({ ...newClient, email: e.target.value })} />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── ITEM ────────────────────────────────────────────────────────────── */}
      <div>
        <span className={label}>Item</span>
        <select
          className={input}
          value={itemId}
          onChange={e => { setItemId(e.target.value); setSize(''); }}
        >
          <option value="">Select item…</option>
          {activeItems.map(i => (
            <option key={i.id} value={i.id}>{i.name} — R{i.price}</option>
          ))}
          <option value={CUSTOM_ITEM}>+ One-off / custom item…</option>
        </select>

        {activeItems.length === 0 && !isCustom && (
          <p className="text-[9px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 mt-2 leading-relaxed">
            No items in your catalogue yet — add them under Setup → Merchandise,
            or use a one-off item below.
          </p>
        )}

        {isCustom && (
          <div className="grid grid-cols-2 gap-2 mt-2">
            <input className={`${input} col-span-2`} placeholder="Item name *" value={customName}
              onChange={e => setCustomName(e.target.value)} />
            <input className={input} type="number" inputMode="decimal" placeholder="Price (R) *" value={customPrice}
              onChange={e => setCustomPrice(e.target.value)} />
            <input className={input} type="number" inputMode="decimal" placeholder="Your cost (R)" value={customCost}
              onChange={e => setCustomCost(e.target.value)} />
          </div>
        )}

        {selectedItem && (selectedItem.sizes || []).length > 0 && (
          <div className="mt-3">
            <span className={label}>Size</span>
            <div className="flex flex-wrap gap-2">
              {(selectedItem.sizes || []).map(s => (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  key={s}
                  onClick={() => setSize(size === s ? '' : s)}
                  className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase border transition-colors ${
                    size === s
                      ? 'bg-[#1e4da1] text-white border-[#1e4da1]'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-700'
                  }`}
                >
                  {s}
                </motion.button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── QTY / DATE ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className={label}>Quantity</span>
          <input className={input} type="number" min={1} inputMode="numeric" value={qty}
            onChange={e => setQty(e.target.value)} />
        </div>
        <div>
          <span className={label}>Order Date</span>
          <input className={input} type="date" value={orderDate}
            onChange={e => setOrderDate(e.target.value)} />
        </div>
      </div>

      <div>
        <span className={label}>Note (optional)</span>
        <input className={input} placeholder="e.g. collect at Saturday practice" value={notes}
          onChange={e => setNotes(e.target.value)} />
      </div>

      {/* ── LINE PREVIEW ────────────────────────────────────────────────────── */}
      {lineTotal > 0 && (
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 p-4 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Package size={14} className="text-[#1e4da1] dark:text-blue-400 shrink-0" />
            <p className="text-[11px] font-black uppercase italic text-slate-700 dark:text-slate-200 truncate">
              {(isCustom ? customName : selectedItem?.name) || 'Item'}
              {size ? ` (Size ${size})` : ''}
              {qtyNum > 1 ? ` × ${qtyNum}` : ''}
            </p>
          </div>
          <p className="text-lg font-black italic text-[#1e4da1] dark:text-blue-400 tabular-nums shrink-0">R{lineTotal}</p>
        </div>
      )}

      {error && (
        <p className="text-[10px] font-black uppercase tracking-wider text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest"
        >
          Cancel
        </button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="flex-[2] bg-[#1e4da1] text-white py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 disabled:opacity-70"
        >
          <ShoppingBag size={13} />
          {saving ? 'Adding…' : 'Add To Invoice'}
        </motion.button>
      </div>
    </div>
  );
};
