<!-- @format -->

# Project Overview

## Application Description

This application is a lead management and website generation tool designed to help businesses discover, engage, and attract customers through AI-generated websites. It provides a complete workflow from lead discovery → website generation → WordPress publishing → optional Netlify deployment.

### Key Features

1. **Lead Discovery**:
   - Search for businesses by category, location, and rating using Google Maps API
   - Enrich business data with contact information and website insights
   - Visual map interface for geographic exploration

2. **Website Generation**:
   - AI-powered website schema generation using Gemini 3.1 Pro
   - Instant HTML/CSS/JS preview without leaving the dashboard
   - Custom Gutenberg block generation for WordPress CMS integration

3. **WordPress Integration**:
   - Automatic synchronization of generated websites to WordPress
   - Creates editable pages with pre-built content blocks
   - Verification that pages successfully publish to WordPress
   - Ready for CMS customization by business owners

4. **Optional Netlify Deployment**:
   - Manual, on-demand deployment of generated websites to Netlify
   - Provides live URLs for marketing/hosting
   - Separate from WordPress sync (not automatic)

5. **Lead Management Dashboard**:
   - Central hub for all generated leads with status tracking
   - Separate displays for WordPress (CMS) status and Netlify (hosted) status
   - Email outreach capability (when deployed)
   - Lead deletion and archive

6. **Real-Time Visibility**:
   - Displays generation status, WordPress sync/verification status, and deployment status independently
   - Color-coded badges for quick status assessment
   - Error messages and actionable feedback for failures

## Refactor: Decoupled WordPress from Netlify

### Problem Statement (Before Refactor)

The application incorrectly coupled WordPress synchronization with Netlify deployment. This meant:

- User clicks "Generate" → website is generated → WordPress syncs → Netlify deploys (all automatic, no control)
- To sync to WordPress, you were forced to also deploy to Netlify
- To avoid Netlify deployment, you couldn't use WordPress sync
- This violated the separation of concerns principle

### Solution (After Refactor)

The workflow is now properly decoupled into two independent pipelines:

**Pipeline 1: WordPress Sync (Automatic)**

```
Generate → Preview → Auto WordPress Sync → Verify → Lead Ready (CMS)
```

**Pipeline 2: Netlify Deploy (Optional)**

```
Lead Ready → User clicks "Deploy" → Deploy to Netlify → Live on Netlify
```

### Architecture Changes

**Frontend Components Updated**:

- `src/components/LeadDetails.tsx` – Removed Netlify deploy from generation flow; generation now only syncs to WordPress
- `src/components/DeploymentsView.tsx` – Separated WordPress and Netlify status displays; Deploy button is now independent action

**Backend Endpoints Updated**:

- `/api/generate` – Returns schema and preview (no deployment trigger)
- `/api/wordpress/sync` – Called automatically from frontend after generation (was manual before)
- `/api/wordpress/verify` – Verifies page creation; called during generation flow (new)
- `/api/deploy` – Called manually by user clicking "Deploy" button (was automatic before)

**Type System**:

- Added `wordpressVerificationStatus` to track: pending → verified/failed
- Added `wordpressVerifiedAt` timestamp for audit trail
- Kept `wordpressSyncStatus` for sync tracking: syncing → synced/dry-run/failed
- Kept `isDeployed`, `netlifyUrl` for separate Netlify tracking

### UI Changes

**Status Badges** (now separate):

- **WordPress Status** (cyan/blue badge): "Synced to WordPress", "Editable in CMS", "WordPress dry-run"
- **Netlify Status** (green badge): Only appears if deployed ("Live on Netlify")

**Lead Status Flow**:

- "Generating..." → "Lead Ready" (after generation + WordPress sync + verification)
- "Lead Ready" (stays until user clicks Deploy)
- "Live on Netlify" (after user deploys; shows "Lead Ready" + Netlify status together)

## Workflow Diagram

