/**
 * Editing preferences that survive the inspector unmounting.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import {
	boxKey,
	readBoxState,
	rememberLinked,
	rememberUnit,
	resetBoxState,
} from '../../src/extension/boxState';

const PADDING = boxKey('block-1', 'padding');
const MARGIN = boxKey('block-1', 'margin');
const OTHER_BLOCK = boxKey('block-2', 'padding');

describe('boxState', () => {
	beforeEach(() => {
		resetBoxState();
	});

	it('starts linked, with no unit chosen', () => {
		expect(readBoxState(PADDING)).toStrictEqual({ linked: true });
	});

	/**
	 * The bug: both lived in `useState` inside a component the inspector
	 * unmounts on every selection change, so unlinking a box lasted exactly
	 * until the author clicked another block.
	 */
	it('remembers being unlinked', () => {
		rememberLinked(PADDING, false);

		expect(readBoxState(PADDING).linked).toBe(false);
	});

	it('remembers a chosen unit', () => {
		rememberUnit(PADDING, 'rem');

		expect(readBoxState(PADDING).chosen).toBe('rem');
	});

	it('keeps the two independent', () => {
		rememberLinked(PADDING, false);
		rememberUnit(PADDING, 'rem');

		expect(readBoxState(PADDING)).toStrictEqual({
			linked: false,
			chosen: 'rem',
		});
	});

	/**
	 * Padding and margin are separate boxes on one block, and linking one says
	 * nothing about the other.
	 */
	it('does not share between two boxes on the same block', () => {
		rememberLinked(PADDING, false);

		expect(readBoxState(MARGIN).linked).toBe(true);
	});

	it('does not share between blocks', () => {
		rememberUnit(PADDING, 'rem');

		expect(readBoxState(OTHER_BLOCK).chosen).toBeUndefined();
	});
});
