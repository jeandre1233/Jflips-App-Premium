/**
 * TERMS AND CONDITIONS: HEALTH, RISK, INDEMNITY AND ENROLMENT
 * ═══════════════════════════════════════════════════════════
 * One numbered document, shown in a scroll box on the sign-up page AND printed on the
 * signed PDF, so the screen and the PDF can never say different things.
 * Wording comes from the revised draft (JFlips_signup_form_revised_draft.md), written
 * from the lawyer's opinion.
 *
 * DRAFT: the lawyer must read the final wording, especially section 2 (risks) and
 * section 3 (responsibility). Then change TERMS_VERSION to '4.0'.
 *
 * Honesty rule for first aid: it promises only what JFlips can do at every class
 * (basic first aid where possible, and calling for help). The school's
 * first-aid-trained staff are mentioned as a possibility and are explicitly NOT
 * promised. Do not add "a qualified first aider is at every class" until true.
 */

export const TERMS_VERSION = '4.0-draft';

export type Audience = 'minor' | 'adult';

export interface TermsSection {
  number: number;
  heading: string;
  paragraphs: string[];
  /** A bulleted list shown after the paragraphs (used by the risks). */
  items?: string[];
  /** A closing paragraph shown after the list. */
  outro?: string;
}

/** The declaration at the top of the Terms and Conditions. */
export const TERMS_INTRO_MINOR = (parent: string, child: string): string =>
  `I, ${parent || '___________________'}, am the parent or legal guardian of ${child || '___________________'}. I confirm that, as far as I know, my child is physically, medically and mentally fit to join JFLIPS TUMBLING (JFLIPS) and take part in tumbling. I have read the risks and the terms below.`;

export const TERMS_INTRO_ADULT = (name: string): string =>
  `I, ${name || '___________________'}, confirm that, as far as I know, I am physically, medically and mentally fit to join JFLIPS TUMBLING (JFLIPS) and take part in tumbling. I have read the risks and the terms below.`;

/**
 * ENROLMENT TERMS: to be written by the owner and the lawyer. While this list is empty
 * the section is not shown on the form, so a parent never sees a gap. Add
 * { heading, text } entries here (one per rule) and section 7 appears by itself,
 * on the screen, in the index and on the PDF.
 */
export const ENROLMENT_TERMS: { heading: string; text: string }[] = [];

/** Questions that must be answered before the enrolment terms can be written. */
export const ENROLMENT_QUESTIONS: string[] = [
  'Weather: some classes and practices are outdoors. When a class is cancelled for weather, is there a replacement class, a credit, or nothing? Who decides, and how are parents told?',
  'Absences and no-shows: is a class the child misses still charged? Is a credit given for notice, illness, or school events? How much notice is needed?',
  'Late collection: is there a grace period, a fee, or a rule about what happens to a child who is not collected?',
  'Payment: invoices go out monthly and are paid by EFT. By which date is payment due, what happens when an account is late, and can a child be stopped from attending until it is paid?',
  'Leaving the club: how much notice does a family give, and must all accounts be settled? (This links to the privacy notice, which says information is kept after a child leaves and some records are kept for longer.)',
  'The free first class: should the terms say it is free once per child, and what happens if a child returns later?',
  'Changes: how much notice is given when fees, class times or venues change?',
  'Behaviour and safety: when may a coach or JFlips remove a child from a class or from the club?',
  'Injuries and incidents: should the terms say that an injury or incident will be recorded and the parent told on the day?'
];

const RISK_ITEMS_MINOR = [
  'falls and awkward or uncontrolled landings',
  'flips, jumps, rolls and balancing skills going wrong',
  'bumping into other children, or into equipment and mats',
  'strains, sprains, broken bones and dislocated joints',
  'head, neck and back injuries, which can be serious and, in rare cases, permanent',
  'injuries while a coach is helping or spotting a skill',
  'uneven ground, heat, cold or wet surfaces, because some classes are outdoors'
];
const RISK_ITEMS_ADULT = [
  'falls and awkward or uncontrolled landings',
  'flips, jumps, rolls and balancing skills going wrong',
  'bumping into other participants, or into equipment and mats',
  'strains, sprains, broken bones and dislocated joints',
  'head, neck and back injuries, which can be serious and, in rare cases, permanent',
  'injuries while a coach is helping or spotting you',
  'uneven ground, heat, cold or wet surfaces, because some classes are outdoors'
];

const FIRST_AID_PARAGRAPH =
  'JFLIPS gives basic first aid where possible and calls for help when it is needed. Classes take place at a school where staff with first aid training may be on site, but JFLIPS cannot promise that they will be available.';

