/**
 * Playwright configuration for editor end-to-end tests.
 *
 * These run against a real WordPress via `wp-env`, which needs Docker. They are
 * the only way to prove two things nothing else can: that a saved block
 * survives a reload without a validation error, and that resizing the canvas
 * actually moves Spacery onto the right tier.
 */

import { defineConfig } from '@playwright/test';

const port = process.env.WP_ENV_PORT ?? '8888';

export default defineConfig({
	testDir: './tests/e2e',
	timeout: 60_000,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	workers: 1,
	reporter: process.env.CI ? 'github' : 'list',
	use: {
		baseURL: `http://localhost:${port}`,
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
	},
});
