/**
 * Reads what PHP publishes for the settings screen itself.
 *
 * The same shape as `breakpoints/settings.ts` and for the same reason: a global
 * published `before` the handle it belongs to, read through one defensive
 * accessor. This one carries nothing the screen's behaviour depends on — the
 * version it signs itself with and where to send someone for help — so every
 * field falls back to empty and the components that would show it render
 * nothing rather than a placeholder.
 */

export interface ScreenData {
	/** The plugin version, shown in the header tag and repeated in the footer. */
	version: string;
	/** Where the documentation lives. */
	docsUrl: string;
	/** Where to ask for help. */
	supportUrl: string;
}

const FALLBACK: ScreenData = { version: '', docsUrl: '', supportUrl: '' };

/**
 * A string, or an empty one.
 *
 * @param value Anything the global carried.
 * @return The value when it is a string.
 */
function text(value: unknown): string {
	return 'string' === typeof value ? value : '';
}

/**
 * The published screen data, or empty strings.
 *
 * @return What PHP published.
 */
export function getScreenData(): ScreenData {
	const published = (
		window as unknown as { spacerySettingsScreen?: Partial<ScreenData> }
	).spacerySettingsScreen;

	if (!published) {
		return FALLBACK;
	}

	return {
		version: text(published.version),
		docsUrl: text(published.docsUrl),
		supportUrl: text(published.supportUrl),
	};
}
