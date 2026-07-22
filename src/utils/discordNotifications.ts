export function isDiscordNotificationsEnabled(): boolean {
  return localStorage.getItem('discord_notifications_enabled') === 'true';
}

export function setDiscordNotificationsEnabled(enabled: boolean): void {
  localStorage.setItem('discord_notifications_enabled', enabled ? 'true' : 'false');
}

export function getDiscordWebhookUrl(): string | null {
  return localStorage.getItem('discord_webhook_url');
}

export function setDiscordWebhookUrl(url: string): void {
  if (url) {
    localStorage.setItem('discord_webhook_url', url.trim());
  } else {
    localStorage.removeItem('discord_webhook_url');
  }
}

export async function sendDiscordMessage(content: string, embeds?: any[]): Promise<boolean> {
  if (!isDiscordNotificationsEnabled()) {
    console.warn('Discord notifications are disabled. Skipping sending message.');
    return false;
  }

  const url = getDiscordWebhookUrl();
  if (!url) {
    console.warn('Discord webhook URL is not configured. Skipping sending message.');
    return false;
  }

  try {
    const payload: any = { content };
    if (embeds && embeds.length > 0) {
      payload.embeds = embeds;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return response.ok;
  } catch (err) {
    console.error('Failed to send discord message:', err);
    return false;
  }
}

/**
 * Send notification when a new user signs up via the public signup form.
 */
export async function sendNewSignupNotification(data: {
  studentName: string;
  dob?: string;
  age?: string;
  className?: string;
  parentName: string;
  phone: string;
  email: string;
  medicalNotes?: string;
}): Promise<boolean> {
  const embed = {
    title: '🤸 New Student Registered!',
    description: `A new student has registered via the public signup form.`,
    color: 304263, // Beautiful theme blue hex converted to decimal: #04A417 (greenish blue) -> ~1e4da1 matches JFLIPS theme
    fields: [
      { name: 'Student Name', value: data.studentName, inline: true },
      { name: 'Age / DOB', value: `${data.age || '—'} years (${data.dob || '—'})`, inline: true },
      { name: 'Requested Class', value: data.className || 'General Registration', inline: true },
      { name: 'Primary Parent', value: data.parentName, inline: true },
      { name: 'Phone', value: data.phone, inline: true },
      { name: 'Email', value: data.email, inline: true },
      { name: 'Medical/Allergy Notes', value: data.medicalNotes || 'None', inline: false },
    ],
    timestamp: new Date().toISOString(),
    footer: {
      text: 'JFLIPS Notification Engine',
    }
  };

  return sendDiscordMessage(`🤸 **New JFLIPS Enrollment:** *${data.studentName}*`, [embed]);
}

/**
 * Send reminder on the 30th of the month to review logs and cycle the billing month.
 */
export async function sendCycleMonthReminderNotification(data: {
  monthName: string;
  year: number;
  unarchivedSessionsCount: number;
}): Promise<boolean> {
  const embed = {
    title: '📅 Auto Billing Cycle & Invoice Reminder!',
    description: `It is currently the end of **${data.monthName} ${data.year}**. Please remember to review logs and billing to cycle the month.`,
    color: 14421004, // Dark Red
    fields: [
      { name: 'Billing Month', value: `${data.monthName} ${data.year}`, inline: true },
      { name: 'Active Sessions', value: `${data.unarchivedSessionsCount} active sessions in queue`, inline: true },
      { name: 'Action Required', value: "Please go to JFLIPS Setup and click 'Archive Month' to generate invoices for this cycle.", inline: false }
    ],
    timestamp: new Date().toISOString(),
    footer: {
      text: 'JFLIPS Billing Monitor',
    }
  };

  return sendDiscordMessage(`⚠️ **Monthly Invoicing Alert:** Remember to cycles the month for *${data.monthName} ${data.year}*!`, [embed]);
}
