/**
 * Saved markup for the spacer block.
 */

import { useBlockProps } from '@wordpress/block-editor';
import { createElement } from '@wordpress/element';
import type { ReactElement } from 'react';

import type { SpacerAttributes } from './types';

/**
 * Serializes the block.
 *
 * Only the base height is written here. Per-breakpoint heights are emitted as a
 * generated stylesheet at render time and reach this element through a class the
 * server adds, so the saved markup never has to change when the CSS does — which
 * is what makes those rules editable without invalidating existing posts.
 *
 * `useBlockProps.save()` is used rather than a hand-built element so that
 * `supports.anchor` and the margin controls actually reach the front end. v1
 * omitted it and silently dropped both.
 * @param root0            Component props.
 * @param root0.attributes The block's attributes.
 * @return The saved markup.
 */
export default function save({
	attributes,
}: {
	attributes: SpacerAttributes;
}): ReactElement {
	const { height } = attributes;

	return createElement('div', {
		...useBlockProps.save({
			style: height ? { height } : undefined,
			// A spacer conveys nothing to a screen reader.
			'aria-hidden': 'true',
		}),
	});
}
