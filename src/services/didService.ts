import { supabase } from '@/integrations/supabase/client';

export type DIDStatus = 'pending' | 'ready' | 'error';

export interface DIDStatusResult {
  status: DIDStatus;
  videoUrl?: string;
  error?: string;
}

/**
 * Start an async D-ID talking-avatar job. Returns immediately with a jobId.
 */
export async function startDIDTalk(summaryText: string): Promise<{ jobId: string }> {
  const script = (summaryText || '').trim();
  if (!script) throw new Error('Summary text is empty');

  const { data, error } = await supabase.functions.invoke('did-narrate', {
    body: { action: 'start', script },
  });
  if (error) throw new Error(error.message || 'Failed to start narration');
  const jobId = (data as { jobId?: string })?.jobId;
  if (!jobId) throw new Error((data as { error?: string })?.error || 'No jobId returned');
  return { jobId };
}

/**
 * Poll status for a D-ID job. Returns pending / ready (with videoUrl) / error.
 */
export async function getDIDStatus(jobId: string): Promise<DIDStatusResult> {
  const { data, error } = await supabase.functions.invoke('did-narrate', {
    body: { action: 'status', jobId },
  });
  if (error) throw new Error(error.message || 'Failed to fetch narration status');
  const d = (data ?? {}) as DIDStatusResult;
  if (d.status !== 'pending' && d.status !== 'ready' && d.status !== 'error') {
    throw new Error('Invalid status response');
  }
  return d;
}
