import { jsPDF } from 'jspdf';
import {
  Audience, TERMS_INTRO_ADULT, TERMS_INTRO_MINOR, TERMS_VERSION, termsSectionsFor
} from './indemnityText';
import { GENERAL_VERSION, MEDIA_KEYS, MEDIA_VERSION, generalFormFor, mediaFormFor } from './consentForms';

/**
 * THE SIGNED REGISTRATION PACK (one PDF).
 * Details of the child and parent, then the Terms and Conditions, the privacy notice
 * and the photo and video choices, then the one signature and a table of exactly
 * which version of each document was signed. It is the document to hand over as
 * proof of what a family saw and agreed to.
 *
 * One builder serves the PDF a parent downloads after signing up and the owner's
 * re-print from a child's profile, so they can never differ. All wording comes from
 * indemnityText.ts and consentForms.ts, the same files the sign-up page reads.
 */

export interface MediaRecord {
  version?: string | null;
  choices?: Record<string, boolean> | null;
  status?: string | null;
  signedAt?: string | null;
  /** Earlier states of this record (the parent changed their choices later). */
  history?: any[] | null;
}

export interface IndemnityPdfInput {
  studentName: string;
  dob?: string | null;
  age?: string | number | null;
  className?: string | null;
  audience: Audience;
  parentName: string;
  relationship: string;
  phone?: string | null;
  email?: string | null;
  parent2Name?: string | null;
  parent2Phone?: string | null;
  emergency?: { name?: string | null; phone?: string | null; relationship?: string | null } | null;
  medicalNotes?: string | null;
  young?: {
    stays: boolean; adultName: string; adultPhone: string;
    collectors: { name: string; phone: string }[]; notes: string;
  } | null;
  signature?: string | null;
  signedAt?: string | null;
  /** Version of the Terms and Conditions that was signed. */
  version?: string | null;
  /** Include the privacy notice (pass the version that was signed). */
  privacyVersion?: string | null;
  /** Include the photo and video consent with the choices that were made. */
  media?: MediaRecord | null;
}

const rgb = (hex: string): [number, number, number] =>
  [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];

