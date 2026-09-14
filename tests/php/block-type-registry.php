<?php
/**
 * Minimal stand-in for core's block type registry.
 *
 * `Editor\Settings` walks the registry to find the editor script handles
 * Spacery's own blocks registered, so the payload can be attached to each. This
 * suite is about *what* gets attached rather than how many handles receive it,
 * so the registry is empty on purpose: the extension's own handle is enough to
 * assert against, and every block it would list would only add another copy of
 * the same JSON.
 *
 * In its own file because `bootstrap.php` declares functions, and
 * `Universal.Files.SeparateFunctionsFromOO` refuses a file that does both --
 * the same reason the Style Engine loads from `style-engine.php` next door.
 *
 * @package Spacery
 */

declare( strict_types=1 );

/**
 * Stub of WP_Block_Type_Registry.
 */
class WP_Block_Type_Registry {

	/**
	 * The singleton, as core exposes it.
	 *
	 * @return self The registry.
	 */
	public static function get_instance(): self {
		return new self();
	}

	/**
	 * Every registered block type. Deliberately none.
	 *
	 * @return array<string, object>
	 */
	public function get_all_registered(): array {
		return array();
	}
}
