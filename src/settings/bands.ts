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

import type { Row } from './rows';
import type { Breakpoint, ValidationRules } from './types';

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

/**
 * The ramp, narrowest band to widest (design system §5.1).
 *
 * Hand-picked rather than computed, and the order is the argument: a narrow
 * band is the darkest because narrow screens are where a spacing value matters
 * most, and the eye reads dark as heavy. The lightest step is `#3858e9`, which
 * is WordPress's own primary and holds 5.6:1 against white — the floor for the
 * 12px white labels drawn inside these bands. **Nothing may be lighter than
 * the last stop**, which is why a ramp for more bands interpolates *between*
 * these rather than extending past them.
 */
const RAMP = ['#142269', '#1f3399', '#2c46c9', '#3858e9'] as const;

/**
 * The colour for one band.
 *
 * Samples {@link RAMP} at `index / (total - 1)`, interpolating between
 * adjacent stops, so four bands land on the four published values and twelve
 * bands share the same range in smaller steps. A lone band is drawn in the
 * lightest stop: it is the widest band there is, and the accent is the colour
 * the rest of the admin would use for it.
 *
 * @param index Which band, narrowest first.
 * @param total How many bands are drawn.
 * @return A hex colour.
 */
export function rampColor(index: number, total: number): string {
	if (2 > total) {
		return RAMP[RAMP.length - 1]!;
	}

	const position =
		(Math.min(Math.max(index, 0), total - 1) / (total - 1)) *
		(RAMP.length - 1);
	const lower = Math.floor(position);
	const upper = Math.min(lower + 1, RAMP.length - 1);

	return mix(RAMP[lower]!, RAMP[upper]!, position - lower);
}

/**
 * Two hex colours blended in sRGB.
 *
 * Naive on purpose. A perceptual space would space the middle stops more
 * evenly, but the four they sit between were chosen by eye against this
 * admin's white, and moving them to satisfy a colour model would be answering
 * a question nobody asked.
 *
 * @param from   Hex colour at `amount` 0.
 * @param to     Hex colour at `amount` 1.
 * @param amount Position between them, 0 to 1.
 * @return A hex colour.
 */
