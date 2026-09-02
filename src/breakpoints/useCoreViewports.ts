/**
 * Reads WordPress's own `settings.viewport` tiers.
 */

import { useMemo } from 'react';

import { getSpacerySettings } from './settings';
import type { Breakpoint } from './types';

/**
 * Core's viewport tiers, widest first, as the server resolved them.
 *
 * Kept apart from `useBreakpoints()` on purpose. When the site's source is the
 * theme these two are the same list, but under Spacery's own preset or a custom
 * set they are not, and the takeover flow has to be able to tell a tier that
 * shares core's name from one that shares core's boundary.
 *
 * @return Core's viewport tiers.
 */
export function useCoreViewports(): Breakpoint[] {
	// Published once per page load, so it never changes within a session.
	return useMemo(() => getSpacerySettings().coreViewports, []);
}
