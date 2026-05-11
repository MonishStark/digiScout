<?php
/**
 * Header template.
 *
 * @package DigitalScoutBaseTheme
 */

if (!defined('ABSPATH')) {
	exit;
}
?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo('charset'); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<header class="site-header">
	<div>
		<p class="site-title"><?php bloginfo('name'); ?></p>
		<p class="site-tagline"><?php bloginfo('description'); ?></p>
	</div>
</header>
<main class="site-main">
