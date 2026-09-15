/**
 * The CSS the editor shows, against the rules the front end emits.
 *
 * Every assertion here is a claim about agreement with `Styles\Generator`: the
 * band shapes, the widest-first order, `!important` on every declaration, the
 * base value never appearing, and a value the PHP allowlist refuses never
 * reaching the canvas. Where a claim needs the *real* Style Engine to be
 * meaningful, it belongs in the E2E test instead -- see the stub's docblock.
 */

import { describe, expect, it } from 'vitest';

import { previewCss } from '../../src/extension/preview';
import { mediaQueryFor } from '../../src/breakpoints/queries';
import type { Breakpoint } from '../../src/breakpoints/types';

/** Spacery's built-in preset, widest first, as the server resolves it. */
const TIERS: Breakpoint[] = [
	{ slug: 'desktop', label: 'Desktop', max: '1920px' },
	{ slug: 'laptop', label: 'Laptop', max: '1280px' },
	{ slug: 'tablet', label: 'Tablet', max: '782px' },
	{ slug: 'mobile', label: 'Mobile', max: '480px' },
];

const padding = (tiers: Record<string, string>) =>
	Object.fromEntries(
		Object.entries(tiers).map(([slug, top]) => [
			slug,
			{ spacing: { padding: { top } } },
		])
	);

describe('mediaQueryFor', () => {
	/**
	 * D13's shape, and the reason `Covers` says "over X, up to Y": the lower
	 * edge is exclusive, so a screen exactly 782px wide is matched by `tablet`
	 * and by nothing else.
	 */
	it('states the lower edge as exclusive', () => {
		expect(mediaQueryFor(TIERS, 1)).toBe(
			'@media (782px < width <= 1280px)'
		);
	});

	it('gives the narrowest tier no lower edge', () => {
		expect(mediaQueryFor(TIERS, 3)).toBe('@media (width <= 480px)');
	});

	it('gives the widest tier one anyway', () => {
		expect(mediaQueryFor(TIERS, 0)).toBe(
			'@media (1280px < width <= 1920px)'
		);
	});

	it('has nothing to say about a tier that is not there', () => {
		expect(mediaQueryFor(TIERS, 9)).toBe('');
	});
});

describe('previewCss', () => {
	it('says nothing about a block with no values', () => {
		expect(previewCss(undefined, TIERS, 'spy-x')).toBe('');
		expect(previewCss({}, TIERS, 'spy-x')).toBe('');
	});

	it('says nothing when the site has no breakpoints', () => {
		expect(previewCss(padding({ tablet: '10px' }), [], 'spy-x')).toBe('');
	});

	/** One authored value applies at its own tier and every narrower one. */
	it('carries a value downward, and never upward', () => {
		const css = previewCss(padding({ tablet: '10px' }), TIERS, 'spy-x');

		expect(css).toContain('@media (480px < width <= 782px)');
		expect(css).toContain('@media (width <= 480px)');
		expect(css).not.toContain('1920px');
		expect(css).not.toContain('1280px');
	});

	/**
	 * Widest first, because a narrower band has to come later to win where two
	 * overlap. `Generator::materialize()` sorts for the same reason, and the
	 * attribute's own key order is not it.
	 */
	it('emits the bands widest first, whatever order they were authored in', () => {
		const css = previewCss(
			padding({ mobile: '1px', desktop: '4px' }),
			TIERS,
			'spy-x'
		);

		const order = [...css.matchAll(/@media \(([^)]*)\)/g)].map(
			(found) => found[1]
		);

		expect(order).toStrictEqual([
			'1280px < width <= 1920px',
			'782px < width <= 1280px',
			'480px < width <= 782px',
			'width <= 480px',
		]);
	});

	/**
	 * Core writes its own spacing as an inline `style` attribute, which beats
	 * any class selector however the stylesheet is ordered. Every rule here is
	 * an override, so every one needs it -- `Generator::force()`.
	 */
	it('marks every declaration important', () => {
		const css = previewCss(padding({ mobile: '1px' }), TIERS, 'spy-x');
		const declarations = css.match(/padding-top: [^;]*;/g) ?? [];

		expect(declarations.length).toBeGreaterThan(0);
		expect(declarations.every((one) => one.includes('!important'))).toBe(
			true
		);
	});

	it('uses the class it is given, and kebab-cases the property', () => {
		const css = previewCss(padding({ mobile: '1px' }), TIERS, 'spy-abc123');

		expect(css).toContain('.spy-abc123');
		expect(css).toContain('padding-top:');
		expect(css).not.toContain('paddingTop');
	});

	/**
	 * The allowlist, from the other side. A value the front end drops must not
	 * reach the canvas either, or the preview shows the author something the
	 * page will not render.
	 */
	it('drops a value the front end would refuse', () => {
		const css = previewCss(
			padding({ mobile: '10px;color:red' }),
			TIERS,
			'spy-x'
		);

		expect(css).toBe('');
	});

	it('drops only the bad side, and keeps the rest', () => {
		const css = previewCss(
			{
				mobile: {
					spacing: {
						padding: { top: 'red', bottom: '20px' },
					},
				},
			},
			TIERS,
			'spy-x'
		);

		expect(css).toContain('padding-bottom: 20px !important;');
		expect(css).not.toContain('padding-top');
	});

	/** A tier the site no longer defines is not a band. */
	it('ignores a value stored under a slug that no longer exists', () => {
		expect(previewCss(padding({ phablet: '10px' }), TIERS, 'spy-x')).toBe(
			''
		);
	});

	/** Presets are what core's own controls store, and what takeover moves. */
	it('resolves a preset reference', () => {
		const css = previewCss(
			padding({ mobile: 'var:preset|spacing|50' }),
			TIERS,
			'spy-x'
		);

		expect(css).toContain('var(--wp--preset--spacing--50)');
	});
});
