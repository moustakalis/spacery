/**
 * Entry point for the spacing extension bundle.
 *
 * Separate from the spacer block's bundle because it loads on every editor
 * screen and for every block, while the block's bundle only matters where the
 * block is used.
 */

import { register } from './register';

register();
