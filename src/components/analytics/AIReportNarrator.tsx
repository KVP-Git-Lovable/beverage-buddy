import { useEffect, useRef } from 'react';
import { Loader2, RefreshCw, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDIDNarration } from '@/hooks/useDIDNarration';

interface AIReportNarratorProps {
  /** Plain-text summary to narrate. When this changes, narration is (re)generated. */
  summaryText: string | null | undefined;
}

/**
 * AI Report Narrator — renders a D-ID talking-avatar video for a generated summary.
 * Mounted above the textual Report Summary on /analytics.
 */
export const AIReportNarrator = ({ summaryText }: AIReportNarratorProps) => {
  const { videoUrl, status, error, generate, regenerate } = useDIDNarration();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastTriggeredRef = useRef<string | null>(null);

  // Auto-generate whenever the summary text changes (and is non-empty).
  useEffect(() => {
    const text = (summaryText || '').trim();
    if (!text) return;
    if (lastTriggeredRef.current === text) return;
    lastTriggeredRef.current = text;
    void generate(text);
  }, [summaryText, generate]);

  // Auto-play when a fresh video URL is ready.
  useEffect(() => {
    if (status === 'ready' && videoRef.current) {
      videoRef.current.play().catch(() => {
        // Browsers may block autoplay with sound; controls are visible for manual play.
      });
    }
  }, [status, videoUrl]);

  const handleRegenerate = () => {
    const text = (summaryText || '').trim();
    if (!text) return;
    void regenerate(text);
  };

  if (!summaryText) return null;

  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Video className="h-4 w-4 text-primary" />
          🎥 AI Report Narrator
        </span>
        {status === 'ready' && (
          <Button variant="outline" size="sm" onClick={handleRegenerate}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Regenerate Narration
          </Button>
        )}
      </div>

      <div className="relative w-full overflow-hidden rounded-md bg-black/90 aspect-video flex items-center justify-center">
        {status === 'loading' && (
          <div className="flex flex-col items-center gap-2 text-white/90 px-4 text-center">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-xs">Generating narration… this can take 1–2 minutes.</span>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-2 text-white/90 px-4 text-center">
            <span className="text-xs">
              Unable to generate AI narration at this time. Please try again.
            </span>
            {error && <span className="text-[10px] opacity-60">{error}</span>}
            <Button variant="secondary" size="sm" onClick={handleRegenerate}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Retry
            </Button>
          </div>
        )}

        {status === 'ready' && videoUrl && (
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            autoPlay
            playsInline
            className="h-full w-full object-contain bg-black"
          />
        )}

        {status === 'idle' && (
          <span className="text-xs text-white/70">Preparing narration…</span>
        )}
      </div>

      {status === 'loading' && (
        <p className="text-[11px] text-muted-foreground">
          Status: Generating narration… this can take 1–2 minutes.
        </p>
      )}
    </div>
  );
};

export default AIReportNarrator;
