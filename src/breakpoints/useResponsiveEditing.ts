/**
 * Whether core's responsive editing mode is available.
 */

import { useMemo } from 'react';

import { getSpacerySettings } from './settings';

/**
 * Reads core's `responsiveEditingEnabled` setting, captured server-side.
 *
 * A site can switch core's responsive editing off through the
 * `block_editor_settings_all` filter. When it is off there is no device
 * switcher and no resizable canvas to follow, so Spacery supplies its own tier
 * selector — the one case where a Spacery switcher is right, because there is
 * nothing to compete with.
 *
 * @return Whether responsive editing is enabled.
 */
export function useResponsiveEditing(): boolean {
	return useMemo(() => getSpacerySettings().responsiveEditingEnabled, []);
}
