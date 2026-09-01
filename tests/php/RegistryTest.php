<?php
/**
 * Registry tests.
 *
 * @package Spacery
 */

declare( strict_types=1 );

namespace Spacery\Tests;

use PHPUnit\Framework\TestCase;
use Spacery\Breakpoints\BreakpointSet;
use Spacery\Breakpoints\Registry;

/**
 * Covers source selection, theme reading, fallbacks and the filter.
 */
final class RegistryTest extends TestCase {

	protected function setUp(): void {
		spacery_test_reset();
	}

	/**
	 * Sets theme.json settings for the current test.
	 *
	 * @param array<mixed> $settings Settings tree.
	 */
	private function given_theme_settings( array $settings ): void {
		$GLOBALS['spacery_test_settings'] = $settings;
	}

	/**
	 * Sets an option for the current test.
	 *
	 * @param string $name  Option name.
	 * @param mixed  $value Option value.
	 */
	private function given_option( string $name, $value ): void {
		$GLOBALS['spacery_test_options'][ $name ] = $value;
	}

	// -- Default source ----------------------------------------------------

	public function test_defaults_to_spacery_when_theme_declares_nothing(): void {
		$registry = new Registry();

		$this->assertSame( Registry::SOURCE_SPACERY, $registry->default_source() );
		$this->assertSame(
			array( 'desktop', 'laptop', 'tablet', 'mobile' ),
			$registry->resolve()->slugs()
		);
	}

	/**
	 * A theme that declares nothing relevant must not be read as declaring
	 * breakpoints. This is the regression guard for wp_get_global_settings()
	 * returning the whole settings tree when a path is missing.
	 */
	public function test_unrelated_theme_settings_do_not_count_as_declaring(): void {
		$this->given_theme_settings(
			array(
				'color'      => array( 'palette' => array( array( 'slug' => 'base' ) ) ),
				'typography' => array( 'fontSizes' => array() ),
				'custom'     => array( 'somethingElse' => true ),
			)
		);

		$registry = new Registry();

		$this->assertFalse( $registry->theme_declares_breakpoints() );
		$this->assertSame( Registry::SOURCE_SPACERY, $registry->default_source() );
	}

	public function test_defaults_to_theme_when_viewport_is_declared(): void {
		$this->given_theme_settings(
			array(
				'viewport' => array(
					'mobile' => '30rem',
					'tablet' => '45rem',
				),
			)
		);

		$registry = new Registry();

		$this->assertSame( Registry::SOURCE_THEME, $registry->default_source() );
		$this->assertSame( array( 'tablet', 'mobile' ), $registry->resolve()->slugs() );
	}

	// -- Theme source ------------------------------------------------------

	public function test_reads_core_viewport_values_verbatim(): void {
		$this->given_theme_settings(
			array(
				'viewport' => array(
					'mobile' => '480px',
					'tablet' => '782px',
				),
			)
		);

		$queries = ( new Registry() )->resolve()->media_queries();

		// Byte-identical to WP_Theme_JSON::get_viewport_media_queries().
		$this->assertSame( '@media (480px < width <= 782px)', $queries['tablet'] );
		$this->assertSame( '@media (width <= 480px)', $queries['mobile'] );
	}

	public function test_theme_spacery_breakpoints_beat_core_viewport(): void {
		$this->given_theme_settings(
			array(
				'viewport' => array(
					'mobile' => '480px',
					'tablet' => '782px',
				),
				'custom'   => array(
					'spacery' => array(
						'breakpoints' => array(
							'wide'   => '1400px',
							'medium' => '900px',
							'small'  => '500px',
						),
					),
				),
			)
		);

		$this->assertSame(
			array( 'wide', 'medium', 'small' ),
			( new Registry() )->resolve()->slugs(),
			'a theme speaking to Spacery directly is the more specific intent'
		);
	}

	public function test_ignores_viewport_keys_core_does_not_define(): void {
		$this->given_theme_settings(
			array(
				'viewport' => array(
					'mobile'  => '480px',
					'tablet'  => '782px',
					'desktop' => '1280px',
				),
			)
		);

		$this->assertSame(
			array( 'tablet', 'mobile' ),
			( new Registry() )->resolve()->slugs(),
			'a future core key must not silently become a Spacery tier'
		);
	}

	public function test_falls_back_to_preset_when_theme_data_is_invalid(): void {
		$this->given_theme_settings(
			array( 'viewport' => array( 'mobile' => 'calc(100vw)' ) )
		);

		$this->assertSame(
			array( 'desktop', 'laptop', 'tablet', 'mobile' ),
			( new Registry() )->resolve()->slugs()
		);
	}

