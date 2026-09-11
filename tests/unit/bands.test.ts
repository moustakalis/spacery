/**
 * What each tier covers, and the ruler that draws it.
 */

import { describe, expect, it } from 'vitest';

import { band, didYouMean, ruler } from '../../src/settings/bands';
import type { Breakpoint } from '../../src/settings/types';
import { cautions } from '../../src/settings/validate';
import { toRows } from '../../src/settings/rows';
import type { ValidationRules } from '../../src/settings/types';

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
			message: 'Wider than any common screen. Did you mean 1920px?',
		});
	});

	it('cautions without a suggestion when none is obvious', () => {
		const rows = toRows([
			{ slug: 'desktop', label: 'Desktop', max: '99999px' },
		]);

		expect(cautions(rows, RULES)[rows[0]!.id]?.message).toBe(
			'Wider than any common screen, so the ruler stops short of it.'
		);
	});
});
