import { describe, expect, it } from 'vitest';

import {
	fallbackNotice,
	listTiers,
	sourceName,
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
	resolvedSource: 'spacery',
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
	it('says nothing when the choice is what is in effect', () => {
		expect(
			fallbackNotice(
				'custom',
				info({ effectiveSource: 'custom', resolvedSource: 'custom' })
			)
		).toBeNull();
	});

	it('says nothing when nothing was chosen and the default answered', () => {
		expect(fallbackNotice('', info())).toBeNull();
	});

	/**
	 * E4, and the reason it did not work the first time. `effectiveSource` is
	 * the source being *followed*, so under a custom choice it reads `custom`
	 * whether or not any breakpoints are stored — comparing against it can
	 * never detect the fallback. `resolvedSource` is where the set on the page
	 * actually came from, which is the question being asked.
	 */
	it('explains a custom source with no rows in it', () => {
		expect(
			fallbackNotice(
				'custom',
				info({ effectiveSource: 'custom', resolvedSource: 'spacery' })
			)
		).toBe("You have not defined any yet, so Spacery's own set is in use.");
	});

	it('explains a theme that declares nothing usable', () => {
		expect(
			fallbackNotice(
				'theme',
				info({ effectiveSource: 'theme', resolvedSource: 'spacery' })
			)
		).toBe(
			"Your theme declares none Spacery can use, so Spacery's own set is in use."
		);
	});

	/**
	 * "Decide for me" cannot be put back to the author as their choice. The
	 * only way to reach this state is a theme that declares breakpoints and
	 * then yields none Spacery can read.
	 */
	it('does not blame the author for a default it followed', () => {
		expect(
			fallbackNotice(
				'',
				info({
					defaultSource: 'theme',
					effectiveSource: 'theme',
					resolvedSource: 'spacery',
				})
			)
		).toBe(
			"Your theme declares breakpoints Spacery could not read, so Spacery's own set is in use."
		);
	});

	it('still names what is in use for a case nobody has thought of', () => {
		expect(
			fallbackNotice(
				'spacery',
				info({ effectiveSource: 'spacery', resolvedSource: 'theme' })
			)
		).toBe('The set you chose is empty, so your theme is in use.');
	});

	/**
	 * Found by running the manual pass with a `spacery_breakpoints` filter in a
	 * mu-plugin. The filter's bands were drawn under "From: the breakpoints you
	 * defined" — the same lie E4 was about, reached the other way round. Every
	 * sentence above would be wrong here: nothing the author chose was empty,
	 * and nothing fell through.
	 */
	it('names a filter as an override, not as a fallback', () => {
		expect(
			fallbackNotice(
				'custom',
				info({ effectiveSource: 'custom', resolvedSource: 'filter' })
			)
		).toBe(
			'A spacery_breakpoints filter replaces the set, so these are stored but not in use.'
		);
	});

	/** And from "decide for me", where there is no choice to describe either. */
	it('names a filter even when nothing was chosen', () => {
		expect(
			fallbackNotice(
				'',
				info({ effectiveSource: 'spacery', resolvedSource: 'filter' })
			)
		).toBe(
			'A spacery_breakpoints filter replaces the set, so these are stored but not in use.'
		);
	});
});

describe('sourceName', () => {
	it('names every source it can be handed', () => {
		expect(sourceName('theme')).toBe('your theme');
		expect(sourceName('custom')).toBe('the breakpoints you defined');
		expect(sourceName('spacery')).toBe("Spacery's own set");
		expect(sourceName('filter')).toBe('a filter on this site');
	});

	/**
	 * The reason the `never` assignment is there. With a `default:` clause a
	 * new source rendered as whatever the default returned — so `filter` would
	 * have read "Spacery's own set", which is a wrong answer rather than an
	 * obviously missing one.
	 */
	it('does not fall back to another source for an unknown one', () => {
		// @ts-expect-error -- not a ResolvedSource; that is the point.
		expect(sourceName('something-else')).not.toBe("Spacery's own set");
	});
});
