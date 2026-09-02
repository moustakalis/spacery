<?php
/**
 * Spacer block rendering tests.
 *
 * @package Spacery
 */

declare( strict_types=1 );

namespace Spacery\Tests;

use PHPUnit\Framework\TestCase;
use Spacery\Breakpoints\Registry;
use Spacery\Styles\Collector;
use Spacery\Styles\Generator;

/**
 * The spacer's per-breakpoint height uses the same pipeline as everything else.
 *
 * That is the point of these tests: the block adds no generation code. The
 * Style Engine already maps `dimensions.height` to the `height` property, so a
 * spacer's responsive height is the M2 pipeline with a different style key.
 */
final class SpacerTest extends TestCase {

	private Generator $generator;

	protected function setUp(): void {
		spacery_test_reset();

		if ( ! function_exists( 'wp_style_engine_get_styles' ) ) {
			$this->markTestSkipped( 'Style Engine not present. Run `composer run fetch-core`.' );
		}

		$this->generator = new Generator( new Registry() );
	}

	/**
	 * The gap core has left open since 2018: a spacer whose height changes.
	 */
	public function test_per_breakpoint_height_compiles_to_banded_css(): void {
		$collector = new Collector();
		$collector->add(
			$this->generator->generate(
				array(
					'tablet' => array( 'dimensions' => array( 'height' => '60px' ) ),
					'mobile' => array( 'dimensions' => array( 'height' => '32px' ) ),
				)
			)
		);

		$css = preg_replace( '/spy-[0-9a-f]+/', 'spy-HASH', $collector->to_css() );

		$this->assertSame(
			'@media (480px < width <= 782px){.spy-HASH{height:60px !important;}}'
			. '@media (width <= 480px){.spy-HASH{height:32px !important;}}',
			$css
		);
	}

	/**
	 * A height set at one tier reaches every narrower one, exactly as spacing does.
	 */
	public function test_height_materializes_downward(): void {
		$styles = $this->generator->generate(
			array( 'laptop' => array( 'dimensions' => array( 'height' => '80px' ) ) )
		);

		$this->assertSame(
			array(
				'@media (782px < width <= 1024px)',
				'@media (480px < width <= 782px)',
				'@media (width <= 480px)',
			),
			array_column( $styles->rules, 'rules_group' )
		);
	}

	/**
	 * The base height is not Spacery's to emit.
	 *
	 * save() writes it as an inline style, so no rule should exist without a
	 * media query. Emitting one would fight the block's own markup for no
	 * reason.
	 */
	public function test_no_rule_is_emitted_without_a_media_query(): void {
		$styles = $this->generator->generate(
			array( 'mobile' => array( 'dimensions' => array( 'height' => '32px' ) ) )
		);

		foreach ( $styles->rules as $rule ) {
			$this->assertArrayHasKey( 'rules_group', $rule );
			$this->assertStringStartsWith( '@media', $rule['rules_group'] );
		}
	}

	/**
	 * Height and margin travel together, since the block supports both.
	 */
	public function test_height_and_margin_coexist_at_one_tier(): void {
		$styles = $this->generator->generate(
			array(
				'mobile' => array(
					'dimensions' => array( 'height' => '32px' ),
					'spacing'    => array( 'margin' => array( 'bottom' => '1rem' ) ),
				),
			)
		);

		$declarations = $styles->rules[0]['declarations'];

		$this->assertSame( '32px !important', $declarations['height'] );
		$this->assertSame( '1rem !important', $declarations['margin-bottom'] );
	}

	/**
	 * Two spacers with the same responsive height share one rule.
	 */
	public function test_identical_spacers_share_a_class(): void {
		$recipe = array( 'mobile' => array( 'dimensions' => array( 'height' => '32px' ) ) );

		$collector = new Collector();

		for ( $i = 0; $i < 40; $i++ ) {
			$collector->add( $this->generator->generate( $recipe ) );
		}

		$this->assertSame( 1, $collector->count() );
	}
}
