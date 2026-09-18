<?php
/**
 * Translations.
 *
 * @package Spacery
 */

declare( strict_types=1 );

namespace Spacery;

defined( 'ABSPATH' ) || exit;

/**
 * Points Spacery's own scripts at the translations WordPress already has.
 *
 * **There is nothing here to load, and that is the point.** A plugin in the
 * WordPress.org directory receives its translations as a language pack in
 * `WP_LANG_DIR/plugins`, where core's just-in-time loading finds them with no
 * registration at all. That is why `load_plugin_textdomain()` has been
 * discouraged since 4.6, and why Plugin Check reports it.
 *
 * Spacery needed it for exactly one reason: it shipped a Greek `.mo` inside the
 * plugin, and `WP_Textdomain_Registry::set_custom_path()` -- the only thing that
 * makes WordPress look inside a plugin for a translation -- is called from that
 * function and nowhere else. The plugin no longer ships one, so the call went
 * with the files that needed it. The `.po`, the `.mo` and the script payloads
 * stay in the repository, to seed translate.wordpress.org and to give CI a pack
 * to install; `package.json#files` does not list `languages`. D20.
 *
 * The JavaScript half is not automatic for a script a plugin enqueues itself,
 * so it still has to be told which domain a handle belongs to. It is **not**
 * given a path. A path is where the `<domain>-<locale>-<handle>.json` lookup
 * happens, and that is the one lookup a language pack cannot satisfy: a pack is
 * named after `md5( 'build/settings.js' )`. Passing a directory Spacery no
 * longer fills would add a miss in front of the lookup that works.
 * `bin/make-pot.sh` is where the naming is explained at length.
 */
final class I18n {

	/** Text domain. Matches the plugin header and every `__()` call. */
	public const DOMAIN = 'spacery';

	/**
	 * Points a script at Spacery's translations.
	 *
	 * Blocks registered from metadata get this for free --
	 * `register_block_type_from_metadata()` calls it whenever `block.json`
	 * declares a `textdomain`. Scripts Spacery enqueues itself do not, so each
	 * one calls this after registering.
	 *
	 * @param string $handle A registered script handle.
	 */
	public static function set_script_translations( string $handle ): void {
		wp_set_script_translations( $handle, self::DOMAIN );
	}
}
