/**
 * The two messages the owner sends to parents who are not yet signed up.
 * Class times and fees are fixed text for now (the fee structure may be reworked).
 */

import { openWhatsApp } from './openWhatsApp';

export const LIVE_APP_URL = 'https://jflips.vercel.app';

export const CLASS_TIMES = [
  'Wednesday 2 pm – 4 pm',
  'Thursday 2 pm – 4 pm',
  'Friday 4 pm – 5 pm'
];

export const GROUP_FEE = 'R200';
export const PRIVATE_FEE = 'R350';

/** The tumbling sign-up link. Inside the Android app the origin is not a web address, so use the live site. */
export function tumblingSignupLink(ownerId: string | undefined | null): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const base = /^https?:\/\//.test(origin) && !/localhost|127\.0\.0\.1/.test(origin) ? origin : LIVE_APP_URL;
  return `${base}/#/signup?ownerId=${ownerId || ''}`;
}

const classLines = () => CLASS_TIMES.map(t => `📅 ${t}`);

const feeLines = () => [
  `Group classes are ${GROUP_FEE} per session per person.`,
  `Private lessons are ${PRIVATE_FEE} per session.`
];

const afrikaansNote =
  'Communication in the group is sent in Afrikaans, so please let me know if you are Afrikaans or if you do not understand it, so I can communicate accordingly.';

/** Sent from a trial athlete's card in Setup, after their free first class. */
export function trialFollowUpMessage(opts: { parentName?: string; childName: string; classDate?: string; link: string }): string {
  const parent = opts.parentName && opts.parentName !== 'Parent' ? opts.parentName : 'there';
  const when = opts.classDate && !isNaN(new Date(opts.classDate).getTime())
    ? new Date(opts.classDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';
  return [
    `Hi ${parent}! 🤸`,
    '',
    `Thank you for bringing ${opts.childName} to JFlips${when ? ` on ${when}` : ''}. We loved having them in class, and their first class was on us!`,
    '',
    `If you would like ${opts.childName} to continue, these are our classes:`,
    ...classLines(),
    '',
    ...feeLines(),
    '',
    `You can sign ${opts.childName} up using this link:`,
    opts.link,
    '',
    'I will add you to the communications group.',
    afrikaansNote,
    '',
    'Have a nice day!'
  ].join('\n');
}

/** Reply to a parent who asked about classes (Management → Registrations). */
export function classEnquiryMessage(opts: { link: string }): string {
  return [
    'Hi 👋',
    '',
    'Thank you for your interest in JFlips! 🤸‍♀️',
    'Your child is welcome to come and try a class. The first class is free!',
    '',
    'Our classes:',
    ...classLines(),
    '',
    ...feeLines(),
    '',
    'You can sign up using this link:',
    opts.link,
    '',
    'I will add you to the group.',
    afrikaansNote,
    '',
    'Have a nice day!'
  ].join('\n');
}

/** The same reply in Afrikaans (no group-language note: the group is Afrikaans). */
export function classEnquiryMessageAfrikaans(opts: { link: string }): string {
  return [
    'Hi 👋',
    '',
    'Dankie vir jou belangstelling in JFlips! 🤸‍♀️',
    'Jou kind is welkom om ’n klas te kom probeer. Die eerste klas is gratis!',
    '',
    'Ons klasse:',
    '📅 Woensdag 14:00 – 16:00',
    '📅 Donderdag 14:00 – 16:00',
    '📅 Vrydag 16:00 – 17:00',
    '',
    `Groepklasse is ${GROUP_FEE} per sessie per persoon.`,
    `Privaatlesse is ${PRIVATE_FEE} per sessie.`,
    '',
    'Jy kan met hierdie link inskryf:',
    opts.link,
    '',
    'Ek sal jou by die groep voeg.',
    '',
    'Geniet jou dag!'
  ].join('\n');
}

/** Opens WhatsApp's own contact chooser with the enquiry reply already typed. */
export function openClassEnquiryReply(ownerId: string | undefined | null, lang: 'en' | 'af' = 'en'): void {
  const link = tumblingSignupLink(ownerId);
  void openWhatsApp({ text: lang === 'af' ? classEnquiryMessageAfrikaans({ link }) : classEnquiryMessage({ link }) });
}
