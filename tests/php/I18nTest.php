<?php
/**
 * Translation loading tests.
 *
 * @package Spacery
 */

declare( strict_types=1 );

namespace Spacery\Tests;

use PHPUnit\Framework\TestCase;
use Spacery\I18n;

/**
 * The two things about loading a text domain that fail silently (D20).
 *
 * Neither of these produces an error when it is wrong. A text domain whose path
 * is registered too late leaves strings in English; constants that drift from
 * the plugin header leave WordPress looking for a domain nobody ships.
 */
final class I18nTest extends TestCase {

	protected function setUp(): void {
		spacery_test_reset();
	}

	/**
	 * `init`, and first.
	 *
	 * Late enough to avoid 6.7's `_doing_it_wrong` for a domain needed before
	 * `after_setup_theme`, and early enough to beat anything registering a
	 * block on `init`, because `register_block_type_from_metadata()` translates
	 * the titles in `block.json` as it registers them. `Plugin::boot()`
	 * constructs this class first, which today would be enough on its own --
	 * this is the assertion that says so out loud.
	 */
	public function test_registers_the_path_on_init_before_anything_registers_a_block(): void {
		( new I18n() )->register();

		$this->assertArrayHasKey( 'init', $GLOBALS['spacery_test_filters'] );
		$this->assertCount( 1, $GLOBALS['spacery_test_filters']['init'] );
		$this->assertSame( 0, $GLOBALS['spacery_test_priorities']['init'][0] );
	}

	/**
	 * The constants are the plugin header, or the header is a lie.
	 *
	 * WordPress reads `Text Domain` and `Domain Path` from the header; every
	 * `__()` call and `load_plugin_textdomain()` read these. A rename on one
	 * side and not the other loses every translation with nothing to say why.
	 */
	public function test_domain_and_path_match_the_plugin_header(): void {
		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- reading a file in this repository from a test that has no WordPress.
		$header = (string) file_get_contents( dirname( __DIR__, 2 ) . '/spacery.php' );

		preg_match( '/Text Domain:\s*(\S+)/', $header, $domain );
		preg_match( '/Domain Path:\s*(\S+)/', $header, $path );

		$this->assertSame( I18n::DOMAIN, $domain[1] ?? '' );
		$this->assertSame( I18n::PATH, $path[1] ?? '' );
	}
}
