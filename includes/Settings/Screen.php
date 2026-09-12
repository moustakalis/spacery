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

	/** The global the screen's own data is published under. */
	public const DATA_GLOBAL = 'spacerySettingsScreen';

	/**
	 * Where the footer sends someone who wants to read more, or ask.
	 *
	 * The repository rather than the directory listing, because the listing
	 * does not exist until the plugin has been reviewed and the support forum
	 * only exists alongside it. Both of these are live now, which is the whole
	 * requirement for a link the author can click today.
	 */
	private const DOCS_URL    = 'https://github.com/moustakalis/spacery#readme';
	private const SUPPORT_URL = 'https://github.com/moustakalis/spacery/issues';

	/**
	 * The menu icon: Spacery's own mark, not a dashicon.
	 *
	 * Three facts about how WordPress renders this, all read from 7.1.0 source
	 * rather than from guidance, because each one constrains the markup.
	 *
	 * `wp-admin/js/svg-painter.js` recolours the icon to the active admin
	 * scheme by decoding the data URI and running
	 * `xml.replace( /fill="(.+?)"/g, 'fill="' + color + '"' )`
	 * over it. It rewrites *every* fill, whatever the value, so the literal
	 * here is irrelevant to the result -- what matters is that each shape
	 * carries a `fill` attribute at all. `currentColor` is used because it is
	 * also correct if this markup is ever rendered inline, where the painter
	 * does not run.
	 *
	 * Nothing here may carry a `style` attribute. The next line of the painter
	 * is `xml.replace( /style="(.+?)"/g, 'style="fill:' + color + '"' )`,
	 * which replaces the whole attribute rather than the fill inside it, so any
	 * other declaration in a `style` would be silently destroyed.
	 *
	 * The declared size is 20 because that is what is rendered:
	 * `#adminmenu div.wp-menu-image.svg` sets `background-size: 20px auto`, so
	 * the box scales to 20 regardless of what the SVG asks for. The mark's
	 * thinnest bar is 4/77 of the box and therefore lands near 1px, which is
	 * the mark at interface scale (D18) rather than a defect -- and declaring a
	 * larger box would not change it.
	 *
	 * Kept as readable markup and encoded when used, rather than pasted in
	 * pre-encoded: a base64 blob in source is unreviewable, both for anyone
	 * reading this file and for the directory's own review.
	 */
	private const ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 77 77" width="20" height="20"><rect x="18" y="0" width="41" height="8" rx="4" fill="currentColor"/><rect x="18" y="19" width="41" height="6" rx="3" fill="currentColor"/><rect x="18" y="36" width="41" height="4" rx="2" fill="currentColor"/><rect x="18" y="69" width="41" height="8" rx="4" fill="currentColor"/><rect x="0" y="18" width="8" height="41" rx="4" fill="currentColor"/><rect x="69" y="18" width="8" height="41" rx="4" fill="currentColor"/></svg>';

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
			self::icon(),
			self::POSITION
		);

		$this->hook = is_string( $hook ) ? $hook : '';
	}

	/**
	 * The menu icon as a data URI, which is what `add_menu_page()`'s
	 * `$icon_url` accepts for anything that is not a dashicon.
	 *
	 * Public so the mark can be asserted without booting an admin screen, and
	 * so anything else in this plugin's admin can draw it from one place.
	 */
	public static function icon(): string {
		// phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode -- required by add_menu_page().
		return 'data:image/svg+xml;base64,' . base64_encode( self::ICON_SVG );
	}

	/**
	 * What the screen itself needs, as opposed to what it configures.
	 *
	 * The version it signs itself with, and where to send someone for help.
	 * Public so it can be asserted without booting an admin screen.
	 *
	 * @return array<string, string>
	 */
	public static function data(): array {
		return array(
			'version'    => \Spacery\VERSION,
			'docsUrl'    => self::DOCS_URL,
			'supportUrl' => self::SUPPORT_URL,
		);
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

		/*
		 * `before` the bundle, so the global exists by the time the module
		 * runs -- the same arrangement the editor settings use, for the same
		 * reason. Nothing the screen does depends on this arriving; the
		 * accessor in `screen.ts` falls back to empty strings and the header
		 * tag and footer simply do not render.
		 */
		wp_add_inline_script(
			self::HANDLE,
			sprintf(
				'window.%s = %s;',
				self::DATA_GLOBAL,
				(string) wp_json_encode( self::data() )
			),
			'before'
		);

		\Spacery\I18n::set_script_translations( self::HANDLE );

		// The app is built from @wordpress/components, which ships its own CSS.
		wp_enqueue_style( 'wp-components' );

		/*
		 * The screen's own states: a tinted row and a coloured field border,
		 * neither of which can be reached from a React prop because the border
		 * belongs to a component's own markup. Emitted by `wp-scripts` from
		 * `src/settings/style.scss`, following the same naming as the spacer
		 * block's `style-index.css`.
		 *
		 * Guarded, because `build/` is gitignored and a tree that has only
		 * ever been committed from has no stylesheet: the screen then renders
		 * without its status colours rather than with a 404 in the console.
		 */
		$stylesheet = $directory . '/build/style-settings.css';

		if ( is_readable( $stylesheet ) ) {
			wp_enqueue_style(
				self::HANDLE,
				plugins_url( 'build/style-settings.css', \Spacery\PLUGIN_FILE ),
				array( 'wp-components' ),
				is_string( $version ) ? $version : \Spacery\VERSION
			);

			// `wp-scripts` emits `style-settings-rtl.css` beside it.
			wp_style_add_data( self::HANDLE, 'rtl', 'replace' );
		}
	}
}
