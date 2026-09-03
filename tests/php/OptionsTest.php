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
}
