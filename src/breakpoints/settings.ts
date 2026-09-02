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
	/** The active set, widest first. */
	breakpoints: Breakpoint[];
	/** Whether core's responsive editing mode is available. */
	responsiveEditingEnabled: boolean;
	/**
	 * Core's own `settings.viewport` tiers, widest first.
	 *
	 * Carried separately from `breakpoints` because they are not Spacery's:
	 * they are what the takeover flow reads a core `@tablet` value against, to
	 * tell a tier that merely shares a name from one that shares a boundary.
	 */
	coreViewports: Breakpoint[];
	/** Blocks the site has excluded from the extension. */
	deniedBlocks: string[];
}

const FALLBACK: SpacerySettings = {
	breakpoints: [],
	responsiveEditingEnabled: true,
	coreViewports: [],
	deniedBlocks: [],
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
		coreViewports: Array.isArray(published.coreViewports)
			? published.coreViewports
			: [],
		deniedBlocks: Array.isArray(published.deniedBlocks)
			? published.deniedBlocks
			: [],
	};
}
