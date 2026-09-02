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
 * The two options behind decision D2, registered once for every consumer.
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
	 * Attaches hooks.
	 *
	 * On `init` because that is when `register_setting()` must run to reach both
	 * admin-side consumers and the REST API, which fires `init` on every request.
	 */
	public function register(): void {
		add_action( 'init', array( $this, 'register_options' ) );
	}

	/**
	 * Registers both options, with REST schemas and sanitizers.
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
			add_settings_error(
				Registry::OPTION_CUSTOM,
				'spacery_invalid_breakpoints',
				__( 'Those breakpoints were not saved. Every breakpoint needs a name and a width in px, em or rem, widths must all differ, and there is a maximum of 12.', 'spacery' ),
				'error'
			);

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
