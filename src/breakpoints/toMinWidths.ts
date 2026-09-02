/**
 * Converts Spacery's tiers into the ascending form `responsive-state` wants.
 *
 * Spacery is desktop-first: a tier is an *upper* bound, and the generated CSS
 * uses core's disjoint bands. `responsive-state` builds `min-width` queries, so
 * the editor needs the same partition expressed from below.
 *
 * The two describe the same axis. A set of upper bounds `[1280, 1024, 782, 480]`
 * cuts the width axis into five ranges, and so does the set of lower bounds
 * `[0, 480.02, 782.02, 1024.02, 1280.02]`. The 0.02px step keeps adjacent ranges
 * from overlapping, and is the same factor `responsive-state`'s own `stepDown()`
 * uses.
 *
 * This conversion is **editor bookkeeping only**. Generated CSS keeps core's
 * exact values and units, so the step never reaches a stylesheet.
 */

import type { Breakpoint } from './types';

/**
 * Key for the range above every tier, where base styles apply alone.
 *
 * Not a breakpoint: it has no upper bound and emits no media query. The server
 * restricts slugs to `[a-z0-9-]`, so a leading underscore cannot collide with a
 * real tier name.
 */
export const DEFAULT_TIER = '__default';

/** Smallest gap that keeps two ranges from overlapping. */
const STEP = 0.02;

/** Pixels per em/rem, matching `Breakpoint::PIXELS_PER_EM` on the server. */
const PIXELS_PER_EM = 16;

/**
 * Converts a CSS length to pixels, the same way the server does for ordering.
 * @param length
 */
export function toPixels(length: string): number {
	const value = length.trim();

	if (value.endsWith('rem')) {
		return parseFloat(value) * PIXELS_PER_EM;
	}

	if (value.endsWith('em')) {
		return parseFloat(value) * PIXELS_PER_EM;
	}

	return parseFloat(value);
}

/**
 * Builds the ascending `slug => min-width` map for `createResponsiveState()`.
 *
 * @param breakpoints Tiers, widest first, as the server resolved them.
 */
export function toMinWidths(breakpoints: Breakpoint[]): Record<string, number> {
	if (0 === breakpoints.length) {
		return { [DEFAULT_TIER]: 0 };
	}

	// Narrowest first, so each tier's lower bound is the previous tier's upper.
	const ascending = [...breakpoints].reverse();
	const mins: Record<string, number> = {};

	ascending.forEach((breakpoint, index) => {
		mins[breakpoint.slug] =
			0 === index ? 0 : toPixels(ascending[index - 1]!.max) + STEP;
	});

	mins[DEFAULT_TIER] = toPixels(ascending[ascending.length - 1]!.max) + STEP;

	return mins;
}
