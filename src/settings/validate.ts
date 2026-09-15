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

/**
 * How bad a problem is, which decides how it is drawn.
 *
 * Two treatments, three meanings (`docs/design/settings-screen.png` §C). A
 * **conflict** is a row fighting another row: red field, red message, and the
 * row itself tinted, because the pair is the problem and the author has to see
 * which rows are in it. **Incomplete** is a field the author has not finished
 * and **caution** is a value that is legal and probably a typo; both are amber
 * and neither tints the row, because nothing is wrong with the rest of it.
 */
export type Severity = 'conflict' | 'incomplete' | 'caution';

/** One row's problem. */
export interface RowProblem {
	field: Field;
	severity: Severity;
	message: string;
}

/** Problems found in a set, ready for the screen to render. */
export interface Problems {
	/**
	 * Every problem a row has, keyed by the row's client id.
	 *
	 * A list rather than one problem, and at most one entry per field, because
	 * a row can be wrong in more than one way at once and the three fields are
	 * three places on screen. Reported one at a time, an author fixed the
	 * width and only then learnt the slug was taken. A row with nothing wrong
	 * has no key here at all, never an empty list -- `isValid()` counts keys.
	 */
	rows: Record<string, RowProblem[]>;

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
	return Object.values(problems.rows).reduce(
		(total, list) => total + list.length,
		problems.set.length
	);
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
 * Every unsaved thing on the screen has to be able to reach this sentence. When
 * D24's checkbox was added it was not, so ticking it lit up a primary Save
 * button with "No changes to save." beside it — the control and its own caption
 * disagreeing, which is worse than either being absent.
 *
 * @param problems      From validate().
 * @param changed       How many breakpoints differ from the stored set.
 * @param sourceChanged Whether the chosen source differs from the stored one.
 * @param deleteChanged Whether the delete-on-uninstall choice differs.
 * @return One sentence.
 */
export function saveHint(
	problems: Problems,
	changed: number,
	sourceChanged: boolean,
	deleteChanged = false
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

	/*
	 * Last, because it is the least of them: a breakpoint edit or a source
	 * change is what the author came here to do, and this is a preference
	 * about a plugin they have not deleted.
	 */
	if (deleteChanged) {
		return __('Unsaved change to what happens on deletion.', 'spacery');
	}

	return __('No changes to save.', 'spacery');
}

/**
 * What to call a row in a message about another row.
 *
 * §5.2 asks a conflict to name the other row rather than recite the rule, and
 * the name is the obvious handle. A row can be the first to claim a slug while
 * its own name is still blank, though, and “Already used by .” names nothing.
 * The slug is the next best handle, because it is on screen in the same
 * column the message is pointing at.
 *
 * @param row The row being named.
 * @return Its name, its slug, or a description.
 */
function nameOf(row: Row): string {
	return (
		row.label.trim() ||
		row.slug.trim() ||
		__('an unnamed breakpoint', 'spacery')
	);
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

	/*
	 * Keyed by slug and by width, holding the *name* of the row that got there
	 * first, because §5.2 asks a problem to name the other row involved rather
	 * than recite the rule. "Already used by Laptop" is something the author
	 * can act on; "slugs must be unique" is something they have to go and
	 * check.
	 */
	const seenSlugs = new Map<string, string>();
	const seenWidths = new Map<number, string>();

	for (const row of rows) {
		const label = row.label.trim();
		const slugText = row.slug.trim();
		const maxText = row.max.trim();
		const width = toPixels(row.max, rules.pixelsPerEm);
		const found: RowProblem[] = [];

		if ('' === label) {
			found.push({
				field: 'label',
				severity: 'incomplete',
				message: __(
					'Needs a name — this is what you pick in the editor.',
					'spacery'
				),
			});
		}

		const slugIsSound = slug.test(slugText);

		if (!slugIsSound) {
			found.push({
				field: 'slug',
				severity: 'incomplete',
				message: __(
					'Lowercase letters, numbers and dashes only.',
					'spacery'
				),
			});
		}

		const widthIsSound = length.test(maxText) && 0 < width;

		if (!length.test(maxText)) {
			found.push({
				field: 'max',
				severity: 'incomplete',
				message: __(
					'Needs a number and a unit — px, em or rem.',
					'spacery'
				),
			});
		} else if (0 >= width) {
			found.push({
				field: 'max',
				severity: 'incomplete',
				message: __('Has to be more than zero.', 'spacery'),
			});
		}

		/*
		 * Each field claims its value independently of the rest of the row.
		 *
		 * This used to register nothing for a row that had any problem at all,
		 * which quietly lost conflicts: a row with a blank width never claimed
		 * its slug, so the *next* row to use that slug looked like the first
		 * one there and was reported as fine. The duplicate then appeared
		 * nowhere on the screen and was not counted. A slug is a slug whether
		 * or not the width beside it parses.
		 */
		if (slugIsSound) {
			if (seenSlugs.has(slugText)) {
				found.push({
					field: 'slug',
					severity: 'conflict',
					message: sprintf(
						/* translators: %s: the name of the breakpoint already using this slug. */
						__(
							'Already used by %s. Two breakpoints cannot share a slug.',
							'spacery'
						),
						seenSlugs.get(slugText) ?? ''
					),
				});
			} else {
				seenSlugs.set(slugText, nameOf(row));
			}
		}

		if (widthIsSound) {
			if (seenWidths.has(width)) {
				found.push({
					field: 'max',
					severity: 'conflict',
					message: sprintf(
						/* translators: %s: the name of the breakpoint at this width. */
						__('Same width as %s.', 'spacery'),
						seenWidths.get(width) ?? ''
					),
				});
			} else {
				seenWidths.set(width, nameOf(row));
			}
		}

		if (0 < found.length) {
			problems.rows[row.id] = found;
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
			severity: 'caution',
			message: suggestion
				? sprintf(
						/* translators: %s: a narrower CSS length, e.g. "1920px". */
						__(
							'Too wide for the ruler. Did you mean %s?',
							'spacery'
						),
						suggestion
					)
				: __('Too wide for the ruler.', 'spacery'),
		};
	}

	return found;
}
