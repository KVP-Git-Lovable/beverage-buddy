import { useCallback, useEffect, useRef, useState } from 'react';
import { getDIDStatus, startDIDTalk } from '@/services/didService';

export type NarrationStatus = 'idle' | 'loading' | 'ready' | 'error';

interface UseDIDNarrationResult {
  videoUrl: string | null;
  status: NarrationStatus;
  error: string | null;
  elapsedSec: number;
  generate: (summaryText: string) => Promise<void>;
  regenerate: (summaryText: string) => Promise<void>;
  cancel: () => void;
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
const POLL_MAX_ATTEMPTS = 100; // ~5 min

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function useDIDNarration(): UseDIDNarrationResult {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<NarrationStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
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
    const startedAt = Date.now();

    setStatus('loading');
    setError(null);
    setElapsedSec(0);
    if (force) setVideoUrl(null);

    try {
      const { jobId } = await startDIDTalk(script);

      for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
        await sleep(POLL_INTERVAL_MS);
        if (cancelledRef.current || runIdRef.current !== myRunId) return;
        setElapsedSec(Math.floor((Date.now() - startedAt) / 1000));

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
      throw new Error(
        'D-ID is still queuing this job (trial plans process one at a time). Please try again in a minute.',
      );
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
  const cancel = useCallback(() => {
    runIdRef.current++;
    inflightKey.current = null;
    setStatus('idle');
    setError(null);
    setElapsedSec(0);
  }, []);
  const reset = useCallback(() => {
    runIdRef.current++;
    inflightKey.current = null;
    setVideoUrl(null);
    setStatus('idle');
    setError(null);
    setElapsedSec(0);
  }, []);

  return { videoUrl, status, error, elapsedSec, generate, regenerate, cancel, reset };
}
