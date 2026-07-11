import { Student } from '../../types';

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
