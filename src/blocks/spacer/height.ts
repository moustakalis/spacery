/**
 * Desktop-first height resolution for the spacer.
 *
 * Thin wrappers over the shared per-property resolution in `src/attribute`.
 * The spacer stores its height at `dimensions.height` inside each tier, exactly
 * where the Style Engine expects it, so "the spacer's height" is just one
 * property path among the many the extension edits — and resolving it with the
 * same code is what keeps the two from ever disagreeing.
 */

import {
	authoredAt,
	effectiveAt,
	inheritedFrom as tierInheritedFrom,
	withValue,
} from '../../attribute/tiers';
import type { StylePath } from '../../attribute/types';
import type { Breakpoint } from '../../breakpoints/types';
import type { SpacerAttributes } from './types';

/** Where a tier stores the spacer's height. */
export const HEIGHT_PATH: StylePath = ['dimensions', 'height'];

/**
 * The height authored at a breakpoint, if any.
 *
 * @param attributes The block's attributes.
 * @param slug       Breakpoint slug to read.
 * @return The authored height, or undefined when this tier sets none.
 */
export function authoredHeight(
	attributes: SpacerAttributes,
	slug: string
): string | undefined {
	return authoredAt(attributes.spacery, slug, HEIGHT_PATH);
}

/**
 * The breakpoint a tier inherits its height from, or undefined when the value
 * comes from the base height.
 *
 * @param attributes  The block's attributes.
 * @param breakpoints The active set, widest first.
 * @param slug        Breakpoint slug to resolve.
 * @return The label of the tier inherited from, or undefined for the base height.
 */
export function inheritedFrom(
	attributes: SpacerAttributes,
	breakpoints: Breakpoint[],
	slug: string
): string | undefined {
	return tierInheritedFrom(attributes.spacery, breakpoints, slug, HEIGHT_PATH)
		?.label;
}

/**
 * The height that actually applies at a breakpoint.
 *
 * @param attributes  The block's attributes.
 * @param breakpoints The active set, widest first.
 * @param slug        Breakpoint slug to resolve.
 * @return The effective height, falling back to the base height.
 */
export function heightAt(
	attributes: SpacerAttributes,
	breakpoints: Breakpoint[],
	slug: string
): string {
	return (
		effectiveAt(attributes.spacery, breakpoints, slug, HEIGHT_PATH) ??
		attributes.height
	);
}

/**
 * Returns the attribute patch that sets or clears a breakpoint's height.
 *
 * @param attributes The block's attributes.
 * @param slug       Breakpoint slug to set or clear.
 * @param height     New height, or undefined to clear the tier.
 * @return An attribute patch for setAttributes().
 */
export function withHeight(
	attributes: SpacerAttributes,
	slug: string,
	height: string | undefined
): Partial<SpacerAttributes> {
	return {
		spacery: withValue(attributes.spacery, slug, HEIGHT_PATH, height),
	};
}
