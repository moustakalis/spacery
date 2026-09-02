import { describe, expect, it } from 'vitest';

import type { StyleNode } from '../../src/attribute/types';
import type { Breakpoint } from '../../src/breakpoints/types';
import {
	canTakeOver,
	coreOverrides,
	takeOver,
} from '../../src/extension/takeover';

/** Core's own viewport tiers on a default WordPress 7.1 site. */
const CORE: Breakpoint[] = [
	{ slug: 'tablet', label: 'Tablet', max: '782px' },
	{ slug: 'mobile', label: 'Mobile', max: '480px' },
];

/** Spacery's preset, which shares core's two boundaries and adds two more. */
const PRESET: Breakpoint[] = [
	{ slug: 'desktop', label: 'Desktop', max: '1280px' },
	{ slug: 'laptop', label: 'Laptop', max: '1024px' },
	...CORE,
];

const TOP = ['spacing', 'padding', 'top'] as const;
const PATHS = [TOP];

/** A block styled the way WordPress 7.1 writes responsive spacing. */
const styled = (): StyleNode => ({
	spacing: { padding: { top: '4rem' } },
	'@tablet': { spacing: { padding: { top: '2rem' } } },
});

describe('coreOverrides', () => {
	it('finds a value core sets at a viewport', () => {
		const [found, ...rest] = coreOverrides(styled(), PATHS, PRESET, CORE);

		expect(rest).toEqual([]);
		expect(found).toMatchObject({
			viewport: 'tablet',
			label: 'Tablet',
			value: '2rem',
			boundsDiffer: false,
		});
		expect(found?.tier?.slug).toBe('tablet');
	});

	/**
	 * The block's own non-responsive padding is not an override. Spacery layers
	 * on top of it rather than replacing it, so offering to "take it over" would
	 * be offering to move a value that is already where it belongs.
	 */
	it('ignores the base style', () => {
		const style: StyleNode = { spacing: { padding: { top: '4rem' } } };

		expect(coreOverrides(style, PATHS, PRESET, CORE)).toEqual([]);
	});

	it('ignores properties outside the ones asked about', () => {
		const style: StyleNode = {
			'@tablet': { typography: { fontSize: '2rem' } },
		};

		expect(coreOverrides(style, PATHS, PRESET, CORE)).toEqual([]);
	});

	it('finds nothing on a block with no style at all', () => {
		expect(coreOverrides(undefined, PATHS, PRESET, CORE)).toEqual([]);
	});
});

describe('canTakeOver', () => {
	it('accepts a tier that shares the boundary', () => {
		const [override] = coreOverrides(styled(), PATHS, PRESET, CORE);

		expect(canTakeOver(override!)).toBe(true);
	});

	/**
	 * D11's boundary rule. A Spacery `tablet` at 900px would apply core's value
	 * over a different range of widths -- a change of meaning dressed up as a
	 * move -- so Spacery says so and leaves it alone.
	 */
	it('refuses a tier that shares the name but not the boundary', () => {
		const shifted: Breakpoint[] = [
			{ slug: 'tablet', label: 'Tablet', max: '900px' },
		];

		const [override] = coreOverrides(styled(), PATHS, shifted, CORE);

		expect(override?.boundsDiffer).toBe(true);
		expect(canTakeOver(override!)).toBe(false);
	});

	it('refuses when no Spacery tier shares the name', () => {
		const [override] = coreOverrides(
			styled(),
			PATHS,
			[{ slug: 'sm', label: 'Small', max: '782px' }],
			CORE
		);

		expect(canTakeOver(override!)).toBe(false);
	});

	/**
	 * An unknown core boundary counts as differing: Spacery would be guessing
	 * that the ranges line up, and a wrong guess moves a value to widths the
	 * author never chose.
	 */
	it('refuses when core publishes no boundary to compare against', () => {
		const [override] = coreOverrides(styled(), PATHS, PRESET, []);

		expect(canTakeOver(override!)).toBe(false);
	});
});

describe('takeOver', () => {
	it('moves the value and leaves exactly one rule behind', () => {
		const style = styled();
		const overrides = coreOverrides(style, PATHS, PRESET, CORE);

		const next = takeOver(undefined, style, overrides);

		expect(next.spacery).toEqual({
			tablet: { spacing: { padding: { top: '2rem' } } },
		});

		// The base padding survives; only the viewport key is gone.
		expect(next.style).toEqual({ spacing: { padding: { top: '4rem' } } });
	});

	it('does not mutate the attributes it was given', () => {
		const style = styled();
		takeOver(undefined, style, coreOverrides(style, PATHS, PRESET, CORE));

		expect(style['@tablet']).toEqual({
			spacing: { padding: { top: '2rem' } },
		});
	});

	it('leaves overrides it cannot move where they are', () => {
		const shifted: Breakpoint[] = [
			{ slug: 'tablet', label: 'Tablet', max: '900px' },
		];
		const style = styled();

		const next = takeOver(
			undefined,
			style,
			coreOverrides(style, PATHS, shifted, CORE)
		);

		expect(next.spacery).toBeUndefined();
		expect(next.style).toEqual(styled());
	});

	it('merges into spacing the author has already set', () => {
		const style = styled();

		const next = takeOver(
			{ mobile: { spacing: { padding: { top: '1rem' } } } },
			style,
			coreOverrides(style, PATHS, PRESET, CORE)
		);

		expect(next.spacery).toEqual({
			mobile: { spacing: { padding: { top: '1rem' } } },
			tablet: { spacing: { padding: { top: '2rem' } } },
		});
	});
});
