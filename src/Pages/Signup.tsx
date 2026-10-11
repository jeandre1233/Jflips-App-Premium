import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../../supabase';
import { ClassType } from '../../types';
import { notifyUser } from '../utils/notifications';
import { buildIndemnityPdf, indemnityPdfFileName } from '../utils/indemnityPdf';
import { SignaturePad } from '../components/SignaturePad';
import {
  INDEMNITY_INTRO_ADULT, INDEMNITY_INTRO_MINOR, INDEMNITY_RISKS, INDEMNITY_VERSION, MIN_AGE, UNDER_MIN_AGE_MESSAGE,
  audienceForAge, healthSectionFor, indemnityClausesFor, indemnityRisksFor
} from '../utils/indemnityText';
import type { Audience } from '../utils/indemnityText';
import { GeneralConsentSection, MediaConsentSection } from '../components/ConsentSections';
import {
  GENERAL_VERSION, MEDIA_KEYS, MEDIA_VERSION, MediaKey, generateConsentPdf, newConsentToken
} from '../utils/consentForms';

declare const window: any;

type FormData = {
  studentFirstName: string;
  studentLastName: string;
  dob: string;
  age: string;
  medicalNotes: string;
  parent1Name: string;
  parent1Phone: string;
  parent1Email: string;
  parent2Name: string;
  parent2Phone: string;
  classId: string;
  relationship: string;            // Mother / Father / Legal guardian / Other (not asked of adults)
  relationshipOther: string;
  authorityConfirmed: boolean;     // "I am this child's parent or legal guardian ..."
  emergencyName: string;
  emergencyPhone: string;
  emergencyRelationship: string;
  healthAgreed: boolean;           // accurate health information + emergency treatment
  risksAcknowledged: boolean;      // has read the risks
  indemnityAgreed: boolean;        // accepts the responsibility terms
};

/** Extra safety details collected for the youngest children (age 4 and under). */
type YoungAthlete = {
  stays: boolean;                 // a responsible adult stays at or near the venue
  adultName: string;              // who that adult is, if not the parent
  adultPhone: string;
  collectors: { name: string; phone: string }[];   // who may collect the child (up to 3)
  notes: string;                  // anything coaches should know
};
const EMPTY_YOUNG: YoungAthlete = {
  stays: false, adultName: '', adultPhone: '',
  collectors: [{ name: '', phone: '' }, { name: '', phone: '' }, { name: '', phone: '' }],
  notes: ''
};

const EMPTY_FORM: FormData = {
  studentFirstName: '', studentLastName: '', dob: '', age: '',
  medicalNotes: '', parent1Name: '', parent1Phone: '', parent1Email: '',
  parent2Name: '', parent2Phone: '', classId: '', indemnityAgreed: false,
  relationship: '', relationshipOther: '', authorityConfirmed: false,
  emergencyName: '', emergencyPhone: '', emergencyRelationship: '',
  healthAgreed: false, risksAcknowledged: false,
};

const relationshipOf = (f: FormData, audience: Audience) =>
  audience === 'adult' ? 'Self (adult participant)' : ((f.relationship === 'Other' ? f.relationshipOther.trim() : f.relationship) || 'Parent or legal guardian');

// ── PDF Generator: the shared builder, so this and the owner's re-print match ──
async function generateIndemnityPDF(form: FormData, signatureDataUrl: string, className: string, audience: Audience = 'minor', young: YoungAthlete | null = null) {
  const studentName = `${form.studentFirstName} ${form.studentLastName}`.trim();
  const doc = buildIndemnityPdf({
    studentName, dob: form.dob, age: form.age, className, audience,
    parentName: form.parent1Name || (audience === 'adult' ? studentName : ''),
    relationship: relationshipOf(form, audience),
    phone: form.parent1Phone, email: form.parent1Email,
    parent2Name: form.parent2Name, parent2Phone: form.parent2Phone,
    emergency: { name: form.emergencyName, phone: form.emergencyPhone, relationship: form.emergencyRelationship.trim() || null },
    medicalNotes: form.medicalNotes, young, signature: signatureDataUrl, version: INDEMNITY_VERSION
  });
  doc.save(indemnityPdfFileName(studentName));
}

