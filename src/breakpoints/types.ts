/**
 * Breakpoint types, mirroring what the server resolves.
 */

export interface Breakpoint {
	/** Machine name, e.g. `tablet`. */
	slug: string;
	/** Human-readable name, translated where Spacery owns the wording. */
	label: string;
	/** Upper bound as a CSS length, e.g. `782px`. */
	max: string;
}
