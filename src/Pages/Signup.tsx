import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../../supabase';
import { ClassType } from '../../types';
import { sendNewSignupNotification } from '../utils/discordNotifications';
import jsPDF from 'jspdf';

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
  indemnityAgreed: boolean;
};

const EMPTY_FORM: FormData = {
  studentFirstName: '', studentLastName: '', dob: '', age: '',
  medicalNotes: '', parent1Name: '', parent1Phone: '', parent1Email: '',
  parent2Name: '', parent2Phone: '', classId: '', indemnityAgreed: false,
};

// ── Signature Pad ─────────────────────────────────────────────
const getPos = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  if ('touches' in e) {
    return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
  }
  return { x: ((e as MouseEvent).clientX - rect.left) * scaleX, y: ((e as MouseEvent).clientY - rect.top) * scaleY };
};

function SignaturePad({ onSign, cleared }: { onSign: (dataUrl: string) => void; cleared: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const hasDrawn = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasDrawn.current = false;
  }, [cleared]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const start = (e: MouseEvent | TouchEvent) => {
      if (!('touches' in e)) {
        e.preventDefault();
      }
      drawing.current = true;
      lastPos.current = getPos(e, canvas);
    };
    const move = (e: MouseEvent | TouchEvent) => {
      if (!('touches' in e)) {
        e.preventDefault();
      }
      if (!drawing.current || !lastPos.current) return;
      const pos = getPos(e, canvas);
      ctx.beginPath(); ctx.moveTo(lastPos.current.x, lastPos.current.y); ctx.lineTo(pos.x, pos.y); ctx.stroke();
      lastPos.current = pos; hasDrawn.current = true;
    };
    const end = () => { drawing.current = false; lastPos.current = null; if (hasDrawn.current) onSign(canvas.toDataURL('image/png')); };

    canvas.addEventListener('mousedown', start); canvas.addEventListener('mousemove', move); canvas.addEventListener('mouseup', end);
    canvas.addEventListener('touchstart', start, { passive: true }); canvas.addEventListener('touchmove', move, { passive: true }); canvas.addEventListener('touchend', end);
    return () => {
      canvas.removeEventListener('mousedown', start); canvas.removeEventListener('mousemove', move); canvas.removeEventListener('mouseup', end);
      canvas.removeEventListener('touchstart', start, { passive: true } as any); canvas.removeEventListener('touchmove', move, { passive: true } as any); canvas.removeEventListener('touchend', end);
    };
  }, [onSign]);

  return (
    <div style={{ position: 'relative' }}>
      <canvas ref={canvasRef} width={600} height={160}
        style={{ width: '100%', height: '160px', border: '2px dashed #cbd5e1', borderRadius: '12px', background: '#fafafa', cursor: 'crosshair', touchAction: 'none', display: 'block' }} />
      <div style={{ position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none' }}>
        <span style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: 600, whiteSpace: 'nowrap' }}>Sign here with your finger or mouse</span>
      </div>
    </div>
  );
}

