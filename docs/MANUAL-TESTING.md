# Manual test pass

For the extended session before submitting to WordPress.org. It is deliberately
not a list of everything Spacery does — CI already proves most of that on every
push. It is the set of things a human has to look at, grouped by the decision
each one is meant to hold up.

## Getting a site up

```bash
pnpm install
pnpm run build          # the plugin loads build/*.js; env:start alone is not enough
pnpm run env:start      # http://localhost:8888, admin / password
pnpm run start          # optional: watch and rebuild while you poke at it
```

`pnpm run env run cli wp …` reaches the dev site, `tests-cli` the one the E2E
suite uses. Reset the dev site with `pnpm run env clean all` if a theme or an
option experiment leaves it somewhere strange.

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

## 1. Breakpoint sources (D2)

Settings → Spacery.

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
      source *and* the screen must say so rather than showing the option's value
      as though it were in effect.

## 2. Editor, responsive editing on (D12)

Any block with spacing support — Group, Cover, Columns, a Paragraph.

- [ ] Resize the canvas. The Spacery panel follows core's viewport rather than
      offering a switcher of its own.
- [ ] Set a value at the widest tier, then a different one at a narrower tier.
      The narrower one must win in the editor preview *and* on the front end.
- [ ] Set a value at a middle tier only. Narrower tiers should inherit it; wider
      ones should not.
- [ ] Reset a tier. The inherited value should reappear, not zero.
- [ ] Undo/redo across a takeover and a reset. Nothing half-applied.

## 3. Editor, responsive editing off

```bash
pnpm run env run cli wp eval 'add_filter("block_editor_settings_all", fn($s) => $s + ["responsiveEditingEnabled" => false]);'
```

— better as a mu-plugin, since that filter has to run per request.

- [ ] Spacery supplies its own **Breakpoint** select, with the help text
      explaining why.
- [ ] Values set through it land in the same places and render identically.

## 4. Takeover (D11)

Give a block a core `@tablet` padding (the editor's own responsive control).

- [ ] The notice counts the values correctly and singular/plural reads right.
- [ ] "Manage these in Spacery" moves them, and afterwards exactly one rule sets
      that property at that width — check the front-end CSS, not just the panel.
- [ ] With a custom set whose widths do **not** match core's, the notice must say
      which viewports it is leaving alone and why, rather than offering a move it
      cannot make.

## 5. Front-end CSS (D13, D14)

View source. Spacery's declarations belong in `<style id="wp-style-engine-spacery-inline-css">`.

- [ ] **Block theme** (Twenty Twenty-Five): the tag is in `<head>`.
- [ ] **Classic theme** (`wp theme activate twentytwentyone`): still in `<head>`,
      lifted by core — Spacery must not be printing it anywhere itself.
- [ ] Bands are disjoint (`480px < width <= 782px`), widest first, and never
      overlap a core `@mobile` value.
- [ ] Two blocks with identical spacing share one rule.
- [ ] A page with no Spacery values emits no Spacery stylesheet at all.

## 6. The Spacer block

- [ ] Insert **Spacery**, set a different height per tier, check the front end at
      each width.
- [ ] Its own margin controls still work alongside the height.
- [ ] It never appears in the Spacery inspector panel — the block is excluded
      from the extension, but still renders its own CSS.

## 7. Third-party blocks and the deny-list (D6)

- [ ] Install a block plugin you did not write (Kadence, Stackable, whatever is
      handy). Its blocks with `supports.spacing` should get the panel for free.
- [ ] Deny one with `spacery_denied_blocks`. The panel disappears **and** no CSS
      is generated for it.
- [ ] A block whose theme has spacing switched off shows the explanatory message,
      not an empty panel.

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
- [ ] `WP_DEBUG` on throughout. Any `_doing_it_wrong`, deprecation or PHP notice
      is a finding, including ones core raises about translation timing.

## Recording what you find

Anything that turns out to be a bug wants a failing test before the fix, in the
suite that should have caught it — that is what has kept the CI rounds honest so
far. Anything that turns out to be a decision belongs in `PLAN.md` §8 with its
reasoning, not in a commit message alone.
