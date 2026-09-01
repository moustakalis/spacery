<?php
/**
 * A single responsive tier.
 *
 * @package Spacery
 */

declare( strict_types=1 );

namespace Spacery\Breakpoints;

defined( 'ABSPATH' ) || exit;

/**
 * One breakpoint: a named upper bound on viewport width.
 *
 * Spacery is desktop-first, matching WordPress core. `$max` is therefore an
 * upper bound — a tier with `$max` of `782px` describes viewports no wider than
 * that. The widest state, where no tier applies and base styles stand alone, is
 * not a breakpoint and is never represented here.
 */
final class Breakpoint {

	/**
	 * Lengths accepted for a boundary.
	 *
	 * Mirrors `WP_Theme_JSON::is_valid_viewport_breakpoint_size()` exactly. Core
	 * restricts these because the value is interpolated into a media query, so
	 * CSS functions, percentages and negative numbers are all rejected. Spacery
	 * accepting anything core rejects would let a site define a breakpoint that
	 * works here and silently fails there.
	 */
	private const VALID_LENGTH = '/^(?:\d+|\d*\.\d+)(?:px|em|rem)$/';

	/**
	 * Pixels assumed per `em`/`rem` when comparing boundaries.
	 *
	 * Only ever used for ordering. Generated media queries keep the author's
	 * original units. The value matches core's own assumption.
	 */
	private const PIXELS_PER_EM = 16;

	/**
	 * Constructor. Prefer {@see Breakpoint::create()}, which validates.
	 *
	 * @param string $slug  Machine name, `[a-z0-9-]`.
	 * @param string $label Human-readable name, shown in the editor.
	 * @param string $max   Upper bound as a CSS length, e.g. `782px`.
	 */
	private function __construct(
		public readonly string $slug,
		public readonly string $label,
		public readonly string $max
	) {}

	/**
	 * Creates a breakpoint, or null when any part of it is invalid.
	 *
	 * Returning null rather than throwing keeps validation total: a malformed
	 * theme.json or option should make Spacery fall back to a known-good set,
	 * never fatal a site.
	 *
	 * @param string $slug  Machine name.
	 * @param string $label Human-readable name.
	 * @param string $max   Upper bound as a CSS length.
	 * @return Breakpoint|null
	 */
	public static function create( string $slug, string $label, string $max ): ?Breakpoint {
		$slug  = trim( $slug );
		$label = trim( $label );
		$max   = trim( $max );

		if ( 1 !== preg_match( '/^[a-z0-9-]+$/', $slug ) ) {
			return null;
		}

		if ( '' === $label ) {
			return null;
		}

		if ( ! self::is_valid_length( $max ) ) {
			return null;
		}

		// A zero-width tier can never match anything.
		if ( 0.0 >= self::to_pixels( $max ) ) {
			return null;
		}

		return new self( $slug, $label, $max );
	}

	/**
	 * Whether a string is a boundary length Spacery and core both accept.
	 *
	 * @param string $value Candidate length.
	 */
	public static function is_valid_length( string $value ): bool {
		return 1 === preg_match( self::VALID_LENGTH, trim( $value ) );
	}

	/**
	 * The boundary in pixels, for ordering comparisons only.
	 */
	public function max_in_pixels(): float {
		return self::to_pixels( $this->max );
	}

	/**
	 * Converts a validated length to pixels.
	 *
	 * @param string $value Validated CSS length.
	 */
	private static function to_pixels( string $value ): float {
		$value = trim( $value );

		if ( str_ends_with( $value, 'rem' ) ) {
			return (float) substr( $value, 0, -3 ) * self::PIXELS_PER_EM;
		}

		if ( str_ends_with( $value, 'em' ) ) {
			return (float) substr( $value, 0, -2 ) * self::PIXELS_PER_EM;
		}

		return (float) substr( $value, 0, -2 );
	}

	/**
	 * Array form, for passing to the editor or storing in an option.
	 *
	 * @return array{slug: string, label: string, max: string}
	 */
	public function to_array(): array {
		return array(
			'slug'  => $this->slug,
			'label' => $this->label,
			'max'   => $this->max,
		);
	}
}
