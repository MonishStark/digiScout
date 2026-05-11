# WordPress Multisite MVP Setup

1. Create or start a WordPress Multisite network.
2. Install the theme in `wordpress/digital-scout-base-theme` into `wp-content/themes/`.
3. Install the plugin in `wordpress/multisite-mvp-provisioner` into `wp-content/plugins/` and activate it network-wide.
4. Create an application password for a network administrator account.
5. Add these values to `.env.local`:

```env
WORDPRESS_MULTISITE_BASE_URL=http://your-network-host
WORDPRESS_MULTISITE_NETWORK_USERNAME=network-admin
WORDPRESS_MULTISITE_NETWORK_APP_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx
WORDPRESS_MULTISITE_BASE_THEME=digital-scout-base-theme
```

6. Restart the Express server with `npm run dev:server`.
7. Generate a lead from the app. The backend will call the Multisite plugin endpoint:

```text
POST /wp-json/digital-scout/v1/provision-site
```

If the WordPress Multisite environment variables are missing, the app falls back to a provisioning dry-run so the UI still works.
