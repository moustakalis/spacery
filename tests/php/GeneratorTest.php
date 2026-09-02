<?php
/**
 * Style generation tests.
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
 * Covers normalization, materialization, hashing and emitted CSS.
 */
final class GeneratorTest extends TestCase {

	private Generator $generator;

	protected function setUp(): void {
		spacery_test_reset();

		if ( ! function_exists( 'wp_style_engine_get_styles' ) ) {
			$this->markTestSkipped(
				'Style Engine not present. Run `composer run fetch-core`.'
			);
		}

		$this->generator = new Generator( new Registry() );
	}

	/**
	 * A single authored tier must reach every narrower band. This is D13.
	 */
	public function test_one_authored_tier_materializes_into_narrower_bands(): void {
		$styles = $this->generator->generate(
			array( 'laptop' => array( 'spacing' => array( 'padding' => array( 'top' => '2rem' ) ) ) )
		);

		$this->assertNotNull( $styles );
		$this->assertSame(
			array(
				'@media (782px < width <= 1024px)',
				'@media (480px < width <= 782px)',
				'@media (width <= 480px)',
			),
			array_column( $styles->rules, 'rules_group' ),
			'a laptop value must not stop applying below 782px'
		);
	}

	public function test_narrower_authored_values_override_carried_ones(): void {
		$styles = $this->generator->generate(
			array(
				'laptop' => array( 'spacing' => array( 'padding' => array( 'top' => '2rem' ) ) ),
				'mobile' => array( 'spacing' => array( 'padding' => array( 'top' => '0.5rem' ) ) ),
			)
		);

		$by_band = array_combine(
			array_column( $styles->rules, 'rules_group' ),
			array_column( $styles->rules, 'declarations' )
		);

		$this->assertSame( '2rem !important', $by_band['@media (782px < width <= 1024px)']['padding-top'] );
		$this->assertSame( '2rem !important', $by_band['@media (480px < width <= 782px)']['padding-top'] );
		$this->assertSame( '0.5rem !important', $by_band['@media (width <= 480px)']['padding-top'] );
	}

	/**
	 * Materialization is per property, not per tier.
	 *
	 * A narrower tier that sets only a margin must still inherit the padding
	 * from above it. Carrying whole tier objects forward would lose it.
	 */
	public function test_properties_inherit_independently(): void {
		$styles = $this->generator->generate(
			array(
				'tablet' => array( 'spacing' => array( 'padding' => array( 'top' => '2rem' ) ) ),
				'mobile' => array( 'spacing' => array( 'margin' => array( 'bottom' => '1rem' ) ) ),
			)
		);

		$by_band = array_combine(
			array_column( $styles->rules, 'rules_group' ),
			array_column( $styles->rules, 'declarations' )
		);

		$mobile = $by_band['@media (width <= 480px)'];

		$this->assertSame( '2rem !important', $mobile['padding-top'], 'padding must be inherited' );
		$this->assertSame( '1rem !important', $mobile['margin-bottom'], 'margin is authored here' );
	}

	/**
	 * Every declaration carries !important, because core writes block support
	 * styles inline and inline beats any class.
	 */
	public function test_declarations_are_marked_important(): void {
		$styles = $this->generator->generate(
			array( 'mobile' => array( 'spacing' => array( 'padding' => array( 'top' => '1rem' ) ) ) )
		);

		foreach ( $styles->rules as $rule ) {
			foreach ( $rule['declarations'] as $value ) {
				$this->assertStringEndsWith( ' !important', $value );
			}
		}
	}

	/**
	 * Preset values resolve through the Style Engine rather than by hand.
	 */
	public function test_preset_values_become_custom_properties(): void {
		$styles = $this->generator->generate(
			array(
				'mobile' => array(
					'spacing' => array( 'padding' => array( 'top' => 'var:preset|spacing|50' ) ),
				),
			)
		);

		$this->assertSame(
			'var(--wp--preset--spacing--50) !important',
			$styles->rules[0]['declarations']['padding-top']
		);
	}

	// -- Content addressing ------------------------------------------------

	public function test_identical_spacing_produces_identical_classes(): void {
		$recipe = array( 'mobile' => array( 'spacing' => array( 'padding' => array( 'top' => '1rem' ) ) ) );

		$this->assertSame(
			$this->generator->generate( $recipe )->class_name,
			$this->generator->generate( $recipe )->class_name
		);
	}

