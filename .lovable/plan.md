## Plan

1. Fix the customer portal confirmation sender
- Update `send-order-confirmation-whatsapp` to use this project’s configured Twilio credentials instead of the currently failing credential path.
- Normalize the sender/recipient WhatsApp numbers the same way the working order flow expects.
- Keep the 24-hour session check intact so confirmations are only sent when the session is active.

2. Make delivery failures visible instead of false-success
- Change the function so Twilio non-200 responses are treated as real failures, not logged as successful sends.
- Return clear error details in the function response for auth errors, template errors, or invalid sender/recipient formatting.
- Add more precise logs around the final Twilio request outcome.

3. Keep the customer portal trigger aligned with the fixed sender
- Verify the cart `Place Order` flow is passing the correct `orderId` and `retailerId` and is calling the confirmation function after order creation.
- Preserve the current non-blocking UX so order placement succeeds even if WhatsApp delivery fails.

4. Match the confirmation message to the expected format
- Ensure the generated WhatsApp confirmation content matches the message style shown in your attachment: order header, retailer greeting, item list, and total.
- If the active-session free-form message is rejected, keep the template fallback path working with the correct variables.

5. Validate end-to-end
- Redeploy the updated function.
- Trigger a real confirmation request against the function using a recent order/retailer pair.
- Check backend logs to confirm the send reaches Twilio successfully instead of returning the current `20003 Authenticate` failure.

## Technical details
- **Observed root cause:** the customer portal already calls `send-order-confirmation-whatsapp`, and the function is running, but the live logs show Twilio returning `20003 Authenticate`.
- **Important secondary issue:** the function currently logs `✅ Order confirmation sent...` even when Twilio has actually rejected the message.
- **Reference alignment:** the working Quickapp version uses project secrets for `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN`; this project also has Twilio secrets available, so the sender should be aligned to this project’s configured credentials rather than the current failing path.