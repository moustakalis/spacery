<?php
/**
 * Plugin Name:       Spacery
 * Plugin URI:        https://github.com/moustakalis/spacery
 * Description:       Responsive spacing for the block editor — unlimited, theme-defined breakpoints for any block.
 * Version:           1.0.0
 * Requires at least: 7.1
 * Requires PHP:      8.2
 * Author:            Nickos Moustakas
 * Author URI:        https://github.com/moustakalis
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       spacery
 * Domain Path:       /languages
 *
 * @package Spacery
 */

declare( strict_types=1 );

namespace Spacery;

defined( 'ABSPATH' ) || exit;

/**
 * Absolute path to this file. Used for plugin_dir_url(), activation hooks and
 * anything else that needs to identify the plugin entry point.
 */
const PLUGIN_FILE = __FILE__;

/**
 * Plugin version. Kept in sync with the header above and readme.txt by
 * `npm run sync-version`; the header is the source of truth.
 */
const VERSION = '1.0.0';

/**
 * Minimum supported environment. Checked at load so an unsupported site gets an
 * admin notice rather than a fatal error.
 */
const MIN_WP  = '7.1';
const MIN_PHP = '8.2';

require_once __DIR__ . '/includes/Autoloader.php';

Autoloader::register();

/**
 * Boots the plugin once the environment is known to be supported.
 *
 * Hooked to `plugins_loaded` rather than running at file scope so that other
 * plugins and the theme are available, and so tests can load this file without
 * side effects beyond registering the autoloader.
 */
add_action(
	'plugins_loaded',
	static function (): void {
		if ( ! Requirements::are_met() ) {
			Requirements::register_notice();
			return;
		}

		Plugin::instance()->boot();
	}
);
