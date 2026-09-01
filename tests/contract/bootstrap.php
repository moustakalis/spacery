<?php
/**
 * Contract-test bootstrap.
 *
 * The unit suite runs against stubs, which is fast but circular: the stubs
 * encode what Spacery *believes* about WordPress, so a wrong belief passes.
 * This suite closes that gap for the two beliefs Spacery actually bets on —
 * the shape of core's viewport media queries, and which boundary lengths core
 * accepts — by loading core's real `WP_Theme_JSON` and comparing against it.
 *
 * No WordPress install is needed: `get_viewport_media_queries()` is a public
 * static whose call path touches nothing outside its own class.
 *
 * The core source is fetched by `composer run fetch-core` (CI does this
 * automatically) and is gitignored. Without it the suite skips rather than
 * fails, so a clean checkout is never red for want of a download.
 *
 * @package Spacery
 */

declare( strict_types=1 );

define( 'ABSPATH', __DIR__ . '/' );

define( 'SPACERY_CORE_SOURCE', __DIR__ . '/core/class-wp-theme-json.php' );

if ( is_readable( SPACERY_CORE_SOURCE ) ) {
	require_once SPACERY_CORE_SOURCE;
}

if ( ! function_exists( '__' ) ) {
	/**
	 * Stub of __(), for the Spacery side of the comparison.
	 *
	 * @param string $text   Source string.
	 * @param string $domain Text domain.
	 */
	function __( string $text, string $domain = 'default' ): string {
		return $text;
	}
}

require_once __DIR__ . '/../../includes/Autoloader.php';

Spacery\Autoloader::register();
