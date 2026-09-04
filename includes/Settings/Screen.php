<?php
/**
 * The Spacery settings screen.
 *
 * @package Spacery
 */

declare( strict_types=1 );

namespace Spacery\Settings;

defined( 'ABSPATH' ) || exit;

/**
 * Mounts the settings app on its own top-level admin menu (D16).
 *
 * A React app rather than a Settings API form, for one reason that outweighs
 * the extra bundle: the screen's central control is a list of N breakpoints the
 * user adds, edits, removes and sees reordered by width. A repeater is where
 * hand-written admin forms turn into hand-written JavaScript anyway, and doing
 * it with `@wordpress/components` means the screen looks like the editor it
 * configures instead of like 2011.
 *
 * The page renders an empty container. Everything else is the bundle, which
 * talks to `/wp/v2/settings` for the stored values and `spacery/v1/breakpoints`
 * for what each source contains.
 */
final class Screen {

	/** Menu slug, and the container element's id. */
	public const SLUG = 'spacery';

	/** Script handle. Public so {@see Screen::HANDLE} can be set translations. */
	public const HANDLE = 'spacery-settings';

	/**
	 * Dashicon for the menu. The same one `block.json` gives the Spacer, so the
	 * menu and the block are recognisably one plugin.
	 */
	private const ICON = 'dashicons-image-flip-vertical';

	/**
	 * Menu position: immediately below Appearance (60), above Plugins (65).
	 *
	 * A float on purpose. `$menu` is keyed by position, so two plugins claiming
	 * the same integer means one of them silently disappears; a fractional
	 * position is the documented way to make that collision unlikely.
	 */
	private const POSITION = 60.8;

	/**
	 * Hook suffix returned by add_menu_page(), used to enqueue on this page
	 * alone. Assets on every admin screen would be a plugin behaving badly.
	 */
	private string $hook = '';

	/**
	 * Attaches hooks.
	 */
	public function register(): void {
		add_action( 'admin_menu', array( $this, 'add_page' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue' ) );
	}

	/**
	 * Adds the top-level menu page.
	 *
	 * No submenu is registered, so WordPress renders the item on its own with
	 * no flyout. Adding one would duplicate the parent as its first child,
	 * which is the usual reason a single-screen plugin's menu looks wrong.
	 */
	public function add_page(): void {
		$hook = add_menu_page(
			__( 'Spacery', 'spacery' ),
			__( 'Spacery', 'spacery' ),
			'manage_options',
			self::SLUG,
			array( $this, 'render' ),
			self::ICON,
			self::POSITION
		);

		$this->hook = is_string( $hook ) ? $hook : '';
	}

	/**
	 * The container the app mounts into.
	 *
	 * `wrap` so WordPress positions admin notices correctly; everything inside
	 * belongs to the app.
	 */
	public function render(): void {
		printf(
			'<div class="wrap"><div id="%s"></div></div>',
			esc_attr( self::SLUG . '-settings' )
		);
	}

	/**
	 * Loads the settings bundle on this screen only.
	 *
	 * @param string $hook_suffix The current admin page.
	 */
	public function enqueue( string $hook_suffix ): void {
		if ( '' === $this->hook || $hook_suffix !== $this->hook ) {
			return;
		}

		$directory = dirname( \Spacery\PLUGIN_FILE );
		$asset     = $directory . '/build/settings.asset.php';

		if ( ! is_readable( $asset ) ) {
			return;
		}

		$meta = require $asset;

		if ( ! is_array( $meta ) ) {
			return;
		}

		$dependencies = $meta['dependencies'] ?? array();
		$version      = $meta['version'] ?? \Spacery\VERSION;

		wp_enqueue_script(
			self::HANDLE,
			plugins_url( 'build/settings.js', \Spacery\PLUGIN_FILE ),
			is_array( $dependencies ) ? $dependencies : array(),
			is_string( $version ) ? $version : \Spacery\VERSION,
			array( 'in_footer' => true )
		);

		\Spacery\I18n::set_script_translations( self::HANDLE );

		// The app is built from @wordpress/components, which ships its own CSS.
		wp_enqueue_style( 'wp-components' );
	}
}
