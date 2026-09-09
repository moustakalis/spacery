/**
 * Whether a tier set fits a segmented control, or needs a dropdown.
 *
 * `ToggleGroupControl` does not wrap. It divides the width it is given, so past
 * some point the segments stop being readable rather than starting a second
 * row. The question is therefore how much *content* the row carries, and that
 * differs by an order of magnitude between the two things a segment can hold.
 */

import type { Breakpoint } from './types';

/**
 * Segments a set of icons can fill.
 *
 * A statement of fact rather than a judgement: there are four device glyphs, so
 * `iconsAreDistinct()` is false for any set larger than this and the icon
 * branch is unreachable beyond it. It is written down so the two cannot drift
 * if a fifth glyph is ever added.
 */
const MAX_ICON_SEGMENTS = 4;

/**
 * Segments a set of labels can fill, and the characters they may spend.
 *
 * Counting tiers alone was the bug: five was chosen for labels like "Laptop",
 * but tier names are theme-authored and arbitrary, so `Sm`/`Md`/`Lg`/`Xl` and
 * `Widescreen`/`Desktop`/`Laptop`/`Handheld` are both "four labels" and only
 * one of them fits an inspector column. The budget is what actually runs out.
 *
 * Twenty-eight characters is roughly seven per segment across the ~250px an
 * inspector gives, which is what "Desktop" costs.
 */
const MAX_LABEL_SEGMENTS = 4;
const LABEL_BUDGET = 28;

/**
 * Whether these tiers can be shown as segments.
 *
 * @param breakpoints The active set.
 * @param withIcons   Whether the segments will carry icons rather than names.
 * @return True when a segmented control is readable; false for a dropdown.
 */
export function fitsAsSegments(
	breakpoints: Breakpoint[],
	withIcons: boolean
): boolean {
	if (withIcons) {
		return breakpoints.length <= MAX_ICON_SEGMENTS;
	}

	if (breakpoints.length > MAX_LABEL_SEGMENTS) {
		return false;
	}

	const characters = breakpoints.reduce(
		(total, breakpoint) => total + breakpoint.label.length,
		0
	);

	return characters <= LABEL_BUDGET;
}
