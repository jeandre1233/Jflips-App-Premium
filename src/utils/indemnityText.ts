/**
 * INDEMNITY: ADDITIONAL CLAUSES
 * ═════════════════════════════
 * These sit directly under the original declaration ("I, [parent], Parent/Legal
 * Guardian of [child], hereby indemnify and confirm that my child is physically,
 * medically and mentally fit ... I hereby acknowledge the possibility of injury
 * occurring whilst doing tumbling.") on the signup page AND on the signed PDF.
 * They live here once so the screen and the PDF can never say different things.
 *
 * DRAFT: have a lawyer confirm this wording, then change INDEMNITY_VERSION to '2.0'.
 *
 * Honesty rule for the first aid clause: it promises only what JFlips can do at
 * every class (basic first aid where possible, and calling emergency services).
 * The school's first-aid-trained staff are mentioned as a possibility and are
 * explicitly NOT promised. Do not add "a qualified first aider is at every class"
 * until that is true.
 */

export const INDEMNITY_VERSION = '2.0-draft';

export const INDEMNITY_CLAUSES: { heading: string; text: string }[] = [
  {
    heading: 'Risk',
    text: 'I understand that tumbling and stunting involve jumping, flipping, balancing and falling, and contact with equipment and other children. Injuries, from small bruises to serious injury, can happen even when coaches take every reasonable care.'
  },
  {
    heading: 'Responsibility',
    text: 'I accept these risks on my child\'s behalf. I agree that JFLIPS TUMBLING, its owner and its coaches will not be held responsible for any injury, loss or damage that happens in the normal course of classes, except where it is caused by their gross negligence or a deliberate act. I will make sure my child follows the coaches\' instructions and the class rules.'
  },
  {
    heading: 'First aid and emergencies',
    text: 'JFLIPS will give basic first aid where possible and will call emergency services or a doctor when needed. Classes take place at a school where staff with first aid training may be on site, but JFLIPS cannot promise that they will be available. If I cannot be reached, I authorise JFLIPS or its coaches to arrange emergency medical treatment or an ambulance for my child, and I accept responsibility for the cost of that treatment.'
  },
  {
    heading: 'Health information',
    text: 'I have given accurate information about my child\'s health below, and I will tell JFLIPS about any change in my child\'s health, or any injury or illness, as soon as I can.'
  }
];
