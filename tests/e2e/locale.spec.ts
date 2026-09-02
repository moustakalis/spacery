/**
 * Proof that a second locale renders.
 *
 * M6's exit criterion, and the one thing the translation pipeline cannot be
 * argued into. Run separately from the rest of the suite, against a site whose
 * language has been switched to Greek — see playwright-locale.config.ts and the
 * CI job that sets `WPLANG` before invoking it.
 *
 * Both halves of the pipeline are asserted here on purpose. The heading proves
 * PHP found `spacery-el.mo`; the button proves `wp_set_script_translations()`
 * found `spacery-el-spacery-settings.json`, which is the half that silently
 * produced nothing until the extraction and naming were fixed.
 */

import { expect, test } from '@wordpress/e2e-test-utils-playwright';

test('the settings screen renders in Greek', async ({ admin, page }) => {
	await admin.visitAdminPage('options-general.php', 'page=spacery');

	// From languages/spacery-el.mo, through PHP.
	await expect(
		page.getByRole('heading', { name: 'Πηγή σημείων διακοπής' })
	).toBeVisible();

	// From languages/spacery-el-spacery-settings.json, through the browser.
	await expect(
		page.getByRole('button', { name: 'Αποθήκευση αλλαγών' })
	).toBeVisible();
});
