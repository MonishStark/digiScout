<?php
/**
 * Plugin Name: Digital Scout Multisite MVP Provisioner
 * Description: Provision WordPress Multisite subsites for Digital Scout generated websites.
 * Version: 0.1.0
 * Author: OpenAI Codex
 */

if (!defined('ABSPATH')) {
	exit;
}

function dsmvp_permission_check(WP_REST_Request $request) {
	if (!is_multisite()) {
		return new WP_Error('dsmvp_not_multisite', 'WordPress Multisite is required.', ['status' => 400]);
	}

	if (!current_user_can('manage_network')) {
		return new WP_Error('dsmvp_forbidden', 'Network administrator access is required.', ['status' => 403]);
	}

	return true;
}

function dsmvp_log(string $step, string $level, string $message): array {
	return [
		'timestamp' => gmdate('c'),
		'step' => $step,
		'level' => $level,
		'message' => $message,
	];
}

function dsmvp_import_media(array $media_manifest): array {
	$imported = [];

	if (empty($media_manifest)) {
		return $imported;
	}

	require_once ABSPATH . 'wp-admin/includes/file.php';
	require_once ABSPATH . 'wp-admin/includes/media.php';
	require_once ABSPATH . 'wp-admin/includes/image.php';

	foreach ($media_manifest as $item) {
		$source_url = isset($item['sourceUrl']) ? esc_url_raw((string) $item['sourceUrl']) : '';
		if (!$source_url) {
			continue;
		}

		$tmp = download_url($source_url, 20);
		if (is_wp_error($tmp)) {
			continue;
		}

		$filename = isset($item['preferredFilename']) && $item['preferredFilename']
			? sanitize_file_name((string) $item['preferredFilename']) . '.jpg'
			: wp_basename(parse_url($source_url, PHP_URL_PATH) ?: 'remote-image.jpg');

		$file_array = [
			'name' => $filename,
			'tmp_name' => $tmp,
		];

		$attachment_id = media_handle_sideload($file_array, 0, $item['alt'] ?? '');
		if (is_wp_error($attachment_id)) {
			@unlink($tmp);
			continue;
		}

		if (!empty($item['alt'])) {
			update_post_meta($attachment_id, '_wp_attachment_image_alt', sanitize_text_field((string) $item['alt']));
		}

		$imported[$source_url] = [
			'attachment_id' => $attachment_id,
			'url' => wp_get_attachment_url($attachment_id),
		];
	}

	return $imported;
}

function dsmvp_replace_media_urls(string $content, array $media_map): string {
	foreach ($media_map as $source_url => $media) {
		if (!empty($media['url'])) {
			$content = str_replace($source_url, $media['url'], $content);
		}
	}

	return $content;
}

function dsmvp_create_or_get_user(string $username, string $email): WP_User|WP_Error {
	$existing = get_user_by('email', $email);
	if ($existing instanceof WP_User) {
		return $existing;
	}

	$existing_by_login = get_user_by('login', $username);
	if ($existing_by_login instanceof WP_User) {
		return $existing_by_login;
	}

	$password = wp_generate_password(24, true, true);
	$user_id = wp_create_user($username, $password, $email);
	if (is_wp_error($user_id)) {
		return $user_id;
	}

	return get_user_by('id', $user_id);
}

function dsmvp_apply_theme_settings(array $theme_settings): void {
	update_option('digital_scout_theme_settings', $theme_settings);
}

