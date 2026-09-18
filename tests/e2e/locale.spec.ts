/**
 * Proof that a second locale renders.
 *
 * M6's exit criterion, and the one thing the translation pipeline cannot be
 * argued into. Run separately from the rest of the suite, against a site whose
 * language has been switched to Greek — see playwright-locale.config.ts and the
 * CI job that sets `WPLANG` before invoking it.
 *
 * Both halves of the pipeline are asserted here on purpose, and since the
 * plugin stopped bundling translations both are served from a language pack —
 * the repository's compiled Greek, copied into `WP_LANG_DIR/plugins` by the CI
 * job, which is what WordPress.org delivers. The heading proves WordPress's
 * just-in-time loading found the `.mo` there with nothing registering a path;
 * the button proves it found the script payload, which is named after an md5
 * of `build/settings.js` and is the half that would silently produce nothing if
 * the POT ever went back to referencing sources.
 */

import { expect, test } from '@wordpress/e2e-test-utils-playwright';

test('the settings screen renders in Greek', async ({ admin, page }) => {
	await admin.visitAdminPage('admin.php', 'page=spacery');

	// From the pack's spacery-el.mo, through PHP.
	await expect(
		page.getByRole('heading', { name: 'Πηγή σημείων διακοπής' })
	).toBeVisible();

	// From the pack's payload for build/settings.js, through the browser.
	await expect(
		page.getByRole('button', { name: 'Αποθήκευση αλλαγών' })
	).toBeVisible();
});
