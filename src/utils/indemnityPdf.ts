import { jsPDF } from 'jspdf';
import {
  Audience, INDEMNITY_INTRO_ADULT, INDEMNITY_INTRO_MINOR, INDEMNITY_RISKS, INDEMNITY_VERSION,
  healthSectionFor, indemnityClausesFor, indemnityRisksFor
} from './indemnityText';

/**
 * THE SIGNED INDEMNITY PDF.
 * One builder for both the page a parent sees after signing up and the owner's
 * re-print from a child's profile, so they can never differ. The wording comes from
 * indemnityText.ts, the same file the sign-up page reads.
 */

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
  version?: string | null;
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

  doc.setTextColor(...rgb('#1e4da1'));
  doc.setFontSize(13); doc.setFont('helvetica', 'bold');
  doc.text('INDEMNITY & MEDICAL DECLARATION', margin, y);
  doc.setDrawColor(30, 77, 161); doc.setLineWidth(0.5);
  doc.line(margin, y + 3, pageW - margin, y + 3);
  y += 12;

  const ensure = (need: number) => {
    if (y + need > 276) { doc.addPage(); y = 20; }
  };
  const text = (t: string, o: { bold?: boolean; indent?: number; gap?: number } = {}) => {
    doc.setFont('helvetica', o.bold ? 'bold' : 'normal'); doc.setFontSize(10); doc.setTextColor(...rgb('#1e293b'));
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
    doc.text(t, margin + 3, y + 4.5); y += 10;
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

  // Health and emergencies
  const hs = healthSectionFor(audience);
  heading('Health information');
  text(input.medicalNotes?.trim() || 'None');
  heading(hs.emergencyHeading);
  hs.emergency.forEach(t => text(t));
  text('Confirmed: ' + hs.tick.replace(/ \*$/, ''), { bold: true, gap: 6 });

  // Risks and indemnity
  heading('Risks and indemnity');
  text(audience === 'adult'
    ? INDEMNITY_INTRO_ADULT(input.parentName || input.studentName)
    : INDEMNITY_INTRO_MINOR(input.parentName, input.studentName));
  const risks = indemnityRisksFor(audience);
  heading(INDEMNITY_RISKS.heading);
  text(risks.intro, { gap: 2 });
  risks.items.forEach(i => text('•  ' + i, { indent: 3, gap: 1 }));
  text(risks.outro, { gap: 5 });
  indemnityClausesFor(audience).forEach(c => { heading(c.heading); text(c.text); });
  text('Confirmed: I have read and understood the risks described above.', { bold: true, gap: 2 });
  text(audience === 'adult'
    ? 'Confirmed: I agree to the responsibility terms above.'
    : 'Confirmed: I agree to the responsibility terms above, on my own behalf and on behalf of the enrolled student.', { bold: true, gap: 6 });

  doc.setDrawColor(...rgb('#e2e8f0')); doc.setLineWidth(0.4); doc.line(margin, y, pageW - margin, y); y += 8;

  // Student details
  band(audience === 'adult' ? 'YOUR DETAILS' : 'STUDENT DETAILS');
  fields([
    ['Full Name', input.studentName || '—'],
    ['Date of Birth', input.dob || '—'],
    ['Age', input.age !== undefined && input.age !== null && input.age !== '' ? `${input.age} years` : '—'],
    ['Class Enrolled', input.className || '—']
  ]);
  y += 4;

  // Parent / contact details
  band(audience === 'adult' ? 'CONTACT DETAILS' : 'PARENT / GUARDIAN DETAILS');
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
  y += 6;

  doc.setDrawColor(...rgb('#e2e8f0')); doc.line(margin, y, pageW - margin, y); y += 8;

  // Young athlete: the supervision arrangement the parent agreed to
  if (input.young) {
    const young = input.young;
    ensure(40);
    band('YOUNG ATHLETE (AGE 2 TO 4)');
    fields([
      ['Adult staying at venue', young.stays ? 'Yes, a parent or responsible adult stays at the venue for the whole class' : 'No'],
      ['Adult at the venue', [young.adultName, young.adultPhone].filter(Boolean).join(' · ') || 'The parent'],
      ['May collect the child', (young.collectors || []).filter(c => c.name.trim()).map(c => c.name.trim() + (c.phone.trim() ? ' (' + c.phone.trim() + ')' : '')).join('; ') || '—'],
      ['Coaches should know', young.notes?.trim() || '—']
    ]);
    y += 4;
  }

  // Signature
  ensure(62);
  band('SIGNATURE');
  y += 2;
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
  doc.text('Signature', margin, y + 5);
  doc.setFont('helvetica', 'bold'); doc.text('Date:', margin + 100, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.text((input.signedAt ? new Date(input.signedAt) : new Date()).toLocaleDateString('en-ZA'), margin + 114, y + 5);

  // Footer on every page, with the version that was signed
  const version = input.version || INDEMNITY_VERSION;
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFillColor(30, 77, 161); doc.rect(0, 287, pageW, 10, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(7); doc.setFont('helvetica', 'normal');
    doc.text(`JFLIPS TUMBLING  |  This document serves as an official indemnity declaration.  |  v${version}  |  ${p}/${pageCount}`, pageW / 2, 293, { align: 'center' });
  }
  return doc;
}

export function indemnityPdfFileName(studentName: string, signedAt?: string | null): string {
  return `JFLIPS_Indemnity_${studentName.replace(/\s+/g, '_')}_${(signedAt ? new Date(signedAt) : new Date()).toISOString().slice(0, 10)}.pdf`;
}
