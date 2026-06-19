import { supabase } from '@/integrations/supabase/client';

export interface DIDVideoResult {
  videoUrl: string;
  talkId?: string;
}

/**
 * Request a D-ID talking-avatar video for the given summary text.
 * Calls the secure `did-narrate` edge function which holds the D-ID key.
 */
export async function generateDIDVideo(summaryText: string): Promise<DIDVideoResult> {
  const script = (summaryText || '').trim();
  if (!script) throw new Error('Summary text is empty');

  const { data, error } = await supabase.functions.invoke('did-narrate', {
    body: { script },
  });

  if (error) {
    throw new Error(error.message || 'Failed to generate narration');
  }
  if (!data?.videoUrl) {
    throw new Error((data as { error?: string })?.error || 'No video URL returned');
  }
  return { videoUrl: data.videoUrl as string, talkId: data.talkId as string | undefined };
}
