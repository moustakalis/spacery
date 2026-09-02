import { describe, expect, it } from 'vitest';

import type { Breakpoint } from '../../src/breakpoints/types';
import {
	authoredHeight,
	heightAt,
	inheritedFrom,
	withHeight,
} from '../../src/blocks/spacer/height';
import type { SpacerAttributes } from '../../src/blocks/spacer/types';

/**
 * Spacery's built-in preset, widest first, exactly as the server resolves it.
 */
const BREAKPOINTS: Breakpoint[] = [
	{ slug: 'desktop', label: 'Desktop', max: '1280px' },
	{ slug: 'laptop', label: 'Laptop', max: '1024px' },
	{ slug: 'tablet', label: 'Tablet', max: '782px' },
	{ slug: 'mobile', label: 'Mobile', max: '480px' },
];

const at = (tiers: Record<string, string>): SpacerAttributes => ({
	height: '100px',
	spacery: Object.fromEntries(
		Object.entries(tiers).map(([slug, height]) => [
			slug,
			{ dimensions: { height } },
		])
	),
});

describe('heightAt', () => {
	/**
	 * These expectations mirror SpacerTest::test_height_materializes_downward()
	 * on the server. The editor and the front end resolve inheritance
	 * independently, so they are only correct if they agree; if these two suites
	 * ever disagree, the preview is lying about the rendered page.
	 */
	it('inherits from the nearest wider tier', () => {
		const attributes = at({ laptop: '80px' });

		expect(heightAt(attributes, BREAKPOINTS, 'laptop')).toBe('80px');
		expect(heightAt(attributes, BREAKPOINTS, 'tablet')).toBe('80px');
		expect(heightAt(attributes, BREAKPOINTS, 'mobile')).toBe('80px');
	});

	it('does not leak upward to wider tiers', () => {
		const attributes = at({ laptop: '80px' });

		expect(heightAt(attributes, BREAKPOINTS, 'desktop')).toBe('100px');
	});

	it('lets a narrower authored value win', () => {
		const attributes = at({ laptop: '80px', mobile: '32px' });

		expect(heightAt(attributes, BREAKPOINTS, 'tablet')).toBe('80px');
		expect(heightAt(attributes, BREAKPOINTS, 'mobile')).toBe('32px');
	});

	it('falls back to the base height when nothing is authored', () => {
		expect(heightAt(at({}), BREAKPOINTS, 'mobile')).toBe('100px');
	});

	it('falls back to the base height for an unknown tier', () => {
		expect(heightAt(at({ mobile: '32px' }), BREAKPOINTS, 'two-xl')).toBe(
			'100px'
		);
	});
});

describe('inheritedFrom', () => {
	it('names the tier a value comes from', () => {
		expect(
			inheritedFrom(at({ laptop: '80px' }), BREAKPOINTS, 'mobile')
		).toBe('Laptop');
	});

	it('is undefined when the value is authored here', () => {
		// The control shows "Set here" rather than an inherited source.
		const attributes = at({ mobile: '32px' });

		expect(authoredHeight(attributes, 'mobile')).toBe('32px');
		expect(
			inheritedFrom(attributes, BREAKPOINTS, 'mobile')
		).toBeUndefined();
	});

	it('is undefined when the value comes from the base height', () => {
		expect(inheritedFrom(at({}), BREAKPOINTS, 'mobile')).toBeUndefined();
	});
});

describe('withHeight', () => {
	it('sets a tier without disturbing the others', () => {
		const patch = withHeight(at({ laptop: '80px' }), 'mobile', '32px');

		expect(patch.spacery).toEqual({
			laptop: { dimensions: { height: '80px' } },
			mobile: { dimensions: { height: '32px' } },
		});
	});

	/**
	 * Resetting must leave the attribute exactly as it was before the author
	 * touched it, or a block they reset would still serialize differently from
	 * an untouched one.
	 */
	it('prunes the attribute entirely when the last tier is cleared', () => {
		const patch = withHeight(at({ mobile: '32px' }), 'mobile', undefined);

		expect(patch.spacery).toBeUndefined();
	});

	it('prunes only the cleared tier when others remain', () => {
		const patch = withHeight(
			at({ laptop: '80px', mobile: '32px' }),
			'mobile',
			undefined
		);

		expect(patch.spacery).toEqual({
			laptop: { dimensions: { height: '80px' } },
		});
	});

	it('treats an empty string as a reset', () => {
		expect(
			withHeight(at({ mobile: '32px' }), 'mobile', '').spacery
		).toBeUndefined();
	});

	it('keeps sibling style keys when clearing a height', () => {
		const attributes: SpacerAttributes = {
			height: '100px',
			spacery: {
				mobile: {
					dimensions: { height: '32px' },
					spacing: { margin: { bottom: '1rem' } },
				},
			},
		};

		expect(withHeight(attributes, 'mobile', undefined).spacery).toEqual({
			mobile: { spacing: { margin: { bottom: '1rem' } } },
		});
	});
});
