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
	 * Most tiers a set may hold.
	 *
	 * Not a technical limit. Every tier is a row in the inspector, a band in the
	 * generated stylesheet, and a decision the author has to make for each
	 * property. Beyond a dozen the feature stops being useful and starts being
	 * a way to make a page slow, so a runaway theme.json or a fat-fingered
	 * settings save is rejected rather than honoured.
	 */
	public const MAX_BREAKPOINTS = 12;

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
		if ( array() === $raw || count( $raw ) > self::MAX_BREAKPOINTS ) {
			return null;
		}

		$breakpoints = array();

		foreach ( $raw as $key => $value ) {
			if ( is_string( $value ) ) {
				// Shorthand form: a slug mapped straight to its boundary.
				$slug  = (string) $key;
				$label = self::machine_label( $slug );
				$max   = $value;
			} elseif ( is_array( $value ) ) {
				$slug  = (string) ( $value['slug'] ?? $key );
				$label = (string) ( $value['label'] ?? self::machine_label( $slug ) );
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
	 * Last-resort label for a tier whose author supplied none.
	 *
	 * Deliberately not translated, and not translatable. The input is a slug
	 * some theme or site owner invented, so there is no source string for a
	 * translator to have translated; running it through `__()` would only
	 * produce a msgid nobody can ever supply. Title-casing it is a machine
	 * fallback and is presented as one.
	 *
	 * Tiers Spacery itself defines carry real translated labels — see
	 * `Registry::preset()` and its reading of `settings.viewport`. Themes that
	 * care about wording should pass an explicit `label`, which is passed
	 * through untouched.
	 *
	 * @param string $slug Machine name.
	 */
	private static function machine_label( string $slug ): string {
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
	 * Expands authored values into an effective value for every band.
	 *
	 * Bands are disjoint (see {@see BreakpointSet::media_queries()}), so a value
	 * authored at one tier would otherwise stop applying at the next one down.
	 * Authors think in a cascade: setting `laptop` means "this and everything
	 * narrower". This walks widest to narrowest carrying the last authored value
	 * forward, which is the desktop-first resolution `responsive-state`'s
	 * `pick( …, { fallbackDirection: 'down' } )` performs in the editor. The two
	 * must agree, or the preview lies about the frontend.
	 *
	 * Slugs that are not tiers in this set are ignored rather than rejected: an
	 * old attribute referring to a tier the site has since renamed should lose
	 * that value, not break the block.
	 *
	 * @param array<string, mixed> $authored Values keyed by tier slug.
	 * @return array<string, mixed> Effective value per tier, widest first.
	 */
	public function materialize( array $authored ): array {
		$effective = array();
		$carried   = null;

		foreach ( $this->breakpoints as $breakpoint ) {
			if ( array_key_exists( $breakpoint->slug, $authored ) ) {
				$carried = $authored[ $breakpoint->slug ];
			}

			if ( null !== $carried ) {
				$effective[ $breakpoint->slug ] = $carried;
			}
		}

		return $effective;
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
