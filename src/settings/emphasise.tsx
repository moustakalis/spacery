/**
 * One value picked out of a translated sentence.
 *
 * `createInterpolateElement()` is the WordPress tool for this, and
 * `@wordpress/element` is a script external that is not in `node_modules`, so
 * its signature cannot be checked here — and `docs/CONTRIBUTING.md` says to use
 * plain markup rather than guess a declaration. Splitting the translated format
 * on its own placeholder does the same job with nothing to declare, and leaves
 * the translator one ordinary `%s` where the emphasis goes.
 */

/**
 * A sentence with one value in bold.
 *
 * @param format A translated format string containing exactly one `%s`.
 * @param value  What to emphasise.
 * @return The sentence.
 */
export function emphasise(format: string, value: string): React.ReactElement {
	const [before = '', after = ''] = format.split('%s');

	return (
		<>
			{before}
			<strong>{value}</strong>
			{after}
		</>
	);
}
