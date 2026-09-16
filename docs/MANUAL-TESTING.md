# Manual test pass

For the extended session before submitting to WordPress.org, against the local
MAMP Pro site rather than `wp-env`. It is deliberately not a list of everything
Spacery does — CI already proves most of that on every push. It is the set of
things a human has to look at, grouped by the decision each one is meant to hold
up.

## Where this pass stopped

**Read this first on a cold start.** The pass was begun on 12 September 2026
against the MAMP playground and continued on 14 September. **46 boxes ticked,
3 partial, 1 to go** — and the one left is a decision, not a test. `[x]` means
checked on a real screen; `[~]` means partly, and all three are blocked on
something rather than unfinished:

- §2's two cascade boxes — front-end halves pass; the editor-preview halves have
  nothing to look at until the preview is built (`preview-spike.md`).
- §8's site-editor box — the widgets half passes; the site editor and template
  parts need a block theme, and Twenty Twenty-One is active for §5.

Every box that found something says what it found, in place — those notes are
the most useful thing in this file.

**Done:** every section. §1 through §9 have been run.

**Next:**

1. **Settle the `uninstall.php` question** (§9) — a decision, not a test.
2. **Build the editor preview** (`preview-spike.md`), then clear §2's two `[~]`
   boxes. Their front-end halves already pass.
3. **Switch back to a block theme** and clear §8's site-editor half.

