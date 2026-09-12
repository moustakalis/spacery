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

	/*
	 * This asserted the opposite until the manual pass, and the two tests
	 * contradicted each other: the one above says a value a number field cannot
	 * hold is "invisible to the author, still applied on the front end, and
	 * lost to the next linked edit", and that is exactly what happened to the
	 * `calc()` here when `rem` won. The test with the reason wins.
	 *
	 * The cost of the reversal is that `2rem` is now shown as `2rem` instead of
	 * `2` in a rem box. The benefit is that the `calc()` beside it is shown at
	 * all.
	 */
	it('prefers custom over a unit a sibling side happens to carry', () => {
		expect(unitFor(['2rem', 'calc(100% - 2rem)'], ['px', 'rem'])).toBe(
			CUSTOM
		);
	});
});

/**
 * Found by running `docs/MANUAL-TESTING.md` §2: set a preset through core's own
 * spacing control, open the Spacery panel, and the box was in `px` with
 * `var:preset|spacing|60` as the placeholder of a number field -- beside a
 * sibling side reading a tidy `24`. The document had predicted the shape of it
 * ("not as an empty px field") and the custom box's help text already mentioned
 * presets; only the unit resolution had missed it.
 *
 * The rule is now one rule: a value the box cannot show in a number field puts
 * the whole box in custom mode, whoever supplied it.
 */
describe('unitFor with a value no number field can hold', () => {
	it('chooses custom over a unit it could have used', () => {
		expect(unitFor(['var:preset|spacing|60', '24px'], ['px'])).toBe(CUSTOM);
	});

	/**
	 * The mixture is what a takeover produces from a block whose author set one
	 * side from core's preset list and typed the other. Under the old order it
	 * opened in `px`, and the preset rendered as an empty field: invisible,
	 * still applied, and overwritten by the next linked edit.
	 */
	it('does not hide a preset behind a sibling length', () => {
		expect(
			unitFor(
				['var:preset|spacing|50', '10px', '10px', '10px'],
				['px', 'rem']
			)
		).toBe(CUSTOM);
	});

	it('still reads a unit when every value is a plain length', () => {
		expect(unitFor(['2rem', '4rem'], ['px', 'rem'])).toBe('rem');
		expect(unitFor([undefined, '24px'], ['px', 'rem'])).toBe('px');
	});
});
