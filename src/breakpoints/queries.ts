/**
 * The media query a tier is emitted under.
 *
 * **One TypeScript reading of a fact the server owns.**
 * `BreakpointSet::media_queries()` is the source of truth and its shape is
 * D13's: bands are disjoint, so the lower edge is exclusive and the upper edge
 * inclusive, and the narrowest tier has no lower edge at all. The front end's
 * CSS and the editor's preview have to agree exactly or the preview is worse
 * than none.
 *
 * `band()` in `settings/bands.ts` states the same boundaries as a sentence for
 * the `Covers` column. Two forms of one fact is what D27 had to delete a
 * function over, so: **that one is prose for a person, this one is CSS for a
 * browser, and neither may be derived from the other.** Both are pinned to the
 * same boundary cases by their tests.
 */

import type { Breakpoint } from './types';

/**
 * The `@media` prelude for one tier.
 *
 * @param tiers The resolved set, widest first.
 * @param index Which tier.
 * @return The prelude, e.g. `@media (888px < width <= 1300px)`.
 */
export function mediaQueryFor(tiers: Breakpoint[], index: number): string {
	const tier = tiers[index];

	if (!tier) {
		return '';
	}

	const narrower = tiers[index + 1];

	if (!narrower) {
		return `@media (width <= ${tier.max})`;
	}

	return `@media (${narrower.max} < width <= ${tier.max})`;
}
