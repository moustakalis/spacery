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
}
