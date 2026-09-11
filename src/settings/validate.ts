/**
 * The settings screen's copy of nothing.
 *
 * The server refuses an invalid breakpoint set **whole** and hands back the
 * previous one, so a rule the screen does not know about is not a warning —
 * it is a save that reports success, changes nothing, and leaves the author
 * looking at values that are not stored. Catching it here is the difference
 * between "that width needs a unit" and "those breakpoints were not saved".
 *
 * The rules themselves come from the server with the rest of the screen's data
 * (D19). `Breakpoint::SLUG_PATTERN`, `LENGTH_PATTERN` and `PIXELS_PER_EM` are
 * shipped verbatim rather than mirrored here, because a TypeScript copy with a
 * comment asking someone to keep it in step is exactly the two-sources-of-truth
 * bug this project rejects everywhere else.
 *
 * What cannot be shipped is the *shape* of the set — unique slugs, strictly
 * descending widths, a maximum count — so those are reimplemented, and asserted
 * against the same table of cases the PHP suite uses.
 */

import { __, sprintf } from '@wordpress/i18n';

import type { Row } from './rows';
import type { ValidationRules } from './types';

/** Which field a problem belongs to, so the message lands beside its cause. */
export type Field = 'label' | 'slug' | 'max';

/** One row's problem. */
export interface RowProblem {
	field: Field;
	message: string;
}

/** Problems found in a set, ready for the screen to render. */
export interface Problems {
	/** One problem per row that has one, keyed by the row's client id. */
	rows: Record<string, RowProblem>;

	/** Problems with the set as a whole. */
	set: string[];
}

/**
 * Whether a set is safe to send.
 *
 * @param problems From validate().
 * @return True when the server will accept it.
 */
export function isValid(problems: Problems): boolean {
	return 0 === problems.set.length && 0 === Object.keys(problems.rows).length;
}

/**
 * A width in pixels, for comparison only.
 *
 * The trap this exists for: widths are compared by the server in **pixels**,
 * not as strings, so `888px` and `55.5rem` are the same width and a set holding
 * both is refused. A screen comparing the typed text would show a valid form
 * and then a save that did nothing.
 *
 * @param value       A validated length.
 * @param pixelsPerEm From the server's own constant.
 * @return The width in pixels, or NaN.
 */
function toPixels(value: string, pixelsPerEm: number): number {
	const length = value.trim();
	const number = parseFloat(length);

	return length.endsWith('em') ? number * pixelsPerEm : number;
}

/**
 * Everything wrong with a set, in the order the server would find it.
 *
 * An empty set is valid and meaningful: it clears the custom source. "No rows"
 * is not an error.
 *
 * @param rows  The rows being edited.
 * @param rules The server's rules.
 * @return What to show, if anything.
 */
export function validate(rows: Row[], rules: ValidationRules): Problems {
	const problems: Problems = { rows: {}, set: [] };

	const slug = new RegExp(rules.slugPattern);
	const length = new RegExp(rules.lengthPattern);

	const seenSlugs = new Set<string>();
	const seenWidths = new Set<number>();

	for (const row of rows) {
		const width = toPixels(row.max, rules.pixelsPerEm);

		if ('' === row.label.trim()) {
			problems.rows[row.id] = {
				field: 'label',
				message: __('Every breakpoint needs a name.', 'spacery'),
			};
		} else if (!slug.test(row.slug.trim())) {
			problems.rows[row.id] = {
				field: 'slug',
				message: __(
					'Lowercase letters, numbers and dashes only.',
					'spacery'
				),
			};
		} else if (!length.test(row.max.trim())) {
			problems.rows[row.id] = {
				field: 'max',
				message: __(
					'Needs a number and a unit — px, em or rem.',
					'spacery'
				),
			};
		} else if (0 >= width) {
			problems.rows[row.id] = {
				field: 'max',
				message: __('Has to be more than zero.', 'spacery'),
			};
		} else if (seenSlugs.has(row.slug.trim())) {
			problems.rows[row.id] = {
				field: 'slug',
				message: sprintf(
					/* translators: %s: a breakpoint slug. */
					__('%s is already taken.', 'spacery'),
					row.slug.trim()
				),
			};
		} else if (seenWidths.has(width)) {
			problems.rows[row.id] = {
				field: 'max',
				message: __(
					'Another breakpoint is already this wide, so which applies would be ambiguous.',
					'spacery'
				),
			};
		}

		if (undefined === problems.rows[row.id]) {
			seenSlugs.add(row.slug.trim());
			seenWidths.add(width);
		}
	}

	if (rows.length > rules.maxBreakpoints) {
		problems.set.push(
			sprintf(
				/* translators: %d: maximum number of breakpoints. */
				__('%d breakpoints is the maximum.', 'spacery'),
				rules.maxBreakpoints
			)
		);
	}

	return problems;
}
