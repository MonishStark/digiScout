<?php
/**
 * Digital Scout Base Theme functions.
 *
 * @package DigitalScoutBaseTheme
 */

if (!defined('ABSPATH')) {
	exit;
}

function digital_scout_base_theme_setup(): void {
	add_theme_support('title-tag');
	add_theme_support('post-thumbnails');
	add_theme_support('wp-block-styles');
	add_theme_support('responsive-embeds');
	add_theme_support('align-wide');
	add_theme_support('editor-styles');
}
add_action('after_setup_theme', 'digital_scout_base_theme_setup');

function digital_scout_base_theme_styles(): void {
	wp_enqueue_style(
		'digital-scout-base-theme',
		get_stylesheet_uri(),
		[],
		wp_get_theme()->get('Version')
	);
}
add_action('wp_enqueue_scripts', 'digital_scout_base_theme_styles');

function digital_scout_base_theme_render_tokens(): void {
	$settings = get_option('digital_scout_theme_settings', []);
	if (!is_array($settings)) {
		$settings = [];
	}

	$palette = isset($settings['palette']) && is_array($settings['palette']) ? $settings['palette'] : [];
	$typography = isset($settings['typography']) && is_array($settings['typography']) ? $settings['typography'] : [];
	$radius = isset($settings['radius']) ? sanitize_text_field((string) $settings['radius']) : '28px';

	$css = sprintf(
		':root{--ds-background:%1$s;--ds-surface:%2$s;--ds-primary:%3$s;--ds-accent:%4$s;--ds-text:%5$s;--ds-muted:%6$s;--ds-outline:%7$s;--ds-radius:%8$s;--ds-heading-font:%9$s;--ds-body-font:%10$s;}',
		esc_html($palette['background'] ?? '#07070a'),
		esc_html($palette['surface'] ?? '#111114'),
		esc_html($palette['primary'] ?? '#7c3aed'),
		esc_html($palette['accent'] ?? '#10b981'),
		esc_html($palette['text'] ?? '#f4f4f5'),
		esc_html($palette['muted'] ?? '#a1a1aa'),
		esc_html($palette['outline'] ?? 'rgba(255,255,255,0.1)'),
		esc_html($radius),
		esc_html($typography['heading'] ?? 'Inter'),
		esc_html($typography['body'] ?? 'Inter')
	);

	echo '<style id="digital-scout-theme-tokens">' . $css . '</style>';
}
add_action('wp_head', 'digital_scout_base_theme_render_tokens');