export function termsSectionsFor(audience: Audience): TermsSection[] {
  const adult = audience === 'adult';
  const sections: Omit<TermsSection, 'number'>[] = [
    {
      heading: 'Health and emergency treatment',
      paragraphs: [
        adult
          ? 'We will always try to reach you first. If there is an emergency and we cannot reach you or your emergency contact in time, I allow JFLIPS or its coaches to give basic first aid and to arrange emergency medical help for me. That can include calling an ambulance or taking me to a doctor or hospital. I understand that coaches are not medical professionals, and I accept responsibility for the cost of the treatment.'
          : 'We will always try to reach you first. If there is an emergency and we cannot reach you or your emergency contact in time, I allow JFLIPS or its coaches to give basic first aid and to arrange emergency medical help for my child. That can include calling an ambulance or taking my child to a doctor or hospital. I understand that coaches are not medical professionals, and I accept responsibility for the cost of the treatment.',
        FIRST_AID_PARAGRAPH
      ]
    },
    {
      heading: 'Risks',
      paragraphs: ['Tumbling and stunting are physical sports. Even with good coaching and safe equipment, things can go wrong. The main risks are:'],
      items: adult ? RISK_ITEMS_ADULT : RISK_ITEMS_MINOR,
      outro: adult
        ? 'Most injuries are minor, like bruises and scrapes. Serious injuries can still happen when the coaches and I do everything right.'
        : 'Most injuries are minor, like bruises and scrapes. Serious injuries can still happen when the coaches and the children do everything right.'
    },
    {
      heading: 'Responsibility',
      paragraphs: [
        adult
          ? 'I accept these risks. I agree that JFLIPS TUMBLING (JFLIPS), its owner and its coaches will not be held responsible for any injury, loss or damage that happens in the normal course of classes, except where it is caused by their gross negligence or a deliberate act. I will follow the coaches\' instructions and the class rules.'
          : 'I accept these risks on my child\'s behalf. I agree that JFLIPS TUMBLING (JFLIPS), its owner and its coaches will not be held responsible for any injury, loss or damage that happens in the normal course of classes, except where it is caused by their gross negligence or a deliberate act. I will make sure my child follows the coaches\' instructions and the class rules.'
      ]
    },
    {
      heading: 'Coaches\' decisions',
      paragraphs: [
        adult
          ? 'The coach decides which skills I may attempt and may stop any activity they consider unsafe. I will not attempt skills the coach has not approved. If I will not follow safety instructions, the coach may stop me taking part for the rest of the class.'
          : 'The coach decides which skills my child may attempt and may stop any activity they consider unsafe. My child will not attempt skills the coach has not approved. If my child will not follow safety instructions, the coach may stop them taking part for the rest of the class.'
      ]
    },
    {
      heading: 'Belongings',
      paragraphs: [
        adult
          ? 'I understand that JFLIPS TUMBLING (JFLIPS), its owner and its coaches are not responsible for the loss, theft or damage of any belongings I bring to classes.'
          : 'I understand that JFLIPS TUMBLING (JFLIPS), its owner and its coaches are not responsible for the loss, theft or damage of any belongings my child brings to classes.'
      ]
    },
    {
      heading: 'Keeping health information up to date',
      paragraphs: [
        adult
          ? 'I have given accurate health information on this form. I will tell JFLIPS as soon as I can if my health changes, or if I have a new injury or illness.'
          : 'I have given accurate health information on this form. I will tell JFLIPS as soon as I can if my child\'s health changes, or if they have a new injury or illness.'
      ]
    }
  ];

  if (ENROLMENT_TERMS.length > 0) {
    sections.push({
      heading: 'Enrolment terms',
      paragraphs: ENROLMENT_TERMS.map(t => `${t.heading}. ${t.text}`)
    });
  }
  return sections.map((s, i) => ({ ...s, number: i + 1 }));
}

/** The health question on the form itself (the answer is information, not a term). */
export const HEALTH_FIELD = {
  minor: {
    why: 'We ask for this so the coaches can look after your child properly. The coaches of your child\'s class can see it.',
    label: 'Anything we should know about your child\'s health *'
  },
  adult: {
    why: 'We ask for this so the coaches can look after you properly. Your coaches can see it.',
    label: 'Anything we should know about your health *'
  },
  hint: 'For example asthma, epilepsy, allergies, medication, or a recent or old injury such as a fracture. If there is nothing, write None.',
  note: 'The emergency treatment you agree to is in section 1 of the Terms and Conditions below.'
};
export const healthFieldFor = (a: Audience) => (a === 'adult' ? HEALTH_FIELD.adult : HEALTH_FIELD.minor);

/** The short line above the Terms and Conditions. */
export const TERMS_NOTICE = 'Injuries can be serious (section 2), and section 1 lets us arrange emergency medical help if we cannot reach you. Please read the whole of the Terms and Conditions.';

/** Minimum age. Younger children are asked to message us instead of registering. */
export const MIN_AGE = 2;
export const UNDER_MIN_AGE_MESSAGE = 'Our classes start from age 2. Please message us on WhatsApp 069 040 3387 and we will help you.';

/** Which path applies: 18 and over signs for themselves, under 18 a parent or guardian signs. */
export function audienceForAge(age: number | string | null | undefined): Audience {
  const n = typeof age === 'string' ? parseInt(age, 10) : age;
  return typeof n === 'number' && Number.isFinite(n) && n >= 18 ? 'adult' : 'minor';
}
