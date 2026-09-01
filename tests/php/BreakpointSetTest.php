<?php
/**
 * BreakpointSet tests.
 *
 * @package Spacery
 */

declare( strict_types=1 );

namespace Spacery\Tests;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Spacery\Breakpoints\Breakpoint;
use Spacery\Breakpoints\BreakpointSet;

/**
 * Covers construction, validation and band generation.
 */
final class BreakpointSetTest extends TestCase {

	public function test_orders_widest_first_regardless_of_input_order(): void {
		$set = BreakpointSet::from_array(
			array(
				'mobile'  => '480px',
				'desktop' => '1280px',
				'tablet'  => '782px',
			)
		);

		$this->assertNotNull( $set );
		$this->assertSame( array( 'desktop', 'tablet', 'mobile' ), $set->slugs() );
	}

	public function test_derives_labels_from_slugs(): void {
		$set = BreakpointSet::from_array( array( 'small-tablet' => '600px' ) );

		$this->assertNotNull( $set );
		$this->assertSame( 'Small Tablet', $set->get( 'small-tablet' )?->label );
	}

	public function test_accepts_explicit_labels(): void {
		$set = BreakpointSet::from_array(
			array(
				array(
					'slug'  => 'phone',
					'label' => 'Handheld',
					'max'   => '480px',
				),
			)
		);

		$this->assertSame( 'Handheld', $set->get( 'phone' )?->label );
	}

	/**
	 * Bands must match WP_Theme_JSON::get_viewport_media_queries() exactly.
	 *
	 * Core emits disjoint ranges, so a tablet value never applies at mobile
	 * widths. Spacery matching that is what keeps its rules directly comparable
	 * to core's instead of partially overlapping them.
	 */
	public function test_generates_disjoint_bands_matching_core(): void {
		$set = BreakpointSet::from_array(
			array(
				'desktop' => '1280px',
				'laptop'  => '1024px',
				'tablet'  => '782px',
				'mobile'  => '480px',
			)
		);

		$this->assertSame(
			array(
				'desktop' => '@media (1024px < width <= 1280px)',
				'laptop'  => '@media (782px < width <= 1024px)',
				'tablet'  => '@media (480px < width <= 782px)',
				'mobile'  => '@media (width <= 480px)',
			),
			$set->media_queries()
		);
	}

	public function test_single_breakpoint_has_no_lower_bound(): void {
		$set = BreakpointSet::from_array( array( 'mobile' => '480px' ) );

		$this->assertSame(
			array( 'mobile' => '@media (width <= 480px)' ),
			$set->media_queries()
		);
	}

	/**
	 * Two core tiers must produce byte-identical queries to core's own output.
	 */
	public function test_two_tier_set_matches_core_defaults_verbatim(): void {
		$set = BreakpointSet::from_array(
			array(
				'tablet' => '782px',
				'mobile' => '480px',
			)
		);

		$queries = $set->media_queries();

		$this->assertSame( '@media (480px < width <= 782px)', $queries['tablet'] );
		$this->assertSame( '@media (width <= 480px)', $queries['mobile'] );
	}

	public function test_preserves_author_units_in_queries(): void {
		$set = BreakpointSet::from_array(
			array(
				'wide'   => '64rem',
				'narrow' => '30rem',
			)
		);

		$this->assertSame(
			array(
				'wide'   => '@media (30rem < width <= 64rem)',
				'narrow' => '@media (width <= 30rem)',
			),
			$set->media_queries()
		);
	}

	public function test_orders_mixed_units_by_computed_pixels(): void {
		// 40rem = 640px, so it sits between 782px and 480px.
		$set = BreakpointSet::from_array(
			array(
				'a' => '782px',
				'b' => '40rem',
				'c' => '480px',
			)
		);

		$this->assertSame( array( 'a', 'b', 'c' ), $set->slugs() );
	}

	/**
	 * Invalid input is rejected wholesale.
	 *
	 * @param array<mixed> $raw    Candidate set.
	 * @param string       $reason Why it should be rejected.
	 */
	#[DataProvider( 'invalid_sets' )]
	public function test_rejects_invalid_sets( array $raw, string $reason ): void {
		$this->assertNull( BreakpointSet::from_array( $raw ), $reason );
	}

	/**
	 * @return array<string, array{0: array<mixed>, 1: string}>
	 */
	public static function invalid_sets(): array {
		return array(
			'empty'                => array( array(), 'an empty set is not a set' ),
			'duplicate slugs'      => array(
				array(
					array(
						'slug' => 'tablet',
						'max'  => '782px',
					),
					array(
						'slug' => 'tablet',
						'max'  => '480px',
					),
				),
				'two tiers cannot share a slug',
			),
			'equal boundaries'     => array(
				array(
					'a' => '600px',
					'b' => '600px',
				),
				'two tiers at the same width are ambiguous',
			),
			'unitless'             => array( array( 'a' => '480' ), 'core requires a unit' ),
			'zero'                 => array( array( 'a' => '0px' ), 'a zero-width tier matches nothing' ),
			'negative'             => array( array( 'a' => '-480px' ), 'negative widths are meaningless' ),
			'percentage'           => array( array( 'a' => '50%' ), 'core rejects percentages' ),
			'css function'         => array( array( 'a' => 'calc(100vw - 2rem)' ), 'core rejects CSS functions' ),
			'viewport unit'        => array( array( 'a' => '50vw' ), 'core allows only px, em and rem' ),
			'uppercase slug'       => array( array( 'Tablet' => '782px' ), 'slugs are lowercase' ),
			'slug with underscore' => array( array( 'small_tablet' => '782px' ), 'slugs use hyphens' ),
			'empty slug'           => array( array( '' => '782px' ), 'a slug is required' ),
			'missing max'          => array( array( array( 'slug' => 'tablet' ) ), 'a boundary is required' ),
			'non-string value'     => array( array( 'a' => 782 ), 'a boundary must be a CSS length string' ),
		);
	}

