<?php
/**
 * Settings sanitization tests.
 *
 * @package Spacery
 */

declare( strict_types=1 );

namespace Spacery\Tests;

use PHPUnit\Framework\TestCase;
use Spacery\Breakpoints\Registry;
use Spacery\Settings\Options;

/**
 * The settings screen is one client of these sanitizers, not the authority.
 *
 * Everything the screen can submit, WP-CLI and any other REST client can submit
 * too, so the rules live here and are asserted here.
 */
final class OptionsTest extends TestCase {

	private Options $options;

	protected function setUp(): void {
		spacery_test_reset();

		$this->options = new Options();
	}

	public function test_keeps_a_source_it_recognizes(): void {
		$this->assertSame(
			Registry::SOURCE_CUSTOM,
			$this->options->sanitize_source( Registry::SOURCE_CUSTOM )
		);
	}

	/**
	 * Matching `Registry::source()`, which treats an unrecognized stored value
	 * as "not chosen" rather than as an error. A hand-edited option must not be
	 * able to break the editor.
	 */
	public function test_treats_an_unknown_source_as_unset(): void {
		$this->assertSame( '', $this->options->sanitize_source( 'tailwind' ) );
		$this->assertSame( '', $this->options->sanitize_source( 42 ) );
		$this->assertSame( '', $this->options->sanitize_source( null ) );
	}

	/**
	 * What is stored is what the registry will resolve: ordered widest-first,
	 * with labels filled in. Storing the submitted order instead would make the
	 * option and the resolved set two different things.
	 */
	public function test_stores_a_valid_set_in_canonical_form(): void {
		$stored = $this->options->sanitize_breakpoints(
			array(
				array(
					'slug' => 'mobile',
					'max'  => '480px',
				),
				array(
					'slug'  => 'laptop',
					'label' => 'Laptop',
					'max'   => '1024px',
				),
			)
		);

		$this->assertSame(
			array(
				array(
					'slug'  => 'laptop',
					'label' => 'Laptop',
					'max'   => '1024px',
				),
				array(
					'slug'  => 'mobile',
					'label' => 'Mobile',
					'max'   => '480px',
				),
			),
			$stored
		);
	}

	public function test_an_empty_set_clears_the_option(): void {
		$this->assertSame( array(), $this->options->sanitize_breakpoints( array() ) );
	}

	/**
	 * Wholesale rejection, matching `BreakpointSet::from_array()`. Keeping the
	 * valid half would leave the site with breakpoints nobody asked for.
	 */
	public function test_refuses_an_invalid_set_and_keeps_what_was_there(): void {
		$GLOBALS['spacery_test_options'][ Registry::OPTION_CUSTOM ] = array(
			array(
				'slug'  => 'tablet',
				'label' => 'Tablet',
				'max'   => '782px',
			),
		);

		$stored = $this->options->sanitize_breakpoints(
			array(
				array(
					'slug'  => 'laptop',
					'label' => 'Laptop',
					'max'   => '1024px',
				),
				array(
					'slug'  => 'broken',
					'label' => 'Broken',
					'max'   => '80%',
				),
			)
		);

		$this->assertSame(
			array(
				array(
					'slug'  => 'tablet',
					'label' => 'Tablet',
					'max'   => '782px',
				),
			),
			$stored
		);
	}

	/**
	 * A refusal the user is never told about is indistinguishable from a save.
	 *
	 * Only where `add_settings_error()` exists, which is not a REST request —
	 * the settings screen learns of a refusal by comparing what came back with
	 * what it sent instead. The bootstrap defines the stub, so this exercises
	 * the branch that is taken in an admin-side save.
	 */
	public function test_a_refusal_registers_an_error(): void {
		$this->options->sanitize_breakpoints(
			array(
				array(
					'slug'  => 'x',
					'label' => 'X',
					'max'   => 'wide',
				),
			)
		);

		$this->assertCount( 1, $GLOBALS['spacery_test_settings_errors'] );
		$this->assertSame(
			Registry::OPTION_CUSTOM,
			$GLOBALS['spacery_test_settings_errors'][0]['setting']
		);
	}

