<?php
/**
 * Read-only endpoint backing the settings screen.
 *
 * @package Spacery
 */

declare( strict_types=1 );

namespace Spacery\Settings;

use Spacery\Breakpoints\BreakpointSet;
use Spacery\Breakpoints\Registry;
use WP_REST_Response;

defined( 'ABSPATH' ) || exit;

/**
 * Serves the three sets the settings screen compares.
 *
 * The screen's whole job is decision D2 — pick one source, never blend — and a
 * person cannot make that choice without seeing what each source actually
 * contains. The theme's set and Spacery's preset both live in PHP and neither
 * is reachable through `/wp/v2/settings`, which only knows about stored
 * options.
 *
 * Read-only on purpose. Writes go through `register_setting()` and the core
 * settings endpoint, so there is exactly one path that can change a breakpoint
 * and exactly one place its validation lives.
 */
final class RestController {

	public const NAMESPACE_V1 = 'spacery/v1';
	public const ROUTE        = '/breakpoints';

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
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	/**
	 * Registers the route.
	 */
	public function register_routes(): void {
		register_rest_route(
			self::NAMESPACE_V1,
			self::ROUTE,
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_breakpoints' ),
				'permission_callback' => array( $this, 'can_read' ),
			)
		);
	}

	/**
	 * Only people who can change the setting may see what it would become.
	 *
	 * The same capability the core settings endpoint requires, so the screen
	 * cannot end up half-authorized: able to preview a source it could not save.
	 */
	public function can_read(): bool {
		return current_user_can( 'manage_options' );
	}

	/**
	 * The sets, and which one is in effect.
	 */
	public function get_breakpoints(): WP_REST_Response {
		$theme = $this->registry->theme();

		return new WP_REST_Response(
			array(
				/*
				 * Deliberately not the stored option — the screen already has
				 * that from `/wp/v2/settings`. This is what the stored value
				 * *means*: `effectiveSource` is what the registry actually uses,
				 * `defaultSource` what it would fall back to. The screen needs
				 * both to show "Theme (in use)" without implying someone chose
				 * it when they merely never chose anything.
				 */
				'effectiveSource' => $this->registry->source(),
				'defaultSource'   => $this->registry->default_source(),
				'resolved'        => $this->registry->resolve()->to_array(),
				'theme'           => $theme instanceof BreakpointSet ? $theme->to_array() : null,
				'preset'          => $this->registry->preset()->to_array(),
				'maxBreakpoints'  => BreakpointSet::MAX_BREAKPOINTS,
			)
		);
	}
}
