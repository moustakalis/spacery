# Manual test pass

For the extended session before submitting to WordPress.org, against the local
MAMP Pro site rather than `wp-env`. It is deliberately not a list of everything
Spacery does — CI already proves most of that on every push. It is the set of
things a human has to look at, grouped by the decision each one is meant to hold
up.

## The site

`~/Dev/playground` is served by MAMP Pro, and
`wp-content/plugins/spacery` is a symlink to this repository. Symlinked plugins
are fine on modern WordPress — `wp_register_plugin_realpath()` exists for
exactly this — so `plugin_basename()` resolves correctly and the `languages/`
lookup and `build/*.js` URLs work as they would from a real install. The link
name has to stay `spacery`; both of those derive from it.

Three preconditions, each of which fails in a way that looks like a plugin bug:

1. **`build/` must exist.** It is gitignored, and CI builds it in its own
   checkout, so a working tree that has only ever been committed from does not
   have one. Without it the PHP half runs — blocks register, breakpoints
   resolve, front-end CSS is emitted — while the inspector panel and the
   settings screen silently do nothing, because `Editor\Extension` and
   `Settings\Screen` enqueue `build/extension.js` and `build/settings.js`.

   ```bash
   pnpm install     # once
   pnpm run build   # or: pnpm run start, to watch while you poke at it
   ```

2. **PHP 8.2+ and WordPress 7.1+** on that host. Below either,
   `Requirements::are_met()` refuses to boot and shows an admin notice instead —
   quiet enough to misread as "the plugin does nothing". MAMP Pro sets the PHP
   version per host.

3. **`WP_DEBUG` and `WP_DEBUG_LOG` on** in `wp-config.php`. A good share of the
   findings in a pass like this arrive as notices rather than as visible
   breakage.

**No WP-CLI on this machine**, so everything below is done through the admin
screens or through files. The pieces that would normally be a `wp` command have
a file-based equivalent, and each one says so.

Several sections want a file in `wp-content/mu-plugins/` (create the directory
if it is not there). Must-use plugins load on every request without being
activated, which is what the filter experiments need and also what makes them
easy to forget — delete each one when its section is done.

For resetting the plugin's own state between experiments, drop this in once and
leave it for the whole pass:

`wp-content/mu-plugins/spacery-dev-reset.php`

```php
<?php
/**
 * Dev helper. Visit any admin URL with ?spacery_reset=1 to clear Spacery's
 * options. Never put this on a real site.
 */
add_action( 'admin_init', function () {
	if ( isset( $_GET['spacery_reset'] ) && current_user_can( 'manage_options' ) ) {
		delete_option( 'spacery_breakpoint_source' );
		delete_option( 'spacery_custom_breakpoints' );
	}
} );
```

Before the theme-switching sections, export the database from the phpMyAdmin
that ships with MAMP Pro, so you can get back without rebuilding the site.

If you would rather have WP-CLI after all, `brew install wp-cli` gives you the
`wp` commands this document replaces — but nothing here needs it.

## What CI already covers

Skip these unless something looks wrong; re-testing them by hand is time spent
twice.

- Breakpoint resolution, ordering, boundary validation, and the theme/preset/
  custom sources — unit and contract suites, the latter against core's own
  `WP_Theme_JSON`.
- Band generation, disjointness and hash de-duplication — unit suite, running
  through the real Style Engine.
- Saving a source and reading it back; the "In use now" panel reporting what the
  server resolved; a refused invalid set — `tests/e2e/settings.spec.ts`.
- A tier surviving a save, the block still loading with Spacery deactivated, and
  the takeover flow — `tests/e2e/extension.spec.ts`.
- Greek rendering in PHP and in the browser — the locale job.

Those run under `wp-env`, which is why the E2E suite still needs Docker even
though this pass does not.

## 1. Breakpoint sources (D2)

**Spacery** in the admin menu, below Appearance.

- [ ] With **Twenty Twenty-Five** active, "Decide for me" reports the theme, and
      the bands shown match core's `settings.viewport`.
- [ ] Switch to `spacery`. The bands widen to Desktop / Laptop / Tablet / Mobile
      and the front end changes with them.
- [ ] Define a custom set. Try: two rows with the same width; a row with no
      width; a single row; ten rows. The invalid ones must be refused **whole**,
      with the previous set still in force — not partially applied.
- [ ] Add `settings.custom.spacery.breakpoints` to a child theme's `theme.json`
      (see `FILTERS.md`) and confirm it becomes the default source without
      touching the options.
- [ ] Add a `spacery_breakpoints` filter in a mu-plugin. It must win over every
      source *and* the screen must say so, rather than showing the option's value
      as though it were in effect.
- [ ] Check the REST route agrees with the screen. Visiting
      `/wp-json/spacery/v1/breakpoints` in the browser returns 401 — the route
      requires `manage_options`, and a plain page load carries no REST nonce — so
      ask from inside the editor instead. Open any post in the block editor and
      run this in the browser console:

      ```js
      wp.apiFetch( { path: '/spacery/v1/breakpoints' } ).then( console.log );
      ```

      `effectiveSource`, `resolved` and `maxBreakpoints` should match what the
      settings screen is showing.

## 2. Editor, responsive editing on (D12)

Any block with spacing support — Group, Cover, Columns, a Paragraph.

