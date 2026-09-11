/**
 * Editing identity for the breakpoint repeater.
 */

import { describe, expect, it } from 'vitest';

import {
	blankRow,
	isDirty,
	isStored,
	sameBreakpoints,
	slugFrom,
	slugHasMoved,
	toBreakpoints,
	toRows,
	toSlug,
} from '../../src/settings/rows';
import type { StoredSettings } from '../../src/settings/types';

describe('toRows', () => {
	it('gives every row an id of its own', () => {
		const rows = toRows([
			{ slug: 'laptop', label: 'Laptop', max: '1024px' },
			{ slug: 'mobile', label: 'Mobile', max: '480px' },
		]);

		expect(rows[0]!.id).not.toBe(rows[1]!.id);
	});

	it('treats everything the server returned as already stored', () => {
		const [row] = toRows([
			{ slug: 'laptop', label: 'Laptop', max: '1024px' },
		]);

		expect(isStored(row!)).toBe(true);
		expect(row!.storedSlug).toBe('laptop');
	});
});

describe('toBreakpoints', () => {
	it('sends the wire shape and nothing else', () => {
		const rows = toRows([
			{ slug: 'laptop', label: 'Laptop', max: '1024px' },
		]);

		expect(toBreakpoints(rows)).toStrictEqual([
			{ slug: 'laptop', label: 'Laptop', max: '1024px' },
		]);
	});
});

describe('blankRow', () => {
	it('is not stored, so its slug may still follow the name', () => {
		expect(isStored(blankRow())).toBe(false);
	});
});

describe('slugFrom', () => {
	it('follows the name while the row has never been saved', () => {
		expect(slugFrom('Wide desktop', blankRow())).toBe('wide-desktop');
	});

	/**
	 * The bug this file exists for.
	 *
	 * `laptop` may be the key under which real spacing sits in real posts.
	 * Renaming what the breakpoint is *called* must not move it, or
	 * `Generator::normalize()` walks a set that no longer contains `laptop`
	 * and the spacing leaves the page with no error anywhere.
	 */
	it('never moves a slug the server has stored', () => {
		const [laptop] = toRows([
			{ slug: 'laptop', label: 'Laptop', max: '1024px' },
		]);

		expect(slugFrom('Notebook', laptop!)).toBe('laptop');
	});

	it('keeps a slug the author set themselves on a new row', () => {
		const row = { ...blankRow(), slug: 'lap', label: 'Lap' };

		// Not stored, so the name still leads: this is the convenience path.
		expect(slugFrom('Laptop', row)).toBe('laptop');
	});
});

describe('slugHasMoved', () => {
	it('is false for a row nobody has touched', () => {
		const [row] = toRows([
			{ slug: 'laptop', label: 'Laptop', max: '1024px' },
		]);

		expect(slugHasMoved(row!)).toBe(false);
	});

	it('is true once a stored slug is edited by hand', () => {
		const [row] = toRows([
			{ slug: 'laptop', label: 'Laptop', max: '1024px' },
		]);

		expect(slugHasMoved({ ...row!, slug: 'notebook' })).toBe(true);
	});

	it('is false for a new row, which has nothing to orphan', () => {
		expect(slugHasMoved({ ...blankRow(), slug: 'notebook' })).toBe(false);
	});
});

describe('toSlug', () => {
	it('matches what the server accepts', () => {
		expect(toSlug('Wide  Desktop!')).toBe('wide-desktop');
		expect(toSlug('  ')).toBe('');
	});
});

describe('sameBreakpoints', () => {
	const laptop = { slug: 'laptop', label: 'Laptop', max: '1024px' };
	const mobile = { slug: 'mobile', label: 'Mobile', max: '480px' };

	it('ignores order, because the server stores its own', () => {
		expect(sameBreakpoints([laptop, mobile], [mobile, laptop])).toBe(true);
	});

	it('notices a changed value', () => {
		expect(sameBreakpoints([laptop], [{ ...laptop, max: '1000px' }])).toBe(
			false
		);
	});

	it('notices a different count', () => {
		expect(sameBreakpoints([laptop], [laptop, mobile])).toBe(false);
	});
});

describe('isDirty', () => {
	const stored: StoredSettings = {
		spacery_breakpoint_source: 'custom',
		spacery_custom_breakpoints: [
			{ slug: 'laptop', label: 'Laptop', max: '1024px' },
		],
	};

	it('is clean when the screen matches what the server holds', () => {
		expect(
			isDirty(toRows(stored.spacery_custom_breakpoints), 'custom', stored)
		).toBe(false);
	});

	it('is dirty when the source changes', () => {
		expect(
			isDirty(toRows(stored.spacery_custom_breakpoints), 'theme', stored)
		).toBe(true);
	});

	it('is dirty when a value changes', () => {
		const rows = toRows(stored.spacery_custom_breakpoints);

		expect(
			isDirty([{ ...rows[0]!, max: '1000px' }], 'custom', stored)
		).toBe(true);
	});

	it('is dirty when a row is added', () => {
		const rows = toRows(stored.spacery_custom_breakpoints);

		expect(
			isDirty(
				[
					...rows,
					{ ...blankRow(), slug: 'm', label: 'M', max: '480px' },
				],
				'custom',
				stored
			)
		).toBe(true);
	});

	/** Reordering changes nothing a save would store. */
	it('is clean when rows are only reordered', () => {
		const both: StoredSettings = {
			...stored,
			spacery_custom_breakpoints: [
				{ slug: 'laptop', label: 'Laptop', max: '1024px' },
				{ slug: 'mobile', label: 'Mobile', max: '480px' },
			],
		};

		const reversed = toRows([...both.spacery_custom_breakpoints].reverse());

		expect(isDirty(reversed, 'custom', both)).toBe(false);
	});
});
