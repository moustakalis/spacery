/**
 * Logs in once and persists the session for every spec.
 *
 * `@wordpress/e2e-test-utils-playwright` does not authenticate on its own:
 * `admin.createNewPost()` assumes an existing session and throws "Not logged
 * in" without one. This runs before the suite, signs in through the REST API
 * and writes a storage state that Playwright loads into every browser context.
 */

import type { FullConfig } from '@playwright/test';
import { RequestUtils } from '@wordpress/e2e-test-utils-playwright';

export default async function globalSetup(config: FullConfig) {
	const { storageState, baseURL } = config.projects[0]!.use;

	/*
	 * Built key by key rather than passed with undefined values: RequestUtils
	 * declares these as optional-absent, not optional-undefined, and this
	 * project has `exactOptionalPropertyTypes` on.
	 */
	const options: { storageStatePath?: string; baseURL?: string } = {};

	if (typeof storageState === 'string') {
		options.storageStatePath = storageState;
	}

	if (baseURL) {
		options.baseURL = baseURL;
	}

	const requestUtils = await RequestUtils.setup(options);

	// A clean starting point: leftover posts from a previous run would make
	// "the block I just inserted" ambiguous.
	await requestUtils.setupRest();
}
