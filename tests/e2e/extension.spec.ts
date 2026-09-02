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

/**
 * How `RequestUtils` names Spacery.
 *
 * Not the plugin file path. `activatePlugin`/`deactivatePlugin` build their map
 * from `GET /wp/v2/plugins` keyed by the kebab-cased **Plugin Name header**, so
 * "Spacery" is `spacery`. A path like `spacery/spacery` fails with "isn't
 * installed", which reads like a broken environment rather than a wrong key.
 */
const PLUGIN = 'spacery';

/**
 * Blocks that declare `supports.spacing` and are always registered.
 *
 * Spacery names none of them anywhere in its source — they are here because
 * core declares spacing support on them, which is the whole claim.
 */
const SUPPORTED = ['core/group', 'core/columns', 'core/cover'];

/**
 * The block's own padding, and the value WordPress sets for tablets.
 *
 * Odd on purpose: the front-end assertion counts how many rules in the whole
 * document set this exact declaration, so a value a theme might plausibly use
 * would make a second hit ambiguous.
 */
const BASE = '61px';
const TAKEN = '37px';

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
					spacing: { padding: { top: BASE } },
					'@tablet': { spacing: { padding: { top: TAKEN } } },
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
						tablet: { spacing: { padding: { top: TAKEN } } },
					},
					viewport: null,
					base: BASE,
				})
			);

		const postId = await editor.publishPost();

		expect(postId).not.toBeNull();

		await page.goto(`/?p=${postId}`);

		const html = await page.content();

		// One rule for the property at that width, and it is Spacery's.
		expect(html).toContain('@media (480px < width <= 782px)');
		expect(html).toMatch(
			new RegExp(`\\.spy-[0-9a-f]+\\{padding-top:${TAKEN} !important;\\}`)
		);

		/*
		 * Asserted as the surrounding CSS, not as a count.
		 *
		 * A count that comes back as 2 says only that something else on the page
		 * also sets this value, which is the least useful thing it could say --
		 * whether that is core still emitting its own rule, or Spacery emitting
		 * twice, is the entire question. Showing each site answers it from the
		 * CI log alone. `TAKEN` is deliberately an odd value no theme or core
		 * stylesheet would produce, so a second hit means a real second rule.
		 */
		expect(rulesSetting(html, `padding-top:${TAKEN}`)).toHaveLength(1);
	});
});

/**
 * Every rule in the document containing a declaration, with its selector.
 *
 * @param html        The page HTML.
 * @param declaration The declaration to look for, e.g. `padding-top:37px`.
 * @return One entry per rule, each showing the text around the declaration.
 */
function rulesSetting(html: string, declaration: string): string[] {
	const found: string[] = [];
	let from = 0;

	for (;;) {
		const at = html.indexOf(declaration, from);

		if (at < 0) {
			return found;
		}

		found.push(html.slice(Math.max(0, at - 120), at + declaration.length));
		from = at + declaration.length;
	}
}
