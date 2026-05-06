## Replicate WhatsApp Webhook from "Staging - Quickapp"

The `webhook-whatsapp` edge function is already present in this project and is byte-identical to the source. All required tables (`whatsapp_sessions`, `user_context`, `unhandled_queries`, `retailers`, `orders`, `order_items`, `products`, `product_categories`) exist. Required secrets (`GEMINI_API_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER`) are configured.

Only two deltas are needed to meet the requirements:

### Changes to `supabase/functions/webhook-whatsapp/index.ts`

1. `sendTwilioTemplate()` (~line 1254):
   - Remove hardcoded `accountSid = 'AC2bed17b2742df7031ebc7de2d726b62f'`. Read `TWILIO_ACCOUNT_SID` from env; bail with an error log if missing.
   - Replace hardcoded `From: 'whatsapp:+917411681616'` with `TWILIO_WHATSAPP_NUMBER` env, defaulting to `whatsapp:+917411678484`.

2. `sendTwilioFreeForm()` (~line 1294):
   - Drop the hardcoded SID fallback; use `Deno.env.get('TWILIO_ACCOUNT_SID')` only and bail with an error log if missing.
   - Change default fallback for `fromNumber` from `whatsapp:+917411681616` to `whatsapp:+917411678484`.

All DB calls already go through `getSupabaseClient()` which uses the current project's `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`, so retailers, products, orders, and sessions automatically come from this project's database.

### Out of scope

- No changes to `send-invoice-whatsapp`, `send-order-confirmation-whatsapp`, UI, schema, RLS, business logic, or `supabase/config.toml`.
- No new secrets requested — existing `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_WHATSAPP_NUMBER` are reused. If `TWILIO_WHATSAPP_NUMBER` is left unset, the inline default `+917411678484` applies.

### Webhook endpoint for Twilio Console

`https://qdopojhwikdikhppqtgx.supabase.co/functions/v1/webhook-whatsapp`