**§4, the takeover, is done** — it was the largest untested thing in the plugin
and the only feature that rewrites the author's content. It behaved correctly in
every case tried, including the one this playground is set up for (no movable
values at all, because the stored widths do not match core's). Read its boxes
before re-running anything there: they now carry the two-phase recipe.

**The pass has found five defects in code, one specified-but-unbuilt feature,
and five false claims in documentation.** That rate is the argument for finishing it before submitting:
each one was invisible to CI, and three of the four code defects were in
behaviour no test could reach — a CSS specificity loss, an attribution, a value
that escaped its declaration, and a box mode. See D21, D22 and D23 in
`PLAN.md` §8. **The fifth false claim is a warning about this document
itself**: the segmented-control box said "five or fewer tiers" where the code
says four plus a character budget, so running the box as written would have
manufactured a defect that is not there. When a box fails, check the box against
the code before believing it.

**State left on the playground**, which the next session can reuse rather than
rebuild:

- A draft page, **"Spacery manual pass (scratch)"** (`post=45`), holding two
  Groups and a Columns block. Group A carries a preset, a `var()` and a `2rem`
  at `desktop`; Group B carries `0`, `30rem`, `1vw` and `calc(100% - 2rem)` at
  `desktop`; the inner Column carries a **core** `style.spacing.padding` with
  `var:preset|spacing|60` on top and `24px` underneath — the mixed
  preset-and-length box D22 is about. **The page was published briefly on
  14 September to read its front-end CSS and has been put back to draft**, and
  the Column was restored to exactly the two values above after §4 —
  so the fixture is as described, not as §4 left it.
- `wp-content/mu-plugins/spacery-dev-reset.php`, as this document prescribes.
  Nothing else: the `spacery_breakpoints` filter experiment, the probe and the
  child theme were all removed, and Twenty Twenty-Five is active again.
- The stored breakpoint set is the author's own four: `desktop 11920px`,
  `laptop 1300px`, `tablet 888px`, `mobile 450px`. The `11920px` is a
  deliberate typo kept from before the pass — it is what triggers the
  wider-than-any-screen caution, so it is worth leaving.
- **Changed on 14 September, and it matters for the next session:**
  **Twenty Twenty-One is the active theme** (installed for §5's classic-theme
  check) and **Stackable is installed and active**. A classic theme has no site
  editor, which is what leaves §8's box at `[~]`, and it also switches
  `settings.spacing.margin` off — so a panel showing PADDING and no MARGIN is
  the theme talking, not a bug. Switch back to Twenty Twenty-Five before
  judging anything about the site editor or margin controls.
- `mu-plugins/` holds **only** `spacery-dev-reset.php`. Four temporary
  mu-plugins were written during §3 and §7 — a responsive-editing filter, a
  third-party block, a spacing-off filter and a deny-list — and all four were
  deleted. The §7 recipes are worth re-reading before re-running that section.

**Two things that make the pass faster**, both learned the hard way:

- `build/` can be rebuilt without asking anyone. `pnpm` is absent from the
  session VM and the `wp-scripts` shim is a shell script, so run
  `node node_modules/@wordpress/scripts/bin/wp-scripts.js build`. It fails once
  with `MODULE_NOT_FOUND` from `browserslist`, which looks for
  `@wordpress/browserslist-config` in the project root rather than where pnpm
  put it; one symlink fixes it permanently. `spacery-status.md` in the project
  has the command.
- The editor can be driven from the browser console faster than by clicking:
  `wp.data.dispatch('core/block-editor').selectBlock(id)`,
  `updateBlockAttributes`, and a native-setter helper for React inputs. Reading
  `wp.data.select('core/block-editor').getBlock(id).attributes.spacery` is the
  only way to check what was actually stored. **Client ids are regenerated on
  every editor load**, so re-read them after a reload rather than reusing them.

## The site

`~/Dev/playground` is served by MAMP Pro, and
`wp-content/plugins/spacery` is a symlink to this repository. Symlinked plugins
are fine on modern WordPress — `wp_register_plugin_realpath()` exists for
exactly this — so `plugin_basename()` resolves correctly and the `languages/`
lookup and `build/*.js` URLs work as they would from a real install. The link
name has to stay `spacery`; both of those derive from it.

Three preconditions, each of which fails in a way that looks like a plugin bug:

1. **`build/` must exist, and must be newer than `src/`.** It is gitignored, and
   CI builds it in its own checkout, so a working tree that has only ever been
   committed from does not have one. Without it the PHP half runs — blocks
   register, breakpoints resolve, front-end CSS is emitted — while the inspector
   panel and the settings screen silently do nothing, because `Editor\Extension`
   and `Settings\Screen` enqueue `build/extension.js` and `build/settings.js`.

   ```bash
   pnpm install     # once
   pnpm run build   # or: pnpm run start, to watch while you poke at it
   ```

   **A stale `build/` is the worse failure, because the precondition above reads
   as satisfied.** The screens load, behave like the day they were built, and
   every difference from this document looks like a finding. The first attempt at
   this pass was nearly run against a `build/settings.js` from 3 September with
   twenty-six newer source files behind it — the whole of Groups A to F and E0 to
   E7 missing, including every string and control this document asks you to look
   at. Check before starting, and rebuild if it says anything at all:

   ```bash
   find src -newer build/settings.js -name '*.ts*'
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

- [x] With **Twenty Twenty-Five** active, "Decide for me" reports **Spacery's
      own set**, and the theme radio reads "it declares no breakpoints". That is
      correct, and the checkbox this replaced ("the bands shown match core's
      `settings.viewport`") described something that cannot happen: `viewport`
      is a valid theme.json setting in 7.1 —
      `WP_Theme_JSON::VALID_SETTINGS['viewport']` is `mobile` and `tablet` —
      but **core declares none**. It is absent from `wp-includes/theme.json`,
      from `get_core_data()`, from `get_merged_data()` and therefore from
      `wp_get_global_settings()`; probed on this install. Twenty Twenty-Five
      declares none either, so the theme source has nothing to find and
      `defaultSource` is `spacery`. To see the theme source carry a set, one has
      to be declared — which is the child-theme step below.
- [x] Switch to `spacery`. The bands widen to Desktop / Laptop / Tablet / Mobile
      — 0–480, 480–782, 782–1024, 1024–1280, and the hatched uncovered region
      above 1280px with its callout. `From:` and the ruler both update on save
      without a reload. (The *front end* half of this needs a block carrying
      Spacery values; §4.)
- [x] Define a custom set. Try: two rows with the same width; a row with no
      width; a single row; ten rows. The invalid ones must be refused **whole**,
      with the previous set still in force — not partially applied. All refused
      on the screen, before anything is sent:

      - **Two rows at one width.** The later row tints red, its field and message
        turn `#d63638`/`#b32d2e`, `Covers` reads "Nothing — no screens left",
        Save is disabled and the bar says "Fix 1 problem above to save."
      - **A row with no width.** `--incomplete` in amber, "Needs a number and a
        unit — px, em or rem.", and `Covers` stays empty — the message on the
        field is already saying it.
      - **An empty set.** Not an error: the empty state explains that Spacery's
        own set is in use until a breakpoint is added, and the notice under *In
        use now* says the same thing in the other direction.
      - **Twelve rows.** Valid, saved, and the ruler draws all twelve with every
        label and every axis tick — `labelsFit` is all-or-nothing and said yes,
        because the names are short. A thirteenth **cannot be reached from the
        screen**: `Add breakpoint` disables at the maximum, with "12 breakpoints
        is the maximum. Beyond that the editor asks more of an author than it
        gives back." on the line beside it. The set-level error from
        `validate()` is therefore unreachable here, like the server-refusal path
        in `settings.spec.ts` — the server is still the thing that enforces it.

      Also confirmed here: the **hybrid slug**. Before a save the slug field is
      empty with the derived slug as its placeholder (`tier-12`); after the save
      it holds that slug as a real value. A placeholder over a stored slug would
      have been a lie about what is in the block attributes.
- [x] Add `settings.custom.spacery.breakpoints` to a child theme's `theme.json`
      (see `FILTERS.md`) and confirm it becomes the default source without
      touching the options. A three-line child of Twenty Twenty-Five declaring
      `wall: 1800px`, `desk: 1200px`, `pocket: 520px` was enough: with the
      source option unset the screen read "Decide for me — currently your
      theme", the theme radio listed all three with their widths, and `From:`
      said "your theme". Labels are title-cased from the slugs.
- [x] Add a `spacery_breakpoints` filter in a mu-plugin. It must win over every
      source *and* the screen must say so, rather than showing the option's value
      as though it were in effect. **It did not, and this is what the checkbox
      was for.** The filter won and the ruler drew its bands — and above them
      the screen still said "From: the breakpoints you defined", crediting the
      author's own stored rows with a set they had never seen. Attribution
      stopped before the filter by design, on the argument that no honest answer
      existed for a set somebody else supplied.

      Fixed: `Registry::SOURCE_FILTER`, recorded after the filter and only when
      it actually changed the set (by value, since most filters hand `$set`
      straight back). The screen now reads "From: a filter on this site" over a
      notice saying the rows above are stored but not in use. Covered by three
      PHPUnit cases and two unit tests.
- [x] Check the REST route agrees with the screen. Visiting
      `/wp-json/spacery/v1/breakpoints` in the browser returns 401 — the route
      requires `manage_options`, and a plain page load carries no REST nonce — so
      ask from a screen that has one. **The settings screen itself is the
      cheapest place**: it already depends on `wp-api-fetch`, so its console
      needs no editor and no post. Run:

      ```js
      wp.apiFetch( { path: '/spacery/v1/breakpoints' } ).then( console.log );
      ```

      `effectiveSource`, `resolvedSource`, `defaultSource`, `resolved` and
      `maxBreakpoints` should match what the screen is showing. They did:
      `custom` / `custom` / `spacery`, the four authored tiers, and `12` against
      the screen's "4 of 12".

## 2. Editor, responsive editing on (D12)

Any block with spacing support — Group, Cover, Columns, a Paragraph.

- [x] Resize the canvas. The panel's tier selector follows core's viewport, and
      the fields below it change with it.
- [x] Click a different tier in the selector. The canvas must **not** move, and
      a line under the selector should say which tier the canvas is still
      previewing (D17).
- [x] Change the preview viewport again. The selector re-points at the matching
      tier, discarding the manual choice — that is the intended precedence.
- [x] The selector is segmented up to **four** tiers, and only while the labels
      fit a 36-character budget; past either it becomes a dropdown rather than
      twelve unreadable segments. **This box said "five or fewer" until 12
      September and was wrong** — `segments.ts` moved to four plus a budget in
      Group C (`00731bd`), because counting tiers alone was the bug:
      `Sm`/`Md`/`Lg`/`Xl` and `Widescreen`/`Desktop`/`Laptop`/`Handheld` are
      both four labels and only one of them fits an inspector column. Provoke
      both halves: five short tiers (the count), and four long ones (the
      budget, 39 characters). The playground's own four spend 33, so segments
      are what you see by default. **Proved three ways on 14 September**, each
      needing its own editor reload because the settings are published once per
      page load: five tiers labelled `A`–`E` (16 characters, far under budget)
      render a **dropdown**, so the count alone decides; four tiers labelled
      `Widescreen`/`Desktop`/`Laptop`/`Handheld` (39 characters) render a
      **dropdown**; and the *same four widths* relabelled `Sm`/`Md`/`Lg`/`Xl`
      (16 characters) render **segments**, which isolates the budget from the
      widths. Note the icon branch never enters any of these: the icon key comes
      from width floors (1200/992/600), so `1400px` and `1250px` both read as
      "desktop", `iconsAreDistinct()` is false, and the control uses labels.
      A marked tier reads `Md •` on screen and announces `Md (has values)`.
- [x] All four sides of padding and margin are editable at once, linked by
      default. Type once and confirm the four fields move together; unlink and
      confirm they part company again.
- [x] Unlink, set the four sides to four different values, then link again and
      edit one. All four must take the new value — linking is not "fill in the
      blanks".
- [x] Pick a unit, type a value, then clear the field. The unit must stay as you
      set it rather than reverting to px.
- [x] Empty a side that a wider tier sets. Its field should show the inherited
      value as a placeholder — and the *right* one per side, not one value
      repeated across all four.
- [x] Change a box's unit. The numbers stay and the unit swaps; nothing is
      converted behind your back.
- [x] Switch a box to **custom**. The fields become free text and keep what they
      held. Set four different values — `0`, `30rem`, `1vw`,
      `calc(100% - 2rem)` — and check all four on the front end.
- [x] Switch back to a real unit. Everything clears, deliberately: `calc()` has
      no number to put in a number field.
- [x] Type something WordPress will refuse (`red`, or a value with a stray `;`).
      No CSS should be emitted for that side, and nothing malformed should reach
      the stylesheet. **Both halves failed, and the reason given here was the
      mistake**: `safecss_filter_attr()` is not in this path. The value goes
      from the block attribute to `wp_style_engine_get_styles()`, which takes a
      string for a length and passes it through, and the stylesheet is built by
      joining `property:value` with semicolons.

      So `10px;color:red` typed into a padding field shipped as
      `padding-right:10px; color:red !important` — arbitrary CSS, written by
      anyone who can edit a post, in a stylesheet served to every visitor. And
      `red` in a padding field shipped as `padding-top:red !important`.

      Fixed with a positive allowlist in `Generator::is_value()`: a preset
      reference, a number with an optional unit, one of `calc`/`min`/`max`/
      `clamp`/`var` (nesting checked, so `calc(url(x))` is refused), or one of
      the global keywords plus `auto`. Everything else is dropped before the
      value is hashed, so it cannot inherit into narrower bands either. 38 cases
      in `GeneratorTest`, and re-checked on the page: `color` and `red` gone,
      `0` / `30rem` / `1vw` / `calc(100% - 2rem)` all still emitted.
- [x] Give a block a preset spacing value through core's own control, then open
      the Spacery panel at a tier. **Two halves, and they answer differently —
      that is the point of the box.**

      *Inherited* (the value is on the block's own `style`, nothing authored at
      this tier): the box opens in **`px`**, four number fields, each empty side
      showing the preset's **name** as its placeholder — `Regular` for
      `var:preset|spacing|50` on Twenty Twenty-Five. Type `24` in a field: it
      must store **`24px`**. Seen on 16 September.

      *Held* (a preset authored at this tier): the box opens in **custom**,
      four text fields, with the `A length, calc() or a preset…` help line.
      Seen on 16 September.

      **History, because this box has been wrong in both directions.**
      It was first written expecting custom mode in *both* halves, and the
      first run disproved the then-code: the box opened in `px` with
      `var:preset|spacing|60` inside an `input[type=number]`, beside a sibling
      side reading a tidy `24`. The custom box's own help text already said "a
      length, calc() or a preset"; only the unit resolution had missed it.

      That fix (D22) covered a second, worse case: `unitFor()` checked for an
      unholdable value *last*, so a box **storing** `var:preset|spacing|50` on
      one side and `10px` on another opened in px and rendered the preset as an
      **empty** field — invisible, still applied, and overwritten by the next
      linked edit. That mixture is what a takeover produces from a block whose
      author set one side from core's preset list and typed the other. A unit
      test asserted the old order and had to be reversed; it carried no reason,
      and the test directly above it stated the principle it violated.

      **Then D22 was half wrong, and D37 took that half back.** Its rule ran
      "whoever supplied it", which extended custom mode to *inherited* values —
      and core's padding control stores a preset by default, so every tier of
      every ordinarily-padded block opened in a mode its author never chose. In
      that mode a field takes a whole CSS value, so typing `24` stored `24`,
      which the allowlist accepts and the browser drops. The rule is about what
      a box **holds**. An empty box reads its inherited values with
      `inheritedUnit()`, which can never return custom, and an inherited preset
      is shown by name rather than by reference.

      **So the expectation above is the third one this box has carried.** If it
      fails, check the box against `length.ts` before believing it.
- [x] On a set whose tiers land on distinct device widths the selector shows
      icons; on one where two tiers would share an icon it falls back to names.
      Hovering an icon must still name its tier. Both halves seen on 14
      September without setting anything up: Spacery's own preset
      (1280/1024/782/480) renders four `<svg>` segments carrying no text, and
      the playground's own custom set (11920/1300/888/450) renders the four
      names instead — `iconsAreDistinct()` is what switches them. Each icon
      segment's accessible name is its tier (`Desktop`, `Laptop`, `Tablet`,
      `Mobile`), read off `aria-label`; the visible tooltip comes from the same
      `label` prop but was confirmed as the accessible name rather than by
      hovering for a screenshot.
