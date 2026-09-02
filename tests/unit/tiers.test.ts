import { describe, expect, it } from 'vitest';

import { clearPath, readPath, writePath } from '../../src/attribute/paths';
import {
	authoredAt,
	effectiveAt,
	inheritedFrom,
	withValue,
} from '../../src/attribute/tiers';
import type { SpaceryAttribute } from '../../src/attribute/types';
import type { Breakpoint } from '../../src/breakpoints/types';

/**
 * Spacery's built-in preset, widest first, exactly as the server resolves it.
 */
const BREAKPOINTS: Breakpoint[] = [
	{ slug: 'desktop', label: 'Desktop', max: '1280px' },
	{ slug: 'laptop', label: 'Laptop', max: '1024px' },
	{ slug: 'tablet', label: 'Tablet', max: '782px' },
	{ slug: 'mobile', label: 'Mobile', max: '480px' },
];

const TOP = ['spacing', 'padding', 'top'] as const;
const BOTTOM = ['spacing', 'padding', 'bottom'] as const;

const padding = (tiers: Record<string, string>): SpaceryAttribute =>
	Object.fromEntries(
		Object.entries(tiers).map(([slug, value]) => [
			slug,
			{ spacing: { padding: { top: value } } },
		])
	);

describe('readPath', () => {
	it('reads a nested string', () => {
		expect(readPath({ a: { b: 'x' } }, ['a', 'b'])).toBe('x');
	});

	it('is undefined for a missing segment', () => {
		expect(readPath({ a: {} }, ['a', 'b'])).toBeUndefined();
	});

	/**
	 * A number where a CSS length belongs is corrupt data. Coercing it would put
	 * an unusable declaration into a stylesheet instead of showing an empty
	 * field the author can fix.
	 */
	it('refuses to coerce a non-string leaf', () => {
		expect(readPath({ a: { b: 12 } }, ['a', 'b'])).toBeUndefined();
	});

	it('is undefined for anything that is not an object', () => {
		expect(readPath(undefined, ['a'])).toBeUndefined();
		expect(readPath('string', ['a'])).toBeUndefined();
	});
});

describe('writePath', () => {
	it('does not mutate its input', () => {
		const before = { spacing: { padding: { top: '1rem' } } };
		const after = writePath(before, [...BOTTOM], '2rem');

		expect(before).toEqual({ spacing: { padding: { top: '1rem' } } });
		expect(after).toEqual({
			spacing: { padding: { top: '1rem', bottom: '2rem' } },
		});
	});

	it('creates missing levels', () => {
		expect(writePath({}, [...TOP], '1rem')).toEqual({
			spacing: { padding: { top: '1rem' } },
		});
	});
});

describe('clearPath', () => {
	it('removes empty ancestors', () => {
		expect(
			clearPath({ spacing: { padding: { top: '1rem' } } }, [...TOP])
		).toBeUndefined();
	});

	it('keeps siblings', () => {
		expect(
			clearPath(
				{ spacing: { padding: { top: '1rem', bottom: '2rem' } } },
				[...TOP]
			)
		).toEqual({ spacing: { padding: { bottom: '2rem' } } });
	});

	it('leaves unrelated keys alone', () => {
		expect(
			clearPath(
				{
					spacing: { padding: { top: '1rem' } },
					dimensions: { height: '4rem' },
				},
				[...TOP]
			)
		).toEqual({ dimensions: { height: '4rem' } });
	});
});

describe('effectiveAt', () => {
	/**
	 * The same table of expectations as SpacerTest and GeneratorTest on the
	 * server. The editor and the front end resolve inheritance independently,
	 * so they are only correct if they agree; if these suites ever disagree, the
	 * canvas is lying about the rendered page.
	 */
	it('inherits from the nearest wider tier', () => {
		const attribute = padding({ laptop: '2rem' });

		expect(effectiveAt(attribute, BREAKPOINTS, 'tablet', TOP)).toBe('2rem');
		expect(effectiveAt(attribute, BREAKPOINTS, 'mobile', TOP)).toBe('2rem');
	});

	it('does not leak upward to wider tiers', () => {
		expect(
			effectiveAt(
				padding({ laptop: '2rem' }),
				BREAKPOINTS,
				'desktop',
				TOP
			)
		).toBeUndefined();
	});

	it('lets a narrower authored value win', () => {
		const attribute = padding({ laptop: '2rem', mobile: '0.5rem' });

		expect(effectiveAt(attribute, BREAKPOINTS, 'tablet', TOP)).toBe('2rem');
		expect(effectiveAt(attribute, BREAKPOINTS, 'mobile', TOP)).toBe(
			'0.5rem'
		);
	});

	/**
	 * Resolution runs per property path, never per tier. Carrying whole tier
	 * objects forward would let this mobile margin discard the padding it should
	 * have inherited -- the bug the server avoids by flattening to leaf paths.
	 */
	it('resolves each property independently', () => {
		const attribute: SpaceryAttribute = {
			laptop: { spacing: { padding: { top: '2rem' } } },
			mobile: { spacing: { margin: { top: '1rem' } } },
		};

		expect(effectiveAt(attribute, BREAKPOINTS, 'mobile', TOP)).toBe('2rem');
	});
});

describe('inheritedFrom', () => {
	it('names the tier a value comes from', () => {
		expect(
			inheritedFrom(
				padding({ laptop: '2rem' }),
				BREAKPOINTS,
				'mobile',
				TOP
			)?.label
		).toBe('Laptop');
	});

	it('is undefined when the value is authored here', () => {
		const attribute = padding({ mobile: '1rem' });

		expect(authoredAt(attribute, 'mobile', TOP)).toBe('1rem');
		expect(
			inheritedFrom(attribute, BREAKPOINTS, 'mobile', TOP)
		).toBeUndefined();
	});
});

describe('withValue', () => {
	it('sets a tier without disturbing the others', () => {
		expect(
			withValue(padding({ laptop: '2rem' }), 'mobile', TOP, '1rem')
		).toEqual({
			laptop: { spacing: { padding: { top: '2rem' } } },
			mobile: { spacing: { padding: { top: '1rem' } } },
		});
	});

	/**
	 * Clearing must leave the attribute exactly as it was before the author
	 * touched it, or a block they reset would still serialize differently from
	 * an untouched one -- and every such block would keep a class on the front
	 * end for no declarations.
	 */
	it('prunes the attribute entirely when the last value is cleared', () => {
		expect(
			withValue(padding({ mobile: '1rem' }), 'mobile', TOP, undefined)
		).toBeUndefined();
	});

	it('treats an empty string as a reset', () => {
		expect(
			withValue(padding({ mobile: '1rem' }), 'mobile', TOP, '')
		).toBeUndefined();
	});

	it('keeps sibling style keys when clearing one property', () => {
		const attribute: SpaceryAttribute = {
			mobile: {
				spacing: { padding: { top: '1rem' } },
				dimensions: { height: '4rem' },
			},
		};

		expect(withValue(attribute, 'mobile', TOP, undefined)).toEqual({
			mobile: { dimensions: { height: '4rem' } },
		});
	});
});
