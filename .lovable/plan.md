## Goal
Add a "Product Availability" intent to the WhatsApp webhook so customers can ask things like *"Do you have Crocin?"*, *"Is Paracetamol available?"*, *"Need Dolo"* and get an instant, database-backed answer — without breaking the existing Place Order flow.

## Where the change goes
Single file: `supabase/functions/webhook-whatsapp/index.ts`

Inside `processMessageAsync` (around lines 1116–1158), the intents are evaluated in order:
1. `CONFIRMING_ORDER` state
2. Order Status Query
3. Retailer Info Query
4. Delivery Query
5. Follow-Up Query
6. **Place Order intent** (keyword match: "place order", "i want to order", "new order", "order karna", …)
7. Gemini fallback

We will insert the **Product Availability** check as step 6.5 — **after** the explicit Place Order keyword check (so "place order" still wins) and **before** the Gemini fallback. This matches the requested priority: order placement → product availability → other → fallback.

## Implementation outline

### 1. New helper: `handleProductAvailabilityQuery`
Add a new async function alongside the other handlers:

```ts
async function handleProductAvailabilityQuery(
  supabase: any,
  message: string,
): Promise<string | null>
```

Steps inside:

**a. Intent detection (case-insensitive regex)**
Return `null` (skip) unless one of these matches:
- `/\bavailable\b/i`
- `/\bdo you have\b/i`
- `/\bis\s+.+\s+available\b/i`
- `/\bneed\b/i`
- `/\bhave\s+.+\s+product\b/i`
- `/\bproduct available\b/i`

To avoid clashing with order phrases, also bail out if the message already matched the Place Order keywords (we are after that block, so this is automatic).

**b. Extract the probable product term**
- Lowercase the message, strip punctuation (`?`, `!`, `.`, `,`).
- Remove a stopword set: `whether, product, available, do, you, have, need, is, are, please, the, a, an, any, some, kindly, sir, madam, bhai, ji, hai, kya, mujhe, chahiye, mil, sakta, sakti, currently, right, now, in, stock`.
- Trim leftover whitespace. The remaining token(s) become the search term.
- If the term is empty or shorter than 2 chars → return a polite "couldn't understand which product" message (or `null` to fall through to Gemini — we'll go with the polite message to keep behaviour deterministic).

**c. Database search**
Query the `products` table with case-insensitive partial match on `name` (and `sku` when present):

```ts
supabase.from('products')
  .select('name, sku, is_active')
  .eq('is_active', true)
  .or(`name.ilike.%${term}%,sku.ilike.%${term}%`)
  .order('name')
  .limit(10);
```

(Safely escape `%`, `_`, and commas in `term` before injecting into the `.or()` string.)

**d. Response logic**
- **0 matches** →
  `"I'm sorry, we could not find a matching product at the moment. Please try searching with another product name or contact our team for assistance."`
- **1 match** →
  `"Yes, the requested product is available.\n\nAvailable product:\n<Product Name>"`
- **>1 matches** →
  `"Yes, we have the following matching products available:\n\n<Name1>, <Name2>, <Name3>"`
  (comma-separated, capped at 10 names to keep the WhatsApp message short).

### 2. Wire it into `processMessageAsync`
Right after the Place Order intent block (after line 1158) and before the Gemini fallback (line 1160), add:

```ts
const availabilityReply = await handleProductAvailabilityQuery(supabase, message);
if (availabilityReply) {
  session.conversation_history.push(
    { role: 'user',  parts: [{ text: message }] },
    { role: 'model', parts: [{ text: availabilityReply }] },
  );
  await saveSession(supabase, session);
  await sendTwilioFreeForm(phone, availabilityReply);
  return;
}
```

This mirrors the existing handler pattern (status / delivery / follow-up), so:
- It works as a conversational follow-up — session state is preserved, no reset.
- It does **not** disturb `CONFIRMING_ORDER` (that block returns earlier).
- It does **not** intercept "place order" phrases (those return earlier).

## Constraints respected
- **Place Order flow untouched** — checked first; availability handler returns early before Gemini runs.
- **Products DB is source of truth** — direct `products` table query with `is_active = true`.
- **Partial + case-insensitive** — `ilike '%term%'` on both `name` and `sku`.
- **Multiple matches** — joined with `", "`, capped at 10.
- **Conversational follow-up** — handler is stateless re. session.state; works in `IDLE` and `AWAITING_ORDER_DETAILS` alike, and history is appended.

## Out of scope
- No DB migration.
- No changes to Gemini tools or system prompt.
- No changes to `customer-portal-chat` (separate flow).
- No deletion / refactor of existing handlers.

## Testing plan (after implementation)
Use `supabase--curl_edge_functions` to POST a Twilio-style form payload to `/webhook-whatsapp` for the listed example messages and confirm:
- "Do you have Crocin?" → returns one of the 3 response shapes.
- "Place order" still triggers the order template (unchanged).
- "Need 2 kg adrak" while in `AWAITING_ORDER_DETAILS` still routes to Gemini order parsing (since "need" matches availability but products like "adrak" exist — note: this is a known overlap; mitigated because availability is checked **only after** the explicit place-order intent, and during `AWAITING_ORDER_DETAILS` users normally reply with quantities, not "need X"). If overlap proves problematic in QA, we can additionally skip the availability handler when `session.state === 'AWAITING_ORDER_DETAILS'` — flagging this for your call.

## Open question
During `AWAITING_ORDER_DETAILS`, should "Need Crocin" be treated as (a) an availability question or (b) an order line item? Default in this plan: **(a) availability** because the user phrased it as an enquiry. Let me know if you'd prefer (b).