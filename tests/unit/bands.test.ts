/**
 * What each tier covers, and the ruler that draws it.
 */

import { describe, expect, it } from 'vitest';

import {
	axisTicks,
	band,
	coverage,
	didYouMean,
	labelsFit,
	LABEL_FLOOR,
	rampColor,
	ruler,
} from '../../src/settings/bands';
import { toRows } from '../../src/settings/rows';
import type { Breakpoint, ValidationRules } from '../../src/settings/types';
import { cautions, validate } from '../../src/settings/validate';

const PRESET: Breakpoint[] = [
	{ slug: 'desktop', label: 'Desktop', max: '1280px' },
	{ slug: 'laptop', label: 'Laptop', max: '1024px' },
	{ slug: 'tablet', label: 'Tablet', max: '782px' },
	{ slug: 'mobile', label: 'Mobile', max: '480px' },
];

const RULES: ValidationRules = {
	slugPattern: '^[a-z0-9-]+$',
	lengthPattern: '^(?:\\d+|\\d*\\.\\d+)(?:px|em|rem)$',
	pixelsPerEm: 16,
	maxBreakpoints: 12,
};

describe('band', () => {
	it('gives the narrowest tier an open lower edge', () => {
		expect(band(PRESET, 3)).toBe('up to 480px');
	});

	it('runs a tier from the next narrower boundary to its own', () => {
		expect(band(PRESET, 2)).toBe('over 480px, up to 782px');
	});
});

describe('ruler', () => {
	it('draws nothing without tiers', () => {
		expect(ruler([], 16).segments).toStrictEqual([]);
	});

	it('lays the bands out narrowest first, with the default above them', () => {
		const { segments } = ruler(PRESET, 16);

		expect(segments.map((s) => s.key)).toStrictEqual([
			'mobile',
			'tablet',
			'laptop',
			'desktop',
			'default',
		]);
	});

	it('leaves headroom so the uncovered region is visible', () => {
		const { axisMaxPx, clamped } = ruler(PRESET, 16);

		expect(axisMaxPx).toBeCloseTo(1280 * 1.15);
		expect(clamped).toBe(false);
	});

	it('fills the axis exactly', () => {
		const total = ruler(PRESET, 16).segments.reduce(
			(sum, segment) => sum + segment.share,
			0
		);

		expect(total).toBeCloseTo(100);
	});

	it('converts em to pixels before positioning', () => {
		const inEm: Breakpoint[] = [
			{ slug: 'wide', label: 'Wide', max: '80rem' },
			{ slug: 'narrow', label: 'Narrow', max: '40rem' },
		];

		const narrow = ruler(inEm, 16).segments[0]!;

		expect(narrow.toPx).toBe(640);
	});

	/**
	 * The case this guard exists for: a real capture had `desktop` at
	 * `11920px`, plainly a typo for `1920px`, which passes every server rule.
	 * Drawn on a linear axis it would take 89% of the ruler.
	 */
	describe('with a width far past any real screen', () => {
		const typo: Breakpoint[] = [
			{ slug: 'desktop', label: 'Desktop', max: '11920px' },
			{ slug: 'laptop', label: 'Laptop', max: '1300px' },
		];

		it('clamps the axis rather than letting one tier own it', () => {
			const { axisMaxPx, clamped } = ruler(typo, 16);

			expect(axisMaxPx).toBe(2560);
			expect(clamped).toBe(true);
		});

		it('marks the band as cut, keeping its real edge', () => {
			const desktop = ruler(typo, 16).segments[1]!;

			expect(desktop.clipped).toBe(true);
			expect(desktop.toPx).toBe(11920);
		});

		it('leaves the tiers below it legible', () => {
			const laptop = ruler(typo, 16).segments[0]!;

			// Better than the 11% a linear axis would have given it.
			expect(laptop.share).toBeCloseTo((1300 / 2560) * 100);
		});

		it('draws no default region, since nothing is above the widest', () => {
			expect(
				ruler(typo, 16).segments.some((s) => 'default' === s.key)
			).toBe(false);
		});
	});
});

describe('didYouMean', () => {
	it('offers the value without its leading digit', () => {
		expect(didYouMean('11920px', 16)).toBe('1920px');
	});

	it('says nothing about a width that is not suspect', () => {
		expect(didYouMean('1920px', 16)).toBeUndefined();
	});

	it('refuses a suggestion that would start with a zero', () => {
		expect(didYouMean('3000px', 16)).toBeUndefined();
	});

	it('says nothing when the shorter value is still absurd', () => {
		expect(didYouMean('99999px', 16)).toBeUndefined();
	});
});

