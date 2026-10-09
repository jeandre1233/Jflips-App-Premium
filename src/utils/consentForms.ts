/**
 * POPIA CONSENT FORMS
 * ═══════════════════
 * Two separate forms, each signed on its own:
 *
 *   general — the privacy notice: what JFlips collects about a family and why.
 *             DRAFT wording. Version stays '1.0-draft' until a POPIA-literate
 *             professional has confirmed it, then bump GENERAL_VERSION to '1.0'.
 *   media   — photo / video / social media consent, six separate Yes/No uses.
 *
 * The wording lives ONLY in this file. Every signed record stores the version it
 * was signed under, so editing the text here (and bumping the version) never
 * rewrites what an earlier parent agreed to.
 */

import { jsPDF } from 'jspdf';
import type { Audience } from './indemnityText';

export type Lang = 'en';
export type ConsentKind = 'general' | 'media';

export const GENERAL_VERSION = '1.2-draft';
export const MEDIA_VERSION = '1.0';

export const MEDIA_KEYS = [
  'instagramFacebookPhotos',
  'instagramFacebookVideos',
  'firstNameOnly',
  'website',
  'printedMaterial',
  'internalRecordings'
] as const;
export type MediaKey = typeof MEDIA_KEYS[number];

export interface ConsentRecord {
  id: string;
  user_id: string;
  family_key: string;
  token: string;
  kind: ConsentKind;
  status: 'pending' | 'signed' | 'withdrawn';
  family_label?: string | null;
  child_first_names?: string[] | null;
  parent_name?: string | null;
  parent_phone?: string | null;
  parent_email?: string | null;
  details?: { relationship?: string; school_grade?: string; audience?: Audience } | null;
  choices?: Record<string, boolean> | null;
  signature_data?: string | null;
  language?: Lang | null;
  form_version?: string | null;
  signed_at?: string | null;
  history?: any[] | null;
  created_at?: string;
}

const CONTACT = {
  en: 'Questions, or want to change your choices? Contact Jeandre Blacquiere on WhatsApp 069 040 3387 or jflipsinc@gmail.com.'
};

// ── PHOTO / VIDEO CONSENT ───────────────────────────────────────────────────
export const MEDIA_FORM: Record<Lang, {
  title: string; subtitle: string; intro: string;
  uses: Record<MediaKey, string>;
  useHeading: string; yes: string; no: string;
  promiseHeading: string; promises: string[];
  rightsHeading: string; rights: string[];
  declarationHeading: string; declaration: string;
  contact: string;
}> = {
  en: {
    title: 'Consent form: photos, videos and social media',
    subtitle: 'In terms of the Protection of Personal Information Act (POPIA)',
    intro: "JFlips sometimes takes photos and videos of children during classes, practices and showcases. We would like to use them to promote the sport and show children's progress. A child's photo or video is personal information, and we may only use it with the prior consent of a parent or legal guardian. Please choose below, for each use, whether you give consent. It is voluntary, and a \"no\" has no effect on your child's place at JFlips.",
    useHeading: 'What are you consenting to?',
    yes: 'Yes', no: 'No',
    uses: {
      instagramFacebookPhotos: "Photos of my child on JFlips's Instagram and Facebook pages",
      instagramFacebookVideos: "Videos of my child on JFlips's Instagram and Facebook pages",
      firstNameOnly: "My child's first name with photos and videos (never their surname)",
      website: "Photos and videos of my child on JFlips's website (jflips.co.za)",
      printedMaterial: 'Photos and videos of my child in printed material and presentations to schools, such as brochures',
      internalRecordings: 'Recordings of my child during classes for coaching and progress, which are not made public'
    },
    promiseHeading: 'Our promise',
    promises: [
      'We only use photos and videos to promote JFlips and the sport and to show children\'s progress.',
      'We do not name a child\'s surname, address or school with photos and videos, and we do not tag children on social media.',
      'We only share appropriate and respectful photos and videos.',
      'We do not sell photos or videos or give them to third parties for their own use.',
      'We store recordings securely and delete them when we no longer need them or when you ask us to.'
    ],
    rightsHeading: 'Your rights',
    rights: [
      "You can change or withdraw your consent at any time by contacting us. We will then remove the photos and videos from JFlips's own pages and website as soon as possible. We cannot control content that others have already saved or shared.",
      'You can ask what information we hold about your child, and ask for it to be corrected or deleted.',
      'This form and your choices are kept for as long as your child is at JFlips, and after that only for as long as necessary.',
      "If you feel your child's personal information has been mishandled, you can lodge a complaint with the Information Regulator: POPIAComplaints@inforegulator.org.za."
    ],
    declarationHeading: 'Declaration and signature',
    declaration: 'I declare that I am the parent or legal guardian of the child named above and am competent to give consent on my child\'s behalf. I have read and understood this form, and my choices are voluntary.',
    contact: CONTACT.en
  }
};

