/**
 * Reads the site's breakpoints inside the editor.
 */

import { useMemo } from 'react';

import { getSpacerySettings } from './settings';
import type { Breakpoint } from './types';

/**
 * The active breakpoint set, widest first.
 *
 * Resolved server-side and handed over finished, deliberately not derived from
 * `settings.viewport` in JavaScript. Spacery's set is derived from core's, so
 * resolving it here as well would mean two implementations of the same rules
 * and eventually two different answers.
 *
 * @return The active breakpoints.
 */
export function useBreakpoints(): Breakpoint[] {
	// Published once per page load, so it never changes within a session.
	return useMemo(() => getSpacerySettings().breakpoints, []);
}