export function buildIndemnityPdf(input: IndemnityPdfInput): jsPDF {
  const { audience } = input;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = 210;
  const margin = 20;
  const contentW = pageW - margin * 2;
  let y = 20;

  const header = () => {
    doc.setFillColor(30, 77, 161);
    doc.rect(0, 0, pageW, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18); doc.setFont('helvetica', 'bolditalic');
    doc.text('JFLIPS', margin, 17);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.text('STUNTING & TUMBLING', margin + 28, 17);
    doc.setFontSize(9);
    doc.text('SIGNED REGISTRATION FORMS', pageW - margin, 17, { align: 'right' });
  };
  header();
  y = 38;

  const ensure = (need: number) => {
    if (y + need > 276) { doc.addPage(); y = 20; }
  };
  const text = (t: string, o: { bold?: boolean; indent?: number; gap?: number; size?: number; color?: string } = {}) => {
    doc.setFont('helvetica', o.bold ? 'bold' : 'normal'); doc.setFontSize(o.size || 10); doc.setTextColor(...rgb(o.color || '#1e293b'));
    const lines = doc.splitTextToSize(t, contentW - (o.indent || 0));
    ensure(lines.length * 5 + (o.gap ?? 4));
    doc.text(lines, margin + (o.indent || 0), y);
    y += lines.length * 5 + (o.gap ?? 4);
  };
  const heading = (t: string) => {
    ensure(14);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...rgb('#1e4da1'));
    doc.text(t, margin, y); y += 5.5;
  };
  const band = (t: string) => {
    ensure(24);
    doc.setFillColor(248, 250, 252); doc.rect(margin, y, contentW, 6, 'F');
    doc.setTextColor(...rgb('#1e4da1')); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text(t.toUpperCase(), margin + 3, y + 4.5); y += 10;
  };
  const titleBlock = (t: string) => {
    ensure(26);
    doc.setTextColor(...rgb('#1e4da1')); doc.setFontSize(13); doc.setFont('helvetica', 'bold');
    const lines = doc.splitTextToSize(t, contentW);
    doc.text(lines, margin, y);
    y += lines.length * 6;
    doc.setDrawColor(30, 77, 161); doc.setLineWidth(0.5); doc.line(margin, y, pageW - margin, y); y += 6;
  };
  const fields = (rows: [string, string][]) => {
    doc.setFontSize(9); doc.setTextColor(...rgb('#475569'));
    rows.forEach(([label, value]) => {
      const vLines = doc.splitTextToSize(value, contentW - 48);
      ensure(vLines.length * 5 + 3);
      doc.setFont('helvetica', 'bold'); doc.text(`${label}:`, margin, y);
      doc.setFont('helvetica', 'normal'); doc.text(vLines, margin + 46, y);
      y += Math.max(7, vLines.length * 5 + 2);
    });
  };
  const newPage = () => { doc.addPage(); header(); y = 38; };

  const termsVersion = input.version || TERMS_VERSION;

  // ── Part 1: who signed ──
  titleBlock(audience === 'adult' ? 'Your details' : 'Details of the child and parent');
  band(audience === 'adult' ? 'Your details' : 'Student details');
  fields([
    ['Full Name', input.studentName || '—'],
    ['Date of Birth', input.dob || '—'],
    ['Age', input.age !== undefined && input.age !== null && input.age !== '' ? `${input.age} years` : '—'],
    ['Class Enrolled', input.className || '—']
  ]);
  y += 4;

  band(audience === 'adult' ? 'Contact details' : 'Parent / guardian details');
  const emergencyText = input.emergency
    ? [input.emergency.name, input.emergency.phone].filter(Boolean).join(' · ')
      + (input.emergency.relationship ? ` (${input.emergency.relationship})` : '')
    : '';
  const rows: [string, string][] = audience === 'adult'
    ? [
        ['Name', input.parentName || input.studentName || '—'],
        ['Phone', input.phone || '—'],
        ['Email', input.email || '—'],
        ['Emergency contact', emergencyText || '—']
      ]
    : [
        ['Parent 1 Name', input.parentName || '—'],
        ['Relationship', input.relationship || '—'],
        ['Parent 1 Phone', input.phone || '—'],
        ['Parent 1 Email', input.email || '—'],
        ...(input.parent2Name ? [['Parent 2 Name', input.parent2Name] as [string, string], ['Parent 2 Phone', input.parent2Phone || '—'] as [string, string]] : []),
        ['Emergency contact', emergencyText || '—'],
        ['Authority', 'Confirmed by tick box: parent or legal guardian, allowed to make decisions about the child\'s activities and medical care']
      ];
  fields(rows);
  y += 4;

  if (input.young) {
    const young = input.young;
    band('Young athlete (age 2 to 4)');
    fields([
      ['Adult staying at venue', young.stays ? 'Yes, a parent or responsible adult stays at the venue for the whole class' : 'No'],
      ['Adult at the venue', [young.adultName, young.adultPhone].filter(Boolean).join(' · ') || 'The parent'],
      ['May collect the child', (young.collectors || []).filter(c => c.name.trim()).map(c => c.name.trim() + (c.phone.trim() ? ' (' + c.phone.trim() + ')' : '')).join('; ') || '—'],
      ['Coaches should know', young.notes?.trim() || '—']
    ]);
    y += 4;
  }

  band(audience === 'adult' ? 'Your health' : 'The child\'s health');
  text(input.medicalNotes?.trim() || 'None');

  // ── Part 2: Terms and Conditions ──
  newPage();
  titleBlock('Terms and Conditions');
  text(audience === 'adult'
    ? TERMS_INTRO_ADULT(input.parentName || input.studentName)
    : TERMS_INTRO_MINOR(input.parentName, input.studentName), { gap: 6 });
  const sections = termsSectionsFor(audience);
  heading('Index');
  sections.forEach(s => text(`${s.number}.  ${s.heading}`, { indent: 3, gap: 1 }));
  y += 4;
  sections.forEach(s => {
    heading(`${s.number}. ${s.heading}`);
    s.paragraphs.forEach(p => text(p, { gap: 3 }));
    (s.items || []).forEach(i => text('•  ' + i, { indent: 3, gap: 1 }));
    if (s.outro) text(s.outro, { gap: 4 });
    y += 2;
  });
  text('Confirmed: I have read and understood the risks in section 2.', { bold: true, gap: 2 });
  text(audience === 'adult'
    ? 'Confirmed: I have read and I agree to the Terms and Conditions.'
    : 'Confirmed: I have read and I agree to the Terms and Conditions, on my own behalf and on behalf of the enrolled student.', { bold: true, gap: 6 });

  // ── Part 3: Privacy notice ──
  if (input.privacyVersion) {
    newPage();
    const general = generalFormFor(audience);
    titleBlock(general.title);
    text(general.subtitle, { size: 9, color: '#64748b', gap: 4 });
    text(general.intro, { gap: 6 });
    general.sections.forEach(s => {
      heading(s.heading);
      s.items.forEach(i => text('•  ' + i, { indent: 3, gap: 2 }));
      y += 2;
    });
    heading(general.declarationHeading);
    text(general.declaration, { gap: 3 });
    text('Confirmed: ' + general.agreeLabel.replace(/ \*$/, ''), { bold: true, gap: 4 });
    text(general.contact, { size: 8, color: '#64748b' });
  }

  // ── Part 4: Photo and video consent ──
  if (input.media) {
    newPage();
    const media = mediaFormFor(audience);
    titleBlock(media.title);
    text(media.subtitle, { size: 9, color: '#64748b', gap: 4 });
    text(media.intro, { gap: 6 });
    const choices = input.media.choices || {};
    const answerLine = (c: Record<string, boolean>) => {
      MEDIA_KEYS.forEach(k => {
        const v = c[k];
        const answer = v === true ? media.yes : v === false ? media.no : '-';
        const lines = doc.splitTextToSize(media.uses[k], contentW - 28);
        ensure(lines.length * 5 + 4);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(30, 41, 59);
        doc.text(lines, margin, y);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(v === true ? 22 : 185, v === true ? 163 : 28, v === true ? 74 : 28);
        doc.text(answer.toUpperCase(), pageW - margin, y, { align: 'right' });
        y += lines.length * 5 + 3;
      });
    };
    heading(media.useHeading);
    answerLine(choices);
    if (input.media.status === 'withdrawn') {
      text('STATUS: CONSENT WITHDRAWN. The answers above are the current ones (all No).', { bold: true, color: '#b91c1c', gap: 4 });
    }
    const earlier = (input.media.history || []).filter(h => h && h.choices);
    if (earlier.length > 0) {
      y += 2;
      heading('Earlier choices (kept as a record, never overwritten)');
      earlier.forEach(h => {
        text(`Signed ${h.signed_at ? new Date(h.signed_at).toLocaleString('en-ZA') : '—'}, version ${h.form_version || '—'}`, { bold: true, gap: 2 });
        answerLine(h.choices as Record<string, boolean>);
        y += 2;
      });
    }
    y += 2;
    heading(media.othersHeading); text(media.others, { gap: 4 });
    heading(media.promiseHeading); media.promises.forEach(p => text('•  ' + p, { indent: 3, gap: 2 }));
    y += 2;
    heading(media.rightsHeading); media.rights.forEach(r => text('•  ' + r, { indent: 3, gap: 2 }));
    y += 2;
    heading(media.declarationHeading);
    text(media.declaration, { gap: 4 });
    text(media.contact, { size: 8, color: '#64748b' });
  }

  // ── Signature and what was signed ──
  newPage();
  titleBlock('Signature');
  text('One signature covers every document in this pack.', { gap: 4 });
  band('Documents signed');
  const signedRows: [string, string][] = [
    ['Terms and Conditions', `version ${termsVersion}`]
  ];
  if (input.privacyVersion) signedRows.push(['Privacy notice (POPIA)', `version ${input.privacyVersion}`]);
  if (input.media) signedRows.push(['Photo and video consent (POPIA)', `version ${input.media.version || MEDIA_VERSION}`]);
  fields(signedRows);
  y += 6;

  if (input.signature) {
    try { doc.addImage(input.signature, 'PNG', margin, y, 80, 30); y += 34; }
    catch { doc.setFontSize(9); doc.text('[Signature image could not be shown]', margin, y + 5); y += 12; }
  } else {
    doc.setFont('helvetica', 'italic'); doc.setFontSize(9); doc.setTextColor(...rgb('#dc2626'));
    doc.text('No digital signature on record.', margin, y + 5); y += 12;
  }
  doc.setDrawColor(...rgb('#1e293b')); doc.setLineWidth(0.5);
  doc.line(margin, y, margin + 80, y);
  doc.line(margin + 100, y, margin + 160, y);
  doc.setTextColor(...rgb('#475569')); doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  doc.text(`Signature: ${input.parentName || input.studentName || ''}`, margin, y + 5);
  doc.setFont('helvetica', 'bold'); doc.text('Signed:', margin + 100, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.text((input.signedAt ? new Date(input.signedAt) : new Date()).toLocaleString('en-ZA'), margin + 114, y + 5);

  // Footer on every page, with the versions that were signed
  const versionText = [`Terms v${termsVersion}`, input.privacyVersion ? `Privacy v${input.privacyVersion}` : '', input.media ? `Photo v${input.media.version || MEDIA_VERSION}` : '']
    .filter(Boolean).join('  ·  ');
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFillColor(30, 77, 161); doc.rect(0, 287, pageW, 10, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(7); doc.setFont('helvetica', 'normal');
    doc.text(`JFLIPS TUMBLING  |  ${versionText}  |  ${p}/${pageCount}`, pageW / 2, 293, { align: 'center' });
  }
  return doc;
}

export function indemnityPdfFileName(studentName: string, signedAt?: string | null): string {
  return `JFLIPS_Registration_${studentName.replace(/\s+/g, '_')}_${(signedAt ? new Date(signedAt) : new Date()).toISOString().slice(0, 10)}.pdf`;
}

export { GENERAL_VERSION };
