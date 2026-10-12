import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../../supabase';
import { GeneralConsentSection, MediaConsentSection } from '../components/ConsentSections';
import {
  ConsentKind, GENERAL_VERSION, MEDIA_KEYS, MEDIA_VERSION, MediaKey, generateConsentPdf, mediaFormFor, uiFor
} from '../utils/consentForms';
import type { Audience } from '../utils/indemnityText';

/**
 * Public page behind a family's personal link: /#/consent/<token>.
 * It never lists anything. It can only read and write the rows its own token
 * unlocks, through the get_consent_by_token / submit_consent functions.
 */

interface Row {
  kind: ConsentKind; status: 'pending' | 'signed' | 'withdrawn';
  child_first_names: string[] | null;
  parent_name: string | null; parent_phone: string | null; parent_email: string | null;
  details: { relationship?: string; school_grade?: string; audience?: Audience } | null;
  choices: Record<string, boolean> | null;
  form_version: string | null; signed_at: string | null;
}

const input: React.CSSProperties = { width: '100%', padding: '12px 14px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box' };
const label: React.CSSProperties = { fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#64748b', display: 'block', marginBottom: '4px' };
const primary = (disabled: boolean): React.CSSProperties => ({ width: '100%', padding: '16px', background: disabled ? '#93c5fd' : 'linear-gradient(135deg, #1e4da1, #1e3a6e)', color: 'white', border: 'none', borderRadius: '14px', fontSize: '13px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', cursor: disabled ? 'not-allowed' : 'pointer' });

export default function Consent() {
  const { token = '' } = useParams();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [invalid, setInvalid] = useState(false);
  // An adult participant (18+) signs for themselves; under 18 a parent or guardian signs.
  const audience: Audience =
    rows.general?.details?.audience === 'adult' || rows.media?.details?.audience === 'adult' ? 'adult' : 'minor';
  const ui = uiFor(audience);

  const [parent, setParent] = useState({ name: '', relationship: '', phone: '', email: '' });

  const [gAgreed, setGAgreed] = useState(false);
  const [gSig, setGSig] = useState('');
  const [gClear, setGClear] = useState(0);
  const [mChoices, setMChoices] = useState<Partial<Record<MediaKey, boolean>>>({});
  const [mSig, setMSig] = useState('');
  const [mClear, setMClear] = useState(0);

  const [busy, setBusy] = useState<ConsentKind | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [errs, setErrs] = useState<Record<string, boolean>>({});
  const [justSigned, setJustSigned] = useState<Record<string, { sig: string; at: string }>>({});

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !token || token.length < 24) { setInvalid(true); setLoading(false); return; }
    const { data, error: e } = await supabase.rpc('get_consent_by_token', { p_token: token });
    if (e || !data || data.length === 0) { setInvalid(true); setLoading(false); return; }
    const byKind: Record<string, Row> = {};
    (data as Row[]).forEach(r => { byKind[r.kind] = r; });
    setRows(byKind);
    const any = (data as Row[])[0];
    setParent(p => ({
      name: p.name || any.parent_name || '',
      relationship: p.relationship || any.details?.relationship || '',
      phone: p.phone || any.parent_phone || '',
      email: p.email || any.parent_email || ''
    }));
    if (byKind.media?.status === 'signed' || byKind.media?.status === 'withdrawn') {
      const c: Partial<Record<MediaKey, boolean>> = {};
      MEDIA_KEYS.forEach(k => { if (typeof byKind.media.choices?.[k] === 'boolean') c[k] = byKind.media.choices![k]; });
      setMChoices(prev => (Object.keys(prev).length ? prev : c));
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const childNames = (rows.general?.child_first_names || rows.media?.child_first_names || []).join(' & ');

  const common = () => {
    if (parent.name.trim().length < 2) { setError(ui.needName); return false; }
    return true;
  };

  const submit = async (kind: ConsentKind) => {
    setError(''); setMessage(''); setErrs({});
    if (!common()) return;
    const sig = kind === 'general' ? gSig : mSig;
    let choices: Record<string, boolean>;
    if (kind === 'general') {
      if (!gAgreed) { setErrs({ agree: true }); setError(ui.needAgree); return; }
      choices = { agreed: true };
    } else {
      if (!MEDIA_KEYS.every(k => typeof mChoices[k] === 'boolean')) { setErrs({ choices: true }); setError(ui.needAll); return; }
      choices = mChoices as Record<string, boolean>;
    }
    if (!sig) { setErrs({ [`sig-${kind}`]: true }); setError(ui.needSignature); return; }

    setBusy(kind);
    const { error: e } = await supabase.rpc('submit_consent', {
      p_token: token, p_kind: kind,
      p_parent_name: parent.name.trim(), p_parent_phone: parent.phone.trim(), p_parent_email: parent.email.trim(),
      p_details: { relationship: parent.relationship.trim() || (audience === 'adult' ? 'Self (adult participant)' : '') },
      p_choices: choices, p_signature: sig, p_language: 'en',
      p_form_version: kind === 'general' ? GENERAL_VERSION : MEDIA_VERSION, p_withdraw: false
    });
    setBusy(null);
    if (e) { setError(e.message || 'Something went wrong. Please try again.'); return; }
    setJustSigned(s => ({ ...s, [kind]: { sig, at: new Date().toISOString() } }));
    setMessage(ui.saved);
    await load();
  };

  const download = (kind: ConsentKind) => {
    const js = justSigned[kind];
    const row = rows[kind];
    generateConsentPdf({
      kind, lang: 'en', childNames,
      parentName: parent.name, parentPhone: parent.phone, parentEmail: parent.email,
      relationship: parent.relationship || (audience === 'adult' ? 'Self (adult participant)' : ''),
      audience,
      choices: kind === 'media' ? (mChoices as Record<string, boolean>) : { agreed: true },
      signature: js?.sig, signedAt: js?.at || row?.signed_at,
      version: row?.form_version, status: row?.status
    });
  };

  const shell = (children: React.ReactNode) => (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e3a6e 60%, #1e4da1 100%)', fontFamily: 'Inter, sans-serif', padding: '24px 16px 48px' }}>
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '30px', fontWeight: 900, fontStyle: 'italic', color: 'white', lineHeight: 1 }}>JFLIPS</div>
          <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '3px', color: '#93c5fd', marginTop: '4px' }}>Cheer & Tumbling</div>
        </div>
        {children}
      </div>
    </div>
  );

  if (loading) return shell(<p style={{ color: 'white', textAlign: 'center' }}>{ui.loading}</p>);
  if (invalid) return shell(
    <div style={{ background: 'white', borderRadius: '20px', padding: '32px', textAlign: 'center', color: '#475569' }}>
      <h2 style={{ color: '#ef4444', fontWeight: 900, marginBottom: '8px' }}>INVALID LINK</h2>
      <p style={{ fontSize: '14px' }}>{ui.invalidLink}</p>
    </div>
  );

  const stateTag = (r?: Row) => {
    const text = !r || r.status === 'pending' ? ui.pending : r.status === 'signed' ? ui.alreadySigned : ui.withdrawn;
    const color = r?.status === 'signed' ? '#16a34a' : r?.status === 'withdrawn' ? '#b91c1c' : '#d97706';
    return <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color, background: color + '18', padding: '3px 10px', borderRadius: '999px' }}>{text}</span>;
  };

  const anyPending = Object.values(rows).some(r => r.status === 'pending');
  const signedOn = (r: Row) => {
    const when = r.signed_at ? new Date(r.signed_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    return `${r.status === 'withdrawn' ? 'Consent withdrawn' : 'Signed'}${when ? ` on ${when}` : ''}${r.form_version ? ` (version ${r.form_version})` : ''}.`;
  };
  const lockedText: React.CSSProperties = { margin: 0, fontSize: '13px', color: '#475569', lineHeight: 1.6 };

  const section = (title: string, tag: React.ReactNode, body: React.ReactNode) => (
    <div style={{ background: 'white', borderRadius: '20px', padding: '22px 20px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: '#1e4da1' }}>{title}</span>
        {tag}
      </div>
      {body}
    </div>
  );

  return shell(
    <>
      <div style={{ textAlign: 'center', color: 'white', marginBottom: '18px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 900, margin: '0 0 4px' }}>{ui.pageTitle}</h1>
        {childNames && <p style={{ fontSize: '13px', color: '#93c5fd', margin: 0 }}>{ui.familyOf} {childNames}</p>}
      </div>

      {anyPending && section(ui.parentHeading, null, (
        <>
          <div><label style={label}>{ui.fullName} *</label><input style={input} value={parent.name} onChange={e => setParent({ ...parent, name: e.target.value })} /></div>
          <div><label style={label}>{ui.relationship}</label><input style={input} value={parent.relationship} onChange={e => setParent({ ...parent, relationship: e.target.value })} /></div>
          <div><label style={label}>{ui.cell}</label><input style={input} type="tel" value={parent.phone} onChange={e => setParent({ ...parent, phone: e.target.value })} /></div>
          <div><label style={label}>{ui.email}</label><input style={input} type="email" value={parent.email} onChange={e => setParent({ ...parent, email: e.target.value })} /></div>
        </>
      ))}

      {rows.general && section(ui.step1, stateTag(rows.general), rows.general.status !== 'pending' ? (
        <>
          <p style={lockedText}>{signedOn(rows.general)}</p>
          <p style={{ ...lockedText, fontSize: '12px', color: '#64748b' }}>To change anything on this form, message JFLIPS on WhatsApp 069 040 3387.</p>
          {justSigned.general && (
            <button onClick={() => download('general')} style={{ ...primary(false), background: 'white', color: '#1e4da1', border: '2px solid #1e4da1' }}>{ui.downloadPdf}</button>
          )}
        </>
      ) : (
        <>
          <GeneralConsentSection
            agreed={gAgreed} onAgree={setGAgreed}
            signed={!!gSig} onSign={d => { setGSig(d); }} clearKey={gClear} onClear={() => { setGSig(''); setGClear(c => c + 1); }}
            errorAgree={errs.agree} errorSignature={errs['sig-general']} audience={audience}
          />
          <button style={primary(busy === 'general')} disabled={busy === 'general'} onClick={() => submit('general')}>
            {busy === 'general' ? '...' : ui.submitGeneral}
          </button>
        </>
      ))}

      {rows.media && section(ui.step2, stateTag(rows.media), rows.media.status !== 'pending' ? (
        <>
          <p style={lockedText}>{signedOn(rows.media)}</p>
          {(() => {
            const f = mediaFormFor(audience, rows.media.form_version);
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {MEDIA_KEYS.map(k => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '12px', color: '#1e293b', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                    <span>{f.uses[k]}</span>
                    <strong style={{ color: rows.media!.choices?.[k] ? '#166534' : '#991b1b', flexShrink: 0 }}>{rows.media!.choices?.[k] ? f.yes : f.no}</strong>
                  </div>
                ))}
              </div>
            );
          })()}
          <p style={{ ...lockedText, fontSize: '12px', color: '#64748b' }}>{ui.changeChoices}</p>
          {justSigned.media && (
            <button onClick={() => download('media')} style={{ ...primary(false), background: 'white', color: '#1e4da1', border: '2px solid #1e4da1' }}>{ui.downloadPdf}</button>
          )}
        </>
      ) : (
        <>
          <MediaConsentSection
            choices={mChoices} onChoice={(k, v) => setMChoices(c => ({ ...c, [k]: v }))}
            signed={!!mSig} onSign={d => setMSig(d)} clearKey={mClear} onClear={() => { setMSig(''); setMClear(c => c + 1); }}
            errorChoices={errs.choices} errorSignature={errs['sig-media']} audience={audience}
          />
          <button style={primary(busy === 'media')} disabled={busy === 'media'} onClick={() => submit('media')}>
            {busy === 'media' ? '...' : ui.submitMedia}
          </button>
        </>
      ))}

      {message && <div style={{ background: '#dcfce7', color: '#166534', borderRadius: '12px', padding: '12px 16px', fontWeight: 700, fontSize: '13px', textAlign: 'center' }}>{message}</div>}
      {error && <div style={{ background: '#fef2f2', color: '#dc2626', borderRadius: '12px', padding: '12px 16px', fontWeight: 700, fontSize: '13px', textAlign: 'center', marginTop: '8px' }}>{error}</div>}
    </>
  );
}
