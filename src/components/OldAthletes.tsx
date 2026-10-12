import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Archive, ChevronDown, ChevronRight, FileText, RotateCcw, Trash2 } from 'lucide-react';
import { supabase } from '../../supabase';
import { shareOrSaveFile } from '../utils/shareFile';
import {
  OldAthleteRow, deleteOldAthlete, deleteOtherDetails, restoreAthlete
} from '../utils/oldAthletes';

/**
 * The archive of athletes who have left. Owner only. A removed child's record is moved
 * here, in two parts: the signed forms (kept until a set date) and everything else
 * (deleted 12 months after the child left). Nothing is deleted automatically: this list
 * shows what is due and the owner decides.
 */

const fmt = (d: string | null | undefined) =>
  d ? new Date(d.length === 10 ? d + 'T00:00:00' : d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
const todayIso = () => new Date().toISOString().slice(0, 10);

export const OldAthletes: React.FC<{ onChanged?: () => void }> = ({ onChanged }) => {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<OldAthleteRow[]>([]);
  const [loadError, setLoadError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('old_athletes').select('*').order('left_at', { ascending: false });
    if (error) {
      setLoadError(/old_athletes/.test(error.message) ? 'The old athletes list needs one database update (form_changes_oct2026.sql).' : error.message);
      return;
    }
    setLoadError('');
    setRows((data || []) as OldAthleteRow[]);
  }, []);

  useEffect(() => { load(); }, [load]);

  const due = useMemo(
    () => rows.filter(r => !r.profile_deleted_at && r.profile_delete_after && r.profile_delete_after <= todayIso()).length,
    [rows]
  );

  const run = async (id: string, fn: () => Promise<string | null>, after?: () => void) => {
    setBusyId(id);
    const err = await fn();
    setBusyId(null);
    if (err) { alert(err); return; }
    await load();
    after?.();
  };

  const downloadPdf = async (r: OldAthleteRow) => {
    const pdf = r.documents?.signed_pdf as string | undefined;
    if (!pdf) return;
    try { await shareOrSaveFile(pdf, r.documents.signed_pdf_file_name || `JFLIPS_signed_forms_${r.name || 'athlete'}.pdf`); }
    catch (e: any) { alert('Could not save the PDF: ' + (e?.message || e)); }
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full p-4 flex items-center justify-between gap-3 text-left">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
            <Archive size={18} />
          </div>
          <div>
            <h4 className="text-[10px] font-black uppercase text-[#1a1a1a] dark:text-slate-100 italic tracking-wider">Old athletes</h4>
            <p className="text-[8px] font-bold text-slate-400 uppercase">
              {rows.length} kept
              {due > 0 && <span className="text-red-500"> · {due} due for deletion</span>}
            </p>
          </div>
        </div>
        {open ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          {loadError && <p className="text-[10px] font-bold text-amber-600">{loadError}</p>}
          <p className="text-[10px] font-bold text-slate-500">
            When you remove an athlete, they come here. Their signed forms are kept until the date shown. Their other details can be deleted 12 months after they left. Invoices and payments stay where they are and are kept for 7 years.
          </p>

          {rows.length === 0 ? (
            <p className="py-4 text-center text-[10px] font-bold text-slate-400 uppercase">Nobody has been removed yet.</p>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto no-scrollbar">
              {rows.map(r => {
                const detailsDeleted = !!r.profile_deleted_at;
                const detailsDue = !detailsDeleted && !!r.profile_delete_after && r.profile_delete_after <= todayIso();
                const hasForms = !!r.documents?.indemnity_record || !!r.documents?.signed_pdf || (r.documents?.consent_records || []).length > 0;
                return (
                  <div key={r.id} className="p-3 bg-white dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-black uppercase italic text-slate-800 dark:text-slate-100 truncate">{r.name || 'Athlete'}</p>
                        <p className="text-[9px] font-bold text-slate-400">Left {fmt(r.left_at)}</p>
                      </div>
                      {detailsDue && <span className="px-2 py-0.5 rounded-md bg-red-600 text-white text-[8px] font-black uppercase tracking-wider shrink-0">Details due</span>}
                    </div>

                    <div className="text-[10px] font-bold text-slate-500 space-y-0.5">
                      <p>
                        Signed forms: {hasForms
                          ? (r.documents_keep_until ? `kept until ${fmt(r.documents_keep_until)}` : 'kept (date of birth missing, so no date was set)')
                          : 'none on record'}
                      </p>
                      <p className={detailsDue ? 'text-red-600' : ''}>
                        Other details: {detailsDeleted ? `deleted ${fmt(r.profile_deleted_at)}` : `delete from ${fmt(r.profile_delete_after)}`}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {r.documents?.signed_pdf && (
                        <button onClick={() => downloadPdf(r)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-[#1e4da1] dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 text-[9px] font-black uppercase tracking-wider">
                          <FileText size={11} /> Signed forms (PDF)
                        </button>
                      )}
                      {!detailsDeleted && (
                        <button disabled={busyId === r.id}
                          onClick={() => { if (window.confirm(`Put ${r.name || 'this athlete'} back as a current athlete?`)) run(r.id, () => restoreAthlete(r), onChanged); }}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900/50 text-[9px] font-black uppercase tracking-wider disabled:opacity-50">
                          <RotateCcw size={11} /> Put back
                        </button>
                      )}
                      {!detailsDeleted && (
                        <button disabled={busyId === r.id}
                          onClick={() => { if (window.confirm(`Delete everything about ${r.name || 'this athlete'} except the signed forms? This cannot be undone.`)) run(r.id, () => deleteOtherDetails(r.id)); }}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40 text-[9px] font-black uppercase tracking-wider disabled:opacity-50">
                          <Trash2 size={11} /> Delete other details
                        </button>
                      )}
                      <button disabled={busyId === r.id}
                        onClick={() => {
                          const early = r.documents_keep_until && r.documents_keep_until > todayIso();
                          const msg = early
                            ? `The signed forms for ${r.name || 'this athlete'} are meant to be kept until ${fmt(r.documents_keep_until)}. Delete everything now, including the signed forms? This cannot be undone.`
                            : `Delete everything about ${r.name || 'this athlete'}, including the signed forms? This cannot be undone.`;
                          if (window.confirm(msg)) run(r.id, () => deleteOldAthlete(r.id));
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 text-red-600 border border-red-200 dark:border-red-900/50 text-[9px] font-black uppercase tracking-wider disabled:opacity-50">
                        <Trash2 size={11} /> Delete everything
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
