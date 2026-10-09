import React, { useMemo, useState } from 'react';
import { Heart, Phone, Search, ShieldAlert, User, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppState, Student } from '../../types';
import { parentMustStay } from '../utils/youngAthlete';

/**
 * Setup → Students, as a coach sees it.
 *
 * A coach needs to know who is in front of them and who to call, not to manage
 * the client: no rates, no siblings, no invoices, no edit. The list shows each
 * child's name and first emergency contact; tapping a child opens a read-only
 * view with their age, emergency contacts and medical information.
 */

const ageOf = (s: Student): number | null => {
  const m = String(s.dob || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const born = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    const now = new Date();
    let a = now.getFullYear() - born.getFullYear();
    if (now.getMonth() < born.getMonth() || (now.getMonth() === born.getMonth() && now.getDate() < born.getDate())) a--;
    return a;
  }
  const n = typeof s.age === 'string' ? parseInt(s.age as any, 10) : s.age;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
};

/** Emergency contacts in the order a coach should try them. */
const contactsOf = (s: Student): { name: string; phone: string; label: string }[] => {
  const list = [
    { name: s.parent1_name || '', phone: s.parent1_phone || s.phone || '', label: 'Emergency contact 1' },
    { name: s.parent2_name || '', phone: s.parent2_phone || '', label: 'Emergency contact 2' }
  ];
  return list.filter(c => c.name || c.phone);
};

const telHref = (p: string) => `tel:${p.replace(/[^\d+]/g, '')}`;

export const CoachStudentList: React.FC<{ state: AppState }> = ({ state }) => {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<Student | null>(null);

  const students = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (state.students || [])
      .filter(s => !s.is_gym_member)                       // tumbling students only
      .filter(s => !q || s.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [state.students, search]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-black text-[#1a1a1a] dark:text-slate-100 uppercase italic">Students</h2>
        <p className="text-[8px] font-black text-[#94a3b8] uppercase">Tap a student to see their emergency contacts and medical information</p>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]" size={16} />
        <input
          type="text" placeholder="Search students..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full bg-white dark:bg-slate-800 border-none rounded-xl py-3 pl-11 pr-4 text-xs font-bold shadow-sm outline-none dark:text-slate-200"
        />
      </div>

      {students.length === 0 ? (
        <p className="py-10 text-center text-xs font-bold text-slate-400 uppercase">No students to show.</p>
      ) : (
        <div className="space-y-3 pb-20">
          {students.map((s, idx) => {
            const first = contactsOf(s)[0];
            return (
              <button
                key={`coach-student-${s.id}-${idx}`}
                onClick={() => setOpen(s)}
                className="w-full text-left p-4 bg-white dark:bg-slate-800/60 border border-slate-50 dark:border-slate-800 rounded-2xl shadow-sm hover:border-blue-200 dark:hover:border-blue-900 transition-colors flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm italic shrink-0 bg-[#eff6ff] dark:bg-blue-900/30 text-[#1e4da1] dark:text-blue-400">
                    {s.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-black text-[#1a1a1a] dark:text-slate-100 uppercase italic truncate">{s.name}</p>
                      {parentMustStay(s) && (
                        <span className="px-1.5 py-0.5 rounded-md bg-orange-500 text-white text-[7px] font-black uppercase tracking-wider not-italic">Parent must stay</span>
                      )}
                    </div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase truncate">
                      {first ? `${first.name || 'Emergency contact'}${first.phone ? ` · ${first.phone}` : ''}` : 'No emergency contact saved'}
                    </p>
                  </div>
                </div>
                {s.medical_notes && s.medical_notes.trim() && !/^none\b/i.test(s.medical_notes.trim()) && (
                  <span className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-[8px] font-black uppercase tracking-wider">
                    <Heart size={10} /> Medical
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(null)}>
            <motion.div
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between p-5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-[#1e3a6e] text-white flex items-center justify-center"><User size={20} /></div>
                  <div>
                    <h3 className="text-lg font-black uppercase italic text-slate-900 dark:text-white">{open.name}</h3>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {ageOf(open) !== null ? `Age ${ageOf(open)}` : 'Age not recorded'}
                    </p>
                  </div>
                </div>
                <button onClick={() => setOpen(null)} className="p-2 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18} /></button>
              </div>

              <div className="p-5 space-y-5">
                {parentMustStay(open) && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/40">
                    <ShieldAlert size={16} className="text-orange-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] font-bold text-orange-700 dark:text-orange-300">
                      A parent or responsible adult must stay at or near the venue for the whole class.
                    </p>
                  </div>
                )}

                <section className="space-y-2">
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-400">Emergency contacts</h4>
                  {contactsOf(open).length === 0 ? (
                    <p className="text-xs font-bold text-slate-400">No emergency contact saved.</p>
                  ) : contactsOf(open).map((c, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                      <div className="min-w-0">
                        <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">{c.label}</p>
                        <p className="text-sm font-black text-slate-800 dark:text-slate-100 truncate">{c.name || 'Name not saved'}</p>
                        <p className="text-xs font-bold text-slate-500">{c.phone || 'No number saved'}</p>
                      </div>
                      {c.phone && (
                        <a href={telHref(c.phone)} className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider">
                          <Phone size={12} /> Call
                        </a>
                      )}
                    </div>
                  ))}
                </section>

                <section className="space-y-2">
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-400">Medical conditions, injuries and allergies</h4>
                  <div className={`p-3 rounded-xl text-sm font-bold whitespace-pre-wrap ${
                    open.medical_notes && open.medical_notes.trim() && !/^none\b/i.test(open.medical_notes.trim())
                      ? 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 border border-red-100 dark:border-red-900/40'
                      : 'bg-slate-50 dark:bg-slate-800/50 text-slate-500'
                  }`}>
                    {open.medical_notes && open.medical_notes.trim() ? open.medical_notes : 'None recorded.'}
                  </div>
                </section>

                {open.young_athlete && (
                  <section className="space-y-2">
                    <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-400">Young athlete</h4>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                      <p>
                        <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 block">Adult at the venue</span>
                        {[open.young_athlete.adultName, open.young_athlete.adultPhone].filter(Boolean).join(' · ') || 'A parent'}
                      </p>
                      {(open.young_athlete.collectors || []).length > 0 && (
                        <p>
                          <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 block">May collect the child</span>
                          {(open.young_athlete.collectors || []).map(c => `${c.name}${c.phone ? ` (${c.phone})` : ''}`).join('; ')}
                        </p>
                      )}
                      {open.young_athlete.notes && (
                        <p>
                          <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 block">Coaches should know</span>
                          {open.young_athlete.notes}
                        </p>
                      )}
                    </div>
                  </section>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
