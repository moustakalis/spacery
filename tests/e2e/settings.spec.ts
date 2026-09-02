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

		const preset = page.getByRole('radio', { name: /Spacery's own/ });

		await expect(preset).toBeVisible();
		await preset.check();
		await page.getByRole('button', { name: 'Save changes' }).click();

		await expect(page.getByText('Settings saved.')).toBeVisible();

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

		await page.getByRole('radio', { name: /Spacery's own/ }).check();
		await page.getByRole('button', { name: 'Save changes' }).click();
		await expect(page.getByText('Settings saved.')).toBeVisible();

		// Spacery's preset, widest first, with the bands it will emit.
		for (const tier of ['Desktop', 'Laptop', 'Tablet', 'Mobile']) {
			await expect(page.getByText(tier, { exact: true })).toBeVisible();
		}

		await expect(page.getByText('over 782px, up to 1024px')).toBeVisible();
		await expect(
			page.getByText('up to 480px', { exact: true })
		).toBeVisible();
	});

	/**
	 * The server refuses an invalid set whole and hands back the previous one,
	 * so the screen has to notice that nothing changed rather than report a
	 * success it cannot verify.
	 */
	test('says so when the server refuses a set', async ({ admin, page }) => {
		await admin.visitAdminPage('options-general.php', 'page=spacery');

		await page.getByRole('radio', { name: /I define below/ }).check();
		await page.getByRole('button', { name: 'Add breakpoint' }).click();

		await page.getByLabel('Name').fill('Broken');

		// A percentage is not a length Spacery will interpolate into a query.
		await page.getByLabel('Up to').fill('80%');

		await page.getByRole('button', { name: 'Save changes' }).click();

		await expect(
			page.getByText('were not saved, and nothing changed')
		).toBeVisible();
	});
});
