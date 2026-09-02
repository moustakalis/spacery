<?php
/**
 * Plugin container and boot sequence.
 *
 * @package Spacery
 */

declare( strict_types=1 );

namespace Spacery;

use Spacery\Blocks\Spacer;
use Spacery\Blocks\Supported;
use Spacery\Breakpoints\Registry;
use Spacery\Editor\Extension;
use Spacery\Editor\Settings;
use Spacery\Render\BlockFilter;
use Spacery\Styles\Collector;
use Spacery\Styles\Generator;

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
	 * The breakpoint registry.
	 */
	private ?Registry $breakpoints = null;

	/**
	 * The per-request style collector.
	 */
	private ?Collector $collector = null;

	/**
	 * The block deny-list.
	 */
	private ?Supported $supported = null;

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

		$this->breakpoints()->register();

		( new BlockFilter(
			new Generator( $this->breakpoints() ),
			$this->collector(),
			$this->supported()
		) )->register();

		( new Extension() )->register();
		( new Settings( $this->breakpoints(), $this->supported() ) )->register();
		( new Spacer() )->register();

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

	/**
	 * The breakpoint registry.
	 *
	 * One instance per request, so its memo is shared and its invalidation
	 * hooks apply to whatever anything else is holding.
	 */
	public function breakpoints(): Registry {
		if ( ! $this->breakpoints instanceof Registry ) {
			$this->breakpoints = new Registry();
		}

		return $this->breakpoints;
	}

	/**
	 * The style collector.
	 *
	 * One per request, so every block's rules land in the same stylesheet and
	 * identical spacing is stored once.
	 */
	public function collector(): Collector {
		if ( ! $this->collector instanceof Collector ) {
			$this->collector = new Collector();
		}

		return $this->collector;
	}

	/**
	 * The block deny-list.
	 *
	 * One per request, so the render filter and the editor settings answer the
	 * same question the same way. Two instances would each run
	 * `spacery_denied_blocks` separately, and a filter with any state at all
	 * could then hide a block from the inspector while still styling it.
	 */
	public function supported(): Supported {
		if ( ! $this->supported instanceof Supported ) {
			$this->supported = new Supported();
		}

		return $this->supported;
	}
}
