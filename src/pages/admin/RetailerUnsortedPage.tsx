import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { RetailerUnsortedLookup } from '@/components/admin/RetailerUnsortedLookup';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin, Loader2, MapIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { IndiaMapView } from '@/components/admin/IndiaMapView';

const RetailerUnsortedPage: React.FC = () => {
  const { hasAdminAccess, loading } = useAdminAccess();
  const navigate = useNavigate();
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<any>(null);
  const [starting, setStarting] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);

  useEffect(() => {
    if (!jobId) return;
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('geocoding_jobs' as any)
        .select('*')
        .eq('id', jobId)
        .single();
      if (data) {
        setJobStatus(data);
        if ((data as any).status === 'completed' || (data as any).status === 'failed') {
          clearInterval(interval);
          if ((data as any).status === 'completed') {
            toast.success(`PIN code fetch complete! ${(data as any).geocoded_count} found, ${(data as any).failed_count} not found.`);
          } else {
            toast.error(`PIN code fetch failed: ${(data as any).error_message || 'Unknown error'}`);
          }
        }
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [jobId]);

  const handleFetchPinCodes = async () => {
    setStarting(true);
    try {
      const { data, error } = await supabase.functions.invoke('reverse-geocode-unsorted', {
        body: { mode: 'start_all' },
      });
      if (error) throw error;
      if (data.job_id) {
        setJobId(data.job_id);
        setJobStatus({ status: 'processing', total_records: data.total_records, processed_records: 0 });
        toast.info(`Fetching PIN codes for ${data.total_records} records in background...`);
      } else {
        toast.info(data.message || 'All records already have PIN codes.');
      }
    } catch (err: any) {
      toast.error(`Failed to start: ${err.message}`);
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!hasAdminAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  const isJobRunning = jobStatus && jobStatus.status === 'processing';
  const progressPercent = jobStatus && jobStatus.total_records > 0
    ? Math.round((jobStatus.processed_records / jobStatus.total_records) * 100)
    : 0;

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-subtle p-4">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/admin/retailer-external-db')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <AdminPageHeader
                title="Uncategorized Retailers"
                subtitle="Browse uncategorized retailer data by state, district and city"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                onClick={() => setMapOpen(true)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <MapIcon className="h-4 w-4" />
                Map View
              </Button>
              <Button
                variant="outline"
                onClick={handleFetchPinCodes}
                disabled={starting || isJobRunning}
                className="flex items-center gap-2"
              >
                {starting || isJobRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                {isJobRunning ? 'Fetching PIN Codes...' : 'Fetch PIN Codes'}
              </Button>
            </div>
          </div>

          {isJobRunning && (
            <div className="space-y-1">
              <Progress value={progressPercent} className="h-2" />
              <p className="text-xs text-muted-foreground">
                PIN Codes: {jobStatus.processed_records} / {jobStatus.total_records} processed ({progressPercent}%)
              </p>
            </div>
          )}

          <RetailerUnsortedLookup />
        </div>
      </div>

      <Dialog open={mapOpen} onOpenChange={setMapOpen}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] max-h-[90vh] p-0 flex flex-col">
          <DialogHeader className="px-6 pt-4 pb-2">
            <DialogTitle>India — Uncategorized Retailers Analytics</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <IndiaMapView rpcName="get_unsorted_state_analytics" />
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default RetailerUnsortedPage;