	// -- Explicit source selection -----------------------------------------

	public function test_explicit_spacery_source_overrides_a_declaring_theme(): void {
		$this->given_theme_settings(
			array( 'viewport' => array( 'mobile' => '480px' ) )
		);
		$this->given_option( Registry::OPTION_SOURCE, Registry::SOURCE_SPACERY );

		$this->assertSame(
			array( 'desktop', 'laptop', 'tablet', 'mobile' ),
			( new Registry() )->resolve()->slugs()
		);
	}

	public function test_custom_source_reads_the_option(): void {
		$this->given_option( Registry::OPTION_SOURCE, Registry::SOURCE_CUSTOM );
		$this->given_option(
			Registry::OPTION_CUSTOM,
			array(
				'huge' => '1600px',
				'tiny' => '400px',
			)
		);

		$this->assertSame( array( 'huge', 'tiny' ), ( new Registry() )->resolve()->slugs() );
	}

	public function test_custom_source_falls_back_when_option_is_empty(): void {
		$this->given_option( Registry::OPTION_SOURCE, Registry::SOURCE_CUSTOM );

		$this->assertSame(
			array( 'desktop', 'laptop', 'tablet', 'mobile' ),
			( new Registry() )->resolve()->slugs()
		);
	}

	public function test_custom_source_falls_back_when_option_is_invalid(): void {
		$this->given_option( Registry::OPTION_SOURCE, Registry::SOURCE_CUSTOM );
		$this->given_option( Registry::OPTION_CUSTOM, array( 'bad' => '10%' ) );

		$this->assertSame(
			array( 'desktop', 'laptop', 'tablet', 'mobile' ),
			( new Registry() )->resolve()->slugs()
		);
	}

	public function test_unknown_stored_source_is_treated_as_unset(): void {
		$this->given_option( Registry::OPTION_SOURCE, 'nonsense' );

		$registry = new Registry();

		$this->assertSame( Registry::SOURCE_SPACERY, $registry->source() );
	}

	// -- Filter ------------------------------------------------------------

	public function test_filter_has_the_last_word(): void {
		$replacement = BreakpointSet::from_array( array( 'only' => '900px' ) );

		add_filter(
			'spacery_breakpoints',
			static fn() => $replacement
		);

		$this->assertSame( array( 'only' ), ( new Registry() )->resolve()->slugs() );
	}

	public function test_filter_receives_the_active_source(): void {
		$seen = null;

		add_filter(
			'spacery_breakpoints',
			static function ( $set, $source ) use ( &$seen ) {
				$seen = $source;
				return $set;
			}
		);

		( new Registry() )->resolve();

		$this->assertSame( Registry::SOURCE_SPACERY, $seen );
	}

	public function test_filter_returning_garbage_is_ignored(): void {
		add_filter( 'spacery_breakpoints', static fn() => 'not a set' );

		$this->assertSame(
			array( 'desktop', 'laptop', 'tablet', 'mobile' ),
			( new Registry() )->resolve()->slugs(),
			'a careless filter must not break the editor'
		);
	}

	// -- Memoization -------------------------------------------------------

	public function test_resolution_is_memoized_per_instance(): void {
		$registry = new Registry();
		$first    = $registry->resolve();

		$this->given_option( Registry::OPTION_SOURCE, Registry::SOURCE_CUSTOM );

		$this->assertSame( $first, $registry->resolve() );
	}

	public function test_flush_discards_the_memo(): void {
		$registry = new Registry();

		$this->assertSame(
			array( 'desktop', 'laptop', 'tablet', 'mobile' ),
			$registry->resolve()->slugs()
		);

		$this->given_option( Registry::OPTION_SOURCE, Registry::SOURCE_CUSTOM );
		$this->given_option( Registry::OPTION_CUSTOM, array( 'only' => '900px' ) );
		$registry->flush();

		$this->assertSame( array( 'only' ), $registry->resolve()->slugs() );
	}

	public function test_flush_discards_memoized_theme_settings(): void {
		$registry = new Registry();
		$registry->resolve();

		$this->given_theme_settings(
			array( 'viewport' => array( 'mobile' => '400px' ) )
		);
		$registry->flush();

		$this->assertSame( array( 'mobile' ), $registry->resolve()->slugs() );
	}

