import { jsPDF } from 'jspdf';
import { Audience, TERMS_VERSION, termsFor } from './indemnityText';
import { GENERAL_VERSION, MEDIA_KEYS, MEDIA_VERSION, generalFormFor, mediaFormFor } from './consentForms';
import { COLORS, PdfDoc } from './pdfDesign';

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
 * The look (letterhead, footer, tables) comes from pdfDesign.ts. This file decides
 * what goes in; it does not change any wording.
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

export function buildIndemnityPdf(input: IndemnityPdfInput): jsPDF {
  const { audience } = input;
  const d = new PdfDoc();
  const termsVersion = input.version || TERMS_VERSION;
  const when = input.signedAt ? new Date(input.signedAt) : new Date();
  const whenText = when.toLocaleString('en-ZA');

  // ── Part 1: who signed ──
  d.title(audience === 'adult' ? 'Your details' : 'Details of the child and parent');

  d.section(audience === 'adult' ? 'Your details' : 'Student details');
  d.details([
    ['Full Name', input.studentName || '—'],
    ['Date of Birth', input.dob || '—'],
    ['Age', input.age !== undefined && input.age !== null && input.age !== '' ? `${input.age} years` : '—']
  ]);

  d.section(audience === 'adult' ? 'Contact details' : 'Parent / guardian details');
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
  d.details(rows);

  if (input.young) {
    const young = input.young;
    d.section('Young athlete (age 2 to 4)');
    d.details([
      ['Adult staying at venue', young.stays ? 'Yes, a parent or responsible adult stays at the venue for the whole class' : 'No'],
      ['Adult at the venue', [young.adultName, young.adultPhone].filter(Boolean).join(' · ') || 'The parent'],
      ['May collect the child', (young.collectors || []).filter(c => c.name.trim()).map(c => c.name.trim() + (c.phone.trim() ? ' (' + c.phone.trim() + ')' : '')).join('; ') || '—'],
      ['Coaches should know', young.notes?.trim() || '—']
    ]);
  }

  d.section(audience === 'adult' ? 'Your health' : 'The child\'s health');
  d.paragraph(input.medicalNotes?.trim() || 'None');

  // ── Part 2: Terms and Conditions ──
  d.startPage();
  d.title('Terms and Conditions');
  const terms = termsFor(audience, termsVersion, { parent: input.parentName, child: input.studentName, name: input.parentName || input.studentName });
  if (terms.notStored) d.paragraph(terms.notStored, { bold: true, size: 9, color: COLORS.warn });
  d.paragraph(terms.intro);
  const sections = terms.sections;
  d.subheading('Index');
  sections.forEach(s => d.paragraph(`${s.number}.  ${s.heading}`, { indent: 3, gap: 0.6 }));
  d.gap(2);
  sections.forEach(s => {
    d.section(`${s.number}. ${s.heading}`);
    s.paragraphs.forEach(p => d.paragraph(p));
    (s.items || []).forEach(i => d.bullet(i));
    if (s.items) d.gap(2);
    if (s.outro) d.paragraph(s.outro);
  });
  d.paragraph('Confirmed: I have read and understood the risks in section 2.', { bold: true, gap: 1.5 });
  d.paragraph(audience === 'adult'
    ? 'Confirmed: I have read and I agree to the Terms and Conditions.'
    : 'Confirmed: I have read and I agree to the Terms and Conditions, on my own behalf and on behalf of the enrolled student.', { bold: true });

  // ── Part 3: Privacy notice ──
  if (input.privacyVersion) {
    d.startPage();
    const general = generalFormFor(audience, input.privacyVersion);
    d.title(general.title);
    d.paragraph(general.subtitle, { italic: true, size: 9, color: COLORS.grey, gap: 3 });
    if (general.notStored) d.paragraph(general.notStored, { bold: true, size: 9, color: COLORS.warn });
    d.paragraph(general.intro);
    general.sections.forEach(s => {
      d.section(s.heading);
      if (s.lead) d.paragraph(s.lead, { gap: 2 });
      s.items.forEach(i => d.bullet(i));
      if (s.tail) d.paragraph(s.tail, { gap: 2 });
    });
    d.section(general.declarationHeading);
    d.paragraph(general.declaration);
    d.paragraph('Confirmed: ' + general.agreeLabel.replace(/ \*$/, ''), { bold: true, gap: 3 });
    d.paragraph(general.contact, { size: 9, color: COLORS.grey });
  }

  // ── Part 4: Photo and video consent ──
  if (input.media) {
    d.startPage();
    const media = mediaFormFor(audience, input.media.version);
    d.title(media.title);
    d.paragraph(media.subtitle, { italic: true, size: 9, color: COLORS.grey, gap: 3 });
    if (media.notStored) d.paragraph(media.notStored, { bold: true, size: 9, color: COLORS.warn });
    d.paragraph(media.intro);
    const choices = input.media.choices || {};
    const rowsFor = (c: Record<string, boolean>) =>
      MEDIA_KEYS.map(k => ({ label: media.uses[k], answer: typeof c[k] === 'boolean' ? c[k] : undefined }));
    d.section(media.useHeading);
    d.choices(['Use', media.yes, media.no], rowsFor(choices));
    if (input.media.status === 'withdrawn') {
      d.paragraph('STATUS: CONSENT WITHDRAWN. The answers above are the current ones (all No).', { bold: true, color: COLORS.warn });
    }
    const earlier = (input.media.history || []).filter(h => h && h.choices);
    if (earlier.length > 0) {
      d.section('Earlier choices (kept as a record, never overwritten)');
      earlier.forEach(h => {
        d.subheading(`Signed ${h.signed_at ? new Date(h.signed_at).toLocaleString('en-ZA') : '—'}, version ${h.form_version || '—'}`);
        d.choices(['Use', media.yes, media.no], rowsFor(h.choices as Record<string, boolean>));
      });
    }
    if (media.choiceNote) d.paragraph(media.choiceNote, { size: 9, color: COLORS.grey, gap: 3 });
    if (media.others) { d.section(media.othersHeading); d.paragraph(media.others); }
    d.section(media.promiseHeading);
    media.promises.forEach(p => d.bullet(p));
    d.section(media.rightsHeading);
    media.rights.forEach(r => d.bullet(r));
    d.section(media.declarationHeading);
    d.paragraph(media.declaration, { gap: 3 });
    d.paragraph(media.contact, { size: 9, color: COLORS.grey });
  }

  // ── Signature and what was signed ──
  d.startPage();
  d.title('Signature');
  d.paragraph('One signature covers every document in this pack.');
  d.section('Signature');
  d.signature({ image: input.signature, name: input.parentName || input.studentName || '', when: whenText });
  d.section('Document versions');
  const signedRows: string[][] = [['Terms and Conditions', `version ${termsVersion}`, whenText]];
  if (input.privacyVersion) signedRows.push(['Privacy notice (POPIA)', `version ${input.privacyVersion}`, whenText]);
  if (input.media) signedRows.push(['Photo and video consent (POPIA)', `version ${input.media.version || MEDIA_VERSION}`, whenText]);
  d.simpleTable(['Document', 'Version', 'Date signed'], signedRows, [76, 38, 52]);

  const versionText = [`Terms v${termsVersion}`, input.privacyVersion ? `Privacy v${input.privacyVersion}` : '', input.media ? `Photo v${input.media.version || MEDIA_VERSION}` : '']
    .filter(Boolean).join('  ·  ');
  return d.finish(versionText);
}

export function indemnityPdfFileName(studentName: string, signedAt?: string | null): string {
  return `JFLIPS_Registration_${studentName.replace(/\s+/g, '_')}_${(signedAt ? new Date(signedAt) : new Date()).toISOString().slice(0, 10)}.pdf`;
}

export { GENERAL_VERSION };
