/**
 * Which tier the inspector is editing.
 *
 * The canvas proposes; the author disposes (D17). Core's preview viewport picks
 * the tier when a panel opens and re-picks it whenever the preview moves, so
 * the common path is unchanged. Between those moves the author can select any
 * tier, including the ones core has no device preset for, without the canvas
 * following along.
 */

import { useEffect, useState } from 'react';

import type { Breakpoint } from './types';

export interface SelectedTier {
	/** The tier being edited, or undefined when there are no tiers at all. */
	tier: Breakpoint | undefined;
	/** Select a tier by slug. */
	select: (slug: string) => void;
}

/**
 * Resolves the tier to edit from the canvas and the author's last choice.
 *
 * Falls back to the widest tier rather than to nothing. Above every band the
 * canvas reports no tier, and a panel that answered "resize the canvas" was a
 * dead end: the author wanted to set a value and the UI sent them elsewhere
 * first.
 *
 * @param breakpoints The active set, widest first.
 * @param canvasSlug  The tier the canvas is previewing, if any.
 * @return The selected tier and a setter.
 */
export function useSelectedTier(
	breakpoints: Breakpoint[],
	canvasSlug: string | undefined
): SelectedTier {
	const [picked, setPicked] = useState<string | undefined>(undefined);

	useEffect(() => {
		if (canvasSlug) {
			setPicked(canvasSlug);
		}
	}, [canvasSlug]);

	const wanted = picked ?? canvasSlug;

	return {
		tier: breakpoints.find((b) => b.slug === wanted) ?? breakpoints[0],
		select: setPicked,
	};
}
