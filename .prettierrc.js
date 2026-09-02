/**
 * Prettier configuration.
 *
 * Without this, `wp-scripts lint-js` runs Prettier with stock defaults, which
 * strip the spacing WordPress's own JavaScript standards use -- so
 * hand-written WordPress-style code was reformatted away on every `--fix`, and
 * then flagged again the next time it was written by hand. The PHP side
 * already follows WordPress standards; this makes the JavaScript side agree.
 */

module.exports = require( '@wordpress/prettier-config' );
