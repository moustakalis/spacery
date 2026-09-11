import { describe, expect, it } from 'vitest';

import {
	fallbackNotice,
	listTiers,
	sourceOptions,
} from '../../src/settings/sources';
import type { Breakpoint, BreakpointInfo } from '../../src/settings/types';

const tier = (slug: string, max: string): Breakpoint => ({
	slug,
	label: slug[0]!.toUpperCase() + slug.slice(1),
	max,
});

const set = (count: number): Breakpoint[] =>
	Array.from({ length: count }, (_unused, index) =>
		tier(`tier${index + 1}`, `${(index + 1) * 100}px`)
	);

const info = (over: Partial<BreakpointInfo> = {}): BreakpointInfo => ({
	effectiveSource: 'spacery',
	defaultSource: 'spacery',
	resolved: set(3),
	theme: null,
	preset: set(3),
	maxBreakpoints: 12,
	rules: {
		slugPattern: '^[a-z0-9-]+$',
		lengthPattern: '^(?:\\d+|\\d*\\.\\d+)(?:px|em|rem)$',
		pixelsPerEm: 16,
	},
	...over,
});

describe('listTiers', () => {
	it('names a short set in full', () => {
		expect(listTiers(set(3))).toBe(
			'Tier1 (100px), Tier2 (200px), Tier3 (300px)'
		);
	});

	/**
	 * Finding S7. The unbounded form put every tier in one radio label, so the
	 * site that most needs the choice explained — twelve breakpoints, the
	 * server's own maximum — got the least readable label on the screen.
	 */
	it('counts the rest rather than naming twelve widths in one line', () => {
		const label = listTiers(set(12));

		expect(label).toBe(
			'Tier1 (100px), Tier2 (200px), Tier3 (300px) and 9 more'
		);
		expect(label).not.toContain('Tier12');
	});

	it('says "1 more" for the set one past the limit', () => {
		expect(listTiers(set(4))).toContain('and 1 more');
	});

	it('honours a limit of its own', () => {
		expect(listTiers(set(3), 1)).toBe('Tier1 (100px) and 2 more');
	});

	it('never counts every tier as "more"', () => {
		expect(listTiers(set(3), 0)).toBe('Tier1 (100px) and 2 more');
	});

	it('has nothing to say about an empty set', () => {
		expect(listTiers([])).toBe('');
	});
});

describe('sourceOptions', () => {
	it('offers the four sources, in order', () => {
		expect(sourceOptions(info()).map((option) => option.value)).toEqual([
			'',
			'theme',
			'spacery',
			'custom',
		]);
	});

	it('says a theme declares none rather than showing an empty list', () => {
		expect(sourceOptions(info()).at(1)?.label).toBe(
			'This theme — it declares no breakpoints'
		);
	});

	/**
	 * A theme that filters the set down to nothing is reported as an empty
	 * array rather than as null, and an empty list after an em dash reads as a
	 * rendering bug.
	 */
	it('treats an empty theme set the same as no theme set', () => {
		expect(sourceOptions(info({ theme: [] })).at(1)?.label).toBe(
			'This theme — it declares no breakpoints'
		);
	});

	it('bounds the theme and preset labels', () => {
		const options = sourceOptions(
			info({ theme: set(12), preset: set(12) })
		);

		expect(options.at(1)?.label).toContain('and 9 more');
		expect(options.at(2)?.label).toContain('and 9 more');
	});

	it('names what "decide for me" currently means', () => {
		expect(
			sourceOptions(info({ defaultSource: 'theme' })).at(0)?.label
		).toBe('Decide for me — currently your theme');
	});
});

describe('fallbackNotice', () => {
	it('says nothing when nothing has been chosen', () => {
		expect(fallbackNotice('', info())).toBeNull();
	});

	it('says nothing when the choice is what is in effect', () => {
		expect(
			fallbackNotice('custom', info({ effectiveSource: 'custom' }))
		).toBeNull();
	});

	/**
	 * E4. Choosing "breakpoints I define below" and adding none used to print
	 * `From: Spacery's own set` under it and stop there — a result that
	 * contradicts the choice directly above it, with nothing joining the two.
	 */
	it('explains a custom source with no rows in it', () => {
		expect(fallbackNotice('custom', info())).toBe(
			"You chose your own breakpoints but have not defined any yet, so Spacery's own set is in use until you add one."
		);
	});

	it('explains a theme that declares nothing', () => {
		expect(fallbackNotice('theme', info())).toBe(
			"You chose your theme's breakpoints but it declares none, so Spacery's own set is in use until it does."
		);
	});

	it('still names what is in use for a case nobody has thought of', () => {
		expect(
			fallbackNotice('spacery', info({ effectiveSource: 'theme' }))
		).toBe('The set you chose is empty, so your theme is in use.');
	});
});
