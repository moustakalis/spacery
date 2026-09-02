/**
 * Stand-in for `@wordpress/i18n` under Vitest.
 *
 * The real package is a webpack external backed by `window.wp.i18n`, so it is
 * correctly absent from node_modules and cannot be imported by a Node test
 * runner. An untranslated site returns the source string, which is exactly what
 * these two do — so a test asserting on a label is asserting on the English
 * source, the same string a POT file will carry.
 */

/**
 * Returns the source string, as an untranslated site does.
 *
 * @param text The source string.
 * @return The same string.
 */
export function __(text: string): string {
	return text;
}

/**
 * Minimal `sprintf`, covering the `%s`, `%d` and positional forms Spacery uses.
 *
 * @param format The format string.
 * @param args   Values to interpolate.
 * @return The formatted string.
 */
export function sprintf(format: string, ...args: unknown[]): string {
	let next = 0;

	return format.replace(/%(?:(\d+)\$)?[sd]/g, (_match, position?: string) =>
		String(args[position ? Number(position) - 1 : next++])
	);
}
