<?php
/**
 * Menu icon tests.
 *
 * @package Spacery
 */

declare( strict_types=1 );

namespace Spacery\Tests;

use PHPUnit\Framework\TestCase;
use Spacery\Settings\Screen;

/**
 * The admin menu draws Spacery's own mark rather than a dashicon.
 *
 * These assert the constraints `wp-admin/js/svg-painter.js` imposes, because
 * every one of them fails silently: a menu icon that breaks does not raise
 * anything, it just renders wrong, on a screen nobody looks at twice.
 */
final class ScreenTest extends TestCase {

	protected function setUp(): void {
		spacery_test_reset();
	}

	/**
	 * `add_menu_page()` takes a data URI for anything that is not a dashicon,
	 * and the painter looks for this exact prefix before it will recolour.
	 */
	public function test_icon_is_a_base64_svg_data_uri(): void {
		$this->assertStringStartsWith( 'data:image/svg+xml;base64,', Screen::icon() );
	}

	public function test_icon_decodes_to_well_formed_svg(): void {
		$svg = $this->decoded();

		$this->assertNotFalse( $svg, 'The data URI did not decode.' );
		$this->assertNotFalse( simplexml_load_string( $svg ), 'The mark is not well-formed XML.' );
		$this->assertStringContainsString( 'viewBox="0 0 77 77"', $svg );
	}

	/**
	 * The painter rewrites every `fill` attribute it finds. A shape without one
	 * is never recoloured, so it keeps whatever it was authored with and
	 * disappears against half the admin colour schemes.
	 */
	public function test_every_shape_carries_a_fill(): void {
		$svg = $this->decoded();

		$shapes = substr_count( $svg, '<rect' );
		$fills  = substr_count( $svg, 'fill="' );

		$this->assertSame( 6, $shapes, 'The mark is six bars: four sides and two repeats.' );
		$this->assertSame( $shapes, $fills, 'Every shape must carry a fill for the painter to rewrite.' );
	}

	/**
	 * The regression guard that matters most.
	 *
	 * The painter's second replacement is
	 * `xml.replace( /style="(.+?)"/g, 'style="fill:' + color + '"' )`, which
	 * swaps the *whole* attribute rather than the fill inside it. Anything else
	 * carried in a `style` here -- a transform, an opacity -- would be silently
	 * dropped the moment WordPress recoloured the menu, and only on the admin
	 * screen, never in a test that read the constant.
	 */
	public function test_the_mark_carries_no_style_attribute(): void {
		$this->assertStringNotContainsString( 'style=', $this->decoded() );
	}

	/**
	 * The screen signs itself with the version it is actually running (E7).
	 *
	 * Read from the plugin file by the bootstrap, so this cannot pass against a
	 * version that only the test believes in.
	 */
	public function test_data_carries_the_running_version(): void {
		$this->assertSame( \Spacery\VERSION, Screen::data()['version'] );
	}

	/**
	 * The footer renders a link per URL and nothing at all for an empty one, so
	 * a typo here is a missing link rather than a broken one -- which is the
	 * kind of defect nobody notices. Assert they are absolute and secure.
	 */
	public function test_data_carries_reachable_links(): void {
		$data = Screen::data();

		foreach ( array( 'docsUrl', 'supportUrl' ) as $key ) {
			$this->assertStringStartsWith( 'https://', $data[ $key ], $key );
			$this->assertNotFalse( filter_var( $data[ $key ], FILTER_VALIDATE_URL ), $key );
		}
	}

	/**
	 * Decodes the data URI back to markup.
	 *
	 * @return string
	 */
	private function decoded(): string {
		// phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_decode -- reading back what icon() wrote.
		$decoded = base64_decode( substr( Screen::icon(), strlen( 'data:image/svg+xml;base64,' ) ), true );

		return is_string( $decoded ) ? $decoded : '';
	}
}
