/**
 * ESLint configuration.
 *
 * Extends the default `@wordpress/scripts` flat config rather than replacing
 * it, so Spacery keeps every rule WordPress recommends and only states the two
 * places it deliberately differs.
 *
 * CommonJS, matching `@wordpress/scripts`'s own `eslint.config.cjs`:
 * `@wordpress/eslint-plugin` publishes no ESM entry point, so an `import` of it
 * fails to resolve.
 */

const wpPlugin = require('@wordpress/eslint-plugin');

module.exports = [
	{
		ignores: ['**/build/**', '**/node_modules/**', '**/vendor/**'],
	},

	...wpPlugin.configs.recommended,

	{
		files: ['**/*.{ts,tsx}'],
		rules: {
			/*
			 * The `@wordpress/*` packages are not installed. `wp-scripts` maps
			 * them to webpack externals backed by `window.wp.*`, so they are
			 * provided by WordPress at runtime and correctly absent from
			 * package.json. Types come from src/types/wordpress.d.ts.
			 */
			'import/no-extraneous-dependencies': 'off',

			/*
			 * `UnitControl` is the only control in @wordpress/components that
			 * edits a number and a CSS unit together, and a height field without
			 * units would be a worse control. It has been exported as
			 * `__experimentalUnitControl` since 2019 and is still experimental in
			 * v40, with no promoted replacement -- core's own Spacer block uses
			 * it. Naming exactly these two, rather than switching the rule off,
			 * keeps the warning working for everything else.
			 */
			'@wordpress/no-unsafe-wp-apis': [
				'error',
				{
					'@wordpress/components': [
						'__experimentalUnitControl',
						'__experimentalText',
						'__experimentalHeading',
					],
				},
			],
		},
	},
];
