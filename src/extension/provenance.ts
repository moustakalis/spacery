/**
 * Where a box's values come from, in a sentence.
 *
 * The panel showed an inherited value as grey text in a field identical to an
 * authored one, which is a thin signal for a distinction this large — grey at
 * 13px is also what WordPress uses for *disabled*, so a placeholder could read
 * as a field that cannot be edited. The line this builds says it in words.
 *
 * A box has up to four sides and they can inherit from different tiers, so the
 * summary needs a rule rather than a value. The states below are that rule.
 * The last one matters most: when nothing is authored and nothing is inherited
 * there is no provenance, and printing one anyway is the same mistake as the
 * spacer's "Inherited from Default" with no default.
 */

import { inheritedFrom } from '../attribute/tiers';
import { readPath } from '../attribute/paths';
import type {
	SpaceryAttribute,
	StyleNode,
	StylePath,
} from '../attribute/types';
import type { Breakpoint } from '../breakpoints/types';
import { __, sprintf } from '@wordpress/i18n';

/** The attributes this needs, without depending on the panel that holds them. */
interface Spaced {
	spacery?: SpaceryAttribute | undefined;
	style?: StyleNode | undefined;
}

/**
 * Where one side's effective value comes from.
 *
 * `undefined` means nowhere: no wider tier sets it and the block's own spacing
 * does not either.
 */
type SideSource = Breakpoint | 'own' | undefined;

/**
 * The source of one side's value at a tier, ignoring anything authored here.
 *
 * Mirrors `inheritedValue()`'s chain exactly — nearest wider tier first, then
 * the block's own non-responsive `style` — because the sentence and the
 * placeholder must not disagree about where a number came from.
 *
 * @param attributes  The block's attributes.
 * @param breakpoints The active set, widest first.
 * @param slug        The tier being edited.
 * @param path        Path to the leaf.
 * @return The source, or undefined when there is none.
 */
function sourceFor(
	attributes: Spaced,
	breakpoints: Breakpoint[],
	slug: string,
	path: StylePath
): SideSource {
	const tier = inheritedFrom(attributes.spacery, breakpoints, slug, path);

	if (tier) {
		return tier;
	}

	return readPath(attributes.style, path) ? 'own' : undefined;
}

/**
 * Names a source for the sentence.
 *
 * The block's own spacing is not a tier, and calling it "Default" — as the
 * spacer does for its own base height — would name a control this panel does
 * not have. Core's ordinary spacing controls are what it means.
 *
 * @param source A side's source.
 * @return Its name.
 */
function nameOf(source: Exclude<SideSource, undefined>): string {
	return 'own' === source
		? __("this block's own spacing", 'spacery')
		: source.label;
}

/**
 * A sentence describing where this box's values come from, or nothing.
 *
 * @param attributes  The block's attributes.
 * @param breakpoints The active set, widest first.
 * @param slug        The tier being edited.
 * @param paths       One path per side the block supports.
 * @return The line, or undefined when there is nothing true to say.
 */
export function describeBoxProvenance(
	attributes: Spaced,
	breakpoints: Breakpoint[],
	slug: string,
	paths: StylePath[]
): string | undefined {
	const authored = paths.filter(
		(path) => undefined !== readPath(attributes.spacery?.[slug], path)
	);

	if (authored.length === paths.length && 0 < paths.length) {
		return __('Set here', 'spacery');
	}

	if (0 < authored.length) {
		return __('Partly set here', 'spacery');
	}

	const names = new Set<string>();

	for (const path of paths) {
		const source = sourceFor(attributes, breakpoints, slug, path);

		if (undefined !== source) {
			names.add(nameOf(source));
		}
	}

	const sources = [...names];

	if (0 === sources.length) {
		return undefined;
	}

	if (1 === sources.length) {
		return sprintf(
			/* translators: %s: a breakpoint name, or "this block's own spacing". */
			__('Inherited from %s', 'spacery'),
			sources[0]
		);
	}

	if (2 === sources.length) {
		return sprintf(
			/* translators: 1: a breakpoint name. 2: another breakpoint name. */
			__('Inherited from %1$s and %2$s', 'spacery'),
			sources[0],
			sources[1]
		);
	}

	/*
	 * Not "breakpoints": one of these can be the block's own spacing, which is
	 * not a breakpoint, and a box has to be inheriting on three sides from
	 * three different places to get here at all.
	 */
	return sprintf(
		/* translators: %d: how many places a box's values come from. */
		__('Inherited from %d different places', 'spacery'),
		sources.length
	);
}
