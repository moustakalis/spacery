/**
 * End-to-end tests for the settings screen.
 *
 * The screen's job is decision D2 — one breakpoint source at a time, chosen by
 * the person running the site. These cover the two claims that need a real
 * WordPress: that a choice survives a save and a reload, and that what the
 * screen reports as in use is what the server actually resolved.
 */

import { expect, test } from '@wordpress/e2e-test-utils-playwright';

/** The two options this suite writes, so it can put them back. */
const OPTIONS = {
	spacery_breakpoint_source: '',
	spacery_custom_breakpoints: [],
};

/**
 * The app's own container.
 *
 * Every content assertion is scoped to it, because `@wordpress/components`
 * `Notice` also announces itself through WordPress's `#a11y-speak-polite` live
 * region — so an unscoped `getByText( 'Settings saved.' )` matches twice and
 * fails on strict mode. That duplicate is the accessibility layer working, not
 * a bug; the fix belongs in the locator.
 */
const appRoot = '#spacery-settings';

test.describe('settings screen', () => {
	test.afterEach(async ({ requestUtils }) => {
		// Later specs read the resolved set; leaving a source chosen would make
		// their expectations depend on the order tests happened to run in.
		await requestUtils.rest({
			path: '/wp/v2/settings',
			method: 'POST',
			data: OPTIONS,
		});
	});

	test('saves a source and still shows it after a reload', async ({
		admin,
		page,
	}) => {
		await admin.visitAdminPage('options-general.php', 'page=spacery');

		const app = page.locator(appRoot);
		const preset = page.getByRole('radio', { name: /Spacery's own/ });

		await expect(preset).toBeVisible();
		await preset.check();
		await page.getByRole('button', { name: 'Save changes' }).click();

		await expect(app.getByText('Settings saved.')).toBeVisible();

		await page.reload();

		await expect(
			page.getByRole('radio', { name: /Spacery's own/ })
		).toBeChecked();
	});

	/**
	 * The "In use now" panel is not a copy of the radio buttons: it is what the
	 * server resolved, fetched back after saving. A screen that merely echoed
	 * the choice would look identical while being unable to tell anyone that
	 * their theme, or a filter, had had the final word.
	 */
	test('reports the set the server actually resolved', async ({
		admin,
		page,
	}) => {
		await admin.visitAdminPage('options-general.php', 'page=spacery');

		const app = page.locator(appRoot);

		await page.getByRole('radio', { name: /Spacery's own/ }).check();
		await page.getByRole('button', { name: 'Save changes' }).click();
		await expect(app.getByText('Settings saved.')).toBeVisible();

		/*
		 * Asserted on the bands rather than the tier names. A name proves only
		 * that a list was rendered; the bands prove the order is widest-first
		 * and that the ranges are disjoint, which is the claim -- a tier's lower
		 * edge is the next tier's boundary, not zero.
		 */
		await expect(app.getByText('Source: spacery')).toBeVisible();
		await expect(app.getByText('over 1024px, up to 1280px')).toBeVisible();
		await expect(app.getByText('over 782px, up to 1024px')).toBeVisible();
		await expect(app.getByText('over 480px, up to 782px')).toBeVisible();
		await expect(
			app.getByText('up to 480px', { exact: true })
		).toBeVisible();
	});

	/**
	 * The server refuses an invalid set whole and hands back the previous one,
	 * so the screen has to notice that nothing changed rather than report a
	 * success it cannot verify.
	 *
	 * The invalid set here is a breakpoint with no width, which is what someone
	 * gets by adding a row and saving before filling it in. An earlier version
	 * of this test typed `80%` into the width instead and could not: the control
	 * is a `UnitControl` over a number input with px, em and rem, so a bad unit
	 * is unreachable through the screen. Worth knowing — it means the only
	 * invalid sets a person can actually submit are missing fields and colliding
	 * widths, not malformed lengths.
	 */
	test('says so when the server refuses a set', async ({ admin, page }) => {
		await admin.visitAdminPage('options-general.php', 'page=spacery');

		const app = page.locator(appRoot);

		await page.getByRole('radio', { name: /I define below/ }).check();
		await page.getByRole('button', { name: 'Add breakpoint' }).click();

		await page.getByLabel('Name').fill('Broken');

		await page.getByRole('button', { name: 'Save changes' }).click();

		await expect(
			app.getByText('were not saved, and nothing changed')
		).toBeVisible();
	});
});
