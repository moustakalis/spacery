/**
 * Reads the site's breakpoints inside the editor.
 */

import { store as blockEditorStore } from '@wordpress/block-editor';
import { useSelect } from '@wordpress/data';

import type { Breakpoint, SpacerySettings } from './types';

/**
 * The active breakpoint set, widest first.
 *
 * Resolved server-side and passed through block editor settings, deliberately
 * not read from `settings.viewport` in JavaScript. Spacery's set is *derived*
 * from core's, so resolving it here as well would mean two implementations of
 * the same rules and eventually two different answers. It also avoids depending
 * on `__experimentalFeatures`.
 *
 * Returns an empty list rather than a default if the setting is missing: a
 * silently wrong set of breakpoints would be worse than visibly absent
 * controls.
 */
export function useBreakpoints(): Breakpoint[] {
	return useSelect<Breakpoint[]>((select) => {
		const store = select(blockEditorStore) as unknown as {
			getSettings: () => { spacery?: SpacerySettings };
		};

		return store.getSettings().spacery?.breakpoints ?? [];
	}, []);
}
