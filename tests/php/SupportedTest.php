<?php
/**
 * Deny-list tests.
 *
 * @package Spacery
 */

declare( strict_types=1 );

namespace Spacery\Tests;

use PHPUnit\Framework\TestCase;
use Spacery\Blocks\Supported;
use Spacery\Breakpoints\Registry;
use Spacery\Render\BlockFilter;
use Spacery\Styles\Collector;
use Spacery\Styles\Generator;

/**
 * Spacery extends any block declaring `supports.spacing`; this is the escape hatch.
 */
final class SupportedTest extends TestCase {

	protected function setUp(): void {
		spacery_test_reset();
	}

	public function test_allows_an_ordinary_block_by_default(): void {
		$this->assertTrue( ( new Supported() )->allows( 'core/group' ) );
	}

	/**
	 * Spacery's own spacer declares and edits the attribute itself, so a second
	 * panel writing the same attribute would be a conflict rather than a feature.
	 */
	public function test_always_denies_spacerys_own_spacer(): void {
		$this->assertFalse( ( new Supported() )->allows( 'spacery/spacer' ) );
	}

	public function test_a_site_can_deny_a_block(): void {
		add_filter(
			'spacery_denied_blocks',
			static fn( array $denied ): array => array( ...$denied, 'core/cover' )
		);

		$supported = new Supported();

		$this->assertFalse( $supported->allows( 'core/cover' ) );
		$this->assertTrue( $supported->allows( 'core/group' ) );
	}

	/**
	 * A filter that forgets to return must not silently re-enable Spacery on
	 * its own spacer, which is the one block that genuinely cannot take it.
	 */
	public function test_a_filter_returning_nothing_leaves_the_built_in_list(): void {
		add_filter( 'spacery_denied_blocks', static fn(): ?array => null );

		$this->assertFalse( ( new Supported() )->allows( 'spacery/spacer' ) );
	}

	public function test_drops_non_strings_and_duplicates(): void {
		add_filter(
			'spacery_denied_blocks',
			static fn(): array => array( 'core/cover', 'core/cover', 42, '', null )
		);

		$this->assertSame( array( 'core/cover' ), ( new Supported() )->denied() );
	}

	/**
	 * The filter runs once per request. Two answers to "is this block denied?"
	 * within one page load would let a stateful filter hide a block from the
	 * inspector while still styling it on the front end.
	 */
	public function test_memoizes_the_filtered_list(): void {
		$calls = 0;

		add_filter(
			'spacery_denied_blocks',
			static function ( array $denied ) use ( &$calls ): array {
				++$calls;

				return $denied;
			}
		);

		$supported = new Supported();
		$supported->allows( 'core/group' );
		$supported->allows( 'core/cover' );

		$this->assertSame( 1, $calls );
	}

	/**
	 * Denying a block stops the CSS, not just the controls.
	 *
	 * The attribute is deliberately left in the author's content, so re-allowing
	 * the block brings the spacing back exactly as it was.
	 */
	public function test_a_denied_block_is_rendered_untouched(): void {
		if ( ! function_exists( 'wp_style_engine_get_styles' ) ) {
			$this->markTestSkipped( 'Style Engine not present. Run `composer run fetch-core`.' );
		}

		add_filter(
			'spacery_denied_blocks',
			static fn( array $denied ): array => array( ...$denied, 'core/cover' )
		);

		$collector = new Collector();
		$filter    = new BlockFilter(
			new Generator( new Registry() ),
			$collector,
			new Supported()
		);

		$content = '<div class="wp-block-cover"></div>';
		$block   = array(
			'blockName' => 'core/cover',
			'attrs'     => array(
				'spacery' => array(
					'mobile' => array( 'spacing' => array( 'padding' => array( 'top' => '1rem' ) ) ),
				),
			),
		);

		$this->assertSame( $content, $filter->filter_block( $content, $block ) );
		$this->assertSame( '', $collector->to_css() );
	}
}
