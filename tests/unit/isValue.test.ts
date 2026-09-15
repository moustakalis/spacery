/**
 * The TypeScript allowlist, against the PHP suite's own table.
 *
 * **Both lists are transcribed from `tests/php/GeneratorTest.php`, verbatim and
 * in its order.** That is the whole point: `isValue()` exists because the
 * editor must drop exactly what the front end drops, and the only way to know
 * it does is to run the same cases. A case added to `accepted_values()` or
 * `refused_values()` has to be added here, and the comment in both files says
 * so.
 */

import { describe, expect, it } from 'vitest';

import { isValue } from '../../src/extension/isValue';

/** `GeneratorTest::accepted_values()`. */
const ACCEPTED = [
	'0',
	'10px',
	'1.5rem',
	'-3px',
	'100%',
	'1vw',
	'.5rem',
	'calc(100% - 2rem)',
	'clamp(1rem, 2vw, 3rem)',
	'min(10px,2vw)',
	'max(1rem, 5%)',
	'calc((1px + 2px) * 2)',
	'var(--wp--preset--spacing--50)',
	'var:preset|spacing|40',
	'auto',
	'inherit',
	'unset',
];

/** `GeneratorTest::refused_values()`. */
const REFUSED = [
	'10px;color:red',
	';color:red',
	'10px} body{display:none',
	'url(https://example.com/x.png)',
	'expression(alert(1))',
	'calc(url(x))',
	'attr(style)',
	'10px !important',
	'10px/*x*/',
	'@import url(x)',
	'<script>',
	'red',
	'10px;',
];

describe('isValue', () => {
	it.each(ACCEPTED)('accepts %s', (value) => {
		expect(isValue(value)).toBe(true);
	});

	it.each(REFUSED)('refuses %s', (value) => {
		expect(isValue(value)).toBe(false);
	});

	/** Empty and whitespace are not values, and are not in the PHP table. */
	it('refuses nothing at all', () => {
		expect(isValue('')).toBe(false);
		expect(isValue('   ')).toBe(false);
	});

	/**
	 * The keyword list is matched case-insensitively on both sides, and the
	 * value is trimmed before anything else looks at it.
	 */
	it('trims and lowercases the way PHP does', () => {
		expect(isValue('  AUTO  ')).toBe(true);
		expect(isValue(' CALC(100% - 2rem) ')).toBe(true);
	});

	/**
	 * Guards the bug the nested check exists for. Checking only the outermost
	 * name let this through once.
	 */
	it('looks at every function name, not just the first', () => {
		expect(isValue('calc(min(1px, url(x)))')).toBe(false);
		expect(isValue('calc(min(1px, max(2px, 3px)))')).toBe(true);
	});
});
