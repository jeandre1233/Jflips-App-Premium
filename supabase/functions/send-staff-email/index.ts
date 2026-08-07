import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) {
      return new Response(
        JSON.stringify({
          error: 'RESEND_API_KEY is missing in Supabase Secrets.',
          success: false
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { type, ownerEmail, coachName, coachEmail, businessName, outcome } = await req.json();

    let subject = '';
    let html = '';
    let to = '';

    if (type === 'coach_registered') {
      to = ownerEmail;
      subject = `New Coach Join Request: ${coachName}`;
      html = `
        <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
          <h2 style="color: #1e4da1;">New Coach Registration Request</h2>
          <p><strong>${coachName}</strong> (${coachEmail}) has requested to join <strong>${businessName || 'your gym'}</strong> on JFLIPS.</p>
          <p>Log in to your JFLIPS portal to approve access and set their permissions.</p>
        </div>
      `;
    } else if (type === 'coach_approval') {
      to = coachEmail;
      subject = `JFLIPS Application ${outcome === 'approved' ? 'Approved' : 'Updated'}: ${businessName || 'Gym'}`;
      if (outcome === 'approved') {
        html = `
          <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
            <h2 style="color: #16a34a;">Application Approved!</h2>
            <p>Your request to join <strong>${businessName || 'the gym'}</strong> on JFLIPS as a coach has been <strong>approved</strong> by the owner.</p>
            <p>You can now log in to access your coach portal.</p>
          </div>
        `;
      } else {
        html = `
          <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
            <h2 style="color: #dc2626;">Application Status Update</h2>
            <p>Your request to join <strong>${businessName || 'the gym'}</strong> on JFLIPS was <strong>not approved</strong> at this time.</p>
            <p>If you believe this was an error, please contact the gym owner.</p>
          </div>
        `;
      }
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid notification type', success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: 'JFLIPS Portal <onboarding@resend.dev>',
        to: [to],
        subject,
        html,
      }),
    });

    const resData = await res.json();

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: resData, success: false }),
        { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: resData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message, success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
