/**
 * Reads and writes the settings screen's data.
 *
 * Two endpoints, deliberately. `/wp/v2/settings` owns the stored values and all
 * their validation, because `register_setting()` put it there — the screen is
 * one client of that, not a second authority. `spacery/v1/breakpoints` is
 * read-only and answers a question the options cannot: what the theme's set and
 * Spacery's preset actually contain, so a person can choose between them.
 */

import apiFetch from '@wordpress/api-fetch';

import type { Breakpoint, BreakpointInfo, StoredSettings } from './types';

/** Core's settings endpoint. */
const SETTINGS = '/wp/v2/settings';

/** Spacery's read-only companion. */
const BREAKPOINTS = '/spacery/v1/breakpoints';

/**
 * The stored options.
 *
 * @return The two Spacery settings.
 */
export async function fetchSettings(): Promise<StoredSettings> {
	const all = await apiFetch<Partial<StoredSettings>>({
		path: SETTINGS,
	});

	return {
		spacery_breakpoint_source: all.spacery_breakpoint_source ?? '',
		spacery_custom_breakpoints: Array.isArray(
			all.spacery_custom_breakpoints
		)
			? all.spacery_custom_breakpoints
			: [],
	};
}

/**
 * What each source contains, and which one is in effect.
 *
 * @return The breakpoint information.
 */
export function fetchInfo(): Promise<BreakpointInfo> {
	return apiFetch<BreakpointInfo>({ path: BREAKPOINTS });
}

/**
 * Saves both options and returns what the server actually stored.
 *
 * The return value is the point. The sanitizer refuses an invalid set whole and
 * hands back the previous one, so the only honest way to know a save worked is
 * to read what came back rather than to assume the request implied it.
 *
 * @param settings The values to store.
 * @return The stored values, which may differ from the ones sent.
 */
export async function saveSettings(
	settings: StoredSettings
): Promise<StoredSettings> {
	const all = await apiFetch<Partial<StoredSettings>>({
		path: SETTINGS,
		method: 'POST',
		data: settings,
	});

	return {
		spacery_breakpoint_source: all.spacery_breakpoint_source ?? '',
		spacery_custom_breakpoints: Array.isArray(
			all.spacery_custom_breakpoints
		)
			? all.spacery_custom_breakpoints
			: [],
	};
}

/**
 * Whether the server stored the breakpoints it was sent.
 *
 * Compared by content rather than by order, because the server stores a
 * canonical widest-first ordering and reordering is not a rejection.
 *
 * @param sent   What the screen submitted.
 * @param stored What came back.
 * @return True when every submitted breakpoint survived.
 */
export function wasAccepted(sent: Breakpoint[], stored: Breakpoint[]): boolean {
	if (sent.length !== stored.length) {
		return false;
	}

	return sent.every((row) =>
		stored.some(
			(other) =>
				other.slug === row.slug &&
				other.label === row.label &&
				other.max === row.max
		)
	);
}
