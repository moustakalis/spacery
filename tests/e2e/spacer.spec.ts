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

			/*
			 * Measured INSIDE the canvas, because that is what the code
			 * measures. An iframe element's bounding box includes the vertical
			 * scrollbar; matchMedia inside it does not, and the two differ by
			 * roughly 15px. Near a boundary that is a whole band: at a 1100px
			 * browser the outer box reads ~1030 (Desktop) while the viewport
			 * reads ~1015 (Laptop). Comparing the panel against the outer box
			 * repeats, one level down, the browser-versus-canvas confusion this
			 * very test exists to catch.
			 *
			 * Polled rather than measured once: the resize, the ResizeObserver
			 * and the React update all settle asynchronously, and re-reading the
			 * width each attempt keeps the expectation matched to reality
			 * instead of to a stale measurement.
			 */
			await expect
				.poll(
					async () => {
						const canvas =
							page.frame({ name: 'editor-canvas' }) ??
							page.mainFrame();

						const canvasWidth = await canvas.evaluate(
							() => window.innerWidth
						);

						const tier = tierFor(canvasWidth);

						return page
							.getByText(
								tier ? `${tier} · ≤` : 'Resize the canvas',
								{
									exact: false,
								}
							)
							.isVisible();
					},
					{ timeout: 10_000 }
				)
				.toBe(true);
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