	/**
	 * Key order must not change the class, or dedupe silently stops working.
	 */
	public function test_key_order_does_not_change_the_class(): void {
		$a = $this->generator->generate(
			array(
				'mobile' => array(
					'spacing' => array(
						'padding' => array(
							'top'    => '1rem',
							'bottom' => '2rem',
						),
					),
				),
				'tablet' => array( 'spacing' => array( 'padding' => array( 'top' => '3rem' ) ) ),
			)
		);

		$b = $this->generator->generate(
			array(
				'tablet' => array( 'spacing' => array( 'padding' => array( 'top' => '3rem' ) ) ),
				'mobile' => array(
					'spacing' => array(
						'padding' => array(
							'bottom' => '2rem',
							'top'    => '1rem',
						),
					),
				),
			)
		);

		$this->assertSame( $a->class_name, $b->class_name );
	}

	public function test_different_spacing_produces_different_classes(): void {
		$a = $this->generator->generate(
			array( 'mobile' => array( 'spacing' => array( 'padding' => array( 'top' => '1rem' ) ) ) )
		);
		$b = $this->generator->generate(
			array( 'mobile' => array( 'spacing' => array( 'padding' => array( 'top' => '2rem' ) ) ) )
		);

		$this->assertNotSame( $a->class_name, $b->class_name );
	}

	// -- Nothing to emit ---------------------------------------------------

	public function test_returns_null_for_nothing_useful(): void {
		$this->assertNull( $this->generator->generate( null ) );
		$this->assertNull( $this->generator->generate( array() ) );
		$this->assertNull( $this->generator->generate( array( 'mobile' => array() ) ) );
		$this->assertNull(
			$this->generator->generate(
				array( 'mobile' => array( 'spacing' => array( 'padding' => array( 'top' => '' ) ) ) )
			)
		);
	}

	/**
	 * A value for a tier the site no longer has should be dropped, not fatal.
	 */
	public function test_unknown_tiers_are_ignored(): void {
		$this->assertNull(
			$this->generator->generate(
				array( 'two-xl' => array( 'spacing' => array( 'padding' => array( 'top' => '1rem' ) ) ) )
			),
			'a renamed tier loses its value rather than breaking the block'
		);
	}

	// -- Exit criterion ----------------------------------------------------

	/**
	 * M2's exit criterion: 200 blocks, 3 recipes, 3 rule groups.
	 */
	public function test_two_hundred_blocks_sharing_three_recipes_emit_three_rule_groups(): void {
		$recipes = array(
			array( 'mobile' => array( 'spacing' => array( 'padding' => array( 'top' => '1rem' ) ) ) ),
			array( 'tablet' => array( 'spacing' => array( 'padding' => array( 'top' => '2rem' ) ) ) ),
			array( 'laptop' => array( 'spacing' => array( 'margin' => array( 'bottom' => '3rem' ) ) ) ),
		);

		$collector = new Collector();

		for ( $i = 0; $i < 200; $i++ ) {
			$collector->add( $this->generator->generate( $recipes[ $i % 3 ] ) );
		}

		$this->assertSame( 3, $collector->count(), '200 blocks, 3 distinct recipes' );

		$css = $collector->to_css();

		$this->assertSame(
			3,
			substr_count( $css, '.spy-' ) > 0 ? count( array_unique( self::classes_in( $css ) ) ) : 0,
			'three classes in the stylesheet'
		);
	}

	/**
	 * Extracts generated class names from a stylesheet.
	 *
	 * @param string $css Stylesheet.
	 * @return array<int, string>
	 */
	private static function classes_in( string $css ): array {
		preg_match_all( '/\.spy-[0-9a-f]+/', $css, $matches );

		return $matches[0];
	}

	/**
	 * Snapshot of the actual emitted CSS, so a change in shape is visible in a
	 * diff rather than inferred from assertions about it.
	 */
	public function test_emitted_css_snapshot(): void {
		$collector = new Collector();
		$collector->add(
			$this->generator->generate(
				array(
					'tablet' => array( 'spacing' => array( 'padding' => array( 'top' => '2rem' ) ) ),
					'mobile' => array( 'spacing' => array( 'padding' => array( 'top' => '1rem' ) ) ),
				)
			)
		);

		$css = preg_replace( '/spy-[0-9a-f]+/', 'spy-HASH', $collector->to_css() );

		$this->assertSame(
			'@media (480px < width <= 782px){.spy-HASH{padding-top:2rem !important;}}'
			. '@media (width <= 480px){.spy-HASH{padding-top:1rem !important;}}',
			$css
		);
	}
}