// ── GENERAL POPIA PRIVACY NOTICE (DRAFT) ────────────────────────────────────
export const GENERAL_FORM: Record<Lang, {
  title: string; subtitle: string; intro: string;
  sections: { heading: string; items: string[] }[];
  agreeLabel: string;
  declarationHeading: string; declaration: string;
  contact: string;
}> = {
  en: {
    title: 'Privacy notice and consent',
    subtitle: 'In terms of the Protection of Personal Information Act (POPIA)',
    intro: "JFlips is the responsible party for your family's personal information. This notice explains what we collect, why we collect it, who can see it and what your rights are. Please read it and confirm below.",
    sections: [
      {
        heading: 'Who is responsible for your information',
        items: [
          'JFlips (Jeandre Blacquiere). You can contact us on WhatsApp 069 040 3387 or at jflipsinc@gmail.com.'
        ]
      },
      {
        heading: 'What we collect',
        items: [
          "About your child: name, date of birth and age, class or team, attendance, and any medical conditions, injuries or allergies you tell us about.",
          'About you: name, relationship to the child, cell number, email address and your signature.',
          'Billing: invoices, the amounts owed and whether they have been paid.'
        ]
      },
      {
        heading: 'Payments',
        items: [
          'Payments are made by EFT (electronic funds transfer).'
        ]
      },
      {
        heading: 'Is giving us your information voluntary?',
        items: [
          'Yes, but we need your details, an emergency contact and your child\'s health information to enrol your child and keep them safe. Without them we cannot enrol your child. Giving us photo and video consent is a separate choice and is always optional.'
        ]
      },
      {
        heading: 'Why we collect it',
        items: [
          'To register your child and run classes, teams and practices safely.',
          'To contact you about classes, schedules, emergencies and payments.',
          'To invoice you and record payments.',
          'To keep the records the law requires, such as financial records.',
          "Your child's medical information is special personal information. We use it only to keep your child safe and to give the right information to a doctor or medical help in an emergency."
        ]
      },
      {
        heading: 'Who can see it',
        items: [
          "JFlips management. Your child's coaches can see your child's name, age, medical information and your contact numbers, so they can keep your child safe and reach you in an emergency. Your signature, email address and billing details stay with management.",
          'We do not sell your information, and we do not share it with anyone else unless the law requires it or a doctor needs it in an emergency.'
        ]
      },
      {
        heading: 'How long we keep it',
        items: [
          'We will delete all of your and your child\'s information when your child chooses to leave the club, once you have told us so and all accounts are paid.'
        ]
      },
      {
        heading: 'Your rights',
        items: [
          'You can ask what information we hold about you and your child, and ask for it to be corrected or deleted.',
          'You can object to how we use your information, or withdraw this consent, at any time by contacting us. We must keep some records by law, and without safety and contact details we may not be able to keep your child enrolled.',
          'If you feel your information has been mishandled, you can lodge a complaint with the Information Regulator: POPIAComplaints@inforegulator.org.za.'
        ]
      }
    ],
    agreeLabel: 'I have read and understood this privacy notice, and I agree to it.',
    declarationHeading: 'Declaration and signature',
    declaration: "I declare that I am the parent or legal guardian of the child or children listed and am competent to give consent on their behalf. I consent to JFlips processing my personal information and my child's personal information, including my child's medical information, as described in this notice.",
    contact: CONTACT.en
  }
};

