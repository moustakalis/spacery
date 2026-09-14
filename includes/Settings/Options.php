<?php
/**
 * Registers Spacery's options with WordPress.
 *
 * @package Spacery
 */

declare( strict_types=1 );

namespace Spacery\Settings;

use Spacery\Breakpoints\BreakpointSet;
use Spacery\Breakpoints\Registry;

defined( 'ABSPATH' ) || exit;

/**
 * The options behind decisions D2 and D24, registered once for every consumer.
 *
 * `register_setting()` rather than bare `update_option()` calls, because it is
 * the one place that gives the settings screen, the REST API and any WP-CLI
 * user the *same* validation. The screen is a React app talking to
 * `/wp/v2/settings`; without registration that endpoint would not expose these
 * options at all, and each caller would have to re-derive what a valid
 * breakpoint set is.
 *
 * Validation is not re-derived here either. `BreakpointSet::from_array()` is
 * the authority — the same function the registry resolves through — so a set
 * the screen accepts is by construction a set the generator can use. Anything
 * else would let the settings screen store a set that silently fails to render.
 */
final class Options {

	/**
	 * Settings group. Only used by the classic Settings API; the screen itself
	 * talks to the REST endpoint.
	 */
	public const GROUP = 'spacery';

	/**
	 * Whether to delete Spacery's data when the plugin is deleted (D24).
	 *
	 * Not on `Registry`, which is about breakpoints: this option says nothing
	 * about what a breakpoint is and the registry never reads it.
	 *
	 * **`uninstall.php` repeats this name as a literal** and cannot do
	 * otherwise — it runs with no autoloader and no plugin code loaded, which
	 * is the whole point of the file. `OptionsTest` asserts the two agree, in
	 * the same spirit as `BreakpointPatternsTest` guards D19's shipped
	 * patterns: a seam that cannot be closed is one a test has to watch.
	 */
	public const OPTION_DELETE_DATA = 'spacery_delete_data';

	/**
	 * Attaches hooks.
	 *
	 * On `init` because that is when `register_setting()` must run to reach both
	 * admin-side consumers and the REST API, which fires `init` on every request.
	 */
	public function register(): void {
		add_action( 'init', array( $this, 'register_options' ) );
	}

	/**
	 * Registers every option, with REST schemas and sanitizers.
	 */
	public function register_options(): void {
		register_setting(
			self::GROUP,
			Registry::OPTION_SOURCE,
			array(
				'type'              => 'string',
				'label'             => __( 'Breakpoint source', 'spacery' ),
				'description'       => __( 'Which set of breakpoints Spacery uses.', 'spacery' ),
				'default'           => '',
				'sanitize_callback' => array( $this, 'sanitize_source' ),
				'show_in_rest'      => array(
					'schema' => array(
						'type' => 'string',
						/*
						 * The empty string is a real value: "the user has not
						 * chosen", which lets Registry::default_source() follow
						 * the theme. Omitting it would make "unset" unreachable
						 * once someone had picked anything.
						 */
						'enum' => array(
							'',
							Registry::SOURCE_THEME,
							Registry::SOURCE_SPACERY,
							Registry::SOURCE_CUSTOM,
						),
					),
				),
			)
		);

		register_setting(
			self::GROUP,
			Registry::OPTION_CUSTOM,
			array(
				'type'              => 'array',
				'label'             => __( 'Custom breakpoints', 'spacery' ),
				'description'       => __( 'Breakpoints defined on the Spacery settings screen.', 'spacery' ),
				'default'           => array(),
				'sanitize_callback' => array( $this, 'sanitize_breakpoints' ),
				'show_in_rest'      => array(
					'schema' => array(
						'type'  => 'array',
						'items' => array(
							'type'                 => 'object',
							'properties'           => array(
								'slug'  => array( 'type' => 'string' ),
								'label' => array( 'type' => 'string' ),
								'max'   => array( 'type' => 'string' ),
							),
							'required'             => array( 'slug', 'label', 'max' ),
							'additionalProperties' => false,
						),
					),
				),
			)
		);

		/*
		 * D24. Off by default, and deliberately the last thing registered: it
		 * is the only option here that is not about breakpoints at all.
		 */
		register_setting(
			self::GROUP,
			self::OPTION_DELETE_DATA,
			array(
				'type'              => 'boolean',
				'label'             => __( 'Delete data on uninstall', 'spacery' ),
				'description'       => __( "Whether to remove Spacery's stored settings when the plugin is deleted.", 'spacery' ),
				'default'           => false,
				'sanitize_callback' => array( $this, 'sanitize_delete_data' ),
				'show_in_rest'      => array(
					'schema' => array( 'type' => 'boolean' ),
				),
			)
		);
	}

