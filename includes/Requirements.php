<?php
/**
 * Environment requirement checks.
 *
 * @package Spacery
 */

declare( strict_types=1 );

namespace Spacery;

defined( 'ABSPATH' ) || exit;

/**
 * Guards the plugin against unsupported WordPress and PHP versions.
 *
 * Spacery targets WordPress 7.1+ because it builds on `settings.viewport`, the
 * always-iframed post editor and block API v3. Rather than shipping compat
 * shims for older releases, it declines to boot and says why.
 */
final class Requirements {

	/**
	 * Whether the current environment can run the plugin.
	 */
	public static function are_met(): bool {
		return self::wp_is_supported() && self::php_is_supported();
	}

	/**
	 * Whether the running WordPress version is supported.
	 */
	public static function wp_is_supported(): bool {
		return version_compare( get_bloginfo( 'version' ), MIN_WP, '>=' );
	}

	/**
	 * Whether the running PHP version is supported.
	 */
	public static function php_is_supported(): bool {
		return version_compare( PHP_VERSION, MIN_PHP, '>=' );
	}

	/**
	 * Shows an admin notice explaining why the plugin did not load.
	 *
	 * Deliberately does not deactivate the plugin: silently disabling something
	 * the user installed on purpose is worse than an explanation they can act on.
	 */
	public static function register_notice(): void {
		add_action(
			'admin_notices',
			static function (): void {
				if ( ! current_user_can( 'activate_plugins' ) ) {
					return;
				}

				$message = self::wp_is_supported()
					? sprintf(
						/* translators: 1: required PHP version, 2: running PHP version. */
						__( 'Spacery requires PHP %1$s or newer. This site is running PHP %2$s.', 'spacery' ),
						MIN_PHP,
						PHP_VERSION
					)
					: sprintf(
						/* translators: 1: required WordPress version, 2: running WordPress version. */
						__( 'Spacery requires WordPress %1$s or newer. This site is running WordPress %2$s.', 'spacery' ),
						MIN_WP,
						get_bloginfo( 'version' )
					);

				printf(
					'<div class="notice notice-error"><p>%s</p></div>',
					esc_html( $message )
				);
			}
		);
	}
}
