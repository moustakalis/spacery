/**
 * Reads the settings PHP publishes for the editor.
 *
 * Deliberately a global rather than block editor settings. `@wordpress/editor`
 * copies only an allow-list of keys (`BLOCK_EDITOR_SETTINGS`) from the editor
 * settings into the `core/block-editor` store, so a custom key added through
 * `block_editor_settings_all` never arrives — `getSettings().spacery` is always
 * undefined, with no error to say why. The editor simply behaves as though the
 * site has no breakpoints.
 */

import type { Breakpoint } from './types';

export interface SpacerySettings {
	breakpoints: Breakpoint[];
	responsiveEditingEnabled: boolean;
}

const FALLBACK: SpacerySettings = {
	breakpoints: [],
	responsiveEditingEnabled: true,
};

/**
 * The settings PHP published, or a safe fallback.
 *
 * Returns no breakpoints rather than invented ones if the global is missing:
 * a silently wrong set would be worse than visibly absent controls.
 *
 * @return The published settings.
 */
export function getSpacerySettings(): SpacerySettings {
	const published = (
		window as unknown as { spacerySettings?: Partial<SpacerySettings> }
	).spacerySettings;

	if (!published) {
		return FALLBACK;
	}

	return {
		breakpoints: Array.isArray(published.breakpoints)
			? published.breakpoints
			: [],
		responsiveEditingEnabled: false !== published.responsiveEditingEnabled,
	};
}
