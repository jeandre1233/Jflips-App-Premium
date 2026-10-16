import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';

/** What the modal hands back. The parent does the database write. */
export interface ExtraChargeDraft {
  description: string;
  /** Rand. Negative is allowed so a credit can be typed in too. */
  amount: number;
  date: string;
}

interface ExtraChargeModalProps {
  /** Whose invoice this lands on, shown so there is no doubt. */
  billToLabel: string;
  onSubmit: (draft: ExtraChargeDraft) => Promise<void> | void;
  onCancel: () => void;
}

const todayStr = () => new Date().toISOString().split('T')[0];

/**
 * "Add to invoice": a free-text line (what it is + how much) that goes on the
 * client's normal invoice. Not an athlete, not linked to anyone, no sibling
 * discount — just a charge, e.g. a cousin who came to a class, or something the
 * parent owes back.
 */
export const ExtraChargeModal: React.FC<ExtraChargeModalProps> = ({ billToLabel, onSubmit, onCancel }) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayStr());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const label = 'text-[10px] font-black text-[#94a3b8] uppercase tracking-widest mb-2 block';
  const input = 'w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-[#1e4da1]';

  const submit = async () => {
    const text = description.trim();
    const value = parseFloat(amount);
    if (!text) { setError('Type what this charge is for.'); return; }
    if (!Number.isFinite(value) || value === 0) { setError('Enter the amount in rand.'); return; }
    setSaving(true);
    try {
      await onSubmit({ description: text, amount: Math.round(value * 100) / 100, date });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
        <span className={label}>Adding to the invoice of</span>
        <p className="text-sm font-black uppercase italic text-slate-900 dark:text-slate-100">{billToLabel}</p>
      </div>

      <div>
        <span className={label}>What is it for?</span>
        <input
          className={input}
          placeholder="e.g. Cousin Mia, class on 10 Oct"
          value={description}
          maxLength={120}
          onChange={e => setDescription(e.target.value)}
        />
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1.5">
          This exact text is printed on the invoice.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className={label}>Amount (R)</span>
          <input
            className={input}
            type="number"
            inputMode="decimal"
            step="0.01"
            placeholder="150"
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />
        </div>
        <div>
          <span className={label}>Date</span>
          <input className={input} type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
      </div>

      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-relaxed">
        It is added to their normal invoice and cleared when you reset that invoice. Use a minus amount for a credit.
      </p>

      {error && <p className="text-[11px] font-black text-red-500 uppercase">{error}</p>}

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-500"
        >
          Cancel
        </button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          disabled={saving}
          onClick={submit}
          className="flex-[2] py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest bg-[#1e4da1] text-white shadow-lg flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <Plus size={14} strokeWidth={3} /> {saving ? 'Adding…' : 'Add to invoice'}
        </motion.button>
      </div>
    </div>
  );
};
