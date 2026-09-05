/**
 * Unit tests for CSS length parsing.
 *
 * The interesting cases are the ones that must *not* parse. Spacery stores
 * whatever the Style Engine accepts, which includes preset references and
 * `calc()`; a parser that turned `var:preset|spacing|40` into the number 40
 * would silently rewrite an author's value into something else entirely.
 */

import { describe, expect, it } from 'vitest';

import {
	CUSTOM,
	formatLength,
	parseLength,
	unitFor,
} from '../../src/extension/length';

describe('parseLength', () => {
	it('splits a length into number and unit', () => {
		expect(parseLength('13px')).toEqual({ value: 13, unit: 'px' });
		expect(parseLength('1.5rem')).toEqual({ value: 1.5, unit: 'rem' });
		expect(parseLength('.5em')).toEqual({ value: 0.5, unit: 'em' });
		expect(parseLength('50%')).toEqual({ value: 50, unit: '%' });
		expect(parseLength('-4px')).toEqual({ value: -4, unit: 'px' });
	});

	it('accepts a bare number', () => {
		expect(parseLength('0')).toEqual({ value: 0, unit: '' });
	});

	it('normalises the unit case', () => {
		expect(parseLength('10PX')).toEqual({ value: 10, unit: 'px' });
	});

	it('refuses anything that is not a plain length', () => {
		expect(parseLength('var:preset|spacing|40')).toBeUndefined();
		expect(parseLength('calc(1rem + 2px)')).toBeUndefined();
		expect(parseLength('var(--wp--preset--spacing--40)')).toBeUndefined();
		expect(parseLength('auto')).toBeUndefined();
		expect(parseLength('')).toBeUndefined();
		expect(parseLength(undefined)).toBeUndefined();
	});
});

describe('formatLength', () => {
	it('joins a number to the box unit', () => {
		expect(formatLength('13', 'px')).toBe('13px');
		expect(formatLength(1.5, 'rem')).toBe('1.5rem');
	});

	it('keeps zero, which is a value someone chose', () => {
		expect(formatLength('0', 'px')).toBe('0px');
	});

	it('clears on an empty field, which means inherit', () => {
		expect(formatLength('', 'px')).toBeUndefined();
		expect(formatLength(undefined, 'px')).toBeUndefined();
	});
});

describe('unitFor', () => {
	it('follows the first value that carries an allowed unit', () => {
		expect(unitFor([undefined, '2rem', '4px'], ['px', 'rem'])).toBe('rem');
	});

	it('ignores a unit the theme no longer allows', () => {
		expect(unitFor(['2rem'], ['px'])).toBe('px');
	});

	it('falls back to px, or to whatever is allowed instead', () => {
		expect(unitFor([], ['px', 'rem'])).toBe('px');
		expect(unitFor([], ['em', 'rem'])).toBe('em');
		expect(unitFor([], [])).toBe('px');
	});

	/*
	 * A value no number field can hold has to put the box in custom mode.
	 * Reported as `px`, it would render as an empty field: invisible to the
	 * author, still applied on the front end, and lost to the next linked edit.
	 */
	it('reports custom for a value a number field cannot hold', () => {
		expect(unitFor(['calc(100% - 2rem)'], ['px', 'rem'])).toBe(CUSTOM);
		expect(unitFor(['var:preset|spacing|40'], ['px'])).toBe(CUSTOM);
		expect(unitFor([undefined, '', 'clamp(1rem, 2vw, 3rem)'], ['px'])).toBe(
			CUSTOM
		);
	});

	it('prefers a real unit when one of the values has it', () => {
		expect(unitFor(['2rem', 'calc(100% - 2rem)'], ['px', 'rem'])).toBe(
			'rem'
		);
	});
});
