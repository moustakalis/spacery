<?php
/**
 * Contract tests against WordPress core's own implementation.
 *
 * @package Spacery
 */

declare( strict_types=1 );

namespace Spacery\Tests\Contract;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Spacery\Breakpoints\Breakpoint;
use Spacery\Breakpoints\BreakpointSet;
use WP_Theme_JSON;

/**
 * Verifies Spacery against core rather than against Spacery's idea of core.
 */
final class CoreContractTest extends TestCase {

	protected function setUp(): void {
		if ( ! class_exists( WP_Theme_JSON::class ) ) {
			$this->markTestSkipped(
				'Core source not present. Run `composer run fetch-core` to enable contract tests.'
			);
		}
	}

	/**
	 * Spacery's bands must be byte-identical to core's for the same values.
	 *
	 * This is the assertion that matters most. If core ever changes its query
	 * shape — range syntax to min/max, inclusive to exclusive bounds, anything —
	 * this fails, and it fails here rather than as a subtly wrong layout on
	 * somebody's site.
	 *
	 * @param string $mobile Mobile boundary.
	 * @param string $tablet Tablet boundary.
	 */
	#[DataProvider( 'boundary_pairs' )]
	public function test_bands_match_core_exactly( string $mobile, string $tablet ): void {
		$core = WP_Theme_JSON::get_viewport_media_queries(
			array(
				'mobile' => $mobile,
				'tablet' => $tablet,
			)
		);

		$spacery = BreakpointSet::from_array(
			array(
				'tablet' => $tablet,
				'mobile' => $mobile,
			)
		)?->media_queries();

		$this->assertNotNull( $spacery );
		$this->assertSame( $core['@mobile'], $spacery['mobile'] );
		$this->assertSame( $core['@tablet'], $spacery['tablet'] );
	}

	/**
	 * @return array<string, array{0: string, 1: string}>
	 */
	public static function boundary_pairs(): array {
		return array(
			'core defaults' => array( '480px', '782px' ),
			'rem'           => array( '30rem', '45rem' ),
			'em'            => array( '30em', '45em' ),
			'fractional'    => array( '480.5px', '782.5px' ),
			'wide apart'    => array( '320px', '1200px' ),
		);
	}

	/**
	 * A single tier must match core's single-tier form.
	 */
	public function test_single_band_matches_core(): void {
		$core = WP_Theme_JSON::get_viewport_media_queries( array( 'mobile' => '480px' ) );

		$spacery = BreakpointSet::from_array( array( 'mobile' => '480px' ) )?->media_queries();

		$this->assertSame( $core['@mobile'], $spacery['mobile'] );
	}

	/**
	 * Boundary validation must agree with core's, in both directions.
	 *
	 * Core's `is_valid_viewport_breakpoint_size()` is private, so it is probed
	 * indirectly. Passing only `mobile`: if core accepts the value it emits one
	 * query, and if it rejects it it falls back to its two defaults and emits
	 * two. The count is the oracle.
	 *
	 * An earlier version of this test asked whether the value appeared in the
	 * generated query, which quietly reported `'480'` as accepted because it is
	 * a substring of the `480px` core falls back to. The contract suite caught
	 * that on its first run.
	 *
	 * Accepting something core rejects would let a site define a breakpoint that
	 * works in Spacery and silently does nothing in WordPress; rejecting
	 * something core accepts would refuse a theme core is happy with.
	 *
	 * @param string $value A candidate boundary.
	 */
	#[DataProvider( 'candidate_lengths' )]
	public function test_length_validation_agrees_with_core( string $value ): void {
		$queries = WP_Theme_JSON::get_viewport_media_queries( array( 'mobile' => $value ) );

		$core_accepted = 1 === count( $queries );

		$this->assertSame(
			$core_accepted,
			Breakpoint::is_valid_length( $value ),
			sprintf( 'disagreement with core over "%s"', $value )
		);
	}

	/**
	 * @return array<string, array{0: string}>
	 */
	public static function candidate_lengths(): array {
		return array(
			'px'              => array( '480px' ),
			'rem'             => array( '30rem' ),
			'em'              => array( '30em' ),
			'fractional px'   => array( '480.5px' ),
			'leading dot'     => array( '.5rem' ),
			'unitless'        => array( '480' ),
			'percentage'      => array( '50%' ),
			'viewport unit'   => array( '50vw' ),
			'calc'            => array( 'calc(100vw - 2rem)' ),
			'negative'        => array( '-480px' ),
			'whitespace only' => array( ' ' ),
			'garbage'         => array( 'wide' ),
		);
	}

	/**
	 * Documents a deliberate difference rather than asserting sameness.
	 *
	 * Core can emit an `@desktop` query, `(width > tablet)`, for the region
	 * above its widest tier. Spacery never does: there, base styles stand alone
	 * with no media query at all, which is also what core does by default. The
	 * assertion pins the difference so nobody "fixes" it by accident.
	 */
	public function test_spacery_emits_no_query_above_its_widest_tier(): void {
		$core = WP_Theme_JSON::get_viewport_media_queries(
			array(
				'mobile' => '480px',
				'tablet' => '782px',
			),
			array( 'include_desktop' => true )
		);

		$this->assertSame( '@media (width > 782px)', $core['@desktop'] );

		$spacery = BreakpointSet::from_array(
			array(
				'tablet' => '782px',
				'mobile' => '480px',
			)
		)?->media_queries();

		$this->assertCount( 2, $spacery );
		$this->assertArrayNotHasKey( 'desktop', $spacery );
	}
}
