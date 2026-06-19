import { useCallback, useRef, useState } from 'react';
import { generateDIDVideo } from '@/services/didService';

export type NarrationStatus = 'idle' | 'loading' | 'ready' | 'error';

interface UseDIDNarrationResult {
  videoUrl: string | null;
  status: NarrationStatus;
  error: string | null;
  generate: (summaryText: string) => Promise<void>;
  regenerate: (summaryText: string) => Promise<void>;
  reset: () => void;
}

// Tiny synchronous hash to dedupe identical scripts within a session.
function hashScript(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) + h) ^ text.charCodeAt(i);
  }
  return String(h >>> 0);
}

// Module-level session cache (persists across mounts within the page session).
const sessionCache = new Map<string, string>();

export function useDIDNarration(): UseDIDNarrationResult {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<NarrationStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const inflightKey = useRef<string | null>(null);

  const run = useCallback(async (summaryText: string, force: boolean) => {
    const script = (summaryText || '').trim();
    if (!script) return;
    const key = hashScript(script);

    // Cache hit
    if (!force) {
      const cached = sessionCache.get(key);
      if (cached) {
        setVideoUrl(cached);
        setStatus('ready');
        setError(null);
        return;
      }
    }

    // Dedupe concurrent calls for same script
    if (inflightKey.current === key && !force) return;
    inflightKey.current = key;

    setStatus('loading');
    setError(null);
    if (force) setVideoUrl(null);

    try {
      const { videoUrl: url } = await generateDIDVideo(script);
      sessionCache.set(key, url);
      setVideoUrl(url);
      setStatus('ready');
    } catch (e) {
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
    setVideoUrl(null);
    setStatus('idle');
    setError(null);
  }, []);

  return { videoUrl, status, error, generate, regenerate, reset };
}
