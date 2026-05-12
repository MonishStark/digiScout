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
if ( ! defined( 'WP_DEBUG' ) ) {
    define( 'WP_DEBUG', false );
}
if ( ! defined( 'WP_DEBUG_LOG' ) ) {
    define( 'WP_DEBUG_LOG', false );
}
if ( ! defined( 'WP_DEBUG_DISPLAY' ) ) {
    define( 'WP_DEBUG_DISPLAY', false );
}

// Proxy headers for reverse proxy
define( 'WP_PROXY_USE_CURL', true );

// Trust proxy headers for SSL detection
if ( isset( $_SERVER['HTTP_X_FORWARDED_PROTO'] ) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https' ) {
    $_SERVER['HTTPS'] = 'on';
    $_SERVER['SERVER_PORT'] = 443;
}

// Trust forwarded host (including port) to avoid redirects dropping :8443.
if ( isset( $_SERVER['HTTP_X_FORWARDED_HOST'] ) && ! empty( $_SERVER['HTTP_X_FORWARDED_HOST'] ) ) {
    $forwarded_host = explode( ',', $_SERVER['HTTP_X_FORWARDED_HOST'] )[0];
    $_SERVER['HTTP_HOST'] = trim( $forwarded_host );
}

// Force runtime URL from request host so admin/login works behind SSH tunnels.
// Fallback to environment variable or localhost for CLI operations.
$site_url = 'http://localhost';
if ( isset( $_SERVER['HTTP_HOST'] ) && ! empty( $_SERVER['HTTP_HOST'] ) ) {
    $scheme = ( isset( $_SERVER['HTTPS'] ) && $_SERVER['HTTPS'] === 'on' ) ? 'https' : 'http';
    $site_url = $scheme . '://' . $_SERVER['HTTP_HOST'];
} elseif ( ! empty( getenv( 'WORDPRESS_MULTISITE_NETWORK_URL' ) ) ) {
    $site_url = getenv( 'WORDPRESS_MULTISITE_NETWORK_URL' );
}
if ( ! defined( 'WP_HOME' ) ) {
    define( 'WP_HOME', $site_url );
}
if ( ! defined( 'WP_SITEURL' ) ) {
    define( 'WP_SITEURL', $site_url );
}
