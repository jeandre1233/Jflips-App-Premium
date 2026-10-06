import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, Download, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../supabase';
import { AppState } from '../../types';

/**
 * Management → Incidents.
 * A short written record of every injury or incident: what happened, what was
 * done, who was told. It protects the children and the business if a parent ever
 * asks, and it is what an insurer or a school will want to see.
 *
 * Coaches can log and read incidents; only the owner can delete one.
 */

interface Incident {
  id: string;
  user_id: string;
  incident_date: string;
  incident_time: string | null;
  venue: string | null;
  class_name: string | null;
  athlete_names: string | null;
  description: string;
  injury_treatment: string | null;
  first_aid_by: string | null;
  emergency_services: boolean;
  parent_notified: boolean;
  parent_notified_note: string | null;
  follow_up: string | null;
  reported_by: string | null;
  reported_by_name: string | null;
  created_at: string;
}

const today = () => new Date().toISOString().slice(0, 10);
const EMPTY = {
  incident_date: today(), incident_time: '', venue: '', class_name: '', athlete_names: '',
  description: '', injury_treatment: '', first_aid_by: '',
  emergency_services: false, parent_notified: false, parent_notified_note: '', follow_up: ''
};

const field = 'w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-medium outline-none focus:border-blue-500 dark:text-white';
const lab = 'text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1 block';

