import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function extractPincode(address: string | null): string | null {
  if (!address) return null;
  const match = address.match(/(\d{6})/);
  return match ? match[1] : null;
}

function getCategoryFitScore(category: string | null): number {
  if (!category) return 0;
  const c = category.toLowerCase();
  const high = ["bakery", "cafe", "confectionery", "sweet", "namkeen", "snack", "mithai"];
  const mid = ["supermarket", "general store", "groceries", "departmental", "grocery", "kirana", "provision", "retail"];
  const low = ["pharmacy", "medical", "chemist", "drug"];
  if (high.some(k => c.includes(k))) return 20;
  if (mid.some(k => c.includes(k))) return 10;
  if (low.some(k => c.includes(k))) return 5;
  return 0;
}

function isFmcgCompany(subcategories: string[]): boolean {
  const fmcgKeywords = ["tea", "coffee", "milk", "beverage", "juice", "snack", "biscuit", "cookie", "chips", "namkeen", "food", "spice", "masala", "flour", "atta", "dal", "oil", "ghee", "sugar", "salt", "rice", "cereal", "chocolate", "candy", "drink", "water", "soda", "bread", "noodle", "pasta", "sauce", "ketchup", "jam", "pickle", "papad", "instant"];
  return subcategories.some(s => {
    const sl = s.toLowerCase();
    return fmcgKeywords.some(k => sl.includes(k));
  });
}

function getChannelAffinityScore(category: string): number {
  const c = category.toLowerCase();
  const veryHigh = ["bakery", "cafe", "confectionery", "sweet shop", "mithai", "sweet mart"];
  const high = ["supermarket", "general store", "department store", "grocery", "groceries", "kirana", "provision", "departmental", "retail store"];
  const medium = ["mini mart", "convenience store", "convenience"];
  if (veryHigh.some(k => c.includes(k))) return 35;
  if (high.some(k => c.includes(k))) return 30;
  if (medium.some(k => c.includes(k))) return 25;
  return 0;
}

function getProductFitScore(category: string | null, subcategories: string[]): number {
  if (!category || subcategories.length === 0) return 0;
  const c = category.toLowerCase();
  // Direct match — highest priority
  if (subcategories.some(s => c.includes(s.toLowerCase()))) return 40;
  if (subcategories.some(s => {
    const words = s.toLowerCase().split(/\s+/);
    return words.some(w => w.length > 3 && c.includes(w));
  })) return 20;
  // Channel affinity — for FMCG companies, certain store types are high-fit
  if (isFmcgCompany(subcategories)) {
    const affinity = getChannelAffinityScore(c);
    if (affinity > 0) return affinity;
  }
  return 0;
}

function roundToNearest10(n: number): number {
  return Math.round(n / 10) * 10;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { mode = "pincode", pincode } = await req.json();

    // 1. Fetch company subcategories
    const { data: catData } = await supabase
      .from("company_product_categories")
      .select("categories_json")
      .limit(1)
      .maybeSingle();

    const subcategories: string[] = [];
    if (catData?.categories_json) {
      const raw = catData.categories_json as any;
      const cats = raw?.categories || (Array.isArray(raw) ? raw : []);
      cats.forEach((cat: any) => {
        if (cat.subcategories && Array.isArray(cat.subcategories)) {
          subcategories.push(...cat.subcategories);
        }
      });
    }
    console.log(`Subcategories loaded: ${subcategories.length}`, subcategories);

    // 2. Fetch ALL internal retailers (with or without GPS)
    const { data: internalRetailers } = await supabase
      .from("retailers")
      .select("latitude, longitude, address");

    // Build PIN code index and GPS coords list
    const internalByPincode = new Map<string, number>();
    const internalCoords: { lat: number; lon: number }[] = [];

    for (const r of (internalRetailers || [])) {
      // Extract PIN from address
      const pin = extractPincode(r.address);
      if (pin) {
        internalByPincode.set(pin, (internalByPincode.get(pin) || 0) + 1);
      }
      // Collect GPS coords
      const lat = Number(r.latitude);
      const lon = Number(r.longitude);
      if (!isNaN(lat) && !isNaN(lon) && r.latitude !== null && r.longitude !== null) {
        internalCoords.push({ lat, lon });
      }
    }

    console.log(`Internal retailers: ${(internalRetailers || []).length}, PIN codes indexed: ${internalByPincode.size}, with GPS: ${internalCoords.length}`);

    // 3. Fetch external retailers
    let query = supabase
      .from("retailer_external_db")
      .select("id, category, latitude, longitude, pincode");

    if (mode === "pincode" && pincode) {
      query = query.eq("pincode", pincode);
    }

    const { data: extRetailers, error: fetchErr } = await query;
    if (fetchErr) throw fetchErr;
    if (!extRetailers || extRetailers.length === 0) {
      return new Response(JSON.stringify({ success: true, scored: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Score each retailer
    const BATCH_SIZE = 500;
    let scored = 0;

    for (let i = 0; i < extRetailers.length; i += BATCH_SIZE) {
      const batch = extRetailers.slice(i, i + BATCH_SIZE);
      const updates: { id: number; match_score: number; match_breakdown: any }[] = [];

      for (const r of batch) {
        const productFit = getProductFitScore(r.category, subcategories);
        const categoryFit = getCategoryFitScore(r.category);

        // Proximity — PIN code match first, then GPS fallback
        let proximity = 0;
        let proximityReason = "";
        const extPin = r.pincode ? String(r.pincode) : null;

        if (extPin && internalByPincode.has(extPin)) {
          proximity = 20;
          proximityReason = "Same PIN code match";
        } else if (r.latitude && r.longitude) {
          const lat = Number(r.latitude);
          const lon = Number(r.longitude);
          if (!isNaN(lat) && !isNaN(lon) && internalCoords.length > 0) {
            let minDist = Infinity;
            for (const ic of internalCoords) {
              const d = haversineDistance(lat, lon, ic.lat, ic.lon);
              if (d < minDist) minDist = d;
            }
            if (minDist < 500) {
              proximity = 20;
              proximityReason = "Within 500m";
            } else if (minDist <= 1000) {
              proximity = 10;
              proximityReason = "Within 1km";
            }
          }
        }

        // Density — based on internal retailer count in same PIN
        let density = 0;
        let densityReason = "";
        const internalCount = extPin ? (internalByPincode.get(extPin) || 0) : 0;

        if (internalCount >= 5) {
          density = 20;
          densityReason = `High retailer presence (${internalCount} internal retailers)`;
        } else if (internalCount >= 2) {
          density = 10;
          densityReason = `Moderate retailer presence (${internalCount} internal retailers)`;
        }

        const rawScore = productFit + categoryFit + proximity + density;
        const finalScore = roundToNearest10(Math.min(rawScore, 100));

        updates.push({
          id: r.id,
          match_score: finalScore,
          match_breakdown: {
            product_fit: productFit,
            category_fit: categoryFit,
            proximity,
            proximity_reason: proximityReason,
            density,
            density_reason: densityReason,
          },
        });
      }

      // Batch update
      for (const u of updates) {
        await supabase
          .from("retailer_external_db")
          .update({ match_score: u.match_score, match_breakdown: u.match_breakdown } as any)
          .eq("id", u.id);
      }
      scored += updates.length;
    }

    return new Response(JSON.stringify({ success: true, scored }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
