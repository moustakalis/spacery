<?php
/**
 * Hands the resolved breakpoints to the editor.
 *
 * @package Spacery
 */

declare( strict_types=1 );

namespace Spacery\Editor;

use Spacery\Breakpoints\Registry;

defined( 'ABSPATH' ) || exit;

/**
 * Adds Spacery's settings to the block editor.
 *
 * The breakpoint set is resolved in PHP and passed over finished. JavaScript
 * never recomputes it, so the editor and the generated CSS cannot disagree —
 * the structural failure in v1, where the editor measured `window.innerWidth`
 * while the front end used entirely separate media queries.
 */
final class Settings {

	/**
	 * Constructor.
	 *
	 * @param Registry $registry Breakpoint registry.
	 */
	public function __construct( private readonly Registry $registry ) {}

	/**
	 * Attaches hooks.
	 */
	public function register(): void {
		add_filter( 'block_editor_settings_all', array( $this, 'add_settings' ) );
	}

	/**
	 * Adds a namespaced `spacery` key to block editor settings.
	 *
	 * A key of our own rather than anything under `__experimentalFeatures`,
	 * which is experimental by name and not ours to extend.
	 *
	 * @param array<mixed> $settings Editor settings.
	 * @return array<mixed>
	 */
	public function add_settings( array $settings ): array {
		$settings['spacery'] = array(
			'breakpoints' => $this->registry->resolve()->to_array(),
		);

		return $settings;
	}
}
