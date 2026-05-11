<!-- @format -->

# Developer Quick Reference Guide

## Key Architecture Changes

### The One Rule That Changed Everything

**Before**: `Generate → WordPress Sync → Deploy to Netlify` (all automatic, coupled)

**After**: `Generate → WordPress Sync` (automatic) | `Deploy to Netlify` (separate, manual)

---

## Where Each Step Happens

### Generation Flow (LeadDetails.tsx)

```typescript
const handleGenerate = async (business: Business) => {
	// Step 1: Generate website
	const schema = await generateWebsite(business);

	// Step 2: Render preview immediately
	const preview = renderWebsiteArtifact(schema);

	// Step 3: Auto-sync to WordPress
	const syncResult = await syncWebsiteToWordPress(schema);

	// Step 4: Verify WordPress page
	if (syncResult.ok && syncResult.id) {
		const verified = await verifyWordPressPage(syncResult.id);
	}

	// Step 5: Update project state
	setProjects((prev) => [
		{
			...project,
			wordpressSyncStatus: "synced",
			wordpressVerificationStatus: verified ? "verified" : "failed",
			isDeploying: false, // KEY: NOT deploying to Netlify
		},
	]);
};
```

### Deployment Flow (DeploymentsView.tsx)

```typescript
const handleDeploy = async (project: WebsiteProject) => {
	// Only called when user clicks "Deploy" button
	// Does NOT sync to WordPress (already done)
	// Does NOT generate schema again (already done)
	const result = await deploySiteToNetlify(project);

	// Update state with deployment result
	setProjects((prev) => [
		{
			...project,
			isDeployed: result.ok,
			netlifyUrl: result.url,
			deployError: result.error,
		},
	]);
};
```

**Key Difference**: `handleDeploy` is completely separate from generation. WordPress is not touched during deployment.

---

## Status Badges Explained

### What Users See

| Badge                 | Color  | Meaning                           | State                                        |
| --------------------- | ------ | --------------------------------- | -------------------------------------------- |
| "Synced to WordPress" | Blue   | WordPress sync succeeded          | `wordpressSyncStatus === "synced"`           |
| "Editable in CMS"     | Cyan   | WordPress page verified and ready | `wordpressVerificationStatus === "verified"` |
| "WordPress dry-run"   | Yellow | Sync attempted but no credentials | `wordpressSyncStatus === "dry-run"`          |
| "Live on Netlify"     | Green  | Deployed to Netlify               | `isDeployed === true`                        |
| "DRAFT"               | Gray   | Not deployed to Netlify           | `isDeployed === false`                       |

### Combined Status

Users will see:

- **Generation phase**: "Lead Ready" (WordPress synced)
- **Before deploy**: "Lead Ready" + "DRAFT" (ready for CMS, not yet on web)
- **After deploy**: "Lead Ready" + "LIVE ON NETLIFY" (on web and ready for CMS)

---

## State Tracking

### In Types (src/types.ts)

```typescript
// WordPress lifecycle
wordpressSyncStatus?: "syncing" | "synced" | "dry-run" | "failed"
wordpressPageId?: string  // Set after successful sync
wordpressPageUrl?: string
wordpressSyncedAt?: string
wordpressSyncError?: string

// WordPress verification (NEW)
wordpressVerificationStatus?: "pending" | "verifying" | "verified" | "failed"
wordpressVerifiedAt?: string
wordpressVerificationError?: string

// Netlify lifecycle (unchanged, separate)
isDeployed?: boolean
netlifyUrl?: string
deployedAt?: string
deployError?: string
```

### When Each Field Gets Set

**During Generation** (LeadDetails.tsx):

- `wordpressSyncStatus` → "syncing" → "synced"/"dry-run"/"failed"
- `wordpressPageId` → populated if sync successful
- `wordpressVerificationStatus` → "pending" → "verifying" → "verified"/"failed"
- `isDeploying` → false (NOT true, the key change)

**During Deployment** (DeploymentsView.tsx):

- `isDeployed` → true (if successful)
- `netlifyUrl` → URL string
- `deployError` → error message (if failed)
- WordPress fields → NOT TOUCHED (already set during generation)

---

## API Endpoints Reference

### /api/generate

- **Triggered by**: User clicking "Generate Website" button
- **Calls**: Gemini API (or fallback) for schema generation
- **Returns**: `{ schema, html, css, js }`
- **Followed by**: WordPress sync endpoint

### /api/wordpress/sync

- **Triggered by**: `LeadDetails.tsx` after successful generation
- **Calls**: WordPress REST API (if credentials present)
- **Returns**: `{ ok, id, url, dryRun }`
- **Followed by**: WordPress verify endpoint

### /api/wordpress/verify

