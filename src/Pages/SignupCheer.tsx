import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../../supabase';

type FormData = {
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  athleteName: string;
  athleteSurname: string;
  dob: string;
  age: string;
  grade: string;
  school: string;
  medicalConditions: string;
  allergies: string;
  medication: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  consentCorrect: boolean;
  consentInterest: boolean;
  consentStorage: boolean;
};

const EMPTY_FORM: FormData = {
  parentName: '',
  parentPhone: '',
  parentEmail: '',
  athleteName: '',
  athleteSurname: '',
  dob: '',
  age: '',
  grade: '',
  school: '',
  medicalConditions: '',
  allergies: '',
  medication: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  consentCorrect: false,
  consentInterest: false,
  consentStorage: false
};

export default function SignupCheer() {
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ownerUserId, setOwnerUserId] = useState<string | null>(null);

  useEffect(() => {
    // Parse ownerId from query params or hash
    const params = new URLSearchParams(window.location.search);
    let gymOwnerId = params.get('ownerId') || params.get('gym');

    if (!gymOwnerId && window.location.hash.includes('?')) {
      const hashQueryStr = window.location.hash.split('?')[1];
      const hashParams = new URLSearchParams(hashQueryStr);
      gymOwnerId = hashParams.get('ownerId') || hashParams.get('gym');
    }

    setOwnerUserId(gymOwnerId);
  }, []);

  const set = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const val = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setForm(prev => ({ ...prev, [key]: val }));
  };

  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '').slice(0, 8);
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
        if (testDate.getFullYear() === y && testDate.getMonth() === m - 1 && testDate.getDate() === d) {
          const birth = new Date(y, m - 1, d);
          const today = new Date();
          let calculatedAge = today.getFullYear() - birth.getFullYear();
          if (today.getMonth() - birth.getMonth() < 0 || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) {
            calculatedAge--;
          }
          if (calculatedAge >= 0) ageStr = String(calculatedAge);
        }
      }
    }

    setForm(prev => ({ ...prev, dob: formattedDob, age: ageStr }));
  };

  const validate = () => {
    if (!form.parentName.trim()) return 'Please enter parent/guardian full name.';
    if (!form.parentPhone.trim()) return 'Please enter parent/guardian cell number.';
    if (!/^[\d\s\+\-\(\)]{7,15}$/.test(form.parentPhone.replace(/\s+/g, ''))) {
      return 'Please enter a valid cell number.';
    }
    if (!form.parentEmail.trim()) return 'Please enter parent/guardian email address.';
    if (!/\S+@\S+\.\S+/.test(form.parentEmail.trim())) return 'Please enter a valid email address.';

    if (!form.athleteName.trim()) return "Please enter athlete's name.";
    if (!form.athleteSurname.trim()) return "Please enter athlete's surname.";
    if (!form.dob.trim()) return "Please enter athlete's date of birth.";

    const isFormatOk = /^([0-2][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/.test(form.dob);
    if (!isFormatOk) return "Please enter athlete's date of birth in DD/MM/YYYY format.";

    if (!form.emergencyContactName.trim()) return 'Please enter emergency contact name.';
    if (!form.emergencyContactPhone.trim()) return 'Please enter emergency contact number.';

    if (!form.consentCorrect) return 'You must confirm that the information supplied is correct.';
    if (!form.consentInterest) return 'You must acknowledge that this is an expression of interest only.';
    if (!form.consentStorage) return 'You must consent to JFLIPS storing your information.';

    return '';
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    if (!ownerUserId) {
      setError('Unable to load registration details. Please try again.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Format DOB to YYYY-MM-DD for Postgres
      let dobForDb = form.dob;
      const parts = form.dob.split('/');
      if (parts.length === 3) {
        dobForDb = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }

      const submissionId = `cheer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      const { error: dbError } = await supabase.from('cheer_registrations').insert({
        id: submissionId,
        user_id: ownerUserId,
        parent_name: form.parentName.trim(),
        parent_phone: form.parentPhone.trim(),
        parent_email: form.parentEmail.trim(),
        athlete_name: form.athleteName.trim(),
        athlete_surname: form.athleteSurname.trim(),
        dob: dobForDb,
        age: form.age ? parseInt(form.age, 10) : null,
        grade: form.grade.trim() || null,
        school: form.school.trim() || null,
        medical_conditions: form.medicalConditions.trim() || null,
        allergies: form.allergies.trim() || null,
        medication: form.medication.trim() || null,
        emergency_contact_name: form.emergencyContactName.trim(),
        emergency_contact_phone: form.emergencyContactPhone.trim(),
        consent_correct: form.consentCorrect,
        consent_interest: form.consentInterest,
        consent_storage: form.consentStorage,
        status: 'New'
      });

      if (dbError) throw new Error(dbError.message);

      // Try inserting into notifications as well to alert owner
      try {
        await supabase.from('notifications').insert({
          id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          user_id: ownerUserId,
          title: 'New Cheer Registration',
          message: `${form.athleteName} ${form.athleteSurname} has registered for Competitive Cheer.`,
          is_read: false,
          created_at: new Date().toISOString()
        });
      } catch (notifErr) {
        console.error('Failed to create notification', notifErr);
      }

      setSubmitted(true);
    } catch (e: any) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Invalid Link Screen
  if (!ownerUserId) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e3a6e 50%, #1e4da1 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ background: 'white', borderRadius: '24px', padding: '40px 32px', maxWidth: '420px', width: '100%', textAlign: 'center', boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
          <div style={{ width: '72px', height: '72px', background: '#fee2e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#ef4444', marginBottom: '12px' }}>INVALID LINK</h2>
          <p style={{ color: '#475569', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
            Invalid cheer signup link. Please contact JFLIPS for a valid Competitive Cheer registration link.
          </p>
          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: '20px', fontWeight: 900, fontStyle: 'italic', color: '#1e4da1' }}>JFLIPS</span>
            <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', color: '#94a3b8', marginTop: '4px' }}>Competitive Cheer</p>
          </div>
        </div>
      </div>
    );
  }

  // Success Screen
  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e3a6e 50%, #1e4da1 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ background: 'white', borderRadius: '24px', padding: '40px 32px', maxWidth: '420px', width: '100%', textAlign: 'center', boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
          <div style={{ width: '72px', height: '72px', background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#1e4da1', fontStyle: 'italic', marginBottom: '8px' }}>REGISTERED!</h2>
          <p style={{ color: '#475569', fontSize: '15px', lineHeight: '1.6', marginBottom: '20px' }}>
            Thank you! <strong>{form.athleteName} {form.athleteSurname}</strong> has been registered for JFLIPS Competitive Cheer.
          </p>
          <p style={{ color: '#64748b', fontSize: '13px', lineHeight: '1.5', marginBottom: '28px' }}>
            Please note that this registration is an expression of interest only and does not guarantee placement on a team. We will contact you soon!
          </p>
          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: '20px', fontWeight: 900, fontStyle: 'italic', color: '#1e4da1' }}>JFLIPS</span>
            <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', color: '#94a3b8', marginTop: '4px' }}>Competitive Cheer</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e3a6e 60%, #1e4da1 100%)', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ padding: '32px 24px 0', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', borderRadius: '16px', padding: '16px 32px', border: '1px solid rgba(255,255,255,0.15)', marginBottom: '24px' }}>
          <div style={{ fontSize: '32px', fontWeight: 900, fontStyle: 'italic', color: 'white', letterSpacing: '-1px', lineHeight: 1 }}>JFLIPS</div>
          <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '3px', color: '#93c5fd', marginTop: '4px' }}>Competitive Cheer</div>
        </div>
        <h1 style={{ fontSize: '22px', fontWeight: 900, color: 'white', marginBottom: '8px' }}>Competitive Cheer Registration</h1>
        <p style={{ fontSize: '13px', color: '#93c5fd' }}>Expression of Interest Form</p>
      </div>

      <div style={{ maxWidth: '480px', margin: '24px auto', padding: '0 16px 40px' }}>
        <div style={{ background: 'white', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.35)' }}>
          
          <Section label="Parent / Guardian Information" icon="👥" color="#0891b2">
            <div>
              <Label>Parent Full Name *</Label>
              <Input value={form.parentName} onChange={set('parentName')} placeholder="e.g. Sarah Smith" />
            </div>
            <Row>
              <div style={{ flex: 1 }}>
                <Label>Cell Number *</Label>
                <Input type="tel" value={form.parentPhone} onChange={set('parentPhone')} placeholder="e.g. 082 123 4567" />
              </div>
              <div style={{ flex: 1 }}>
                <Label>Email Address *</Label>
                <Input type="email" value={form.parentEmail} onChange={set('parentEmail')} placeholder="e.g. sarah@email.com" />
              </div>
            </Row>
          </Section>

          <Section label="Athlete Information" icon="🤸" color="#6366f1">
            <Row>
              <div style={{ flex: 1 }}>
                <Label>Athlete Name *</Label>
                <Input value={form.athleteName} onChange={set('athleteName')} placeholder="e.g. Leah" />
              </div>
              <div style={{ flex: 1 }}>
                <Label>Athlete Surname *</Label>
                <Input value={form.athleteSurname} onChange={set('athleteSurname')} placeholder="e.g. Smith" />
              </div>
            </Row>
            <Row>
              <div style={{ flex: 1 }}>
                <Label>Date of Birth *</Label>
                <Input type="text" placeholder="DD/MM/YYYY" value={form.dob} onChange={handleDobChange} />
              </div>
              <div style={{ flex: 1 }}>
                <Label>Age</Label>
                <Input value={form.age} readOnly placeholder="Auto-filled" style={{ background: '#f8fafc', color: '#64748b' }} />
              </div>
            </Row>
            <Row>
              <div style={{ flex: 1 }}>
                <Label>Grade</Label>
                <Input value={form.grade} onChange={set('grade')} placeholder="e.g. Grade 4" />
              </div>
              <div style={{ flex: 1 }}>
                <Label>School</Label>
                <Input value={form.school} onChange={set('school')} placeholder="e.g. Primary School" />
              </div>
            </Row>
          </Section>

          <Section label="Medical Information" icon="📋" color="#e11d48">
            <div>
              <Label>Medical Conditions</Label>
              <textarea value={form.medicalConditions} onChange={set('medicalConditions')} placeholder="List any medical conditions..." style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' as const }} />
            </div>
            <div>
              <Label>Allergies</Label>
              <Input value={form.allergies} onChange={set('allergies')} placeholder="List any allergies..." />
            </div>
            <div>
              <Label>Medication</Label>
              <Input value={form.medication} onChange={set('medication')} placeholder="List current medication..." />
            </div>
            <Row>
              <div style={{ flex: 1 }}>
                <Label>Emergency Contact Name *</Label>
                <Input value={form.emergencyContactName} onChange={set('emergencyContactName')} placeholder="e.g. John Smith" />
              </div>
              <div style={{ flex: 1 }}>
                <Label>Emergency Contact Number *</Label>
                <Input type="tel" value={form.emergencyContactPhone} onChange={set('emergencyContactPhone')} placeholder="e.g. 083 987 6543" />
              </div>
            </Row>
          </Section>

          <Section label="Consent Declarations" icon="✅" color="#16a34a">
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', padding: '12px', background: form.consentCorrect ? '#f0fdf4' : '#f8fafc', borderRadius: '10px', border: `1.5px solid ${form.consentCorrect ? '#bbf7d0' : '#e2e8f0'}`, transition: 'all 0.2s', marginBottom: '8px' }}>
              <input type="checkbox" checked={form.consentCorrect} onChange={e => setForm(prev => ({ ...prev, consentCorrect: e.target.checked }))} style={{ width: '18px', height: '18px', marginTop: '2px', flexShrink: 0, accentColor: '#1e4da1' }} />
              <span style={{ fontSize: '11px', color: '#475569', lineHeight: '1.5', fontWeight: 600 }}>
                I confirm the information supplied is correct. *
              </span>
            </label>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', padding: '12px', background: form.consentInterest ? '#f0fdf4' : '#f8fafc', borderRadius: '10px', border: `1.5px solid ${form.consentInterest ? '#bbf7d0' : '#e2e8f0'}`, transition: 'all 0.2s', marginBottom: '8px' }}>
              <input type="checkbox" checked={form.consentInterest} onChange={e => setForm(prev => ({ ...prev, consentInterest: e.target.checked }))} style={{ width: '18px', height: '18px', marginTop: '2px', flexShrink: 0, accentColor: '#1e4da1' }} />
              <span style={{ fontSize: '11px', color: '#475569', lineHeight: '1.5', fontWeight: 600 }}>
                I understand that this registration is an expression of interest only and does not guarantee placement on a team. *
              </span>
            </label>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', padding: '12px', background: form.consentStorage ? '#f0fdf4' : '#f8fafc', borderRadius: '10px', border: `1.5px solid ${form.consentStorage ? '#bbf7d0' : '#e2e8f0'}`, transition: 'all 0.2s' }}>
              <input type="checkbox" checked={form.consentStorage} onChange={e => setForm(prev => ({ ...prev, consentStorage: e.target.checked }))} style={{ width: '18px', height: '18px', marginTop: '2px', flexShrink: 0, accentColor: '#1e4da1' }} />
              <span style={{ fontSize: '11px', color: '#475569', lineHeight: '1.5', fontWeight: 600 }}>
                I consent to JFLIPS storing my information for athlete management purposes. *
              </span>
            </label>
          </Section>

          <div style={{ padding: '24px' }}>
            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span style={{ fontSize: '13px', color: '#dc2626', fontWeight: 600 }}>{error}</span>
              </div>
            )}
            <button onClick={handleSubmit} disabled={loading} style={{ width: '100%', padding: '18px', background: loading ? '#93c5fd' : 'linear-gradient(135deg, #1e4da1, #1e3a6e)', color: 'white', border: 'none', borderRadius: '14px', fontSize: '14px', fontWeight: 900, fontStyle: 'italic', letterSpacing: '1px', textTransform: 'uppercase', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 8px 24px rgba(30,77,161,0.4)', transition: 'all 0.2s' }}>
              {loading ? '⏳ Submitting...' : '✅ Register My Athlete'}
            </button>
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

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' as const }}>{children}</div>;
}

function Label({ children }: { children: React.ReactNode }) {
  return <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#64748b', display: 'block', marginBottom: '4px' }}>{children}</label>;
}

function Input({ style, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={{ ...inputStyle, ...style }} />;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  border: '1.5px solid #e2e8f0',
  borderRadius: '10px',
  fontSize: '14px',
  color: '#1e293b',
  background: 'white',
  outline: 'none',
  transition: 'border-color 0.2s',
  boxSizing: 'border-box',
  fontFamily: 'Inter, sans-serif'
};
