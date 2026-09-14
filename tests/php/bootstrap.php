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

/*
 * `Spacery\VERSION` without loading `spacery.php`, which would bootstrap the
 * whole plugin against stubs that exist for three functions. Read out of the
 * file rather than repeated here: a second copy of the version is a second
 * thing to bump, and this one would be the copy nobody remembers.
 */
preg_match(
	"/^const VERSION = '([^']+)';/m",
	// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- reading a file in this repository from a bootstrap that has no WordPress.
	(string) file_get_contents( dirname( __DIR__, 2 ) . '/spacery.php' ),
	$spacery_version
);

define( 'Spacery\VERSION', $spacery_version[1] ?? '0.0.0' );

/**
 * Resets all stub state. Call from setUp().
 */
function spacery_test_reset(): void {
	$GLOBALS['spacery_test_options']    = array();
	$GLOBALS['spacery_test_settings']   = array();
	$GLOBALS['spacery_test_filters']    = array();
	$GLOBALS['spacery_test_priorities'] = array();

	$GLOBALS['spacery_test_settings_errors'] = array();
	$GLOBALS['spacery_test_inline_scripts']  = array();
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
 * The priority is recorded rather than honoured: nothing here re-orders
 * callbacks, but a class that depends on running before something else should
 * be able to say so in a test. {@see \Spacery\Tests\I18nTest}.
 *
 * @param string   $hook     Hook name.
 * @param callable $callback Callback.
 * @param int      $priority Hook priority.
 */
function add_action( string $hook, callable $callback, int $priority = 10 ): void {
	$GLOBALS['spacery_test_filters'][ $hook ][]    = $callback;
	$GLOBALS['spacery_test_priorities'][ $hook ][] = $priority;
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

/**
 * Stub of add_settings_error().
 *
 * Recorded rather than discarded: "the save was refused" is a claim worth
 * asserting, and a silent refusal would look identical to a successful one.
 *
 * @param string $setting Option name.
 * @param string $code    Error code.
 * @param string $message Message shown to the user.
 * @param string $type    Severity.
 */
function add_settings_error( string $setting, string $code, string $message, string $type = 'error' ): void {
	$GLOBALS['spacery_test_settings_errors'][] = compact( 'setting', 'code', 'message', 'type' );
}

/**
 * Stub of wp_json_encode().
 *
 * @param mixed $data Data to encode.
 * @return string|false
 */
function wp_json_encode( $data ) {
	return json_encode( $data ); // phpcs:ignore WordPress.WP.AlternativeFunctions.json_encode_json_encode
}

/**
 * Stub of wp_add_inline_script().
 *
 * Recorded, because the payload's *content at the moment it is attached* is the
 * whole question: `Settings` used to encode it on an earlier hook than the one
 * that reads core's flag, so the JSON was right in a place JavaScript cannot
 * read and stale in the place it can. {@see \Spacery\Tests\SettingsTest}.
 *
 * @param string $handle   Script handle.
 * @param string $data     JavaScript to attach.
 * @param string $position 'before' or 'after'.
 */
function wp_add_inline_script( string $handle, string $data, string $position = 'after' ): bool {
	$GLOBALS['spacery_test_inline_scripts'][] = compact( 'handle', 'data', 'position' );

	return true;
}

/**
 * Stub of wp_script_is(). Spacery's editor handle is registered; nothing else.
 *
 * @param string $handle Script handle.
 * @param string $status Status being asked about.
 */
function wp_script_is( string $handle, string $status = 'enqueued' ): bool {
	return 'spacery-extension' === $handle;
}

/**
 * Minimal stand-in for core's block type registry.
 *
 * Empty on purpose: the blocks it would list contribute further handles, and
 * this suite is about *what* is attached rather than how many handles receive
 * it.
 */
class WP_Block_Type_Registry {

	public static function get_instance(): self {
		return new self();
	}

	/**
	 * @return array<string, object>
	 */
	public function get_all_registered(): array {
		return array();
	}
}

/*
 * The Style Engine is real, not stubbed. It is what turns a style object into
 * declarations and resolves preset variables, so faking it would leave the most
 * consequential step of generation untested. The classes load standalone given
 * a handful of core helpers; the same fetched source the contract suite uses
 * provides them when present.
 */
require_once __DIR__ . '/style-engine.php';

require_once __DIR__ . '/../../includes/Autoloader.php';

Spacery\Autoloader::register();