describe('cautions', () => {
	it('says nothing about ordinary widths', () => {
		const rows = toRows([
			{ slug: 'desktop', label: 'Desktop', max: '1280px' },
		]);

		expect(cautions(rows, RULES)).toStrictEqual({});
	});

	/** Legal, saveable, and almost certainly a typo. */
	it('cautions on a width past every real screen, with a suggestion', () => {
		const rows = toRows([
			{ slug: 'desktop', label: 'Desktop', max: '11920px' },
		]);

		expect(cautions(rows, RULES)[rows[0]!.id]).toStrictEqual({
			field: 'max',
			severity: 'caution',
			message: 'Too wide for the ruler. Did you mean 1920px?',
		});
	});

	it('cautions without a suggestion when none is obvious', () => {
		const rows = toRows([
			{ slug: 'desktop', label: 'Desktop', max: '99999px' },
		]);

		expect(cautions(rows, RULES)[rows[0]!.id]?.message).toBe(
			'Too wide for the ruler.'
		);
	});
});

/**
 * Design system §5.1. The published ramp is four hand-picked values and a hard
 * rule: nothing lighter than the last one, because `#3858e9` is the lightest
 * step that still holds 4.5:1 for the 12px white labels drawn on these bands.
 */
describe('rampColor', () => {
	it('lands four bands on the four published stops', () => {
		expect([0, 1, 2, 3].map((index) => rampColor(index, 4))).toStrictEqual([
			'#142269',
			'#1f3399',
			'#2c46c9',
			'#3858e9',
		]);
	});

	it('runs dark to light, narrowest to widest', () => {
		const narrow = rampColor(0, 4);
		const wide = rampColor(3, 4);

		expect(lightness(narrow)).toBeLessThan(lightness(wide));
	});

	it('keeps a longer ramp inside the same two ends', () => {
		const twelve = Array.from({ length: 12 }, (_unused, index) =>
			rampColor(index, 12)
		);

		expect(twelve.at(0)).toBe('#142269');
		expect(twelve.at(-1)).toBe('#3858e9');

		// Monotonic, so no band is darker than the one narrower than it.
		twelve.forEach((colour, index) => {
			if (0 < index) {
				expect(lightness(colour)).toBeGreaterThanOrEqual(
					lightness(twelve[index - 1]!)
				);
			}
		});
	});

	it('draws a lone band in the accent rather than the darkest step', () => {
		expect(rampColor(0, 1)).toBe('#3858e9');
	});

	it('survives an index outside the ramp', () => {
		expect(rampColor(9, 4)).toBe('#3858e9');
		expect(rampColor(-1, 4)).toBe('#142269');
	});
});

const lightness = (hex: string) =>
	[1, 3, 5].reduce(
		(total, at) => total + parseInt(hex.slice(at, at + 2), 16),
		0
	);

describe('coverage', () => {
	it('answers for rows in the order they were authored, not sorted', () => {
		const rows = toRows([
			{ slug: 'tablet', label: 'Tablet', max: '782px' },
			{ slug: 'desktop', label: 'Desktop', max: '1280px' },
			{ slug: 'mobile', label: 'Mobile', max: '480px' },
		]);

		const found = coverage(rows, RULES);

		expect(found[rows[0]!.id]?.text).toBe('over 480px, up to 782px');
		expect(found[rows[1]!.id]?.text).toBe('over 782px, up to 1280px');
		expect(found[rows[2]!.id]?.text).toBe('up to 480px');
	});

	it('has nothing to say about a row with no width yet', () => {
		const rows = toRows([{ slug: 'new', label: 'New', max: '' }]);

		expect(coverage(rows, RULES)[rows[0]!.id]).toStrictEqual({
			text: '',
			covers: true,
		});
	});

	/**
	 * The state §5.2 paints red. Two rows at one width leave the narrower one
	 * running from its own boundary to its own boundary, and the author is
	 * owed that where they are looking rather than only in the save notice.
	 */
	it('says a row sharing a width covers nothing', () => {
		const rows = toRows([
			{ slug: 'wide', label: 'Wide', max: '888px' },
			{ slug: 'same', label: 'Same', max: '888px' },
		]);

		const found = coverage(rows, RULES);

		expect(found[rows[0]!.id]?.covers).toBe(true);
		expect(found[rows[1]!.id]).toStrictEqual({
			text: 'Nothing — no screens left',
			covers: false,
		});
	});

	/**
	 * `888px` and `55.5rem` are the same width, which is why the server
	 * compares pixels — and so must this.
	 */
	/**
	 * The cross-check that matters more than either column: one problem, one
	 * row. If these two ever disagree, the screen accuses a different row in
	 * the `Covers` column than the one carrying the error message.
	 */
	it('blames the same row validate() does', () => {
		const rows = toRows([
			{ slug: 'wide', label: 'Wide', max: '888px' },
			{ slug: 'same', label: 'Same', max: '888px' },
		]);

		const blamed = Object.keys(validate(rows, RULES).rows);
		const uncovered = Object.entries(coverage(rows, RULES))
			.filter(([, entry]) => !entry.covers)
			.map(([id]) => id);

		expect(uncovered).toStrictEqual(blamed);
	});

	it('compares mixed units in pixels', () => {
		const rows = toRows([
			{ slug: 'px', label: 'Pixels', max: '888px' },
			{ slug: 'rem', label: 'Rems', max: '55.5rem' },
		]);

		expect(coverage(rows, RULES)[rows[1]!.id]?.covers).toBe(false);
	});

	it("keeps the author's own units in the sentence", () => {
		const rows = toRows([
			{ slug: 'wide', label: 'Wide', max: '60rem' },
			{ slug: 'narrow', label: 'Narrow', max: '30em' },
		]);

		expect(coverage(rows, RULES)[rows[0]!.id]?.text).toBe(
			'over 30em, up to 60rem'
		);
	});
});

