/**
 * Which spacing properties a block lets Spacery edit.
 *
 * Spacery extends **any** block declaring `supports.spacing`, core and
 * third-party alike, rather than an allow-list of block names. An allow-list
 * would have to be maintained against every plugin in the directory and would
 * still be wrong the day after each release; block supports are the platform's
 * own statement of what a block is willing to have spacing applied to, and
 * honouring them is both smaller and more accurate.
 *
 * `blockGap` is read but never offered. Gap flows through layout supports and
 * a custom property rather than a declaration on the wrapper, so it is a
 * different problem with a different failure mode — see M5a in docs/PLAN.md.
 */

import { __ } from '@wordpress/i18n';

import type { StylePath } from '../attribute/types';

/** The four physical sides, in the order CSS shorthand uses. */
export const SIDES = ['top', 'right', 'bottom', 'left'] as const;

export type Side = (typeof SIDES)[number];

/** The spacing features Spacery edits. Deliberately not `blockGap`. */
export const FEATURES = ['padding', 'margin'] as const;

export type Feature = (typeof FEATURES)[number];

/**
 * Sides a block supports for one feature, with the feature's label.
 */
export interface SpacingFeature {
	feature: Feature;
	label: string;
	sides: Side[];
}

/**
 * Expands one side declaration into the sides it names.
 *
 * Core accepts three forms — `true` for everything, an array of sides, and an
 * array using the axial keywords `horizontal` and `vertical`. Unknown entries
 * are dropped rather than guessed at, so a block declaring something Spacery
 * has never heard of loses that one entry instead of its whole panel.
 *
 * @param value The value of `supports.spacing.padding` or `.margin`.
 * @return The sides, in canonical order, without duplicates.
 */
export function sidesFor(value: unknown): Side[] {
	if (true === value) {
		return [...SIDES];
	}

	if (!Array.isArray(value)) {
		return [];
	}

	const named = new Set<Side>();

	for (const entry of value) {
		if ('horizontal' === entry) {
			named.add('left');
			named.add('right');
			continue;
		}

		if ('vertical' === entry) {
			named.add('top');
			named.add('bottom');
			continue;
		}

		if (isSide(entry)) {
			named.add(entry);
		}
	}

	// Canonical order, so two blocks declaring the same sides render alike.
	return SIDES.filter((side) => named.has(side));
}

/**
 * The features a block's `supports.spacing` offers, dropping empty ones.
 *
 * @param support The block's `supports.spacing` value.
 * @return One entry per feature with at least one side.
 */
export function spacingFeatures(support: unknown): SpacingFeature[] {
	if ('object' !== typeof support || null === support) {
		return [];
	}

	const declared = support as Record<string, unknown>;

	return FEATURES.map((feature) => ({
		feature,
		label: featureLabel(feature),
		sides: sidesFor(declared[feature]),
	})).filter(({ sides }) => sides.length > 0);
}

/**
 * Where a feature's side lives inside a tier's style object.
 *
 * The same path core uses in its own `style` attribute, which is what lets the
 * server hand a tier straight to the Style Engine with no translation step.
 *
 * @param feature The spacing feature.
 * @param side    The side.
 * @return The path to the leaf.
 */
export function pathFor(feature: Feature, side: Side): StylePath {
	return ['spacing', feature, side];
}

/**
 * The translated name of a feature.
 *
 * @param feature The spacing feature.
 * @return A human-readable label.
 */
function featureLabel(feature: Feature): string {
	return 'padding' === feature
		? __('Padding', 'spacery')
		: __('Margin', 'spacery');
}

/**
 * The translated name of a side.
 *
 * @param side The side.
 * @return A human-readable label.
 */
export function sideLabel(side: Side): string {
	switch (side) {
		case 'top':
			return __('Top', 'spacery');
		case 'right':
			return __('Right', 'spacery');
		case 'bottom':
			return __('Bottom', 'spacery');
		default:
			return __('Left', 'spacery');
	}
}

/**
 * Whether a value names one of the four sides.
 *
 * @param value Anything.
 * @return True when the value is a side.
 */
function isSide(value: unknown): value is Side {
	return SIDES.includes(value as Side);
}
