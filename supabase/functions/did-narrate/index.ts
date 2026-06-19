// D-ID talking avatar narration — async job pattern.
// Actions:
//   { action: "start", script }  -> { jobId }
//   { action: "status", jobId }  -> { status: 'pending'|'ready'|'error', videoUrl?, error? }
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const DID_BASE = 'https://api.d-id.com';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ---- Auth ----
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401);
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const body = await req.json().catch(() => null) as
      | { action?: string; script?: string; jobId?: string }
      | null;
    if (!body || typeof body.action !== 'string') {
      return json({ error: 'action is required' }, 400);
    }

    const apiKey = Deno.env.get('DID_API_KEY');
    const presenterId = Deno.env.get('DID_PRESENTER_ID');
    if (!apiKey || !presenterId) {
      console.error('Missing D-ID configuration');
      return json({ error: 'D-ID not configured' }, 500);
    }
    // Per D-ID docs: send the raw "API_USER:API_PASSWORD" as Basic — no base64.
    const didAuth = `Basic ${apiKey}`;

    if (body.action === 'start') {
      const script = typeof body.script === 'string' ? body.script.trim() : '';
      if (!script) return json({ error: 'script is required' }, 400);
      if (script.length > 3000) return json({ error: 'script too long (max 3000 chars)' }, 400);

      const createRes = await fetch(`${DID_BASE}/talks`, {
        method: 'POST',
        headers: {
          Authorization: didAuth,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          presenter_id: presenterId,
          script: {
            type: 'text',
            input: script,
            provider: { type: 'microsoft', voice_id: 'en-US-JennyNeural' },
          },
          config: { stitch: true },
        }),
      });
      if (!createRes.ok) {
        const errText = await createRes.text();
        console.error('D-ID create talk failed', createRes.status, errText);
        return json({ error: 'Failed to create D-ID talk', detail: errText }, 502);
      }
      const created = await createRes.json() as { id?: string };
      if (!created.id) return json({ error: 'D-ID did not return a talk id' }, 502);
      return json({ jobId: created.id }, 202);
    }

    if (body.action === 'status') {
      const jobId = typeof body.jobId === 'string' ? body.jobId.trim() : '';
      if (!jobId) return json({ error: 'jobId is required' }, 400);

      const pollRes = await fetch(`${DID_BASE}/talks/${jobId}`, {
        headers: { Authorization: didAuth, Accept: 'application/json' },
      });
      if (!pollRes.ok) {
        const errText = await pollRes.text();
        console.error('D-ID poll failed', pollRes.status, errText);
        return json({ error: 'Failed to fetch D-ID status', detail: errText }, 502);
      }
      const poll = await pollRes.json() as {
        status?: string;
        result_url?: string;
        error?: unknown;
      };

      if (poll.status === 'done' && poll.result_url) {
        return json({ status: 'ready', videoUrl: poll.result_url });
      }
      if (poll.status === 'error' || poll.status === 'rejected') {
        console.error('D-ID generation failed', poll);
        return json({ status: 'error', error: 'D-ID generation failed' });
      }
      return json({ status: 'pending' });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (err) {
    console.error('did-narrate error', err);
    return json({ error: 'Internal error', detail: String(err) }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
