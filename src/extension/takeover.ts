/**
 * Taking over a value core already sets responsively (decision D11).
 *
 * WordPress 7.1 writes its own responsive styles into the block's `style`
 * attribute under viewport keys — `style['@tablet'].spacing.padding.top`. A
 * block can therefore carry both a core `@tablet` padding and a Spacery
 * `tablet` padding for the same property. Since D10 aligned Spacery with core's
 * desktop-first direction this is no longer a cascade puzzle — later wins, and
 * Spacery's stylesheet is enqueued after global styles — but emitting two rules
 * for one property is confusing to anyone reading the CSS, and the second one
 * is invisible in core's inspector.
 *
 * So it is resolved in the inspector rather than in the stylesheet: Spacery
 * surfaces the core value, and moves it into the matching Spacery tier when the
 * author asks. Nothing migrates on its own. A silent rewrite of core's
 * attribute would be a plugin editing data it does not own.
 *
 * Takeover is offered **only when the boundaries agree**. A Spacery `tablet`
 * tier that shares core's name but not its 782px bound would apply the value
 * over a different range of widths, which is a change of meaning dressed up as
 * a move. Where they differ Spacery says so and leaves the value alone.
 */

import { clearPath, readPath } from '../attribute/paths';
import { withValue } from '../attribute/tiers';
import type {
	SpaceryAttribute,
	StyleNode,
	StylePath,
} from '../attribute/types';
import type { Breakpoint } from '../breakpoints/types';

/** Prefix core uses for a viewport key inside the `style` attribute. */
export const VIEWPORT_PREFIX = '@';

/**
 * One property core sets at one viewport.
 */
export interface CoreOverride {
	/** Core's viewport slug, e.g. `tablet`. */
	viewport: string;
	/** Core's own label for that viewport. */
	label: string;
	/** Path to the property inside a tier, e.g. `['spacing','padding','top']`. */
	path: StylePath;
	/** The value core sets there. */
	value: string;
	/** The Spacery tier sharing the slug, when there is one. */
	tier: Breakpoint | undefined;
	/** Whether that tier's boundary differs from core's. */
	boundsDiffer: boolean;
}

/**
 * Every core viewport value among the given properties.
 *
 * @param style        The block's `style` attribute.
 * @param paths        Property paths to look at.
 * @param breakpoints  Spacery's active set.
 * @param coreViewport Core's `settings.viewport` tiers.
 * @return One entry per property core sets at a viewport.
 */
export function coreOverrides(
	style: StyleNode | undefined,
	paths: StylePath[],
	breakpoints: Breakpoint[],
	coreViewport: Breakpoint[]
): CoreOverride[] {
	if (!style) {
		return [];
	}

	const overrides: CoreOverride[] = [];

	for (const key of Object.keys(style)) {
		if (!key.startsWith(VIEWPORT_PREFIX)) {
			continue;
		}

		const viewport = key.slice(VIEWPORT_PREFIX.length);
		const core = coreViewport.find((v) => v.slug === viewport);
		const tier = breakpoints.find((b) => b.slug === viewport);

		for (const path of paths) {
			const value = readPath(style[key], path);

			if (undefined === value) {
				continue;
			}

			overrides.push({
				viewport,
				label: core?.label ?? viewport,
				path,
				value,
				tier,
				/*
				 * An unknown core bound counts as differing. Spacery would be
				 * guessing that the ranges line up, and a wrong guess moves a
				 * value to widths the author never chose.
				 */
				boundsDiffer: undefined === core?.max || core.max !== tier?.max,
			});
		}
	}

	return overrides;
}

/**
 * Whether an override can be moved into a Spacery tier without changing which
 * widths it applies to.
 *
 * @param override A core override.
 * @return True when a matching tier exists with the same boundary.
 */
export function canTakeOver(override: CoreOverride): boolean {
	return undefined !== override.tier && !override.boundsDiffer;
}

/**
 * Moves core's values into the matching Spacery tiers.
 *
 * Returns both attributes so the caller can apply them in a single
 * `setAttributes()` — two calls would put a half-migrated state on the undo
 * stack, where the value exists in neither place or in both.
 *
 * @param attribute The block's `spacery` attribute.
 * @param style     The block's `style` attribute.
 * @param overrides The overrides to move. Entries that cannot move are ignored.
 * @return The next `spacery` and `style` attributes.
 */
export function takeOver(
	attribute: SpaceryAttribute | undefined,
	style: StyleNode | undefined,
	overrides: CoreOverride[]
): { spacery: SpaceryAttribute | undefined; style: StyleNode | undefined } {
	let nextSpacery = attribute;
	let nextStyle = style;

	for (const override of overrides) {
		if (!canTakeOver(override) || !nextStyle) {
			continue;
		}

		nextSpacery = withValue(
			nextSpacery,
			override.tier!.slug,
			override.path,
			override.value
		);

		nextStyle = clearPath(nextStyle, [
			VIEWPORT_PREFIX + override.viewport,
			...override.path,
		]);
	}

	return { spacery: nextSpacery, style: nextStyle };
}
