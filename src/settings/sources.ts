/**
 * Naming the breakpoint sources, and what choosing one would get you.
 *
 * Separate from `App.tsx` because every function here is a sentence the author
 * reads, and a sentence that changes with the number of breakpoints on the site
 * is one that has to be tested at twelve as well as at three.
 */

import { __, _n, sprintf } from '@wordpress/i18n';

import type {
	Breakpoint,
	BreakpointInfo,
	EffectiveSource,
	StoredSource,
} from './types';

/**
 * How many tiers a label names before it starts counting instead (S7).
 *
 * Three, because that is what the default sets hold: the common case is named
 * in full, and only a set someone has deliberately grown gets summarised.
 */
export const NAMED_TIERS = 3;

/**
 * A tier as "Label (782px)".
 *
 * @param tier A breakpoint.
 * @return A short description.
 */
export function describeTier(tier: Breakpoint): string {
	return `${tier.label} (${tier.max})`;
}

/**
 * A bounded list of tiers.
 *
 * The unbounded form was finding S7: `map(describeTier).join(', ')` puts every
 * breakpoint in one radio label, so a site with twelve of them gets a label
 * naming twelve widths on a single line — and the line the author is reading is
 * the one they have to choose from.
 *
 * @param tiers The set to name.
 * @param limit How many to name before counting the rest.
 * @return A comma-separated list, ending in a count when it is a long one.
 */
export function listTiers(
	tiers: Breakpoint[],
	limit: number = NAMED_TIERS
): string {
	if (0 === tiers.length) {
		return '';
	}

	const naming = Math.max(1, limit);
	const named = tiers.slice(0, naming).map(describeTier).join(', ');
	const rest = tiers.length - naming;

	if (rest <= 0) {
		return named;
	}

	return sprintf(
		/* translators: 1: comma-separated breakpoint names. 2: how many further breakpoints there are. */
		_n('%1$s and %2$d more', '%1$s and %2$d more', rest, 'spacery'),
		named,
		rest
	);
}

/**
 * A readable name for a source.
 *
 * The stored value is a slug, and a settings screen that prints `spacery` at
 * someone is showing them the database rather than an answer. Exhaustive over
 * `EffectiveSource` on purpose: adding a fourth source should fail the
 * typecheck here rather than quietly render its slug.
 *
 * @param source The source in effect.
 * @return A human-readable name.
 */
export function sourceName(source: EffectiveSource): string {
	switch (source) {
		case 'theme':
			return __('your theme', 'spacery');
		case 'custom':
			return __('the breakpoints you defined', 'spacery');
		default:
			return __("Spacery's own set", 'spacery');
	}
}

/**
 * The radio options, each saying what choosing it would get you.
 *
 * The theme entry names its breakpoints rather than saying "Theme", because
 * whether the theme has any is the fact the choice turns on.
 *
 * @param info What each source contains.
 * @return Options for RadioControl.
 */
export function sourceOptions(
	info: BreakpointInfo
): Array<{ label: string; value: string }> {
	const themeTiers = info.theme ?? [];
	const themeLabel =
		0 === themeTiers.length
			? __('This theme — it declares no breakpoints', 'spacery')
			: sprintf(
					/* translators: %s: a list of breakpoint names. */
					__('This theme — %s', 'spacery'),
					listTiers(themeTiers)
				);

	return [
		{
			value: '',
			label: sprintf(
				/* translators: %s: the source that will be followed. */
				__('Decide for me — currently %s', 'spacery'),
				sourceName(info.defaultSource)
			),
		},
		{ value: 'theme', label: themeLabel },
		{
			value: 'spacery',
			label: sprintf(
				/* translators: %s: a list of breakpoint names. */
				__("Spacery's own — %s", 'spacery'),
				listTiers(info.preset)
			),
		},
		{ value: 'custom', label: __('Breakpoints I define below', 'spacery') },
	];
}

/**
 * Why the set in use is not the set that was chosen.
 *
 * The screen used to print `From: Spacery's own set` under a chosen source of
 * `custom` and leave it there: the author is looking at a choice they made and
 * a result that contradicts it, with nothing connecting the two. A source can
 * be chosen and still be empty — custom with no rows yet, theme on a theme that
 * declares none — and in both cases the honest answer names the choice, the
 * reason it is not in effect, and what is running instead.
 *
 * @param source The stored choice.
 * @param info   What each source contains.
 * @return A sentence, or null when the choice is what is in effect.
 */
export function fallbackNotice(
	source: StoredSource,
	info: BreakpointInfo
): string | null {
	if ('' === source || source === info.effectiveSource) {
		return null;
	}

	const inUse = sourceName(info.effectiveSource);

	if ('custom' === source) {
		return sprintf(
			/* translators: %s: the breakpoint set in use instead. */
			__(
				'You chose your own breakpoints but have not defined any yet, so %s is in use until you add one.',
				'spacery'
			),
			inUse
		);
	}

	if ('theme' === source) {
		return sprintf(
			/* translators: %s: the breakpoint set in use instead. */
			__(
				"You chose your theme's breakpoints but it declares none, so %s is in use until it does.",
				'spacery'
			),
			inUse
		);
	}

	return sprintf(
		/* translators: %s: the breakpoint set in use instead. */
		__('The set you chose is empty, so %s is in use.', 'spacery'),
		inUse
	);
}
