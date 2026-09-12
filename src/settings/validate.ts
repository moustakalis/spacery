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

import { __, _n, sprintf } from '@wordpress/i18n';

import { CEILING_PX, didYouMean, toPixels } from './bands';
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
 * How many problems there are, for the sentence beside the disabled Save.
 *
 * Rows and set-wide problems counted together, because the author is not being
 * asked where they are — only how many are left.
 *
 * @param problems From validate().
 * @return The count.
 */
export function countProblems(problems: Problems): number {
	return problems.set.length + Object.keys(problems.rows).length;
}

/**
 * Why the Save button is in the state it is in.
 *
 * A disabled control with nothing beside it is a question the author cannot
 * answer: whether the screen is broken, whether the work is already saved, or
 * whether something above is wrong. An invalid set outranks a dirty one —
 * knowing there are three problems to fix is more use than being told there
 * are changes that cannot go anywhere.
 *
 * @param problems      From validate().
 * @param changed       How many breakpoints differ from the stored set.
 * @param sourceChanged Whether the chosen source differs from the stored one.
 * @return One sentence.
 */
export function saveHint(
	problems: Problems,
	changed: number,
	sourceChanged: boolean
): string {
	if (!isValid(problems)) {
		const count = countProblems(problems);

		return sprintf(
			/* translators: %d: how many problems are on the screen. */
			_n(
				'Fix %d problem above to save.',
				'Fix %d problems above to save.',
				count,
				'spacery'
			),
			count
		);
	}

	if (0 < changed) {
		return sprintf(
			/* translators: %d: how many breakpoints have been changed. */
			_n(
				'Unsaved change to %d breakpoint.',
				'Unsaved changes to %d breakpoints.',
				changed,
				'spacery'
			),
			changed
		);
	}

	/*
	 * A source change on its own has no count to give -- there is one source --
	 * and saying "1 breakpoint" about it would be wrong in both halves.
	 */
	if (sourceChanged) {
		return __('Unsaved change to the breakpoint source.', 'spacery');
	}

	return __('No changes to save.', 'spacery');
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

/**
 * Cautions: legal, saveable, and probably not what the author meant.
 *
 * Kept apart from `validate()` on purpose. The server enforces no upper bound
 * on a width and is right not to — there is no principled maximum — so a tier
 * at `11920px` saves cleanly and applies. It is also, almost always, `1920px`
 * with a finger on the wrong key, and nothing on this screen said so: the
 * `Covers` column read "over 1300px, up to 11920px" as if that were deliberate.
 *
 * @param rows  The rows being edited.
 * @param rules The server's rules.
 * @return One caution per row that earns one.
 */
export function cautions(
	rows: Row[],
	rules: ValidationRules
): Record<string, RowProblem> {
	const found: Record<string, RowProblem> = {};

	for (const row of rows) {
		if (CEILING_PX >= toPixels(row.max, rules.pixelsPerEm)) {
			continue;
		}

		const suggestion = didYouMean(row.max, rules.pixelsPerEm);

		found[row.id] = {
			field: 'max',
			message: suggestion
				? sprintf(
						/* translators: %s: a narrower CSS length, e.g. "1920px". */
						__(
							'Wider than any common screen. Did you mean %s?',
							'spacery'
						),
						suggestion
					)
				: __(
						'Wider than any common screen, so the ruler stops short of it.',
						'spacery'
					),
		};
	}

	return found;
}
