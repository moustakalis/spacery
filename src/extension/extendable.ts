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
 * 1. The exclusion list PHP publishes: the site's `spacery_denied_blocks`
 *    filter plus Spacery's own blocks, which declare and edit the `spacery`
 *    attribute themselves and would otherwise get a second panel writing the
 *    same attribute. A block denied by the site loses the CSS as well, but that
 *    happens on the server; here the list only decides what the editor shows.
 * 2. The block's own `supports.spacing`. Blocks that only declare `blockGap`
 *    fall out here, because Spacery does not edit gap yet.
 *
 * @param name    Block name.
 * @param support The block's `supports.spacing` value.
 * @return Whether to extend it.
 */
export function isExtendable(name: string, support: unknown): boolean {
	if (getSpacerySettings().excludedBlocks.includes(name)) {
		return false;
	}

	return spacingFeatures(support).length > 0;
}

/**
 * Whether a *registered* block should get the inspector panel.
 *
 * Two conditions, and both are load-bearing.
 *
 * The block must still qualify. `spacery/spacer` declares `supports.spacing.margin`
 * *and* the `spacery` attribute, so testing only for the attribute would put a
 * second panel on the one block that certainly must not have one.
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