- [x] Set a value at the widest tier, then a different one at a narrower tier.
      The narrower one must win in the editor preview *and* on the front end.
      **Front end: passes.** With `widescreen 1400`/`desktop 1250`/`laptop
      1000`/`handheld 500` and a block carrying `widescreen: 10px` and
      `laptop: 40px`, the emitted bands are `(1250 < w <= 1400) => 10px`,
      `(1000 < w <= 1250) => 10px`, `(500 < w <= 1000) => 40px`,
      `(w <= 500) => 40px`. The narrower value wins in its own band and
      inherits downward; it never reaches the wider ones.
      **Editor preview: passes, 15 September (D36).** Re-run against the site's
      own eight-tier set with `br-11: 10px` and `br-7: 40px` over a base of
      `5px`, reading the computed value in the canvas at four widths:
      **1700px → 10px** (the `br-11` band), **900px → 40px** (the `br-7` band,
      the narrower value winning), **600px → 40px** (inherited downward), and
      **2200px → 5px** — the base, because `10px` never reaches a wider band.
- [x] Set a value at a middle tier only. Narrower tiers should inherit it; wider
      ones should not. **Front end: passes.** A block carrying only
      `laptop: 20px` emits `(500 < w <= 1000) => 20px` and `(w <= 500) => 20px`
      and *nothing at all* in the two wider bands. Confirmed a second time by
      Group A, whose `desktop`-only preset value starts at the desktop band and
      is absent from `widescreen`. **Editor preview: passes, 15 September
      (D36).** A Group carrying only `br-6: 44px` over a base of `11px` emits
      exactly two bands in the canvas — `br-6` and `br-5` — and the computed
      value reads `44px` at 700px and at 400px, `11px` at 1222px.