// ── ADULT PARTICIPANT PATH (18 and over, signs for themselves). DRAFT for the lawyer. ──
export function mediaFormFor(a: Audience) {
  const base = MEDIA_FORM.en;
  if (a !== 'adult') return base;
  return {
    ...base,
    intro: "JFlips sometimes takes photos and videos during classes, practices and showcases. We would like to use them to promote the sport and show progress. A photo or video of you is personal information, and we may only use it with your consent. Please choose below, for each use, whether you give consent. It is voluntary, and a \"no\" has no effect on your place at JFlips.",
    uses: {
      instagramFacebookPhotos: "Photos of me on JFlips's Instagram and Facebook pages",
      instagramFacebookVideos: "Videos of me on JFlips's Instagram and Facebook pages",
      firstNameOnly: 'My first name with photos and videos (never my surname)',
      website: "Photos and videos of me on JFlips's website (jflips.co.za)",
      printedMaterial: 'Photos and videos of me in printed material and presentations to schools, such as brochures',
      internalRecordings: 'Recordings of me during classes for coaching and progress, which are not made public'
    },
    promises: base.promises.map((p, i) => i === 1
      ? 'We do not name your surname or address with photos and videos, and we do not tag you on social media.'
      : p),
    rights: base.rights.map((r, i) => i === 1
      ? 'You can ask what information we hold about you, and ask for it to be corrected or deleted.'
      : i === 3
        ? 'If you feel your personal information has been mishandled, you can lodge a complaint with the Information Regulator: POPIAComplaints@inforegulator.org.za.'
        : r),
    declaration: 'I declare that I am 18 years or older and am competent to give this consent for myself. I have read and understood this form, and my choices are voluntary.'
  };
}

export function generalFormFor(a: Audience) {
  const base = GENERAL_FORM.en;
  if (a !== 'adult') return base;
  const swap: Record<string, string[]> = {
    'What we collect': [
      'About you: name, date of birth and age, class or team, attendance, and any medical conditions, injuries or allergies you tell us about.',
      'Contact details: your cell number, email address and your signature.',
      'Billing: invoices, the amounts owed and whether they have been paid.'
    ],
    'Who can see it': [
      "JFlips management. Your coaches can see your name, age, medical information and your cell number, so they can keep you safe and reach you in an emergency. Your signature, email address and billing details stay with management.",
      'We do not sell your information, and we do not share it with anyone else unless the law requires it or a doctor needs it in an emergency.'
    ],
    'How long we keep it': [
      'We will delete all of your information when you choose to leave the club, once you have told us so and all accounts are paid.'
    ],
    'Your rights': [
      'You can ask what information we hold about you, and ask for it to be corrected or deleted.',
      'You can object to how we use your information, or withdraw this consent, at any time by contacting us. We must keep some records by law, and without safety and contact details we may not be able to keep you enrolled.',
      'If you feel your information has been mishandled, you can lodge a complaint with the Information Regulator: POPIAComplaints@inforegulator.org.za.'
    ],
    'Why we collect it': [
      'To enrol you and run classes, teams and practices safely.',
      'To contact you about classes, schedules, emergencies and payments.',
      'To invoice you and record payments.',
      'To keep the records the law requires, such as financial records.',
      'Your medical information is special personal information. We use it only to keep you safe and to give the right information to a doctor or medical help in an emergency.'
    ],
    'Is giving us your information voluntary?': [
      'Yes, but we need your details, an emergency contact and your health information to enrol you and keep you safe. Without them we cannot enrol you. Photo and video consent is a separate choice and is always optional.'
    ]
  };
  return {
    ...base,
    sections: base.sections.map(s => (swap[s.heading] ? { ...s, items: swap[s.heading] } : s)),
    declaration: 'I declare that I am 18 years or older and am competent to give consent for myself. I consent to JFlips processing my personal information, including my medical information, as described in this notice.'
  };
}

export const uiFor = (a: Audience): Record<string, string> =>
  a === 'adult'
    ? { ...UI.en, childrenLabel: 'Participant', parentHeading: 'Your details', relationship: 'Capacity', familyOf: 'for' }
    : UI.en;

