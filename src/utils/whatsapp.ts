import { Student } from '../../types';
import { trialFollowUpMessage } from './parentMessages';

/**
 * Format a phone number to standard international format without spaces, leading zeros, or symbols
 * For South Africa, standard numbers start with 0 (e.g. 0821234567) -> 27821234567
 */
export function cleanPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0') && digits.length === 10) {
    return '27' + digits.substring(1);
  }
  return digits;
}

/**
 * Opens a pre-filled WhatsApp chat to a parent asking if their child is attending today's class.
 */
export function sendWhatsAppAttendanceQuery(student: Student, className: string = ''): void {
  const phone = student.parent1_phone || student.parent2_phone || student.phone;
  if (!phone) {
    alert(`No telephone number exists for ${student.name}'s parents. Please update their profile in Setup.`);
    return;
  }

  const parentName = student.parent1_name || student.parent2_name || 'Parent';
  const cleanPhone = cleanPhoneNumber(phone);
  const classText = className ? ` today's *${className}* class` : ' class today';

  const message = `Hi ${parentName}! 🤸

Just checking if *${student.name}* will be attending${classText}?

Please reply to this chat:
1️⃣ *YES*, attending
2️⃣ *NO*, absent

Thank you!`;

  const url = `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
}

/**
 * Opens WhatsApp to the parent of a trial athlete with the sign-up link. Sent by the
 * owner once, after the child's free trial class.
 */
export function sendWhatsAppTrialSignup(opts: {
  parentName?: string; phone: string; childName: string; className?: string; classDate?: string; link: string;
}): void {
  if (!opts.phone) {
    alert(`No phone number saved for ${opts.childName}'s parent.`);
    return;
  }
  const text = trialFollowUpMessage({
    parentName: opts.parentName, childName: opts.childName, classDate: opts.classDate, link: opts.link
  });
  window.open(`https://wa.me/${cleanPhoneNumber(opts.phone)}?text=${encodeURIComponent(text)}`, '_blank');
}

/** The message sent to the parents' WhatsApp group. */
export const GROUP_PAYMENT_REMINDER = [
  'Hallo almal.',
  '',
  'Onthou asseblief om julle betalings vir hierdie maand af te handel.',
  '',
  'Baie dankie!'
].join('\n');

/**
 * Opens WhatsApp with the group reminder already typed. WhatsApp does not allow
 * an app to post into a group by itself, so this opens its chat picker: choose
 * the group, then press send.
 */
export function sendWhatsAppGroupReminder(): void {
  window.open(`https://wa.me/?text=${encodeURIComponent(GROUP_PAYMENT_REMINDER)}`, '_blank');
}

/**
 * Opens a pre-filled WhatsApp chat nudging a client about an invoice that has
 * not been paid yet. Used from History's month tabs.
 */
export function sendWhatsAppPaymentNudge(clientName: string, phone: string, amount: number, monthLabel: string): void {
  if (!phone) {
    alert(`No phone number saved for ${clientName}.`);
    return;
  }
  const message = `Hi ${clientName}! 🤸

A friendly reminder that the JFLIPS invoice for *${monthLabel}* (*R${amount.toFixed(2)}*) is still outstanding.

Please remember to make payment when you can, and send proof of payment once done.

Thank you so much!`;

  window.open(`whatsapp://send?phone=${cleanPhoneNumber(phone)}&text=${encodeURIComponent(message)}`, '_blank');
}

/**
 * Opens a pre-filled WhatsApp chat to a parent/client reminding them of an invoice reminder.
 */
export function sendWhatsAppInvoiceReminder(clientName: string, phone: string, amount: number, dueDate: string): void {
  if (!phone) {
    alert(`No phone number configured for this client.`);
    return;
  }
  const cleanPhone = cleanPhoneNumber(phone);
  const message = `Hi ${clientName}! 🤸

This is a gentle reminder that your monthly invoice of *R${amount}* for JFLIPS Tumbling is due on *${dueDate}*.

Please find invoice details on the parent portal or your email.

Thank you for your support!`;

  const url = `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
}
