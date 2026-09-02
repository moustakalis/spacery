<?php
/**
 * Compiles a block's responsive spacing into CSS rules.
 *
 * @package Spacery
 */

declare( strict_types=1 );

namespace Spacery\Styles;

use Spacery\Breakpoints\BreakpointSet;
use Spacery\Breakpoints\Registry;

defined( 'ABSPATH' ) || exit;

/**
 * Turns a `spacery` block attribute into banded CSS.
 *
 * The attribute mirrors core's own shape — core writes
 * `style.@tablet.spacing.padding.top`, Spacery writes
 * `spacery.tablet.spacing.padding.top` — so each tier's value is a style object
 * the Style Engine already understands, and support for anything beyond spacing
 * needs no new structure.
 */
final class Generator {

	/**
	 * Prefix for generated classes. Short, because it appears on every block.
	 */
	private const CLASS_PREFIX = 'spy-';

	/**
	 * Hash length. 48 bits: collisions are not a practical concern for the
	 * number of distinct spacing recipes a site can contain, and the class name
	 * stays readable in devtools.
	 */
	private const HASH_LENGTH = 12;

	/**
	 * Constructor.
	 *
	 * @param Registry $registry Breakpoint registry.
	 */
	public function __construct( private readonly Registry $registry ) {}

	/**
	 * Compiles an attribute value, or returns null when there is nothing to emit.
	 *
	 * @param mixed $attribute The block's `spacery` attribute.
	 */
	public function generate( mixed $attribute ): ?GeneratedStyles {
		if ( ! is_array( $attribute ) ) {
			return null;
		}

		$breakpoints = $this->registry->resolve();
		$authored    = self::normalize( $attribute, $breakpoints->slugs() );

		if ( array() === $authored ) {
			return null;
		}

		$class_name = self::CLASS_PREFIX . substr(
			md5( (string) wp_json_encode( $authored ) ),
			0,
			self::HASH_LENGTH
		);

		$queries = $breakpoints->media_queries();
		$rules   = array();

		foreach ( self::materialize( $authored, $breakpoints ) as $slug => $styles ) {
			$declarations = wp_style_engine_get_styles( $styles )['declarations'] ?? array();

			if ( array() === $declarations ) {
				continue;
			}

			$rules[] = array(
				'selector'     => '.' . $class_name,
				'declarations' => self::force( $declarations ),
				'rules_group'  => $queries[ $slug ],
			);
		}

		if ( array() === $rules ) {
			return null;
		}

		return new GeneratedStyles( $class_name, $rules );
	}

	/**
	 * Marks every declaration `!important`.
	 *
	 * Core serializes block support styles as an inline `style` attribute, and
	 * an inline declaration beats any class selector no matter how the
	 * stylesheet is ordered. Core solves this for its own responsive styles the
	 * same way. Every rule Spacery emits is a viewport override, so every one
	 * needs it; there is no base rule here to spare, because the base is core's.
	 *
	 * @param array<string, string> $declarations Property => value.
	 * @return array<string, string>
	 */
	private static function force( array $declarations ): array {
		return array_map(
			static fn( string $value ): string => $value . ' !important',
			$declarations
		);
	}

	/**
	 * Reduces an attribute to canonical form.
	 *
	 * Drops unknown tiers and empty values, then sorts every level. Sorting is
	 * what makes the hash content-addressed rather than order-addressed: two
	 * blocks with the same spacing written in a different key order must land on
	 * the same class, or dedupe silently stops working.
	 *
	 * @param array<mixed>  $attribute Raw attribute.
	 * @param array<string> $known     Tier slugs that currently exist.
	 * @return array<string, array<mixed>>
	 */
	private static function normalize( array $attribute, array $known ): array {
		$authored = array();

		foreach ( $known as $slug ) {
			$styles = $attribute[ $slug ] ?? null;

			if ( ! is_array( $styles ) ) {
				continue;
			}

			$pruned = self::prune( $styles );

			if ( array() !== $pruned ) {
				$authored[ $slug ] = $pruned;
			}
		}

		ksort( $authored );

		return $authored;
	}

	/**
	 * Recursively drops empty values and sorts keys.
	 *
	 * @param array<mixed> $node Style subtree.
	 * @return array<mixed>
	 */
	private static function prune( array $node ): array {
		$pruned = array();

		foreach ( $node as $key => $value ) {
			if ( is_array( $value ) ) {
				$value = self::prune( $value );
			}

			if ( null === $value || '' === $value || array() === $value ) {
				continue;
			}

			$pruned[ $key ] = $value;
		}

		ksort( $pruned );

		return $pruned;
	}

	/**
	 * Expands authored tiers into an effective style object per band.
	 *
	 * Materialization runs **per property path**, not per tier. Carrying whole
	 * tier objects forward would let a narrower tier that sets only a margin
	 * discard the padding it should have inherited. Flattening to leaf paths
	 * first means each property inherits independently, which is what an author
	 * setting padding at Tablet and a margin at Mobile expects.
	 *
	 * @param array<string, array<mixed>> $authored    Normalized tiers.
	 * @param BreakpointSet               $breakpoints Active set.
	 * @return array<string, array<mixed>> Style object per tier, widest first.
	 */
	private static function materialize( array $authored, BreakpointSet $breakpoints ): array {
		$paths = array();

		foreach ( $authored as $slug => $styles ) {
			foreach ( self::flatten( $styles ) as $path => $value ) {
				$paths[ $path ][ $slug ] = $value;
			}
		}

		$per_tier = array();

		foreach ( $paths as $path => $by_tier ) {
			foreach ( $breakpoints->materialize( $by_tier ) as $slug => $value ) {
				$per_tier[ $slug ] = self::place(
					$per_tier[ $slug ] ?? array(),
					explode( '/', $path ),
					$value
				);
			}
		}

		// Widest first, so narrower bands are emitted later.
		$ordered = array();

		foreach ( $breakpoints->slugs() as $slug ) {
			if ( isset( $per_tier[ $slug ] ) ) {
				$ordered[ $slug ] = $per_tier[ $slug ];
			}
		}

		return $ordered;
	}

	/**
	 * Flattens a style object to `path => leaf value`.
	 *
	 * @param array<mixed> $node   Style subtree.
	 * @param string       $prefix Accumulated path.
	 * @return array<string, string>
	 */
	private static function flatten( array $node, string $prefix = '' ): array {
		$flat = array();

		foreach ( $node as $key => $value ) {
			$path = '' === $prefix ? (string) $key : $prefix . '/' . $key;

			if ( is_array( $value ) ) {
				$flat += self::flatten( $value, $path );
				continue;
			}

			$flat[ $path ] = (string) $value;
		}

		return $flat;
	}

	/**
	 * Writes a leaf value back into a nested array at the given path.
	 *
	 * @param array<mixed>  $node  Target subtree.
	 * @param array<string> $path  Remaining path segments.
	 * @param string        $value Leaf value.
	 * @return array<mixed>
	 */
	private static function place( array $node, array $path, string $value ): array {
		$key = array_shift( $path );

		if ( array() === $path ) {
			$node[ $key ] = $value;

			return $node;
		}

		$child = $node[ $key ] ?? array();

		$node[ $key ] = self::place( is_array( $child ) ? $child : array(), $path, $value );

		return $node;
	}
}
