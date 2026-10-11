import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

/**
 * Open WhatsApp with a message already typed.
 *   • With a phone number (wa.me/<number>): opens that chat.
 *   • Without one (chooser): WhatsApp's own contact picker. In the Android app this is
 *     the system share sheet, which lists WhatsApp.
 * If the browser blocks the new tab (a pop-up blocker, or a preview frame), nothing
 * visible would happen, so the message is copied instead and the person is told.
 */
export async function openWhatsApp(opts: { phone?: string; text: string }): Promise<void> {
  const url = `https://wa.me/${opts.phone || ''}?text=${encodeURIComponent(opts.text)}`;

  if (Capacitor.isNativePlatform()) {
    try {
      if (!opts.phone) {
        await Share.share({ text: opts.text, dialogTitle: 'Send on WhatsApp' });
      } else {
        window.open(url, '_system');
      }
      return;
    } catch (e: any) {
      // Closing the share sheet is a choice, not a failure.
      if (/cancel/i.test(e?.message || '')) return;
    }
  }

  const win = window.open(url, '_blank');
  if (win) return;

  try {
    await navigator.clipboard.writeText(opts.text);
    alert('Your browser would not open WhatsApp from here. The message has been copied, so open WhatsApp and paste it.');
  } catch {
    window.prompt('Your browser would not open WhatsApp from here. Copy this message and paste it into WhatsApp:', opts.text);
  }
}