describe('labelsFit', () => {
	it('labels a set whose every band has room', () => {
		expect(labelsFit(ruler(PRESET, 16).segments)).toBe(true);
	});

	/**
	 * Twelve tiers put the shares either side of the floor almost at random,
	 * which drew one blank band between two labelled ones — a name that looks
	 * like it failed to render. All or nothing instead.
	 */
	it('labels nothing when any one band is too narrow', () => {
		const twelve = [
			2400, 2200, 2000, 1800, 1600, 1400, 1200, 1000, 800, 600, 400, 320,
		].map((px, index) => ({
			slug: `t${index}`,
			label: `T${index}`,
			max: `${px}px`,
		}));

		expect(labelsFit(ruler(twelve, 16).segments)).toBe(false);
	});

	/**
	 * The uncovered region is a remainder, and `labelsFit` must not consult it.
	 *
	 * Built by hand rather than through `ruler()`, because `ruler()` cannot
	 * produce the case: the axis always carries 1.15 of headroom, so an
	 * unclamped set leaves an uncovered region of about 13% — comfortably over
	 * the floor. The rule still has to hold for the day the headroom changes.
	 */
	it('ignores the uncovered region, however thin', () => {
		const segments = [
			{
				key: 'mobile',
				label: 'Mobile',
				max: '500px',
				fromPx: 0,
				toPx: 500,
				share: 50,
				clipped: false,
			},
			{
				key: 'wide',
				label: 'Wide',
				max: '1000px',
				fromPx: 500,
				toPx: 1000,
				share: 48,
				clipped: false,
			},
			{
				key: 'default',
				label: 'no tier',
				max: '',
				fromPx: 1000,
				toPx: 1020,
				share: 2,
				clipped: false,
			},
		];

		expect(segments.at(-1)!.share).toBeLessThan(LABEL_FLOOR);
		expect(labelsFit(segments)).toBe(true);
	});
});

describe('axisTicks', () => {
	it('marks zero and every boundary', () => {
		expect(
			axisTicks(ruler(PRESET, 16).segments).map((tick) => tick.label)
		).toStrictEqual(['0', '480px', '782px', '1024px', '1280px']);
	});

	it('leaves a band running past the axis unmarked', () => {
		const clamped = [
			{ slug: 'desktop', label: 'Desktop', max: '11920px' },
			{ slug: 'mobile', label: 'Mobile', max: '450px' },
		];

		expect(
			axisTicks(ruler(clamped, 16).segments).map((tick) => tick.label)
		).toStrictEqual(['0', '450px']);
	});

	/**
	 * Twelve tiers printed `320px` and `400px` on top of each other. Marks now
	 * give way when they crowd — except the widest, which the callout beneath
	 * the ruler refers to by name.
	 */
	it('thins marks that would collide, keeping the widest', () => {
		const twelve = [
			2400, 2200, 2000, 1800, 1600, 1400, 1200, 1000, 800, 600, 400, 320,
		].map((px, index) => ({
			slug: `t${index}`,
			label: `T${index}`,
			max: `${px}px`,
		}));

		const ticks = axisTicks(ruler(twelve, 16).segments);

		expect(ticks.at(-1)?.label).toBe('2400px');
		expect(ticks.map((tick) => tick.label)).not.toContain('400px');

		ticks.forEach((tick, index) => {
			if (0 < index) {
				expect(tick.at - ticks[index - 1]!.at).toBeGreaterThanOrEqual(
					6
				);
			}
		});
	});
});

/**
 * `range()` is gone, and this is what it got wrong.
 *
 * It wrote a band as `480px - 782px`, which names 782px on this row and again
 * on the row above. Bands are disjoint -- `@media (480px < width <= 782px)` --
 * so a screen exactly 782px wide is matched by this tier alone, and a dashed
 * range reads as an overlap that cannot happen. The `Covers` column uses
 * `band()` now, and the two readings of one fact are one function again.
 */
describe('the Covers column and the ruler agree', () => {
	it('states the lower edge as exclusive', () => {
		expect(band(PRESET, 2)).toBe('over 480px, up to 782px');
		expect(band(PRESET, 2)).not.toContain('–');
	});

	it('gives the narrowest tier an open lower edge', () => {
		expect(band(PRESET, 3)).toBe('up to 480px');
	});

	it('is what coverage() puts in the column', () => {
		const rows = PRESET.map((tier, index) => ({
			id: `row-${index}`,
			label: tier.label,
			slug: tier.slug,
			max: tier.max,
		}));
		const found = coverage(rows, RULES);

		expect(found['row-2']!.text).toBe(band(PRESET, 2));
		expect(found['row-3']!.text).toBe(band(PRESET, 3));
	});
});
