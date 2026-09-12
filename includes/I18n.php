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
 * **The call is still the only thing that finds Spacery's own translations**
 * (D20). Plugin Check warns that `load_plugin_textdomain()` has been
 * discouraged since 4.6, which is true of the plugin it was written about: one
 * whose translations arrive in `WP_LANG_DIR/plugins` from
 * translate.wordpress.org, where just-in-time loading finds them with no
 * registration at all. Spacery also ships Greek inside the plugin, and that is
 * a path nothing looks in by default. Read against 7.1:
 * `_load_textdomain_just_in_time()` asks `WP_Textdomain_Registry`, whose
 * `get_path_from_lang_dir()` searches the standard language directories and
 * then falls back to a *custom path* -- and `set_custom_path()` is called from
 * exactly one place, this function. Remove the call and `languages/` becomes
 * dead weight in the zip.
 *
 * That ordering is also why the bundled files cannot shadow anything: the
 * standard locations are searched first, so a language pack from
 * translate.wordpress.org wins the moment one exists.
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
		/*
		 * Priority 0, for the half of the timing this class's docblock does not
		 * cover. `init` is late enough to avoid the notice; priority 0 is early
		 * enough to beat anything that registers a block on `init`, because
		 * `register_block_type_from_metadata()` translates the titles in
		 * `block.json` as it registers them. Today `Plugin::boot()` happens to
		 * construct this class first, which would be enough -- but that is an
		 * ordering nothing states and a reordered constructor would silently
		 * untranslate every block title.
		 */
		add_action( 'init', array( $this, 'load_textdomain' ), 0 );
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
