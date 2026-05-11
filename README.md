<!-- @format -->

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/1e2a4844-fb58-4584-b48a-a85495e863ca

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Workflow

The application follows a schema-first workflow:

1. **Generate Website Schema** – AI generates a website schema from business info
2. **Preview Generated Content** – Static HTML preview renders immediately in the dashboard
3. **Auto WordPress Sync** – Generated schema automatically syncs to WordPress as Gutenberg blocks
4. **Verify WordPress Creation** – Page is verified to exist in WordPress Admin → Pages
5. **Lead Ready** – Mark the lead as WordPress synced and ready for CMS editing

**Then optionally:**

6. **Deploy to Netlify** – User clicks "Deploy" to publish the website to Netlify (manual, optional action)

## Optional WordPress Sync

If you want the generated schema to be automatically pushed into WordPress, set one of the following pairs in [.env.local](.env.local):

`WORDPRESS_SITE_URL`, `WORDPRESS_USERNAME`, `WORDPRESS_APPLICATION_PASSWORD`

or

`WP_SITE_URL`, `WP_USERNAME`, `WP_APPLICATION_PASSWORD`

When generation completes, the app will attempt to sync the WordPress page. If credentials are missing, the endpoint returns a dry-run response and marks the sync as pending.

## Optional Netlify Deployment

If you want to deploy websites to Netlify, set the following in [.env.local](.env.local):

`VITE_NETLIFY_TOKEN` – Your Netlify API token

Netlify deployment is triggered manually by clicking the "Deploy" button on each project card in the Leads tab.