	/**
	 * Saving the settings screen must invalidate the memo.
	 *
	 * Without this a single request that resolves, saves and resolves again
	 * would serve the pre-save answer -- which is exactly what the settings
	 * screen does in M6.
	 */
	public function test_option_writes_invalidate_the_memo(): void {
		$registry = new Registry();
		$registry->register();

		$this->assertSame(
			array( 'desktop', 'laptop', 'tablet', 'mobile' ),
			$registry->resolve()->slugs()
		);

		$this->given_option( Registry::OPTION_SOURCE, Registry::SOURCE_CUSTOM );
		$this->given_option( Registry::OPTION_CUSTOM, array( 'only' => '900px' ) );

		do_action( 'update_option_' . Registry::OPTION_SOURCE );

		$this->assertSame( array( 'only' ), $registry->resolve()->slugs() );
	}

	public function test_switching_theme_invalidates_the_memo(): void {
		$registry = new Registry();
		$registry->register();
		$registry->resolve();

		$this->given_theme_settings(
			array( 'viewport' => array( 'tablet' => '700px' ) )
		);

		do_action( 'switch_theme' );

		$this->assertSame( array( 'tablet' ), $registry->resolve()->slugs() );
	}

	// -- Preset ------------------------------------------------------------

	public function test_preset_is_valid_and_anchored_on_core(): void {
		$preset = ( new Registry() )->preset();

		$this->assertSame( 4, $preset->count() );
		$this->assertSame( '782px', $preset->get( 'tablet' )?->max, "core's tablet value" );
		$this->assertSame( '480px', $preset->get( 'mobile' )?->max, "core's mobile value" );
	}

	// -- Labels ------------------------------------------------------------

	/**
	 * Tiers Spacery names itself carry translated labels.
	 */
	public function test_preset_labels_are_translatable_strings(): void {
		$preset = ( new Registry() )->preset();

		$this->assertSame( 'Desktop', $preset->get( 'desktop' )?->label );
		$this->assertSame( 'Laptop', $preset->get( 'laptop' )?->label );
		$this->assertSame( 'Tablet', $preset->get( 'tablet' )?->label );
		$this->assertSame( 'Mobile', $preset->get( 'mobile' )?->label );
	}

	/**
	 * Core's viewport slugs are Spacery's own vocabulary too, so they are
	 * labelled rather than machine-cased.
	 */
	public function test_viewport_derived_tiers_are_labelled(): void {
		$this->given_theme_settings(
			array(
				'viewport' => array(
					'mobile' => '480px',
					'tablet' => '782px',
				),
			)
		);

		$set = ( new Registry() )->resolve();

		$this->assertSame( 'Tablet', $set->get( 'tablet' )?->label );
		$this->assertSame( 'Mobile', $set->get( 'mobile' )?->label );
	}

	/**
	 * A theme's invented slug has no translatable source string, so it gets the
	 * machine fallback and is not pretended to be translated.
	 */
	public function test_theme_invented_slugs_get_the_machine_fallback(): void {
		$this->given_theme_settings(
			array(
				'custom' => array(
					'spacery' => array(
						'breakpoints' => array( 'grand-ecran' => '1400px' ),
					),
				),
			)
		);

		$this->assertSame(
			'Grand Ecran',
			( new Registry() )->resolve()->get( 'grand-ecran' )?->label
		);
	}

	public function test_theme_supplied_labels_pass_through_untouched(): void {
		$this->given_theme_settings(
			array(
				'custom' => array(
					'spacery' => array(
						'breakpoints' => array(
							array(
								'slug'  => 'wide',
								'label' => 'Grand écran',
								'max'   => '1400px',
							),
						),
					),
				),
			)
		);

		$this->assertSame(
			'Grand écran',
			( new Registry() )->resolve()->get( 'wide' )?->label
		);
	}

	// -- Internal invariant ------------------------------------------------

	/**
	 * Guards the one deliberately fatal branch in the class.
	 *
	 * Registry::preset() throws if PRESET is invalid, unlike every other path,
	 * which falls back. The distinction is intentional: external data (a
	 * theme.json, an option) must never break a site, while an invalid internal
	 * constant is a programming error that should be loud. This test is what
	 * makes the throw unreachable in practice.
	 */
	public function test_the_built_in_preset_is_valid(): void {
		$preset = ( new Registry() )->preset();

		$this->assertSame( array( 'desktop', 'laptop', 'tablet', 'mobile' ), $preset->slugs() );
		$this->assertLessThanOrEqual(
			\Spacery\Breakpoints\BreakpointSet::MAX_BREAKPOINTS,
			$preset->count()
		);
	}
}
