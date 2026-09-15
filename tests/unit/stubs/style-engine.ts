/**
 * The one thing `preview.ts` asks of `@wordpress/style-engine`.
 *
 * **A stub of an API is a place to test against a fake instead of the real
 * thing, and this file is written to be too small to hide one.** It covers
 * exactly what the preview uses: `spacing.padding` and `spacing.margin` leaves
 * flattened to camelCase keys, and the `var:preset|…` form resolved the way
 * both the JS and PHP engines resolve it. Anything else the real engine can do
 * is deliberately absent, so a test that starts relying on it fails here rather
 * than passing on a guess.
 *
 * **What pins this to the real engine is the E2E test**, which drives the real
 * editor and compares the canvas against the rendered page. This stub proves
 * the band structure, the ordering and the `!important`; it cannot prove
 * fidelity, and does not claim to.
 *
 * Shapes measured against the shipped WordPress 7.1 build:
 * `getCSSRules({spacing:{padding:{top:'10px'}}}, {selector:'.x'})` returns
 * `[{ selector: '.x', key: 'paddingTop', value: '10px' }]`.
 */

interface StyleRule {
	selector: string;
	key: string;
	value: string;
}

/**
 * `var:preset|spacing|50` is what core's own controls store.
 * @param value
 */
function resolve(value: string): string {
	const preset = /^var:([a-z0-9_-]+)\|([a-z0-9_-]+)\|([a-z0-9_-]+)$/i.exec(
		value
	);

	if (!preset) {
		return value;
	}

	return `var(--wp--${preset[1]}--${preset[2]}--${preset[3]})`;
}

/**
 * Flattens a spacing style object into declarations.
 *
 * @param style            The style object.
 * @param options          Options.
 * @param options.selector The selector each rule carries.
 * @return One rule per declaration.
 */
export function getCSSRules(
	style: Record<string, unknown>,
	options: { selector?: string } = {}
): StyleRule[] {
	const selector = options.selector ?? '';
	const rules: StyleRule[] = [];
	const spacing = style.spacing;

	if ('object' !== typeof spacing || null === spacing) {
		return rules;
	}

	for (const feature of ['padding', 'margin']) {
		const sides = (spacing as Record<string, unknown>)[feature];

		if ('object' !== typeof sides || null === sides) {
			continue;
		}

		for (const [side, value] of Object.entries(
			sides as Record<string, unknown>
		)) {
			if ('string' !== typeof value) {
				continue;
			}

			rules.push({
				selector,
				key: feature + side.charAt(0).toUpperCase() + side.slice(1),
				value: resolve(value),
			});
		}
	}

	return rules;
}
