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

	public function test_extends_an_ordinary_block_by_default(): void {
		$this->assertNotContains( 'core/group', ( new Supported() )->excluded() );
	}

	/**
	 * Spacery's own spacer declares `supports.spacing.margin`, so it qualifies
	 * for the extension on the platform's terms -- and must not get it, because
	 * it already owns the `spacery` attribute and has its own controls.
	 */
	public function test_never_extends_spacerys_own_spacer(): void {
		$this->assertContains( 'spacery/spacer', ( new Supported() )->excluded() );
	}

	/**
	 * The regression guard for the bug this class shipped once.
	 *
	 * "Not extended" and "not rendered" were one list, so putting the spacer on
	 * it to keep a second panel off the block also switched off the block's own
	 * CSS. Nothing failed loudly: the editor looked right and the front end
	 * silently lost every responsive height.
	 */
	public function test_still_renders_spacerys_own_spacer(): void {
		$this->assertTrue( ( new Supported() )->renders( 'spacery/spacer' ) );
	}

	public function test_a_site_can_deny_a_block(): void {
		add_filter(
			'spacery_denied_blocks',
			static fn(): array => array( 'core/cover' )
		);

		$supported = new Supported();

		$this->assertContains( 'core/cover', $supported->excluded() );
		$this->assertFalse( $supported->renders( 'core/cover' ) );
		$this->assertTrue( $supported->renders( 'core/group' ) );
	}

	/**
	 * Denying is the site's decision, so a filter that forgets to return must
	 * deny nothing rather than have Spacery guess at what it meant.
	 */
	public function test_a_filter_returning_nothing_denies_nothing(): void {
		add_filter( 'spacery_denied_blocks', static fn(): ?array => null );

		$this->assertSame( array(), ( new Supported() )->denied() );
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
		$supported->renders( 'core/group' );
		$supported->renders( 'core/cover' );

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
			static fn(): array => array( 'core/cover' )
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
