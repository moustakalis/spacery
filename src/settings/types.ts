/**
 * Shapes the settings screen exchanges with the server.
 */

import type { Breakpoint } from '../breakpoints/types';

export type { Breakpoint };

/**
 * A stored source choice. The empty string means "not chosen", which is a real
 * state: the registry then follows the theme when the theme has an opinion.
 */
export type StoredSource = '' | 'theme' | 'spacery' | 'custom';

/** A resolved source. Never empty — the registry always lands on one. */
export type EffectiveSource = Exclude<StoredSource, ''>;

/**
 * Where the set on the page came from.
 *
 * A superset of `EffectiveSource`, because `spacery_breakpoints` can replace
 * the set and a filter is not a source anybody can choose or store. Kept as its
 * own type so that nothing can assign one of these to a radio button.
 */
export type ResolvedSource = EffectiveSource | 'filter';

/** The stored options, exactly as `/wp/v2/settings` returns them. */
export interface StoredSettings {
	spacery_breakpoint_source: StoredSource;
	spacery_custom_breakpoints: Breakpoint[];
	/**
	 * Whether to delete Spacery's settings when the plugin is deleted (D24).
	 *
	 * Part of this screen's save cycle rather than a control that writes on
	 * click, because a screen with two save models is a screen where nobody
	 * knows which half of it is committed.
	 */
	spacery_delete_data: boolean;
}

/**
 * The sanitiser's rules, shipped rather than mirrored (D19).
 *
 * Patterns arrive without delimiters and go straight to `RegExp`; the
 * pixels-per-em is what the server compares widths with, and comparing
 * anything else makes `888px` and `55.5rem` look like different widths when
 * the server will refuse the pair.
 */
export interface ValidationRules {
	slugPattern: string;
	lengthPattern: string;
	pixelsPerEm: number;
	maxBreakpoints: number;
}

/**
 * What the stored options *mean*, from `spacery/v1/breakpoints`.
 *
 * Kept apart from the stored values on purpose: the screen has to be able to
 * say "Theme (in use)" without implying anybody chose it.
 */
export interface BreakpointInfo {
	effectiveSource: EffectiveSource;
	/**
	 * Where the set in `resolved` actually came from.
	 *
	 * Not a synonym for `effectiveSource`. A followed source can be empty —
	 * `custom` with no rows stored, a theme that declares breakpoints Spacery
	 * cannot read — and the server falls through to its preset. The two differ
	 * exactly when the screen owes the author an explanation.
	 */
	resolvedSource: ResolvedSource;
	defaultSource: EffectiveSource;
	resolved: Breakpoint[];
	theme: Breakpoint[] | null;
	preset: Breakpoint[];
	maxBreakpoints: number;
	rules: Omit<ValidationRules, 'maxBreakpoints'>;
}
