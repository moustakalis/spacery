<?php
/**
 * Loads the spacing extension in the editor.
 *
 * @package Spacery
 */

declare( strict_types=1 );

namespace Spacery\Editor;

defined( 'ABSPATH' ) || exit;

/**
 * Enqueues the bundle that extends every block supporting spacing.
 *
 * A separate script from the spacer block's. The block's bundle only matters on
 * screens where the block is used; this one has to run wherever blocks are
 * edited, and it has to run *early*: `blocks.registerBlockType` only reaches
 * blocks registered after the filter is added, and core registers its own
 * during `initializeEditor()` on `domReady`. Anything enqueued through
 * `enqueue_block_editor_assets` beats that, so ordinary enqueueing is enough —
 * but only because the filter is registered at the bundle's module scope.
 */
final class Extension {

	/**
	 * Script handle. Public because {@see Settings} attaches the settings global
	 * to it.
	 */
	public const HANDLE = 'spacery-extension';

	/**
	 * Attaches hooks.
	 */
	public function register(): void {
		add_action( 'enqueue_block_editor_assets', array( $this, 'enqueue' ) );
	}

	/**
	 * Enqueues the extension bundle.
	 *
	 * Silent when there is no build. The spacer block already raises an admin
	 * notice in that case, and a second one saying the same thing would be
	 * noise.
	 */
	public function enqueue(): void {
		$directory = dirname( \Spacery\PLUGIN_FILE );
		$asset     = $directory . '/build/extension.asset.php';

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
			plugins_url( 'build/extension.js', \Spacery\PLUGIN_FILE ),
			is_array( $dependencies ) ? $dependencies : array(),
			is_string( $version ) ? $version : \Spacery\VERSION,
			array( 'in_footer' => true )
		);

		\Spacery\I18n::set_script_translations( self::HANDLE );
	}
}
