<?php
/**
 * Loads WordPress's real Style Engine for the unit suite.
 *
 * Spacery hands style objects to `wp_style_engine_get_styles()` and rules to
 * `wp_style_engine_get_stylesheet_from_css_rules()`. Those two functions decide
 * what CSS actually reaches the page — property naming, preset variable
 * resolution, at-rule nesting — so stubbing them would leave the most
 * consequential part of generation unverified.
 *
 * The Style Engine classes load standalone given a few core helpers, so the
 * suite uses the real implementation from the same fetched core source the
 * contract tests use. When that source is absent the tests that need it skip.
 *
 * @package Spacery
 */

declare( strict_types=1 );

define( 'SPACERY_STYLE_ENGINE_DIR', __DIR__ . '/../contract/core/style-engine' );

if ( ! is_dir( SPACERY_STYLE_ENGINE_DIR ) ) {
	return;
}

if ( ! function_exists( '_wp_array_get' ) ) {
	/**
	 * Core helper the Style Engine relies on.
	 *
	 * @param array<mixed> $array_input   Source array.
	 * @param array<mixed> $path          Path to read.
	 * @param mixed        $default_value Fallback.
	 * @return mixed
	 */
	function _wp_array_get( $array_input, $path, $default_value = null ) {
		foreach ( $path as $segment ) {
			if ( ! is_array( $array_input ) || ! array_key_exists( $segment, $array_input ) ) {
				return $default_value;
			}

			$array_input = $array_input[ $segment ];
		}

		return $array_input;
	}
}

if ( ! function_exists( '_wp_to_kebab_case' ) ) {
	/**
	 * Core helper the Style Engine relies on.
	 *
	 * @param string $input_string Camel-cased string.
	 */
	function _wp_to_kebab_case( string $input_string ): string {
		return strtolower(
			(string) preg_replace(
				array( '/([a-z0-9])([A-Z])/', '/([A-Z])([A-Z][a-z])/' ),
				'$1-$2',
				$input_string
			)
		);
	}
}

if ( ! function_exists( 'sanitize_key' ) ) {
	/**
	 * Core helper the Style Engine relies on.
	 *
	 * @param string $key Raw key.
	 */
	function sanitize_key( string $key ): string {
		return strtolower( (string) preg_replace( '/[^a-zA-Z0-9_\-]/', '', $key ) );
	}
}

if ( ! function_exists( 'wp_strip_all_tags' ) ) {
	/**
	 * Core helper the Style Engine relies on.
	 *
	 * @param string $text Raw text.
	 */
	function wp_strip_all_tags( string $text ): string {
		return trim( (string) preg_replace( '/<[^>]*>/', '', $text ) );
	}
}

if ( ! function_exists( 'safecss_filter_attr' ) ) {
	/**
	 * Core helper the Style Engine relies on. Filtering is core's job, not
	 * Spacery's, so the stub passes through.
	 *
	 * @param string $css Declarations.
	 */
	function safecss_filter_attr( string $css ): string {
		return $css;
	}
}

if ( ! function_exists( 'wp_parse_args' ) ) {
	/**
	 * Core helper the Style Engine relies on.
	 *
	 * @param array<mixed> $args     Provided args.
	 * @param array<mixed> $defaults Defaults.
	 * @return array<mixed>
	 */
	function wp_parse_args( $args, $defaults = array() ): array {
		return array_merge( $defaults, (array) $args );
	}
}

foreach (
	array(
		'class-wp-style-engine-css-declarations.php',
		'class-wp-style-engine-css-rule.php',
		'class-wp-style-engine-css-rules-store.php',
		'class-wp-style-engine-processor.php',
		'class-wp-style-engine.php',
	) as $spacery_style_engine_class
) {
	require_once SPACERY_STYLE_ENGINE_DIR . '/' . $spacery_style_engine_class;
}

require_once SPACERY_STYLE_ENGINE_DIR . '/style-engine.php';
