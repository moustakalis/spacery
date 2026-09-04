/**
 * End-to-end tests for the spacing extension.
 *
 * M5's claims are all about blocks Spacery does not own, so they can only be
 * made against a real editor with core's own blocks registered: that the panel
 * reaches them, that Spacery's attribute never touches their saved markup, and
 * that a value WordPress already sets responsively can be moved across without
 * leaving a competing rule behind.
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
 *
 * `core/heading` earns its place: it is a text block rather than a container,
 * so it is the one that catches a panel which only works inside layout blocks.
 */
const SUPPORTED = ['core/group', 'core/columns', 'core/cover', 'core/heading'];

/**
 * The block's own padding, and the value WordPress sets for tablets.
 *
 * Odd on purpose: the front-end assertion looks for every style block in the
 * document setting this exact declaration, and a value a theme might plausibly
 * use would make a stray match ambiguous.
 */
const BASE = '61px';
const TAKEN = '37px';

/**
 * The `id` of the stylesheet core prints for Spacery's Style Engine store.
 *
 * Core builds it as `wp-style-engine-{store}` and WordPress appends
 * `-inline-css`, so this follows from `Collector::CONTEXT` being `spacery`.
 * Spacery never prints this tag itself — that is decision D14.
 */
const SPACERY_STYLESHEET = 'wp-style-engine-spacery-inline-css';

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

			const heading = page.getByRole('button', { name: PANEL });

			await expect(heading).toBeVisible();

			/*
			 * Expanded, and asserted on what is inside it.
			 *
			 * A visible panel heading only proves the fill was registered. The
			 * body is where the editor components live, and one of those
			 * resolving to `undefined` — an experimental export imported under a
			 * stable name it does not have — takes the whole editor down with
			 * React error #130 rather than rendering an empty panel. That
			 * shipped once. The tier line and the two boxes are the smallest
			 * assertion that the body actually rendered.
			 */
			await heading.click();

			const panel = page
				.locator('.components-panel__body')
				.filter({ has: heading });

			await expect(panel.getByText(/·\s*≤/)).toBeVisible();
			await expect(panel.getByRole('radio').first()).toBeVisible();
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
		const setting = styleSheets(html).filter((sheet) =>
			sheet.css.includes(`padding-top:${TAKEN}`)
		);

		/*
		 * Nothing but Spacery sets it. This is the takeover claim: core's own
		 * `@tablet` rule is gone from the page, not merely overridden.
		 */
		expect(setting.map((sheet) => sheet.id)).toEqual([SPACERY_STYLESHEET]);

		/*
		 * Two bands, not one, and that is the point rather than a leak.
		 *
		 * An earlier version of this test asserted a single rule and failed,
		 * which was the test being wrong about the feature. Core's viewports are
		 * disjoint: `@tablet` applies between 480px and 782px and nowhere else.
		 * Spacery's tiers are a desktop-first cascade, so a value at `tablet`
		 * reaches Mobile too -- the server materializes the cascade into bands
		 * rather than relying on one media query overriding another. Adopting a
		 * core value therefore widens where it applies, which is why the panel
		 * says so before the author clicks.
		 *
		 * Asserted with the hash normalized, exactly as SpacerTest does on the
		 * server, so both suites make the same claim in the same shape.
		 */
		expect(setting[0]!.css.replace(/spy-[0-9a-f]+/g, 'spy-HASH')).toBe(
			`@media (480px < width <= 782px){.spy-HASH{padding-top:${TAKEN} !important;}}` +
				`@media (width <= 480px){.spy-HASH{padding-top:${TAKEN} !important;}}`
		);
	});
});

/**
 * Every `<style id="...">` block on the page, with its CSS.
 *
 * `sourceURL` comments are stripped: `wp-env` runs with `SCRIPT_DEBUG` on, so
 * core appends one to every inline stylesheet, and a test that compared them
 * would be asserting on a debug setting.
 *
 * @param html The page HTML.
 * @return One entry per identified stylesheet.
 */
function styleSheets(html: string): Array<{ id: string; css: string }> {
	const sheets: Array<{ id: string; css: string }> = [];
	const pattern = /<style[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/style>/g;

	for (;;) {
		const match = pattern.exec(html);

		if (null === match) {
			return sheets;
		}

		sheets.push({
			id: match[1]!,
			css: match[2]!
				.replace(/\/\*#\s*sourceURL=[\s\S]*?\*\//g, '')
				.trim(),
		});
	}
}
