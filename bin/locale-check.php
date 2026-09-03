<?php
/**
 * Says whether the site is actually running Spacery's Greek translations, and
 * why not when it is not.
 *
 * Run in CI with:
 *
 *     wp eval-file wp-content/plugins/spacery/bin/locale-check.php
 *
 * This exists because the first version of that CI step was a bare
 * `wp eval 'echo __( "Save changes", "spacery" );'` piped into `grep`. When it
 * failed, all it could say was that the output was English -- which is true of
 * a missing .mo, a plugin that never booted, a text domain registered at the
 * wrong path, and a site that is not in Greek at all. Every one of those was
 * plausible and none of them was ruled out, so the check now prints what it
 * found before asserting anything.
 *
 * The actual answer, the first time, was the last of them: `wp option update
 * WPLANG el` silently does nothing on a site with no Greek language pack.
 * `sanitize_option()` restricts WPLANG to `get_available_languages()`, which is
 * a glob of `WP_LANG_DIR/*.mo`, and puts the previous value back otherwise
 * (wp-includes/formatting.php). WP-CLI reports success because `update_option()`
 * was called; the option keeps its old value. See the CI workflow, which now
 * installs the language pack rather than assuming the option took.
 *
 * @package Spacery
 */

declare( strict_types=1 );

if ( ! defined( 'ABSPATH' ) ) {
	exit( 1 );
}

/** @var WP_Textdomain_Registry $wp_textdomain_registry */
global $wp_textdomain_registry;

$spacery_domain   = 'spacery';
$spacery_locale   = determine_locale();
$spacery_expected = 'Αποθήκευση αλλαγών';
$spacery_actual   = __( 'Save changes', 'spacery' );

$spacery_report = array(
	'determine_locale()'      => $spacery_locale,
	'get_locale()'            => get_locale(),
	'WPLANG option'           => var_export( get_option( 'WPLANG' ), true ),
	'available languages'     => implode( ', ', get_available_languages() ) ?: '(none)',
	'plugin booted'           => (
		class_exists( '\Spacery\Plugin' ) && \Spacery\Plugin::instance()->has_booted()
	) ? 'yes' : 'no',
	'registered path'         => var_export(
		$wp_textdomain_registry->get( $spacery_domain, $spacery_locale ),
		true
	),
	'.mo readable'            => is_readable(
		WP_PLUGIN_DIR . "/spacery/languages/spacery-{$spacery_locale}.mo"
	) ? 'yes' : 'no',
	'text domain loaded'      => is_textdomain_loaded( $spacery_domain ) ? 'yes' : 'no',
	'__( "Save changes" )'    => $spacery_actual,
);

foreach ( $spacery_report as $spacery_label => $spacery_value ) {
	printf( "%-22s %s\n", $spacery_label . ':', (string) $spacery_value );
}

if ( $spacery_expected !== $spacery_actual ) {
	fwrite(
		STDERR,
		"\nExpected '{$spacery_expected}', got '{$spacery_actual}'.\n"
	);
	exit( 1 );
}

echo "\nOK: PHP is serving Spacery's Greek strings.\n";
