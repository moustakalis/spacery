/**
 * What each tier covers, in words and in geometry.
 *
 * The `Covers` column and the ruler beside it are two readings of one fact, so
 * they come from one function. Two implementations of "what does Laptop
 * cover?" would eventually disagree, and the ruler is exactly the control an
 * author would trust over the text.
 *
 * Tiers are disjoint bands, not a cascade (D13): a tier runs from the next
 * narrower tier's boundary up to its own. Above the widest tier there is no
 * media query at all — that is the default, and it is worth drawing, because a
 * set whose widest tier stops at 1024px leaves every larger screen to it.
 */

import { __, sprintf } from '@wordpress/i18n';

import type { Breakpoint } from './types';

/**
 * Where the axis stops, however wide a tier claims to be.
 *
 * 2560px covers every display an author is designing for. The clamp exists
 * because the server enforces no upper bound: a real capture of this screen had
 * `desktop` at `11920px`, plainly a typo for `1920`, which is a valid length,
 * above zero, and strictly descending against the tier below it. Drawn on a
 * linear axis it would take 89% of the ruler and squeeze the other three tiers
 * into slivers — destroying the graphic exactly when it is most needed.
 */
export const CEILING_PX = 2560;

/** Headroom above the widest tier, so the uncovered region is visible. */
const HEADROOM = 1.15;

/** One drawn region of the axis. */
export interface Segment {
	/** The tier's slug, or `default` for the region above the widest tier. */
	key: string;
	label: string;
	fromPx: number;
	/** The real upper edge, which may be beyond the axis. */
	toPx: number;
	/** Percentage of the axis this occupies, after clipping. */
	share: number;
	/** Whether its real upper edge is past the axis and has been cut. */
	clipped: boolean;
}

/** The ruler's geometry. */
export interface Ruler {
	segments: Segment[];
	axisMaxPx: number;
	/** Whether a tier reaches past the axis, so the edge must read as cut. */
	clamped: boolean;
}

/**
 * A width in pixels, for positioning only.
 *
 * @param value       A validated length.
 * @param pixelsPerEm From the server's own constant.
 * @return The width in pixels.
 */
export function toPixels(value: string, pixelsPerEm: number): number {
	const length = value.trim();
	const number = parseFloat(length);

	return length.endsWith('em') ? number * pixelsPerEm : number;
}

/**
 * What a tier covers, as a sentence.
 *
 * @param tiers The resolved set, widest first.
 * @param index Which tier.
 * @return A description of its band.
 */
export function band(tiers: Breakpoint[], index: number): string {
	const tier = tiers[index]!;
	const narrower = tiers[index + 1];

	if (!narrower) {
		return sprintf(
			/* translators: %s: a CSS length, e.g. "480px". */
			__('up to %s', 'spacery'),
			tier.max
		);
	}

	return sprintf(
		/* translators: 1: a CSS length. 2: a wider CSS length. */
		__('over %1$s, up to %2$s', 'spacery'),
		narrower.max,
		tier.max
	);
}

/**
 * The bands to draw, narrowest first, and the axis they sit on.
 *
 * @param tiers       The resolved set, widest first.
 * @param pixelsPerEm From the server's own constant.
 * @return The geometry, or an empty ruler when there are no tiers.
 */
export function ruler(tiers: Breakpoint[], pixelsPerEm: number): Ruler {
	if (0 === tiers.length) {
		return { segments: [], axisMaxPx: 0, clamped: false };
	}

	const widestPx = toPixels(tiers[0]!.max, pixelsPerEm);
	const axisMaxPx = Math.min(widestPx * HEADROOM, CEILING_PX);
	const clamped = widestPx > axisMaxPx;

	const ascending = [...tiers].reverse();
	const segments: Segment[] = [];

	let fromPx = 0;

	for (const tier of ascending) {
		const toPx = toPixels(tier.max, pixelsPerEm);

		segments.push(segment(tier.slug, tier.label, fromPx, toPx, axisMaxPx));

		fromPx = toPx;
	}

	/*
	 * The region no tier claims. Absent when the widest tier runs past the
	 * axis, because then there is nothing above it left to draw.
	 */
	if (fromPx < axisMaxPx) {
		segments.push(
			segment(
				'default',
				__('Default', 'spacery'),
				fromPx,
				axisMaxPx,
				axisMaxPx
			)
		);
	}

	return { segments, axisMaxPx, clamped };
}

/**
 * One band, clipped to the axis.
 *
 * @param key       Slug or `default`.
 * @param label     Its name.
 * @param fromPx    Lower edge.
 * @param toPx      Real upper edge.
 * @param axisMaxPx Where the axis stops.
 * @return The segment.
 */
function segment(
	key: string,
	label: string,
	fromPx: number,
	toPx: number,
	axisMaxPx: number
): Segment {
	const drawnFrom = Math.min(fromPx, axisMaxPx);
	const drawnTo = Math.min(toPx, axisMaxPx);

	return {
		key,
		label,
		fromPx,
		toPx,
		share: 0 === axisMaxPx ? 0 : ((drawnTo - drawnFrom) / axisMaxPx) * 100,
		clipped: toPx > axisMaxPx,
	};
}

/**
 * A narrower width the author may have meant, when one is obvious.
 *
 * Only ever a dropped leading digit, which is what `11920px` for `1920px` is.
 * Anything cleverer would be guessing: a width above the ceiling is legal, and
 * the author may have meant it.
 *
 * @param max         The typed length.
 * @param pixelsPerEm From the server's own constant.
 * @return A suggestion, or undefined when none is obvious.
 */
export function didYouMean(
	max: string,
	pixelsPerEm: number
): string | undefined {
	// Only ever offered about a width that is already past the ceiling: below
	// it, dropping a digit turns a deliberate value into a smaller deliberate
	// value and suggests it for no reason.
	if (CEILING_PX >= toPixels(max, pixelsPerEm)) {
		return undefined;
	}

	const match = /^(\d+)(px|em|rem)$/.exec(max.trim());

	if (!match) {
		return undefined;
	}

	const [, digits, unit] = match as unknown as [string, string, string];

	if (2 > digits.length || digits.startsWith('0')) {
		return undefined;
	}

	const shorter = digits.slice(1);

	if (shorter.startsWith('0')) {
		return undefined;
	}

	const candidate = `${shorter}${unit}`;
	const pixels = toPixels(candidate, pixelsPerEm);

	return 0 < pixels && pixels <= CEILING_PX ? candidate : undefined;
}
