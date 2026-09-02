<?php
/**
 * Which blocks Spacery is allowed to touch.
 *
 * @package Spacery
 */

declare( strict_types=1 );

namespace Spacery\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Two questions about a block, deliberately kept apart.
 *
 * **Does the extension attach to it?** Spacery adds its attribute and panel to
 * any block declaring `supports.spacing`, so the interesting list is never
 * "which blocks are supported" -- that is the platform's answer, not Spacery's
 * -- but "which blocks to leave alone". An allow-list would have to name every
 * block in the directory and would still be wrong the day after each release.
 *
 * **Does the render filter style it?** Not the same question, and conflating
 * them is a mistake this class made once already: `spacery/spacer` must not get
 * the extension's panel, because it declares and edits the `spacery` attribute
 * itself, but it obviously still has to be *rendered*. One shared list meant
 * Spacery's own spacer silently stopped emitting any CSS at all.
 *
 * So the built-in exclusion covers extension only, and the site's deny-list
 * covers both. Denying a block through the filter means Spacery is not involved
 * with it: no attribute, no panel, and no generated CSS even for a block that
 * already carries the attribute from before it was denied.
 */
final class Supported {

	/**
	 * Blocks the extension never attaches to.
	 *
	 * Only Spacery's own spacer. It declares `supports.spacing.margin`, so it
	 * would otherwise qualify, and it already owns the `spacery` attribute --
	 * two panels writing the same attribute on one block would be a conflict,
	 * not a feature.
	 *
	 * Nothing else belongs here: guessing on a site's behalf about core or
	 * third-party blocks is exactly the maintenance burden a deny-list exists to
	 * avoid.
	 */
	private const NEVER_EXTENDED = array( 'spacery/spacer' );

	/**
	 * Memoized deny-list.
	 *
	 * @var array<int, string>|null
	 */
	private ?array $denied = null;

	/**
	 * The blocks the site excludes.
	 *
	 * @return array<int, string>
	 */
	public function denied(): array {
		if ( null !== $this->denied ) {
			return $this->denied;
		}

		/**
		 * Filters the blocks Spacery leaves alone.
		 *
		 * A block named here gets no attribute, no inspector panel, and no
		 * generated CSS. The attribute is left in any content that already
		 * carries it, so re-allowing the block restores its spacing exactly.
		 *
		 * Returning a non-array leaves the list empty rather than guessing at
		 * what a broken filter meant.
		 *
		 * @since 0.1.0
		 *
		 * @param array<int, string> $denied Block names to exclude.
		 */
		$filtered = apply_filters( 'spacery_denied_blocks', array() );

		$this->denied = self::names( is_array( $filtered ) ? $filtered : array() );

		return $this->denied;
	}

	/**
	 * Every block the editor extension must not attach to.
	 *
	 * Published to the editor, which is the only place this list matters.
	 *
	 * @return array<int, string>
	 */
	public function excluded(): array {
		return self::names( array( ...self::NEVER_EXTENDED, ...$this->denied() ) );
	}

	/**
	 * Whether the render filter may style a block.
	 *
	 * Reads the site's deny-list only. Spacery's own blocks are excluded from
	 * the *extension*, never from rendering.
	 *
	 * @param string $block_name Block name, e.g. `core/group`.
	 */
	public function renders( string $block_name ): bool {
		return ! in_array( $block_name, $this->denied(), true );
	}

	/**
	 * Reduces a filtered list to unique, non-empty block names.
	 *
	 * @param array<mixed> $raw Candidate names.
	 * @return array<int, string>
	 */
	private static function names( array $raw ): array {
		$names = array();

		foreach ( $raw as $name ) {
			if ( is_string( $name ) && '' !== $name ) {
				$names[ $name ] = true;
			}
		}

		return array_keys( $names );
	}
}
