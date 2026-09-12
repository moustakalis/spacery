/**
 * Logs in once and persists the session for every spec.
 *
 * `@wordpress/e2e-test-utils-playwright` does not authenticate on its own:
 * `admin.createNewPost()` assumes an existing session and throws "Not logged
 * in" without one. This runs before the suite, signs in through the REST API
 * and writes a storage state that Playwright loads into every browser context.
 *
 * **Running somewhere other than `wp-env`.** `WP_BASE_URL` chooses the site
 * (see `playwright.config.ts`) and `WP_USERNAME` / `WP_PASSWORD` choose the
 * account, which together are enough to point the whole suite at the MAMP
 * playground `docs/MANUAL-TESTING.md` describes:
 *
 * ```bash
 * WP_BASE_URL=http://localhost:8888 WP_USERNAME=admin WP_PASSWORD=… pnpm run test:e2e
 * ```
 *
 * Worth knowing before doing that, because none of it matters on a site
 * `wp-env` resets between runs: the suite leaves draft posts behind, overwrites
 * Spacery's two options, and `extension.spec.ts` deactivates and reactivates
 * the plugin — which a failure in the wrong place leaves deactivated. It
 * deletes no content.
 */

import type { FullConfig } from '@playwright/test';
import { RequestUtils } from '@wordpress/e2e-test-utils-playwright';

/**
 * Reads the account to sign in as, or nothing for the package's own default.
 *
 * Both or neither: a half-set pair would otherwise fall back to `wp-env`'s
 * `admin` / `password` and fail sixty seconds later as "Failed to setup REST
 * API", which says nothing about the typo that caused it.
 *
 * @return The credentials, or undefined to use the default.
 */
function credentials(): { username: string; password: string } | undefined {
	const username = process.env.WP_USERNAME;
	const password = process.env.WP_PASSWORD;

	if (username && password) {
		return { username, password };
	}

	if (username || password) {
		throw new Error(
			"Set both WP_USERNAME and WP_PASSWORD, or neither. One alone falls back to wp-env's own account, which is not what you meant."
		);
	}

	return undefined;
}

export default async function globalSetup(config: FullConfig) {
	const { storageState, baseURL } = config.projects[0]!.use;

	/*
	 * Built key by key rather than passed with undefined values: RequestUtils
	 * declares these as optional-absent, not optional-undefined, and this
	 * project has `exactOptionalPropertyTypes` on.
	 */
	const options: {
		storageStatePath?: string;
		baseURL?: string;
		user?: { username: string; password: string };
	} = {};

	if (typeof storageState === 'string') {
		options.storageStatePath = storageState;
	}

	if (baseURL) {
		options.baseURL = baseURL;
	}

	const user = credentials();

	if (user) {
		options.user = user;
	}

	const requestUtils = await RequestUtils.setup(options);

	/*
	 * Signs in, waits for the REST API to answer, and writes the storage state
	 * the specs reuse. It resets nothing -- an earlier comment here claimed it
	 * cleaned up leftover posts, which it has never done; each spec that needs
	 * a clean slate makes its own.
	 */
	await requestUtils.setupRest();
}
