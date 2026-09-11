import { afterEach, describe, expect, it } from 'vitest';

import { getScreenData } from '../../src/settings/screen';

const publish = (value: unknown) => {
	(window as unknown as Record<string, unknown>).spacerySettingsScreen =
		value;
};

afterEach(() => {
	delete (window as unknown as Record<string, unknown>).spacerySettingsScreen;
});

describe('getScreenData', () => {
	it('reads what PHP published', () => {
		publish({
			version: '1.0.0',
			docsUrl: 'https://example.com/docs',
			supportUrl: 'https://example.com/support',
		});

		expect(getScreenData()).toEqual({
			version: '1.0.0',
			docsUrl: 'https://example.com/docs',
			supportUrl: 'https://example.com/support',
		});
	});

	/**
	 * The footer and the version tag render nothing at all on empty strings,
	 * so an absent global costs the author a signature rather than a broken
	 * link or a bordered box with nothing in it.
	 */
	it('is empty when the global is absent', () => {
		expect(getScreenData()).toEqual({
			version: '',
			docsUrl: '',
			supportUrl: '',
		});
	});

	it('invents nothing from a malformed payload', () => {
		publish({ version: 12, docsUrl: null });

		expect(getScreenData()).toEqual({
			version: '',
			docsUrl: '',
			supportUrl: '',
		});
	});
});
