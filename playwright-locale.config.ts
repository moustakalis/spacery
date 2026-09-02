/**
 * Playwright configuration for the translated-site check.
 *
 * Separate from the main configuration because it needs a site whose language
 * has been switched, which every other spec would then have to cope with. The
 * main configuration ignores `locale.spec.ts`; this one runs nothing else.
 */

import base from './playwright.config';

export default {
	...base,
	testIgnore: undefined,
	testMatch: '**/locale.spec.ts',
};