// ── Page strings (not part of the legal wording) ────────────────────────────
export const UI: Record<Lang, Record<string, string>> = {
  en: {
    pageTitle: 'JFlips forms', childrenLabel: 'Children',
    parentHeading: 'Parent or guardian details', fullName: 'Full name', relationship: 'Relationship to the child (parent or legal guardian)',
    cell: 'Cell number', email: 'Email address', signHere: 'Signature', clear: 'Clear',
    signatureCaptured: 'Signature captured', submitGeneral: 'Sign privacy notice', submitMedia: 'Sign photo and video consent',
    withdraw: 'Withdraw all photo and video consent', confirmWithdraw: 'Yes, withdraw my consent', cancel: 'Cancel',
    saved: 'Thank you. Your form has been saved.', alreadySigned: 'Signed', pending: 'Not signed yet', withdrawn: 'Consent withdrawn',
    changeChoices: 'You can change your choices below at any time.', downloadPdf: 'Download signed copy (PDF)',
    invalidLink: 'This link is not valid. Please contact JFlips for a new one.', loading: 'Loading...',
    needAll: 'Please answer Yes or No for every use.', needSignature: 'Please sign before submitting.',
    needName: 'Please enter your full name.', needAgree: 'Please tick the box to confirm you agree.',
    step1: 'Step 1: Privacy notice', step2: 'Step 2: Photos and videos', optional: 'Your choice here never affects your child\'s place at JFlips.',
    familyOf: 'for'
  }
};

