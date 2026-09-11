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

/** The two options, exactly as `/wp/v2/settings` returns them. */
export interface StoredSettings {
	spacery_breakpoint_source: StoredSource;
	spacery_custom_breakpoints: Breakpoint[];
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
	defaultSource: EffectiveSource;
	resolved: Breakpoint[];
	theme: Breakpoint[] | null;
	preset: Breakpoint[];
	maxBreakpoints: number;
	rules: Omit<ValidationRules, 'maxBreakpoints'>;
}
