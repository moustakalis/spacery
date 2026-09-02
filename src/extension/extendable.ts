/**
 * Which blocks Spacery extends.
 */

import { getBlockSupport, getBlockType } from '@wordpress/blocks';

import { getSpacerySettings } from '../breakpoints/settings';
import { spacingFeatures } from './supports';

/**
 * Whether Spacery should add its attribute and panel to a block.
 *
 * Two gates, in this order:
 *
 * 1. The site's deny-list, filtered in PHP through `spacery_denied_blocks` and
 *    published to the editor. A site that excludes a block excludes it from the
 *    attribute as well as from the panel, so "denied" means Spacery does not
 *    touch it rather than "the controls are hidden but the CSS still ships".
 * 2. The block's own `supports.spacing`. Blocks that only declare `blockGap`
 *    fall out here, because Spacery does not edit gap yet.
 *
 * @param name    Block name.
 * @param support The block's `supports.spacing` value.
 * @return Whether to extend it.
 */
export function isExtendable(name: string, support: unknown): boolean {
	if (getSpacerySettings().deniedBlocks.includes(name)) {
		return false;
	}

	return spacingFeatures(support).length > 0;
}

/**
 * Whether a *registered* block should get the inspector panel.
 *
 * Two conditions, and both are load-bearing.
 *
 * The block must still qualify — `spacery/spacer` declares the `spacery`
 * attribute itself and has its own Height panel, so eligibility rather than the
 * mere presence of the attribute is what decides.
 *
 * And the block's registered type must actually carry the attribute.
 * `blocks.registerBlockType` only reaches blocks registered after Spacery's
 * filter is added, so a block script that ran earlier keeps its original
 * attribute list — and writing an attribute a block type does not declare means
 * the editor silently drops it on save. Better no panel than a panel whose
 * values vanish.
 *
 * @param name Block name.
 * @return Whether to render the panel.
 */
export function extendsBlock(name: string): boolean {
	if (!isExtendable(name, getBlockSupport(name, 'spacing'))) {
		return false;
	}

	return undefined !== getBlockType(name)?.attributes?.spacery;
}
