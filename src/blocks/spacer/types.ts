/**
 * Shared types for the spacer block.
 */

import type { SpaceryAttribute } from '../../attribute/types';

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
