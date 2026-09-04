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

import { applyEdit, retagUnit } from '../../src/extension/box';
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

describe('retagUnit', () => {
	it('swaps the unit and keeps the number', () => {
		expect(retagUnit(ALL, { top: '16px', left: '8px' }, 'rem')).toEqual({
			top: '16rem',
			right: undefined,
			bottom: undefined,
			left: '8rem',
		});
	});

	it('leaves values with no number to re-label', () => {
		expect(
			retagUnit(['top'], { top: 'var:preset|spacing|40' }, 'rem')
		).toEqual({ top: 'var:preset|spacing|40' });
	});
});
