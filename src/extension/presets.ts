/**
 * Naming a spacing preset.
 *
 * Core's Dimensions panel stores a preset reference — `var:preset|spacing|50` —
 * rather than a length whenever the author uses its slider, which is its
 * default control. Spacery inherits that value as a placeholder, and a
 * placeholder is a thing to read at a glance in a 59px field: the reference
 * truncates to `var:prese…` and says nothing, while core displays the same
 * value two inches above as *Regular*.
 *
 * So a placeholder shows the preset's name where a number is expected. It is
 * the word core itself uses for that value, which is the point — the author
 * recognises what they set rather than meeting an implementation detail.
 *
 * In `css` mode the fields take whole CSS values, so there the raw reference is
 * the right thing to show: a name is not something you could type.
 */

import { isValueSpacingPreset } from '@wordpress/block-editor';

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
 * What to call an inherited preset.
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
