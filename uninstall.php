<?php
/**
 * Removes Spacery's stored settings when the plugin is deleted — and only when
 * the site asked for that (decision D24).
 *
 * **Deleting is opt-in, and off by default, because it is not neutral
 * cleanup.** The stored breakpoint set is the key every stored block value
 * resolves through: `Generator::normalize()` walks the *current* set and
 * silently skips slugs it does not recognise. Drop the options and a later
 * reinstall falls back to Spacery's preset, whose slugs are `desktop`,
 * `laptop`, `tablet` and `mobile` — so a custom set that used those names keeps
 * resolving at *different widths*, and one that used any other names has its
 * values pruned. Both are silent. That is the same damage `docs/rename-spike.md`
 * refuses to risk for a rename, and the reasoning does not change because the
 * trigger is a deletion.
 *
 * So the author says yes on the settings screen first, and the default leaves
 * two rows in `wp_options` behind — which is the cost this file exists to make
 * a choice rather than an accident.
 *
 * Spacery's values inside post content are never touched here, by design
 * (§3.1). They are block attributes in the comment delimiter, they are inert
 * without the plugin, and walking every post to rewrite them is precisely what
 * this plugin promises never to do.
 *
 * @package Spacery
 */

declare( strict_types=1 );

// Only ever reached through WordPress's own delete flow.
defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

/*
 * Literals, not class constants. This file runs with no autoloader and no
 * plugin code loaded — that is what makes it safe to run against a plugin whose
 * files are about to disappear. The names are defined in
 * `includes/Settings/Options.php` and `includes/Breakpoints/Registry.php`, and
 * `OptionsTest` asserts that these three strings still match them.
 */
const SPACERY_UNINSTALL_CONSENT = 'spacery_delete_data';
const SPACERY_UNINSTALL_OPTIONS = array(
	'spacery_breakpoint_source',
	'spacery_custom_breakpoints',
	'spacery_delete_data',
);

/**
 * Deletes Spacery's options on the current site, if this site opted in.
 *
 * The consent is read per site rather than per network: on multisite each site
 * has its own settings screen and its own breakpoints, so one site's choice
 * cannot speak for another's.
 */
function spacery_uninstall_current_site(): void {
	if ( ! get_option( SPACERY_UNINSTALL_CONSENT ) ) {
		return;
	}

	foreach ( SPACERY_UNINSTALL_OPTIONS as $option ) {
		delete_option( $option );
	}
}

if ( is_multisite() ) {
	/*
	 * `number => 0` because a partial uninstall is worse than a slow one: a
	 * network where only the first hundred sites were cleaned is a state nobody
	 * can reason about afterwards.
	 */
	foreach ( get_sites( array( 'fields' => 'ids', 'number' => 0 ) ) as $spacery_site_id ) {
		switch_to_blog( (int) $spacery_site_id );
		spacery_uninstall_current_site();
		restore_current_blog();
	}
} else {
	spacery_uninstall_current_site();
}
