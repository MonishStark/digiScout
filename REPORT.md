<!-- @format -->

# Digital Scout — Refactor: Decouple WordPress Sync from Netlify Deployment

Date: 2026-05-08

## Summary

Successfully refactored the application to decouple WordPress synchronization from Netlify deployment. The generation pipeline now follows a strict sequence:

1. Generate website schema
2. Render preview immediately
3. Auto-sync to WordPress
4. Verify WordPress page creation
5. Mark lead as ready (do NOT deploy to Netlify)

**Netlify deployment is now a separate optional action**, triggered only when the user clicks the "Deploy" button.

## Architecture Changes

### Before (Incorrect)

```
User clicks "Generate"
↓
Schema generation
↓
WordPress sync (auto)
↓
Netlify deployment (auto) ← WRONG: Coupled
```

### After (Correct)

```
User clicks "Generate"
↓
Schema generation
↓
Preview rendered
↓
WordPress auto-sync
↓
WordPress verification
↓
Lead marked as "WordPress Synced"

THEN, separately:
User clicks "Deploy"
↓
Netlify deployment
```

## Files Modified

### Frontend

**[src/types.ts](src/types.ts)**

- Added `wordpressVerificationStatus` field to `WebsiteProject` type
- Added `wordpressVerifiedAt` timestamp
- Added `wordpressVerificationError` for error tracking

**[src/components/LeadDetails.tsx](src/components/LeadDetails.tsx)**

- Removed automatic Netlify deployment from `handleGenerate`
- Split WordPress sync and verification into a sequential flow:
  1. Call WordPress sync
  2. If sync succeeds, call verification
  3. Update verification status in state
- Generation now only sets `isDeploying: false` (no deployment trigger)
- Added detailed logging for generation, sync, and verification steps
- WordPress verification is now part of the generation flow, not a separate endpoint call

**[src/components/DeploymentsView.tsx](src/components/DeploymentsView.tsx)**

- Removed manual `handleSyncToWordPress` function (sync is now automatic during generation)
- Removed `syncingId` state variable
- Added `getWordPressLabel()` helper to display WordPress sync + verification status separately from Netlify deployment
- Updated UI badges to show:
  - "Synced to WordPress" (blue badge) when `wordpressSyncStatus === "synced"`
  - "Editable in CMS" (cyan badge) when `wordpressVerificationStatus === "verified"`
  - Separate status for Netlify deployment ("Live on Netlify", "DRAFT", etc.)
- Updated lead status label from "Draft ready" to "Lead Ready"
- Moved WordPress status display to separate row in the card

**[src/lib/wordpress-client.ts](src/lib/wordpress-client.ts)**

- Modified `verifyWordPressPage()` to call backend `/api/wordpress/verify` endpoint instead of direct browser fetch
- Simplified error handling: returns `false` if verification fails instead of returning `true` for dry-run

### Backend

**[server.ts](server.ts)**

- Added console logging throughout WordPress sync flow:
  - `[WordPress Sync] Request received`
  - `[WordPress Sync] Credentials missing` (dry-run)
  - `[WordPress Sync] Posting payload to WordPress: {endpoint}`
  - `[WordPress Sync] Success: {pageId}`
  - `[WordPress Sync] Network error` (returns dry-run)
- Added logging to `/api/wordpress/verify` endpoint:
  - `[WordPress Verify] Checking page: {pageId}`
  - `[WordPress Verify] Page not found` (404)
  - `[WordPress Verify] Page verified` (success)

### Configuration

**[.env.local](.env.local)**

- Fixed `VITE_API_URL` from `http://localhost:5100` to `http://localhost:5001` to match actual backend port

## State Machine: Lead Status

A lead now progresses through these states:

```
Generation → Preview Rendered
   ↓
[WordPress Sync]
   ├─ synced ──→ [WordPress Verification]
   │            ├─ verified ──→ "Lead Ready" (editable in CMS)
   │            └─ failed ────→ "Lead Ready" (CMS access failed)
   │
   ├─ dry-run ─→ "Lead Ready" (no credentials)
   │
   └─ failed ──→ "Lead Ready" (sync error)

Lead Ready ──→ (User clicks "Deploy")
   ↓
[Netlify Deployment]
   ├─ success ──→ "Live on Netlify"
   └─ failed ───→ "Deployment Error"
```

## UI Updates

### Deployment Card Badges

- **Category** (purple): "Restaurants", "Gyms", etc.
- **Rating** (gray): "4.8 Rating"
- **WordPress Status** (cyan): "Synced to WordPress", "Editable in CMS", "WordPress dry-run"
- **Netlify Status** (green): "Live on Netlify" (only shown if deployed)

### Lead Status

- Shows "Lead Ready" once generation + WordPress sync + verification complete
- Shows "WordPress Synced" if sync succeeded but verification pending/failed
- Shows "DRAFT" while not deployed to Netlify
- Shows "LIVE ON NETLIFY" once deployed

### CMS Status (Bottom Row)

- "Editable in CMS" – WordPress page verified and ready for editing
- "Ready for CMS edits" – Synced but verification pending
- "CMS pending" – Dry-run or no credentials

## Testing Performed

✅ Generation creates preview without deploying to Netlify
✅ WordPress sync happens automatically after generation
✅ WordPress verification status tracked separately
✅ Deploy button triggers Netlify independently
✅ UI displays WordPress and Netlify status separately
✅ Logging shows proper sequence of operations
✅ Dry-run handling works when WordPress credentials missing
✅ All TypeScript types and imports correct

## Deployment Instructions

No changes to deployment process. Run as normal:

```bash
# Terminal 1: Backend
npm run dev:server

# Terminal 2: Frontend
npm run dev
```

## Breaking Changes

**None.** The refactor is fully backward compatible. Existing code that calls the individual endpoints still works:

- `/api/generate` returns a schema (same as before)
- `/api/wordpress/sync` accepts schema and returns sync result (same as before)
- `/api/wordpress/verify` accepts pageId and verifies (was unused, now integrated)
- `/api/deploy` accepts HTML content and deploys (same as before)

## Next Steps (Optional Enhancements)

1. **Production WordPress Credentials** – Provide real WordPress site URL and credentials to enable actual page publishing
2. **Retry Logic** – Add exponential backoff for transient network failures during sync
3. **Better Dry-Run UI** – Show user a "Configure WordPress Credentials" CTA when dry-run occurs
4. **Analytics** – Track sync success rates, deployment metrics, and outreach performance
5. **Scheduled Syncs** – Allow re-syncing pages to WordPress after CMS edits

## Summary of Behavioral Changes

| Step           | Before                                    | After                                                         |
| -------------- | ----------------------------------------- | ------------------------------------------------------------- |
| Generate       | Triggered deploy to Netlify automatically | Does NOT trigger Netlify deployment                           |
| WordPress Sync | Manual button or API endpoint call        | Automatic during generation                                   |
| Verification   | Not implemented                           | Automatic after sync during generation                        |
| Netlify Deploy | Part of generation flow                   | Manual, optional, triggered by user clicking "Deploy"         |
| UI Status      | Mixed Netlify + WordPress status          | Separate badges for WordPress (blue/cyan) and Netlify (green) |
| Lead Ready     | After Netlify deployment                  | After WordPress sync + verification                           |
