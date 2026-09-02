/**
 * End-to-end tests for the spacer block.
 *
 * Everything here needs a real editor. The unit suites already cover
 * resolution, generation and validation; these cover the two claims that can
 * only be made about a running WordPress.
 */

import type { Page } from '@playwright/test';
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

		// The panel only exists inside InspectorControls, so an assertion about
		// it says nothing unless the sidebar is definitely open.
		await editor.openDocumentSettingsSidebar();

		for (const browserWidth of [1600, 1100, 900, 700]) {
			await page.setViewportSize({ width: browserWidth, height: 900 });

			/*
			 * Asserted as a STRING, not an object.
			 *
			 * A previous version returned an object and asserted
			 * toMatchObject({ matches: true }). That prints only the keys being
			 * matched, so every diagnostic field was discarded and the failure
			 * read "matches: false" -- an instrument that threw away its own
			 * reading. Playwright prints a received string in full, so the
			 * failure message now carries everything needed to tell apart:
			 * settings never arriving (tiers=0), the canvas ref never firing
			 * (shown=none while tiers>0), and a genuine tier disagreement.
			 */
			await expect
				.poll(async () => await describeState(page, browserWidth), {
					timeout: 10_000,
				})
				.toMatch(/ verdict=match$/);
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

/**
 * The canvas viewport width, measured the way the code measures it.
 *
 * Uses the same selector that is known to resolve, then evaluates inside the
 * frame. `page.frame({ name })` was tried first and is not used: if it fails to
 * match it returns null, and falling back to the main frame silently measures
 * the BROWSER width -- reintroducing the exact bug this test exists to catch,
 * with no visible error.
 *
 * @param page The Playwright page.
 * @return The canvas viewport width in pixels.
 */
async function measureCanvas(page: Page): Promise<number> {
	const canvas = page.frameLocator('iframe[name="editor-canvas"]');

	return canvas.locator('body').evaluate(() => window.innerWidth);
}

/**
 * The tier the inspector is currently showing.
 *
 * Returns 'none' for the default range, and 'missing' when neither the hint nor
 * a tier panel is present -- which distinguishes "Spacery picked the wrong
 * tier" from "the panel is not rendered at all".
 *
 * @param page The Playwright page.
 * @return The tier label, 'none', or 'missing'.
 */
async function shownTier(page: Page): Promise<string> {
	const hint = page.getByText('Resize the canvas', { exact: false });

	if (await hint.isVisible().catch(() => false)) {
		return 'none';
	}

	const panel = page.getByRole('button', { name: /· ≤/ });

	if (0 === (await panel.count())) {
		return 'missing';
	}

	const label = (await panel.first().textContent()) ?? '';

	return label.split('·')[0]?.trim() ?? 'unreadable';
}

/**
 * A one-line report of everything that decides this assertion.
 *
 * @param page         The Playwright page.
 * @param browserWidth The viewport width just set.
 * @return A description ending in `verdict=match` when the panel agrees.
 */
async function describeState(
	page: Page,
	browserWidth: number
): Promise<string> {
	const tiers = await page.evaluate(
		() =>
			(
				window as unknown as {
					spacerySettings?: { breakpoints?: unknown[] };
				}
			).spacerySettings?.breakpoints?.length ?? -1
	);

	const canvasWidth = Math.round(await measureCanvas(page));
	const expected = tierFor(canvasWidth) ?? 'none';
	const shown = await shownTier(page);

	return [
		`browser=${browserWidth}`,
		`canvas=${canvasWidth}`,
		`tiers=${tiers}`,
		`expected=${expected}`,
		`shown=${shown}`,
		`verdict=${expected === shown ? 'match' : 'differ'}`,
	].join(' ');
}
