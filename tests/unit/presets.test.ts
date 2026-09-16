/**
 * Naming an inherited spacing preset.
 *
 * The sizes are the ones Twenty Twenty-Five declares, read off a live 7.1
 * editor, so the fixture is a real site's table rather than an invented one.
 */

import { describe, expect, it } from 'vitest';

import {
	presetLabel,
	presetSize,
	type SpacingSize,
} from '../../src/extension/presets';

const SIZES: SpacingSize[] = [
	{ name: 'Tiny', size: '10px', slug: '20' },
	{ name: 'X-Small', size: '20px', slug: '30' },
	{ name: 'Small', size: '30px', slug: '40' },
	{ name: 'Regular', size: 'clamp(30px, 5vw, 50px)', slug: '50' },
	{ name: 'Large', size: 'clamp(30px, 7vw, 70px)', slug: '60' },
];

/**
 * The number comes first. A preset that resolves to a plain length is shown the
 * way every other inherited length is — the name is the fallback for the ones
 * that resolve to a `clamp()`, not the default.
 */
describe('presetSize', () => {
	it('resolves a preset to the size the site defines', () => {
		expect(presetSize('var:preset|spacing|30', SIZES)).toBe('20px');
		expect(presetSize('var:preset|spacing|20', SIZES)).toBe('10px');
	});

	it('resolves to whatever the size is, clamp included', () => {
		expect(presetSize('var:preset|spacing|50', SIZES)).toBe(
			'clamp(30px, 5vw, 50px)'
		);
	});

	it('leaves anything that is not a preset alone', () => {
		expect(presetSize('24px', SIZES)).toBeUndefined();
		expect(presetSize('calc(100% - 2rem)', SIZES)).toBeUndefined();
		expect(presetSize(undefined, SIZES)).toBeUndefined();
		expect(presetSize('', SIZES)).toBeUndefined();
	});

	it('declines a slug the site does not define', () => {
		expect(presetSize('var:preset|spacing|99', SIZES)).toBeUndefined();
		expect(presetSize('var:preset|spacing|30', [])).toBeUndefined();
	});

	it('declines a size entry that carries no size', () => {
		expect(
			presetSize('var:preset|spacing|70', [{ slug: '70' }])
		).toBeUndefined();
	});
});

describe('presetLabel', () => {
	it('names the preset core would name', () => {
		expect(presetLabel('var:preset|spacing|50', SIZES)).toBe('Regular');
		expect(presetLabel('var:preset|spacing|20', SIZES)).toBe('Tiny');
	});

	it('leaves a plain length alone', () => {
		expect(presetLabel('24px', SIZES)).toBeUndefined();
		expect(presetLabel('2rem', SIZES)).toBeUndefined();
	});

	it('leaves a function alone', () => {
		expect(presetLabel('calc(100% - 2rem)', SIZES)).toBeUndefined();
		expect(presetLabel('clamp(1rem, 2vw, 3rem)', SIZES)).toBeUndefined();
	});

	it('has nothing to say about an empty value', () => {
		expect(presetLabel(undefined, SIZES)).toBeUndefined();
		expect(presetLabel('', SIZES)).toBeUndefined();
	});

	/*
	 * Not the slug. A preset the site no longer defines renders as nothing on
	 * the page, so a placeholder reading `99` would name a value that is not
	 * being applied. The caller shows the reference instead, which at least
	 * says where the value came from.
	 */
	it('declines a slug the site does not define', () => {
		expect(presetLabel('var:preset|spacing|99', SIZES)).toBeUndefined();
		expect(presetLabel('var:preset|spacing|50', [])).toBeUndefined();
	});

	it('declines a size that has no name', () => {
		expect(
			presetLabel('var:preset|spacing|70', [{ slug: '70' }])
		).toBeUndefined();
	});
});
