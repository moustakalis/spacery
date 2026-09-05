/**
 * What a spacing box does to its values when one field changes.
 *
 * Extracted from the component so the linking rule can be tested. "Linked"
 * has to mean the same thing whatever the sides already hold — a rule that
 * only fills in blanks would look correct on a fresh block and quietly fail on
 * one where the sides had been set apart earlier.
 */

import { CUSTOM, formatLength, parseLength } from './length';
import type { Side } from './supports';

/** A box's values, one per side the block supports. */
export type BoxValues = Partial<Record<Side, string | undefined>>;

interface Edit {
	/** Sides the block supports, in canonical order. */
	sides: Side[];
	/** What the box currently holds. */
	values: BoxValues;
	/** The side whose field the author typed in. */
	side: Side;
	/** The field's contents; empty or undefined clears. */
	input: string | number | undefined;
	/** The unit the box is showing, or {@link CUSTOM}. */
	unit: string;
	/** Whether the sides are linked. */
	linked: boolean;
}

/**
 * The box's next values after one field changes.
 *
 * Linked overwrites every side, set or unset. Unlinked touches exactly the one
 * that changed and passes the rest through unaltered — including sides holding
 * values this control cannot parse, which are left as they were rather than
 * dropped.
 *
 * @param edit        The change.
 * @param edit.sides
 * @param edit.values
 * @param edit.side
 * @param edit.input
 * @param edit.unit
 * @param edit.linked
 * @return Every supported side, so the caller can write them all.
 */
export function applyEdit({
	sides,
	values,
	side,
	input,
	unit,
	linked,
}: Edit): BoxValues {
	const value = CUSTOM === unit ? custom(input) : formatLength(input, unit);
	const next: BoxValues = {};

	for (const each of sides) {
		next[each] = linked || each === side ? value : values[each];
	}

	return next;
}

/**
 * The box's values after the unit picker changes.
 *
 * Three cases, and they are not symmetrical:
 *
 * - **Between real units**, the numbers are kept and the unit swapped rather
 *   than converted: 2rem becoming 32px would be arithmetic the author never
 *   asked for, and it is only correct until the root font size changes.
 * - **Into custom**, everything is kept exactly as it is. Every length is
 *   already a valid CSS value, so this direction loses nothing and clearing
 *   would only destroy work.
 * - **Out of custom**, everything is cleared. `calc(100% - 2rem)` has no number
 *   to put in a number field, and keeping the parseable ones while dropping the
 *   rest would make the outcome depend on what each side happened to hold.
 *
 * @param sides  Sides the block supports.
 * @param values What the box currently holds.
 * @param from   The unit the box was showing.
 * @param to     The chosen unit.
 * @return Every supported side.
 */
export function switchUnit(
	sides: Side[],
	values: BoxValues,
	from: string,
	to: string
): BoxValues {
	if (CUSTOM === to) {
		const kept: BoxValues = {};

		for (const side of sides) {
			kept[side] = values[side];
		}

		return kept;
	}

	if (CUSTOM === from) {
		return clearBox(sides);
	}

	const next: BoxValues = {};

	for (const side of sides) {
		const parsed = parseLength(values[side]);

		next[side] = parsed ? formatLength(parsed.value, to) : values[side];
	}

	return next;
}

/**
 * A free-text field's contents, ready to store.
 *
 * Trimmed, and empty means clear. Nothing else is done to it: what is and is
 * not a usable CSS value is WordPress's judgement, made by
 * `safecss_filter_attr()` when the declaration is built, and a second opinion
 * here would only be a worse copy of it that drifts.
 *
 * @param input The field's contents.
 * @return The value to store, or undefined to clear it.
 */
function custom(input: string | number | undefined): string | undefined {
	const value = String(input ?? '').trim();

	return '' === value ? undefined : value;
}

/**
 * The box emptied.
 *
 * Every supported side, explicitly undefined, so the caller writes them all —
 * a partial object would leave whichever sides it omitted untouched, which is
 * the opposite of a reset.
 *
 * "Reset" here means clearing the values authored at this tier so the sides
 * inherit from the nearest wider one. Not zero, which is a value someone
 * chooses, and not the theme's default, which Spacery does not store.
 *
 * @param sides Sides the block supports.
 * @return Every supported side, cleared.
 */
export function clearBox(sides: Side[]): BoxValues {
	const next: BoxValues = {};

	for (const side of sides) {
		next[side] = undefined;
	}

	return next;
}

/**
 * Whether a box holds anything authored at this tier.
 *
 * @param sides  Sides the block supports.
 * @param values What the box currently holds.
 * @return True when at least one side is set here.
 */
export function isAuthored(sides: Side[], values: BoxValues): boolean {
	return sides.some((side) => undefined !== values[side]);
}
