<?php
/**
 * Production WordPress Multisite Configuration
 * This file is loaded by the main wp-config.php to configure multisite
 */

// Enable WordPress Multisite
define( 'WP_ALLOW_MULTISITE', true );
define( 'MULTISITE', true );
define( 'SUBDOMAIN_INSTALL', false ); // Using subdirectories, not subdomains

// Network base path
define( 'DOMAIN_CURRENT_SITE', $_SERVER['HTTP_HOST'] );
define( 'PATH_CURRENT_SITE', '/' );
define( 'SITE_ID_CURRENT_SITE', 1 );
define( 'BLOG_ID_CURRENT_SITE', 1 );

// WordPress security
define( 'AUTOMATIC_UPDATER_DISABLED', true ); // Disable auto-updates in Docker
define( 'DISALLOW_FILE_EDIT', true ); // Disable theme/plugin editor
define( 'DISALLOW_FILE_MODS', true ); // Disable theme/plugin modifications

// Database optimization
define( 'WP_MEMORY_LIMIT', '256M' );
define( 'WP_MAX_MEMORY_LIMIT', '512M' );

// Performance
define( 'EMPTY_TRASH_DAYS', 30 );
define( 'WP_POST_REVISIONS', 3 );
define( 'AUTOSAVE_INTERVAL', 300 );

// Debugging (disabled in production, set to true to debug)
define( 'WP_DEBUG', false );
define( 'WP_DEBUG_LOG', false );
define( 'WP_DEBUG_DISPLAY', false );

// Proxy headers for reverse proxy
define( 'WP_PROXY_USE_CURL', true );

// Trust proxy headers for SSL detection
if ( isset( $_SERVER['HTTP_X_FORWARDED_PROTO'] ) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https' ) {
    $_SERVER['HTTPS'] = 'on';
    $_SERVER['SERVER_PORT'] = 443;
}
