/**
 * End-to-end tests for the spacer block.
 *
 * Everything here needs a real editor. The unit suites already cover
 * resolution, generation and validation; these cover the two claims that can
 * only be made about a running WordPress.
 */

import { expect, test } from '@wordpress/e2e-test-utils-playwright';

const BLOCK = 'spacery/spacer';

test.describe('spacery/spacer', () => {
	test.beforeEach(async ({ admin }) => {
		await admin.createNewPost();
	});

	/**
	 * M3's exit criterion, and the one thing v1 could never have passed.
	 *
	 * v1 serialized a `<style>` element into `save()`, so any change to its
	 * output invalidated every existing block. Spacery writes only the base
	 * height to markup and adds the generated class at render time, which is
	 * what makes a reload uneventful.
	 */
	test('survives a save and reload without a validation error', async ({
		editor,
		page,
	}) => {
		await editor.insertBlock({
			name: BLOCK,
			attributes: {
				height: '120px',
				spacery: {
					tablet: { dimensions: { height: '60px' } },
					mobile: { dimensions: { height: '32px' } },
				},
			},
		});

		await editor.saveDraft();
		await page.reload();
		await expect(page.locator('.block-editor-warning')).toBeHidden();

		const [block] = await editor.getBlocks();

		expect(block?.name).toBe(BLOCK);
		expect(block?.attributes.height).toBe('120px');
		expect(block?.attributes.spacery).toEqual({
			tablet: { dimensions: { height: '60px' } },
			mobile: { dimensions: { height: '32px' } },
		});
	});

	/**
	 * M4's exit criterion.
	 *
	 * At a 900px canvas, core's own device label reads Desktop because 900 is
	 * wider than its 782px tablet bound, while Spacery is on Laptop because 900
	 * is within its 1024px bound. Both are right inside their own set, so the
	 * panel has to say which one it means.
	 */
	test('follows the canvas onto a tier core has no device for', async ({
		editor,
		page,
	}) => {
		await editor.insertBlock({
			name: BLOCK,
			attributes: { height: '120px' },
		});

		await page.setViewportSize({ width: 1400, height: 900 });
		await expect(
			page.getByText('Resize the canvas', { exact: false })
		).toBeVisible();

		// Narrow enough that the canvas itself lands inside the laptop band.
		await page.setViewportSize({ width: 900, height: 900 });

		await expect(
			page.getByRole('button', { name: /Laptop · ≤1024px/ })
		).toBeVisible();
	});

	/**
	 * The generated CSS must reach the front end as disjoint bands, matching
	 * what the PHP suite asserts about the same input.
	 */
	test('renders banded CSS on the front end', async ({ editor, page }) => {
		await editor.insertBlock({
			name: BLOCK,
			attributes: {
				height: '120px',
				spacery: { mobile: { dimensions: { height: '32px' } } },
			},
		});

		const postId = await editor.publishPost();

		await page.goto(`/?p=${postId}`);

		const html = await page.content();

		expect(html).toContain('@media (width <= 480px)');
		expect(html).toMatch(/\.spy-[0-9a-f]+\{height:32px !important;\}/);
		expect(html).toMatch(/class="[^"]*spy-[0-9a-f]+/);
	});
});
