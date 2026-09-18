<?php
/**
 * Installs the repository's compiled translations the way WordPress.org would.
 *
 * Run in CI with:
 *
 *     wp eval-file wp-content/plugins/spacery/bin/install-language-pack.php
 *
 * Spacery ships no `languages` directory -- `package.json#files` does not list
 * it, and `load_plugin_textdomain()` went with the bundled files (D20). So the
 * only faithful way to test a translation is to put the compiled files where a
 * language pack goes: `WP_LANG_DIR/plugins`, under the names core looks for.
 * For the `.mo` that is `spacery-<locale>.mo`; for the script payloads it is an
 * md5 of each bundle's path relative to the plugin root, which is why they look
 * arbitrary. `bin/make-translations.sh` writes and asserts those names.
 *
 * This runs through WP-CLI rather than as a `cp` in the workflow for two
 * reasons: `WP_LANG_DIR` is the site's answer rather than a path to guess, and
 * a copy that silently moved nothing would surface two steps later as "the site
 * is in English", which is the diagnosis `bin/locale-check.php` exists to avoid
 * having to make twice.
 *
 * No `declare( strict_types=1 )` here, deliberately, for the reason
 * `bin/locale-check.php` gives at length: `wp eval-file` hands the file to
 * `eval()`, where a `declare()` is not legal.
 *
 * @package Spacery
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit( 1 );
}

$spacery_source = WP_PLUGIN_DIR . '/spacery/languages';
$spacery_target = WP_LANG_DIR . '/plugins';

if ( ! is_dir( $spacery_source ) ) {
	fwrite( STDERR, "No compiled translations at {$spacery_source}.\n" );
	exit( 1 );
}

if ( ! wp_mkdir_p( $spacery_target ) ) {
	fwrite( STDERR, "Could not create {$spacery_target}.\n" );
	exit( 1 );
}

$spacery_files = array_merge(
	glob( $spacery_source . '/spacery-*.mo' ) ?: array(),
	glob( $spacery_source . '/spacery-*.json' ) ?: array()
);

if ( array() === $spacery_files ) {
	fwrite( STDERR, "Nothing to install. Run 'pnpm run i18n:build' first.\n" );
	exit( 1 );
}

foreach ( $spacery_files as $spacery_file ) {
	$spacery_destination = $spacery_target . '/' . basename( $spacery_file );

	if ( ! copy( $spacery_file, $spacery_destination ) ) {
		fwrite( STDERR, "Could not write {$spacery_destination}.\n" );
		exit( 1 );
	}

	printf( "%s\n", $spacery_destination );
}

printf( "\nOK: installed %d files into %s.\n", count( $spacery_files ), $spacery_target );
