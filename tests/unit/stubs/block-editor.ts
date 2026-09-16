/**
 * The one thing `presets.ts` asks of `@wordpress/block-editor`.
 *
 * **A stub of an API is a place to test against a fake instead of the real
 * thing**, so this covers `isValueSpacingPreset()` and nothing else. The shape
 * was read off a live 7.1 editor rather than assumed:
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
