/**
 * Shared types for the spacer block.
 */

/**
 * A style object for one breakpoint, shaped exactly like core's `style`
 * attribute so the server can hand it straight to the Style Engine.
 */
export interface TierStyles {
	dimensions?: {
		height?: string;
	};
	spacing?: {
		margin?: Partial<Record<'top' | 'bottom', string>>;
	};
}

/**
 * Per-breakpoint overrides, keyed by breakpoint slug.
 *
 * Slugs are whatever the site's breakpoint set defines, so this is deliberately
 * an open record rather than a union of the built-in tier names.
 */
export type SpaceryAttribute = Record<string, TierStyles>;

export interface SpacerAttributes {
	/** Base height, applying at every width unless a breakpoint overrides it. */
	height: string;
	/**
	 * Per-breakpoint overrides. Absent until the author sets one.
	 *
	 * Explicitly `| undefined` because clearing a block attribute in Gutenberg
	 * means passing `undefined` to `setAttributes`, and `exactOptionalPropertyTypes`
	 * distinguishes "may be absent" from "may be undefined".
	 */
	spacery?: SpaceryAttribute | undefined;
}
