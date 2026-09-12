/**
 * Entry point for the settings screen.
 */

import { createRoot } from '@wordpress/element';

import { App } from './App';

/*
 * Emitted by `wp-scripts` as `build/style-settings.css` -- the same convention
 * the spacer block's `style.scss` follows into `build/blocks/spacer/style-index.css`
 * -- and enqueued by `Settings\Screen`.
 */
import './style.scss';

const container = document.getElementById('spacery-settings');

if (container) {
	createRoot(container).render(<App />);
}