	/**
	 * Whether the author asked for their data to be removed on deletion.
	 *
	 * False is the default, and false is what an ambiguous value becomes,
	 * because the destructive reading of an unclear option is the wrong one: a
	 * hand-edited or corrupted row should leave the settings alone rather than
	 * delete them.
	 *
	 * The string handling on the way *in* is core's, not this plugin's
	 * invention. `rest_sanitize_boolean()` lowercases and treats `'false'` and
	 * `'0'` as false, because a plain `(bool)` cast makes the *string*
	 * `'false'` true — which on this option means deleting the author's
	 * breakpoints on the strength of a value that says not to. Reimplemented
	 * rather than called so that a WP-CLI write, which never touches the REST
	 * layer, is read the same way a REST write is.
	 *
	 * **It returns `'1'` or `'0'` rather than a boolean, and that is
	 * deliberate.** WordPress writes boolean `false` into a varchar column, so
	 * it comes back out as `''` — measured on a live 7.1 install — and
	 * `rest_is_boolean( '' )` is false, so `WP_REST_Settings_Controller`
	 * nulls the value rather than returning it. The endpoint would then answer
	 * `null` where its own schema promises a boolean, for precisely the site
	 * that had opted *out*. Both `'1'` and `'0'` survive that round trip, and
	 * `'0'` is falsy in PHP, so `uninstall.php` reads it correctly with a bare
	 * truthiness check and never has to know any of this.
	 *
	 * @param mixed $value Submitted value.
	 */
	public function sanitize_delete_data( mixed $value ): string {
		if ( is_string( $value ) && in_array( strtolower( $value ), array( 'false', '0' ), true ) ) {
			return '0';
		}

		return $value ? '1' : '0';
	}

	/**
	 * Keeps the source within the three Spacery knows about.
	 *
	 * An unrecognized value becomes "unset" rather than an error, matching
	 * `Registry::source()`, which treats a hand-edited option the same way. The
	 * settings screen cannot produce one; a WP-CLI user can.
	 *
	 * @param mixed $value Submitted value.
	 */
	public function sanitize_source( mixed $value ): string {
		$allowed = array( Registry::SOURCE_THEME, Registry::SOURCE_SPACERY, Registry::SOURCE_CUSTOM );

		return in_array( $value, $allowed, true ) ? (string) $value : '';
	}

	/**
	 * Validates a custom set, or refuses it whole.
	 *
	 * Wholesale rejection, matching `BreakpointSet::from_array()`. Storing the
	 * valid half of a submitted set would leave the site with breakpoints nobody
	 * asked for — harder to diagnose than a save that visibly did not happen.
	 *
	 * On refusal the previously stored value is returned, so a bad save is a
	 * no-op rather than a data-loss event. The screen notices because the value
	 * it reads back differs from the one it sent.
	 *
	 * The stored form is canonical: `to_array()` orders widest-first and fills
	 * in labels, so what comes back out is what the registry will resolve.
	 *
	 * @param mixed $value Submitted value.
	 * @return array<int, array{slug: string, label: string, max: string}>
	 */
	public function sanitize_breakpoints( mixed $value ): array {
		if ( ! is_array( $value ) ) {
			return $this->stored_breakpoints();
		}

		// An empty set is meaningful: it clears the custom source.
		if ( array() === $value ) {
			return array();
		}

		$set = BreakpointSet::from_array( $value );

		if ( ! $set instanceof BreakpointSet ) {
			/*
			 * Guarded, because `add_settings_error()` lives in wp-admin and a
			 * REST request never loads it. Calling it unguarded made every
			 * refused save a 500 instead of a refusal -- and since the screen
			 * saves through `/wp/v2/settings`, that was the *only* path a person
			 * could reach it by. Core guards its own call in `sanitize_option()`
			 * for the same reason; see wp-includes/formatting.php.
			 *
			 * The screen does not depend on this. It compares what came back
			 * with what it sent, which works in any context. The notice is for
			 * anything still using the Settings API's own form rendering.
			 */
			if ( function_exists( 'add_settings_error' ) ) {
				add_settings_error(
					Registry::OPTION_CUSTOM,
					'spacery_invalid_breakpoints',
					__( 'Those breakpoints were not saved. Every breakpoint needs a name and a width in px, em or rem, widths must all differ, and there is a maximum of 12.', 'spacery' ),
					'error'
				);
			}

			return $this->stored_breakpoints();
		}

		return $set->to_array();
	}

	/**
	 * What is currently stored, in canonical form.
	 *
	 * @return array<int, array{slug: string, label: string, max: string}>
	 */
	private function stored_breakpoints(): array {
		$stored = get_option( Registry::OPTION_CUSTOM, array() );

		if ( ! is_array( $stored ) ) {
			return array();
		}

		$set = BreakpointSet::from_array( $stored );

		return $set instanceof BreakpointSet ? $set->to_array() : array();
	}
}
