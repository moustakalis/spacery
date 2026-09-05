/**
 * Unit tests for the spacing box's linking rule.
 *
 * The case worth pinning down is an edit to a side that already holds a value.
 * A "linked" box that only propagated into empty sides would pass every test
 * written against a fresh block and fail the moment someone edited one they had
 * already filled in — which is exactly the shape of bug that is easy to ship
 * and hard to notice.
 */

import { describe, expect, it } from 'vitest';

import {
	applyEdit,
	clearBox,
	isAuthored,
	switchUnit,
} from '../../src/extension/box';
import { CUSTOM } from '../../src/extension/length';
import { SIDES } from '../../src/extension/supports';

const ALL = [...SIDES];

describe('applyEdit, linked', () => {
	it('overwrites sides that already hold different values', () => {
		expect(
			applyEdit({
				sides: ALL,
				values: {
					top: '10px',
					right: '20px',
					bottom: '30px',
					left: '40px',
				},
				side: 'top',
				input: '5',
				unit: 'px',
				linked: true,
			})
		).toEqual({
			top: '5px',
			right: '5px',
			bottom: '5px',
			left: '5px',
		});
	});

	it('propagates from whichever side was edited, not just the first', () => {
		expect(
			applyEdit({
				sides: ALL,
				values: { top: '10px', right: '10px' },
				side: 'left',
				input: '7',
				unit: 'px',
				linked: true,
			})
		).toEqual({
			top: '7px',
			right: '7px',
			bottom: '7px',
			left: '7px',
		});
	});

	it('clears every side when the edited field is emptied', () => {
		expect(
			applyEdit({
				sides: ALL,
				values: { top: '10px', right: '10px' },
				side: 'top',
				input: '',
				unit: 'px',
				linked: true,
			})
		).toEqual({
			top: undefined,
			right: undefined,
			bottom: undefined,
			left: undefined,
		});
	});

	it('carries zero, which is a value someone chose', () => {
		const next = applyEdit({
			sides: ALL,
			values: {},
			side: 'top',
			input: '0',
			unit: 'px',
			linked: true,
		});

		expect(next.left).toBe('0px');
	});
});

describe('applyEdit, unlinked', () => {
	it('touches only the side that changed', () => {
		expect(
			applyEdit({
				sides: ALL,
				values: { top: '10px', right: '20px' },
				side: 'top',
				input: '5',
				unit: 'px',
				linked: false,
			})
		).toEqual({
			top: '5px',
			right: '20px',
			bottom: undefined,
			left: undefined,
		});
	});

	it('leaves a value it cannot parse alone', () => {
		const next = applyEdit({
			sides: ALL,
			values: { right: 'var:preset|spacing|40' },
			side: 'top',
			input: '5',
			unit: 'px',
			linked: false,
		});

		expect(next.right).toBe('var:preset|spacing|40');
	});
});

describe('applyEdit, only the sides a block supports', () => {
	it('returns nothing for sides outside the set', () => {
		const next = applyEdit({
			sides: ['top', 'bottom'],
			values: {},
			side: 'top',
			input: '5',
			unit: 'px',
			linked: true,
		});

		expect(next).toEqual({ top: '5px', bottom: '5px' });
	});
});

describe('switchUnit', () => {
	it('swaps the unit and keeps the number', () => {
		expect(
			switchUnit(ALL, { top: '16px', left: '8px' }, 'px', 'rem')
		).toEqual({
			top: '16rem',
			right: undefined,
			bottom: undefined,
			left: '8rem',
		});
	});

	it('leaves values with no number to re-label', () => {
		expect(
			switchUnit(['top'], { top: 'var:preset|spacing|40' }, 'px', 'rem')
		).toEqual({ top: 'var:preset|spacing|40' });
	});

	it('keeps everything on the way into custom', () => {
		expect(
			switchUnit(ALL, { top: '16px', left: '2rem' }, 'px', CUSTOM)
		).toEqual({
			top: '16px',
			right: undefined,
			bottom: undefined,
			left: '2rem',
		});
	});

	it('clears everything on the way out of custom', () => {
		expect(
			switchUnit(
				ALL,
				{ top: 'calc(100% - 2rem)', left: '8px' },
				CUSTOM,
				'px'
			)
		).toEqual({
			top: undefined,
			right: undefined,
			bottom: undefined,
			left: undefined,
		});
	});
});

describe('applyEdit, custom mode', () => {
	it('stores whole values verbatim, trimmed', () => {
		expect(
			applyEdit({
				sides: ALL,
				values: {},
				side: 'top',
				input: '  calc(100% - 2rem) ',
				unit: CUSTOM,
				linked: false,
			}).top
		).toBe('calc(100% - 2rem)');
	});

	it('lets the four sides hold different units', () => {
		let values = applyEdit({
			sides: ALL,
			values: {},
			side: 'top',
			input: '0',
			unit: CUSTOM,
			linked: false,
		});

		values = applyEdit({
			sides: ALL,
			values,
			side: 'right',
			input: '30rem',
			unit: CUSTOM,
			linked: false,
		});

		values = applyEdit({
			sides: ALL,
			values,
			side: 'bottom',
			input: '1vw',
			unit: CUSTOM,
			linked: false,
		});

		expect(values).toEqual({
			top: '0',
			right: '30rem',
			bottom: '1vw',
			left: undefined,
		});
	});

	it('clears on an empty or whitespace-only field', () => {
		expect(
			applyEdit({
				sides: ['top'],
				values: { top: '3px' },
				side: 'top',
				input: '   ',
				unit: CUSTOM,
				linked: false,
			}).top
		).toBeUndefined();
	});

	it('still links', () => {
		expect(
			applyEdit({
				sides: ALL,
				values: { top: '1px', right: '2px' },
				side: 'top',
				input: 'calc(1rem + 2px)',
				unit: CUSTOM,
				linked: true,
			})
		).toEqual({
			top: 'calc(1rem + 2px)',
			right: 'calc(1rem + 2px)',
			bottom: 'calc(1rem + 2px)',
			left: 'calc(1rem + 2px)',
		});
	});
});

describe('clearBox', () => {
	it('names every supported side, so none is left behind', () => {
		expect(clearBox(ALL)).toEqual({
			top: undefined,
			right: undefined,
			bottom: undefined,
			left: undefined,
		});

		expect(Object.keys(clearBox(['top', 'bottom']))).toEqual([
			'top',
			'bottom',
		]);
	});
});

describe('isAuthored', () => {
	it('is true for any side set at this tier', () => {
		expect(isAuthored(ALL, { bottom: '4px' })).toBe(true);
	});

	it('is false for an empty box', () => {
		expect(isAuthored(ALL, {})).toBe(false);
		expect(isAuthored(ALL, { top: undefined })).toBe(false);
	});

	it('ignores sides the block does not support', () => {
		expect(isAuthored(['top'], { left: '4px' })).toBe(false);
	});
});
