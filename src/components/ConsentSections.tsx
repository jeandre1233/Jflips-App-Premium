import React from 'react';
import { SignaturePad } from './SignaturePad';
import { GENERAL_FORM, MEDIA_FORM, MEDIA_KEYS, MediaKey, UI } from '../utils/consentForms';

/**
 * The two consent forms as they appear to a parent. Used by BOTH the signup page
 * (new registrations) and the personal consent link (existing families), so the
 * wording and the checkboxes can never differ between them. Each form has its
 * own signature.
 */

const card: React.CSSProperties = { background: '#fafafa', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '16px', fontSize: '12px', lineHeight: 1.7, color: '#475569' };
const h: React.CSSProperties = { margin: '10px 0 4px', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#1e4da1' };
const li: React.CSSProperties = { margin: '0 0 3px', paddingLeft: '4px' };

const SignatureBlock: React.FC<{
  label: string; clearLabel: string; capturedLabel: string;
  signed: boolean; error?: boolean;
  onSign: (d: string) => void; clearKey: number; onClear: () => void;
}> = ({ label, clearLabel, capturedLabel, signed, error, onSign, clearKey, onClear }) => (
  <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
      <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#64748b' }}>{label} *</span>
      <button type="button" onClick={onClear} style={{ fontSize: '11px', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>↺ {clearLabel}</button>
    </div>
    <div style={{ border: error ? '2px solid #ef4444' : '2px solid transparent', borderRadius: '14px' }}>
      <SignaturePad onSign={onSign} cleared={clearKey} />
    </div>
    {signed && <p style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600, marginTop: '6px' }}>✓ {capturedLabel}</p>}
  </div>
);

export const GeneralConsentSection: React.FC<{
  agreed: boolean; onAgree: (v: boolean) => void;
  signed: boolean; onSign: (d: string) => void; clearKey: number; onClear: () => void;
  errorSignature?: boolean; errorAgree?: boolean;
}> = ({ agreed, onAgree, signed, onSign, clearKey, onClear, errorSignature, errorAgree }) => {
  const f = GENERAL_FORM.en; const ui = UI.en;
  return (
    <>
      <div style={card}>
        <p style={{ margin: '0 0 6px', fontWeight: 800, color: '#1e293b', fontSize: '13px' }}>{f.title}</p>
        <p style={{ margin: '0 0 8px', fontSize: '11px', color: '#94a3b8' }}>{f.subtitle}</p>
        <p style={{ margin: '0 0 6px', color: '#1e293b' }}>{f.intro}</p>
        {f.sections.map(s => (
          <div key={s.heading}>
            <p style={h}>{s.heading}</p>
            {s.items.map(it => <p key={it} style={li}>• {it}</p>)}
          </div>
        ))}
        <p style={h}>{f.declarationHeading}</p>
        <p style={{ margin: 0, color: '#1e293b' }}>{f.declaration}</p>
        <p style={{ margin: '10px 0 0', fontSize: '11px', color: '#64748b' }}>{f.contact}</p>
      </div>
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', padding: '12px', background: agreed ? '#f0fdf4' : '#fff7f7', borderRadius: '10px', border: `1.5px solid ${agreed ? '#bbf7d0' : errorAgree ? '#ef4444' : '#fecaca'}` }}>
        <input type="checkbox" checked={agreed} onChange={e => onAgree(e.target.checked)} style={{ width: '18px', height: '18px', marginTop: '1px', flexShrink: 0, accentColor: '#1e4da1' }} />
        <span style={{ fontSize: '12px', color: '#475569', lineHeight: 1.5, fontWeight: 600 }}>{f.agreeLabel} *</span>
      </label>
      <SignatureBlock label={ui.signHere} clearLabel={ui.clear} capturedLabel={ui.signatureCaptured} signed={signed} error={errorSignature} onSign={onSign} clearKey={clearKey} onClear={onClear} />
    </>
  );
};

export const MediaConsentSection: React.FC<{
  choices: Partial<Record<MediaKey, boolean>>; onChoice: (k: MediaKey, v: boolean) => void;
  schoolGrade: string; onSchoolGrade: (v: string) => void;
  signed: boolean; onSign: (d: string) => void; clearKey: number; onClear: () => void;
  errorChoices?: boolean; errorSignature?: boolean;
}> = ({ choices, onChoice, schoolGrade, onSchoolGrade, signed, onSign, clearKey, onClear, errorChoices, errorSignature }) => {
  const f = MEDIA_FORM.en; const ui = UI.en;
  return (
    <>
      <div style={card}>
        <p style={{ margin: '0 0 6px', fontWeight: 800, color: '#1e293b', fontSize: '13px' }}>{f.title}</p>
        <p style={{ margin: '0 0 8px', fontSize: '11px', color: '#94a3b8' }}>{f.subtitle}</p>
        <p style={{ margin: 0, color: '#1e293b' }}>{f.intro}</p>
      </div>

      <div>
        <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#64748b', display: 'block', marginBottom: '4px' }}>{ui.schoolGrade}</label>
        <input value={schoolGrade} onChange={e => onSchoolGrade(e.target.value)} style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box' }} />
      </div>

      <p style={{ ...h, margin: '4px 0 0' }}>{f.useHeading}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', border: errorChoices ? '2px solid #ef4444' : '2px solid transparent', borderRadius: '12px', padding: errorChoices ? '6px' : 0 }}>
        {MEDIA_KEYS.map(k => (
          <div key={k} style={{ padding: '12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', background: 'white' }}>
            <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#1e293b', fontWeight: 600, lineHeight: 1.5 }}>{f.uses[k]}</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              {([true, false] as const).map(v => {
                const on = choices[k] === v;
                return (
                  <button key={String(v)} type="button" onClick={() => onChoice(k, v)}
                    style={{ flex: 1, padding: '10px', borderRadius: '10px', fontWeight: 800, fontSize: '12px', cursor: 'pointer',
                      border: `2px solid ${on ? (v ? '#16a34a' : '#b91c1c') : '#e2e8f0'}`,
                      background: on ? (v ? '#dcfce7' : '#fee2e2') : 'white',
                      color: on ? (v ? '#166534' : '#991b1b') : '#64748b' }}>
                    {v ? f.yes : f.no}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>{ui.optional}</p>

      <div style={card}>
        <p style={h}>{f.promiseHeading}</p>
        {f.promises.map(p => <p key={p} style={li}>• {p}</p>)}
        <p style={h}>{f.rightsHeading}</p>
        {f.rights.map(r => <p key={r} style={li}>• {r}</p>)}
        <p style={h}>{f.declarationHeading}</p>
        <p style={{ margin: 0, color: '#1e293b' }}>{f.declaration}</p>
        <p style={{ margin: '10px 0 0', fontSize: '11px', color: '#64748b' }}>{f.contact}</p>
      </div>
      <SignatureBlock label={ui.signHere} clearLabel={ui.clear} capturedLabel={ui.signatureCaptured} signed={signed} error={errorSignature} onSign={onSign} clearKey={clearKey} onClear={onClear} />
    </>
  );
};
