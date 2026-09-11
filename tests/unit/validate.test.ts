/**
 * The settings screen refusing what the server would refuse.
 */

import { describe, expect, it } from 'vitest';

import { blankRow, toRows } from '../../src/settings/rows';
import type { ValidationRules } from '../../src/settings/types';
import { isValid, validate } from '../../src/settings/validate';

/** As the server ships them. */
const RULES: ValidationRules = {
	slugPattern: '^[a-z0-9-]+$',
	lengthPattern: '^(?:\\d+|\\d*\\.\\d+)(?:px|em|rem)$',
	pixelsPerEm: 16,
	maxBreakpoints: 12,
};

const rowsOf = (...rows: Array<[string, string, string]>) =>
	toRows(rows.map(([slug, label, max]) => ({ slug, label, max })));

const problemFor = (rows: ReturnType<typeof rowsOf>, index: number) =>
	validate(rows, RULES).rows[rows[index]!.id];

describe('validate', () => {
	/** Clearing every row is how an author empties the custom source. */
	it('accepts an empty set', () => {
		expect(isValid(validate([], RULES))).toBe(true);
	});

	it('accepts a well-formed set', () => {
		const rows = rowsOf(
			['laptop', 'Laptop', '1024px'],
			['mobile', 'Mobile', '480px']
		);

		expect(isValid(validate(rows, RULES))).toBe(true);
	});

	it('wants a name', () => {
		const rows = rowsOf(['laptop', '  ', '1024px']);

		expect(problemFor(rows, 0)).toStrictEqual({
			field: 'label',
			message: 'Every breakpoint needs a name.',
		});
	});

	it('refuses a slug the server would', () => {
		const rows = rowsOf(['Laptop!', 'Laptop', '1024px']);

		expect(problemFor(rows, 0)?.field).toBe('slug');
	});

	/**
	 * `80%` is the shape an author reaches for and the control cannot even
	 * produce — but the rule is the server's, so the screen asserts it too.
	 */
	it('refuses a width without a unit it allows', () => {
		const rows = rowsOf(['laptop', 'Laptop', '80%']);

		expect(problemFor(rows, 0)?.field).toBe('max');
	});

	it('refuses a zero width, which the pattern alone allows', () => {
		const rows = rowsOf(['laptop', 'Laptop', '0px']);

		expect(problemFor(rows, 0)).toStrictEqual({
			field: 'max',
			message: 'Has to be more than zero.',
		});
	});

	it('refuses a repeated slug, naming it', () => {
		const rows = rowsOf(
			['laptop', 'Laptop', '1024px'],
			['laptop', 'Also laptop', '900px']
		);

		expect(problemFor(rows, 1)).toStrictEqual({
			field: 'slug',
			message: 'laptop is already taken.',
		});
	});

	/**
	 * The trap. The server compares widths in pixels, so these two are the same
	 * width and the set is refused whole — while a screen comparing the typed
	 * strings would show a valid form and then a save that changed nothing.
	 */
	it('sees 888px and 55.5rem as the same width', () => {
		const rows = rowsOf(
			['laptop', 'Laptop', '888px'],
			['tablet', 'Tablet', '55.5rem']
		);

		expect(problemFor(rows, 1)?.field).toBe('max');
		expect(isValid(validate(rows, RULES))).toBe(false);
	});

	it('counts the set against the maximum', () => {
		const rows = Array.from({ length: 13 }, (_, index) => ({
			...blankRow(),
			slug: `t${index}`,
			label: `Tier ${index}`,
			max: `${100 + index}px`,
		}));

		expect(validate(rows, RULES).set).toStrictEqual([
			'12 breakpoints is the maximum.',
		]);
	});
});
