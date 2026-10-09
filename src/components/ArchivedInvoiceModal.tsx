import React, { useMemo, useRef, useState } from 'react';
import { AlertTriangle, Download, FileImage, Loader2, MessageCircle, Send, X } from 'lucide-react';
import { toJpeg, toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { AppState, Payment } from '../../types';
import { PricedClientLine } from '../utils/pricing';
import {
  resolveAllocation, resolveBankDetails, sanitiseAllocations, sanitiseGroupDefaults
} from '../utils/bankAccounts';
import { cleanPhoneNumber } from '../utils/whatsapp';
import { shareOrSaveFile } from '../utils/shareFile';
import { InvoiceSheet, InvoiceSheetLine, SHEET_WIDTH } from './InvoiceSheet';

/**
 * An archived invoice, shown as the document the client was sent, with the ways to
 * send it again: share the PDF (straight to WhatsApp on a phone), download the PDF or
 * an image, or send the amount and bank details as a WhatsApp message.
 */

const cents = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const rand = (n: number) =>
  `R ${cents(n).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const ArchivedInvoiceModal: React.FC<{
  state: AppState;
  payment: Payment;
  name: string;
  phone: string;
  lines: PricedClientLine[];
  onClose: () => void;
  onFixAmount?: (paymentId: string, amount: number) => void;
}> = ({ state, payment, name, phone, lines, onClose, onFixAmount }) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<'pdf' | 'share' | 'image' | null>(null);
  const [error, setError] = useState('');

  const total = cents(Number(payment.amount_due || 0));
  const linesTotal = cents(lines.reduce((a, l) => a + l.amount, 0));
  const mismatch = lines.length > 0 && Math.abs(linesTotal - total) >= 1;

  // The same bank account the invoice originally printed.
  const bank = useMemo(() => {
    const allocations = sanitiseAllocations(state.profile.invoice_bank_allocations);
    const defaults = sanitiseGroupDefaults(state.profile.bank_allocation_defaults);
    const resolved = resolveAllocation(payment.family_id, state.gyms || [], allocations, defaults);
    return resolveBankDetails(state.profile, resolved.allocation, null);
  }, [state.profile, state.gyms, payment.family_id]);

  const sheetLines: InvoiceSheetLine[] = useMemo(() => {
    if (lines.length === 0) {
      // Older months were archived without their sessions: show the amount that was billed.
      return [{ date: '', title: `Coaching account for ${payment.invoice_id}`, amount: total }];
    }
    return lines.map(l => ({
      date: l.date,
      title: l.description,
      sub: l.coachNames && l.coachNames.length > 0
        ? `Coaches: ${l.coachNames.join(', ')}`
        : (l.targetName && l.targetName.includes(' & ') ? l.targetName : undefined),
      amount: l.amount
    }));
  }, [lines, payment.invoice_id, total]);

  const fileBase = `Invoice_${name.replace(/[^A-Za-z0-9]+/g, '_')}_${payment.invoice_id.replace(/\s+/g, '_')}`;

  const renderPages = async (): Promise<string[]> => {
    const root = sheetRef.current;
    if (!root) throw new Error('The invoice is not ready yet.');
    const pages = Array.from(root.querySelectorAll('[data-invoice-page]')) as HTMLElement[];
    const images: string[] = [];
    for (const p of pages) {
      // JPEG keeps a multi-page invoice small enough to send on WhatsApp.
      images.push(await toJpeg(p, { backgroundColor: '#ffffff', pixelRatio: 2.5, quality: 0.92, cacheBust: true }));
    }
    return images;
  };

  const buildPdf = async (): Promise<jsPDF> => {
    const images = await renderPages();
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const margin = 10;
    const maxW = 210 - margin * 2;
    const maxH = 297 - margin * 2;
    images.forEach((img, i) => {
      if (i > 0) doc.addPage();
      const props = doc.getImageProperties(img);
      // Fit inside the page keeping the sheet's proportions (never stretch or squash).
      let w = maxW;
      let h = (props.height * w) / props.width;
      if (h > maxH) { h = maxH; w = (props.width * h) / props.height; }
      doc.addImage(img, 'JPEG', margin + (maxW - w) / 2, margin, w, h);
    });
    return doc;
  };

  const run = async (kind: 'pdf' | 'share' | 'image', fn: () => Promise<void>) => {
    setBusy(kind); setError('');
    try { await new Promise(r => setTimeout(r, 150)); await fn(); }
    catch (e: any) { console.error('Invoice export failed:', e); setError(e?.message || 'Something went wrong. Please try again.'); }
    finally { setBusy(null); }
  };

  const downloadPdf = () => run('pdf', async () => { (await buildPdf()).save(`${fileBase}.pdf`); });
  const sharePdf = () => run('share', async () => {
    const doc = await buildPdf();
    await shareOrSaveFile(doc.output('datauristring'), `${fileBase}.pdf`, {
      title: `JFlips invoice ${payment.invoice_id}`,
      text: `Hi ${name}, here is your JFlips invoice for ${payment.invoice_id}: ${rand(total)}.`
    });
  });
  const downloadImage = () => run('image', async () => {
    const root = sheetRef.current;
    if (!root) throw new Error('The invoice is not ready yet.');
    const dataUrl = await toPng(root, { backgroundColor: '#ffffff', pixelRatio: 2, cacheBust: true });
    await shareOrSaveFile(dataUrl, `${fileBase}.png`, { title: `JFlips invoice ${payment.invoice_id}` });
  });

  const whatsappMessage = () => {
    const bankLines = [
      bank.bankName && `Bank: ${bank.bankName}`,
      bank.accountNumber && `Account: ${bank.accountNumber}`,
      bank.branchCode && `Branch: ${bank.branchCode}`,
      bank.accountType && `Type: ${bank.accountType}`
    ].filter(Boolean);
    const text = [
      `Hi ${name}! 🤸`,
      '',
      `Here is your JFlips invoice for ${payment.invoice_id}: ${rand(total)}.`,
      '',
      'Banking details (EFT):',
      ...bankLines,
      '',
      `Please use ${name} as the payment reference.`,
      '',
      'Thank you!'
    ].join('\n');
    window.open(`https://wa.me/${phone ? cleanPhoneNumber(phone) : ''}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const scale = Math.min(1, (Math.min(typeof window !== 'undefined' ? window.innerWidth : 800, 900) - 56) / SHEET_WIDTH);

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-4xl bg-slate-100 dark:bg-slate-900 rounded-3xl shadow-2xl max-h-[94vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 p-4 px-5 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Archived invoice · {payment.invoice_id}</p>
            <h3 className="text-sm font-black uppercase italic text-slate-800 dark:text-white truncate">{name} · {rand(total)}</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"><X size={18} /></button>
        </div>

        <div className="flex flex-wrap gap-2 p-3 px-5 bg-white/60 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
          <button onClick={sharePdf} disabled={!!busy} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-green-600 text-white text-[10px] font-black uppercase tracking-wider disabled:opacity-60">
            {busy === 'share' ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Share PDF
          </button>
          <button onClick={downloadPdf} disabled={!!busy} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1e4da1] text-white text-[10px] font-black uppercase tracking-wider disabled:opacity-60">
            {busy === 'pdf' ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} Download PDF
          </button>
          <button onClick={downloadImage} disabled={!!busy} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-[10px] font-black uppercase tracking-wider disabled:opacity-60">
            {busy === 'image' ? <Loader2 size={13} className="animate-spin" /> : <FileImage size={13} />} Image
          </button>
          <button onClick={whatsappMessage} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-900/50 text-green-700 dark:text-green-400 text-[10px] font-black uppercase tracking-wider">
            <MessageCircle size={13} /> WhatsApp message
          </button>
        </div>

        {error && <p className="px-5 py-2 text-[11px] font-bold text-red-600 bg-red-50 dark:bg-red-900/20">{error}</p>}

        {mismatch && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-900/40">
            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-amber-700 dark:text-amber-300">
              <AlertTriangle size={13} /> The lines add up to {rand(linesTotal)} but the amount on record is {rand(total)}
            </span>
            {onFixAmount && (
              <button onClick={() => onFixAmount(payment.id, linesTotal)} className="px-2.5 py-1 rounded-md bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider">
                Set amount to {rand(linesTotal)}
              </button>
            )}
          </div>
        )}

        <div className="overflow-auto p-3 sm:p-5">
          <div style={{ width: SHEET_WIDTH, zoom: scale, margin: '0 auto' }} className="shadow-2xl">
            <InvoiceSheet
              ref={sheetRef}
              periodLabel={payment.invoice_id}
              billedTo={name}
              address={payment.bill_to_address}
              phone={payment.bill_to_phone}
              lines={sheetLines}
              total={total}
              bank={bank}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
