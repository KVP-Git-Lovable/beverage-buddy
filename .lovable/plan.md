## Goal
When the user clicks "Summarize Report" on `/analytics`, generate the existing text summary, then generate a talking D-ID avatar video from that summary and play it above the summary.

## Scope
- Only `/analytics` (`src/pages/Analytics.tsx` and its summary component). No other analytics pages touched.
- No changes to existing summary logic — only an additive narrator section above it.

## Secrets (backend, not VITE_)
Request via `add_secret`:
- `DID_API_KEY` — D-ID Basic auth key
- `DID_PRESENTER_ID` — the configured D-ID presenter/avatar ID

The original spec used `VITE_DID_*`, but those would expose the key in the browser bundle. Per user confirmation, we use backend secrets + edge function instead.

## Backend — new edge function `did-narrate`
Path: `supabase/functions/did-narrate/index.ts`

Responsibilities:
1. Validate JWT (`getClaims`) — auth-only.
2. Accept `{ script: string }` (Zod-validated, length-capped ~3000 chars).
3. POST to `https://api.d-id.com/talks` with:
   - `script: { type: 'text', input: script, provider: { type: 'microsoft', voice_id: 'en-US-JennyNeural' } }`
   - `presenter_id: DID_PRESENTER_ID`
   - Auth header `Basic <DID_API_KEY>`
4. Poll `GET /talks/{id}` every 2s, up to ~60s, until `status === 'done'`.
5. Return `{ videoUrl }` on success; `{ error }` with 4xx/5xx on failure.
6. Standard CORS headers on all responses.

Registered automatically (no manual `config.toml` edit needed; `verify_jwt = false` default + in-code JWT check).

## Frontend
### New: `src/services/didService.ts`
- `generateDIDVideo(summaryText: string): Promise<{ videoUrl: string }>`
- Wraps `supabase.functions.invoke('did-narrate', { body: { script } })`.

### New: `src/hooks/useDIDNarration.ts`
- State: `{ videoUrl, status: 'idle'|'loading'|'ready'|'error', error }`.
- `generate(summaryText)` — dedupes by hashing the script; if same script already generated this session, returns cached URL.
- `regenerate(summaryText)` — bypasses cache.
- In-memory `Map<scriptHash, videoUrl>` for session cache.

### New: `src/components/analytics/AIReportNarrator.tsx`
- Props: `{ summaryText: string | null }`.
- When `summaryText` becomes non-empty, auto-calls `generate`.
- UI states:
  - Loading: spinner + "Generating AI narration…"
  - Ready: `<video src={videoUrl} autoPlay controls />` + "Regenerate Narration" button.
  - Error: message "Unable to generate AI narration at this time. Please try again." + Retry button.
- Title row: 🎥 AI Report Narrator.

### Edit: `src/pages/Analytics.tsx` (and/or the existing summary subcomponent that renders the "Report Summary")
- Locate the existing "Summarize Report" handler and the state holding the generated summary text.
- Render `<AIReportNarrator summaryText={summary} />` directly above the existing Report Summary block.
- No change to existing summary generation.

## Flow
1. User clicks existing "Summarize Report".
2. Existing logic produces summary text (unchanged).
3. `AIReportNarrator` receives `summaryText`, calls `useDIDNarration.generate`.
4. Edge function creates talk + polls D-ID; returns `videoUrl`.
5. Video renders above the summary and autoplays. Session cache prevents duplicate D-ID calls for the same text.

## Error handling
- Edge function returns structured `{ error }`; hook maps to `status='error'`.
- Polling timeout (~60s) → error with retry.
- D-ID 401/402 → surfaced as generic retryable error in UI; details logged server-side.

## Out of scope
- No changes to other analytics pages, other Summarize buttons, or summary text content.
- No persistence of generated videos (session cache only, per spec).

## Files
- Add: `supabase/functions/did-narrate/index.ts`
- Add: `src/services/didService.ts`
- Add: `src/hooks/useDIDNarration.ts`
- Add: `src/components/analytics/AIReportNarrator.tsx`
- Edit: `src/pages/Analytics.tsx` (mount narrator above summary)
- Secrets: `DID_API_KEY`, `DID_PRESENTER_ID` requested via add_secret after approval.
