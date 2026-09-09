/**
 * Whether a tier set fits a segmented control.
 */

import { describe, expect, it } from 'vitest';

import { fitsAsSegments } from '../../src/breakpoints/segments';
import type { Breakpoint } from '../../src/breakpoints/types';

const tiers = (...labels: string[]): Breakpoint[] =>
	labels.map((label, index) => ({
		slug: label.toLowerCase(),
		label,
		max: `${1280 - index * 200}px`,
	}));

describe('fitsAsSegments', () => {
	describe('with icons', () => {
		it('fits the four glyphs there are', () => {
			expect(
				fitsAsSegments(
					tiers('Desktop', 'Laptop', 'Tablet', 'Mobile'),
					true
				)
			).toBe(true);
		});

		/**
		 * Unreachable through the selector, because `iconsAreDistinct()` is
		 * already false for five tiers. Asserted anyway so the two cannot
		 * disagree if a fifth glyph is ever drawn.
		 */
		it('does not fit more tiers than there are glyphs', () => {
			expect(
				fitsAsSegments(
					tiers('Wide', 'Desktop', 'Laptop', 'Tablet', 'Mobile'),
					true
				)
			).toBe(false);
		});
	});

	describe('with labels', () => {
		it('fits four short names', () => {
			expect(fitsAsSegments(tiers('Sm', 'Md', 'Lg', 'Xl'), false)).toBe(
				true
			);
		});

		it("fits the preset's own names", () => {
			expect(
				fitsAsSegments(
					tiers('Desktop', 'Laptop', 'Tablet', 'Mobile'),
					false
				)
			).toBe(true);
		});

		/**
		 * The bug this replaced.
		 *
		 * Counting tiers alone, these four passed exactly as `Sm`/`Md`/`Lg`/
		 * `Xl` did -- and `ToggleGroupControl` does not wrap, it divides, so
		 * all four truncated instead.
		 */
		it('refuses four names too long to read side by side', () => {
			expect(
				fitsAsSegments(
					tiers('Widescreen', 'Desktop', 'Laptop', 'Handheld'),
					false
				)
			).toBe(false);
		});

		it('refuses more than four however short they are', () => {
			expect(fitsAsSegments(tiers('A', 'B', 'C', 'D', 'E'), false)).toBe(
				false
			);
		});
	});
});
