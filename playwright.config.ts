/**
 * Playwright configuration for editor end-to-end tests.
 *
 * These run against a real WordPress via `wp-env`, which needs Docker. They are
 * the only way to prove two things nothing else can: that a saved block
 * survives a reload without a validation error, and that resizing the canvas
 * moves Spacery onto the right tier.
 */

import path from 'node:path';
import process from 'node:process';
import { defineConfig } from '@playwright/test';

/*
 * wp-env exposes two sites: development on 8888 and tests on 8889. End-to-end
 * runs belong on the tests site, which is reset between runs and is what
 * `@wordpress/e2e-test-utils-playwright` defaults to.
 */
const baseURL = process.env.WP_BASE_URL ?? 'http://localhost:8889';

const artifacts =
	process.env.WP_ARTIFACTS_PATH ?? path.join(process.cwd(), 'artifacts');

export default defineConfig({
	testDir: './tests/e2e',
	/*
	 * The locale check needs the site switched to Greek, which would change what
	 * every other spec sees. It runs from playwright-locale.config.ts instead,
	 * after CI has switched the language.
	 */
	testIgnore: '**/locale.spec.ts',
	globalSetup: require.resolve('./tests/e2e/global-setup.ts'),
	timeout: 60_000,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	workers: 1,
	reporter: process.env.CI ? 'github' : 'list',
	outputDir: path.join(artifacts, 'test-results'),
	use: {
		baseURL,
		// Written by global-setup and reused by every context, so each spec
		// starts already authenticated.
		storageState: path.join(artifacts, 'storage-states/admin.json'),
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
		video: 'off',
	},
});
