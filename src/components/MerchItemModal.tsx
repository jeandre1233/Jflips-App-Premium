import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MerchItem } from '../../types';

interface MerchItemModalProps {
  /** The item being edited, or null to create a new one. */
  item: MerchItem | null;
  onSave: (item: MerchItem) => Promise<void> | void;
  onCancel: () => void;
}

export const MerchItemModal: React.FC<MerchItemModalProps> = ({ item, onSave, onCancel }) => {
  const [name, setName] = useState(item?.name || '');
  const [price, setPrice] = useState(item ? String(item.price ?? '') : '');
  const [costPrice, setCostPrice] = useState(item ? String(item.cost_price ?? '') : '');
  // Sizes are edited as one comma-separated line — quicker on a phone than a
  // repeater, and the catalogue rarely holds more than a handful.
  const [sizesText, setSizesText] = useState((item?.sizes || []).join(', '));
  const [description, setDescription] = useState(item?.description || '');
  const [active, setActive] = useState(item?.active !== false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setError('');
    if (!name.trim()) return setError('Give the item a name.');
    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum <= 0) return setError('Enter a price above R0.');

    setSaving(true);
    try {
      await onSave({
        id: item?.id || '',
        name: name.trim(),
        description: description.trim() || undefined,
        price: priceNum,
        cost_price: Number(costPrice) || 0,
        sizes: sizesText.split(',').map(s => s.trim()).filter(Boolean),
        active
      });
    } catch (e: any) {
      setError(e?.message || 'Could not save the item.');
    } finally {
      setSaving(false);
    }
  };

  const label = 'text-[10px] font-black text-[#94a3b8] uppercase tracking-widest mb-2 block';
  const input = 'w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-[#1e4da1]';

  const margin = (Number(price) || 0) - (Number(costPrice) || 0);

  return (
    <div className="space-y-5">
      <div>
        <span className={label}>Item Name</span>
        <input className={input} placeholder="e.g. JFLIPS Team Shirt" value={name}
          onChange={e => setName(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className={label}>Price (R)</span>
          <input className={input} type="number" inputMode="decimal" placeholder="250" value={price}
            onChange={e => setPrice(e.target.value)} />
        </div>
        <div>
          <span className={label}>Your Cost (R)</span>
          <input className={input} type="number" inputMode="decimal" placeholder="140" value={costPrice}
            onChange={e => setCostPrice(e.target.value)} />
        </div>
      </div>

      {/* Cost is optional and only ever used for reporting — say so, so it is
          not mistaken for something the client sees. */}
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 leading-relaxed">
        Your cost is optional and never appears on an invoice. It is only used to
        show merchandise profit in your reports.
        {Number(costPrice) > 0 && Number(price) > 0 && (
          <span className={margin >= 0 ? ' text-emerald-600 dark:text-emerald-400' : ' text-red-500'}>
            {' '}Margin R{Math.round(margin * 100) / 100} per unit.
          </span>
        )}
      </p>

      <div>
        <span className={label}>Sizes (optional)</span>
        <input className={input} placeholder="S, M, L, XL" value={sizesText}
          onChange={e => setSizesText(e.target.value)} />
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-2">
          Comma separated. Leave blank for an item with no sizes.
        </p>
      </div>

      <div>
        <span className={label}>Note (optional)</span>
        <input className={input} placeholder="e.g. runs small, order one size up" value={description}
          onChange={e => setDescription(e.target.value)} />
      </div>

      <button
        type="button"
        onClick={() => setActive(!active)}
        className="w-full flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 rounded-2xl px-4 py-3.5"
      >
        <div className="text-left">
          <p className="text-[11px] font-black uppercase italic text-slate-800 dark:text-slate-100">
            {active ? 'Available to sell' : 'Retired'}
          </p>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-0.5">
            Retired items stay on past invoices
          </p>
        </div>
        <div className={`w-11 h-6 rounded-full p-1 transition-colors ${active ? 'bg-[#1e4da1]' : 'bg-slate-300 dark:bg-slate-600'}`}>
          <motion.div layout className={`w-4 h-4 bg-white rounded-full shadow ${active ? 'ml-auto' : ''}`} />
        </div>
      </button>

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
          onClick={handleSave}
          disabled={saving}
          className="flex-[2] bg-[#1e4da1] text-white py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg disabled:opacity-70"
        >
          {saving ? 'Saving…' : item ? 'Save Changes' : 'Add Item'}
        </motion.button>
      </div>
    </div>
  );
};
