/**
 * Entry point for the settings screen.
 */

import { createRoot } from '@wordpress/element';

import { App } from './App';

const container = document.getElementById('spacery-settings');

if (container) {
	createRoot(container).render(<App />);
}