	public function test_two_breakpoints_may_not_share_a_width(): void {
		$stored = $this->options->sanitize_breakpoints(
			array(
				array(
					'slug'  => 'a',
					'label' => 'A',
					'max'   => '48rem',
				),
				array(
					'slug'  => 'b',
					'label' => 'B',
					'max'   => '768px',
				),
			)
		);

		$this->assertSame( array(), $stored );
	}

	public function test_a_non_array_submission_changes_nothing(): void {
		$this->assertSame( array(), $this->options->sanitize_breakpoints( 'nonsense' ) );
	}

	/**
	 * D24's consent, read defensively.
	 *
	 * False is the default and false is what an unreadable value becomes,
	 * because the destructive reading of an ambiguous option is the wrong one:
	 * a corrupted row should leave the settings alone rather than delete them.
	 *
	 * Stored as `'1'`/`'0'` rather than as a boolean, because WordPress writes
	 * boolean false into a varchar column and it returns as `''` — which
	 * `rest_is_boolean()` rejects, so `/wp/v2/settings` would answer `null` for
	 * a site that had explicitly opted out. Measured on a live install before
	 * the storage was changed.
	 *
	 * @dataProvider provide_delete_data_values
	 *
	 * @param mixed  $value    Stored or submitted value.
	 * @param string $expected What it must sanitize to.
	 */
	public function test_sanitizes_the_delete_consent( mixed $value, string $expected ): void {
		$this->assertSame( $expected, $this->options->sanitize_delete_data( $value ) );
	}

	/**
	 * Every one of these survives a WordPress round trip and satisfies
	 * `rest_is_boolean()`, which a bare boolean false does not.
	 *
	 * @return array<string, array{mixed, string}>
	 */
	public static function provide_delete_data_values(): array {
		return array(
			'true'           => array( true, '1' ),
			'false'          => array( false, '0' ),
			'one'            => array( 1, '1' ),
			'zero'           => array( 0, '0' ),
			'string "true"'  => array( 'true', '1' ),
			/*
			 * The case a plain (bool) cast gets wrong, and the reason this
			 * sanitizer mirrors rest_sanitize_boolean() rather than casting.
			 */
			'string "false"' => array( 'false', '0' ),
			'string "FALSE"' => array( 'FALSE', '0' ),
			'string "0"'     => array( '0', '0' ),
			'empty string'   => array( '', '0' ),
			'null'           => array( null, '0' ),
			'array'          => array( array(), '0' ),
		);
	}

	/**
	 * The one seam this project cannot close, so a test watches it.
	 *
	 * `uninstall.php` runs with no autoloader and no plugin code loaded — that
	 * is what makes it safe to run against files that are about to be removed —
	 * so it must repeat the option names as literals. Nothing at runtime would
	 * notice them drifting from the constants: a renamed option would simply
	 * stop being deleted, silently, on a path nobody exercises twice. The same
	 * reasoning as `BreakpointPatternsTest` and D19.
	 */
	public function test_uninstall_repeats_the_option_names_this_class_registers(): void {
		$source = (string) file_get_contents( dirname( __DIR__, 2 ) . '/uninstall.php' );

		foreach ( array( Registry::OPTION_SOURCE, Registry::OPTION_CUSTOM, Options::OPTION_DELETE_DATA ) as $option ) {
			$this->assertStringContainsString(
				"'" . $option . "'",
				$source,
				"uninstall.php does not name the {$option} option."
			);
		}
	}

	/**
	 * It must not reach for anything that will not be there.
	 *
	 * A `use Spacery\...` or a class reference would fatal at exactly the
	 * moment nothing is watching, and WordPress would report a failed
	 * uninstall rather than a broken file.
	 */
	public function test_uninstall_loads_no_plugin_code(): void {
		$source = (string) file_get_contents( dirname( __DIR__, 2 ) . '/uninstall.php' );

		$this->assertStringNotContainsString( 'Spacery\\', $source );
		$this->assertStringNotContainsString( 'require', $source );
		$this->assertStringContainsString( "defined( 'WP_UNINSTALL_PLUGIN' )", $source );
	}
}
