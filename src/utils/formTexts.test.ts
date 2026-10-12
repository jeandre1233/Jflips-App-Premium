import test from 'node:test';
import assert from 'node:assert/strict';
import { buildIndemnityPdf } from './indemnityPdf';
import { generateConsentPdf, generalFormFor, mediaFormFor, GENERAL_VERSION, MEDIA_VERSION } from './consentForms';
import { TERMS_VERSION, termsFor } from './indemnityText';
import { FROZEN_TEXTS } from './frozenTexts';

/** The text a PDF contains, in reading order, with line breaks turned into spaces. */
function pdfText(doc: { output: (t: 'arraybuffer') => ArrayBuffer }): string {
  const raw = Buffer.from(doc.output('arraybuffer')).toString('latin1');
  const out: string[] = [];
  const re = /\(((?:\\.|[^\\)])*)\)\s*Tj/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) out.push(m[1].replace(/\\([()\\])/g, '$1').replace(/\\\d{3}/g, '•'));
  return out.join(' ').replace(/\s+/g, ' ');
}

const choices = {
  instagramFacebookPhotos: true, instagramFacebookVideos: false, firstNameOnly: true,
  website: false, printedMaterial: true, internalRecordings: true
};
const base = {
  dob: '01/01/2018', className: 'Wednesday', phone: '0821234567', email: 'test@example.com',
  emergency: { name: 'Anna Test', phone: '0829999999', relationship: 'Grandmother' },
  medicalNotes: 'None', signature: null
};
const pack = (extra: any) => pdfText(buildIndemnityPdf({
  studentName: 'Test Child', parentName: 'Test Parent', relationship: 'Mother', audience: 'minor', age: 8,
  ...base, version: TERMS_VERSION, privacyVersion: GENERAL_VERSION,
  media: { version: MEDIA_VERSION, choices, status: 'signed' }, ...extra
}));

test('current versions are the bumped ones', () => {
  assert.equal(TERMS_VERSION, '5.0-draft');
  assert.equal(GENERAL_VERSION, '1.5-draft');
  assert.equal(MEDIA_VERSION, '1.3-draft');
});

test('parent registration PDF carries the new wording and versions', () => {
  const t = pack({});
  for (const phrase of [
    'JFLIPS. Our Information Officer is Jeandre Blacquiere. You can reach us on WhatsApp 069 040 3387 or at jflipsinc@gmail.com.',
    'Its servers are in Ireland, so your information is sent to another country.',
    'Vercel in Cape Town',
    'These alerts can include a child\'s name.',
    'Financial records (invoices and payments): 7 years, because the law requires it.',
    'until your child is at least 19',
    'we delete it within 12 months after your child leaves',
    'within 7 days',
    'for the period set out under \'How long we keep it\' in the privacy notice',
    'we will not post your child from that event ourselves',
    'Unpaid accounts. If an invoice is still unpaid one month after we sent it',
    'Late collection. If your child has not been collected',
    '7. Enrolment terms',
    'Terms v5.0-draft', 'Privacy v1.5-draft', 'Photo v1.3-draft',
    'your contact numbers and your emergency contact',
    'we move their record to a separate archive that only JFLIPS management can open',
    'To change your choices, we will send you the form again to sign.'
  ]) assert.ok(t.includes(phrase), 'missing: ' + phrase);
  for (const gone of ['JFLIPS TUMBLING (JFLIPS)', 'JFlips', 'Resend', 'ubscription', 'as soon as possible', 'Discord', 'Google Calendar']) {
    assert.ok(!t.includes(gone), 'should not contain: ' + gone);
  }
});

test('adult registration PDF carries the adult wording', () => {
  const t = pack({ audience: 'adult', age: 30, studentName: 'Test Adult', parentName: 'Test Adult', relationship: 'Self (adult participant)' });
  for (const phrase of [
    'JFLIPS is the responsible party for your personal information.',
    'These alerts can include your name.',
    '5 years after you leave',
    'we delete it within 12 months after you leave',
    'we will not post you from that event ourselves',
    'cell number and emergency contact',
    'we move your record to a separate archive',
    'Your choice here never affects your place at JFLIPS.',
    'You get one free first class. If you stop and later come back, you do not get another one.',
    'we tell you on the day',
    'Terms v5.0-draft'
  ]) assert.ok(t.includes(phrase), 'missing: ' + phrase);
  assert.ok(!t.includes('Late collection'), 'adults have no late collection rule');
  assert.ok(!t.includes('your child\'s place'), 'adult photo line must not say child');
  assert.ok(!t.includes('family\'s personal information'));
});

