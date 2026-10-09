import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Hand a generated file (an invoice PDF or image) to the person using the app.
 *   • In the Android app: the system share sheet, so it can go straight to WhatsApp.
 *   • In a phone browser that can share files: the same share sheet.
 *   • Anywhere else (a desktop): a normal download.
 */
export async function shareOrSaveFile(
  dataUrl: string,
  fileName: string,
  opts: { title?: string; text?: string } = {}
): Promise<'shared' | 'saved'> {
  if (Capacitor.isNativePlatform()) {
    const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
    const saved = await Filesystem.writeFile({ path: fileName, data: base64, directory: Directory.Cache });
    await Share.share({ title: opts.title || fileName, text: opts.text, url: saved.uri, dialogTitle: opts.title || fileName });
    return 'shared';
  }

  try {
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], fileName, { type: blob.type || 'application/octet-stream' });
    const nav: any = navigator;
    if (nav.canShare && nav.canShare({ files: [file] })) {
      await nav.share({ files: [file], title: opts.title || fileName, text: opts.text });
      return 'shared';
    }
  } catch (e: any) {
    // The person closed the share sheet: that is a choice, not an error.
    if (e?.name === 'AbortError') return 'shared';
  }

  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  return 'saved';
}
