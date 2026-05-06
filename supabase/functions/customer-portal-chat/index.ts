import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, retailerId, retailerName, history, productNames } = await req.json();

    if (!message) {
      return new Response(JSON.stringify({ error: 'No message provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const productCatalogSection = productNames && productNames.length > 0
      ? `\n\nAvailable products in catalog:\n${productNames.join('\n')}`
      : '';

    const systemPrompt = `You are a helpful order assistant for a retailer named ${retailerName || 'Customer'}.
You help retailers with:
- Placing orders by identifying products from their request
- Product information, specifications, and features
- Current schemes and offers
- Stock/inventory availability
- Order-related queries
- General business queries

IMPORTANT ORDER DETECTION RULES:
When the user mentions product names with quantities (e.g., "I need 2 kg haldi", "mujhe adrak 20g 5 packet chahiye", "order mirch powder 100g"), you MUST:
1. First respond with a brief friendly confirmation message
2. Then on a new line output the marker :::ORDER_ITEMS:::
3. Then output a JSON array of detected products with this format:
[{"productSearch": "product name with size", "quantity": number, "unit": "kg|g|pieces|packet"}]

Match product names against the catalog below. Use the closest matching name from the catalog.
${productCatalogSection}

For NON-order queries (schemes, help, general questions), respond normally without the ORDER_ITEMS marker.

Keep responses concise and friendly. Use bullet points for lists.
If you don't know something specific, suggest the retailer contact their sales representative.
Respond in the same language the user writes in (Hindi, English, or Hinglish).`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(history || []).map((h: any) => ({ role: h.role, content: h.content })),
      { role: 'user', content: message },
    ];

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error('AI processing failed');
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'Sorry, I could not process your request.';

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Chat error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
