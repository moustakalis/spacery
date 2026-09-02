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
	 * The claim is that the inspector always names the tier matching the
	 * CANVAS width, not the browser width. An earlier version of this test set
	 * the browser viewport to 900px and expected "Laptop" -- which was wrong,
	 * because the open inspector sidebar takes roughly 280px, so the canvas
	 * would actually have been around 620px and sat in the Tablet band. That
	 * bug is exactly the class of mistake the feature exists to prevent, so the
	 * test measures the canvas rather than assuming it.
	 */
	test('names the tier matching the canvas, not the browser', async ({
		editor,
		page,
	}) => {
		await editor.insertBlock({
			name: BLOCK,
			attributes: { height: '120px' },
		});

		for (const width of [1600, 1100, 900, 700]) {
			await page.setViewportSize({ width, height: 900 });

			// The canvas is the editor iframe, whatever the chrome around it.
			const canvasWidth = await page
				.locator('iframe[name="editor-canvas"]')
				.evaluate((frame) => frame.getBoundingClientRect().width);

			const expected = tierFor(canvasWidth);

			if (undefined === expected) {
				await expect(
					page.getByText('Resize the canvas', { exact: false })
				).toBeVisible();
			} else {
				await expect(
					page.getByRole('button', {
						name: new RegExp(`${expected} · ≤`),
					})
				).toBeVisible();
			}
		}
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

		expect(postId).not.toBeNull();

		await page.goto(`/?p=${postId}`);

		const html = await page.content();

		expect(html).toContain('@media (width <= 480px)');
		expect(html).toMatch(/\.spy-[0-9a-f]+\{height:32px !important;\}/);
		expect(html).toMatch(/class="[^"]*spy-[0-9a-f]+/);
	});
});

/**
 * Spacery's built-in preset, as the server resolves it. Upper bounds, so the
 * first tier a width fits inside is the one that applies.
 *
 * @param width The measured canvas width in pixels.
 * @return The tier label that should be showing, or undefined above every tier.
 */
function tierFor(width: number): string | undefined {
	if (width <= 480) {
		return 'Mobile';
	}
	if (width <= 782) {
		return 'Tablet';
	}
	if (width <= 1024) {
		return 'Laptop';
	}
	if (width <= 1280) {
		return 'Desktop';
	}

	return undefined;
}