	public function test_rejection_is_total_not_partial(): void {
		// One bad entry must not yield a set containing only the good ones.
		$set = BreakpointSet::from_array(
			array(
				'tablet' => '782px',
				'broken' => '50%',
			)
		);

		$this->assertNull( $set, 'a partially applied set is harder to diagnose than none' );
	}

	public function test_exposes_array_form(): void {
		$set = BreakpointSet::from_array( array( 'mobile' => '480px' ) );

		$this->assertSame(
			array(
				array(
					'slug'  => 'mobile',
					'label' => 'Mobile',
					'max'   => '480px',
				),
			),
			$set->to_array()
		);
	}

	public function test_get_returns_null_for_unknown_slug(): void {
		$set = BreakpointSet::from_array( array( 'mobile' => '480px' ) );

		$this->assertNull( $set->get( 'nope' ) );
		$this->assertSame( 1, $set->count() );
	}

	public function test_breakpoint_converts_relative_units_like_core(): void {
		$breakpoint = Breakpoint::create( 'a', 'A', '30rem' );

		$this->assertNotNull( $breakpoint );
		$this->assertSame( 480.0, $breakpoint->max_in_pixels(), 'core assumes 16px per rem' );
	}

	// -- Tier count cap ----------------------------------------------------

	public function test_accepts_a_set_at_the_maximum_size(): void {
		$raw = array();

		for ( $i = 0; $i < BreakpointSet::MAX_BREAKPOINTS; $i++ ) {
			$raw[ 'tier-' . $i ] = ( 200 + ( $i * 100 ) ) . 'px';
		}

		$this->assertNotNull( BreakpointSet::from_array( $raw ) );
	}

	public function test_rejects_a_set_over_the_maximum_size(): void {
		$raw = array();

		for ( $i = 0; $i <= BreakpointSet::MAX_BREAKPOINTS; $i++ ) {
			$raw[ 'tier-' . $i ] = ( 200 + ( $i * 100 ) ) . 'px';
		}

		$this->assertNull(
			BreakpointSet::from_array( $raw ),
			'a runaway set makes the inspector unusable and the stylesheet fat'
		);
	}

	// -- Materialization ---------------------------------------------------

	/**
	 * The whole point of D13: authored as a cascade, emitted as bands.
	 */
	public function test_materializes_one_value_into_every_narrower_band(): void {
		$set = self::preset();

		$this->assertSame(
			array(
				'laptop' => '2rem',
				'tablet' => '2rem',
				'mobile' => '2rem',
			),
			$set->materialize( array( 'laptop' => '2rem' ) ),
			'a value set at laptop must not stop applying below 782px'
		);
	}

	public function test_narrower_authored_values_override_carried_ones(): void {
		$set = self::preset();

		$this->assertSame(
			array(
				'desktop' => '4rem',
				'laptop'  => '4rem',
				'tablet'  => '4rem',
				'mobile'  => '1rem',
			),
			$set->materialize(
				array(
					'desktop' => '4rem',
					'mobile'  => '1rem',
				)
			)
		);
	}

	public function test_materializing_nothing_yields_nothing(): void {
		$this->assertSame( array(), self::preset()->materialize( array() ) );
	}

	public function test_ignores_values_for_tiers_that_are_not_in_the_set(): void {
		$this->assertSame(
			array(),
			self::preset()->materialize( array( 'two-xl' => '9rem' ) ),
			'a renamed tier should lose its value, not break the block'
		);
	}

	public function test_a_value_only_at_the_narrowest_tier_stays_there(): void {
		$this->assertSame(
			array( 'mobile' => '1rem' ),
			self::preset()->materialize( array( 'mobile' => '1rem' ) )
		);
	}

	/**
	 * Measures D13's cost instead of assuming it.
	 *
	 * The plan claimed materialization is affordable because content-addressed
	 * hashing dedupes across blocks. That is an M2 claim. What is measurable
	 * here is the per-block multiplier: worst case is one authored value at the
	 * widest tier expanding to one declaration per tier.
	 */
	public function test_worst_case_expansion_is_bounded_by_tier_count(): void {
		$set = self::preset();

		$widest = $set->slugs()[0];

		$this->assertCount(
			$set->count(),
			$set->materialize( array( $widest => '1rem' ) ),
			'one authored value at the widest tier is the worst case'
		);

		// The realistic case: two authored values still cost one per tier.
		$this->assertCount(
			$set->count(),
			$set->materialize(
				array(
					$widest  => '4rem',
					'mobile' => '1rem',
				)
			)
		);
	}

	/**
	 * Spacery's own preset, as the Registry builds it.
	 */
	private static function preset(): BreakpointSet {
		$set = BreakpointSet::from_array(
			array(
				'desktop' => '1280px',
				'laptop'  => '1024px',
				'tablet'  => '782px',
				'mobile'  => '480px',
			)
		);

		self::assertNotNull( $set );

		return $set;
	}
}
