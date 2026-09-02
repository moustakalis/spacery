/**
 * Desktop-first height resolution for the spacer.
 *
 * These helpers must agree exactly with `BreakpointSet::materialize()` on the
 * server. If they drift, the editor shows one thing and the front end renders
 * another — the class of bug that made v1's preview useless.
 */

import type { Breakpoint } from '../../breakpoints/types';
import type { SpacerAttributes } from './types';

/**
 * The height authored at a breakpoint, if any.
 * @param attributes
 * @param slug
 */
export function authoredHeight(
	attributes: SpacerAttributes,
	slug: string
): string | undefined {
	return attributes.spacery?.[slug]?.dimensions?.height;
}

/**
 * The breakpoint a tier inherits its height from, or undefined when the value
 * comes from the base height.
 *
 * Desktop-first: a tier inherits from the nearest *wider* tier that sets a
 * value, because narrower viewports override wider ones.
 * @param attributes
 * @param breakpoints
 * @param slug
 */
export function inheritedFrom(
	attributes: SpacerAttributes,
	breakpoints: Breakpoint[],
	slug: string
): string | undefined {
	const index = breakpoints.findIndex((b) => b.slug === slug);

	if (index < 0) {
		return undefined;
	}

	// Walk toward wider tiers, which sit earlier in the widest-first list.
	for (let i = index - 1; i >= 0; i--) {
		const candidate = breakpoints[i]!;

		if (undefined !== authoredHeight(attributes, candidate.slug)) {
			return candidate.label;
		}
	}

	return undefined;
}

/**
 * The height that actually applies at a breakpoint.
 * @param attributes
 * @param breakpoints
 * @param slug
 */
export function heightAt(
	attributes: SpacerAttributes,
	breakpoints: Breakpoint[],
	slug: string
): string {
	const index = breakpoints.findIndex((b) => b.slug === slug);

	if (index < 0) {
		return attributes.height;
	}

	for (let i = index; i >= 0; i--) {
		const authored = authoredHeight(attributes, breakpoints[i]!.slug);

		if (undefined !== authored) {
			return authored;
		}
	}

	return attributes.height;
}

/**
 * Returns the attribute patch that sets or clears a breakpoint's height.
 *
 * Clearing prunes the tier, and prunes the whole `spacery` attribute when it
 * empties, so a block the author has reset back to nothing serializes exactly
 * as it did before they touched it.
 * @param attributes
 * @param slug
 * @param height
 */
export function withHeight(
	attributes: SpacerAttributes,
	slug: string,
	height: string | undefined
): Partial<SpacerAttributes> {
	const next = { ...(attributes.spacery ?? {}) };

	if (undefined === height || '' === height) {
		const tier = { ...(next[slug] ?? {}) };
		delete tier.dimensions;

		if (0 === Object.keys(tier).length) {
			delete next[slug];
		} else {
			next[slug] = tier;
		}
	} else {
		next[slug] = {
			...(next[slug] ?? {}),
			dimensions: { ...(next[slug]?.dimensions ?? {}), height },
		};
	}

	return {
		spacery: 0 === Object.keys(next).length ? undefined : next,
	};
}
