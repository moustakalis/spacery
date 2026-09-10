/**
 * The sentence under each spacing box.
 */

import { describe, expect, it } from 'vitest';

import { describeBoxProvenance } from '../../src/extension/provenance';
import type { StylePath } from '../../src/attribute/types';
import type { Breakpoint } from '../../src/breakpoints/types';

const BREAKPOINTS: Breakpoint[] = [
	{ slug: 'desktop', label: 'Desktop', max: '1280px' },
	{ slug: 'laptop', label: 'Laptop', max: '1024px' },
	{ slug: 'tablet', label: 'Tablet', max: '782px' },
];

const p = (side: string): StylePath => ['spacing', 'padding', side];
const SIDES = [p('top'), p('right'), p('bottom'), p('left')];

const at = (slug: string, sides: Record<string, string>) => ({
	[slug]: { spacing: { padding: sides } },
});

describe('describeBoxProvenance', () => {
	it('says nothing when nothing is set anywhere', () => {
		expect(
			describeBoxProvenance({}, BREAKPOINTS, 'tablet', SIDES)
		).toBeUndefined();
	});

	it('names every side authored at this tier', () => {
		const attributes = {
			spacery: at('tablet', {
				top: '8px',
				right: '8px',
				bottom: '8px',
				left: '8px',
			}),
		};

		expect(
			describeBoxProvenance(attributes, BREAKPOINTS, 'tablet', SIDES)
		).toBe('Set here');
	});

	it('distinguishes a box only partly authored here', () => {
		const attributes = { spacery: at('tablet', { top: '8px' }) };

		expect(
			describeBoxProvenance(attributes, BREAKPOINTS, 'tablet', SIDES)
		).toBe('Partly set here');
	});

	it('names a single wider tier', () => {
		const attributes = {
			spacery: at('laptop', {
				top: '32px',
				right: '32px',
				bottom: '32px',
				left: '32px',
			}),
		};

		expect(
			describeBoxProvenance(attributes, BREAKPOINTS, 'tablet', SIDES)
		).toBe('Inherited from Laptop');
	});

	it('names two, when sides inherit from different tiers', () => {
		const attributes = {
			spacery: {
				...at('desktop', { top: '64px' }),
				...at('laptop', { left: '24px' }),
			},
		};

		expect(
			describeBoxProvenance(attributes, BREAKPOINTS, 'tablet', SIDES)
		).toBe('Inherited from Desktop and Laptop');
	});

	/**
	 * Not "breakpoints": one of the three can be the block's own spacing, which
	 * is not one.
	 */
	it('counts three or more rather than listing them', () => {
		const attributes = {
			spacery: {
				...at('desktop', { top: '64px' }),
				...at('laptop', { right: '24px' }),
			},
			style: { spacing: { padding: { left: '4px' } } },
		};

		expect(
			describeBoxProvenance(attributes, BREAKPOINTS, 'tablet', SIDES)
		).toBe('Inherited from 3 different places');
	});

	/**
	 * The block's own non-responsive spacing is a source, but it is not a tier
	 * and this panel has no "Default" control to call it after.
	 */
	it("names the block's own spacing as itself", () => {
		const attributes = {
			style: {
				spacing: {
					padding: {
						top: '4px',
						right: '4px',
						bottom: '4px',
						left: '4px',
					},
				},
			},
		};

		expect(
			describeBoxProvenance(attributes, BREAKPOINTS, 'tablet', SIDES)
		).toBe("Inherited from this block's own spacing");
	});

	/**
	 * Desktop is the widest tier, so it has nothing above it but the block's
	 * own spacing.
	 */
	it('finds no inheritance at the widest tier', () => {
		const attributes = { spacery: at('laptop', { top: '32px' }) };

		expect(
			describeBoxProvenance(attributes, BREAKPOINTS, 'desktop', SIDES)
		).toBeUndefined();
	});
});