> **The two boxes above were blocked for a day, and the blocker is worth
> keeping.** On 14 September, trying to check their "editor preview" half found
> that **there was no preview** — `register.tsx` had exactly two filters, and
> `PLAN.md` §3.3 plus M4's exit criterion had both been claiming otherwise since
> they were written. It was not a bug in built code; the code was never written.
>
> **Why it went unnoticed:** the *spacer block* does preview. Its `edit.tsx`
> resolves `heightAt()` for the canvas tier and applies it through
> `useBlockProps`, and `spacer.spec.ts` tests it. The half of the plugin with a
> preview was the half that was tested, and the half without one was the half
> nothing looked at.
>
> Spiked the same day (`preview-spike.md`), built on 15 September (D36), and
> both boxes now pass on both halves. The E2E test M4 claimed exists does now.
- [x] Reset one box. Only that property clears, and its fields fall back to the
      inherited values rather than to zero. On a Group at `tablet` holding
      `padding.top` and `margin.top`, clicking **Reset Padding** left
      `{margin:{top:'7px'}}` and removed padding alone; the `desktop` tier was
      untouched; and the four padding fields came back showing their *inherited*
      placeholders per side — `var:preset|spacing|50`,
      `var(--wp--preset--spacing--40)`, `2rem`, and an empty Left because
      `desktop` sets none — with empty values, not zeros. (Observed before D37.
      The box holds nothing after a reset, so the preset side now reads
      `Regular` and the box takes a unit rather than dropping to `css`. What
      this box tests — inherited, not zero — is unchanged.) "Reset all"
      disappeared in the same moment, the gate closing in both directions.
- [x] A box with nothing set at this tier shows no reset button at all. At a
      tier with nothing authored the panel offers **no** reset controls of any
      kind — `isAuthored(sides, values)` gates the per-box button and
      `authoredBoxes > 1` gates the tier one.