/** An unguessable link code: 24 random bytes as base64url (32 characters). */
export function newConsentToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  let bin = '';
  bytes.forEach(b => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export type ConsentStatusLabel = 'Not sent' | 'Waiting' | 'Signed' | 'Withdrawn';
export function statusLabel(r?: Pick<ConsentRecord, 'status'> | null): ConsentStatusLabel {
  if (!r) return 'Not sent';
  if (r.status === 'signed') return 'Signed';
  if (r.status === 'withdrawn') return 'Withdrawn';
  return 'Waiting';
}

/** The link a parent opens. Hash route, matching the existing /#/signup link. */
export function consentUrl(token: string): string {
  return `${window.location.origin}/#/consent/${token}`;
}

// ── PDF ─────────────────────────────────────────────────────────────────────
export interface ConsentPdfInput {
  kind: ConsentKind;
  lang: Lang;
  childNames: string;
  parentName: string;
  parentPhone?: string;
  parentEmail?: string;
  relationship?: string;
  choices?: Record<string, boolean> | null;
  signature?: string | null;
  signedAt?: string | null;
  version?: string | null;
  status?: 'pending' | 'signed' | 'withdrawn';
  audience?: Audience;
}

export function generateConsentPdf(input: ConsentPdfInput, opts: { save?: boolean } = { save: true }): jsPDF {
  const { kind, lang } = input;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = 210, margin = 20, contentW = pageW - margin * 2, bottom = 278;
  let y = 38;

  const aud: Audience = input.audience === 'adult' ? 'adult' : 'minor';
  const media = mediaFormFor(aud);
  const general = generalFormFor(aud);
  const ui = uiFor(aud);
  const title = kind === 'media' ? media.title : general.title;
  const subtitle = kind === 'media' ? media.subtitle : general.subtitle;

  const header = () => {
    doc.setFillColor(30, 77, 161); doc.rect(0, 0, pageW, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18); doc.setFont('helvetica', 'bolditalic'); doc.text('JFLIPS', margin, 17);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.text('STUNTING & TUMBLING', margin + 28, 17);
  };
  const footer = () => {
    const pages = doc.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p);
      doc.setFillColor(30, 77, 161); doc.rect(0, 287, pageW, 10, 'F');
      doc.setTextColor(255, 255, 255); doc.setFontSize(7); doc.setFont('helvetica', 'normal');
      doc.text(`JFLIPS  |  ${title}  |  v${input.version || (kind === 'media' ? MEDIA_VERSION : GENERAL_VERSION)}  |  ${p}/${pages}`, pageW / 2, 293, { align: 'center' });
    }
  };
  const ensure = (need: number) => {
    if (y + need > bottom) { doc.addPage(); header(); y = 38; }
  };
  const para = (text: string, o: { bold?: boolean; size?: number; color?: [number, number, number]; gap?: number; indent?: number } = {}) => {
    doc.setFont('helvetica', o.bold ? 'bold' : 'normal');
    doc.setFontSize(o.size || 10);
    doc.setTextColor(...(o.color || [30, 41, 59]));
    const lines = doc.splitTextToSize(text, contentW - (o.indent || 0));
    ensure(lines.length * 5 + (o.gap ?? 3));
    doc.text(lines, margin + (o.indent || 0), y);
    y += lines.length * 5 + (o.gap ?? 3);
  };
  const heading = (text: string) => {
    ensure(14);
    doc.setFillColor(248, 250, 252); doc.rect(margin, y, contentW, 6.5, 'F');
    doc.setTextColor(30, 77, 161); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text(text.toUpperCase(), margin + 3, y + 4.6);
    y += 11;
  };
  const bullet = (text: string) => para(`•  ${text}`, { indent: 3, gap: 2 });
  const field = (label: string, value: string) => {
    ensure(7);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(71, 85, 105);
    doc.text(`${label}:`, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(doc.splitTextToSize(value || '-', contentW - 60), margin + 58, y);
    y += 7;
  };

  header();
  doc.setTextColor(30, 77, 161); doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
  const titleLines = doc.splitTextToSize(title, contentW);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 6;
  doc.setDrawColor(30, 77, 161); doc.setLineWidth(0.5); doc.line(margin, y, pageW - margin, y); y += 6;
  para(subtitle, { size: 9, color: [100, 116, 139], gap: 5 });
  para(kind === 'media' ? media.intro : general.intro, { gap: 6 });

  heading(ui.childrenLabel);
  field(ui.childrenLabel, input.childNames);

  heading(ui.parentHeading);
  field(ui.fullName, input.parentName);
  field(ui.relationship.replace(/ \(.*\)$/, ''), input.relationship || '');
  field(ui.cell, input.parentPhone || '');
  field(ui.email, input.parentEmail || '');
  y += 2;

  if (kind === 'media') {
    heading(media.useHeading);
    MEDIA_KEYS.forEach(k => {
      const v = input.choices ? input.choices[k] : undefined;
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
    y += 2;
    heading(media.promiseHeading); media.promises.forEach(bullet); y += 2;
    heading(media.rightsHeading); media.rights.forEach(bullet); y += 2;
  } else {
    general.sections.forEach(s => { heading(s.heading); s.items.forEach(bullet); y += 2; });
  }

  heading(kind === 'media' ? media.declarationHeading : general.declarationHeading);
  para(kind === 'media' ? media.declaration : general.declaration, { gap: 5 });
  if (input.status === 'withdrawn') {
    para('STATUS: CONSENT WITHDRAWN', { bold: true, color: [185, 28, 28], gap: 4 });
  }

  ensure(48);
  if (input.signature) {
    try { doc.addImage(input.signature, 'PNG', margin, y, 70, 26); } catch { /* an unreadable signature must not stop the PDF */ }
  }
  y += 28;
  doc.setDrawColor(30, 41, 59); doc.setLineWidth(0.4);
  doc.line(margin, y, margin + 80, y); doc.line(margin + 100, y, margin + 160, y);
  doc.setFontSize(8); doc.setTextColor(71, 85, 105); doc.setFont('helvetica', 'normal');
  doc.text(`${ui.signHere}: ${input.parentName || ''}`, margin, y + 5);
  const when = input.signedAt ? new Date(input.signedAt) : new Date();
  doc.text(when.toLocaleString('en-ZA'), margin + 100, y + 5);
  y += 12;
  para(kind === 'media' ? media.contact : general.contact, { size: 8, color: [100, 116, 139] });

  footer();
  if (opts.save !== false) {
    const safe = (input.childNames || 'family').replace(/[^A-Za-z0-9]+/g, '_').slice(0, 40);
    doc.save(`JFLIPS_${kind === 'media' ? 'PhotoConsent' : 'PrivacyNotice'}_${safe}_${when.toISOString().slice(0, 10)}.pdf`);
  }
  return doc;
}
