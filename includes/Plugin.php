<?php
/**
 * Plugin container and boot sequence.
 *
 * @package Spacery
 */

declare( strict_types=1 );

namespace Spacery;

defined( 'ABSPATH' ) || exit;

/**
 * Wires the plugin's services together.
 *
 * Services are constructed here and register their own hooks in `register()`,
 * so this class stays a wiring diagram rather than a god object. As of M0 there
 * are no services yet; the boot sequence exists so later milestones have an
 * obvious place to attach.
 */
final class Plugin {

	/**
	 * Singleton instance.
	 */
	private static ?Plugin $instance = null;

	/**
	 * Whether boot() has already run.
	 */
	private bool $booted = false;

	/**
	 * Private constructor. Use instance().
	 */
	private function __construct() {
	}

	/**
	 * Returns the single plugin instance.
	 */
	public static function instance(): Plugin {
		if ( ! self::$instance instanceof Plugin ) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	/**
	 * Boots the plugin. Safe to call more than once.
	 */
	public function boot(): void {
		if ( $this->booted ) {
			return;
		}

		$this->booted = true;

		/**
		 * Fires once Spacery has finished booting.
		 *
		 * @since 0.1.0
		 *
		 * @param Plugin $plugin The plugin instance.
		 */
		do_action( 'spacery_booted', $this );
	}

	/**
	 * Whether the plugin has booted.
	 */
	public function has_booted(): bool {
		return $this->booted;
	}
}
