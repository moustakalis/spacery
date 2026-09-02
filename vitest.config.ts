/**
 * Vitest configuration.
 *
 * Scoped to `tests/unit` on purpose. Vitest's default glob matches any
 * `*.spec.ts`, which would sweep up the Playwright specs in `tests/e2e` and try
 * to run browser tests in a Node environment. The two runners cover different
 * things and must not collide: Vitest for pure resolution logic, Playwright for
 * anything that needs a real editor.
 */

import { resolve } from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
	resolve: {
		alias: {
			/*
			 * `@wordpress/*` packages are webpack externals backed by
			 * `window.wp.*`, so they are not in node_modules and Node cannot
			 * resolve them. Only the ones the tested modules actually reach
			 * are stubbed: an alias for a package no test touches would be a
			 * quiet invitation to test against a fake instead of the real API.
			 */
			'@wordpress/i18n': resolve(
				process.cwd(),
				'tests/unit/stubs/i18n.ts'
			),
		},
	},
	test: {
		include: ['tests/unit/**/*.test.ts'],
		// jsdom, because the settings global lives on `window`.
		environment: 'jsdom',
	},
});