function dsmvp_provision_site(WP_REST_Request $request) {
	$params = $request->get_json_params();
	$plan = isset($params['provisioningPlan']) && is_array($params['provisioningPlan'])
		? $params['provisioningPlan']
		: [];

	$site_slug = sanitize_title((string) ($plan['siteSlug'] ?? 'client-site'));
	$site_title = sanitize_text_field((string) ($plan['siteTitle'] ?? 'Client Site'));
	$owner_email = sanitize_email((string) ($plan['ownerEmail'] ?? ''));
	$owner_username = sanitize_user((string) ($plan['ownerUsername'] ?? 'client-admin'), true);
	$owner_display_name = sanitize_text_field((string) ($plan['ownerDisplayName'] ?? $owner_username));
	$base_theme = sanitize_text_field((string) ($plan['baseTheme'] ?? 'digital-scout-base-theme'));
	$pages = isset($plan['pages']) && is_array($plan['pages']) ? $plan['pages'] : [];
	$media_manifest = isset($plan['media']) && is_array($plan['media']) ? $plan['media'] : [];
	$theme_settings = isset($plan['themeSettings']) && is_array($plan['themeSettings']) ? $plan['themeSettings'] : [];
	$logs = [];

	if (!$site_slug || !$site_title || !$owner_email) {
		return new WP_Error('dsmvp_invalid_payload', 'siteSlug, siteTitle, and ownerEmail are required.', ['status' => 400]);
	}

	$network = get_network();
	$domain = $network->domain;
	$path = $network->path;

	if (is_subdomain_install()) {
		$site_domain = $site_slug . '.' . preg_replace('#^www\.#', '', $domain);
		$site_path = '/';
	} else {
		$site_domain = $domain;
		$site_path = trailingslashit($path . $site_slug);
	}

	$blog_id = domain_exists($site_domain, $site_path, $network->id);
	if (!$blog_id) {
		$blog_id = wpmu_create_blog($site_domain, $site_path, $site_title, get_current_user_id(), [], $network->id);
	}

	if (is_wp_error($blog_id)) {
		return $blog_id;
	}

	$logs[] = dsmvp_log('subsite_creation', 'info', 'Created or re-used subsite ' . $blog_id . '.');

	$user = dsmvp_create_or_get_user($owner_username, $owner_email);
	if (is_wp_error($user)) {
		return $user;
	}

	wp_update_user([
		'ID' => $user->ID,
		'display_name' => $owner_display_name,
	]);
	add_user_to_blog((int) $blog_id, (int) $user->ID, 'administrator');
	$logs[] = dsmvp_log('admin_creation', 'info', 'Assigned administrator ' . $user->user_login . '.');

	switch_to_blog((int) $blog_id);

	$theme = wp_get_theme($base_theme);
	if ($theme->exists()) {
		switch_theme($base_theme);
		$logs[] = dsmvp_log('theme_activation', 'info', 'Activated theme ' . $base_theme . '.');
	} else {
		$logs[] = dsmvp_log('theme_activation', 'error', 'Theme ' . $base_theme . ' is not installed.');
	}

	update_option('blogname', $site_title);
	update_option('blogdescription', 'Generated and provisioned by Digital Scout');
	dsmvp_apply_theme_settings($theme_settings);

	$media_map = dsmvp_import_media($media_manifest);
	$logs[] = dsmvp_log('media_import', 'info', 'Imported ' . count($media_map) . ' media assets.');

	$front_page_id = 0;
	foreach ($pages as $page) {
		$content = dsmvp_replace_media_urls((string) ($page['content'] ?? ''), $media_map);
		$post_id = wp_insert_post([
			'post_type' => 'page',
			'post_status' => 'publish',
			'post_title' => sanitize_text_field((string) ($page['title'] ?? 'Page')),
			'post_name' => sanitize_title((string) ($page['slug'] ?? 'page')),
			'post_content' => wp_kses_post($content),
		], true);

		if (is_wp_error($post_id)) {
			restore_current_blog();
			return $post_id;
		}

		if (!empty($page['isHomepage'])) {
			$front_page_id = (int) $post_id;
		}
	}

	$logs[] = dsmvp_log('page_creation', 'info', 'Created ' . count($pages) . ' pages.');

	if ($front_page_id) {
		update_option('show_on_front', 'page');
		update_option('page_on_front', $front_page_id);
		$logs[] = dsmvp_log('homepage_assignment', 'info', 'Set page ' . $front_page_id . ' as homepage.');
	}

	$reset_key = get_password_reset_key($user);
	$password_setup_url = '';
	if (!is_wp_error($reset_key)) {
		$password_setup_url = network_site_url(
			'wp-login.php?action=rp&key=' . rawurlencode($reset_key) . '&login=' . rawurlencode($user->user_login),
			'login'
		);
	}
	$logs[] = dsmvp_log('credentials_setup', 'info', 'Generated password setup link.');

	$site_url = get_home_url((int) $blog_id, '/');
	$admin_url = get_admin_url((int) $blog_id);

	restore_current_blog();

	return rest_ensure_response([
		'success' => true,
		'dryRun' => false,
		'provisioningStatus' => 'ready',
		'subsiteCreationStatus' => 'completed',
		'adminCreationStatus' => 'completed',
		'themeInstallStatus' => $theme->exists() ? 'completed' : 'failed',
		'mediaImportStatus' => 'completed',
		'contentImportStatus' => 'completed',
		'homepageSetupStatus' => $front_page_id ? 'completed' : 'failed',
		'credentialsStatus' => $password_setup_url ? 'completed' : 'failed',
		'logs' => $logs,
		'site' => [
			'siteId' => (int) $blog_id,
			'siteSlug' => $site_slug,
			'siteUrl' => $site_url,
			'adminUrl' => $admin_url,
			'ownerUsername' => $user->user_login,
			'ownerEmail' => $user->user_email,
			'passwordSetupUrl' => $password_setup_url,
		],
	]);
}

function dsmvp_delete_site(WP_REST_Request $request) {
	$site_id = (int) $request['site_id'];
	if (!$site_id) {
		return new WP_Error('dsmvp_missing_site_id', 'Site ID is required.', ['status' => 400]);
	}

	if (!function_exists('wpmu_delete_blog')) {
		require_once ABSPATH . 'wp-admin/includes/ms.php';
	}

	wpmu_delete_blog($site_id, true);

	return rest_ensure_response([
		'success' => true,
		'siteId' => $site_id,
	]);
}

add_action('rest_api_init', function () {
	register_rest_route('digital-scout/v1', '/provision-site', [
		'methods' => WP_REST_Server::CREATABLE,
		'callback' => 'dsmvp_provision_site',
		'permission_callback' => 'dsmvp_permission_check',
	]);

	register_rest_route('digital-scout/v1', '/site/(?P<site_id>\d+)', [
		'methods' => WP_REST_Server::DELETABLE,
		'callback' => 'dsmvp_delete_site',
		'permission_callback' => 'dsmvp_permission_check',
	]);
});
