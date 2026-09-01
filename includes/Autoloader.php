<?php
/**
 * PSR-4 autoloader for the Spacery namespace.
 *
 * Spacery has no runtime PHP dependencies, so it deliberately does not ship a
 * Composer `vendor/` directory. Composer is a development-only tool here (PHPCS,
 * PHPStan, PHPUnit). This keeps the distributed plugin small and sidesteps the
 * dependency-conflict problems that come with bundling an autoloader into a
 * shared WordPress runtime.
 *
 * @package Spacery
 */

declare( strict_types=1 );

namespace Spacery;

defined( 'ABSPATH' ) || exit;

/**
 * Maps `Spacery\Foo\Bar` to `includes/Foo/Bar.php`.
 */
final class Autoloader {

	/**
	 * Registers the autoloader with SPL.
	 */
	public static function register(): void {
		spl_autoload_register( array( self::class, 'load' ) );
	}

	/**
	 * Loads a class file if it belongs to this plugin's namespace.
	 *
	 * @param string $classname Fully qualified class name.
	 */
	private static function load( string $classname ): void {
		$prefix = __NAMESPACE__ . '\\';
		$length = strlen( $prefix );

		if ( 0 !== strncmp( $prefix, $classname, $length ) ) {
			return;
		}

		$relative = substr( $classname, $length );
		$path     = __DIR__ . '/' . str_replace( '\\', '/', $relative ) . '.php';

		if ( is_readable( $path ) ) {
			require_once $path;
		}
	}
}
