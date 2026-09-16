/**
 * Naming a spacing preset.
 *
 * Core's Dimensions panel stores a preset reference — `var:preset|spacing|30` —
 * rather than a length whenever the author uses its slider, which is its
 * default control. Spacery inherits that value as a placeholder, and a
 * placeholder is a thing to read at a glance in a 59px field: the reference
 * truncates to `var:prese…` and says nothing.
 *
 * **A number if there is one; the name only when there is not.** Core exports
 * `getCustomValueFromPreset()`, which resolves a reference against the site's
 * own scale, so most of the time there is a real length to show: on Twenty
 * Twenty-Five, `var:preset|spacing|30` is `20px`, and a placeholder reading
 * `20` beside a `px` picker is exactly as useful as one on any other inherited
 * value. Preferring a name there would have been a worse placeholder chosen for
 * the convenience of the one case that needs it.
 *
 * That case is real, though: four of that theme's seven sizes are `clamp()`,
 * which has no number to put in a number field and does not fit one either.
 * There the preset's **name** is the only honest short answer — and it is the
 * word core itself shows for that value, so the author recognises what they
 * set rather than meeting an implementation detail.
 *
 * In `css` mode the fields take whole CSS values, so there the raw reference is
 * the right thing to show: neither a name nor a resolved size is what the block
 * actually stores.
 */

import {
	getCustomValueFromPreset,
	isValueSpacingPreset,
} from '@wordpress/block-editor';

/**
 * One entry of `spacing.spacingSizes`.
 *
 * The shape `useSettings( 'spacing.spacingSizes' )` returns, read off a live
 * 7.1 editor with Twenty Twenty-Five active rather than assumed: an array of
 * `{ name, size, slug }`, already resolved across origins, so a theme that
 * redefines slug `50` has replaced it by the time it arrives here.
 */
export interface SpacingSize {
	name?: string;
	size?: string;
	slug: string;
}

/**
 * The slug at the end of a preset reference.
 *
 * Core exports `isValueSpacingPreset()` to decide *whether* a value is one but
 * nothing to take it apart, so only the last segment is read here — and only
 * after core has said this is a preset, so the shape is not being guessed at.
 */
const SLUG = /\|([^|]+)$/;

/**
 * The length a preset reference resolves to, when the site defines one.
 *
 * Measured against the shipped 7.1 `getCustomValueFromPreset()` rather than
 * assumed, because three of its five answers are easy to guess wrong:
 *
 * | given | returns |
 * |---|---|
 * | `var:preset|spacing|30`, theme sizes | `20px` |
 * | `var:preset|spacing|50`, theme sizes | `clamp(30px, 5vw, 50px)` |
 * | a slug the site does not define | `undefined` |
 * | any preset, with an empty sizes array | `undefined` |
 * | `sizes` undefined | **throws** — so an array is always passed |
 *
 * Non-presets are passed straight back by core, which is why this guards on
 * `isValueSpacingPreset()` first: the caller needs to know whether a resolution
 * happened, not merely to get a string.
 *
 * @param value The inherited value, which may be anything.
 * @param sizes The site's spacing sizes, from `spacing.spacingSizes`.
 * @return The size the preset stands for, or undefined when the value is not a
 *         preset or the site defines no size with that slug.
 */
export function presetSize(
	value: string | undefined,
	sizes: SpacingSize[]
): string | undefined {
	if (!value || !isValueSpacingPreset(value)) {
		return undefined;
	}

	return getCustomValueFromPreset(value, sizes ?? []) || undefined;
}

/**
 * What to call an inherited preset.
 *
 * The fallback for when {@link presetSize} gives something no number field can
 * hold — a `clamp()`, in practice.
 *
 * @param value The inherited value, which may be anything.
 * @param sizes The site's spacing sizes, from `spacing.spacingSizes`.
 * @return The preset's name, or undefined when the value is not a preset, the
 *         site defines no size with that slug, or that size has no name.
 */
export function presetLabel(
	value: string | undefined,
	sizes: SpacingSize[]
): string | undefined {
	if (!value || !isValueSpacingPreset(value)) {
		return undefined;
	}

	const slug = SLUG.exec(value)?.[1];

	if (!slug) {
		return undefined;
	}

	/*
	 * An unknown slug falls through to undefined rather than to the slug
	 * itself. A preset the site no longer defines renders as nothing on the
	 * page, so a placeholder reading `50` would describe a value that is not
	 * being applied; the caller shows the reference instead, which at least
	 * says where the value came from.
	 */
	return sizes.find((size) => size.slug === slug)?.name;
}
