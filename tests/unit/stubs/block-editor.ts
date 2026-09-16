/**
 * The two things `presets.ts` asks of `@wordpress/block-editor`.
 *
 * **A stub of an API is a place to test against a fake instead of the real
 * thing**, so this covers `isValueSpacingPreset()` and
 * `getCustomValueFromPreset()` and nothing else. Both shapes were read off a
 * live 7.1 editor rather than assumed:
 *
 * | value | returns |
 * |---|---|
 * | `var:preset|spacing|50` | `true` |
 * | `24px` | `false` |
 * | `calc(100% - 2rem)` | `false` |
 *
 * What pins this to the real function is that `presets.ts` calls the real one
 * in the editor, and the E2E test drives the real editor. These tests prove the
 * slug lookup and the fallbacks; they cannot prove core's definition of a
 * preset, and do not claim to.
 */

/**
 * Whether a value is a spacing preset reference.
 *
 * @param value Any stored value.
 * @return True for `var:preset|spacing|<slug>`.
 */
export function isValueSpacingPreset(value: string): boolean {
	return 'string' === typeof value && value.startsWith('var:preset|spacing|');
}

/**
 * The length a preset reference stands for.
 *
 * Mirrors what the shipped 7.1 function was measured doing: a known slug gives
 * its size, an unknown slug and an empty list give `undefined`, and a
 * non-preset is returned unchanged.
 *
 * @param value Any stored value.
 * @param sizes The site's spacing sizes.
 * @return The size, or undefined when the slug is unknown.
 */
export function getCustomValueFromPreset(
	value: string,
	sizes: Array<{ name?: string; size?: string; slug: string }>
): string | undefined {
	if (!isValueSpacingPreset(value)) {
		return value;
	}

	const slug = value.slice('var:preset|spacing|'.length);

	return sizes.find((size) => size.slug === slug)?.size;
}
