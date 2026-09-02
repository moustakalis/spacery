/**
 * Reports which tier the editor canvas is currently showing.
 */

import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import { createResponsiveState } from 'responsive-state';

import { DEFAULT_TIER, toMinWidths } from './toMinWidths';
import type { Breakpoint } from './types';

interface CanvasBreakpoint {
	/** Attach to any element inside the canvas. */
	ref: (node: HTMLElement | null) => void;
	/** Slug of the active tier, or undefined above every tier. */
	slug: string | undefined;
}

/**
 * Tracks the canvas width and maps it to a Spacery tier.
 *
 * The window comes from the block's own DOM node rather than from a store
 * selector. Since WordPress 7.1 the post editor is *always* iframed, so
 * `window.innerWidth` is the browser chrome, not the canvas — measuring it is
 * what made v1's preview wrong, and it stayed wrong because sidebars change the
 * canvas width without changing the window. `node.ownerDocument.defaultView` is
 * whichever document the block actually rendered into, iframe or not.
 *
 * Deliberately not `getCanvasWidth()`, a private store selector, nor
 * `getDeviceType()`, which has three values and cannot express five tiers.
 *
 * @param breakpoints Tiers, widest first.
 */
export function useCanvasBreakpoint(
	breakpoints: Breakpoint[]
): CanvasBreakpoint {
	const [canvas, setCanvas] = useState<Window | null>(null);

	const ref = useCallback((node: HTMLElement | null) => {
		setCanvas(node?.ownerDocument?.defaultView ?? null);
	}, []);

	const store = useMemo(() => {
		if (!canvas || 0 === breakpoints.length) {
			return null;
		}

		return createResponsiveState(toMinWidths(breakpoints), {
			// The canvas, not the browser window.
			window: canvas,
			trackViewport: true,
			ssrBreakpoint: DEFAULT_TIER,
		});
	}, [canvas, breakpoints]);

	const subscribe = useCallback(
		(onChange: () => void) => store?.subscribe(onChange) ?? (() => {}),
		[store]
	);

	const getSnapshot = useCallback(
		() => store?.get().current ?? DEFAULT_TIER,
		[store]
	);

	const current = useSyncExternalStore(
		subscribe,
		getSnapshot,
		() => DEFAULT_TIER
	);

	return {
		ref,
		slug: DEFAULT_TIER === current ? undefined : current,
	};
}
