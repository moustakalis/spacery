<?php
/**
 * Registers the spacer block.
 *
 * @package Spacery
 */

declare( strict_types=1 );

namespace Spacery\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * The `spacery/spacer` block.
 *
 * Registered from build metadata, which is what `wp-scripts build` produces by
 * scanning `src/` for `block.json` files. v1 pointed at a build directory that
 * nothing generated, because it had no webpack entry point; blocks here need no
 * entry point of their own, because that scanning finds them. The project's
 * `webpack.config.js` exists only for the spacing extension, which is not a
 * block and so is invisible to that scan.
 */
final class Spacer {

	/**
	 * Attaches hooks.
	 */
	public function register(): void {
		add_action( 'init', array( $this, 'register_block' ) );
	}

	/**
	 * Registers the block type.
	 */
	public function register_block(): void {
		/*
		 * `wp-scripts build` mirrors the source tree under build/, so a block at
		 * src/blocks/spacer lands at build/blocks/spacer -- not build/spacer.
		 */
		$metadata = dirname( \Spacery\PLUGIN_FILE ) . '/build/blocks/spacer';

		if ( ! is_readable( $metadata . '/block.json' ) ) {
			/*
			 * The plugin is installed without a build. Registering nothing is
			 * better than a fatal, and the admin notice explains what to do.
			 */
			add_action( 'admin_notices', array( $this, 'missing_build_notice' ) );

			return;
		}

		register_block_type_from_metadata( $metadata );
	}

	/**
	 * Explains a missing build, rather than failing silently.
	 */
	public function missing_build_notice(): void {
		if ( ! current_user_can( 'activate_plugins' ) ) {
			return;
		}

		printf(
			'<div class="notice notice-error"><p>%s</p></div>',
			esc_html__(
				'Spacery has no build output. If you installed it from source, run "pnpm install && pnpm run build".',
				'spacery'
			)
		);
	}
}
