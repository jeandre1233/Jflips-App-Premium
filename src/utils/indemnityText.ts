/**
 * INDEMNITY, HEALTH AND EMERGENCY WORDING
 * ═══════════════════════════════════════
 * Used on the signup page AND on the signed PDF, so the screen and the PDF can
 * never say different things. Wording from the revised draft
 * (JFlips_signup_form_revised_draft.md), written from the lawyer's opinion.
 *
 * DRAFT: the lawyer must read the final wording, especially the risks and the
 * responsibility clause. Then change INDEMNITY_VERSION to '3.0'.
 *
 * Honesty rule for first aid: it promises only what JFlips can do at every class
 * (basic first aid where possible, and calling for help). The school's
 * first-aid-trained staff are mentioned as a possibility and are explicitly NOT
 * promised. Do not add "a qualified first aider is at every class" until true.
 */

export const INDEMNITY_VERSION = '3.0-draft';

export type Audience = 'minor' | 'adult';

export const INDEMNITY_INTRO_MINOR = (parent: string, child: string): string =>
  `I, ${parent || '___________________'}, am the parent or legal guardian of ${child || '___________________'}. I confirm that, as far as I know, my child is physically, medically and mentally fit to join JFLIPS TUMBLING (JFLIPS) and take part in tumbling. I have read the risks and the terms below.`;

export const INDEMNITY_INTRO_ADULT = (name: string): string =>
  `I, ${name || '___________________'}, confirm that, as far as I know, I am physically, medically and mentally fit to join JFLIPS TUMBLING (JFLIPS) and take part in tumbling. I have read the risks and the terms below.`;

/** "What can go wrong": a list the person must have been shown. */
export const INDEMNITY_RISKS = {
  heading: 'What can go wrong',
  minor: {
    intro: 'Tumbling and stunting are physical sports. Even with good coaching and safe equipment, things can go wrong. The main risks are:',
    items: [
      'falls and awkward or uncontrolled landings',
      'flips, jumps, rolls and balancing skills going wrong',
      'bumping into other children, or into equipment and mats',
      'strains, sprains, broken bones and dislocated joints',
      'head, neck and back injuries, which can be serious and, in rare cases, permanent',
      'injuries while a coach is helping or spotting a skill',
      'uneven ground, heat, cold or wet surfaces, because some classes are outdoors'
    ],
    outro: 'Most injuries are minor, like bruises and scrapes. Serious injuries can still happen when the coaches and the children do everything right.'
  },
  adult: {
    intro: 'Tumbling and stunting are physical sports. Even with good coaching and safe equipment, things can go wrong. The main risks are:',
    items: [
      'falls and awkward or uncontrolled landings',
      'flips, jumps, rolls and balancing skills going wrong',
      'bumping into other participants, or into equipment and mats',
      'strains, sprains, broken bones and dislocated joints',
      'head, neck and back injuries, which can be serious and, in rare cases, permanent',
      'injuries while a coach is helping or spotting you',
      'uneven ground, heat, cold or wet surfaces, because some classes are outdoors'
    ],
    outro: 'Most injuries are minor, like bruises and scrapes. Serious injuries can still happen when the coaches and I do everything right.'
  }
};

export const INDEMNITY_CLAUSES: { heading: string; text: string }[] = [
  {
    heading: 'Responsibility',
    text: 'I accept these risks on my child\'s behalf. I agree that JFLIPS TUMBLING (JFLIPS), its owner and its coaches will not be held responsible for any injury, loss or damage that happens in the normal course of classes, except where it is caused by their gross negligence or a deliberate act. I will make sure my child follows the coaches\' instructions and the class rules.'
  },
  {
    heading: 'Coaches\' decisions',
    text: 'The coach decides which skills my child may attempt and may stop any activity they consider unsafe. My child will not attempt skills the coach has not approved. If my child will not follow safety instructions, the coach may stop them taking part for the rest of the class.'
  },
  {
    heading: 'Belongings',
    text: 'I understand that JFLIPS TUMBLING (JFLIPS), its owner and its coaches are not responsible for the loss, theft or damage of any belongings my child brings to classes.'
  },
  {
    heading: 'Health information',
    text: 'I have given accurate health information above, and I will update it when anything changes.'
  }
];