function mix(from: string, to: string, amount: number): string {
	const channels = [1, 3, 5].map((at) => {
		const start = parseInt(from.slice(at, at + 2), 16);
		const end = parseInt(to.slice(at, at + 2), 16);

		return Math.round(start + (end - start) * amount);
	});

	return `#${channels.map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * The narrowest share of the axis that can hold a tier's name.
 *
 * Below this a name is clipped mid-letter, which reads as a rendering fault
 * rather than as a small band.
 */
export const LABEL_FLOOR = 7;

/** One drawn region of the axis. */
export interface Segment {
	/** The tier's slug, or `default` for the region above the widest tier. */
	key: string;
	label: string;
	/**
	 * The authored upper edge, in the author's own units — empty for the
	 * uncovered region, which nobody authored.
	 *
	 * Carried rather than derived from `toPx` because §5.1 is explicit that
	 * positions are pixel-derived while labels keep the units that were typed:
	 * an author who wrote `55.5rem` is owed `55.5rem` back.
	 */
	max: string;
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
 * What a tier covers, as a range.
 *
 * The compact form the `Covers` column uses, where a sentence per row would be
 * four sentences saying the same shape. {@link band} is the same fact written
 * out, for the ruler's description and anywhere else a reader needs prose.
 *
 * @param tiers The set, widest first.
 * @param index Which tier.
 * @return Its band as `888px – 1400px`, or `up to 450px` for the narrowest.
 */
export function range(tiers: Breakpoint[], index: number): string {
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
		/* translators: 1: a CSS length. 2: a wider CSS length. An en dash separates them. */
		__('%1$s – %2$s', 'spacery'),
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

		segments.push(
			segment(tier.slug, tier.label, tier.max, fromPx, toPx, axisMaxPx)
		);

		fromPx = toPx;
	}

	/*
	 * The region no tier claims. Absent when the widest tier runs past the
	 * axis, because then there is nothing above it left to draw.
	 */
	if (fromPx < axisMaxPx) {
		/*
		 * "no tier", not "Default" (§5.1). This band is drawn hatched because
		 * nothing claims it, and `Default` is a word this plugin has already
		 * spent: the spacer block calls its own base height that, and the
		 * provenance lines deliberately avoid it for the same reason.
		 */
		segments.push(
			segment(
				'default',
				__('no tier', 'spacery'),
				'',
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
 * @param max       The authored upper edge, or an empty string.
 * @param fromPx    Lower edge.
 * @param toPx      Real upper edge.
 * @param axisMaxPx Where the axis stops.
 * @return The segment.
 */
function segment(
	key: string,
	label: string,
	max: string,
	fromPx: number,
	toPx: number,
	axisMaxPx: number
): Segment {
	const drawnFrom = Math.min(fromPx, axisMaxPx);
	const drawnTo = Math.min(toPx, axisMaxPx);

	return {
		key,
		label,
		max,
		fromPx,
		toPx,
		share: 0 === axisMaxPx ? 0 : ((drawnTo - drawnFrom) / axisMaxPx) * 100,
		clipped: toPx > axisMaxPx,
	};
}

/** What one editing row covers, for the `Covers` column. */
export interface Coverage {
	/** The band as a sentence, or an empty string when there is nothing to say. */
	text: string;
	/** False when the row covers no width at all. */
	covers: boolean;
}

/**
 * What each row being edited covers.
 *
 * The same question the ruler answers, asked of rows rather than of a resolved
 * set — so it goes through the same {@link band}, which is the whole reason
 * that function takes a list and an index rather than one tier. A second
 * implementation would eventually disagree with the drawing beside it.
 *
 * Rows are authored in whatever order they were added and a width can be
 * half-typed, so this sorts what it can use and ignores what it cannot: a row
 * with no usable width yet has nothing to say about coverage, and the message
 * on its own field is already saying it.
 *
 * @param rows  The rows being edited.
 * @param rules The server's own rules, for the pixels-per-em.
 * @return One entry per row, keyed by the row's client id.
 */
export function coverage(
	rows: Row[],
	rules: ValidationRules
): Record<string, Coverage> {
	const widths = new Set<number>();
	const usable: Array<{ row: Row; px: number }> = [];
	const nothing = new Set<string>();

	/*
	 * Walked in the order they were authored, so the *first* row at a width
	 * keeps it and a later one at the same width is the one left covering
	 * nothing. That is not an arbitrary choice between the two: it is the row
	 * `validate()` puts the error on, and one problem must not accuse two
	 * different rows in two different columns.
	 */
	for (const row of rows) {
		const px = toPixels(row.max, rules.pixelsPerEm);

		if (!Number.isFinite(px) || 0 >= px) {
			continue;
		}

		if (widths.has(px)) {
			nothing.add(row.id);
			continue;
		}

		widths.add(px);
		usable.push({ row, px });
	}

	usable.sort((one, other) => other.px - one.px);

	const tiers: Breakpoint[] = usable.map(({ row }) => ({
		slug: row.slug,
		label: row.label,
		max: row.max,
	}));

	const found: Record<string, Coverage> = {};

	for (const row of rows) {
		found[row.id] = nothing.has(row.id)
			? { text: __('Nothing', 'spacery'), covers: false }
			: { text: '', covers: true };
	}

	usable.forEach(({ row }, index) => {
		found[row.id] = { text: range(tiers, index), covers: true };
	});

	return found;
}

/**
 * The closest two axis marks may sit, as a percentage of the axis.
 *
 * A label is around 45px wide and the marks are centred on their boundaries,
 * so two boundaries a few percent apart print one number over another. Twelve
 * tiers did exactly that: `320px` and `400px` came out as `320p400px`.
 */
const MIN_TICK_GAP = 6;

/** One labelled mark on the axis under the ruler. */
export interface Tick {
	/** Where it sits, as a percentage of the axis. */
	at: number;
	/** What it reads, in the author's own units. */
	label: string;
}

/**
 * The marks under the bar, at zero and at every boundary.
 *
 * The boundaries are the numbers the author typed, so the axis is where the
 * drawing and the table meet: a band's right edge sits above the width that
 * ends it. A band running past the axis contributes no mark — its real width
 * is written inside it instead, because a mark at the cut edge would label the
 * cut rather than the boundary.
 *
 * @param segments The bands to draw, narrowest first.
 * @return One tick per boundary, left to right.
 */
export function axisTicks(segments: Segment[]): Tick[] {
	const boundaries: Tick[] = [];
	let at = 0;

	for (const region of segments) {
		at += region.share;

		if ('default' !== region.key && !region.clipped) {
			boundaries.push({ at, label: region.max });
		}
	}

	const kept: Tick[] = [{ at: 0, label: '0' }];

	boundaries.forEach((tick, index) => {
		const last = kept.at(-1)!;

		if (MIN_TICK_GAP <= tick.at - last.at) {
			kept.push(tick);
			return;
		}

		/*
		 * The widest boundary is the one number on this axis nobody can infer
		 * from the others, and the callout beneath refers to it, so it keeps
		 * its place and the crowded mark before it gives way. Zero never does:
		 * it is where the axis starts.
		 */
		if (index === boundaries.length - 1) {
			if (0 < last.at) {
				kept.pop();
			}

			kept.push(tick);
		}
	});

	return kept;
}

/**
 * Whether the bands can carry their names, all of them or none.
 *
 * All or nothing on purpose. Per-band fitting looked like a defect at twelve
 * tiers: the shares land either side of the floor almost at random, so one
 * band came out blank between two labelled ones, which reads as a name that
 * failed to render rather than as a band too narrow to hold one. The list
 * beside the ruler names every tier either way.
 *
 * The uncovered region is not consulted — it is a remainder, and a thin one is
 * normal.
 *
 * @param segments The bands to draw.
 * @return Whether to draw names inside them.
 */
export function labelsFit(segments: Segment[]): boolean {
	return segments
		.filter((region) => 'default' !== region.key)
		.every((region) => LABEL_FLOOR <= region.share);
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
