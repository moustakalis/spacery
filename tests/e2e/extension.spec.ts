/**
 * End-to-end tests for the spacing extension.
 *
 * M5's claims are all about blocks Spacery does not own, so they can only be
 * made against a real editor with core's own blocks registered: that the panel
 * reaches them, that Spacery's attribute never touches their saved markup, and
 * that a value WordPress already sets responsively can be moved across without
 * leaving two rules behind.
 */

import { expect, test } from '@wordpress/e2e-test-utils-playwright';

/** Panel title, and the accessible name of the button that expands it. */
const PANEL = 'Responsive spacing';

/** How the REST plugins controller names Spacery. */
const PLUGIN = 'spacery/spacery';

/**
 * Blocks that declare `supports.spacing` and are always registered.
 *
 * Spacery names none of them anywhere in its source — they are here because
 * core declares spacing support on them, which is the whole claim.
 */
const SUPPORTED = ['core/group', 'core/columns', 'core/cover'];

test.describe('spacing extension', () => {
	test.beforeEach(async ({ admin, page }) => {
		/*
		 * Wide enough that WordPress keeps the settings sidebar open. Below
		 * Gutenberg's `medium` breakpoint (782px) it auto-dismisses the sidebar,
		 * and there is then no inspector for any of these tests to look at.
		 */
		await page.setViewportSize({ width: 1600, height: 900 });
		await admin.createNewPost();
	});

	for (const name of SUPPORTED) {
		test(`adds the panel to ${name}`, async ({ editor, page }) => {
			await editor.insertBlock({ name });
			await editor.openDocumentSettingsSidebar();

			await expect(
				page.getByRole('button', { name: PANEL })
			).toBeVisible();
		});
	}

	/**
	 * The other half of the same claim: block supports are the gate, so a block
	 * that declares no spacing support gets nothing. Without this, "the panel is
	 * everywhere" would pass just as well as "the panel is where it belongs".
	 */
	test('leaves a block without spacing support alone', async ({
		editor,
		page,
	}) => {
		await editor.insertBlock({ name: 'core/html' });
		await editor.openDocumentSettingsSidebar();

		await expect(page.getByRole('button', { name: PANEL })).toBeHidden();
	});

	/**
	 * M5's exit criterion, asserted the only way that actually proves it.
	 *
	 * Spacery adds an attribute to blocks it does not own. If that attribute
	 * reached the saved markup, every post using it would break the moment the
	 * plugin was switched off — the failure mode v1 shipped with. The attribute
	 * lives in the block comment delimiter instead, where an unknown key is
	 * simply ignored, so this test switches Spacery off for real and reloads.
	 */
	test('leaves posts valid when Spacery is deactivated', async ({
		editor,
		page,
		requestUtils,
	}) => {
		await editor.insertBlock({
			name: 'core/group',
			attributes: {
				spacery: {
					tablet: { spacing: { padding: { top: '2rem' } } },
				},
			},
		});

		await editor.saveDraft();

		const saved = await editor.getEditedPostContent();

		// Nothing Spacery does reaches the markup; only the delimiter carries it.
		expect(saved).toContain('"spacery"');
		expect(saved).not.toContain('spy-');
		expect(saved).not.toContain('<style');

		/*
		 * The REST plugins controller identifies a plugin by its file path
		 * without the extension, so `spacery/spacery` and not `spacery`.
		 */
		await requestUtils.deactivatePlugin(PLUGIN);

		try {
			await page.reload();

			await expect(page.locator('.block-editor-warning')).toBeHidden();

			const [block] = await editor.getBlocks();

			expect(block?.name).toBe('core/group');
		} finally {
			// Leave the site as it was found, whatever the assertions did.
			await requestUtils.activatePlugin(PLUGIN);
		}
	});

	/**
	 * Decision D11's flow, end to end.
	 *
	 * A block carrying a core `@tablet` padding has two systems with an opinion
	 * about the same property. Spacery does not rewrite core's attribute on its
	 * own — that would be a plugin editing data it does not own — but it offers
	 * to, and once the author accepts, exactly one rule is left for that
	 * property at that width.
	 */
	test('takes over a value WordPress already sets responsively', async ({
		editor,
		page,
	}) => {
		await editor.insertBlock({
			name: 'core/group',
			attributes: {
				style: {
					spacing: { padding: { top: '4rem' } },
					'@tablet': { spacing: { padding: { top: '2rem' } } },
				},
			},
		});

		await editor.openDocumentSettingsSidebar();
		await page.getByRole('button', { name: PANEL }).click();

		await page
			.getByRole('button', { name: 'Manage these in Spacery' })
			.click();

		await expect
			.poll(async () => {
				const [block] = await editor.getBlocks();

				/*
				 * `getBlocks()` types attributes as an empty object, so the
				 * shape has to be stated here. Narrowed to exactly the three
				 * things this test is about, rather than cast to `any`.
				 */
				const attributes = (block?.attributes ?? {}) as {
					spacery?: unknown;
					style?: {
						'@tablet'?: unknown;
						spacing?: { padding?: { top?: string } };
					};
				};

				return JSON.stringify({
					spacery: attributes.spacery ?? null,
					viewport: attributes.style?.['@tablet'] ?? null,
					base: attributes.style?.spacing?.padding?.top ?? null,
				});
			})
			.toBe(
				JSON.stringify({
					spacery: {
						tablet: { spacing: { padding: { top: '2rem' } } },
					},
					viewport: null,
					base: '4rem',
				})
			);

		const postId = await editor.publishPost();

		expect(postId).not.toBeNull();

		await page.goto(`/?p=${postId}`);

		const html = await page.content();

		// One rule for the property at that width, and it is Spacery's.
		expect(html).toContain('@media (480px < width <= 782px)');
		expect(html).toMatch(/\.spy-[0-9a-f]+\{padding-top:2rem !important;\}/);
		expect(occurrences(html, 'padding-top:2rem')).toBe(1);
	});
});

/**
 * How many times a literal string appears.
 *
 * @param haystack The text to search.
 * @param needle   The literal to count.
 * @return The number of non-overlapping occurrences.
 */
function occurrences(haystack: string, needle: string): number {
	return haystack.split(needle).length - 1;
}