export const IncidentLog: React.FC<{ state: AppState; userId?: string }> = ({ state, userId }) => {
  const isOwner = state.profile.role === 'owner';
  const ownerId = isOwner ? userId : state.profile.owner_id;
  const [items, setItems] = useState<Incident[]>([]);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error: e } = await supabase.from('incident_reports').select('*')
      .order('incident_date', { ascending: false }).order('created_at', { ascending: false });
    if (e) {
      setError(/incident_reports/.test(e.message) ? 'The incident log needs one database update (incident_log.sql).' : e.message);
      return;
    }
    setError('');
    setItems((data || []) as Incident[]);
  }, []);

  useEffect(() => { load(); }, [load]);

  const suggestions = useMemo(() => ({
    classes: Array.from(new Set([...(state.classTypes || []).map(c => c.name), ...(state.gyms || []).map(g => g.name)])),
    athletes: (state.students || []).filter(s => !s.is_gym_member).map(s => s.name)
  }), [state.classTypes, state.gyms, state.students]);

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }));

  const save = async () => {
    if (!ownerId) { setError('Could not work out whose business this is. Please sign in again.'); return; }
    if (!form.description.trim()) { setError('Please describe what happened.'); return; }
    if (!form.athlete_names.trim()) { setError('Please say who was involved.'); return; }
    setSaving(true); setError('');
    const me = (await supabase.auth.getUser()).data.user;
    const { error: e } = await supabase.from('incident_reports').insert({
      user_id: ownerId,
      incident_date: form.incident_date || today(),
      incident_time: form.incident_time.trim() || null,
      venue: form.venue.trim() || null,
      class_name: form.class_name.trim() || null,
      athlete_names: form.athlete_names.trim(),
      description: form.description.trim(),
      injury_treatment: form.injury_treatment.trim() || null,
      first_aid_by: form.first_aid_by.trim() || null,
      emergency_services: form.emergency_services,
      parent_notified: form.parent_notified,
      parent_notified_note: form.parent_notified_note.trim() || null,
      follow_up: form.follow_up.trim() || null,
      reported_by: me?.id || null,
      reported_by_name: state.profile.name || me?.email || null
    });
    setSaving(false);
    if (e) { setError(e.message); return; }
    setForm({ ...EMPTY, incident_date: today() });
    setAdding(false);
    await load();
  };

  const remove = async (id: string) => {
    const { error: e } = await supabase.from('incident_reports').delete().eq('id', id);
    setConfirmDelete(null);
    if (e) { setError(e.message); return; }
    setItems(list => list.filter(i => i.id !== id));
  };

  const exportCsv = () => {
    const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const head = ['Date', 'Time', 'Venue', 'Class', 'Who was involved', 'What happened', 'Injury and treatment', 'First aid by',
      'Emergency services called', 'Parent told', 'How / when parent was told', 'Follow-up', 'Reported by'];
    const rows = items.map(i => [i.incident_date, i.incident_time, i.venue, i.class_name, i.athlete_names, i.description,
      i.injury_treatment, i.first_aid_by, i.emergency_services ? 'Yes' : 'No', i.parent_notified ? 'Yes' : 'No',
      i.parent_notified_note, i.follow_up, i.reported_by_name].map(q).join(','));
    const blob = new Blob(['﻿' + [head.map(q).join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `jflips_incident_log_${today()}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-2xl font-black uppercase italic text-[#1a1a1a] dark:text-white">Incident Log</h3>
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
            Write down every injury or incident, even a small one
          </p>
        </div>
        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <button onClick={exportCsv} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-wider">
              <Download size={13} /> Export CSV
            </button>
          )}
          <button onClick={() => { setAdding(a => !a); setError(''); }} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1e4da1] text-white text-[10px] font-black uppercase tracking-wider shadow-md">
            <Plus size={14} /> {adding ? 'Close' : 'Log incident'}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 text-[11px] font-bold text-amber-700 dark:text-amber-300">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" /> {error}
        </div>
      )}

      {adding && (
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lab}>Date *</label><input type="date" className={field} value={form.incident_date} onChange={set('incident_date')} /></div>
            <div><label className={lab}>Time</label><input type="time" className={field} value={form.incident_time} onChange={set('incident_time')} /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className={lab}>Venue</label><input className={field} value={form.venue} onChange={set('venue')} placeholder="e.g. school hall" /></div>
            <div><label className={lab}>Class or team</label><input className={field} list="incident-classes" value={form.class_name} onChange={set('class_name')} />
              <datalist id="incident-classes">{suggestions.classes.map(c => <option key={c} value={c} />)}</datalist></div>
          </div>
          <div><label className={lab}>Who was involved *</label><input className={field} list="incident-athletes" value={form.athlete_names} onChange={set('athlete_names')} placeholder="Name of the child (and anyone else)" />
            <datalist id="incident-athletes">{suggestions.athletes.map(a => <option key={a} value={a} />)}</datalist></div>
          <div><label className={lab}>What happened *</label><textarea className={`${field} min-h-[80px]`} value={form.description} onChange={set('description')} /></div>
          <div><label className={lab}>Injury and treatment given</label><textarea className={`${field} min-h-[60px]`} value={form.injury_treatment} onChange={set('injury_treatment')} placeholder="e.g. sprained wrist, ice and rest" /></div>
          <div><label className={lab}>First aid given by</label><input className={field} value={form.first_aid_by} onChange={set('first_aid_by')} placeholder="e.g. Jeandre, or the school's first aider" /></div>
          <div className="flex flex-wrap gap-5">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
              <input type="checkbox" checked={form.emergency_services} onChange={set('emergency_services')} className="accent-[#1e4da1] w-4 h-4" /> Ambulance or doctor called
            </label>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
              <input type="checkbox" checked={form.parent_notified} onChange={set('parent_notified')} className="accent-[#1e4da1] w-4 h-4" /> Parent was told
            </label>
          </div>
          {form.parent_notified && (
            <div><label className={lab}>How and when the parent was told</label><input className={field} value={form.parent_notified_note} onChange={set('parent_notified_note')} placeholder="e.g. phoned at 16:20" /></div>
          )}
          <div><label className={lab}>Follow-up</label><textarea className={`${field} min-h-[50px]`} value={form.follow_up} onChange={set('follow_up')} placeholder="e.g. checked on child next day, doctor's note received" /></div>
          <button onClick={save} disabled={saving} className="w-full py-3 rounded-xl bg-[#1e4da1] text-white text-[11px] font-black uppercase tracking-wider disabled:opacity-60">
            {saving ? 'Saving...' : 'Save incident'}
          </button>
        </div>
      )}

      {items.length === 0 && !error ? (
        <p className="py-10 text-center text-xs font-bold text-slate-400 uppercase">No incidents logged. That's what we like to see.</p>
      ) : (
        <div className="space-y-2">
          {items.map(i => {
            const open = openId === i.id;
            return (
              <div key={i.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <button onClick={() => setOpenId(open ? null : i.id)} className="w-full p-4 flex items-center justify-between gap-3 text-left">
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase text-slate-800 dark:text-slate-100 truncate">{i.athlete_names}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase truncate">
                      {new Date(i.incident_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {i.class_name ? ` · ${i.class_name}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {i.emergency_services && <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-700 text-[8px] font-black uppercase">Emergency</span>}
                    {!i.parent_notified && <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 text-[8px] font-black uppercase">Parent not told</span>}
                    {open ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                  </div>
                </button>
                {open && (
                  <div className="px-4 pb-4 pt-0 space-y-2 text-xs text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800">
                    {([
                      ['Time', i.incident_time], ['Venue', i.venue], ['What happened', i.description],
                      ['Injury and treatment', i.injury_treatment], ['First aid by', i.first_aid_by],
                      ['Emergency services', i.emergency_services ? 'Called' : 'Not needed'],
                      ['Parent told', i.parent_notified ? (i.parent_notified_note || 'Yes') : 'No'],
                      ['Follow-up', i.follow_up], ['Logged by', i.reported_by_name]
                    ] as [string, string | null][]).filter(([, v]) => v).map(([k, v]) => (
                      <p key={k} className="pt-2"><span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">{k}</span>{v}</p>
                    ))}
                    {isOwner && (
                      confirmDelete === i.id ? (
                        <div className="flex items-center gap-2 pt-2">
                          <button onClick={() => remove(i.id)} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-[10px] font-black uppercase">Yes, delete</button>
                          <button onClick={() => setConfirmDelete(null)} className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 text-[10px] font-black uppercase">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDelete(i.id)} className="flex items-center gap-1 pt-2 text-[10px] font-black uppercase tracking-wider text-red-500">
                          <Trash2 size={12} /> Delete
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
