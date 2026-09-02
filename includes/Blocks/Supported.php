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
 * The site's deny-list for the spacing extension.
 *
 * Spacery extends any block declaring `supports.spacing`, so the interesting
 * question is never "which blocks are supported" — that is the platform's
 * answer, not Spacery's — but "which blocks should be left alone". A deny-list
 * is therefore the only list worth maintaining: an allow-list would have to
 * name every block in the directory and would still be wrong the day after each
 * release.
 *
 * Denying a block removes Spacery from it completely: no attribute, no panel,
 * and no generated CSS even for a block that already carries the attribute from
 * before it was denied. "Denied" has to mean the plugin is not involved, not
 * "the controls are hidden but the stylesheet still ships".
 */
final class Supported {

	/**
	 * Blocks Spacery always leaves alone.
	 *
	 * Only Spacery's own spacer, which declares and edits the `spacery`
	 * attribute itself. Two panels writing the same attribute on one block
	 * would be a conflict, not a feature. Nothing else is denied by default:
	 * guessing on a site's behalf about core or third-party blocks is exactly
	 * the maintenance burden a deny-list exists to avoid.
	 */
	private const BUILT_IN = array( 'spacery/spacer' );

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
		 * Returning a non-array leaves the built-in list in place, so a filter
		 * that forgets to return cannot silently re-enable Spacery's own spacer.
		 *
		 * @since 0.1.0
		 *
		 * @param array<int, string> $denied Block names to exclude.
		 */
		$filtered = apply_filters( 'spacery_denied_blocks', self::BUILT_IN );

		if ( ! is_array( $filtered ) ) {
			$this->denied = self::BUILT_IN;

			return $this->denied;
		}

		$names = array();

		foreach ( $filtered as $name ) {
			if ( is_string( $name ) && '' !== $name ) {
				$names[ $name ] = true;
			}
		}

		$this->denied = array_keys( $names );

		return $this->denied;
	}

	/**
	 * Whether Spacery may extend a block.
	 *
	 * @param string $block_name Block name, e.g. `core/group`.
	 */
	public function allows( string $block_name ): bool {
		return ! in_array( $block_name, $this->denied(), true );
	}
}
