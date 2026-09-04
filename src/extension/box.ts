/**
 * What a spacing box does to its values when one field changes.
 *
 * Extracted from the component so the linking rule can be tested. "Linked"
 * has to mean the same thing whatever the sides already hold — a rule that
 * only fills in blanks would look correct on a fresh block and quietly fail on
 * one where the sides had been set apart earlier.
 */

import { formatLength, parseLength } from './length';
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
	/** The unit the box is showing. */
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
	const value = formatLength(input, unit);
	const next: BoxValues = {};

	for (const each of sides) {
		next[each] = linked || each === side ? value : values[each];
	}

	return next;
}

/**
 * The box's values re-labelled with a different unit.
 *
 * The numbers are kept and the unit swapped rather than converted: 2rem
 * becoming 32px would be arithmetic the author never asked for, and it is only
 * correct until the root font size changes. Values that are not plain lengths
 * are left exactly as they are — a preset reference has no number to re-label.
 *
 * @param sides  Sides the block supports.
 * @param values What the box currently holds.
 * @param unit   The chosen unit.
 * @return Every supported side.
 */
export function retagUnit(
	sides: Side[],
	values: BoxValues,
	unit: string
): BoxValues {
	const next: BoxValues = {};

	for (const side of sides) {
		const parsed = parseLength(values[side]);

		next[side] = parsed ? formatLength(parsed.value, unit) : values[side];
	}

	return next;
}
