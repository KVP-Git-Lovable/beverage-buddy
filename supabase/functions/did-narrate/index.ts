// D-ID talking avatar narration generator.
// Accepts { script } and returns { videoUrl }.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const DID_BASE = 'https://api.d-id.com';

interface CreateTalkResponse {
  id: string;
  status?: string;
}

interface GetTalkResponse {
  id: string;
  status: string;
  result_url?: string;
  error?: unknown;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ---- Auth (signing-keys system, in-code JWT check) ----
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

    // ---- Input validation ----
    const body = await req.json().catch(() => null);
    const script = typeof body?.script === 'string' ? body.script.trim() : '';
    if (!script) return json({ error: 'script is required' }, 400);
    if (script.length > 3000) return json({ error: 'script too long (max 3000 chars)' }, 400);

    // ---- Secrets ----
    const apiKey = Deno.env.get('DID_API_KEY');
    const presenterId = Deno.env.get('DID_PRESENTER_ID');
    if (!apiKey || !presenterId) {
      console.error('Missing D-ID configuration');
      return json({ error: 'D-ID not configured' }, 500);
    }

    // D-ID accepts either a raw key or a base64 "user:pass" — pass through as Basic.
    const authValue = apiKey.includes(':') ? btoa(apiKey) : apiKey;
    const didAuth = `Basic ${authValue}`;

    // ---- Create talk ----
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
          provider: {
            type: 'microsoft',
            voice_id: 'en-US-JennyNeural',
          },
        },
        config: { stitch: true },
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      console.error('D-ID create talk failed', createRes.status, errText);
      return json({ error: 'Failed to create D-ID talk', detail: errText }, 502);
    }
    const created = (await createRes.json()) as CreateTalkResponse;
    const talkId = created.id;
    if (!talkId) return json({ error: 'D-ID did not return a talk id' }, 502);

    // ---- Poll until done (max ~90s) ----
    const maxAttempts = 45;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await sleep(2000);
      const pollRes = await fetch(`${DID_BASE}/talks/${talkId}`, {
        headers: { Authorization: didAuth, Accept: 'application/json' },
      });
      if (!pollRes.ok) {
        const errText = await pollRes.text();
        console.error('D-ID poll failed', pollRes.status, errText);
        continue;
      }
      const poll = (await pollRes.json()) as GetTalkResponse;
      if (poll.status === 'done' && poll.result_url) {
        return json({ videoUrl: poll.result_url, talkId });
      }
      if (poll.status === 'error' || poll.status === 'rejected') {
        console.error('D-ID generation failed', poll);
        return json({ error: 'D-ID generation failed', detail: poll.error ?? null }, 502);
      }
    }

    return json({ error: 'D-ID generation timed out' }, 504);
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

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
