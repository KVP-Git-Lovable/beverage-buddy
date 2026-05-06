import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, MapPinned } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface JobRow {
  id: string;
  status: string;
  total_records: number;
  processed_records: number;
  geocoded_count: number;
  failed_count: number;
  error_message: string | null;
}

export const FetchGeocodingButton: React.FC = () => {
  const [starting, setStarting] = useState(false);
  const [job, setJob] = useState<JobRow | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => () => stopPolling(), []);

  const pollJob = (jobId: string) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      const { data, error } = await supabase
        .from('geocoding_jobs')
        .select('id, status, total_records, processed_records, geocoded_count, failed_count, error_message')
        .eq('id', jobId)
        .maybeSingle();

      if (error) {
        console.error('Job poll error:', error);
        return;
      }
      if (!data) return;
      setJob(data as JobRow);

      if (data.status === 'completed' || data.status === 'failed') {
        stopPolling();
        if (data.status === 'completed') {
          toast.success(`Geocoding complete: ${data.geocoded_count} geocoded, ${data.failed_count} failed`);
        } else {
          toast.error(`Geocoding failed: ${data.error_message || 'Unknown error'}`);
        }
      }
    }, 3000);
  };

  const handleStart = async () => {
    setStarting(true);
    try {
      const { data, error } = await supabase.functions.invoke('geocode-retailer-ext', {
        body: { mode: 'geocode_all' },
      });
      if (error) throw error;

      if (!data?.job_id) {
        toast.info(data?.message || 'No records need geocoding');
        setStarting(false);
        return;
      }

      toast.success(`Geocoding started for ${data.total_records} records`);
      setJob({
        id: data.job_id,
        status: 'processing',
        total_records: data.total_records,
        processed_records: 0,
        geocoded_count: 0,
        failed_count: 0,
        error_message: null,
      });
      pollJob(data.job_id);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Failed to start geocoding');
    } finally {
      setStarting(false);
    }
  };

  const isRunning = job && (job.status === 'processing' || job.status === 'pending');
  const pct = job && job.total_records > 0
    ? Math.round((job.processed_records / job.total_records) * 100)
    : 0;

  return (
    <div className="flex items-center gap-1.5">
      {isRunning && (
        <span className="text-[10px] text-muted-foreground hidden md:inline">
          {pct}% · ✓{job!.geocoded_count}/✗{job!.failed_count}
        </span>
      )}
      <Button
        onClick={handleStart}
        variant="outline"
        size="sm"
        className="gap-1 h-8 px-2 text-xs"
        disabled={starting || !!isRunning}
      >
        {starting || isRunning ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <MapPinned size={14} />
        )}
        {isRunning ? `${pct}%` : 'Fetch Geocoding'}
      </Button>
    </div>
  );
};
