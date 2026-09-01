<?php
/**
 * Test bootstrap.
 *
 * M1 covers pure resolution logic that touches WordPress in exactly three
 * places: `get_option()`, `wp_get_global_settings()` and `apply_filters()`.
 * Stubbing those runs the suite in milliseconds with no WordPress install, so
 * CI needs no Docker. Integration tests against a real site arrive with the
 * render_block work in M2, where stubbing would stop being honest.
 *
 * @package Spacery
 */

declare( strict_types=1 );

define( 'ABSPATH', __DIR__ . '/' );

/**
 * Resets all stub state. Call from setUp().
 */
function spacery_test_reset(): void {
	$GLOBALS['spacery_test_options']  = array();
	$GLOBALS['spacery_test_settings'] = array();
	$GLOBALS['spacery_test_filters']  = array();
}

spacery_test_reset();

/**
 * Stub of get_option().
 *
 * @param string $option  Option name.
 * @param mixed  $default_value Returned when unset.
 * @return mixed
 */
function get_option( string $option, $default_value = false ) {
	return $GLOBALS['spacery_test_options'][ $option ] ?? $default_value;
}

/**
 * Stub of wp_get_global_settings().
 *
 * Faithfully reproduces core's surprising contract: with a path that does not
 * exist it returns the WHOLE settings array, because core ends with
 * `_wp_array_get( $settings, $path, $settings )`. Spacery must not depend on
 * that, so the stub reproduces it rather than papering over it.
 *
 * @param array<string> $path    Settings path.
 * @param array<mixed>  $context Unused.
 * @return mixed
 */
function wp_get_global_settings( array $path = array(), array $context = array() ) {
	$settings = $GLOBALS['spacery_test_settings'];

	if ( array() === $path ) {
		return $settings;
	}

	$node = $settings;

	foreach ( $path as $segment ) {
		if ( ! is_array( $node ) || ! array_key_exists( $segment, $node ) ) {
			return $settings; // Core's fallback. Deliberate.
		}

		$node = $node[ $segment ];
	}

	return $node;
}

/**
 * Stub of add_filter().
 *
 * @param string   $hook     Hook name.
 * @param callable $callback Callback.
 */
function add_filter( string $hook, callable $callback ): void {
	$GLOBALS['spacery_test_filters'][ $hook ][] = $callback;
}

/**
 * Stub of add_action(). Actions and filters share one registry here.
 *
 * @param string   $hook     Hook name.
 * @param callable $callback Callback.
 */
function add_action( string $hook, callable $callback ): void {
	$GLOBALS['spacery_test_filters'][ $hook ][] = $callback;
}

/**
 * Stub of do_action().
 *
 * @param string $hook Hook name.
 * @param mixed  ...$args Arguments.
 */
function do_action( string $hook, ...$args ): void {
	foreach ( $GLOBALS['spacery_test_filters'][ $hook ] ?? array() as $callback ) {
		$callback( ...$args );
	}
}

/**
 * Stub of apply_filters().
 *
 * @param string $hook  Hook name.
 * @param mixed  $value Value to filter.
 * @param mixed  ...$args Extra arguments.
 * @return mixed
 */
function apply_filters( string $hook, $value, ...$args ) {
	foreach ( $GLOBALS['spacery_test_filters'][ $hook ] ?? array() as $callback ) {
		$value = $callback( $value, ...$args );
	}

	return $value;
}

/**
 * Stub of __(). Returns the source string, as an untranslated site does.
 *
 * @param string $text   Source string.
 * @param string $domain Text domain.
 */
function __( string $text, string $domain = 'default' ): string {
	return $text;
}

require_once __DIR__ . '/../../includes/Autoloader.php';

Spacery\Autoloader::register();
