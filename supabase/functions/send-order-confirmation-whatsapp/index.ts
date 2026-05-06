import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📨 Edge function invoked: send-order-confirmation-whatsapp');
    const { orderId, retailerId } = await req.json();
    console.log('Request payload:', { orderId, retailerId });
    if (!orderId || !retailerId) {
      throw new Error('orderId and retailerId are required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch retailer
    const { data: retailer, error: rErr } = await supabase
      .from('retailers')
      .select('name, phone')
      .eq('id', retailerId)
      .single();

    if (rErr || !retailer?.phone) {
      throw new Error(`Retailer not found or no phone: ${rErr?.message}`);
    }

    // Normalize retailer phone to 10-digit for session lookup
    const digits = retailer.phone.replace(/\D/g, '');
    const digits10 = digits.startsWith('91') && digits.length === 12 ? digits.slice(2) : digits;
    const variants = [digits10, `91${digits10}`, `+91${digits10}`, `whatsapp:+91${digits10}`, `whatsapp:91${digits10}`];

    // Check whatsapp_sessions for an active session within 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: session, error: sErr } = await supabase
      .from('whatsapp_sessions')
      .select('last_active_at, phone_number')
      .in('phone_number', variants)
      .gte('last_active_at', twentyFourHoursAgo)
      .maybeSingle();

    if (sErr) {
      console.error('Session lookup error:', sErr.message);
    }

    if (!session) {
      console.log(`⏭️ Skipping WhatsApp — no active session for phone variants: ${variants.join(', ')}`);
      return new Response(
        JSON.stringify({ ok: true, skipped: true, reason: 'no active whatsapp session' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Active session found: phone=${session.phone_number}, last_active=${session.last_active_at}`);

    // Fetch order items
    const { data: items, error: iErr } = await supabase
      .from('order_items')
      .select('product_name, quantity, rate, total, unit')
      .eq('order_id', orderId);

    if (iErr) throw new Error(`Failed to fetch order items: ${iErr.message}`);

    // Fetch order total
    const { data: order, error: oErr } = await supabase
      .from('orders')
      .select('total_amount')
      .eq('id', orderId)
      .single();

    if (oErr) throw new Error(`Failed to fetch order: ${oErr.message}`);

    const totalAmount = order.total_amount ?? 0;

    // Build WhatsApp message
    const itemLines = (items || []).map((item, idx) => {
      const subtotal = (item.quantity * item.rate).toFixed(2);
      return `${idx + 1}. *${item.product_name}* — ${item.quantity} ${item.unit || ''} × ₹${Number(item.rate).toFixed(2)} = ₹${subtotal}`;
    }).join('\n');

    const shortId = orderId.substring(0, 8);
    const message = `🛒 *Order Confirmation*\n\nHi *${retailer.name}*,\n\nYour order *#${shortId}* has been placed successfully!\n\n📦 *Order Items:*\n${itemLines}\n\n💰 *Total: ₹${Number(totalAmount).toFixed(2)}*\n\nThank you for your order! 🙏`;

    // Send via Twilio (use same hardcoded SID as send-invoice-whatsapp)
    const accountSid = 'AC2bed17b2742df7031ebc7de2d726b62f';
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    if (!authToken) throw new Error('TWILIO_AUTH_TOKEN not configured');

    const fromNumber = '+917411681616';
    const toNumber = retailer.phone.startsWith('+') ? retailer.phone : `+91${retailer.phone.replace(/\D/g, '')}`;

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const base64Auth = btoa(`${accountSid}:${authToken}`);

    // Try free-form message first
    let response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${base64Auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: `whatsapp:${toNumber}`,
        From: `whatsapp:${fromNumber}`,
        Body: message,
      }),
    });

    let result = await response.json();

    // If outside 24-hour window (error 63016), fall back to template
    if (!response.ok && result.code === 63016) {
      console.log('Outside 24-hour window, falling back to template');

      const contentVariables = JSON.stringify({
        "1": shortId,
        "2": `₹${Number(totalAmount).toFixed(2)}`,
      });

      response = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${base64Auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: `whatsapp:${toNumber}`,
          From: `whatsapp:${fromNumber}`,
          ContentSid: 'HX2b27e4c3a2353117297ef3d48c04e292',
          ContentVariables: contentVariables,
        }),
      });

      result = await response.json();
    }

    console.log(`✅ Order confirmation sent for order ${shortId} to ${toNumber}`, JSON.stringify(result));

    return new Response(
      JSON.stringify({ ok: response.ok, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Order confirmation WhatsApp failed:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
