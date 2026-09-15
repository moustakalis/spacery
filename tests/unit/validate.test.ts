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

const problemsFor = (rows: ReturnType<typeof rowsOf>, index: number) =>
	validate(rows, RULES).rows[rows[index]!.id] ?? [];

/**
 * The row's first problem, for the cases that have exactly one.
 *
 * @param rows  The rows under test.
 * @param index Which row to look at.
 * @return Its first problem, or undefined.
 */
const problemFor = (rows: ReturnType<typeof rowsOf>, index: number) =>
	problemsFor(rows, index)[0];

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
			message: 'Needs a name — this is what you pick in the editor.',
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
				'Already used by Laptop. Two breakpoints cannot share a slug.',
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
			message: 'Same width as Laptop.',
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
				[
					{
						field: 'label' as const,
						severity: 'incomplete' as const,
						message: 'x',
					},
				],
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

/**
 * Reported from the screen: eight rows, two of them slugged `br-12`, and no
 * conflict anywhere. The second `br-12` had no width yet.
 *
 * Both halves are asserted, because they are two different faults. A row can
 * be wrong in more than one way at once and has to say so; and a row's own
 * unfinished field must not stop it claiming its slug, or the *next* row to
 * use that slug looks like the first one there.
 */
describe('a row is wrong one field at a time', () => {
	it('names the slug clash on a row whose width is also missing', () => {
		const rows = rowsOf(
			['br-12', '12', '2400px'],
			['br-6', '6', '800px'],
			['br-12', '5', '']
		);

		expect(problemsFor(rows, 2)).toStrictEqual([
			{
				field: 'max',
				severity: 'incomplete',
				message: 'Needs a number and a unit — px, em or rem.',
			},
			{
				field: 'slug',
				severity: 'conflict',
				message:
					'Already used by 12. Two breakpoints cannot share a slug.',
			},
		]);
	});

	/**
	 * The fault that hid the duplicate entirely. The *first* `br-12` is the
	 * unfinished one, so under the old rule it registered nothing and the
	 * second was reported as the first to use that slug -- a conflict on
	 * screen, described nowhere, and missing from the count beside Save.
	 */
	it('claims a slug even when the width beside it does not parse', () => {
		const rows = rowsOf(['br-12', '12', ''], ['br-12', '5', '600px']);

		expect(problemFor(rows, 1)).toStrictEqual({
			field: 'slug',
			severity: 'conflict',
			message: 'Already used by 12. Two breakpoints cannot share a slug.',
		});

		expect(countProblems(validate(rows, RULES))).toBe(2);
	});

	/** Same for a width: an unfinished name must not free the width beside it. */
	it('claims a width even when the name beside it is blank', () => {
		const rows = rowsOf(
			['laptop', '', '1024px'],
			['tablet', 'T', '1024px']
		);

		expect(problemFor(rows, 1)).toStrictEqual({
			field: 'max',
			severity: 'conflict',
			message: 'Same width as laptop.',
		});
	});

	/**
	 * And the message still names something. A row can be the first to claim a
	 * slug while its own name is blank, and "Already used by ." names nothing.
	 */
	it('falls back to the slug when the other row has no name', () => {
		const rows = rowsOf(['br-12', '', '2400px'], ['br-12', '5', '600px']);

		expect(problemFor(rows, 1)?.message).toBe(
			'Already used by br-12. Two breakpoints cannot share a slug.'
		);
	});
});

describe('countProblems', () => {
	it('counts row and set-wide problems together', () => {
		expect(
			countProblems({
				rows: {
					a: [
						{
							field: 'label',
							severity: 'incomplete' as const,
							message: 'x',
						},
					],
				},
				set: ['too many'],
			})
		).toBe(2);
	});
});