- [ ] Resize the canvas. The panel's tier selector follows core's viewport, and
      the fields below it change with it.
- [ ] Click a different tier in the selector. The canvas must **not** move, and
      a line under the selector should say which tier the canvas is still
      previewing (D17).
- [ ] Change the preview viewport again. The selector re-points at the matching
      tier, discarding the manual choice — that is the intended precedence.
- [ ] With five or fewer tiers the selector is segmented; switch the source to a
      set with more and confirm it becomes a dropdown rather than twelve
      unreadable segments.
- [ ] Link the sides in a padding or margin box, type once, and confirm all four
      sides take the value; unlink and confirm they part company again.
- [ ] Empty a side that a wider tier sets. The line under the box should name the
      side and the value it falls back to.
- [ ] Set a value at the widest tier, then a different one at a narrower tier.
      The narrower one must win in the editor preview *and* on the front end.
- [ ] Set a value at a middle tier only. Narrower tiers should inherit it; wider
      ones should not.
- [ ] Reset a tier. The inherited value should reappear, not zero.
- [ ] Undo/redo across a takeover and a reset. Nothing half-applied.

## 3. Editor, responsive editing off

`wp-content/mu-plugins/spacery-no-responsive.php`:

```php
<?php
add_filter( 'block_editor_settings_all', function ( $settings ) {
	$settings['responsiveEditingEnabled'] = false;
	return $settings;
} );
```

- [ ] The tier selector still works, with a line saying the canvas does not
      follow along.
- [ ] Values set through it land in the same places and render identically.

Delete the file afterwards; it changes every later section if left in place, and
a stale mu-plugin is invisible in the admin.

## 4. Takeover (D11)

Give a block a core `@tablet` padding through the editor's own responsive
control.

- [ ] The notice counts the values correctly and singular/plural reads right.
- [ ] "Manage these in Spacery" moves them, and afterwards exactly one rule sets
      that property at that width — check the front-end CSS, not just the panel.
- [ ] With a custom set whose widths do **not** match core's, the notice must say
      which viewports it is leaving alone and why, rather than offering a move it
      cannot make.

## 5. Front-end CSS (D13, D14)

View source. Spacery's declarations belong in
`<style id="wp-style-engine-spacery-inline-css">`.

- [ ] **Block theme** (Twenty Twenty-Five / -Four / -Three, all three installed):
      the tag is in `<head>`.
- [ ] **Classic theme** — none is installed on this site, so install one first:
      Appearance → Themes → Add New → **Twenty Twenty-One**, activate. The tag
      must still be in `<head>`, lifted there by core's
      `wp_hoist_late_printed_styles()`.
      Spacery must not be printing it anywhere itself; this is the only place
      that claim gets tested.
- [ ] Bands are disjoint (`480px < width <= 782px`), widest first, and never
      overlap a core `@mobile` value.
- [ ] Two blocks with identical spacing share one rule.
- [ ] A page with no Spacery values emits no Spacery stylesheet at all.

## 6. The Spacer block

- [ ] Insert **Spacery**, set a different height per tier, check the front end at
      each width. The block's panel carries the same tier selector as the
      spacing panel — stepping through tiers there must not move the canvas.
- [ ] With a tier selected that the canvas is not previewing, the block's own
      preview height must still be the canvas's, not the selected tier's.
      Selecting a tier says which value you are writing, never what the page
      looks like.
- [ ] Its own margin controls still work alongside the height.
- [ ] It never appears in the Spacery inspector panel — the block is excluded
      from the extension, but still renders its own CSS. Those are two separate
      lists in `Blocks\Supported`, and conflating them once already broke the
      block's own output.

## 7. Third-party blocks and the deny-list (D6)

The site has Elementor and WP Book Bar, but Elementor is a page builder rather
than a block library, so install something that actually registers blocks with
`supports.spacing` — Kadence Blocks or Stackable will do.

- [ ] Its blocks get the panel with no work on Spacery's part.
- [ ] Deny one with `spacery_denied_blocks` in a mu-plugin. The panel disappears
      **and** no CSS is generated for it.
- [ ] A block whose theme has spacing switched off shows the explanatory message,
      not an empty panel.
- [ ] Activate Elementor and edit an Elementor page. Spacery should be inert
      there rather than noisy.

## 8. Editor stress

- [ ] A post with ~200 blocks carrying values: editor responsiveness, and how big
      the emitted stylesheet actually is.
- [ ] Site editor, template parts, and the widgets screen — the panel should
      appear in all of them.
- [ ] Reusable block / pattern containing Spacery values, inserted twice.

## 9. Housekeeping

- [ ] Deactivate and reactivate. No notices, no orphaned CSS.
- [ ] Note that there is no `uninstall.php` — `spacery_breakpoint_source` and
      `spacery_custom_breakpoints` survive deletion. Decide whether that is what
      you want before submitting.
- [ ] Check `wp-content/debug.log` at the end, not only the screen. Any
      `_doing_it_wrong`, deprecation or PHP notice is a finding, including ones
      core raises about translation timing.

## Recording what you find

Anything that turns out to be a bug wants a failing test before the fix, in the
suite that should have caught it — that is what has kept the CI rounds honest so
far. Anything that turns out to be a decision belongs in `PLAN.md` §8 with its
reasoning, not in a commit message alone.