- [x] "Reset all" appears only once *both* padding and margin hold values at the
      tier — on a block supporting one of them it must stay hidden, or it
      duplicates the box's own reset. Padding alone at a tier gives
      `["Reset Padding"]`; adding margin gives
      `["Reset all","Reset Padding","Reset Margin"]`. On a **Column** — which
      declares `padding` and `blockGap` but not `margin`, so only one box can
      ever be authored — two authored padding sides still give
      `["Reset Padding"]` and no "Reset all" at all.
- [x] Undo/redo across a takeover and a reset. Nothing half-applied. Both
      checked after a save, so the undo level had a clean boundary — **without
      one, a programmatic edit and the click that follows it coalesce into a
      single level and the test reads as a failure that is not one.**

      *Reset:* a tier holding `top` and `bottom` reset to nothing; undo brought
      **both sides back together**; redo removed both again.

      *Takeover:* the real thing this box is about, because two attributes move
      at once. Before, `style['@tablet']` held `top` and `bottom` and `spacery`
      was empty. After one click, `style['@tablet']` was gone and
      `spacery.tablet` held both. Undo restored `@tablet` **and** emptied
      `spacery` in the same step; redo moved both again. At no point did the
      value sit in both places or in neither — which is exactly what the single
      `setAttributes()` in `TakeoverNotice` exists to guarantee, and the first
      time it has been observed rather than reasoned about.

## 3. Editor, responsive editing off

`wp-content/mu-plugins/spacery-no-responsive.php`:

```php
<?php
add_filter( 'block_editor_settings_all', function ( $settings ) {
	$settings['responsiveEditingEnabled'] = false;
	return $settings;
} );
```

