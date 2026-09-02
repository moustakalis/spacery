/**
 * Whether core's responsive editing mode is available.
 */

import { store as blockEditorStore } from '@wordpress/block-editor';
import { useSelect } from '@wordpress/data';

/**
 * Reads the `responsiveEditingEnabled` editor setting.
 *
 * A site can switch core's responsive editing off entirely via the
 * `block_editor_settings_all` filter. When it is off there is no device
 * switcher and no resizable canvas to follow, so Spacery supplies its own tier
 * selector — the one case where a Spacery switcher is right, because there is
 * nothing to compete with.
 *
 * Defaults to true when the setting is absent, matching core.
 */
export function useResponsiveEditing(): boolean {
	return useSelect<boolean>((select) => {
		const store = select(blockEditorStore) as unknown as {
			getSettings: () => { responsiveEditingEnabled?: boolean };
		};

		return false !== store.getSettings().responsiveEditingEnabled;
	}, []);
}