export const INDEMNITY_CLAUSES_ADULT: { heading: string; text: string }[] = [
  {
    heading: 'Responsibility',
    text: 'I accept these risks. I agree that JFLIPS TUMBLING (JFLIPS), its owner and its coaches will not be held responsible for any injury, loss or damage that happens in the normal course of classes, except where it is caused by their gross negligence or a deliberate act. I will follow the coaches\' instructions and the class rules.'
  },
  {
    heading: 'Coaches\' decisions',
    text: 'The coach decides which skills I may attempt and may stop any activity they consider unsafe. I will not attempt skills the coach has not approved. If I will not follow safety instructions, the coach may stop me taking part for the rest of the class.'
  },
  {
    heading: 'Belongings',
    text: 'I understand that JFLIPS TUMBLING (JFLIPS), its owner and its coaches are not responsible for the loss, theft or damage of any belongings I bring to classes.'
  },
  {
    heading: 'Health information',
    text: 'I have given accurate health information above, and I will update it when anything changes.'
  }
];

export const indemnityClausesFor = (a: Audience) => (a === 'adult' ? INDEMNITY_CLAUSES_ADULT : INDEMNITY_CLAUSES);
export const indemnityRisksFor = (a: Audience) => (a === 'adult' ? INDEMNITY_RISKS.adult : INDEMNITY_RISKS.minor);

/** The health and emergency section, kept out of the indemnity so it has its own tick. */
export const HEALTH_SECTION = {
  minor: {
    why: 'We ask for this so the coaches can look after your child properly. The coaches of your child\'s class can see it.',
    label: 'Anything we should know about your child\'s health *',
    hint: 'For example asthma, epilepsy, allergies, medication, or a recent or old injury such as a fracture. If there is nothing, write None.',
    emergencyHeading: 'Emergency treatment',
    emergency: [
      'We will always try to reach you first. If there is an emergency and we cannot reach you or your emergency contact in time, I allow JFLIPS or its coaches to give basic first aid and to arrange emergency medical help for my child. That can include calling an ambulance or taking my child to a doctor or hospital. I understand that coaches are not medical professionals, and I accept responsibility for the cost of the treatment.',
      'JFLIPS gives basic first aid where possible and calls for help when it is needed. Classes take place at a school where staff with first aid training may be on site, but JFLIPS cannot promise that they will be available.',
      'I will tell JFLIPS as soon as I can if my child\'s health changes, or if they have a new injury or illness.'
    ],
    tick: 'I have given accurate health information, and I agree to the emergency treatment described above. *'
  },
  adult: {
    why: 'We ask for this so the coaches can look after you properly. Your coaches can see it.',
    label: 'Anything we should know about your health *',
    hint: 'For example asthma, epilepsy, allergies, medication, or a recent or old injury such as a fracture. If there is nothing, write None.',
    emergencyHeading: 'Emergency treatment',
    emergency: [
      'We will always try to reach you first. If there is an emergency and we cannot reach you or your emergency contact in time, I allow JFLIPS or its coaches to give basic first aid and to arrange emergency medical help for me. That can include calling an ambulance or taking me to a doctor or hospital. I understand that coaches are not medical professionals, and I accept responsibility for the cost of the treatment.',
      'JFLIPS gives basic first aid where possible and calls for help when it is needed. Classes take place at a school where staff with first aid training may be on site, but JFLIPS cannot promise that they will be available.',
      'I will tell JFLIPS as soon as I can if my health changes, or if I have a new injury or illness.'
    ],
    tick: 'I have given accurate health information, and I agree to the emergency treatment described above. *'
  }
};
export const healthSectionFor = (a: Audience) => (a === 'adult' ? HEALTH_SECTION.adult : HEALTH_SECTION.minor);

/** Minimum age. Younger children are asked to message us instead of registering. */
export const MIN_AGE = 2;
export const UNDER_MIN_AGE_MESSAGE = 'Our classes start from age 2. Please message us on WhatsApp 069 040 3387 and we will help you.';

/** Which path applies: 18 and over signs for themselves, under 18 a parent or guardian signs. */
export function audienceForAge(age: number | string | null | undefined): Audience {
  const n = typeof age === 'string' ? parseInt(age, 10) : age;
  return typeof n === 'number' && Number.isFinite(n) && n >= 18 ? 'adult' : 'minor';
}
