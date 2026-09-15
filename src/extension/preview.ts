/**
 * The CSS the editor shows for a block's responsive values.
 *
 * **The claim this module has to keep is that the canvas and the page agree.**
 * So it copies `Styles\Generator::generate()` decision for decision, and the
 * places it deliberately differs are named here rather than discovered later:
 *
 * | | Front end | Here |
 * |---|---|---|
 * | Selector | `.spy-<md5 of the content>` | a `clientId` class |
 * | Declarations | `wp_style_engine_get_styles()` | `getCSSRules()`, the same engine |
 * | `!important` | every declaration | every declaration |
 * | Bands | widest first, disjoint | widest first, disjoint |
 * | The base value | never emitted | never emitted |
 * | Values | `Generator::is_value()` | {@link isValue}, same table |
 *
 * **The class is the only real difference and it costs nothing.** The hash
 * exists on the front end to dedupe one rule across many blocks; in the editor
 * there is one style override per block by construction, so there is nothing to
 * dedupe and no reason to port `md5`.
 *
 * **The base value is core's.** Every rule here sits inside a media query and
 * carries `!important`, because core writes its own spacing as an inline
 * `style` attribute and an inline declaration beats any class selector. That is
 * `Generator::force()`'s reasoning and it applies unchanged.
 */

import { getCSSRules } from '@wordpress/style-engine';

import { readPath, writePath } from '../attribute/paths';
import { effectiveAt } from '../attribute/tiers';
import type {
	SpaceryAttribute,
	StyleNode,
	StylePath,
} from '../attribute/types';
import { mediaQueryFor } from '../breakpoints/queries';
import type { Breakpoint } from '../breakpoints/types';
import { isValue } from './isValue';

/**
 * Every leaf path authored anywhere in the attribute, at known tiers only.
 *
 * Paths rather than values, because a value set at one tier applies at every
 * narrower one (D13) and the tier that inherits it never mentions it. Walking
 * the union of paths is what `Generator::materialize()` does for the same
 * reason.
 *
 * @param attribute   The block's `spacery` attribute.
 * @param breakpoints The active set.
 * @return Each distinct path, as a `/`-joined key mapped to its segments.
 */
function authoredPaths(
	attribute: SpaceryAttribute,
	breakpoints: Breakpoint[]
): Map<string, StylePath> {
	const paths = new Map<string, StylePath>();

	const walk = (node: unknown, trail: string[]): void => {
		if ('object' !== typeof node || null === node || Array.isArray(node)) {
			if ('string' === typeof node && 0 < trail.length) {
				paths.set(trail.join('/'), [...trail]);
			}

			return;
		}

		for (const [key, value] of Object.entries(node)) {
			walk(value, [...trail, key]);
		}
	};

	for (const { slug } of breakpoints) {
		walk(attribute[slug], []);
	}

	return paths;
}

/**
 * The style object that applies at one tier, with unsafe leaves dropped.
 *
 * @param attribute   The block's `spacery` attribute.
 * @param breakpoints The active set, widest first.
 * @param slug        The tier.
 * @param paths       Every authored path.
 * @return A style object, empty when nothing applies here.
 */
function styleAt(
	attribute: SpaceryAttribute,
	breakpoints: Breakpoint[],
	slug: string,
	paths: Map<string, StylePath>
): StyleNode {
	let style: StyleNode = {};

	for (const path of paths.values()) {
		const value = effectiveAt(attribute, breakpoints, slug, path);

		if (undefined !== value && isValue(value)) {
			style = writePath(style, path, value);
		}
	}

	return style;
}

/**
 * Turns the Style Engine's rules into declarations.
 *
 * `getCSSRules()` returns one entry per declaration as `{ selector, key, value }`
 * with **`key` in camelCase** -- `paddingTop`, not `padding-top` -- which is the
 * one thing about this API that will not announce itself if it is got wrong:
 * `paddingTop: 10px` inside a stylesheet is simply ignored by the browser.
 * Measured against the shipped 7.1 build rather than assumed.
 *
 * @param style    A style object for one tier.
 * @param selector The class selector.
 * @return Declaration text, or an empty string.
 */
function declarationsFor(style: StyleNode, selector: string): string {
	return getCSSRules(style, { selector })
		.map(({ key, value }) => {
			const property = key.replace(
				/[A-Z]/g,
				(letter) => `-${letter.toLowerCase()}`
			);

			return `${property}: ${value} !important;`;
		})
		.join(' ');
}

/**
 * The whole stylesheet for one block, or an empty string.
 *
 * Widest first, so a narrower band's rule comes later and wins where two
 * overlap -- the same order `Generator::materialize()` emits, and the reason it
 * sorts rather than following the attribute's key order.
 *
 * @param attribute   The block's `spacery` attribute, if it has one.
 * @param breakpoints The active set, widest first.
 * @param className   The class the block will carry.
 * @return CSS, or an empty string when there is nothing to show.
 */
export function previewCss(
	attribute: unknown,
	breakpoints: Breakpoint[],
	className: string
): string {
	if (
		'object' !== typeof attribute ||
		null === attribute ||
		0 === breakpoints.length ||
		'' === className
	) {
		return '';
	}

	const spacery = attribute as SpaceryAttribute;
	const paths = authoredPaths(spacery, breakpoints);

	if (0 === paths.size) {
		return '';
	}

	const selector = `.${className}`;
	const blocks: string[] = [];

	breakpoints.forEach((tier, index) => {
		const style = styleAt(spacery, breakpoints, tier.slug, paths);

		if (0 === Object.keys(style).length) {
			return;
		}

		const declarations = declarationsFor(style, selector);

		if ('' === declarations) {
			return;
		}

		blocks.push(
			`${mediaQueryFor(breakpoints, index)} { ${selector} { ${declarations} } }`
		);
	});

	return blocks.join('\n');
}

/** Re-exported so the HOC and the tests read a leaf the same way. */
export { readPath };
