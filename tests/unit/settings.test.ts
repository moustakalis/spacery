import { afterEach, describe, expect, it } from 'vitest';

import { getSpacerySettings } from '../../src/breakpoints/settings';

const publish = (value: unknown) => {
	(window as unknown as Record<string, unknown>).spacerySettings = value;
};

afterEach(() => {
	delete (window as unknown as Record<string, unknown>).spacerySettings;
});

describe('getSpacerySettings', () => {
	/**
	 * The regression guard for the bug that cost three CI runs.
	 *
	 * Settings used to be read from the block editor store, where a custom key
	 * is silently dropped by Gutenberg's BLOCK_EDITOR_SETTINGS allow-list. The
	 * editor then behaved as though the site had no breakpoints, with nothing
	 * to indicate why. Reading a published global cannot fail that way.
	 */
	it('reads the global PHP publishes', () => {
		publish({
			breakpoints: [{ slug: 'mobile', label: 'Mobile', max: '480px' }],
			responsiveEditingEnabled: true,
		});

		expect(getSpacerySettings().breakpoints).toEqual([
			{ slug: 'mobile', label: 'Mobile', max: '480px' },
		]);
	});

	it('reports no breakpoints when the global is absent', () => {
		expect(getSpacerySettings().breakpoints).toEqual([]);
	});

	it('invents nothing from a malformed payload', () => {
		publish({ breakpoints: 'not an array' });

		expect(getSpacerySettings().breakpoints).toEqual([]);
	});

	it('defaults responsive editing to on', () => {
		publish({ breakpoints: [] });

		expect(getSpacerySettings().responsiveEditingEnabled).toBe(true);
	});

	it('honours responsive editing being switched off', () => {
		publish({ breakpoints: [], responsiveEditingEnabled: false });

		expect(getSpacerySettings().responsiveEditingEnabled).toBe(false);
	});
});
