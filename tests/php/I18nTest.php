<?php
/**
 * Translation wiring tests.
 *
 * @package Spacery
 */

declare( strict_types=1 );

namespace Spacery\Tests;

use PHPUnit\Framework\TestCase;
use Spacery\I18n;

/**
 * The two things about translations that fail silently (D20).
 *
 * Neither produces an error when it is wrong. A script pointed at a directory
 * the plugin no longer fills looks identical to one pointed at nothing; a
 * header that still advertises a `Domain Path` looks identical to one that does
 * not. Both leave strings in English and say nothing.
 */
final class I18nTest extends TestCase {

	protected function setUp(): void {
		spacery_test_reset();
	}

	/**
	 * A handle, a domain, and no path.
	 *
	 * The path argument is the assertion. It is where
	 * `<domain>-<locale>-<handle>.json` is looked for, and a language pack from
	 * translate.wordpress.org is never named that way -- it is named after
	 * `md5( 'build/settings.js' )`, which is looked for in `WP_LANG_DIR` and
	 * needs no path at all. Passing one Spacery no longer fills would put a
	 * guaranteed miss in front of the lookup that works.
	 */
	public function test_script_translations_name_the_domain_and_no_path(): void {
		I18n::set_script_translations( 'spacery-settings' );

		$this->assertSame(
			array(
				array(
					'handle' => 'spacery-settings',
					'domain' => 'spacery',
					'path'   => null,
				),
			),
			$GLOBALS['spacery_test_script_translations']
		);
	}

	/**
	 * The header declares the domain, and no path, because nothing is bundled.
	 *
	 * `Domain Path` exists so WordPress can find translation files inside a
	 * plugin. Spacery ships none -- `package.json#files` does not list
	 * `languages` -- so the header pointing at a directory that is not in the
	 * zip would be a claim with nothing behind it, and re-adding one without
	 * re-adding a loader would translate nothing.
	 */
	public function test_the_header_declares_the_domain_and_no_bundled_path(): void {
		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- reading a file in this repository from a test that has no WordPress.
		$header = (string) file_get_contents( dirname( __DIR__, 2 ) . '/spacery.php' );

		preg_match( '/Text Domain:\s*(\S+)/', $header, $domain );

		$this->assertSame( I18n::DOMAIN, $domain[1] ?? '' );
		$this->assertDoesNotMatchRegularExpression(
			'/^\s*\*\s*Domain Path:/m',
			$header,
			'nothing is bundled, so there is no path to declare'
		);
	}
}