// ── Main Component ────────────────────────────────────────────
export default function Signup() {
  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-amber-500" />
          
          <div className="flex items-center justify-center w-12 h-12 bg-amber-500/10 rounded-full mb-6">
            <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <h2 className="text-xl font-bold text-slate-100 tracking-tight mb-2">
            Supabase Connection Required
          </h2>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            Parent Signups require a working Supabase connection to store registrations and list class times.
          </p>

          <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-800 text-xs text-slate-400 space-y-2 leading-relaxed">
            <p className="font-semibold text-slate-300">Action Required:</p>
            <p>Please contact the system administrator to configure the missing <code className="font-mono bg-slate-950 px-1 py-0.5 rounded text-amber-400">VITE_SUPABASE_URL</code> and <code className="font-mono bg-slate-950 px-1 py-0.5 rounded text-amber-400">VITE_SUPABASE_ANON_KEY</code> credentials in the environment variables.</p>
          </div>
        </div>
      </div>
    );
  }

  const [classes, setClasses] = useState<ClassType[]>([]);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [ownerUserId, setOwnerUserId] = useState<string | null>(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState('');
  const [signatureError, setSignatureError] = useState(false);
  const [clearSig, setClearSig] = useState(0);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [submittedForm, setSubmittedForm] = useState<FormData | null>(null);
  const [submittedClassName, setSubmittedClassName] = useState('');
  const [defaultGroupRate, setDefaultGroupRate] = useState<number | null>(null);

  // Who signs: 18 and over signs for themselves, under 18 a parent or guardian signs.
  // Age comes from the date of birth, so this is a rule rather than a choice.
  const audience: Audience = audienceForAge(form.age);
  const ageNum = form.age === '' ? null : parseInt(form.age, 10);
  const isYoung = ageNum !== null && Number.isFinite(ageNum) && ageNum >= MIN_AGE && ageNum <= 4;
  const tooYoung = ageNum !== null && Number.isFinite(ageNum) && ageNum < MIN_AGE;
  const [young, setYoung] = useState<YoungAthlete>(EMPTY_YOUNG);

  // The risk box must be read to the end before the tick box unlocks.
  const [indemnityRead, setIndemnityRead] = useState(false);
  const indemnityBoxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = indemnityBoxRef.current;
    if (el && el.scrollHeight <= el.clientHeight + 4) setIndemnityRead(true);
  }, [audience, form.parent1Name, form.studentFirstName]);

  // POPIA: two further forms, each with its own signature. Never pre-answered,
  // and a "No" to any photo/video use never blocks the registration.
  const [gAgreed, setGAgreed] = useState(false);
  const [mChoices, setMChoices] = useState<Partial<Record<MediaKey, boolean>>>({});
  const [consentErrs, setConsentErrs] = useState<Record<string, boolean>>({});
  const [consentSaved, setConsentSaved] = useState(false);

  useEffect(() => {
    async function loadClasses() {
      // Parse parameters from standard query search
      const params = new URLSearchParams(window.location.search);
      let gymOwnerId = params.get('ownerId') || params.get('gym');

      // Also parse from hash portion of the URL in case HashRouter moved it (e.g. /#/signup?ownerId=...)
      if (!gymOwnerId && window.location.hash.includes('?')) {
        const hashQueryStr = window.location.hash.split('?')[1];
        const hashParams = new URLSearchParams(hashQueryStr);
        gymOwnerId = hashParams.get('ownerId') || hashParams.get('gym');
      }

      setOwnerUserId(gymOwnerId);

      if (!gymOwnerId) {
        setLoadingClasses(false);
        return;
      }

      // Parents do not choose a class when they register. The owner assigns each
      // child to classes afterwards, so this page needs no class list at all (the
      // old direct read of class_types also exposed every enrolled child's id).

      // The gym's default rate for a new athlete, so a child who registers here
      // arrives already on the right money instead of falling through to the
      // class price. owner_profiles is not publicly readable (it holds banking
      // details), hence the narrow RPC. Absent function or column simply means
      // no seeding, which is the pre-existing behaviour.
      try {
        const { data: defaults } = await supabase.rpc('get_signup_defaults', { p_owner_id: gymOwnerId });
        const rate = Array.isArray(defaults) ? Number(defaults[0]?.default_group_rate) : Number(defaults);
        if (Number.isFinite(rate) && rate > 0) setDefaultGroupRate(rate);
      } catch {
        /* no default configured — fall through to the class price */
      }

      setLoadingClasses(false);
    }
    loadClasses();
  }, []);

  const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    if (error) setError('');
  };

  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let rawValue = e.target.value.replace(/\D/g, '');
    if (rawValue.length > 8) {
      rawValue = rawValue.slice(0, 8);
    }

    let formattedDob = rawValue;
    if (rawValue.length > 4) {
      formattedDob = `${rawValue.slice(0, 2)}/${rawValue.slice(2, 4)}/${rawValue.slice(4)}`;
    } else if (rawValue.length > 2) {
      formattedDob = `${rawValue.slice(0, 2)}/${rawValue.slice(2)}`;
    }

    let ageStr = '';
    const parts = formattedDob.split(/[\/\-]/);
    if (parts.length === 3) {
      let d = parseInt(parts[0], 10);
      let m = parseInt(parts[1], 10);
      let y = parseInt(parts[2], 10);

      if (parts[0].length === 4) {
        y = parseInt(parts[0], 10);
        m = parseInt(parts[1], 10);
        d = parseInt(parts[2], 10);
      }

      if (y > 1900 && y < 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        const testDate = new Date(y, m - 1, d);
        if (testDate.getFullYear() !== y || testDate.getMonth() !== m - 1 || testDate.getDate() !== d) {
          // Invalid date like 31 Feb — don't set an age
          setForm(prev => ({ ...prev, dob: formattedDob, age: '' }));
          return;
        }

        const birth = new Date(y, m - 1, d);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        if (today.getMonth() - birth.getMonth() < 0 || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
        if (age >= 0) ageStr = String(age);
      }
    }

    setForm(prev => ({ ...prev, dob: formattedDob, age: ageStr }));
  };

  const handleSign = useCallback((dataUrl: string) => { setSignatureDataUrl(dataUrl); setSignatureError(false); }, []);

  const validate = () => {
    if (tooYoung) return UNDER_MIN_AGE_MESSAGE;
    if (!form.studentFirstName.trim()) return "Please enter the student's first name.";
    if (!form.studentLastName.trim()) return "Please enter the student's last name.";
    if (!form.dob.trim()) return "Please enter the student's date of birth.";
    
    // Check if DOB represents a valid date format
    const isFormatOk = /^([0-2][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/.test(form.dob);
    if (!isFormatOk) return "Please enter a valid Date of Birth in DD/MM/YYYY format.";
    
    if (audience !== 'adult' && !form.parent1Name.trim()) return 'Please enter the primary parent/guardian name.';
    if (audience !== 'adult' && !form.relationship) return 'Please choose your relationship to the child.';
    if (audience !== 'adult' && form.relationship === 'Other' && !form.relationshipOther.trim()) return 'Please say what your relationship to the child is.';
    if (audience !== 'adult' && !form.authorityConfirmed) return "Please tick the box to confirm you are the child's parent or legal guardian.";
    if (!form.parent1Phone.trim()) return 'Please enter a contact number.';
    if (!/^[\d\s\+\-\(\)]{7,15}$/.test(form.parent1Phone.replace(/\s+/g, ''))) {
      return 'Please enter a valid phone number (digits only, 7–15 characters).';
    }
    if (!form.parent1Email.trim()) return 'Please enter an email address.';
    if (!/\S+@\S+\.\S+/.test(form.parent1Email.trim())) return 'Please enter a valid email address.';
    if (!form.emergencyName.trim() || !form.emergencyPhone.trim()) return 'Please give an emergency contact: a name and a phone number.';
    if (!/^[\d\s\+\-\(\)]{7,15}$/.test(form.emergencyPhone.replace(/\s+/g, ''))) return "Please enter a valid phone number for the emergency contact.";
    if (isYoung) {
      if (!young.stays) return 'Please confirm that a parent or responsible adult will stay at the venue for the whole class.';
      if (!young.collectors.some(c => c.name.trim())) return 'Please give the name of at least one person who may collect your child.';
    }
    if (!form.medicalNotes.trim()) return 'Please tell us about any health conditions, allergies or injuries, or write None.';
    if (!form.healthAgreed) return 'Please tick the box to confirm your health information and the emergency treatment.';
    if (!form.risksAcknowledged) return 'Please tick the box to confirm you have read the risks.';
    if (!form.indemnityAgreed) return 'Please tick the box to confirm you agree to the responsibility terms.';
    if (!gAgreed) { setConsentErrs({ agree: true }); return 'Please tick the box to confirm you agree to the privacy notice.'; }
    if (!MEDIA_KEYS.every(k => typeof mChoices[k] === 'boolean')) { setConsentErrs({ choices: true }); return 'Please answer Yes or No for every photo and video use.'; }
    if (!signatureDataUrl) { setSignatureError(true); return 'Please sign at the bottom of the form before submitting.'; }
    setConsentErrs({});
    return '';
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    if (!ownerUserId) { setError('Unable to load registration details. Please try again.'); return; }
    setLoading(true); setError('');
    // An adult signing for themselves has no separate parent: their own name is the signer.
    const parentName = form.parent1Name.trim() || (audience === 'adult' ? `${form.studentFirstName.trim()} ${form.studentLastName.trim()}`.trim() : '');
    try {
      const studentId = `signup_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
      const studentName = `${form.studentFirstName.trim()} ${form.studentLastName.trim()}`;
      const selectedClass = classes.find(c => c.id === form.classId);

      // Format DOB to YYYY-MM-DD for Postgres
      let dobForDb = form.dob;
      if (form.dob) {
        const parts = form.dob.split(/[\/\-]/);
        if (parts.length === 3) {
          let y = parts[2], m = parts[1], d = parts[0];
          if (parts[0].length === 4) { y = parts[0]; m = parts[1]; d = parts[2]; }
          if (y.length === 4) { dobForDb = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`; }
        }
      }

      const relationshipText = relationshipOf(form, audience);
      const studentRow = {
        id: studentId, 
        name: studentName, 
        user_id: ownerUserId, 
        dob: dobForDb,
        age: form.age ? parseInt(form.age) : null, 
        medical_notes: form.medicalNotes.trim() || null,
        parent1_name: parentName, 
        parent1_phone: form.parent1Phone.trim(),
        parent1_email: form.parent1Email.trim(), 
        parent2_name: form.parent2Name.trim() || null,
        parent2_phone: form.parent2Phone.trim() || null, 
        signup_source: 'parent_signup_form',
        first_name: form.studentFirstName.trim(),
        last_name: form.studentLastName.trim(),
        class_name: selectedClass?.name || '',
        indemnity_signed: true,
        indemnity_date: new Date().toISOString(),
        signature_data: signatureDataUrl,
        // Who signed, in what capacity, when, and which version of the document.
        indemnity_record: {
          document: 'indemnity',
          version: INDEMNITY_VERSION,
          signed_by_name: parentName,
          relationship: relationshipText,
          authority: audience === 'adult'
            ? 'Adult participant (18 or over) signing for themselves'
            : 'Parent or legal guardian signing for a minor (confirmed by tick box)',
          authority_confirmed: audience === 'adult' ? true : form.authorityConfirmed,
          audience,
          emergency_contact: {
            name: form.emergencyName.trim(),
            phone: form.emergencyPhone.trim(),
            relationship: form.emergencyRelationship.trim() || null
          },
          acknowledged: { risks: true, responsibility: true, health_and_emergency_treatment: true },
          signed_at: new Date().toISOString()
        },
        ...(isYoung ? { young_athlete: { ...young, collectors: young.collectors.filter(c => c.name.trim()) } } : {}),
        // Stamped at creation so the gym's current default is what this child
        // pays, and so later changes to that default never move them.
        ...(defaultGroupRate ? { custom_group_rate: defaultGroupRate } : {})
      };

      const isNetworkFailure = (msg: string) => /failed to fetch|networkerror|load failed|network request failed/i.test(msg || '');
      let { error: studentError } = await supabase.from('tumbling_students').insert(studentRow);
      // A request that never left the phone (a dropped signal, a moment offline) is
      // safe to repeat once: it has the same id, so it can never save two children.
      if (studentError && isNetworkFailure(studentError.message)) {
        await new Promise(r => setTimeout(r, 1500));
        const retry = await supabase.from('tumbling_students').insert(studentRow);
        // If the first try actually reached the server and only the reply was lost,
        // the child already exists: that is success, not an error.
        studentError = retry.error && retry.error.code !== '23505' ? retry.error : null;
      }
      if (studentError) {
        throw new Error(isNetworkFailure(studentError.message)
          ? 'We could not reach the server. Please check your internet connection and press the button again. Nothing has been saved yet.'
          : studentError.message);
      }

      // The child's details are saved once, in their own record above. They are not
      // copied into a second table (signup_submissions): nothing reads that copy,
      // and a second copy of medical notes and contact numbers is more to protect.

      // POPIA consent records. Saved as their own rows, never inside the
      // indemnity. The child already exists at this point, so a failure here must
      // not undo or repeat the registration: the owner can send the family its
      // personal consent link instead.
      try {
        const { error: consentErr } = await supabase.rpc('create_signup_consents', {
          p_owner_id: ownerUserId,
          p_family_key: studentId,
          p_family_label: parentName,
          p_child_first_names: [form.studentFirstName.trim()],
          p_parent_name: parentName,
          p_parent_phone: form.parent1Phone.trim(),
          p_parent_email: form.parent1Email.trim(),
          p_details: { relationship: relationshipText, audience },
          p_general_signature: signatureDataUrl,
          p_media_choices: mChoices,
          p_media_signature: signatureDataUrl,
          p_general_version: GENERAL_VERSION,
          p_media_version: MEDIA_VERSION,
          p_token: newConsentToken()
        });
        if (consentErr) throw consentErr;
        setConsentSaved(true);
      } catch (consentError) {
        console.error('Consent records were not saved:', consentError);
      }

      // Alert the owner: in-app bell + device push (Firebase).
      await notifyUser({
        userId: ownerUserId,
        type: 'student_signup',
        message: `${studentName} signed up for ${selectedClass?.name || 'general registration'}.`,
        metadata: {
          student_id: studentId,
          student_name: studentName,
          class_id: form.classId || null,
          class_name: selectedClass?.name || null,
          parent_name: parentName,
          parent_phone: form.parent1Phone.trim()
        }
      });

      // Registration details (including medical notes) are NOT sent to Discord,
      // Google Sheets or any other service. They stay in the database. The owner
      // is told through the in-app notification above, which carries no medical
      // information.

      setSubmittedForm(form);
      setSubmittedClassName('General Registration');
      setSubmitted(true);
    } catch (e: any) {
      setError(/failed to fetch|networkerror|load failed/i.test(e?.message || '')
        ? 'We could not reach the server. Please check your internet connection and try again.'
        : (e.message || 'Something went wrong. Please try again.'));
    } finally { setLoading(false); }
  };

  const handleDownloadPdf = async () => {
    if (!submittedForm) return;
    setGeneratingPdf(true);
    try { await generateIndemnityPDF(submittedForm, signatureDataUrl, submittedClassName, audienceForAge(submittedForm.age), isYoung ? young : null); }
    catch (e) { console.error(e); }
    finally { setGeneratingPdf(false); }
  };

  // ── Error/Invalid Link ──
  if (!loadingClasses && !ownerUserId) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e3a6e 50%, #1e4da1 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ background: 'white', borderRadius: '24px', padding: '40px 32px', maxWidth: '420px', width: '100%', textAlign: 'center', boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
          <div style={{ width: '72px', height: '72px', background: '#fee2e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#ef4444', marginBottom: '12px' }}>INVALID LINK</h2>
          <p style={{ color: '#475569', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
            Invalid signup link. Please contact your gym for a valid registration link.
          </p>
          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: '20px', fontWeight: 900, fontStyle: 'italic', color: '#1e4da1' }}>JFLIPS</span>
            <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', color: '#94a3b8', marginTop: '4px' }}>Stunting & Tumbling</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Success ──
  if (submitted && submittedForm) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e3a6e 50%, #1e4da1 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ background: 'white', borderRadius: '24px', padding: '40px 32px', maxWidth: '420px', width: '100%', textAlign: 'center', boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
          <div style={{ width: '72px', height: '72px', background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#1e4da1', fontStyle: 'italic', marginBottom: '8px' }}>YOU'RE IN!</h2>
          <p style={{ color: '#475569', fontSize: '15px', lineHeight: '1.6', marginBottom: '6px' }}>
            {audience === 'adult'
              ? 'You are registered. We will be in touch shortly regarding class assignment.'
              : <><strong>{submittedForm.studentFirstName}</strong> has been registered. We will be in touch shortly regarding class assignment.</>}
          </p>
          {isYoung && (
            <p style={{ color: '#475569', fontSize: '13px', lineHeight: '1.6', marginBottom: '6px' }}>Remember, an adult needs to stay at the venue for the whole class.</p>
          )}
          <p style={{ color: '#475569', fontSize: '13px', lineHeight: '1.6', marginBottom: '6px' }}>You can change your photo and video choices at any time. Just message us on WhatsApp 069 040 3387.</p>
          <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '28px' }}>Download your signed forms for your records.</p>
          <button onClick={handleDownloadPdf} disabled={generatingPdf} style={{ width: '100%', padding: '16px', background: generatingPdf ? '#f1f5f9' : 'linear-gradient(135deg, #1e4da1, #1e3a6e)', color: generatingPdf ? '#94a3b8' : 'white', border: 'none', borderRadius: '14px', fontSize: '14px', fontWeight: 900, fontStyle: 'italic', letterSpacing: '0.5px', textTransform: 'uppercase', cursor: generatingPdf ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: generatingPdf ? 'none' : '0 8px 24px rgba(30,77,161,0.35)', marginBottom: '12px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            {generatingPdf ? 'Generating PDF...' : 'Download Indemnity Form (PDF)'}
          </button>
          {consentSaved && (
            <>
              {([['general', 'Download Privacy Notice (PDF)'], ['media', 'Download Photo & Video Consent (PDF)']] as const).map(([kind, text]) => (
                <button key={kind} onClick={() => generateConsentPdf({
                  kind, lang: 'en',
                  childNames: `${submittedForm.studentFirstName} ${submittedForm.studentLastName}`.trim(),
                  parentName: submittedForm.parent1Name || `${submittedForm.studentFirstName} ${submittedForm.studentLastName}`.trim(), parentPhone: submittedForm.parent1Phone, parentEmail: submittedForm.parent1Email,
                  relationship: relationshipOf(submittedForm, audience), audience,
                  choices: kind === 'media' ? (mChoices as Record<string, boolean>) : { agreed: true },
                  signature: signatureDataUrl, signedAt: new Date().toISOString(),
                  version: kind === 'media' ? MEDIA_VERSION : GENERAL_VERSION, status: 'signed'
                })} style={{ width: '100%', padding: '14px', background: 'white', color: '#1e4da1', border: '2px solid #1e4da1', borderRadius: '14px', fontSize: '12px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', cursor: 'pointer', marginBottom: '10px' }}>
                  {text}
                </button>
              ))}
            </>
          )}
          <p style={{ fontSize: '11px', color: '#cbd5e1' }}>Keep this for your records. See you on the mat! 🤸</p>
          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: '20px', fontWeight: 900, fontStyle: 'italic', color: '#1e4da1' }}>JFLIPS</span>
            <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', color: '#94a3b8', marginTop: '4px' }}>Stunting & Tumbling</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Form ──
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e3a6e 60%, #1e4da1 100%)', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ padding: '32px 24px 0', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', borderRadius: '16px', padding: '16px 32px', border: '1px solid rgba(255,255,255,0.15)', marginBottom: '24px' }}>
          <div style={{ fontSize: '32px', fontWeight: 900, fontStyle: 'italic', color: 'white', letterSpacing: '-1px', lineHeight: 1 }}>JFLIPS</div>
          <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '3px', color: '#93c5fd', marginTop: '4px' }}>Cheer & Tumbling</div>
        </div>
        <h1 style={{ fontSize: '22px', fontWeight: 900, color: 'white', marginBottom: '8px' }}>Tumbling Registration</h1>
        <p style={{ fontSize: '13px', color: '#93c5fd' }}>Fill in your details below to sign up for a class</p>
      </div>

      <div style={{ maxWidth: '480px', margin: '24px auto', padding: '0 16px 40px' }}>
        <div style={{ background: 'white', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.35)' }}>

          <Section label={audience === 'adult' ? 'Your Details' : 'Student Details'} icon="🤸" color="#6366f1">
            <Row>
              <div style={{ flex: 1 }}><Label>First Name *</Label><Input value={form.studentFirstName} onChange={set('studentFirstName')} placeholder="e.g. Leah" /></div>
              <div style={{ flex: 1 }}><Label>Last Name *</Label><Input value={form.studentLastName} onChange={set('studentLastName')} placeholder="e.g. Smith" /></div>
            </Row>
            <Row>
              <div style={{ flex: 1 }}><Label>Date of Birth *</Label><Input type="text" placeholder="DD/MM/YYYY" value={form.dob} onChange={handleDobChange} /></div>
              <div style={{ flex: 1 }}><Label>Age</Label><Input value={form.age} readOnly placeholder="Auto-filled" style={{ background: '#f8fafc', color: '#64748b' }} /></div>
            </Row>
          </Section>

          {tooYoung && (
            <div style={{ padding: '20px 24px 28px', borderTop: '1px solid #f1f5f9' }}>
              <p style={{ margin: 0, padding: '14px 16px', background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: '12px', fontSize: '13px', lineHeight: 1.6, color: '#9a3412', fontWeight: 600 }}>{UNDER_MIN_AGE_MESSAGE}</p>
            </div>
          )}
          {!tooYoung && (<>
          <Section label={audience === 'adult' ? 'Your Contact Details' : 'Primary Parent / Guardian'} icon="👤" color="#0891b2">
            <Label>{audience === 'adult' ? 'Your Full Name' : 'Full Name *'}</Label>
            <Input value={form.parent1Name} onChange={set('parent1Name')} placeholder="e.g. Sarah Smith" />
            {audience !== 'adult' && (
              <>
                <Label>Relationship to the child *</Label>
                <select value={form.relationship} onChange={set('relationship')} style={selectStyle}>
                  <option value="">Choose one</option>
                  <option value="Mother">Mother</option>
                  <option value="Father">Father</option>
                  <option value="Legal guardian">Legal guardian</option>
                  <option value="Other">Other, please say</option>
                </select>
                {form.relationship === 'Other' && (
                  <Input value={form.relationshipOther} onChange={set('relationshipOther')} placeholder="Your relationship to the child" />
                )}
              </>
            )}
            <Row>
              <div style={{ flex: 1 }}><Label>Phone Number *</Label><Input type="tel" value={form.parent1Phone} onChange={set('parent1Phone')} placeholder="e.g. 082 123 4567" /></div>
              <div style={{ flex: 1 }}><Label>Email Address *</Label><Input type="email" value={form.parent1Email} onChange={set('parent1Email')} placeholder="e.g. sarah@email.com" /></div>
            </Row>
            {audience !== 'adult' && (
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', padding: '12px', background: form.authorityConfirmed ? '#f0fdf4' : '#f8fafc', borderRadius: '10px', border: `1.5px solid ${form.authorityConfirmed ? '#bbf7d0' : '#e2e8f0'}` }}>
                <input type="checkbox" checked={form.authorityConfirmed} onChange={e => { setForm(prev => ({ ...prev, authorityConfirmed: e.target.checked })); if (error) setError(''); }} style={{ width: '18px', height: '18px', marginTop: '1px', flexShrink: 0, accentColor: '#1e4da1' }} />
                <span style={{ fontSize: '12px', color: '#475569', lineHeight: '1.5', fontWeight: 600 }}>I am this child's parent or legal guardian, and I am allowed to make decisions about their activities and medical care. *</span>
              </label>
            )}
          </Section>

          {audience !== 'adult' && (
          <Section label="Second Parent / Guardian" icon="👤" color="#7c3aed" subtitle="Optional">
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Optional. We may phone them if we cannot reach you.</p>
            <Row>
              <div style={{ flex: 1 }}><Label>Full Name</Label><Input value={form.parent2Name} onChange={set('parent2Name')} placeholder="e.g. John Smith" /></div>
              <div style={{ flex: 1 }}><Label>Phone Number</Label><Input type="tel" value={form.parent2Phone} onChange={set('parent2Phone')} placeholder="e.g. 083 987 6543" /></div>
            </Row>
          </Section>
          )}

          <Section label="Emergency Contact" icon="🚑" color="#dc2626">
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>{audience === 'adult' ? 'Someone we can phone if you are hurt or ill.' : 'Someone we can phone if we cannot reach you.'}</p>
            <Label>Full Name *</Label>
            <Input value={form.emergencyName} onChange={set('emergencyName')} placeholder="e.g. Anna Smith" />
            <Row>
              <div style={{ flex: 1 }}><Label>Phone Number *</Label><Input type="tel" value={form.emergencyPhone} onChange={set('emergencyPhone')} placeholder="e.g. 082 123 4567" /></div>
              <div style={{ flex: 1 }}><Label>{audience === 'adult' ? 'Relationship to you' : 'Relationship to the child'}</Label><Input value={form.emergencyRelationship} onChange={set('emergencyRelationship')} placeholder="e.g. grandmother, uncle, neighbour" /></div>
            </Row>
          </Section>

          {isYoung && (
            <Section label="Young Athlete (ages 2 to 4)" icon="🧸" color="#ea580c">
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Children this young need an adult close by. This is how we keep your child safe.</p>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', padding: '12px', background: young.stays ? '#f0fdf4' : '#fff7ed', borderRadius: '10px', border: `1.5px solid ${young.stays ? '#bbf7d0' : '#fed7aa'}` }}>
                <input type="checkbox" checked={young.stays} onChange={e => setYoung(y => ({ ...y, stays: e.target.checked }))} style={{ width: '18px', height: '18px', marginTop: '1px', flexShrink: 0, accentColor: '#1e4da1' }} />
                <span style={{ fontSize: '12px', color: '#475569', lineHeight: '1.5', fontWeight: 600 }}>A parent, guardian or other responsible adult will stay at the venue for the whole class. *</span>
              </label>
              <Row>
                <div style={{ flex: 1 }}><Label>Adult at the venue (if not a parent)</Label><Input value={young.adultName} onChange={e => setYoung(y => ({ ...y, adultName: e.target.value }))} placeholder="Name" /></div>
                <div style={{ flex: 1 }}><Label>Their cell number</Label><Input type="tel" value={young.adultPhone} onChange={e => setYoung(y => ({ ...y, adultPhone: e.target.value }))} placeholder="e.g. 082 123 4567" /></div>
              </Row>
              <Label>Who may collect your child (up to 3) *</Label>
              {young.collectors.map((c, i) => (
                <Row key={i}>
                  <div style={{ flex: 1 }}><Input value={c.name} onChange={e => setYoung(y => ({ ...y, collectors: y.collectors.map((x, j) => j === i ? { ...x, name: e.target.value } : x) }))} placeholder={`Person ${i + 1} name`} /></div>
                  <div style={{ flex: 1 }}><Input type="tel" value={c.phone} onChange={e => setYoung(y => ({ ...y, collectors: y.collectors.map((x, j) => j === i ? { ...x, phone: e.target.value } : x) }))} placeholder="Cell number" /></div>
                </Row>
              ))}
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>We will only hand your child over to these people. If someone else is collecting, please message us before the class.</p>
              <Label>Anything the coaches should know (separation anxiety, fears, sensitivities)</Label>
              <textarea value={young.notes} onChange={e => setYoung(y => ({ ...y, notes: e.target.value }))} style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' as const }} />
            </Section>
          )}

          {/* Health and emergencies */}
          <Section label="Health and Emergencies" icon="🩺" color="#dc2626">
            {(() => { const hs = healthSectionFor(audience); return (<>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>{hs.why}</p>
              <Label>{hs.label}</Label>
              <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>{hs.hint}</p>
              <textarea value={form.medicalNotes} onChange={set('medicalNotes')} placeholder="e.g. None / Asthma / Previous knee injury..." style={{ ...inputStyle, minHeight: '72px', resize: 'vertical' as const }} />
              <div style={{ background: '#fffafa', border: '1.5px solid #fecaca', borderRadius: '12px', padding: '14px 16px', fontSize: '12px', lineHeight: '1.7', color: '#475569' }}>
                <p style={{ margin: '0 0 6px', fontWeight: 900, color: '#1e4da1' }}>{hs.emergencyHeading}</p>
                {hs.emergency.map(t => <p key={t} style={{ margin: '0 0 8px', color: '#1e293b' }}>{t}</p>)}
              </div>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', padding: '12px', background: form.healthAgreed ? '#f0fdf4' : '#fff7f7', borderRadius: '10px', border: `1.5px solid ${form.healthAgreed ? '#bbf7d0' : '#fecaca'}` }}>
                <input type="checkbox" checked={form.healthAgreed} onChange={e => { setForm(prev => ({ ...prev, healthAgreed: e.target.checked })); if (error) setError(''); }} style={{ width: '18px', height: '18px', marginTop: '1px', flexShrink: 0, accentColor: '#1e4da1' }} />
                <span style={{ fontSize: '12px', color: '#475569', lineHeight: '1.5', fontWeight: 600 }}>{hs.tick}</span>
              </label>
            </>); })()}
          </Section>

          {/* Risks and indemnity */}
          <Section label="Risks and Indemnity" icon="📋" color="#dc2626">
            <div style={{ border: '2px solid #dc2626', borderRadius: '14px', overflow: 'hidden' }}>
              <div style={{ background: '#dc2626', color: 'white', padding: '8px 14px', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>
                ⚠ Important: the risks and your responsibility. Please read all of it.
              </div>
              <div ref={indemnityBoxRef}
                onScroll={e => { const el = e.currentTarget; if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8) setIndemnityRead(true); }}
                style={{ background: '#fffafa', padding: '16px', fontSize: '12px', lineHeight: '1.7', color: '#475569', maxHeight: '320px', overflowY: 'auto' }}>
              <p style={{ margin: '0 0 10px', color: '#1e293b', fontSize: '12px' }}>
                {audience === 'adult'
                  ? INDEMNITY_INTRO_ADULT(form.parent1Name.trim() || `${form.studentFirstName} ${form.studentLastName}`.trim())
                  : INDEMNITY_INTRO_MINOR(form.parent1Name.trim(), `${form.studentFirstName} ${form.studentLastName}`.trim())}
              </p>
              {(() => { const r = indemnityRisksFor(audience); return (
                <div style={{ margin: '0 0 10px', color: '#1e293b', fontSize: '12px' }}>
                  <p style={{ margin: '0 0 4px' }}><strong style={{ color: '#1e4da1' }}>{INDEMNITY_RISKS.heading}.</strong> {r.intro}</p>
                  {r.items.map(i => <p key={i} style={{ margin: '0 0 2px', paddingLeft: '6px' }}>• {i}</p>)}
                  <p style={{ margin: '4px 0 0' }}>{r.outro}</p>
                </div>
              ); })()}
              {indemnityClausesFor(audience).map(c => (
                <p key={c.heading} style={{ margin: '0 0 10px', color: '#1e293b', fontSize: '12px' }}>
                  <strong style={{ color: '#1e4da1' }}>{c.heading}.</strong> {c.text}
                </p>
              ))}
              </div>
            </div>

            {!indemnityRead && (
              <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#b91c1c' }}>Scroll to the bottom of the box above to unlock the tick boxes.</p>
            )}
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: indemnityRead ? 'pointer' : 'not-allowed', opacity: indemnityRead ? 1 : 0.6, padding: '12px', background: form.risksAcknowledged ? '#f0fdf4' : '#fff7f7', borderRadius: '10px', border: `1.5px solid ${form.risksAcknowledged ? '#bbf7d0' : '#fecaca'}`, transition: 'all 0.2s' }}>
              <input type="checkbox" disabled={!indemnityRead} checked={form.risksAcknowledged} onChange={e => { setForm(prev => ({ ...prev, risksAcknowledged: e.target.checked })); if (error) setError(''); }} style={{ width: '18px', height: '18px', marginTop: '1px', flexShrink: 0, accentColor: '#1e4da1' }} />
              <span style={{ fontSize: '12px', color: '#475569', lineHeight: '1.5', fontWeight: 600 }}>I have read and understood the risks described above. *</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: indemnityRead ? 'pointer' : 'not-allowed', opacity: indemnityRead ? 1 : 0.6, padding: '12px', background: form.indemnityAgreed ? '#f0fdf4' : '#fff7f7', borderRadius: '10px', border: `1.5px solid ${form.indemnityAgreed ? '#bbf7d0' : '#fecaca'}`, transition: 'all 0.2s' }}>
              <input type="checkbox" disabled={!indemnityRead} checked={form.indemnityAgreed} onChange={e => { setForm(prev => ({ ...prev, indemnityAgreed: e.target.checked })); if (error) setError(''); }} style={{ width: '18px', height: '18px', marginTop: '1px', flexShrink: 0, accentColor: '#1e4da1' }} />
              <span style={{ fontSize: '12px', color: '#475569', lineHeight: '1.5', fontWeight: 600 }}>
                I agree to the responsibility terms above{audience === 'adult' ? '' : ', on my own behalf and on behalf of the enrolled student'}. *
              </span>
            </label>

          </Section>

          {/* POPIA: privacy notice, then photo and video consent. Separate forms, separate signatures. */}
          <Section label="Privacy Notice (POPIA)" icon="🔒" color="#7c3aed">
            <GeneralConsentSection
              agreed={gAgreed} onAgree={v => { setGAgreed(v); if (error) setError(''); }}
              hideSignature errorAgree={consentErrs.agree} audience={audience}
            />
          </Section>

          <Section label="Photo & Video Consent (POPIA)" icon="📸" color="#0891b2">
            <MediaConsentSection
              choices={mChoices} onChoice={(k, v) => { setMChoices(c => ({ ...c, [k]: v })); if (error) setError(''); }}
              hideSignature errorChoices={consentErrs.choices} audience={audience}
            />
          </Section>

          <Section label="Sign" icon="✍️" color="#1e4da1">
            <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: 1.6 }}>
              One signature covers everything above: the health and emergency treatment, the risks and indemnity, the privacy notice and the photo and video choices you made.
            </p>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <Label>Signature *</Label>
                <button type="button" onClick={() => { setClearSig(c => c + 1); setSignatureDataUrl(''); }} style={{ fontSize: '11px', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>↺ Clear</button>
              </div>
              <div style={{ border: signatureError ? '2px solid #ef4444' : '2px solid transparent', borderRadius: '14px', transition: 'border-color 0.2s' }}>
                <SignaturePad onSign={handleSign} cleared={clearSig} />
              </div>
              <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#94a3b8' }}>Sign with your finger or your mouse.</p>
              {signatureDataUrl && (
                <p style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600, marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  Signature captured
                </p>
              )}
            </div>
          </Section>

          </>)}

          <div style={{ padding: '24px' }}>
            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span style={{ fontSize: '13px', color: '#dc2626', fontWeight: 600 }}>{error}</span>
              </div>
            )}
            <button onClick={handleSubmit} disabled={loading || tooYoung} style={{ width: '100%', padding: '18px', background: loading ? '#93c5fd' : 'linear-gradient(135deg, #1e4da1, #1e3a6e)', color: 'white', border: 'none', borderRadius: '14px', fontSize: '14px', fontWeight: 900, fontStyle: 'italic', letterSpacing: '1px', textTransform: 'uppercase', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 8px 24px rgba(30,77,161,0.4)', transition: 'all 0.2s' }}>
              {loading ? '⏳ Submitting...' : '✅ Complete Registration'}
            </button>
            <p style={{ textAlign: 'center', fontSize: '11px', color: '#94a3b8', marginTop: '12px' }}>
              By pressing the button you confirm what you have ticked and signed above. A signed PDF of each form will be available to download.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ label, icon, color, children, subtitle }: { label: string; icon: string; color: string; children: React.ReactNode; subtitle?: string }) {
  return (
    <div style={{ borderTop: '1px solid #f1f5f9' }}>
      <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <div style={{ width: '28px', height: '28px', background: color + '15', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>{icon}</div>
        <span style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color }}>{label}</span>
        {subtitle && <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600 }}>({subtitle})</span>}
      </div>
      <div style={{ padding: '0 24px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>{children}</div>
    </div>
  );
}
function Row({ children }: { children: React.ReactNode }) { return <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' as const }}>{children}</div>; }
function Label({ children }: { children: React.ReactNode }) { return <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#64748b', display: 'block', marginBottom: '4px' }}>{children}</label>; }
function Input({ style, ...props }: React.InputHTMLAttributes<HTMLInputElement>) { return <input {...props} style={{ ...inputStyle, ...style }} />; }
const inputStyle: React.CSSProperties = { width: '100%', padding: '12px 14px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', color: '#1e293b', background: 'white', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' };
const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center' };
