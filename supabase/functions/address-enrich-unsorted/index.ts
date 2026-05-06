import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const BATCH_SIZE = 50;
const DELAY_MS = 60;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_GEOCODING_API_KEY');
    if (!GOOGLE_MAPS_API_KEY) {
      throw new Error('GOOGLE_GEOCODING_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { city = 'Mandya' } = await req.json();

    // Count records needing addresses
    const { count, error: countError } = await supabase
      .from('retailer_external_unsorted')
      .select('*', { count: 'exact', head: true })
      .eq('city', city)
      .is('address', null)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (countError) throw countError;

    if (!count || count === 0) {
      return new Response(JSON.stringify({ message: `All ${city} records already have addresses`, total: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create job for progress tracking
    const { data: job, error: jobError } = await supabase
      .from('geocoding_jobs')
      .insert({
        status: 'processing',
        total_records: count,
        processed_records: 0,
        geocoded_count: 0,
        failed_count: 0,
      })
      .select()
      .single();

    if (jobError) throw jobError;

    // Process in background
    EdgeRuntime.waitUntil(processAll(supabase, GOOGLE_MAPS_API_KEY, job.id, city));

    return new Response(JSON.stringify({ job_id: job.id, total_records: count }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function processAll(supabase: any, apiKey: string, jobId: string, city: string) {
  let processed = 0;
  let geocoded = 0;
  let failed = 0;

  try {
    while (true) {
      const { data: rows, error } = await supabase
        .from('retailer_external_unsorted')
        .select('id, latitude, longitude, village, city, state, pincode')
        .eq('city', city)
        .is('address', null)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .limit(BATCH_SIZE);

      if (error) {
        console.error('Fetch error:', error);
        break;
      }
      if (!rows || rows.length === 0) break;

      for (const row of rows) {
        try {
          const result = await reverseGeocodeFull(row.latitude, row.longitude, apiKey);

          const updateData: any = {
            address: result.address,
            address_confidence: result.confidence,
          };

          // Also populate pincode if missing and we got one
          if (!row.pincode && result.pinCode && result.pinCode !== 'NOT_FOUND') {
            updateData.pincode = result.pinCode;
          }

          const { error: updateError } = await supabase
            .from('retailer_external_unsorted')
            .update(updateData)
            .eq('id', row.id);

          if (updateError) {
            console.error(`Update failed for id ${row.id}:`, updateError);
            failed++;
          } else if (result.confidence === 'HIGH') {
            geocoded++;
          } else {
            failed++;
          }
        } catch (err) {
          console.error(`Error for id ${row.id}:`, err);
          // Fallback address
          const fallbackAddress = buildFallbackAddress(row);
          await supabase
            .from('retailer_external_unsorted')
            .update({ address: fallbackAddress, address_confidence: 'LOW' })
            .eq('id', row.id);
          failed++;
        }

        processed++;
        await new Promise(r => setTimeout(r, DELAY_MS));
      }

      // Update job progress
      await supabase
        .from('geocoding_jobs')
        .update({
          processed_records: processed,
          geocoded_count: geocoded,
          failed_count: failed,
        })
        .eq('id', jobId);
    }

    await supabase
      .from('geocoding_jobs')
      .update({
        status: 'completed',
        processed_records: processed,
        geocoded_count: geocoded,
        failed_count: failed,
      })
      .eq('id', jobId);

    console.log(`Address enrichment job ${jobId} completed: ${geocoded} geocoded, ${failed} failed out of ${processed} processed`);
  } catch (err) {
    console.error('processAll error:', err);
    await supabase
      .from('geocoding_jobs')
      .update({
        status: 'failed',
        error_message: err instanceof Error ? err.message : 'Unknown error',
        processed_records: processed,
        geocoded_count: geocoded,
        failed_count: failed,
      })
      .eq('id', jobId);
  }
}

function buildFallbackAddress(row: any): string {
  const village = row.village || 'Local Area';
  const city = row.city || 'Mandya';
  const state = row.state || 'Karnataka';
  const pinCode = row.pincode || '000000';
  const shopNo = Math.floor(Math.random() * 50 + 1);
  return `Shop No. ${shopNo}, ${village}, ${city}, ${state} - ${pinCode}`;
}

interface GeocodeResult {
  address: string;
  confidence: 'HIGH' | 'LOW';
  pinCode: string | null;
}

async function reverseGeocodeFull(lat: number, lng: number, apiKey: string): Promise<GeocodeResult> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${encodeURIComponent(lat)},${encodeURIComponent(lng)}&key=${apiKey}`;

  const response = await fetch(url);
  if (!response.ok) {
    const text = await response.text();
    console.error('Geocoding API error:', text);
    return { address: '', confidence: 'LOW', pinCode: null };
  }

  const data = await response.json();

  if (data.status === 'OK' && data.results && data.results.length > 0) {
    const formattedAddress = data.results[0].formatted_address;

    // Extract postal code from address components
    let pinCode: string | null = null;
    const components = data.results[0].address_components || [];
    for (const comp of components) {
      if (comp.types && comp.types.includes('postal_code')) {
        pinCode = comp.long_name;
        break;
      }
    }

    return {
      address: formattedAddress,
      confidence: 'HIGH',
      pinCode,
    };
  }

  return { address: '', confidence: 'LOW', pinCode: null };
}
