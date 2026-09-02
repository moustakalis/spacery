<?php
/**
 * The CSS a single block's responsive spacing compiles to.
 *
 * @package Spacery
 */

declare( strict_types=1 );

namespace Spacery\Styles;

defined( 'ABSPATH' ) || exit;

/**
 * A generated class name and the rules that give it meaning.
 *
 * The class is content-addressed: two blocks with the same spacing produce the
 * same class, so the collector stores one copy of the rules however many blocks
 * use them.
 */
final class GeneratedStyles {

	/**
	 * Constructor.
	 *
	 * @param string                                                                  $class_name Content-addressed class.
	 * @param array<int, array{selector: string, declarations: array<string, string>, rules_group: string}> $rules CSS rules.
	 */
	public function __construct(
		public readonly string $class_name,
		public readonly array $rules
	) {}
}
