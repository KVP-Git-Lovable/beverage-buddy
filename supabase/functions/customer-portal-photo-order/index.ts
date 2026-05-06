import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image, retailerId } = await req.json();
    console.log('Photo order request received, image length:', image?.length || 0);

    if (!image) {
      return new Response(JSON.stringify({ error: 'No image provided' }), {
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: products, error: prodError } = await supabase
      .from('products')
      .select('id, name, rate, unit, sku')
      .eq('is_active', true)
      .limit(500);

    if (prodError) {
      console.error('Products query error:', prodError);
    }
    console.log('Products loaded:', products?.length || 0);

    const productList = (products || []).map((p: any) =>
      `${p.name} [SKU:${p.sku || 'N/A'}]`
    ).join('\n');

    const systemPrompt = `You are an order extraction assistant. Extract product names and quantities from the image of a handwritten or printed order list.

AVAILABLE PRODUCTS (one per line):
${productList}

IMPORTANT MATCHING RULES:
- Match each detected item to the CLOSEST product from the available list above
- Use fuzzy/partial matching - e.g. "ADARAK" matches "KADAK PYALI ADARAK 250G"
- "Blue" matches "KADAK PYALI BLUE 40G", "Vayu" matches "VAYU 30G"
- Return the EXACT product name from the available list (not what was written)
- If quantity is not clear, default to 1
- If unit is not clear, use the product's default unit

Return ONLY a valid JSON array (no markdown, no code fences):
[
  {"raw_text": "what was written", "matched_name": "EXACT product name from list", "quantity": 5, "unit": "kg"}
]

If nothing can be detected, return: []`;

    const makeRequest = async (model: string) => {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Extract all product orders from this image. Return a JSON array.' },
                { type: 'image_url', image_url: { url: image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}` } },
              ],
            },
          ],
        }),
      });
      return response;
    };

    let responseData;
    let response = await makeRequest('google/gemini-2.5-flash');
    if (!response.ok) {
      console.error('Primary model failed:', response.status);
      response = await makeRequest('google/gemini-2.0-flash-001');
      if (!response.ok) throw new Error('AI processing failed');
    }
    responseData = await response.json();

    const aiResponse = responseData.choices?.[0]?.message?.content || '[]';
    console.log('AI response:', aiResponse.substring(0, 800));

    let items = [];
    try {
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) items = JSON.parse(jsonMatch[0]);
    } catch {
      console.error('Failed to parse AI response');
    }

    // Match to actual products with fuzzy matching
    const enrichedItems = items.map((item: any) => {
      const searchName = (item.matched_name || item.product_name || '').toLowerCase();
      
      // Try exact match first, then fuzzy
      let match = (products || []).find((p: any) => p.name.toLowerCase() === searchName);
      if (!match) {
        match = (products || []).find((p: any) =>
          p.name.toLowerCase().includes(searchName) ||
          searchName.includes(p.name.toLowerCase())
        );
      }
      if (!match) {
        // Try word-by-word matching - find product with most matching words
        const searchWords = searchName.split(/\s+/).filter((w: string) => w.length > 2);
        let bestMatch: any = null;
        let bestScore = 0;
        for (const p of (products || [])) {
          const pName = p.name.toLowerCase();
          const score = searchWords.filter((w: string) => pName.includes(w)).length;
          if (score > bestScore) {
            bestScore = score;
            bestMatch = p;
          }
        }
        if (bestScore > 0) match = bestMatch;
      }

      return {
        raw_text: item.raw_text || '',
        product_id: match?.id || null,
        product_name: match?.name || item.matched_name || item.product_name || item.raw_text,
        sku: match?.sku || '',
        rate: match?.rate || 0,
        unit: item.unit || match?.unit || 'pieces',
        quantity: item.quantity || 1,
        matched: !!match,
      };
    });

    console.log('Photo order extracted:', enrichedItems.length, 'items, matched:', enrichedItems.filter((i: any) => i.matched).length);

    return new Response(JSON.stringify({ items: enrichedItems }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Photo order error:', error);
    return new Response(JSON.stringify({ error: 'Processing failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
