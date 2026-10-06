import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Copy, FileText, MessageCircle, ShieldCheck } from 'lucide-react';
import { supabase } from '../../supabase';
import { AppState, Student } from '../../types';
import {
  ConsentRecord, consentUrl, generateConsentPdf, newConsentToken, statusLabel
} from '../utils/consentForms';
import { cleanPhoneNumber } from '../utils/whatsapp';

/**
 * Setup → Clients → "Consent forms (POPIA)".
 * One row per FAMILY (siblings share a groupKey, so a parent signs once). The
 * owner sends each family its own personal link by WhatsApp and sees at a glance
 * who has signed the privacy notice and the photo/video consent, and who must
 * not be posted.
 */

type Filter = 'all' | 'notSent' | 'waiting' | 'signed' | 'doNotPost' | 'photosOk' | 'videosOk';

interface Family {
  key: string;
  parent: string;
  phone: string;
  kids: string[];
  firstNames: string[];
}

const chip = (r?: ConsentRecord) => {
  const s = statusLabel(r);
  const cls =
    s === 'Signed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/40'
    : s === 'Withdrawn' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/40'
    : s === 'Waiting' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/40'
    : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
  return cls;
};

export const ConsentManager: React.FC<{ state: AppState }> = ({ state }) => {
  const ownerId = state.profile.id;
  const [open, setOpen] = useState(false);
  const [records, setRecords] = useState<ConsentRecord[]>([]);
  const [loadError, setLoadError] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('consent_records').select('*');
    if (error) {
      setLoadError(/consent_records/.test(error.message)
        ? 'Consent tracking needs one database update (consent_setup.sql).'
        : error.message);
      return;
    }
    setLoadError('');
    setRecords((data || []) as ConsentRecord[]);
  }, []);

  useEffect(() => { if (open) load(); }, [open, load]);

  const families = useMemo<Family[]>(() => {
    const map = new Map<string, Student[]>();
    // Tumbling clients only: exactly the people listed under Clients. School and
    // team athletes (is_gym_member) belong to the schools, not to JFlips.
    (state.students || []).filter(s => !s.is_gym_member).forEach(s => {
      const key = s.groupKey || s.id;
      map.set(key, [...(map.get(key) || []), s]);
    });
    return Array.from(map.entries()).map(([key, kids]) => {
      const withParent = kids.find(k => k.parent1_name) || kids[0];
      const phone = kids.map(k => k.parent1_phone || k.parent2_phone || k.phone).find(Boolean) || '';
      return {
        key,
        parent: withParent.parent1_name || withParent.name,
        phone,
        kids: kids.map(k => k.name),
        firstNames: kids.map(k => (k.first_name || k.name.split(' ')[0] || k.name).trim())
      };
    }).sort((a, b) => a.parent.localeCompare(b.parent));
  }, [state.students]);

  const recFor = (famKey: string, kind: 'general' | 'media') =>
    records.find(r => r.family_key === famKey && r.kind === kind);

  const doNotPost = (m?: ConsentRecord) =>
    !!m && (m.status === 'withdrawn' || (m.status === 'signed' && m.choices?.instagramFacebookPhotos === false && m.choices?.instagramFacebookVideos === false));
  const limited = (m?: ConsentRecord) =>
    !!m && m.status === 'signed' && !doNotPost(m) && Object.values(m.choices || {}).some(v => v === false);

  const matches = (f: Family) => {
    const g = recFor(f.key, 'general'); const m = recFor(f.key, 'media');
    switch (filter) {
      case 'notSent': return !g && !m;
      case 'waiting': return (!!g || !!m) && (g?.status === 'pending' || m?.status === 'pending');
      case 'signed': return g?.status === 'signed' && m?.status === 'signed';
      case 'doNotPost': return doNotPost(m);
      case 'photosOk': return m?.status === 'signed' && m.choices?.instagramFacebookPhotos === true;
      case 'videosOk': return m?.status === 'signed' && m.choices?.instagramFacebookVideos === true;
      default: return true;
    }
  };

  const counts = useMemo(() => {
    let signed = 0, waiting = 0, notSent = 0, dnp = 0;
    families.forEach(f => {
      const g = recFor(f.key, 'general'); const m = recFor(f.key, 'media');
      if (g?.status === 'signed' && m?.status === 'signed') signed++;
      else if (!g && !m) notSent++;
      else waiting++;
      if (doNotPost(m)) dnp++;
    });
    return { signed, waiting, notSent, dnp };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [families, records]);

  /** Make sure this family has its two rows and return the shared link code. */
  const ensureLink = async (f: Family): Promise<string | null> => {
    const existing = records.find(r => r.family_key === f.key);
    if (existing) return existing.token;
    if (!ownerId) return null;
    const token = newConsentToken();
    const base = {
      user_id: ownerId, family_key: f.key, token, status: 'pending',
      family_label: f.parent, child_first_names: f.firstNames,
      parent_name: f.parent, parent_phone: f.phone, source: 'admin_link'
    };
    const { error } = await supabase.from('consent_records').insert([
      { ...base, kind: 'general' }, { ...base, kind: 'media' }
    ]);
    if (error) { alert('Could not create the link: ' + error.message); return null; }
    await load();
    return token;
  };

  const send = async (f: Family) => {
    setBusyKey(f.key);
    const token = await ensureLink(f);
    setBusyKey(null);
    if (!token) return;
    const link = consentUrl(token);
    const text = `Hi ${f.parent}! 🤸\n\nJFlips needs your consent on two short POPIA forms for ${f.firstNames.join(' & ')}: our privacy notice, and permission for photos and videos. It takes about 2 minutes:\n\n${link}\n\nThank you!`;
    const phone = f.phone ? cleanPhoneNumber(f.phone) : '';
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const copy = async (f: Family) => {
    setBusyKey(f.key);
    const token = await ensureLink(f);
    setBusyKey(null);
    if (!token) return;
    try {
      await navigator.clipboard.writeText(consentUrl(token));
      setCopiedKey(f.key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch { alert(consentUrl(token)); }
  };

  const pdf = (f: Family, r: ConsentRecord) => {
    generateConsentPdf({
      kind: r.kind, lang: 'en', childNames: f.kids.join(' & '),
      parentName: r.parent_name || f.parent, parentPhone: r.parent_phone || '', parentEmail: r.parent_email || '',
      relationship: r.details?.relationship, schoolGrade: r.details?.school_grade,
      choices: r.choices, signature: r.signature_data, signedAt: r.signed_at,
      version: r.form_version, status: r.status
    });
  };

  const filters: [Filter, string][] = [
    ['all', 'All'], ['notSent', 'Not sent'], ['waiting', 'Waiting'], ['signed', 'Signed'],
    ['photosOk', 'OK to post photos'], ['videosOk', 'OK to post videos'], ['doNotPost', 'Do not post']
  ];
  const shown = families.filter(matches);

  return (
    <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full p-4 flex items-center justify-between gap-3 text-left">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <ShieldCheck size={18} />
          </div>
          <div>
            <h4 className="text-[10px] font-black uppercase text-[#1a1a1a] dark:text-slate-100 italic tracking-wider">Consent Forms (POPIA)</h4>
            <p className="text-[8px] font-bold text-slate-400 uppercase">
              {counts.signed} signed · {counts.waiting} waiting · {counts.notSent} not sent
              {counts.dnp > 0 && <span className="text-red-500"> · {counts.dnp} do not post</span>}
            </p>
          </div>
        </div>
        {open ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          {loadError && <p className="text-[10px] font-bold text-amber-600">{loadError}</p>}

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {filters.map(([k, label]) => (
              <button key={k} onClick={() => setFilter(k)}
                className={`px-2.5 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-wider shrink-0 border ${
                  filter === k ? (k === 'doNotPost' ? 'bg-red-600 text-white border-red-600' : 'bg-[#1e4da1] text-white border-[#1e4da1]')
                  : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'}`}>
                {label}
              </button>
            ))}
          </div>

          {shown.length === 0 ? (
            <p className="py-4 text-center text-[10px] font-bold text-slate-400 uppercase">Nobody matches this filter.</p>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto no-scrollbar">
              {shown.map(f => {
                const g = recFor(f.key, 'general'); const m = recFor(f.key, 'media');
                return (
                  <div key={f.key} className="p-3 bg-white dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-black uppercase italic text-slate-800 dark:text-slate-100 truncate">{f.parent}</p>
                        <p className="text-[9px] font-bold text-slate-400 truncate">{f.kids.join(' & ')}{!f.phone && ' · no phone saved'}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {doNotPost(m) && <span className="px-2 py-0.5 rounded-md bg-red-600 text-white text-[8px] font-black uppercase tracking-wider">Do not post</span>}
                        {limited(m) && <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 text-[8px] font-black uppercase tracking-wider">Limited</span>}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`px-2 py-1 rounded-md border text-[8px] font-black uppercase tracking-wider ${chip(g)}`}>Privacy: {statusLabel(g)}</span>
                      <span className={`px-2 py-1 rounded-md border text-[8px] font-black uppercase tracking-wider ${chip(m)}`}>Photos: {statusLabel(m)}</span>
                      {m?.status === 'signed' && (
                        <span className="text-[8px] font-bold text-slate-400 uppercase">
                          {[
                            m.choices?.instagramFacebookPhotos ? 'photos' : null,
                            m.choices?.instagramFacebookVideos ? 'videos' : null,
                            m.choices?.firstNameOnly ? 'first name' : null,
                            m.choices?.website ? 'website' : null,
                            m.choices?.printedMaterial ? 'print' : null
                          ].filter(Boolean).join(', ') || 'no uses'}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <button onClick={() => send(f)} disabled={busyKey === f.key}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900/50 text-[9px] font-black uppercase tracking-wider disabled:opacity-50">
                        <MessageCircle size={11} /> {g || m ? 'Resend link' : 'Send link'}
                      </button>
                      <button onClick={() => copy(f)} disabled={busyKey === f.key}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[9px] font-black uppercase tracking-wider disabled:opacity-50">
                        <Copy size={11} /> {copiedKey === f.key ? 'Copied' : 'Copy link'}
                      </button>
                      {[g, m].map(r => r && r.status !== 'pending' && r.signature_data && (
                        <button key={r.kind} onClick={() => pdf(f, r)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-[#1e4da1] dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 text-[9px] font-black uppercase tracking-wider">
                          <FileText size={11} /> {r.kind === 'general' ? 'Privacy PDF' : 'Photo PDF'}
                        </button>
                      ))}
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
