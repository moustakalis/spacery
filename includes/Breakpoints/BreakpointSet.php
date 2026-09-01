<?php
/**
 * An ordered, validated collection of responsive tiers.
 *
 * @package Spacery
 */

declare( strict_types=1 );

namespace Spacery\Breakpoints;

defined( 'ABSPATH' ) || exit;

/**
 * A complete set of breakpoints, ordered widest to narrowest.
 *
 * Immutable and always valid: {@see BreakpointSet::from_array()} returns null
 * rather than constructing an invalid set, so anything holding an instance can
 * rely on it.
 */
final class BreakpointSet {

	/**
	 * Tiers, ordered widest boundary first.
	 *
	 * @var Breakpoint[]
	 */
	private array $breakpoints;

	/**
	 * Constructor. Prefer {@see BreakpointSet::from_array()}, which validates.
	 *
	 * @param Breakpoint[] $breakpoints Ordered tiers.
	 */
	private function __construct( array $breakpoints ) {
		$this->breakpoints = $breakpoints;
	}

	/**
	 * Builds a set from raw data, or returns null when the data is unusable.
	 *
	 * Accepts either a list of `{slug, label, max}` maps or a shorthand map of
	 * `slug => max`, which is what a theme.json author is most likely to write.
	 * Rejects the whole set on any problem rather than silently dropping tiers:
	 * a partially-applied breakpoint set is harder to diagnose than none at all.
	 *
	 * @param array<mixed> $raw Candidate breakpoints.
	 * @return BreakpointSet|null
	 */
	public static function from_array( array $raw ): ?BreakpointSet {
		if ( array() === $raw ) {
			return null;
		}

		$breakpoints = array();

		foreach ( $raw as $key => $value ) {
			if ( is_string( $value ) ) {
				// Shorthand form: a slug mapped straight to its boundary.
				$slug  = (string) $key;
				$label = self::humanize( $slug );
				$max   = $value;
			} elseif ( is_array( $value ) ) {
				$slug  = (string) ( $value['slug'] ?? $key );
				$label = (string) ( $value['label'] ?? self::humanize( $slug ) );
				$max   = (string) ( $value['max'] ?? '' );
			} else {
				return null;
			}

			$breakpoint = Breakpoint::create( $slug, $label, $max );

			if ( ! $breakpoint instanceof Breakpoint ) {
				return null;
			}

			$breakpoints[] = $breakpoint;
		}

		// Widest first.
		usort(
			$breakpoints,
			static fn( Breakpoint $a, Breakpoint $b ) => $b->max_in_pixels() <=> $a->max_in_pixels()
		);

		$seen     = array();
		$previous = null;

		foreach ( $breakpoints as $breakpoint ) {
			if ( isset( $seen[ $breakpoint->slug ] ) ) {
				return null;
			}

			$seen[ $breakpoint->slug ] = true;

			// Strictly descending: two tiers at the same width are ambiguous.
			if ( null !== $previous && $breakpoint->max_in_pixels() >= $previous ) {
				return null;
			}

			$previous = $breakpoint->max_in_pixels();
		}

		return new self( $breakpoints );
	}

	/**
	 * Turns a slug into a fallback label: `two-xl` becomes `Two Xl`.
	 *
	 * @param string $slug Machine name.
	 */
	private static function humanize( string $slug ): string {
		return ucwords( str_replace( '-', ' ', $slug ) );
	}

	/**
	 * The tiers, widest first.
	 *
	 * @return Breakpoint[]
	 */
	public function all(): array {
		return $this->breakpoints;
	}

	/**
	 * Slugs, widest first.
	 *
	 * @return string[]
	 */
	public function slugs(): array {
		return array_map( static fn( Breakpoint $b ) => $b->slug, $this->breakpoints );
	}

	/**
	 * A single tier by slug, or null.
	 *
	 * @param string $slug Machine name.
	 */
	public function get( string $slug ): ?Breakpoint {
		foreach ( $this->breakpoints as $breakpoint ) {
			if ( $breakpoint->slug === $slug ) {
				return $breakpoint;
			}
		}

		return null;
	}

	/**
	 * How many tiers the set holds.
	 */
	public function count(): int {
		return count( $this->breakpoints );
	}

	/**
	 * Media queries for every tier, keyed by slug.
	 *
	 * Tiers are **disjoint bands**, not overlapping max-widths, because that is
	 * what core does: `WP_Theme_JSON::get_viewport_media_queries()` emits
	 * `@media (480px < width <= 782px)` for its tablet tier, so a tablet value
	 * never applies at mobile widths. Spacery matches that exactly, which keeps
	 * a Spacery rule and a core rule directly comparable instead of partially
	 * overlapping.
	 *
	 * Authors are not asked to think in bands. A value set at one tier is
	 * materialized into every narrower band at CSS-generation time, so it reads
	 * as a cascade while emitting core-identical CSS.
	 *
	 * @return array<string, string> Slug => media query, widest first.
	 */
	public function media_queries(): array {
		$queries = array();
		$total   = count( $this->breakpoints );

		foreach ( $this->breakpoints as $index => $breakpoint ) {
			$is_narrowest = ( $total - 1 === $index );

			if ( $is_narrowest ) {
				$queries[ $breakpoint->slug ] = "@media (width <= {$breakpoint->max})";
				continue;
			}

			$next = $this->breakpoints[ $index + 1 ];

			$queries[ $breakpoint->slug ] = sprintf(
				'@media (%s < width <= %s)',
				$next->max,
				$breakpoint->max
			);
		}

		return $queries;
	}

	/**
	 * Array form, for passing to the editor.
	 *
	 * @return array<int, array{slug: string, label: string, max: string}>
	 */
	public function to_array(): array {
		return array_map( static fn( Breakpoint $b ) => $b->to_array(), $this->breakpoints );
	}
}
