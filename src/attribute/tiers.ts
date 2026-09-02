/**
 * Desktop-first resolution of the `spacery` attribute, per property.
 *
 * This is the editor half of a contract. It must agree exactly with
 * `Generator::materialize()` and `BreakpointSet::materialize()` on the server,
 * because the two resolve inheritance independently: if they drift, the canvas
 * shows one thing and the rendered page another. That is the class of bug that
 * made v1's preview useless, so the unit tests here and the PHPUnit tests there
 * assert the same table of expectations on purpose.
 *
 * Resolution runs **per property path**, never per tier. Carrying whole tier
 * objects forward would let a narrower tier that sets only a margin discard the
 * padding it should have inherited — the server flattens to leaf paths for
 * exactly this reason, and so does this.
 */

import type { Breakpoint } from '../breakpoints/types';
import { clearPath, readPath, writePath } from './paths';
import type { SpaceryAttribute, StylePath } from './types';

/**
 * The value authored at one tier, if any.
 *
 * @param attribute The block's `spacery` attribute.
 * @param slug      Breakpoint slug to read.
 * @param path      Path to the leaf, e.g. `['spacing','padding','top']`.
 * @return The authored value, or undefined when this tier sets none.
 */
export function authoredAt(
	attribute: SpaceryAttribute | undefined,
	slug: string,
	path: StylePath
): string | undefined {
	return readPath(attribute?.[slug], path);
}

/**
 * The tier a value is inherited from, or undefined when nothing wider sets one.
 *
 * Desktop-first: a tier inherits from the nearest *wider* tier that sets a
 * value, because narrower viewports override wider ones.
 *
 * @param attribute   The block's `spacery` attribute.
 * @param breakpoints The active set, widest first.
 * @param slug        Breakpoint slug to resolve.
 * @param path        Path to the leaf.
 * @return The tier inherited from, or undefined.
 */
export function inheritedFrom(
	attribute: SpaceryAttribute | undefined,
	breakpoints: Breakpoint[],
	slug: string,
	path: StylePath
): Breakpoint | undefined {
	const index = breakpoints.findIndex((b) => b.slug === slug);

	if (index < 0) {
		return undefined;
	}

	// Walk toward wider tiers, which sit earlier in the widest-first list.
	for (let i = index - 1; i >= 0; i--) {
		const candidate = breakpoints[i]!;

		if (undefined !== authoredAt(attribute, candidate.slug, path)) {
			return candidate;
		}
	}

	return undefined;
}

/**
 * The value that actually applies at a tier, ignoring the block's base style.
 *
 * Returns undefined when no tier at or above this one sets the property, which
 * is the caller's signal to fall back to whatever core renders — the base
 * height for the spacer, the `style` attribute for every other block.
 *
 * @param attribute   The block's `spacery` attribute.
 * @param breakpoints The active set, widest first.
 * @param slug        Breakpoint slug to resolve.
 * @param path        Path to the leaf.
 * @return The effective value, or undefined.
 */
export function effectiveAt(
	attribute: SpaceryAttribute | undefined,
	breakpoints: Breakpoint[],
	slug: string,
	path: StylePath
): string | undefined {
	const index = breakpoints.findIndex((b) => b.slug === slug);

	if (index < 0) {
		return undefined;
	}

	for (let i = index; i >= 0; i--) {
		const authored = authoredAt(attribute, breakpoints[i]!.slug, path);

		if (undefined !== authored) {
			return authored;
		}
	}

	return undefined;
}

/**
 * Returns the attribute with one tier's value set or cleared.
 *
 * Clearing prunes the leaf, its empty ancestors, the tier, and finally the
 * attribute itself, so a block the author has reset serializes exactly as it
 * did before they touched it.
 *
 * @param attribute The block's `spacery` attribute.
 * @param slug      Breakpoint slug to set or clear.
 * @param path      Path to the leaf.
 * @param value     New value, or undefined/empty to clear.
 * @return The next attribute, or undefined when nothing is left.
 */
export function withValue(
	attribute: SpaceryAttribute | undefined,
	slug: string,
	path: StylePath,
	value: string | undefined
): SpaceryAttribute | undefined {
	const next: SpaceryAttribute = { ...(attribute ?? {}) };

	if (undefined === value || '' === value) {
		const pruned = clearPath(next[slug] ?? {}, path);

		if (undefined === pruned) {
			delete next[slug];
		} else {
			next[slug] = pruned;
		}
	} else {
		next[slug] = writePath(next[slug] ?? {}, path, value);
	}

	return 0 === Object.keys(next).length ? undefined : next;
}
