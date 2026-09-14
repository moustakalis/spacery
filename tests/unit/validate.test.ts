/**
 * The settings screen refusing what the server would refuse.
 */

import { describe, expect, it } from 'vitest';

import { blankRow, toRows } from '../../src/settings/rows';
import type { ValidationRules } from '../../src/settings/types';
import {
	countProblems,
	isValid,
	saveHint,
	validate,
} from '../../src/settings/validate';

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
			severity: 'incomplete',
			message: 'Needs a name — this is what authors pick in the editor.',
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
			severity: 'incomplete',
			message: 'Has to be more than zero.',
		});
	});

	/**
	 * §5.2: a problem "names the other row involved. Never a generic rule
	 * recital." The author does not need to be told slugs are unique; they
	 * need to be told which row already has this one.
	 */
	it('refuses a repeated slug, naming the row that has it', () => {
		const rows = rowsOf(
			['laptop', 'Laptop', '1024px'],
			['laptop', 'Also laptop', '900px']
		);

		expect(problemFor(rows, 1)).toStrictEqual({
			field: 'slug',
			severity: 'conflict',
			message:
				'Already used by Laptop. Slugs are stored in block attributes, so two rows cannot share one.',
		});
	});

	it('refuses a repeated width, naming the row that has it', () => {
		const rows = rowsOf(
			['laptop', 'Laptop', '888px'],
			['tablet', 'Tablet', '888px']
		);

		expect(problemFor(rows, 1)).toStrictEqual({
			field: 'max',
			severity: 'conflict',
			message:
				'Same width as Laptop. Two breakpoints at one width would cover the same screens.',
		});
	});

	/**
	 * Two treatments, and which one a row gets is the difference between "you
	 * have not finished this" and "these two rows disagree" -- only the second
	 * tints the row, because only the second is about a pair.
	 */
	it('separates an unfinished field from a conflict', () => {
		const rows = rowsOf(
			['laptop', 'Laptop', '1024px'],
			['tablet', '', '900px'],
			['laptop', 'Also laptop', '700px']
		);

		expect(problemFor(rows, 1)?.severity).toBe('incomplete');
		expect(problemFor(rows, 2)?.severity).toBe('conflict');
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

/**
 * The sentence beside the Save button, which exists because a disabled control
 * with nothing next to it is a question the author cannot answer: is the screen
 * broken, is the work already saved, or is something above it wrong?
 */
describe('saveHint', () => {
	const clean = { rows: {}, set: [] };
	const broken = (count: number) => ({
		rows: Object.fromEntries(
			Array.from({ length: count }, (_unused, index) => [
				`row-${index}`,
				{
					field: 'label' as const,
					severity: 'incomplete' as const,
					message: 'x',
				},
			])
		),
		set: [],
	});

	it('counts the problems ahead of the changes', () => {
		expect(saveHint(broken(3), 2, false)).toBe(
			'Fix 3 problems above to save.'
		);
	});

	it('counts one problem in the singular', () => {
		expect(saveHint(broken(1), 0, false)).toBe(
			'Fix 1 problem above to save.'
		);
	});

	/**
	 * "Two breakpoints" tells an author who has been typing for a minute how
	 * much is at stake if they leave. "Something" does not.
	 */
	it('says how many breakpoints are unsaved', () => {
		expect(saveHint(clean, 2, false)).toBe(
			'Unsaved changes to 2 breakpoints.'
		);
		expect(saveHint(clean, 1, false)).toBe(
			'Unsaved change to 1 breakpoint.'
		);
	});

	/**
	 * There is one source, so a count about it would be wrong in both halves.
	 */
	it('says so when only the source moved', () => {
		expect(saveHint(clean, 0, true)).toBe(
			'Unsaved change to the breakpoint source.'
		);
	});

	/**
	 * D24's checkbox, and the regression it caused when it was first added:
	 * ticking it enabled a primary Save button while this sentence still read
	 * "No changes to save.", so the control and its own caption disagreed.
	 */
	it('says so when only the delete-on-uninstall choice moved', () => {
		expect(saveHint(clean, 0, false, true)).toBe(
			'Unsaved change to what happens on deletion.'
		);
	});

	/** Breakpoint edits outrank it: they are what the author came here for. */
	it('prefers a breakpoint count over the deletion choice', () => {
		expect(saveHint(clean, 2, false, true)).toBe(
			'Unsaved changes to 2 breakpoints.'
		);
	});

	it('says why a valid, unchanged screen cannot save', () => {
		expect(saveHint(clean, 0, false)).toBe('No changes to save.');
		expect(saveHint(clean, 0, false, false)).toBe('No changes to save.');
	});
});

describe('countProblems', () => {
	it('counts row and set-wide problems together', () => {
		expect(
			countProblems({
				rows: {
					a: {
						field: 'label',
						severity: 'incomplete' as const,
						message: 'x',
					},
				},
				set: ['too many'],
			})
		).toBe(2);
	});
});