- [x] The tier selector still works, with a line saying the canvas does not
      follow along. **This section found a defect, and the defect was that the
      section could not run at all.** With the mu-plugin in place the panel
      behaved exactly as though responsive editing were still on: no notice, and
      the "canvas is still previewing X" line shown as usual — a line that is
      false when the canvas follows nothing.

      The mu-plugin was loading (proved with a marker in `admin_footer`) and the
      filter was running. The cause was hook ordering inside
      `includes/Editor/Settings.php`. `capture_settings()` reads core's flag on
      `block_editor_settings_all` at priority 999; the payload was encoded and
      attached on `enqueue_block_editor_assets` at priority 20. **Measured on
      this 7.1 install, `enqueue_block_editor_assets` fires *first*** — a probe
      recording both hooks printed `enqueue_block_editor_assets THEN
      block_editor_settings_all`. So `wp_json_encode()` ran while
      `$responsive_editing` still held its initialised `true`, and
      `responsiveEditingEnabled` was published as `true` on every site,
      whatever the site said. The comment on the filter — "Late, so anything
      else that filters the value has already run" — was right about the
      *priority* and wrong about the *hook*.

      What made it invisible: the value was correct in `$settings['spacery']`,
      which `capture_settings()` also writes and which JavaScript cannot read
      (the editor's allow-list drops it), and stale in the global, which it can.

      Fixed by attaching the payload from inside `capture_settings()` itself,
      guarded by an `$attached` flag because the filter can run more than once.
      Proved safe in both directions before changing anything: a probe attaching
      an inline script from inside that filter *did* reach the page, because the
      block editor prints its scripts in the footer, and the handles are already
      registered by then. After the fix, on the real screen: "Responsive editing
      is switched off for this site, so the canvas does not follow along." —
      and the "still previewing" line correctly gone.
- [x] Values set through it land in the same places and render identically.
      Selected `tablet` in the selector with responsive editing off and typed
      into the field: the value landed at `spacery.tablet.spacing.padding` as
      always (all four sides, the box being linked by default per D18), and the
      front end emitted `(450px < width <= 888px) => 17px` and
      `(width <= 450px) => 17px` with the base value still inline and
      un-`!important`ed. Identical to the responsive-editing-on path.

Delete the file afterwards; it changes every later section if left in place, and
a stale mu-plugin is invisible in the admin. **Deleted on 14 September** —
`mu-plugins/` holds only `spacery-dev-reset.php` again.

`tests/php/SettingsTest.php` now covers this, firing the two hooks in the order
WordPress really fires them. Against the pre-fix arrangement it fails two of its
six assertions — the payload carrying a filtered `false`, and nothing being
attached on the asset hook alone — while the other four pass either way,
including the one showing the server-side mirror was right all along. Three
stubs were added to `tests/php/bootstrap.php` for it: `wp_add_inline_script()`,
`wp_script_is()` and a minimal `WP_Block_Type_Registry`.

## 4. Takeover (D11)

Give a block a core `@tablet` padding through the editor's own responsive
control.

- [x] The notice counts the values correctly and singular/plural reads right.
      One core `@tablet` value gives "WordPress already sets 1 value here for
      narrower screens."; three give "3 values". **One thing that looks like an
      undercount and is not:** a core `@mobile` *margin* on a Column is not
      counted and its viewport is not named, because `core/column` supports
      `padding` and `blockGap` but not `margin`, so margin is not among the
      paths `coreOverrides()` is given. Spacery counts only what it offers a
      control for. Re-run with a padding value and the viewport appears.
- [x] "Manage these in Spacery" moves them, and afterwards exactly one rule sets
      that property at that width — check the front-end CSS, not just the panel.
      Checked on the front end, not the panel: before, `style` held
      `@tablet {padding top/bottom}` and `@mobile {padding left}`; after one
      click `style` held only the base `spacing.padding` — **both viewport keys
      gone with no husk of empty objects** (`clearPath()` prunes ancestors) —
      and `spacery` held `tablet` and `mobile` with the same values. On the
      page, enumerating every rule in every stylesheet that matches the block
      and sets `padding-top`: at `(480px < width <= 782px)` there is **exactly
      one**, `.spy-74a5ab171955 { padding-top: 2rem !important }`, and core
      emits nothing at that width at all. The base value stays where it was, as
      an inline `padding-top: var(--wp--preset--spacing--60)` with no
      `!important` — §3.3a's rule that only media-query overrides get it.
      The tablet value also materializes into `(width <= 480px)` per D13, which
      is the widening the notice warns about above the button and is a
      different width, so the box's claim still holds.
- [x] With a custom set whose widths do **not** match core's, the notice must say
      which viewports it is leaving alone and why, rather than offering a move it
      cannot make. **This is the default state of this playground**, which is
      worth knowing before you start: the stored set is
      `tablet 888px`/`mobile 450px` and core's are 782/480, so *nothing* is
      movable and the button never renders. Seen: "Leaving Tablet to WordPress:
      no Spacery breakpoint covers the same widths." — and with two viewports
      carrying values, "Leaving Tablet, Mobile to WordPress: …". To reach the
      two boxes above you must switch the source to Spacery's own preset, whose
      `tablet 782px` and `mobile 480px` match core by design; switch back
      afterwards.

## 5. Front-end CSS (D13, D14)

View source. Spacery's declarations belong in
`<style id="wp-style-engine-spacery-inline-css">`.

- [x] **Block theme** (Twenty Twenty-Five / -Four / -Three, all three installed):
      the tag is in `<head>`.
- [x] **Classic theme** — Twenty Twenty-One installed and activated on
      14 September. **The claim this box makes is wrong, and the code is right.**
      The tag is **not** in `<head>`: it is a direct child of `<body>`, twelfth
      of fifty-one children — sitting *immediately after*
      `core-block-supports-inline-css`, **which is not in the head either**.

      Core's own late styles are in the body on this site, so Spacery is being
      placed exactly where core places its own, which is precisely what D14
      asked for. **The half of this box that actually tests Spacery — "must not
      be printing it anywhere itself" — passes**, and the position beside core's
      own tag is the evidence: a handle Spacery had printed directly would not
      land there.

      Why the hoist does not run, probed rather than reasoned:
      `wp_hoist_late_printed_styles()` exists in 7.1 but is registered only
      inside `wp_load_classic_theme_block_styles_on_demand()`, behind two gates.
      On this site both are shut — `wp_should_load_separate_core_block_assets()`
      and `wp_should_load_block_assets_on_demand()` are both **false**,
      `has_action( 'wp_template_enhancement_output_buffer_started',
      'wp_hoist_late_printed_styles' )` is **no**, and
      `wp_should_output_buffer_template_for_enhancement()` is **false** so no
      buffer would start regardless. No plugin is interfering: the callback
      lists on both `should_load_*` filters are empty.

      **What this means for 1.0, and it is not nothing.** On a classic theme
      where that path is off, Spacery's spacing CSS is printed in the body,
      after first paint. Core's block-support spacing has the same behaviour on
      the same page, so Spacery is no worse than the platform — but §3.3a and
      D14 both state the head placement as a settled fact, and it is
      conditional. Corrected in `PLAN.md`.
- [x] Bands are disjoint (`480px < width <= 782px`), widest first, and never
      overlap a core `@mobile` value. Disjoint and widest-first confirmed on a
      real page — `(1300px < width <= 11920px)`, `(888px < width <= 1300px)`,
      `(450px < width <= 888px)`, `(width <= 450px)`, in that order, every
      declaration `!important` per §3.3a. **The core `@mobile` half, finished on
      14 September** with a block carrying a Spacery `tablet` value *and* a core
      `@mobile` padding at once. No partial overlap: at
      `(480px < width <= 782px)` only Spacery's rule exists, and core's
      `@mobile` rule is confined to `(width <= 480px)` — the bands are identical
      in shape, which is what D13 bought. Where both *do* land on
      `(width <= 480px)` (Spacery's materialized tablet value against core's
      own), both are `!important` at one class of specificity, so **source order
      decides** — and Spacery's tag is emitted immediately after core's, so
      Spacery wins. Worth noting the competing rule comes from
      `core-block-supports-inline-css`, not the `global-styles-inline-css` that
      §3.3a names; both precede Spacery's, so the conclusion holds, but they are
      different code paths and could drift apart.
- [x] Two blocks with identical spacing share one rule.
- [x] A page with no Spacery values emits no Spacery stylesheet at all.

## 6. The Spacer block

- [x] Insert **Spacery**, set a different height per tier, check the front end at
      each width. The block's panel carries the same tier selector as the
      spacing panel — stepping through tiers there must not move the canvas.
      With `desktop: 300px` and `tablet: 40px` against the playground's four
      tiers, the page emits `(1300px < width <= 11920px) => 300px`,
      `(888px < width <= 1300px) => 300px`, `(450px < width <= 888px) => 40px`,
      `(width <= 450px) => 40px` — each authored value in its own band and
      inherited into the narrower one — with the base `100px` left as an inline
      height. Clicking a tier left the canvas at 1222px, unmoved.
- [x] With a tier selected that the canvas is not previewing, the block's own
      preview height must still be the canvas's, not the selected tier's.
      Selecting a tier says which value you are writing, never what the page
      looks like. **The clearest demonstration in the whole pass.** Canvas at
      1222px — the `laptop` band, which has no authored height and inherits
      `desktop`'s `300px`. Selecting `tablet` (`40px`): the header became
      `tablet · ≤888px`, the line read "The canvas is still previewing laptop.",
      the height field showed `40` — and the block in the canvas stayed
      **300px**. Editing one tier while previewing another, said in three places
      at once and contradicted in none.
- [x] Its own margin controls still work alongside the height. `margin
      11px/22px` set through core's own control sits as an inline style on the
      wrapper and is unaffected by the per-tier heights, in the editor and on
      the page. The block declares `supports.spacing.margin` for top and bottom
      only, so those are the two controls offered.
- [x] It never appears in the Spacery inspector panel — the block is excluded
      from the extension, but still renders its own CSS. Those are two separate
      lists in `Blocks\Supported`, and conflating them once already broke the
      block's own output. Verified from both sides at once:
      `spacerySettings.excludedBlocks` is exactly `["spacery/spacer"]`, the
      selected block's inspector holds **zero** "Spacery" panels
      (its own `Height`, per-tier and `Set at` panels instead), and the same
      block on the page carries a `spy-` class with four height bands. Excluded
      from the panel, included in the styling.

**Worth recording alongside the §3 finding:** this section is the half of the
plugin that *does* preview. `edit.tsx` resolves `heightAt()` for the canvas tier
and puts it on `useBlockProps`, which is why the 300px above is correct and
live. The spacing extension has no equivalent — see the warning in §2 and
[`preview-spike.md`](preview-spike.md). Running §6 immediately after §2 is the
clearest way to see the asymmetry.

## 7. Third-party blocks and the deny-list (D6)

The site has Elementor and WP Book Bar, but Elementor is a page builder rather
than a block library, so install something that actually registers blocks with
`supports.spacing` — Kadence Blocks or Stackable will do.

> **⚠ Stackable will not do, and this was worth finding.** Installed and
> activated on 14 September: 47 blocks, every one of which declares
> `supports: { spacing: true }` — a bare boolean. Core reads `spacing.padding`
> and `spacing.margin` out of that as **false** (`hasBlockSupport()` confirms
> both), so core gives those blocks no spacing controls either; Stackable ships
> its own spacing UI instead. Of **48 non-core blocks registered on this site,
> exactly one uses core's spacing supports — Spacery's own spacer.**
>
> So a real library may or may not exercise D6, and picking one by name in this
> document is a coin toss. The boxes below were run against a purpose-built
> third-party block registered from a mu-plugin — `manualpass/probe`, declaring
> `supports: { spacing: { padding: true, margin: true } }` — which is exactly
> what M5's exit criterion asks for ("one third-party block that was never
> explicitly supported") and is deterministic where a plugin is not. Keep the
> recipe; it is faster than installing anything.

- [x] Its blocks get the panel with no work on Spacery's part. `manualpass/probe`
      — registered in a mu-plugin, named nowhere in Spacery — came back with
      `attributes.spacery` present and the full "Spacery" panel:
      tier selector, tier heading, padding box. Nothing was added to Spacery to
      make that happen, which is D6.

      A detail worth keeping: under Twenty Twenty-One the panel showed
      **PADDING but not MARGIN**, because that theme sets
      `settings.spacing.margin` to `false` while leaving padding alone. The
      double gate — block supports *and* theme settings, per feature — visible
      in one screenshot.
- [x] Deny one with `spacery_denied_blocks` in a mu-plugin. The panel disappears
      **and** no CSS is generated for it. Measured against a baseline, which is
      the only way the second half means anything: **before** denying, the
      probe's `66px` was in the emitted stylesheet and the page carried three
      `spy-` classes; **after**, `66px` was gone, two classes remained, the
      block still rendered normally and carried no `spy-` class at all. In the
      editor `excludedBlocks` grew to `["spacery/spacer","manualpass/probe"]`
      and the panel was gone — while a core Group on the same page kept its
      panel, so the deny-list is narrow rather than a switch.

      As with deactivation, the denied block's stored values are still in its
      delimiter but no longer parsed, because the attribute is not registered.
      Inert, not destroyed — the same property §3.1 relies on.
- [x] A block whose theme has spacing switched off shows the explanatory message,
      not an empty panel. With `wp_theme_json_data_theme` filtered to set both
      `spacing.padding` and `spacing.margin` to `false`, the panel contained
      exactly two lines — "Spacery" and **"This theme has spacing
      controls switched off for this block."** — and **zero** input elements.
      Not an empty box, not a box of dead controls.
- [x] Activate Elementor and edit an Elementor page. Spacery should be inert
      there rather than noisy. Opened a throwaway page with
      `post.php?post=N&action=elementor`: `window.spacerySettings` is
      **undefined**, and there is not one Spacery `<script>` or `<style>` tag on
      the page. Spacery enqueues on `enqueue_block_editor_assets`, which
      Elementor's editor never fires, so there is nothing present to be noisy
      with. The throwaway page was deleted afterwards.

## 8. Editor stress

- [x] A post with ~200 blocks carrying values: editor responsiveness, and how big
      the emitted stylesheet actually is. **This is M2's exit criterion, and it
      is met exactly.** 200 paragraphs cycling three spacing recipes: the page
      carries 200 elements with a `spy-` class, **three** distinct classes in
      the markup and **three** rule groups in the stylesheet. Nine media queries
      in **951 bytes** — 4.8 bytes per block. Content-addressed hashing is doing
      precisely what D14 and the M2 fixture predicted.

      Editor, same post, all 200 blocks carrying values: page load 2.6s, DOM
      interactive 1.5s, and an attribute edit round-tripping in ~210ms.
      Selecting a block and opening its panel are each roughly a second of work
      on top. Usable rather than fast, on a local MAMP install — and the risk
      register's "editor performance with N tiers × many blocks" is not where
      this plugin will fall over.
- [~] Site editor, template parts, and the widgets screen — the panel should
      appear in all of them. **Widgets screen: passes.** `spacerySettings` is
      published there with all four tiers, and a paragraph inserted into a
      widget area gets the full "Spacery" panel — which is the case
      `Editor\Settings`' class comment is about, since `core/editor` is not
      registered on that screen and an allow-listed editor setting would never
      have arrived. **Site editor and template parts: not testable while a
      classic theme is active**, and Twenty Twenty-One was activated for §5.
      Switch back to a block theme and re-run these two.
- [x] Reusable block / pattern containing Spacery values, inserted twice. A
      `wp_block` holding a paragraph with `tablet: padding-top 77px`, referenced
      twice from one page: both instances render, both carry the **same**
      `spy-` class, and the stylesheet holds **one** rule group (206 bytes, two
      media queries — the authored band and its materialization). Content
      addressing survives the reusable-block indirection, which is not obvious:
      the two instances are separate blocks resolved from one stored post.

## 9. Housekeeping

- [x] Deactivate and reactivate. No notices, no orphaned CSS. Done from the
      Plugins screen: "Plugin deactivated." then "Plugin activated.", no PHP
      warning, notice, deprecation or fatal on either screen. **With Spacery
      off**, the scratch page opened with all 7 blocks valid — zero invalid,
      zero `core/missing` — the `spacerySettings` global gone and no panel
      anywhere. **Reactivated**, both Groups' `spacery` attributes came back
      intact out of the block delimiters, `calc()` and preset reference and
      all, and the stored breakpoint set was untouched. That is §3.1's central
      promise — no markup is written, so there is nothing to orphan —
      demonstrated end to end rather than argued.

      **One caveat worth knowing, inherent to the design rather than a defect:**
      while the plugin is deactivated the attribute is not *registered*, so the
      editor does not parse it and a **save in that state would re-serialize the
      block without it**. The JSON survives being *read*; it does not survive
      being *rewritten*. Nothing was saved during this check, deliberately.
- [x] Note that there is no `uninstall.php` — `spacery_breakpoint_source` and
      `spacery_custom_breakpoints` survive deletion. Decide whether that is what
      you want before submitting. **Decided, and built: D24.** There is an
      `uninstall.php` now, and it does nothing unless the site asked. A third
      option, `spacery_delete_data`, off by default, is offered as one checkbox
      under *When you delete Spacery* on the settings screen.

      The reasoning is the one this box was really asking about: deleting the
      breakpoints is not neutral cleanup, because they are the key every stored
      block value resolves through. Lose them and a reinstall falls back to the
      preset — the same four slugs at different widths — and the spacing quietly
      changes, or vanishes if the slugs differed. Same damage `rename-spike.md`
      refuses to risk for a rename.

      Three things found while building it, each already fixed:

      - The checkbox rides the screen's existing save cycle rather than writing
        on click. A screen with two save models is one where nobody knows which
        half of it Discard undoes.
      - `saveHint()` did not know about it, so ticking the box lit a **primary,
        enabled Save button beside the words "No changes to save."** The control
        and its own caption disagreeing is worse than either being absent.
        `validate.test.ts` now covers it.
      - The option stores `'1'`/`'0'`, not a boolean. WordPress writes boolean
        `false` into a varchar column and it reads back as `''`, which
        `rest_is_boolean()` rejects — so `/wp/v2/settings` answered **`null` for
        exactly the site that had opted out**, contradicting its own schema.
        Measured on the live screen (`raw: ""`, `is_rest_bool: false`), fixed,
        and re-measured (`raw: "0"`, `is_rest_bool: true`, endpoint returns
        `false`).

      Checked on the real screen, both ways round: tick → Save enables with the
      right sentence → saves → survives reload; untick → Discard restores the
      stored value. `uninstall.php` itself cannot be exercised without deleting
      the plugin, so what is asserted instead is that it names the three options
      the code registers, loads no plugin code, and guards
      `WP_UNINSTALL_PLUGIN` — `OptionsTest`.
- [x] Check `wp-content/debug.log` at the end, not only the screen. Any
      `_doing_it_wrong`, deprecation or PHP notice is a finding, including ones
      core raises about translation timing. **Zero Spacery entries in the whole
      file** — `grep -ic spacery` returns 0 — across two sessions of editor,
      settings-screen, front-end, takeover, deactivation and reactivation work.
      Nothing was appended on 14 September at all. In particular no
      `_doing_it_wrong` about translation timing, which is the one D20 accepted
      a risk on by keeping `load_plugin_textdomain()`.

      The file is not empty, and none of it is ours: 5 fatals and 5 warnings are
      an unrelated plugin (`folderfolio`) failing to load its autoloader on
      11 September, and 66 more are `mysqli_real_connect()` failing because
      MAMP was not running. Worth knowing so the counts do not alarm the next
      reader.

## Recording what you find

Anything that turns out to be a bug wants a failing test before the fix, in the
suite that should have caught it — that is what has kept the CI rounds honest so
far. Anything that turns out to be a decision belongs in `PLAN.md` §8 with its
reasoning, not in a commit message alone.
