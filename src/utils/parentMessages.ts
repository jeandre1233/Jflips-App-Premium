/**
 * The two messages the owner sends to parents who are not yet signed up.
 * Class times and fees are fixed text for now (the fee structure may be reworked).
 */

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

/** Opens WhatsApp's own contact chooser with the enquiry reply already typed. */
export function openClassEnquiryReply(ownerId: string | undefined | null): void {
  const text = classEnquiryMessage({ link: tumblingSignupLink(ownerId) });
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
}
