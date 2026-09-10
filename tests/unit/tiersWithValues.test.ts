/**
 * Which tiers carry authored values.
 */

import { describe, expect, it } from 'vitest';

import { tiersWithValues } from '../../src/attribute/tiers';
import type { SpaceryAttribute, StylePath } from '../../src/attribute/types';
import type { Breakpoint } from '../../src/breakpoints/types';

const BREAKPOINTS: Breakpoint[] = [
	{ slug: 'desktop', label: 'Desktop', max: '1280px' },
	{ slug: 'laptop', label: 'Laptop', max: '1024px' },
	{ slug: 'tablet', label: 'Tablet', max: '782px' },
	{ slug: 'mobile', label: 'Mobile', max: '480px' },
];

const TOP: StylePath = ['spacing', 'padding', 'top'];
const LEFT: StylePath = ['spacing', 'padding', 'left'];

describe('tiersWithValues', () => {
	it('finds nothing in an absent attribute', () => {
		expect(tiersWithValues(undefined, BREAKPOINTS, [TOP])).toStrictEqual(
			[]
		);
	});

	it('names the tiers that set one of the paths', () => {
		const attribute: SpaceryAttribute = {
			laptop: { spacing: { padding: { top: '32px' } } },
			mobile: { spacing: { padding: { left: '8px' } } },
		};

		expect(
			tiersWithValues(attribute, BREAKPOINTS, [TOP, LEFT])
		).toStrictEqual(['laptop', 'mobile']);
	});

	it('ignores a path nobody asked about', () => {
		const attribute: SpaceryAttribute = {
			laptop: { spacing: { padding: { left: '8px' } } },
		};

		expect(tiersWithValues(attribute, BREAKPOINTS, [TOP])).toStrictEqual(
			[]
		);
	});

	it('returns them widest first, as the set was given', () => {
		const attribute: SpaceryAttribute = {
			mobile: { spacing: { padding: { top: '8px' } } },
			desktop: { spacing: { padding: { top: '64px' } } },
		};

		expect(tiersWithValues(attribute, BREAKPOINTS, [TOP])).toStrictEqual([
			'desktop',
			'mobile',
		]);
	});

	/**
	 * A value under a breakpoint the author has since deleted generates no CSS,
	 * so marking it would point at spacing the page has not got.
	 */
	it('ignores a tier that no longer exists', () => {
		const attribute: SpaceryAttribute = {
			widescreen: { spacing: { padding: { top: '96px' } } },
		};

		expect(tiersWithValues(attribute, BREAKPOINTS, [TOP])).toStrictEqual(
			[]
		);
	});
});