test('3-year-old registration PDF has the young athlete section and the late collection rule', () => {
  const t = pack({
    age: 3, dob: '01/01/2023', studentName: 'Tiny Test',
    young: { stays: true, adultName: '', adultPhone: '', collectors: [{ name: 'Test Parent', phone: '0821234567' }], notes: '' }
  });
  assert.ok(t.includes('YOUNG ATHLETE (AGE 2 TO 4)'));
  assert.ok(t.includes('stays at the venue for the whole class'));
  assert.ok(t.includes('Late collection.'));
  assert.ok(t.includes('Terms v5.0-draft'));
});

test('old versions still print their own wording', () => {
  const t = pack({ version: '4.0-draft', privacyVersion: '1.3-draft', media: { version: '1.1-draft', choices, status: 'signed' } });
  for (const phrase of [
    'JFLIPS TUMBLING (JFLIPS)', 'as soon as possible', 'We use Google Firebase to send alerts to our coaches\' phones and Resend to send emails',
    'JFlips is the responsible party', 'Terms v4.0-draft', 'Privacy v1.3-draft', 'Photo v1.1-draft'
  ]) assert.ok(t.includes(phrase), 'old wording missing: ' + phrase);
  for (const gone of ['within 7 days', 'Unpaid accounts', 'Enrolment terms', 'Ireland', 'These alerts can include']) {
    assert.ok(!t.includes(gone), 'new wording leaked into old version: ' + gone);
  }
});

test('older privacy and photo versions are kept', () => {
  for (const v of ['1.0-draft', '1.1-draft', '1.2-draft', '1.3-draft', '1.4-draft']) {
    const f = generalFormFor('minor', v);
    assert.ok(!f.notStored, v + ' should be stored');
    assert.ok(f.sections.length >= 7);
  }
  assert.ok(!mediaFormFor('minor', '1.0').notStored);
  assert.ok(!mediaFormFor('minor', '1.1-draft').notStored);
  assert.ok(!mediaFormFor('minor', '1.2-draft').notStored);
  // the wording of the previous release is exactly what it was
  const prev = generalFormFor('minor', '1.4-draft');
  assert.ok(JSON.stringify(prev).includes('After they leave, we keep it only for as long as we need it'));
  assert.ok(!JSON.stringify(prev).includes('separate archive'));
  assert.ok(JSON.stringify(mediaFormFor('minor', '1.2-draft')).includes('We will then remove the photos and videos'));
  assert.equal(mediaFormFor('adult', '1.0').choiceNote, "Your choice here never affects your child's place at JFlips.");
  assert.ok(termsFor('minor', '4.0-draft').sections.length === 6);
  assert.ok(!termsFor('minor', '4.0-draft').intro.includes('{'));
});

test('a consent PDF for an old record prints that record\'s version, and an unknown version says so', () => {
  const old = pdfText(generateConsentPdf({
    kind: 'general', lang: 'en', childNames: 'Test Child', parentName: 'Test Parent', audience: 'minor',
    choices: { agreed: true }, version: '1.2-draft', status: 'signed'
  }, { save: false }));
  assert.ok(old.includes('v1.2-draft'));
  assert.ok(!old.includes('Ireland'));
  const unknown = pdfText(generateConsentPdf({
    kind: 'media', lang: 'en', childNames: 'Test Child', parentName: 'Test Parent', audience: 'minor',
    choices, version: '0.9', status: 'signed'
  }, { save: false }));
  assert.ok(unknown.includes('not stored in the app'));
});

test('a PDF for a record signed under the previous release still prints that release', () => {
  const t = pack({ privacyVersion: '1.4-draft', media: { version: '1.2-draft', choices, status: 'signed' } });
  assert.ok(t.includes('Privacy v1.4-draft') && t.includes('Photo v1.2-draft'));
  assert.ok(t.includes('After they leave, we keep it only for as long as we need it'));
  assert.ok(t.includes('We will then remove the photos and videos'));
  assert.ok(!t.includes('separate archive'));
});

test('no document text names the company any other way than JFLIPS', () => {
  const all = JSON.stringify([
    generalFormFor('minor'), generalFormFor('adult'), mediaFormFor('minor'), mediaFormFor('adult'),
    termsFor('minor', TERMS_VERSION, { parent: 'P', child: 'C' }), termsFor('adult', TERMS_VERSION, { name: 'N' })
  ]);
  assert.ok(!all.includes('JFlips'));
  assert.ok(!all.includes('JFLIPS TUMBLING'));
  assert.ok(!all.includes('Resend'));
  assert.ok(all.includes('jflips.co.za'));
  assert.ok(Object.keys(FROZEN_TEXTS.terms).includes('4.0-draft'));
});
