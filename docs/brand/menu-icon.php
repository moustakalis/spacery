<?php
/**
 * Spacery's admin menu icon.
 *
 * The mark exactly as approved: three bars on the top side at 8 / 6 / 4
 * thickness, on a 77-unit grid. Never reduced.
 *
 * WordPress masks menu icons to the active admin colour scheme, so the SVG
 * must be single-colour with fill="currentColor". The mark survives that
 * because its bars differ by thickness, not hue.
 *
 * The box is 24px rather than the 20px WordPress uses for dashicons. At 20px
 * the mark's thinnest bar lands near 1.04px and renders as a hairline; at 24px
 * it reaches 1.25px and holds. WordPress scales the SVG to the menu slot, so
 * the larger box costs nothing and the geometry stays untouched.
 *
 * Usage:
 *     add_menu_page(
 *         __( 'Spacery', 'spacery' ),
 *         __( 'Spacery', 'spacery' ),
 *         'manage_options',
 *         'spacery',
 *         array( Screen::class, 'render' ),
 *         spacery_menu_icon(),
 *         81
 *     );
 *
 * @return string A base64 data URI, which is what \$icon_url accepts.
 */
function spacery_menu_icon(): string {
	$svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 77 77" width="24" height="24" role="img" aria-label="Spacery"><rect x="18" y="0" width="41" height="8" rx="4" fill="currentColor"/><rect x="18" y="19" width="41" height="6" rx="3" fill="currentColor"/><rect x="18" y="36" width="41" height="4" rx="2" fill="currentColor"/><rect x="18" y="69" width="41" height="8" rx="4" fill="currentColor"/><rect x="0" y="18" width="8" height="41" rx="4" fill="currentColor"/><rect x="69" y="18" width="8" height="41" rx="4" fill="currentColor"/></svg>';

	return 'data:image/svg+xml;base64,' . base64_encode( $svg );
}
