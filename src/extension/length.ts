/**
 * Splitting and rebuilding CSS lengths.
 *
 * The spacing box shows four plain number fields and one unit picker for the
 * whole box, which is the only layout that fits four sides in an inspector
 * column. That means the stored strings — `13px`, `1.5rem` — have to come apart
 * and go back together, so the parsing lives here where it can be tested rather
 * than inside a component.
 */

/**
 * The pseudo-unit for values a number field cannot hold.
 *
 * Not a CSS unit and never written into a value — it is the box's mode. In it
 * the four fields take whole CSS values, which is the only way to author a
 * mixture (`0`, `30rem`, `calc(100% - 2rem)`) or to see a preset reference that
 * something else has already stored on the block.
 */
export const CUSTOM = 'custom';

/** A CSS length split into its number and its unit. */
export interface Length {
	value: number;
	unit: string;
}

/**
 * Numbers with an optional unit, and nothing else.
 *
 * Deliberately not a general CSS value parser: `calc()`, `var()` and preset
 * strings such as `var:preset|spacing|40` are values Spacery stores happily but
 * cannot show in a number field. They return undefined here, and the caller
 * treats that as "not editable as a number" rather than mangling it.
 */
const LENGTH = /^\s*(-?(?:\d+\.?\d*|\.\d+))([a-z%]*)\s*$/i;

/**
 * Splits a stored value into a number and a unit.
 *
 * @param input The stored value, if any.
 * @return The parts, or undefined when the value is not a plain length.
 */
export function parseLength(input: string | undefined): Length | undefined {
	if (!input) {
		return undefined;
	}

	const match = LENGTH.exec(input);

	if (!match?.[1]) {
		return undefined;
	}

	const value = Number(match[1]);

	if (!Number.isFinite(value)) {
		return undefined;
	}

	return { value, unit: (match[2] ?? '').toLowerCase() };
}

/**
 * Rebuilds a stored value from a number field and the box's unit.
 *
 * An empty field is not zero. Zero is a spacing value someone may want; an
 * empty field means "inherit", and the two have to stay distinguishable all the
 * way down to the attribute.
 *
 * @param input The number field's contents.
 * @param unit  The unit the box is showing.
 * @return The value to store, or undefined to clear it.
 */
export function formatLength(
	input: string | number | undefined,
	unit: string
): string | undefined {
	if (undefined === input || '' === input) {
		return undefined;
	}

	const value = Number(input);

	if (!Number.isFinite(value)) {
		return undefined;
	}

	return `${value}${unit}`;
}

/**
 * The unit a box should show.
 *
 * The first unit among the values that the theme still allows. A box holding
 * `2rem` on a site that has since restricted spacing to pixels would otherwise
 * show `px` beside a number that means something else.
 *
 * @param values  The box's stored values, in side order.
 * @param allowed Units the theme permits.
 * @return A unit, always one of the allowed ones.
 */
export function unitFor(
	values: Array<string | undefined>,
	allowed: string[]
): string {
	const fallback = allowed.includes('px') ? 'px' : (allowed[0] ?? 'px');

	for (const value of values) {
		const unit = parseLength(value)?.unit;

		if (unit && allowed.includes(unit)) {
			return unit;
		}
	}

	/*
	 * A stored value no number field can hold puts the box in custom mode.
	 * Otherwise it would render as an empty field: invisible to the author,
	 * still applied on the front end, and destroyed by the next linked edit.
	 * Values reach a block that way through core's own controls and through
	 * Spacery's takeover, not only by being typed here.
	 */
	if (values.some((value) => value && !parseLength(value))) {
		return CUSTOM;
	}

	return fallback;
}
