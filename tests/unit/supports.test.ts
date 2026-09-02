import { describe, expect, it } from 'vitest';

import {
	pathFor,
	sidesFor,
	spacingFeatures,
} from '../../src/extension/supports';

describe('sidesFor', () => {
	it('expands true to every side', () => {
		expect(sidesFor(true)).toEqual(['top', 'right', 'bottom', 'left']);
	});

	it('takes an explicit list', () => {
		expect(sidesFor(['top', 'bottom'])).toEqual(['top', 'bottom']);
	});

	it('expands the axial keywords core accepts', () => {
		expect(sidesFor(['horizontal'])).toEqual(['right', 'left']);
		expect(sidesFor(['vertical'])).toEqual(['top', 'bottom']);
	});

	/**
	 * Canonical order regardless of how the block wrote it, so two blocks
	 * declaring the same sides render the same panel.
	 */
	it('normalizes order and duplicates', () => {
		expect(sidesFor(['bottom', 'top', 'vertical'])).toEqual([
			'top',
			'bottom',
		]);
	});

	/**
	 * Dropping one unknown entry rather than the whole declaration: a block
	 * inventing a side should lose that side, not its entire panel.
	 */
	it('drops entries it does not recognize', () => {
		expect(sidesFor(['top', 'diagonal'])).toEqual(['top']);
	});

	it('is empty for false, undefined and nonsense', () => {
		expect(sidesFor(false)).toEqual([]);
		expect(sidesFor(undefined)).toEqual([]);
		expect(sidesFor('top')).toEqual([]);
	});
});

describe('spacingFeatures', () => {
	it('reads padding and margin', () => {
		expect(
			spacingFeatures({ padding: true, margin: ['top', 'bottom'] })
		).toEqual([
			{
				feature: 'padding',
				label: 'Padding',
				sides: ['top', 'right', 'bottom', 'left'],
			},
			{ feature: 'margin', label: 'Margin', sides: ['top', 'bottom'] },
		]);
	});

	it('omits a feature with no sides', () => {
		expect(spacingFeatures({ margin: ['top'] })).toEqual([
			{ feature: 'margin', label: 'Margin', sides: ['top'] },
		]);
	});

	/**
	 * Gap flows through layout supports and a custom property rather than a
	 * declaration on the wrapper, so it is a different problem with a different
	 * failure mode. A block declaring only `blockGap` is not extendable yet.
	 */
	it('ignores blockGap entirely', () => {
		expect(spacingFeatures({ blockGap: true })).toEqual([]);
	});

	it('is empty when a block declares no spacing support', () => {
		expect(spacingFeatures(undefined)).toEqual([]);
		expect(spacingFeatures(true)).toEqual([]);
	});
});

describe('pathFor', () => {
	/**
	 * The same path core writes in its own `style` attribute, which is what lets
	 * the server hand a tier straight to the Style Engine with no translation.
	 */
	it('matches the shape core uses in its own style attribute', () => {
		expect(pathFor('padding', 'top')).toEqual([
			'spacing',
			'padding',
			'top',
		]);
	});
});
