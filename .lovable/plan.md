## Root cause
- The current `did-narrate` edge function blocks until D-ID finishes (up to ~90s of internal polling). Edge function invocations end well before that, returning `504 D-ID generation timed out`.
- Secondary bug: `Authorization` header is being base64-encoded (`btoa(apiKey)`). Per D-ID docs the header must be `Basic API_USER:API_PASSWORD` — the **raw** string, not base64.

## Fix: async job pattern

### Edge function — split into start + status (single function, action-based)
File: `supabase/functions/did-narrate/index.ts` (rewrite)

Request shapes (JSON body):
- `{ action: "start", script: string }` → calls `POST https://api.d-id.com/talks`, returns `{ jobId }` immediately with status 202. No polling inside the function.
- `{ action: "status", jobId: string }` → calls `GET /talks/{jobId}`, returns one of:
  - `{ status: "pending" }` (D-ID statuses `created` / `started` / `processing`)
  - `{ status: "ready", videoUrl }` (D-ID `done`)
  - `{ status: "error", error }` (D-ID `error` / `rejected`)

Other rules:
- Keep JWT validation (`getClaims`) and CORS headers on every response.
- Build Auth header as `Basic ${DID_API_KEY}` with **no** `btoa()`.
- Validate inputs with Zod-style guards; cap script at 3000 chars.
- Log D-ID error bodies server-side; never leak the API key.

### Client service
File: `src/services/didService.ts`
- Replace `generateDIDVideo` with two functions:
  - `startDIDTalk(script: string): Promise<{ jobId: string }>`
  - `getDIDStatus(jobId: string): Promise<{ status: 'pending' | 'ready' | 'error'; videoUrl?: string; error?: string }>`
- Both call `supabase.functions.invoke('did-narrate', { body: { action, ... } })`.

### Hook (polling loop on the client)
File: `src/hooks/useDIDNarration.ts`
- Keep public API (`videoUrl`, `status`, `error`, `generate`, `regenerate`, `reset`) so the component doesn't change.
- Internally:
  1. `startDIDTalk(script)` → get `jobId`.
  2. Poll `getDIDStatus(jobId)` every 3s up to ~3 min (configurable; 60 attempts).
  3. On `ready` → set `videoUrl`, status `ready`, cache by script hash.
  4. On `error` or timeout → status `error` with a friendly message.
- Cancel any in-flight poll loop when:
  - `regenerate` is called (start a new job).
  - Hook unmounts (`useEffect` cleanup with a ref-based `cancelled` flag).
- Keep session cache (`Map<scriptHash, videoUrl>`) so re-opening the dialog with the same summary skips D-ID.

### Component
File: `src/components/analytics/AIReportNarrator.tsx`
- No structural change. Update the status text under the video to reflect long-running progress: while `status === 'loading'`, show "Generating narration… this can take 1–2 minutes." Everything else (autoplay, Regenerate, Retry) stays the same.

## What does NOT change
- `ReportSummaryDialog.tsx` wiring (already passes `generateSpokenSummary()`).
- Existing text summary, voice chat, PDF download, and all other analytics behavior.
- Secrets (`DID_API_KEY`, `DID_PRESENTER_ID`) — already configured.

## Verification
1. Open `/analytics` → click **Summarize Report**.
2. Narrator shows "Generating narration…" while client polls.
3. After D-ID finishes (typically 30–90s), video autoplays above the Summary.
4. Edge function logs show two short invocations (start + several status checks), no 504.

## Files
- Rewrite: `supabase/functions/did-narrate/index.ts`
- Edit: `src/services/didService.ts`
- Edit: `src/hooks/useDIDNarration.ts`
- Minor copy tweak: `src/components/analytics/AIReportNarrator.tsx`