```
DISCOVER LEADS (Google Maps API)
        ↓
SEARCH & SELECT BUSINESS
        ↓
CLICK "GENERATE WEBSITE"
        ↓
┌─────────────────────────────────┐
│   GENERATION PIPELINE            │
├─────────────────────────────────┤
│ 1. AI generates schema (Gemini)  │
│ 2. Preview rendered immediately │
│ 3. WordPress sync (auto)         │
│ 4. WordPress verification (auto) │
│ 5. Lead marked "WordPress Ready" │
└─────────────────────────────────┘
        ↓
   LEAD READY
        ↓
(Optional) CLICK "DEPLOY"
        ↓
┌─────────────────────────────────┐
│   DEPLOYMENT PIPELINE            │
├─────────────────────────────────┤
│ 1. Upload HTML to Netlify        │
│ 2. Create Netlify site           │
│ 3. Provide live URL              │
│ 4. Lead marked "Live on Netlify" │
└─────────────────────────────────┘
        ↓
   LIVE & READY FOR OUTREACH
```

## Testing & Validation

### ✅ Validated Workflows

1. **Generation Without Deployment** ✅
   - Generate website → WordPress syncs → NO Netlify deployment happens
   - Lead marked "Lead Ready" (not "DRAFT" during generation)
   - Deploy button remains available as independent action

2. **Separate Deploy Action** ✅
   - Clicking "Deploy" triggers Netlify independently
   - Works even if WordPress sync failed or returned dry-run
   - Does NOT resync WordPress when deploying

3. **WordPress Dry-Run Handling** ✅
   - When WordPress credentials missing → sync returns dry-run
   - Dry-run does NOT cause generation to fail
   - UI shows "WordPress dry-run" status
   - Lead still marked as "Ready" for optional deployment

4. **Independent Status Tracking** ✅
   - WordPress status displayed separately from Netlify status
   - Can have: WordPress Synced + Netlify Live (both statuses visible)
   - Can have: WordPress Ready + Netlify Draft (different statuses)

### Environment Configuration

**Required**:

- `VITE_API_URL=http://localhost:5001` – Backend API endpoint
- `GEMINI_API_KEY=your_key` – Website schema generation
- `GOOGLE_MAPS_PLATFORM_KEY=your_key` – Business discovery

**Optional**:

- `WORDPRESS_SITE_URL`, `WORDPRESS_USERNAME`, `WORDPRESS_APPLICATION_PASSWORD` – Real WordPress sync
- `VITE_NETLIFY_TOKEN=nfp_...` – Netlify deployment

When optional credentials are missing, the system gracefully degrades to dry-run mode and continues operating.

## Implementation Details

### State Transitions

```
WebsiteProject {
  wordpressSyncStatus: "syncing" → "synced" | "dry-run" | "failed"
  wordpressVerificationStatus: "pending" → "verifying" → "verified" | "failed"
  isDeployed: false → true
  netlifyUrl?: string (populated after deploy)
  wordpressPageId?: string (populated after sync)
  wordpressPageUrl?: string (populated after sync)
}
```

### Logging

Each step of the workflow logs to browser console and backend logs:

- `[Generate] Starting website schema generation...`
- `[WordPress Sync] Request received`
- `[WordPress Sync] Posting payload to WordPress: {endpoint}`
- `[WordPress Verify] Checking page: {pageId}`
- `[WordPress Verify] Page verified` / `Page not found`

This makes debugging transparent and visible during development.

## Remaining Enhancements (Future)

1. **Production WordPress Integration**:
   - Connect to live WordPress site with proper credentials
   - Test full page publishing workflow
   - Implement WordPress page editing/updating

2. **Retry Logic**:
   - Exponential backoff for transient network failures
   - Max retry attempts for WordPress sync and Netlify deploy

3. **User Configuration**:
   - UI form to configure WordPress credentials per-lead or per-organization
   - Test credentials before saving

4. **Analytics & Monitoring**:
   - Track sync success rates
   - Monitor deployment times
   - Measure outreach engagement metrics

5. **Advanced Features**:
   - Re-sync/update pages in WordPress after CMS edits
   - A/B testing different website variations
   - Multi-language website generation
   - Scheduled email campaigns

## How to Run

```bash
# Terminal 1: Backend
npm run dev:server

# Terminal 2: Frontend
npm run dev
```

Then open `http://localhost:3000` and start discovering leads!
