import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const BATCH_SIZE = 100;
const PARALLEL_CHUNK = 10;

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

    const { mode = 'start_all' } = await req.json();

    if (mode === 'batch') {
      const result = await processBatch(supabase, GOOGLE_MAPS_API_KEY);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // start_all mode
    const { count, error: countError } = await supabase
      .from('retailer_external_unsorted')
      .select('*', { count: 'exact', head: true })
      .is('pincode', null)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (countError) throw countError;

    if (!count || count === 0) {
      return new Response(JSON.stringify({ message: 'All records already have pin codes', total: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    EdgeRuntime.waitUntil(processAll(supabase, GOOGLE_MAPS_API_KEY, job.id, count));

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

async function processRecord(row: any, supabase: any, apiKey: string): Promise<{ geocoded: boolean; failed: boolean }> {
  try {
    const pinCode = await reverseGeocode(row.latitude, row.longitude, apiKey);
    const { error: updateError } = await supabase
      .from('retailer_external_unsorted')
      .update({ pincode: pinCode })
      .eq('id', row.id);

    if (updateError) {
      console.error(`Update failed for id ${row.id}:`, updateError);
      return { geocoded: false, failed: true };
    }
    return pinCode !== 'NOT_FOUND' ? { geocoded: true, failed: false } : { geocoded: false, failed: true };
  } catch (err) {
    console.error(`Error for id ${row.id}:`, err);
    await supabase
      .from('retailer_external_unsorted')
      .update({ pincode: 'NOT_FOUND' })
      .eq('id', row.id);
    return { geocoded: false, failed: true };
  }
}

async function processAll(supabase: any, apiKey: string, jobId: string, totalRecords: number) {
  let processed = 0;
  let geocoded = 0;
  let failed = 0;

  try {
    while (true) {
      const { data: rows, error } = await supabase
        .from('retailer_external_unsorted')
        .select('id, latitude, longitude, state')
        .is('pincode', null)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .order('state', { ascending: true })
        .limit(BATCH_SIZE);

      if (error) {
        console.error('Fetch error:', error);
        break;
      }

      if (!rows || rows.length === 0) break;

      // Process in parallel chunks
      for (let i = 0; i < rows.length; i += PARALLEL_CHUNK) {
        const chunk = rows.slice(i, i + PARALLEL_CHUNK);
        const results = await Promise.all(
          chunk.map((row: any) => processRecord(row, supabase, apiKey))
        );
        for (const r of results) {
          processed++;
          if (r.geocoded) geocoded++;
          if (r.failed) failed++;
        }
      }

      // Update job progress after each batch
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

    console.log(`Job ${jobId} completed: ${geocoded} geocoded, ${failed} failed out of ${processed} processed`);
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

async function processBatch(supabase: any, apiKey: string) {
  const { data: rows, error } = await supabase
    .from('retailer_external_unsorted')
    .select('id, latitude, longitude, state')
    .is('pincode', null)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .order('state', { ascending: true })
    .limit(BATCH_SIZE);

  if (error) throw error;
  if (!rows || rows.length === 0) return { message: 'No records to process', processed: 0 };

  let geocoded = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i += PARALLEL_CHUNK) {
    const chunk = rows.slice(i, i + PARALLEL_CHUNK);
    const results = await Promise.all(
      chunk.map((row: any) => processRecord(row, supabase, apiKey))
    );
    for (const r of results) {
      if (r.geocoded) geocoded++;
      if (r.failed) failed++;
    }
  }

  return { processed: rows.length, geocoded, failed };
}

async function reverseGeocode(lat: number, lng: number, apiKey: string): Promise<string> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${encodeURIComponent(lat)},${encodeURIComponent(lng)}&result_type=postal_code&key=${apiKey}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    const text = await response.text();
    console.error('Geocoding API error:', text);
    return 'NOT_FOUND';
  }

  const data = await response.json();
  
  if (data.status === 'OK' && data.results && data.results.length > 0) {
    const components = data.results[0].address_components || [];
    for (const comp of components) {
      if (comp.types && comp.types.includes('postal_code')) {
        return comp.long_name;
      }
    }
  }

  return 'NOT_FOUND';
}
