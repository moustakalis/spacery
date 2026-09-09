/**
 * Device icons for the tier selector.
 *
 * Drawn here rather than imported from `@wordpress/icons`, which WordPress does
 * not expose as a script external — consumers bundle it. Four small paths are
 * cheaper than adding a package to the bundle for four glyphs.
 *
 * Chosen by the tier's own width, not by its name. Spacery's tiers are
 * theme-defined and can be called anything, so "tablet" is not a reliable key;
 * `≤782px` is.
 */

import { toPixels } from './toMinWidths';
import type { Breakpoint } from './types';

/**
 * Icon keys in width order, widest first.
 */
type DeviceKey = 'desktop' | 'laptop' | 'tablet' | 'mobile';

/**
 * Where one icon gives way to the next.
 *
 * A tier is drawn with the first icon whose floor it reaches. The boundaries
 * are the conventional ones — 1200 for a desktop monitor, 992 for a laptop,
 * 600 for a tablet — rather than core's own viewport values, because these
 * describe the device the icon depicts.
 */
const FLOORS: Array<[number, DeviceKey]> = [
	[1200, 'desktop'],
	[992, 'laptop'],
	[600, 'tablet'],
	[0, 'mobile'],
];

const PATHS: Record<DeviceKey, React.ReactElement> = {
	desktop: (
		<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
			<path
				fill="currentColor"
				d="M20 4H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h6v2H8v1.5h8V18h-2v-2h6a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1Zm-.5 11h-15V5.5h15V15Z"
			/>
		</svg>
	),
	laptop: (
		<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
			<path
				fill="currentColor"
				d="M18 5H6a1 1 0 0 0-1 1v9H2.5v1.5A1.5 1.5 0 0 0 4 18h16a1.5 1.5 0 0 0 1.5-1.5V15H19V6a1 1 0 0 0-1-1Zm-.5 10h-11V6.5h11V15Z"
			/>
		</svg>
	),
	/*
	 * Landscape, and the phone is not.
	 *
	 * Both were portrait rounded rectangles differing only in width, which at
	 * 24px and side by side is not a difference at all -- and since the
	 * segments carry no text, the glyph is the only thing telling two of the
	 * four choices apart for anyone scanning the row. Orientation is a
	 * difference that survives being small.
	 */
	tablet: (
		<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
			<path
				fill="currentColor"
				d="M19.5 5h-15A1.5 1.5 0 0 0 3 6.5v11A1.5 1.5 0 0 0 4.5 19h15a1.5 1.5 0 0 0 1.5-1.5v-11A1.5 1.5 0 0 0 19.5 5Zm0 12.5h-15v-11h15v11ZM17 10.5h1v3h-1v-3Z"
			/>
		</svg>
	),
	mobile: (
		<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
			<path
				fill="currentColor"
				d="M15.5 3h-7A1.5 1.5 0 0 0 7 4.5v15A1.5 1.5 0 0 0 8.5 21h7a1.5 1.5 0 0 0 1.5-1.5v-15A1.5 1.5 0 0 0 15.5 3Zm0 16.5h-7v-15h7v15ZM10.5 18h3v-1h-3v1Z"
			/>
		</svg>
	),
};

/**
 * Which device a tier's width depicts.
 *
 * @param breakpoint The tier.
 * @return An icon key.
 */
export function deviceFor(breakpoint: Breakpoint): DeviceKey {
	const width = toPixels(breakpoint.max);

	for (const [floor, key] of FLOORS) {
		if (width >= floor) {
			return key;
		}
	}

	return 'mobile';
}

/**
 * The icon for a tier.
 *
 * @param breakpoint The tier.
 * @return An SVG element.
 */
export function iconFor(breakpoint: Breakpoint): React.ReactElement {
	return PATHS[deviceFor(breakpoint)];
}

/**
 * Whether icons can stand in for names in this set.
 *
 * Four glyphs cannot label twelve tiers, and two tiers wearing the same icon is
 * worse than no icon at all — the author cannot tell which one they are
 * editing. When that happens the selector falls back to text, which always
 * distinguishes.
 *
 * @param breakpoints The active set.
 * @return True when every tier gets a different icon.
 */
export function iconsAreDistinct(breakpoints: Breakpoint[]): boolean {
	const keys = breakpoints.map(deviceFor);

	return new Set(keys).size === keys.length;
}
