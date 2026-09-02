import { describe, expect, it } from 'vitest';

import type { Breakpoint } from '../../src/breakpoints/types';
import {
	DEFAULT_TIER,
	toMinWidths,
	toPixels,
} from '../../src/breakpoints/toMinWidths';

const PRESET: Breakpoint[] = [
	{ slug: 'desktop', label: 'Desktop', max: '1280px' },
	{ slug: 'laptop', label: 'Laptop', max: '1024px' },
	{ slug: 'tablet', label: 'Tablet', max: '782px' },
	{ slug: 'mobile', label: 'Mobile', max: '480px' },
];

describe('toPixels', () => {
	it('matches the server for relative units', () => {
		// Breakpoint::PIXELS_PER_EM, and core's own assumption.
		expect(toPixels('30rem')).toBe(480);
		expect(toPixels('30em')).toBe(480);
		expect(toPixels('480px')).toBe(480);
	});
});

describe('toMinWidths', () => {
	/**
	 * Upper bounds and lower bounds must cut the axis identically. Every tier's
	 * minimum is the next-narrower tier's maximum, stepped so the ranges do not
	 * overlap.
	 */
	it('turns upper bounds into a matching set of lower bounds', () => {
		expect(toMinWidths(PRESET)).toEqual({
			mobile: 0,
			tablet: 480.02,
			laptop: 782.02,
			desktop: 1024.02,
			[DEFAULT_TIER]: 1280.02,
		});
	});

	it('places a default range above the widest tier', () => {
		const mins = toMinWidths(PRESET);

		// 1280px is still Desktop; anything wider is base styles alone.
		expect(mins[DEFAULT_TIER]).toBeGreaterThan(toPixels('1280px'));
	});

	it('handles a single tier', () => {
		expect(
			toMinWidths([{ slug: 'mobile', label: 'Mobile', max: '480px' }])
		).toEqual({ mobile: 0, [DEFAULT_TIER]: 480.02 });
	});

	it('handles an empty set without inventing tiers', () => {
		expect(toMinWidths([])).toEqual({ [DEFAULT_TIER]: 0 });
	});

	it('converts relative units so mixed sets still order correctly', () => {
		const mins = toMinWidths([
			{ slug: 'wide', label: 'Wide', max: '64rem' },
			{ slug: 'narrow', label: 'Narrow', max: '480px' },
		]);

		expect(mins).toEqual({
			narrow: 0,
			wide: 480.02,
			[DEFAULT_TIER]: 1024.02,
		});
	});

	/**
	 * The reserved key cannot collide with a real slug: the server restricts
	 * slugs to [a-z0-9-], which excludes a leading underscore.
	 */
	it('uses a key no valid slug can take', () => {
		expect(DEFAULT_TIER).toMatch(/^_/);
		expect(DEFAULT_TIER).not.toMatch(/^[a-z0-9-]+$/);
	});

	/**
	 * The boundary itself belongs to the narrower tier, exactly as core's bands
	 * do: `(480px < width <= 782px)` includes 782 and excludes 480.
	 */
	it('assigns each boundary width to the tier that names it', () => {
		const mins = toMinWidths(PRESET);

		// At exactly 480px, tablet has not started yet, so mobile applies.
		expect(mins.tablet).toBeGreaterThan(480);
		// At 480.02px and above, tablet applies.
		expect(mins.tablet).toBeLessThanOrEqual(480.02);
	});
});
