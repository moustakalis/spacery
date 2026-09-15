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

/**
 * A CSS selector for a source radio, addressed by the value it submits.
 *
 * Not by its label: the "Decide for me" option names the source it would
 * currently fall back to, so every source name appears in two labels by
 * design. On a site whose default is Spacery's own preset, a label match for
 * /Spacery's own/ finds both "Decide for me -- currently Spacery's own set"
 * and "Spacery's own -- Desktop (1280px), ...", and strict mode fails. The
 * value is the option's stable identity; the label is prose meant to change.
 *
 * @param value The option's submitted value: '', 'theme', 'spacery' or 'custom'.
 * @return A selector to scope to the app root.
 */
const sourceRadio = (value: string) => `input[type="radio"][value="${value}"]`;

test.describe('settings screen', () => {
	/**
	 * Server errors, surfaced as failures rather than as console noise.
	 *
	 * A refused save used to fatal — the sanitizer called `add_settings_error()`,
	 * which lives in wp-admin and is absent from a REST request. The suite
	 * reported "element not found" for the notice, and the 500 that caused it
	 * appeared only as a stray browser console line above the results. Watching
	 * responses turns that into the first thing the failure says.
	 */
	let serverErrors: string[] = [];

	test.beforeEach(async ({ page }) => {
		serverErrors = [];

		page.on('response', (response) => {
			if (response.status() >= 500) {
				serverErrors.push(
					`${response.status()} ${response.request().method()} ${response.url()}`
				);
			}
		});
	});

	test.afterEach(async ({ requestUtils }) => {
		// Reset first. Asserting before this would let a failing check skip the
		// cleanup and leave the next spec reading options this one chose.
		await requestUtils.rest({
			path: '/wp/v2/settings',
			method: 'POST',
			data: OPTIONS,
		});

		expect(serverErrors).toEqual([]);
	});

	test('saves a source and still shows it after a reload', async ({
		admin,
		page,
	}) => {
		await admin.visitAdminPage('admin.php', 'page=spacery');

		const app = page.locator(appRoot);
		const preset = app.locator(sourceRadio('spacery'));

		await expect(preset).toBeVisible();

		/*
		 * Nothing has changed yet, so there is nothing to save. The screen used
		 * to offer the button regardless, which said the same thing whether or
		 * not the author had touched anything (S8).
		 */
		await expect(
			page.getByRole('button', { name: 'Save changes' })
		).toBeDisabled();

		await preset.check();
		await page.getByRole('button', { name: 'Save changes' }).click();

		await expect(app.getByText('Settings saved.')).toBeVisible();

		await page.reload();

		await expect(app.locator(sourceRadio('spacery'))).toBeChecked();
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
		await admin.visitAdminPage('admin.php', 'page=spacery');

		const app = page.locator(appRoot);

		await app.locator(sourceRadio('spacery')).check();
		await page.getByRole('button', { name: 'Save changes' }).click();
		await expect(app.getByText('Settings saved.')).toBeVisible();

		await expect(app.getByText("From: Spacery's own set")).toBeVisible();

		/*
		 * Asserted on the bands rather than the tier names. A name proves only
		 * that something was rendered; the bands prove the order is
		 * widest-first and that the ranges are disjoint, which is the claim --
		 * a tier's lower edge is the next tier's boundary, not zero.
		 *
		 * They are read off the ruler's accessible description, which is where
		 * they live now that the drawing has replaced the list it used to sit
		 * beside. That makes this one assertion cover two things: the bands,
		 * and the fact that the picture is described at all.
		 */
		await expect(
			app.getByRole('img', {
				name:
					'Desktop, over 1024px, up to 1280px. ' +
					'Laptop, over 782px, up to 1024px. ' +
					'Tablet, over 480px, up to 782px. ' +
					'Mobile, up to 480px.',
			})
		).toBeVisible();

		// And the one thing on that card an author may have to act on.
		await expect(
			app.getByText(
				'Screens wider than 1280px match no breakpoint, so blocks use their ordinary values.',
				{ exact: false }
			)
		).toBeVisible();
	});

	/**
	 * What E0 and E1 did to the test that used to be here.
	 *
	 * It submitted a breakpoint with no width and asserted the screen reported
	 * the server's refusal -- "your source was saved, those breakpoints were
	 * not", which is S4's fix. That path can no longer be reached by a person:
	 * the screen now validates against the server's own shipped rules and
	 * disables Save while anything is wrong, so the set never leaves the
	 * browser. The old test sat clicking a disabled button until Playwright
	 * timed out.
	 *
	 * The refusal notices stay in the code, because the server is still the
	 * authority and the screen must not report a success it cannot verify. They
	 * are simply unreachable from the interface now, which is the point of E0
	 * and E1 -- and this test asserts *that* instead, on the same row the old
	 * one used: a name with no width, which is what someone gets by adding a
	 * row and saving before filling it in.
	 */
	test('refuses a set the server would refuse, without sending it', async ({
		admin,
		page,
	}) => {
		await admin.visitAdminPage('admin.php', 'page=spacery');

		const app = page.locator(appRoot);

		await app.locator(sourceRadio('custom')).check();

		/*
		 * The empty card has its own button, because a lone *Add breakpoint*
		 * left the author guessing what the site was doing about spacing
		 * meanwhile. Every later row is added by the plain one.
		 */
		await page
			.getByRole('button', { name: 'Add your first breakpoint' })
			.click();

		/*
		 * By role, not by label, for every field in this test. `getByLabel`
		 * matches accessible names as substrings, and the ruler is one
		 * `role="img"` whose name is a sentence per band -- "Desktop, over
		 * 1024px, up to 1280px." So `getByLabel('Up to')` resolves to the field
		 * *and* the drawing and fails strict mode, and `getByLabel('Up
		 * to').last()` is worse: it silently resolves to the drawing, because
		 * the ruler is below the table in the DOM. Any label text that could
		 * appear inside `described()` needs a role to disambiguate it.
		 */
		const name = page.getByRole('textbox', { name: 'Name' });
		const upTo = page.getByRole('spinbutton', { name: 'Up to' });

		await name.fill('Broken');

		/*
		 * The message belongs to the field that caused it, and the save bar
		 * says why the button is disabled rather than leaving the author to
		 * guess -- design system §5.2 and §5.3.
		 */
		await expect(
			app.getByText('Needs a number and a unit — px, em or rem.')
		).toBeVisible();
		await expect(
			app.getByText('Fix 1 problem above to save.')
		).toBeVisible();
		await expect(
			page.getByRole('button', { name: 'Save changes' })
		).toBeDisabled();

		/*
		 * Completing the row is what makes it sendable. Digits only: `Up to` is
		 * a `UnitControl`, which is an `input[type=number]` beside a unit
		 * select, and Playwright refuses to type letters into a number input.
		 * The control appends the selected unit itself -- px, the first entry
		 * in the row's `UNITS` -- so this stores `900px`, and the assertion
		 * below is what proves it: an unfinished value would leave Save
		 * disabled.
		 *
		 */
		await upTo.fill('900');
		await upTo.press('Tab');

		await expect(
			page.getByRole('button', { name: 'Save changes' })
		).toBeEnabled();

		await page.getByRole('button', { name: 'Save changes' }).click();
		await expect(app.getByText('Settings saved.')).toBeVisible();
		await expect(
			app.getByText('From: the breakpoints you defined')
		).toBeVisible();

		// Derived, never editable: the row says what it covers (§5.2).
		await expect(app.getByText('up to 900px')).toBeVisible();

		/*
		 * The rule that started the redesign, as an assertion: "Per-row `help`
		 * is forbidden -- N rows repeat it N times". One row, one line; four
		 * rows, still one line.
		 */
		await expect(
			app.getByText('Name appears in the editor.', { exact: false })
		).toHaveCount(1);

		/*
		 * And the other severity. A second row at the same width is not an
		 * unfinished field, it is two rows disagreeing -- so the message names
		 * the other row rather than reciting the rule (§5.2), and the `Covers`
		 * cell says what the conflict costs this row.
		 */
		await page.getByRole('button', { name: 'Add breakpoint' }).click();
		await name.last().fill('Copy');
		await upTo.last().fill('900');

		await expect(
			app.getByText('Same width as Broken.', { exact: false })
		).toBeVisible();
		await expect(app.getByText('Nothing — no screens left')).toBeVisible();
		await expect(
			app.getByText('Fix 1 problem above to save.')
		).toBeVisible();
		await expect(
			page.getByRole('button', { name: 'Save changes' })
		).toBeDisabled();
	});

	/**
	 * E4. Choosing "breakpoints I define below" and adding none is a legitimate
	 * state -- an empty set is valid, and the registry falls through to the next
	 * source -- but the screen used to report the result without connecting it
	 * to the choice, so the author read `From: Spacery's own set` directly
	 * beneath a radio saying they had chosen something else.
	 */
	test('explains what is running while the custom set is empty', async ({
		admin,
		page,
	}) => {
		await admin.visitAdminPage('admin.php', 'page=spacery');

		const app = page.locator(appRoot);

		await app.locator(sourceRadio('custom')).check();

		// Before saving: the empty state names what is in effect meanwhile.
		await expect(
			app.getByText("You haven't defined any breakpoints yet")
		).toBeVisible();

		await page.getByRole('button', { name: 'Save changes' }).click();
		await expect(app.getByText('Settings saved.')).toBeVisible();

		// After: the resolved set says why it is not the set that was chosen.
		await expect(
			app.getByText('You have not defined any yet', { exact: false })
		).toBeVisible();
	});

	/**
	 * E7, and the loading state it shares a component with (S6). The mark is
	 * `aria-hidden`, so it is addressed by the viewBox its geometry is drawn on
	 * -- twice per screen, header and footer, and nowhere else.
	 *
	 * The version is asserted in both placements and in neither's old wording.
	 * This test used to look for `/^Version \d/`, which the redesign removed:
	 * the masthead tag is the number alone, as the drawing has it, and the
	 * footer signs itself `Spacery <version>`. A test failing after a
	 * deliberate change is the third time on this file -- read the screen
	 * before assuming the screen is wrong.
	 */
	test('signs the page at the top and the bottom, and nowhere else', async ({
		admin,
		page,
	}) => {
		await admin.visitAdminPage('admin.php', 'page=spacery');

		const app = page.locator(appRoot);

		await expect(
			app.getByRole('heading', { name: 'Spacery', level: 1 })
		).toBeVisible();
		await expect(app.locator('svg[viewBox="0 0 77 77"]')).toHaveCount(2);

		// The masthead tag: the number on its own, beside the h1.
		await expect(app.getByText(/^\d+\.\d+\.\d+$/)).toBeVisible();

		// The footer signature: the name and the number together.
		await expect(app.getByText(/^Spacery \d+\.\d+\.\d+$/)).toBeVisible();

		await expect(
			app.getByRole('link', { name: 'Documentation' })
		).toBeVisible();
	});
});
