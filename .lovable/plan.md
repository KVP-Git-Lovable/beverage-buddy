## Current state

The greeting flow already matches the spec:
- `GREETING_SET` detects hi/hello/hey/etc. (line 863)
- Returns instant static TwiML (`sendStaticGreetingTwiml`, line 867)
- Fires the Place-Order template (ContentSid `HXae62614f9e4e3b47ede7db13d75175eb`) via `EdgeRuntime.waitUntil(sendPlaceOrderTemplateAsync(phone))` from the new `+917411678484` number (lines 937–945, 1254–1294)
- 30 s dedup guard prevents repeat templates

So no changes needed for greeting. Only the **product-count intent** is missing.

## Plan: add product-count fast-path

In `supabase/functions/webhook-whatsapp/index.ts`, insert a new fast-path **after** the greeting block (after line 946) and **before** the generic async processing (line 950):

1. Detect intent via lowercase regex on the trimmed message:
   - `/how many products|total products|number of products|product count|how many skus/i`
2. Return TwiML immediately with placeholder, OR — to include the live count — run a quick `select count` via the existing `getSupabaseClient()` against `products` (with `is_active=true` filter if column exists; otherwise plain count). The DB call is fast (<200 ms) so we can `await` it before responding while still staying under the 1–2 s budget. On failure, reply with the fallback line.
3. Reply text:
   - Success: `"We currently have {count} products available."`
   - Failure: `"Let me check that for you. Please try again shortly."`
4. Log: `webhook_latency_ms=… path=product_count count=…`

No changes to:
- Existing webhook structure beyond the new branch
- Other conversational flows, Journey Builder, Communication Center
- UI, schema, RLS, `config.toml`
- `sendTwilioTemplate` / `sendTwilioFreeForm`

### Snippet (added between current lines 946 and 948)

```ts
// ── Fast-path: product count intent ──
const lower = message.toLowerCase();
if (/how many products|total products|number of products|product count|how many skus/.test(lower)) {
  let reply = 'Let me check that for you. Please try again shortly.';
  try {
    const sb = getSupabaseClient();
    const { count, error } = await sb
      .from('products')
      .select('*', { count: 'exact', head: true });
    if (!error && typeof count === 'number') {
      reply = `We currently have ${count} products available.`;
    }
  } catch (e) {
    console.error('product_count query failed:', e);
  }
  console.log(`webhook_latency_ms=${(performance.now() - t0).toFixed(0)} path=product_count`);
  const twiml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<Response><Message>${reply}</Message></Response>`;
  return new Response(twiml, { status: 200, headers: { ...corsHeaders, 'Content-Type': 'text/xml' } });
}
```

## Validation

- "Hi" → instant text + Place-Order template (already working, unchanged)
- "How many products do you have?" → live count from current project's `products` table
- DB error → polite fallback string
- Any other message → existing async Gemini/AI path untouched

Ready to implement on approval.