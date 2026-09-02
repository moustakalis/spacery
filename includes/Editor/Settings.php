<?php
/**
 * Hands the resolved breakpoints to the editor.
 *
 * @package Spacery
 */

declare( strict_types=1 );

namespace Spacery\Editor;

use Spacery\Blocks\Supported;
use Spacery\Breakpoints\Registry;
use WP_Block_Type_Registry;

defined( 'ABSPATH' ) || exit;

/**
 * Publishes Spacery's settings as a global the editor scripts can read.
 *
 * The breakpoint set is resolved in PHP and passed over finished. JavaScript
 * never recomputes it, so the editor and the generated CSS cannot disagree —
 * the structural failure in v1, where the editor measured `window.innerWidth`
 * while the front end used entirely separate media queries.
 *
 * **Not** via `block_editor_settings_all` alone. That filter's output reaches
 * the editor, but `@wordpress/editor` copies only an allow-list of keys —
 * `BLOCK_EDITOR_SETTINGS` in `use-block-editor-settings.js` — into the
 * `core/block-editor` store. A custom key is silently dropped, so
 * `select( blockEditorStore ).getSettings().spacery` is always undefined. That
 * cost three CI runs to find, because nothing errors: the editor simply behaves
 * as though the site has no breakpoints.
 *
 * An inline script attached to the block's own editor handle sidesteps the
 * allow-list entirely and works in every editor context — post, site, widgets —
 * rather than only where `core/editor` happens to be registered.
 */
final class Settings {

	/**
	 * The global the editor scripts read.
	 */
	public const GLOBAL_NAME = 'spacerySettings';

	/**
	 * Whether core's responsive editing mode is on.
	 *
	 * Captured from the editor settings, because it is core's own value and
	 * there is no other way to read it from PHP.
	 */
	private bool $responsive_editing = true;

	/**
	 * Constructor.
	 *
	 * @param Registry  $registry  Breakpoint registry.
	 * @param Supported $supported Block deny-list.
	 */
	public function __construct(
		private readonly Registry $registry,
		private readonly Supported $supported
	) {}

	/**
	 * Attaches hooks.
	 */
	public function register(): void {
		// Late, so anything else that filters the value has already run.
		add_filter( 'block_editor_settings_all', array( $this, 'capture_settings' ), 999 );

		/*
		 * Priority 20: `wp_add_inline_script()` needs its handle registered
		 * already, and the extension registers its own at the default priority.
		 */
		add_action( 'enqueue_block_editor_assets', array( $this, 'enqueue_settings' ), 20 );
	}

	/**
	 * Reads core's responsive editing flag, and mirrors Spacery's own settings.
	 *
	 * The added key is not what JavaScript reads — see the class comment — but
	 * it costs nothing and keeps the data discoverable to anything inspecting
	 * editor settings server-side.
	 *
	 * @param array<mixed> $settings Editor settings.
	 * @return array<mixed>
	 */
	public function capture_settings( array $settings ): array {
		$this->responsive_editing = false !== ( $settings['responsiveEditingEnabled'] ?? true );

		$settings['spacery'] = $this->data();

		return $settings;
	}

	/**
	 * Attaches the settings to Spacery's editor scripts.
	 *
	 * Inline `before` the block's own handle, so the global exists by the time
	 * the block's module runs. Attaching to the real handle rather than a
	 * separate one avoids relying on enqueue ordering.
	 */
	public function enqueue_settings(): void {
		$javascript = sprintf(
			'window.%s = %s;',
			self::GLOBAL_NAME,
			wp_json_encode( $this->data() )
		);

		foreach ( $this->editor_script_handles() as $handle ) {
			wp_add_inline_script( $handle, $javascript, 'before' );
		}
	}

	/**
	 * Editor script handles registered by Spacery's own blocks.
	 *
	 * @return array<int, string>
	 */
	private function editor_script_handles(): array {
		$handles = array();

		/*
		 * The extension bundle runs on every editor screen and needs the same
		 * settings, so it is included whenever it actually made it into the
		 * queue -- a source install with no build has no such handle.
		 */
		if ( wp_script_is( Extension::HANDLE, 'registered' ) ) {
			$handles[] = Extension::HANDLE;
		}

		foreach ( WP_Block_Type_Registry::get_instance()->get_all_registered() as $block_type ) {
			if ( ! str_starts_with( $block_type->name, 'spacery/' ) ) {
				continue;
			}

			foreach ( $block_type->editor_script_handles as $handle ) {
				$handles[] = $handle;
			}
		}

		return array_unique( $handles );
	}

	/**
	 * The payload handed to the editor.
	 *
	 * @return array{
	 *     breakpoints: array<int, array{slug: string, label: string, max: string}>,
	 *     responsiveEditingEnabled: bool,
	 *     coreViewports: array<int, array{slug: string, label: string, max: string}>,
	 *     excludedBlocks: array<int, string>
	 * }
	 */
	private function data(): array {
		return array(
			'breakpoints'              => $this->registry->resolve()->to_array(),
			'responsiveEditingEnabled' => $this->responsive_editing,
			'coreViewports'            => $this->registry->core_viewports()?->to_array() ?? array(),
			'excludedBlocks'           => $this->supported->excluded(),
		);
	}
}