// ── PDF Generator ─────────────────────────────────────────────
async function generateIndemnityPDF(form: FormData, signatureDataUrl: string, className: string) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = 210;
  const margin = 20;
  const contentW = pageW - margin * 2;
  let y = 20;

  const rgb = (hex: string): [number, number, number] => [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];

  // Header bar
  doc.setFillColor(30, 77, 161);
  doc.rect(0, 0, pageW, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18); doc.setFont('helvetica', 'bolditalic');
  doc.text('JFLIPS', margin, 17);
  doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  doc.text('STUNTING & TUMBLING', margin + 28, 17);
  doc.setFontSize(9);
  doc.text('INDEMNITY & MEDICAL DECLARATION', pageW - margin, 17, { align: 'right' });
  y = 38;

  // Title
  doc.setTextColor(...rgb('#1e4da1'));
  doc.setFontSize(13); doc.setFont('helvetica', 'bold');
  doc.text('INDEMNITY & MEDICAL DECLARATION', margin, y);
  doc.setDrawColor(30, 77, 161); doc.setLineWidth(0.5);
  doc.line(margin, y + 3, pageW - margin, y + 3);
  y += 12;

  // Indemnity body text
  const studentName = `${form.studentFirstName} ${form.studentLastName}`.trim();
  doc.setTextColor(...rgb('#1e293b'));
  doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  const bodyText = `I, ${form.parent1Name || '___________________'}, Parent/Legal Guardian of the enrolled student ${studentName || '___________________'}, hereby indemnify and confirm that my child is physically, medically and mentally fit to become a member of JFLIPS TUMBLING and to participate in the sport of tumbling. I hereby acknowledge the possibility of injury occurring whilst doing tumbling.`;
  const bodyLines = doc.splitTextToSize(bodyText, contentW);
  doc.text(bodyLines, margin, y);
  y += bodyLines.length * 6 + 6;

  // Medical notes heading
  doc.setFont('helvetica', 'bold');
  const medLabel = 'Please list any physical disabilities, history of illness, or allergies the enrolled child has which we should be aware of (e.g. previous fractures, muscle tone, asthma, etc.):';
  const medLabelLines = doc.splitTextToSize(medLabel, contentW);
  doc.text(medLabelLines, margin, y);
  y += medLabelLines.length * 6 + 6;

  // Medical notes box
  doc.setDrawColor(...rgb('#e2e8f0')); doc.setLineWidth(0.4);
  doc.rect(margin, y, contentW, 20);
  doc.setFont('helvetica', 'normal'); doc.setTextColor(...rgb('#1e293b'));
  const medText = form.medicalNotes?.trim() || 'None';
  doc.text(doc.splitTextToSize(medText, contentW - 6), margin + 3, y + 7);
  y += 28;

  // Divider
  doc.setDrawColor(...rgb('#e2e8f0')); doc.line(margin, y, pageW - margin, y); y += 8;

  // Student details section
  doc.setFillColor(248, 250, 252); doc.rect(margin, y, contentW, 6, 'F');
  doc.setTextColor(...rgb('#1e4da1')); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.text('STUDENT DETAILS', margin + 3, y + 4.5); y += 10;

  const studentFields = [
    ['Full Name', studentName || '—'],
    ['Date of Birth', form.dob || '—'],
    ['Age', form.age ? `${form.age} years` : '—'],
    ['Class Enrolled', className || '—'],
  ];
  doc.setFontSize(9); doc.setTextColor(...rgb('#475569'));
  studentFields.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold'); doc.text(`${label}:`, margin, y);
    doc.setFont('helvetica', 'normal'); doc.text(value, margin + 42, y);
    y += 7;
  });
  y += 4;

  // Parent details section
  doc.setFillColor(248, 250, 252); doc.rect(margin, y, contentW, 6, 'F');
  doc.setTextColor(...rgb('#1e4da1')); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.text('PARENT / GUARDIAN DETAILS', margin + 3, y + 4.5); y += 10;

  const parentFields: [string, string][] = [
    ['Parent 1 Name', form.parent1Name || '—'],
    ['Parent 1 Phone', form.parent1Phone || '—'],
    ['Parent 1 Email', form.parent1Email || '—'],
    ...(form.parent2Name ? [['Parent 2 Name', form.parent2Name] as [string,string], ['Parent 2 Phone', form.parent2Phone || '—'] as [string,string]] : []),
  ];
  doc.setFontSize(9); doc.setTextColor(...rgb('#475569'));
  parentFields.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold'); doc.text(`${label}:`, margin, y);
    doc.setFont('helvetica', 'normal'); doc.text(value, margin + 42, y);
    y += 7;
  });
  y += 6;

  // Divider
  doc.setDrawColor(...rgb('#e2e8f0')); doc.line(margin, y, pageW - margin, y); y += 8;

  // Signature section
  doc.setFillColor(248, 250, 252); doc.rect(margin, y, contentW, 6, 'F');
  doc.setTextColor(...rgb('#1e4da1')); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.text('SIGNATURE', margin + 3, y + 4.5); y += 12;

  if (signatureDataUrl) {
    doc.addImage(signatureDataUrl, 'PNG', margin, y, 80, 30);
    y += 34;
  }

  // Signature line
  doc.setDrawColor(...rgb('#1e293b')); doc.setLineWidth(0.5);
  doc.line(margin, y, margin + 80, y);
  doc.line(margin + 100, y, margin + 160, y);
  doc.setTextColor(...rgb('#475569')); doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  doc.text('Signature', margin, y + 5);
  doc.setFont('helvetica', 'bold'); doc.text('Date:', margin + 100, y + 5);
  doc.setFont('helvetica', 'normal'); doc.text(new Date().toLocaleDateString('en-ZA'), margin + 114, y + 5);

  // Footer
  doc.setFillColor(30, 77, 161); doc.rect(0, 287, pageW, 10, 'F');
  doc.setTextColor(255, 255, 255); doc.setFontSize(7); doc.setFont('helvetica', 'normal');
  doc.text('JFLIPS TUMBLING  |  This document serves as an official indemnity declaration.', pageW / 2, 293, { align: 'center' });

  const filename = `JFLIPS_Indemnity_${studentName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.pdf`;
  doc.save(filename);
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

      const { data, error } = await supabase.from('class_types').select('*').eq('user_id', gymOwnerId).order('name', { ascending: true });
      if (!error && data) {
        const allowedClasses = data.filter((ct: any) => ct.allow_signup !== false);
        setClasses(allowedClasses.map((ct: any) => ({ ...ct, studentIds: ct.enrolled_student_ids || [] })));
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
    if (!form.studentFirstName.trim()) return "Please enter the student's first name.";
    if (!form.studentLastName.trim()) return "Please enter the student's last name.";
    if (!form.dob.trim()) return "Please enter the student's date of birth.";
    
    // Check if DOB represents a valid date format
    const isFormatOk = /^([0-2][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/.test(form.dob);
    if (!isFormatOk) return "Please enter a valid Date of Birth in DD/MM/YYYY format.";
    
    if (!form.parent1Name.trim()) return 'Please enter the primary parent/guardian name.';
    if (!form.parent1Phone.trim()) return 'Please enter a contact number.';
    if (!/^[\d\s\+\-\(\)]{7,15}$/.test(form.parent1Phone.replace(/\s+/g, ''))) {
      return 'Please enter a valid phone number (digits only, 7–15 characters).';
    }
    if (!form.parent1Email.trim()) return 'Please enter an email address.';
    if (!/\S+@\S+\.\S+/.test(form.parent1Email.trim())) return 'Please enter a valid email address.';
    if (!form.indemnityAgreed) return 'Please confirm that you have read and agree to the indemnity declaration.';
    if (!signatureDataUrl) { setSignatureError(true); return 'Please sign the form before submitting.'; }
    return '';
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    if (!ownerUserId) { setError('Unable to load registration details. Please try again.'); return; }
    setLoading(true); setError('');
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

      const { error: studentError } = await supabase.from('tumbling_students').insert({
        id: studentId, 
        name: studentName, 
        user_id: ownerUserId, 
        dob: dobForDb,
        age: form.age ? parseInt(form.age) : null, 
        medical_notes: form.medicalNotes.trim() || null,
        parent1_name: form.parent1Name.trim(), 
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
        signature_data: signatureDataUrl
      });
      if (studentError) throw new Error(studentError.message);

      if (selectedClass) {
        const currentIds: string[] = selectedClass.studentIds || [];
        if (!currentIds.includes(studentId)) {
          await supabase.from('class_types').update({ enrolled_student_ids: [...currentIds, studentId] }).eq('id', form.classId);
        }
      }

      await supabase.from('signup_submissions').insert({
        student_id: studentId, student_name: studentName, dob: dobForDb, age: form.age || null,
        class_id: form.classId, class_name: selectedClass?.name || '',
        medical_notes: form.medicalNotes.trim() || null, parent1_name: form.parent1Name.trim(),
        parent1_phone: form.parent1Phone.trim(), parent1_email: form.parent1Email.trim(),
        parent2_name: form.parent2Name.trim() || null, parent2_phone: form.parent2Phone.trim() || null,
        submitted_at: new Date().toISOString(), user_id: ownerUserId,
        signature_data: signatureDataUrl
      });

      // Send notification to owner
      await supabase.from('notifications').insert({
        user_id: ownerUserId,
        message: `${studentName} signed up`,
        type: 'system',
        is_read: false
      });

      // Try sending Discord notification asynchronously without blocking UX
      try {
        await sendNewSignupNotification({
          studentName,
          dob: form.dob,
          age: form.age,
          className: selectedClass?.name || 'General Registration',
          parentName: form.parent1Name,
          phone: form.parent1Phone,
          email: form.parent1Email,
          medicalNotes: form.medicalNotes
        });
      } catch (discordErr) {
        console.error('Discord notification failed:', discordErr);
      }

      setSubmittedForm(form);
      setSubmittedClassName('General Registration');
      setSubmitted(true);
    } catch (e: any) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally { setLoading(false); }
  };

  const handleDownloadPdf = async () => {
    if (!submittedForm) return;
    setGeneratingPdf(true);
    try { await generateIndemnityPDF(submittedForm, signatureDataUrl, submittedClassName); }
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
            <strong>{submittedForm.studentFirstName}</strong> has been registered. We will be in touch shortly regarding class assignment.
          </p>
          <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '28px' }}>Download your signed indemnity form for your records. 📄</p>
          <button onClick={handleDownloadPdf} disabled={generatingPdf} style={{ width: '100%', padding: '16px', background: generatingPdf ? '#f1f5f9' : 'linear-gradient(135deg, #1e4da1, #1e3a6e)', color: generatingPdf ? '#94a3b8' : 'white', border: 'none', borderRadius: '14px', fontSize: '14px', fontWeight: 900, fontStyle: 'italic', letterSpacing: '0.5px', textTransform: 'uppercase', cursor: generatingPdf ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: generatingPdf ? 'none' : '0 8px 24px rgba(30,77,161,0.35)', marginBottom: '12px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            {generatingPdf ? 'Generating PDF...' : 'Download Indemnity Form (PDF)'}
          </button>
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
          <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '3px', color: '#93c5fd', marginTop: '4px' }}>Stunting & Tumbling</div>
        </div>
        <h1 style={{ fontSize: '22px', fontWeight: 900, color: 'white', marginBottom: '8px' }}>Tumbling Registration</h1>
        <p style={{ fontSize: '13px', color: '#93c5fd' }}>Fill in your details below to sign up for a class</p>
      </div>

      <div style={{ maxWidth: '480px', margin: '24px auto', padding: '0 16px 40px' }}>
        <div style={{ background: 'white', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.35)' }}>

          <Section label="Student Details" icon="🤸" color="#6366f1">
            <Row>
              <div style={{ flex: 1 }}><Label>First Name *</Label><Input value={form.studentFirstName} onChange={set('studentFirstName')} placeholder="e.g. Leah" /></div>
              <div style={{ flex: 1 }}><Label>Last Name *</Label><Input value={form.studentLastName} onChange={set('studentLastName')} placeholder="e.g. Smith" /></div>
            </Row>
            <Row>
              <div style={{ flex: 1 }}><Label>Date of Birth *</Label><Input type="text" placeholder="DD/MM/YYYY" value={form.dob} onChange={handleDobChange} /></div>
              <div style={{ flex: 1 }}><Label>Age</Label><Input value={form.age} readOnly placeholder="Auto-filled" style={{ background: '#f8fafc', color: '#64748b' }} /></div>
            </Row>
          </Section>

          <Section label="Primary Parent / Guardian" icon="👤" color="#0891b2">
            <Label>Full Name *</Label>
            <Input value={form.parent1Name} onChange={set('parent1Name')} placeholder="e.g. Sarah Smith" />
            <Row>
              <div style={{ flex: 1 }}><Label>Phone Number *</Label><Input type="tel" value={form.parent1Phone} onChange={set('parent1Phone')} placeholder="e.g. 082 123 4567" /></div>
              <div style={{ flex: 1 }}><Label>Email Address *</Label><Input type="email" value={form.parent1Email} onChange={set('parent1Email')} placeholder="e.g. sarah@email.com" /></div>
            </Row>
          </Section>

          <Section label="Second Parent / Guardian" icon="👤" color="#7c3aed" subtitle="Optional">
            <Row>
              <div style={{ flex: 1 }}><Label>Full Name</Label><Input value={form.parent2Name} onChange={set('parent2Name')} placeholder="e.g. John Smith" /></div>
              <div style={{ flex: 1 }}><Label>Phone Number</Label><Input type="tel" value={form.parent2Phone} onChange={set('parent2Phone')} placeholder="e.g. 083 987 6543" /></div>
            </Row>
          </Section>

          {/* Indemnity & Medical Declaration */}
          <Section label="Indemnity & Medical Declaration" icon="📋" color="#dc2626">
            <div style={{ background: '#fafafa', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '16px', fontSize: '12px', lineHeight: '1.7', color: '#475569' }}>
              <p style={{ margin: '0 0 10px', color: '#1e293b', fontSize: '12px' }}>
                I, <strong style={{ color: '#1e4da1', textDecoration: 'underline', textUnderlineOffset: '2px' }}>{form.parent1Name || '___________________'}</strong>, Parent/Legal Guardian of the enrolled student{' '}
                <strong style={{ color: '#1e4da1', textDecoration: 'underline', textUnderlineOffset: '2px' }}>{`${form.studentFirstName} ${form.studentLastName}`.trim() || '___________________'}</strong>,
                hereby indemnify and confirm that my child is physically, medically and mentally fit to become a member of <strong>JFLIPS TUMBLING</strong> and to participate in the sport of tumbling. I hereby acknowledge the possibility of injury occurring whilst doing tumbling.
              </p>
              <p style={{ margin: 0, fontWeight: 700, color: '#1e293b', fontSize: '11px' }}>
                Please list any physical disabilities, history of illness, or allergies the enrolled child has which we should be aware of (e.g. previous fractures, muscle tone, asthma, etc.):
              </p>
            </div>

            <Label>Medical / Allergy Notes</Label>
            <textarea value={form.medicalNotes} onChange={set('medicalNotes')} placeholder="e.g. None / Asthma / Previous knee injury..." style={{ ...inputStyle, minHeight: '72px', resize: 'vertical' as const }} />

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', padding: '12px', background: form.indemnityAgreed ? '#f0fdf4' : '#fff7f7', borderRadius: '10px', border: `1.5px solid ${form.indemnityAgreed ? '#bbf7d0' : '#fecaca'}`, transition: 'all 0.2s' }}>
              <input type="checkbox" checked={form.indemnityAgreed} onChange={e => setForm(prev => ({ ...prev, indemnityAgreed: e.target.checked }))} style={{ width: '18px', height: '18px', marginTop: '1px', flexShrink: 0, accentColor: '#1e4da1' }} />
              <span style={{ fontSize: '12px', color: '#475569', lineHeight: '1.5', fontWeight: 600 }}>
                I confirm I have read and understood the indemnity declaration above, and agree to its terms on behalf of myself and the enrolled student. *
              </span>
            </label>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <Label>Signature *</Label>
                <button type="button" onClick={() => { setClearSig(c => c + 1); setSignatureDataUrl(''); }} style={{ fontSize: '11px', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>↺ Clear</button>
              </div>
              <div style={{ border: signatureError ? '2px solid #ef4444' : '2px solid transparent', borderRadius: '14px', transition: 'border-color 0.2s' }}>
                <SignaturePad onSign={handleSign} cleared={clearSig} />
              </div>
              {signatureDataUrl && (
                <p style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600, marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  Signature captured
                </p>
              )}
            </div>
          </Section>

          <div style={{ padding: '24px' }}>
            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span style={{ fontSize: '13px', color: '#dc2626', fontWeight: 600 }}>{error}</span>
              </div>
            )}
            <button onClick={handleSubmit} disabled={loading} style={{ width: '100%', padding: '18px', background: loading ? '#93c5fd' : 'linear-gradient(135deg, #1e4da1, #1e3a6e)', color: 'white', border: 'none', borderRadius: '14px', fontSize: '14px', fontWeight: 900, fontStyle: 'italic', letterSpacing: '1px', textTransform: 'uppercase', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 8px 24px rgba(30,77,161,0.4)', transition: 'all 0.2s' }}>
              {loading ? '⏳ Submitting...' : '✅ Complete Registration'}
            </button>
            <p style={{ textAlign: 'center', fontSize: '11px', color: '#94a3b8', marginTop: '12px' }}>
              By submitting you agree to the indemnity declaration. A signed PDF will be available to download.
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
