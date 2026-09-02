<?php
/**
 * Translation loading.
 *
 * @package Spacery
 */

declare( strict_types=1 );

namespace Spacery;

defined( 'ABSPATH' ) || exit;

/**
 * Makes Spacery's strings translatable in PHP and in JavaScript.
 *
 * v1 shipped `__()` calls with no text domain loading and no script
 * translations at all, so every translatable string was translatable in theory
 * only. This is the whole of what was missing.
 *
 * **On `init`, not earlier.** Since WordPress 6.7 `load_plugin_textdomain()` no
 * longer loads anything itself — it registers a path and hands off to
 * just-in-time loading — and `_load_textdomain_just_in_time()` calls
 * `_doing_it_wrong()` for any domain first needed before `after_setup_theme`.
 * Loading on `plugins_loaded`, as plugins did for a decade, is now the way to
 * get a notice rather than the way to avoid one.
 *
 * The call is still worth making. A site that installs Spacery from WordPress.org
 * gets its translations from `WP_LANG_DIR/plugins`, which just-in-time loading
 * finds without any registration at all; a site that installs from GitHub has
 * them inside the plugin, and nothing would look there otherwise.
 */
final class I18n {

	/** Text domain. Matches the plugin header and every `__()` call. */
	public const DOMAIN = 'spacery';

	/** Where translations live inside the plugin, matching `Domain Path`. */
	public const PATH = '/languages';

	/**
	 * Attaches hooks.
	 */
	public function register(): void {
		add_action( 'init', array( $this, 'load_textdomain' ) );
	}

	/**
	 * Registers the plugin's own languages directory.
	 */
	public function load_textdomain(): void {
		load_plugin_textdomain(
			self::DOMAIN,
			false,
			dirname( plugin_basename( PLUGIN_FILE ) ) . self::PATH
		);
	}

	/**
	 * Points a script at Spacery's translations.
	 *
	 * Blocks registered from metadata get this for free — `register_block_type_from_metadata()`
	 * calls it whenever `block.json` declares a `textdomain`. Scripts Spacery
	 * enqueues itself do not, so each one calls this after registering.
	 *
	 * @param string $handle A registered script handle.
	 */
	public static function set_script_translations( string $handle ): void {
		wp_set_script_translations(
			$handle,
			self::DOMAIN,
			dirname( PLUGIN_FILE ) . self::PATH
		);
	}
}
