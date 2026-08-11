import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * send-push-notification
 *
 * Delivers a Firebase Cloud Messaging (FCM) push to every device registered
 * against a given user in the `device_tokens` table. This is what makes an
 * alert reach the gym owner's phone when the app is closed — an in-app row or
 * a local notification can only ever fire on the device that created it.
 *
 * Required Supabase secret:
 *   FIREBASE_SERVICE_ACCOUNT_JSON  — the full service account JSON from
 *   Firebase Console → Project Settings → Service accounts → Generate new private key
 *
 * Deploy with JWT verification off so the public signup pages can call it:
 *   supabase functions deploy send-push-notification --no-verify-jwt
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function base64Url(input: string | Uint8Array): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  let binary = '';
  bytes.forEach(b => { binary += String.fromCharCode(b); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pemToDer(pem: string): Uint8Array {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  const raw = atob(body);
  const der = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) der[i] = raw.charCodeAt(i);
  return der;
}

/**
 * Exchange the service account for a short-lived OAuth2 access token by
 * signing a JWT assertion (RS256) — the FCM HTTP v1 API needs a real token,
 * the old static server key is gone.
 */
async function getAccessToken(serviceAccount: {
  client_email: string;
  private_key: string;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = base64Url(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToDer(serviceAccount.private_key.replace(/\\n/g, '\n')),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(`${header}.${claim}`)
  );

  const assertion = `${header}.${claim}.${base64Url(new Uint8Array(signature))}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(`FCM token exchange failed: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId, title, body, type, url, excludeUserId } = await req.json();

    if (!userId || !title || !body) {
      return json({ error: 'userId, title and body are required', success: false }, 400);
    }

    // A user should never be pushed for their own action.
    if (excludeUserId && excludeUserId === userId) {
      return json({ success: true, sent: 0, skipped: 'actor is recipient' });
    }

    const rawServiceAccount = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON');
    if (!rawServiceAccount) {
      return json({
        error: 'FIREBASE_SERVICE_ACCOUNT_JSON is missing in Supabase Secrets.',
        success: false,
      }, 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: tokenRows, error: tokenErr } = await admin
      .from('device_tokens')
      .select('fcm_token')
      .eq('user_id', userId);

    if (tokenErr) {
      return json({ error: `Token lookup failed: ${tokenErr.message}`, success: false }, 500);
    }

    const tokens = Array.from(
      new Set((tokenRows || []).map((r: { fcm_token: string }) => r.fcm_token).filter(Boolean))
    );

    if (tokens.length === 0) {
      return json({ success: true, sent: 0, note: 'No registered devices for this user.' });
    }

    const serviceAccount = JSON.parse(rawServiceAccount);
    const accessToken = await getAccessToken(serviceAccount);
    const endpoint = `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`;

    let sent = 0;
    const staleTokens: string[] = [];

    for (const token of tokens) {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          message: {
            token,
            notification: { title, body },
            // Data travels with the notification so the app can deep-link on tap.
            data: { type: type || 'system', url: url || '/' },
            android: {
              priority: 'HIGH',
              notification: {
                channel_id: 'jflips_native_channel',
                default_vibrate_timings: true,
              },
            },
          },
        }),
      });

      if (res.ok) {
        sent++;
        continue;
      }

      const errBody = await res.json().catch(() => ({}));
      const reason = errBody?.error?.details?.[0]?.errorCode || errBody?.error?.status || '';

      // Uninstalled apps and rotated tokens must be pruned or they accumulate forever.
      if (res.status === 404 || reason === 'UNREGISTERED' || reason === 'INVALID_ARGUMENT') {
        staleTokens.push(token);
      } else {
        console.warn('FCM send failed:', res.status, JSON.stringify(errBody));
      }
    }

    if (staleTokens.length > 0) {
      await admin.from('device_tokens').delete().in('fcm_token', staleTokens);
    }

    return json({ success: true, sent, pruned: staleTokens.length });
  } catch (err: any) {
    console.error('send-push-notification error:', err);
    return json({ error: err.message, success: false }, 500);
  }
});
