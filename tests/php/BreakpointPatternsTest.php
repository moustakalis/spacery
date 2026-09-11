<?php
/**
 * The rules the settings screen is handed.
 *
 * @package Spacery
 */

declare( strict_types=1 );

namespace Spacery\Tests;

use PHPUnit\Framework\TestCase;
use Spacery\Breakpoints\Breakpoint;

/**
 * `SLUG_PATTERN` and `LENGTH_PATTERN` are shipped to JavaScript verbatim (D19),
 * which means they are stored without PCRE delimiters and PHP adds them at the
 * point of use. That is a seam: a pattern could drift from the validator that
 * is supposed to be applying it, and nothing would notice until a set the
 * screen accepted was refused by the server -- which presents as a save that
 * silently does nothing, the exact failure the shipped rules exist to prevent.
 *
 * These assert the two agree, on the values that matter.
 */
final class BreakpointPatternsTest extends TestCase {

	protected function setUp(): void {
		spacery_test_reset();
	}

	/**
	 * @return array<string, array{string, bool}>
	 */
	public static function lengths(): array {
		return array(
			'pixels'         => array( '782px', true ),
			'rem'            => array( '55.5rem', true ),
			'em'             => array( '48em', true ),
			'leading dot'    => array( '.5rem', true ),
			'zero is valid'  => array( '0px', true ),
			'no unit'        => array( '782', false ),
			'percent'        => array( '80%', false ),
			'negative'       => array( '-10px', false ),
			'calc'           => array( 'calc(100% - 2rem)', false ),
			'unitless zero'  => array( '0', false ),
			'trailing junk'  => array( '782px;', false ),
		);
	}

	/**
	 * @dataProvider lengths
	 *
	 * @param string $value    Candidate length.
	 * @param bool   $expected Whether it is valid.
	 */
	public function test_length_pattern_agrees_with_the_validator( string $value, bool $expected ): void {
		$this->assertSame(
			$expected,
			Breakpoint::is_valid_length( $value ),
			'The validator disagreed about ' . $value
		);

		$this->assertSame(
			$expected,
			1 === preg_match( '/' . Breakpoint::LENGTH_PATTERN . '/', $value ),
			'The shipped pattern disagreed about ' . $value
		);
	}

	/**
	 * @return array<string, array{string, bool}>
	 */
	public static function slugs(): array {
		return array(
			'lowercase'  => array( 'laptop', true ),
			'digits'     => array( 'tier2', true ),
			'dashes'     => array( 'wide-desktop', true ),
			'uppercase'  => array( 'Laptop', false ),
			'space'      => array( 'wide desktop', false ),
			'underscore' => array( 'wide_desktop', false ),
			'empty'      => array( '', false ),
		);
	}

	/**
	 * @dataProvider slugs
	 *
	 * @param string $slug     Candidate slug.
	 * @param bool   $expected Whether it is valid.
	 */
	public function test_slug_pattern_agrees_with_create( string $slug, bool $expected ): void {
		$this->assertSame(
			$expected,
			Breakpoint::create( $slug, 'A name', '782px' ) instanceof Breakpoint,
			'create() disagreed about ' . $slug
		);

		$this->assertSame(
			$expected,
			1 === preg_match( '/' . Breakpoint::SLUG_PATTERN . '/', $slug ),
			'The shipped pattern disagreed about ' . $slug
		);
	}

	/**
	 * The conversion the screen has to reproduce to compare widths at all.
	 */
	public function test_pixels_per_em_is_what_the_screen_is_told(): void {
		$this->assertSame( 16, Breakpoint::PIXELS_PER_EM );

		$rem = Breakpoint::create( 'a', 'A', '55.5rem' );
		$px  = Breakpoint::create( 'b', 'B', '888px' );

		$this->assertNotNull( $rem );
		$this->assertNotNull( $px );
		$this->assertSame( $px->max_in_pixels(), $rem->max_in_pixels() );
	}
}
