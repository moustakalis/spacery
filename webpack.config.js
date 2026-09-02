/**
 * Webpack configuration.
 *
 * Extends `@wordpress/scripts`'s default rather than replacing it, for one
 * reason: the spacing extension is not a block, and the default entry-point
 * discovery cannot see it.
 *
 * `getWebpackEntryPoints()` scans `src` for `block.json` files first and
 * **returns early** if it finds any. Only when there are none does it fall back
 * to `src/index.*`. Spacery has a block, so that fallback never runs and the
 * two non-block bundles -- the editor extension and the settings screen -- have
 * to be named here. The block entries still come from the default config, so
 * adding a block continues to need no change to this file.
 *
 * @see node_modules/@wordpress/scripts/utils/config.js
 */

const defaultConfig = require('@wordpress/scripts/config/webpack.config');

/**
 * Adds Spacery's non-block entry points to a wp-scripts config.
 *
 * @param {Object} config A wp-scripts webpack configuration.
 * @return {Object} The configuration with those entries added.
 */
const withExtension = (config) => ({
	...config,
	entry: {
		// A function on the default config: block discovery runs lazily.
		...('function' === typeof config.entry ? config.entry() : config.entry),
		extension: './src/extension/index.ts',
		settings: './src/settings/index.tsx',
	},
});

/*
 * wp-scripts exports a single config normally and an array of two — script and
 * module — when experimental module builds are on. Handling both means the
 * build does not break the day Spacery, or a future wp-scripts default, turns
 * that flag on. Only the script config gets the entry: the extension is a
 * classic script, not an ES module.
 */
module.exports = Array.isArray(defaultConfig)
	? [withExtension(defaultConfig[0]), ...defaultConfig.slice(1)]
	: withExtension(defaultConfig);
