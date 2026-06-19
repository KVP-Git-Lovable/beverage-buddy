import { useCallback, useEffect, useRef, useState } from 'react';
import { getDIDStatus, startDIDTalk } from '@/services/didService';

export type NarrationStatus = 'idle' | 'loading' | 'ready' | 'error';

interface UseDIDNarrationResult {
  videoUrl: string | null;
  status: NarrationStatus;
  error: string | null;
  generate: (summaryText: string) => Promise<void>;
  regenerate: (summaryText: string) => Promise<void>;
  reset: () => void;
}

function hashScript(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) + h) ^ text.charCodeAt(i);
  }
  return String(h >>> 0);
}

const sessionCache = new Map<string, string>();

const POLL_INTERVAL_MS = 3000;
const POLL_MAX_ATTEMPTS = 60; // ~3 min

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function useDIDNarration(): UseDIDNarrationResult {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<NarrationStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const inflightKey = useRef<string | null>(null);
  const cancelledRef = useRef(false);
  const runIdRef = useRef(0);

  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  const run = useCallback(async (summaryText: string, force: boolean) => {
    const script = (summaryText || '').trim();
    if (!script) return;
    const key = hashScript(script);

    if (!force) {
      const cached = sessionCache.get(key);
      if (cached) {
        setVideoUrl(cached);
        setStatus('ready');
        setError(null);
        return;
      }
      if (inflightKey.current === key) return;
    }

    inflightKey.current = key;
    const myRunId = ++runIdRef.current;

    setStatus('loading');
    setError(null);
    if (force) setVideoUrl(null);

    try {
      const { jobId } = await startDIDTalk(script);

      for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
        await sleep(POLL_INTERVAL_MS);
        if (cancelledRef.current || runIdRef.current !== myRunId) return;

        const result = await getDIDStatus(jobId);
        if (cancelledRef.current || runIdRef.current !== myRunId) return;

        if (result.status === 'ready' && result.videoUrl) {
          sessionCache.set(key, result.videoUrl);
          setVideoUrl(result.videoUrl);
          setStatus('ready');
          return;
        }
        if (result.status === 'error') {
          throw new Error(result.error || 'Narration failed');
        }
        // pending → keep polling
      }
      throw new Error('Narration timed out. Please try again.');
    } catch (e) {
      if (cancelledRef.current || runIdRef.current !== myRunId) return;
      console.error('useDIDNarration failed', e);
      setError(e instanceof Error ? e.message : 'Unknown error');
      setStatus('error');
    } finally {
      if (inflightKey.current === key) inflightKey.current = null;
    }
  }, []);

  const generate = useCallback((s: string) => run(s, false), [run]);
  const regenerate = useCallback((s: string) => run(s, true), [run]);
  const reset = useCallback(() => {
    runIdRef.current++; // cancel any active loop
    setVideoUrl(null);
    setStatus('idle');
    setError(null);
  }, []);

  return { videoUrl, status, error, generate, regenerate, reset };
}