- **Triggered by**: `LeadDetails.tsx` if sync returned an ID
- **Calls**: WordPress REST API to fetch page
- **Returns**: `{ ok, exists, error }`
- **Purpose**: Confirm page actually exists in WordPress

### /api/deploy

- **Triggered by**: User clicking "Deploy" button in DeploymentsView
- **Calls**: Netlify API to create site and upload HTML
- **Returns**: `{ ok, url, error }`
- **Important**: Does NOT call WordPress endpoints

---

## Logging for Debugging

### Console (Browser)

Search for these prefixes in DevTools Console:

```
[Generate] Starting website schema generation...
[WordPress Sync] Request received
[WordPress Verify] Checking page
```

### Terminal (Backend)

Run `npm run dev:server` and watch for:

```
[WordPress Sync] Request received
[WordPress Sync] Posting payload to WordPress: {url}
[WordPress Verify] Checking page: {pageId}
```

---

## Common Debugging Scenarios

### Scenario 1: "Generation succeeds but WordPress shows dry-run"

**Cause**: WordPress credentials missing or host unreachable  
**Expected Behavior**: This is normal in development  
**Fix**: Either:

- Leave it (dry-run is graceful degradation), OR
- Add real WordPress credentials to `.env.local`:
  ```
  WORDPRESS_SITE_URL=https://your-site.com
  WORDPRESS_USERNAME=admin
  WORDPRESS_APPLICATION_PASSWORD=your_app_password
  ```

### Scenario 2: "Deploy button shows error 'Forbidden'"

**Cause**: Netlify account has exceeded credit limit  
**Expected Behavior**: This is a Netlify API error, not app logic error  
**Fix**: Check Netlify account status  
**App Behavior**: Error is shown to user, generation still succeeded

### Scenario 3: "Generation doesn't appear to sync to WordPress"

**Debug Steps**:

1. Open browser DevTools (F12)
2. Search console for `[WordPress Sync]`
3. Check terminal for backend logs
4. Verify `.env.local` has correct `VITE_API_URL=http://localhost:5001`

### Scenario 4: "Deploy button tries to sync WordPress again"

**Should NOT happen** — if it does, check:

1. That `handleDeploy` in `DeploymentsView.tsx` does NOT call `syncWebsiteToWordPress`
2. That `handleDeploy` only calls `deploySiteToNetlify`
3. The file may have been reverted by accident

---

## Checklist for Changes

If you're modifying the workflow, verify:

**Generation Flow**:

- [ ] `handleGenerate` calls `syncWebsiteToWordPress` after schema generation
- [ ] `syncWebsiteToWordPress` call is awaited
- [ ] Verification is called after sync (only if sync succeeded)
- [ ] `isDeploying` is set to `false` (not `true`)
- [ ] Netlify deploy is NOT called in this function

**Deployment Flow**:

- [ ] `handleDeploy` only calls `deploySiteToNetlify`
- [ ] `handleDeploy` does NOT call `syncWebsiteToWordPress`
- [ ] `handleDeploy` does NOT call `generateWebsite`
- [ ] Deployment is triggered only by user clicking "Deploy" button

**State Updates**:

- [ ] WordPress fields updated only during generation
- [ ] Netlify fields updated only during deployment
- [ ] No field is updated by both flows

**UI Display**:

- [ ] WordPress badges show separately from Netlify badges
- [ ] Deploy button is always available (not grayed out during generation)
- [ ] Preview is rendered immediately (not waiting for deploy)

---

## File Locations Quick Reference

| What                   | File                                 |
| ---------------------- | ------------------------------------ |
| Generation logic       | `src/components/LeadDetails.tsx`     |
| Deployment UI & logic  | `src/components/DeploymentsView.tsx` |
| Type definitions       | `src/types.ts`                       |
| WordPress client calls | `src/lib/wordpress-client.ts`        |
| Backend endpoints      | `server.ts`                          |
| Configuration          | `.env.local`                         |
| Documentation          | `REFACTOR_SUMMARY.md`                |

---

## One-Minute Summary

The app now does two things separately:

1. **When user clicks "Generate"**:
   - Create website schema
   - Render preview
   - Sync to WordPress (automatic)
   - Verify WordPress page (automatic)
   - Mark lead as "Ready"

2. **When user clicks "Deploy"**:
   - Upload to Netlify
   - Generate live URL
   - Mark lead as "Live"

WordPress and Netlify are no longer forced together. That's the whole change.

---

## Questions?

Check these docs in order:

1. `REFACTOR_SUMMARY.md` — Full technical details
2. `PROJECT_OVERVIEW.md` — Architecture and workflow diagrams
3. `README.md` — Quick start and configuration
4. This file — Quick reference for developers
