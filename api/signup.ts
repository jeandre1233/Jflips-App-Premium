import { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 10 * 60 * 1000 });
    return false;
  }
  if (entry.count >= 10) return true;
  entry.count++;
  return false;
}

/**
 * DISABLED. This endpoint used to copy each registration (child's name, date of
 * birth, medical notes, parents' contact details) into a Google Sheet. JFlips no
 * longer sends registration data to Google Sheets or any other service; it stays
 * in the database. The route is kept only so an old client gets a clear answer.
 */
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  return res.status(410).json({ error: 'This endpoint has been removed.' });
}
