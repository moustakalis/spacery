/**
 * Vitest configuration.
 *
 * Scoped to `tests/unit` on purpose. Vitest's default glob matches any
 * `*.spec.ts`, which would sweep up the Playwright specs in `tests/e2e` and try
 * to run browser tests in a Node environment. The two runners cover different
 * things and must not collide: Vitest for pure resolution logic, Playwright for
 * anything that needs a real editor.
 */

import { defineConfig } from 'vitest/config';

export default defineConfig( {
	test: {
		include: [ 'tests/unit/**/*.test.ts' ],
		environment: 'node',
	},
} );
