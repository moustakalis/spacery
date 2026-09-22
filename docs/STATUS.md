# Spacery — state of the repo

**Read on:** 12 September 2026, from `~/Documents/GitHub/spacery` on `main`.
**Revised:** 22 September 2026.
**Companion to** [`PLAN.md`](PLAN.md) (architecture and decisions) and
[`submission.md`](submission.md) (the runbook, and the one authoritative status
line). This file is the state: what is built, what is known to be wrong, and
what is worth knowing before touching it.

**This file lives in the repository as `docs/STATUS.md`, and the Project's
`claude/spacery-status.md` is a copy of it.** Edit the repo file and mirror it;
until 22 September 2026 it existed only in the Project, which meant every edit
cost a 45KB retype and it therefore went unedited. That is why §1 below spent
two releases claiming 1.0.0 was the live version.

---

## 1. Where it stands

> ## Read this box before anything else.
>
> **Spacery 1.0.2 is released**, deployed 21 September 2026 at SVN `r3705502`
> from the tag `v1.0.2`. It is in the WordPress.org directory at
> `https://wordpress.org/plugins/spacery/`. 1.0.0 shipped on 19 September
> (`r3703665`), 1.0.1 on 20 September (`r3704615`).
>
> **`docs/submission.md` is the source of truth for that state**, not this file.
> It opens with a status line and a routing table; check that line first. This
> file is a history, and a long one, so do not infer the project's status from
> anything below.
>
> **1.0.2 is a security release**, and `docs/security-audit.md` is the audit
> that produced it — a full pass against the WordPress Security API, run on
> 21 September. One defect: a hand-written `spacery` block attribute could raise
> an uncaught `TypeError` inside `render_block`, which is a fatal on every page
> holding that block, triggerable by anyone who can edit a post. §3duodetricies
> is the account and D40 is the decision. Nothing else failed.
>
> **The release itself is recorded in `docs/submission.md` §4**, which is a
> phased plan rather than a checklist: what is irreversible and why the order
> follows from it, the six workflow steps in order, the four `svn` commands that
> verify a deploy, and a failure-mode table that says for each row whether
> anything has been published yet. Read it before the next release; every phase
> has been walked three times now.
>
> **Before reopening any design question, read its row in `PLAN.md`'s decision
> table (D1–D40).** Several record a rule that was corrected once already, and
> say what the correction was — D20, D21, D22, D37 and D38 twice over. The rest
> of this file is the same thing at length: what was found, how, and what it
> cost.

**One thing about the release machinery is still unexercised**, and it is the
one that matters most when something has gone wrong: `deploy.sh` prints
*"already published"*, generates the zip and **exits 0** when `tags/<version>`
exists, so a re-run after a bad deploy reports success and does nothing. Three
releases in, that trap has never sprung.

**The other one has now run.** Every `release.yml` run up to 1.0.1 published
into an *empty* SVN repository; 1.0.2 was the first deploy into a populated
`trunk/`, so `rsync --delete` ran against one for the first time and did no
harm. Verified out of Subversion rather than off the workflow's summary:
`tags/1.0.2` and `trunk/` carry identical file lists, both the same shape as
`tags/1.0.1`; the three bundles are byte-identical to 1.0.1's, which is what an
unchanged `src/` should produce; and `trunk/includes/Styles/Generator.php`
hashes the same as the committed file, so the fix is what actually shipped.

**What happened between submission and the first release**, since those four
days are the most compressed part of this history:

- **16 September — submitted.** The zip carried the shipping files as of
  `22ff7c9`.
- **18 September — pended by the automated pre-review.** Four findings:
  guideline 11 and admin notices, bundled `.po`/`.mo` files, the
  `register_setting()` sanitizer, and `load_plugin_textdomain()`. Each was read
  against the code before being agreed with, and **two were not what they looked
  like** — §3quatervicies.
- **18 September — corrected zip uploaded, reply sent.** Three fixed, guideline
  11 answered rather than changed.
- **19 September — approved, and deployed the same night.**

**Three findings came out of those four days, and none of them was the one the
reviewer raised.** They are the entries worth reading first if you are picking
this up cold:

1. **JavaScript translations would never have loaded in any locale** — the POT
   referenced sources, and a language pack is named after the *built* path.
   §3quinvicies, D38. (Half that premise was itself wrong; D38 says which half.)
2. **"Unlimited breakpoints" was false**, in the two most visible strings the
   plugin has. §3sexvicies.
3. **`from_array()` could fatal a save**, from a `(string)` cast on an object.
   §3quatervicies.

**The state of the tree at 1.0.2:** version `1.0.2` everywhere,
`bin/check-release.py` green, `v1.0.2` tagged and deployed.

| | |
|---|---|
| PHP | 18 classes under `includes/` |
| TypeScript | ~44 files under `src/` |
| Tests | PHPUnit + core-contract suite, ~300 Vitest unit tests, 18 Playwright E2E |

**What is live now** is `docs/submission.md` §4 Phase 6: translations through
translate.wordpress.org, and the Live Preview blueprint's last half — setting
the preview to public in the plugin's **Advanced** view, which is Nick's to do.
**Everything else in that document is history.**

---

## 1a. How it got to 1.0.0

**The manual pass is finished, the last unbuilt feature is built, and Plugin
Check is clean.**

`docs/MANUAL-TESTING.md` was run for the first time on 12 September and
completed on 14 September. Across both sessions it found **five defects in code,
one feature the plan specified and nobody wrote, and six false claims in
documentation** — every one of them invisible to CI. All five defects are fixed
and pushed. The unbuilt feature was the editor preview. See §3 for the defects,
§3c for the preview, and §3quater for the claims.

**A UI/UX pass followed.** The screen's whole voice was rewritten to rules now
written down — `PLAN.md` D25 and D26, `design-system.md` §7 — and those rules
fixed a 128-character line at one end of the screen, a four-line ribbon in a
130px column at the other, a 101-character line in the ruler's note that the
string pass had not seen, a crop of two-line widows, an inspector notice that
rendered two sentences with no space between them, and a `Covers` column that
named one width on two rows and read as an overlap the CSS cannot produce.
§3septies, §3octies and §3nonies are the account. Greek was carried across in
the same pass. Item 10 was not a UI change at all — §3sexdecies, the rename that
takes the product's names off padding and margin so a second control type can
ship under them.

The six false claims, since the number is only useful if it is checkable: core
does not declare `settings.viewport`; `safecss_filter_attr()` was never in the
value path; the segmented-control threshold is four tiers and a character budget
rather than five tiers; `wp_hoist_late_printed_styles()` does not run on a stock
classic theme, so head placement is conditional; §7's own advice named a plugin
that cannot test it; and M4 recorded the editor preview as verified by an E2E
test that does not exist. **The second of those is itself half wrong** — see
§3duodetricies and D21's correction.

**`docs/MANUAL-TESTING.md` is finished**, and its own "Where this pass stopped"
section is the list of record. **49 boxes ticked, 1 partial, 0 unchecked.** Every
section §1-§9 has been run and the `uninstall.php` decision is settled (D24,
built). §2's two cascade boxes were blocked on the editor preview and passed once
it existed (D36); the last partial is §8's site-editor box, which wants a block
theme (Twenty Twenty-One is active for §5).

**The screenshots** are captures of the running plugin at a 1280px viewport, 2×,
with `== Screenshots ==` in `readme.txt` between Installation and the FAQ;
`§3unvicies` is how, and what the brief got wrong. `docs/screenshot-brief.md`
was written against the plugin as it is now rather than as `asset-brief.md` and
`asset-handoff.md` describe it — both predate D33, D34 and D36, so anyone
working from them would reproduce a panel with the wrong name, in the wrong tab,
above a canvas that does nothing.

**And the brief was, at first, the mistake it warns about.** Adding a third
document describing how to make the screenshots, beside two that described it
differently, is the failure this file spends twelve entries cataloguing. Four
documents carried a caption list and gave **three** answers — `asset-handoff.md`
gave two of them by itself, a code block with two captions under a sentence
saying there were three. `f1475a8` is the correction: `asset-brief.md` §3.3 and
`asset-handoff.md`'s screenshot sections stop instructing and point, keeping what
they still describe accurately (the design system, the icon, the banner). It also
removed three rows from `asset-handoff.md`'s *Copy into `assets/`* table that
listed screenshot files as though they had been produced — `assets/` has only
ever held the icon and the banner — and moved `asset-brief.md` §4's `wp-env`
recipe into the brief rather than deleting it with the section around it, since
it was the only copy of how to get a site to capture on.

Two things that brief settles. **D36 changed what shot 1 can be:** until the
preview existed the panel could be photographed but its effect could not, so the
brief asks for the canvas edge to survive the crop if something has to go — cause
and effect in one frame is the strongest thing the plugin has to show. And **the
three sources disagreed about the order**: `asset-brief.md` numbered them panel /
settings / spacer while `readme-screenshots.txt` and `asset-handoff.md` numbered
them panel / spacer / settings. Captions are matched to files *by position*, so
that discrepancy would have put the wrong caption under two of three images. The
written captions win, because they are the ones being pasted into `readme.txt`.
**Verified on the live listing on 19 September: three screenshots, in order,
captions correct.**

## 2. `docs/design/*.png` is the source of truth for the screen

**The most expensive mistake of this build.** `docs/design/admin-screen.png`,
`settings-screen.png` and `panel-additions.png` have been in the repo since
8–9 September, and `docs/design-system.md` names one of them in its first line.
They were never opened. All of Group E was built from the *prose*, and when the
drawings were finally read, three of four "findings" from a fresh review of the
live screen turned out to be the opening paragraph of `settings-screen.png`.

**Read the drawings before touching the screen.** What they specified, and what
`41a5e22`…`8582891` built:

- **A ruler, not a list.** 44px tall, 2px white gaps, bands from a four-stop
  blue ramp (`#142269 → #1f3399 → #2c46c9 → #3858e9`, dark/narrow →
  light/wide; a lone band is `#3858e9`), in-band 12px/600 white labels shown
  all-or-nothing, light hatching for the uncovered region, a saw-tooth
  `clip-path` on a band clamped at 2560px, an absolutely positioned axis of
  thinned ticks, and a blue-left-bordered callout. `role="img"` with an
  `aria-label` from `described()` replaced `aria-hidden`. The per-tier list is
  gone; `From:` moved into the *In use now* `CardHeader`.
- **The editor as a table** — `NAME · SLUG · UP TO · COVERS · ×` under
  11px/600/`.04em` caps in `#545454`, one right-aligned guidance line,
  `Add your first breakpoint` as the empty state.
- **Two severities.** `conflict` (`#d63638` border, `#b32d2e` help, `#fcf0f1`
  row tint) for "these two disagree"; `caution`/`incomplete`
  (`#dba617`/`#8a6616`) for "unfinished" and "that number looks wrong".
  Messages name the *other* row, and `coverage()` blames the later duplicate so
  it agrees with `validate()`.
- **The save bar**: Save left (`primary` only when dirty), a counted hint from
  `saveHint()`, `Discard` right.
- **Slug handling — hybrid**, decided against two rendered prototypes. A
  placeholder while the slug is derived from the name; a real stored value once
  saved. Rendering both models side by side produced the argument the mockups
  could not: a placeholder over a *stored* slug lies about the block attributes.
  Confirmed on the real screen — `tier-12` as placeholder before a save, as a
  value after.

`src/settings/style.scss` → `build/style-settings.css` is the plugin's first
admin stylesheet, enqueued by `Screen.php` with
`wp_style_add_data(…, 'rtl', 'replace')`. `wp-scripts` names it from the *file*:
`style.scss` in the `settings` entry becomes `build/style-settings.css`.

## 3. What the manual pass has found, and why CI could not

Four defects, all fixed, none of which any job in this repo could have caught.
The pattern is worth the space: **every one lived in behaviour that has no
assertion shape** — a colour, an attribution, the text of a stylesheet, a
control's mode.

| Commit | Defect | Why it was invisible |
|---|---|---|
| `82ecc88` | `.spacery-field--conflict` never coloured the `UP TO` border | `InputControl` is an emotion component and emotion emits its class **three times over** (`.css-HASH.css-HASH.css-HASH`, 0,3,0), so a descendant selector at 0,2,0 loses. The help text and row tint *did* work, so every text assertion passed. Needs `border-color: … !important`. |
| `6b2a970` | A `spacery_breakpoints` filter's bands drawn under "From: the breakpoints you defined" | Attribution stopped before the filter by design. Correct in every state a test set up, because no test installs a filter *and* checks the attribution. D23. |
| `f08f18d` | **A padding value could write arbitrary CSS.** `10px;color:red` shipped as `padding-right:10px; color:red !important` | The value goes straight to `wp_style_engine_get_styles()`, which passes a string through. The E2E suite asserts the *words* around the field, and the words were right. D21. |
| `dbcb9dc` | A box opened in `px` and hid a stored preset as an empty field | A unit-mode ordering, with a unit test asserting the wrong half and no reasoning attached to it. D22. |
| `605fe79` | **`responsiveEditingEnabled` was published as `true` on every site**, whatever the site set | A hook-ordering error in `Editor/Settings.php`. The flag is readable only from `block_editor_settings_all` (captured at priority 999); the payload was encoded on `enqueue_block_editor_assets` at priority 20 — and **the asset hook fires first**, measured. So the value was serialized while it still held its initialised `true`. The comment on the filter was right about the priority and wrong about the hook. Invisible because the correct value *was* written to `$settings['spacery']`, which JavaScript cannot read, and the stale one to the global, which it can — and because the one configuration it breaks (responsive editing off) is the one nothing had ever run. |

**Three of the six false claims are written up below; the other three — the
classic-theme hoist, §7's plugin advice, and M4's phantom E2E test — are in
§3quater and §3c, because each belongs beside the section that disproved it.**

- **Core does not declare `settings.viewport`.** It is a valid setting in 7.1
  (`WP_Theme_JSON::VALID_SETTINGS` carries `mobile` and `tablet`) but absent
  from `wp-includes/theme.json`, `get_core_data()`, `get_merged_data()` and
  `wp_get_global_settings()` — probed on a 7.1 install with Twenty
  Twenty-Five, which declares none either. Re-confirmed on the settings screen
  on 14 September: the theme radio reads "This theme — it declares no
  breakpoints". So `Registry::CORE_DEFAULT_VIEWPORT` is the **normal** path,
  not the fallback its docblock claimed, and every takeover offer is measured
  against two written-down numbers. `PLAN.md` §D2, `FILTERS.md` and
  `readme.txt` all said or implied that a site follows core out of the box.
  Corrected.
- **`MANUAL-TESTING.md` asserted `safecss_filter_attr()` drops a bad
  declaration.** That assumption is what made the injection checkbox worth
  writing and what made its failure surprising. **And the correction was itself
  half wrong**: the function does not run where the value is *read*, and it does
  run over the finished stylesheet — where its own allowlist contains `color`
  and would have passed the injection anyway. §3duodetricies, D21.
- **The segmented/dropdown threshold is four, not five — and it is not a tier
  count.** Found on 14 September by reading `segments.ts` against the box that
  tests it. `MANUAL-TESTING.md` §2 said "with five or fewer tiers the selector
  is segmented" and `PLAN.md` D17 said "up to five tiers and a dropdown
  beyond". Both predate Group C (`00731bd`, "budget the segments"), which moved
  to `MAX_LABEL_SEGMENTS = 4` **plus a 36-character label budget**, because
  counting tiers alone was the bug: `Sm`/`Md`/`Lg`/`Xl` and
  `Widescreen`/`Desktop`/`Laptop`/`Handheld` are both four labels and only one
  fits a 250px inspector column. `MAX_ICON_SEGMENTS` is 4 too, matching the
  four glyphs that exist. **This one had teeth: an author running the box as
  written would have set five tiers, seen a dropdown, and logged a defect that
  is not there.** Both documents corrected; `tests/unit/segments.test.ts`
  already asserted the real behaviour.

**The lesson for the remaining sections:** a checkbox that explains *why* it
exists is worth more than one that states an expectation, because the
explanation is what reveals the wrong assumption when the box fails. The
segments finding adds a second lesson: a checkbox also has to be re-read against
the code when the code moves under it, or it starts manufacturing false
findings of its own.

## 3a. §4, the takeover — DONE, and what it took

**Finished 14 September.** It was the largest untested thing in the plugin, the
only feature that rewrites the author's content, and it behaved correctly in
every case tried. Worked out first by reading `takeover.ts`,
`TakeoverNotice.tsx` and `Registry::core_viewports()` before touching the
editor, which is what revealed that **the section splits in two and the order
matters.**

`canTakeOver()` requires a Spacery tier that shares core's slug *and* core's
boundary. Core's boundaries here are `CORE_DEFAULT_VIEWPORT` — `tablet 782px`,
`mobile 480px` — because the site declares no viewport and `core_viewports()`
falls back to it (its docblock is explicit that an absent answer "would silently
turn every takeover offer off").

The playground's stored set is `desktop 11920px`, `laptop 1300px`,
`tablet 888px`, `mobile 450px`. **Not one of those matches core**, so with the
set as it stands every override is `stuck` and the button never renders.

- **Box 3 — the non-matching case — was testable exactly as the site sits**, and
  is the box the current fixture was built for. Seen: "Leaving Tablet to
  WordPress: no Spacery breakpoint covers the same widths.", and with two
  viewports, "Leaving Tablet, Mobile to WordPress: …". No button, correctly.
- **Boxes 1 and 2 needed the source switched to Spacery's own preset**, whose
  `tablet 782px` and `mobile 480px` match core by design (that anchoring is the
  point of the preset — see §3.2 of the plan). Switched, took over, switched
  back, and restored the custom set including its deliberate `11920px` typo.

**What the takeover did:** one click moved `@tablet {padding top,bottom}` and
`@mobile {padding left}` out of `style` and into `spacery.tablet` /
`spacery.mobile`, leaving the base `spacing.padding` untouched and **no husk of
empty objects** behind. On the page, enumerating every rule in every stylesheet
that matches the block and sets `padding-top`, there was **exactly one** at
`(480px < width <= 782px)` and core emitted nothing at that width at all. The
base value stayed inline and un-`!important`ed.

**Counting has one honest-looking trap.** A core `@mobile` *margin* on a Column
is neither counted nor named, because `core/column` supports `padding` and
`blockGap` but not `margin`, so margin is not among the paths `coreOverrides()`
is handed. Spacery counts only what it offers a control for. It reads as an
undercount and is not one.

What the unit suite already proves, so do not re-test it by hand:
`tests/unit/takeover.test.ts` covers the matching case, the shifted-boundary
refusal, the no-matching-slug refusal, the empty-core-viewport refusal,
immutability, and merging into spacing the author already set. `clearPath()`
prunes empty ancestors, so a taken-over `@tablet` leaves no husk behind.

What no test reached, and what the section was therefore *for*: the notice's
counting and singular/plural as rendered, and the front-end claim that exactly
one rule sets the property at that width. Both now checked on a real page. **The
Greek plural is still unchecked** — the locale job covers rendering, not the
plural form of this string.

## 3b. The cascade tie, measured

§5's half-finished band box is finished too, and it produced the one genuine
correction to the plan this session. With a Spacery `tablet` value and a core
`@mobile` value on one block, the bands do not partially overlap — at
`(480px < width <= 782px)` only Spacery's rule exists, and core's is confined to
`(width <= 480px)`, which is what D13's identical band shapes bought. Where both
*do* land on `(width <= 480px)` — Spacery's materialized tablet value against
core's own — both are `!important` at one class of specificity, so **source
order decides**, and Spacery's tag is emitted immediately after core's.

**The correction:** §3.3a says Spacery's stylesheet "is enqueued after global
styles". The rule that actually competes is not in `global-styles-inline-css` —
it is in `core-block-supports-inline-css`. The document order is
`global-styles` → `core-block-supports` → `wp-style-engine-spacery`, so the
conclusion holds, but it rests on two orderings rather than the one the section
named, and those are filled by different code paths. Noted in `PLAN.md` §3.3a.

## 3bis. §3 found a defect by being unable to run

Worth its own note, because the shape recurs. Running §3 meant switching
responsive editing off with a `block_editor_settings_all` filter — and the panel
carried on exactly as before: no "switched off" notice, and the "canvas is still
previewing X" line still shown, which is false when the canvas follows nothing.

The mu-plugin was loading (proved with an `admin_footer` marker) and the filter
was running. The defect was the ordering above. **The section could not be run
until the thing it was testing was fixed**, which is the strongest argument
there is for running sections nobody has run: D12's fallback selector exists for
exactly one configuration, and that configuration had never once reached the
browser.

Fixed by attaching the payload from inside `capture_settings()`, guarded by an
`$attached` flag because the filter can be applied more than once. Both halves
were proved before changing anything: a probe attaching an inline script from
inside that filter *did* reach the page (the block editor prints its scripts in
the footer) and the handles are already registered by then.

`tests/php/SettingsTest.php` now covers it, firing the hooks in WordPress's real
order. Run against the pre-fix arrangement it fails two of six — the payload
carrying a filtered `false`, and nothing being attached on the asset hook alone
— while the other four pass either way, including the one proving the
server-side mirror was right all along. Three stubs were added to
`tests/php/bootstrap.php`: `wp_add_inline_script()`, `wp_script_is()` and a
minimal `WP_Block_Type_Registry`. **PHPUnit itself cannot install in this
environment, so the six assertions were executed as a plain PHP script against
the same stubs**; the whole suite can now be run here through a shim
(§3duodetricies), and CI is still the first place PHPUnit proper runs.

`Editor/Settings.php` carries no translatable strings and the POT references
none, so this change does **not** make the POT stale.

## 3ter. What §6 and §9 settled

**§6, the spacer block — all four boxes, and it is the control group for §3c.**
With `desktop: 300px` and `tablet: 40px` the page emits each authored value in
its own band and inherits it into the narrower one. Selecting a tier the canvas
is not previewing is the clearest demonstration in the pass: canvas at 1222px
(the `laptop` band, inheriting `desktop`'s 300px), select `tablet`, and the
header says `tablet · ≤888px`, the line says "The canvas is still previewing
laptop.", the field shows `40` — and the block stays **300px**. The canvas does
not move. And the block is in `excludedBlocks`, has zero "Spacery"
panels, and still carries a `spy-` class with four height bands: excluded from
the panel, included in the styling, which is the two-lists claim verified from
both sides.

**§9 — deactivate and reactivate, and the log.** Off: all 7 blocks valid, zero
`core/missing`, global gone. On again: both Groups' attributes back out of the
delimiters intact, `calc()` and preset and all, breakpoint set untouched. No PHP
output on either screen. One caveat, inherent rather than a defect: with the
plugin off the attribute is not registered, so **saving in that state would
re-serialize the block without it** — the JSON survives being read, not being
rewritten. **This is now in `readme.txt`'s FAQ**, where a user can see it, since
it is the one way Spacery's values can actually be lost.

`debug.log` holds **zero** Spacery entries across both sessions, including no
`_doing_it_wrong` about translation timing, which is the risk D20 knowingly
took. Its 5 fatals and 71 warnings are an unrelated plugin and MAMP being down.

## 3quater. §5 and §7 each corrected a claim; §8 confirmed one

**§5's classic theme — the doc was wrong, the code was right.** On Twenty
Twenty-One the Spacery tag is in the **body**, not the head. It is not a
Spacery defect: it sits immediately after `core-block-supports-inline-css`,
which is in the body too. `wp_hoist_late_printed_styles()` exists in 7.1 but is
registered only inside `wp_load_classic_theme_block_styles_on_demand()`, behind
two gates, and on a stock install both are shut —
`wp_should_load_separate_core_block_assets()` and
`wp_should_load_block_assets_on_demand()` both false, the action not hooked, and
no output buffer would start anyway. No plugin was interfering. **D14 is
vindicated by the very case that looked like a counter-example**: core places
Spacery's CSS exactly where it places its own. What was wrong is §3.3a and D14
stating head placement as settled when it is conditional — corrected in
`PLAN.md`. The consequence to know: on such a site spacing CSS arrives after
first paint, as core's own does.

**§7 — the test document named a plugin that cannot test it.** Stackable's 47
blocks all declare `supports: { spacing: true }`, a bare boolean that core reads
as neither padding nor margin; Stackable ships its own spacing UI. Of 48
non-core blocks on the site, exactly one uses core's spacing supports — Spacery's
own spacer. So §7 was run against a purpose-built third-party block registered
from a mu-plugin, which is what M5's exit criterion actually asks for and is
deterministic where a plugin is not. All four boxes then passed: the panel
attaches with no work, the deny-list removes both panel and CSS (measured
against a baseline) while leaving core blocks alone, a spacing-disabled theme
gets the explanatory sentence and zero inputs, and Spacery is entirely absent
from Elementor's editor.

**§8 confirmed M2's exit criterion exactly.** 200 blocks sharing three recipes
emit **three** rule groups — 951 bytes, 4.8 per block. A reusable block inserted
twice gives both instances the same class and one rule group. Editor with 200
value-carrying blocks: 2.6s load, ~210ms per attribute edit. **This is now a
selling point in `readme.txt`**, and it is the only performance number the
listing makes.

## 3quinquies. D24 — the uninstall question, decided and built

§9's last box was a decision, not a test, and it is now `uninstall.php` plus an
opt-in checkbox. **Deleting is off by default**, because removing the stored
breakpoints is not neutral cleanup: they are the key every stored block value
resolves through, so a site that loses them and reinstalls falls back to the
preset — the same four slugs at different widths — and its spacing quietly
changes, or vanishes if the slugs differed. Same damage `rename-spike.md`
refuses to risk for a rename.

Shipped: a third registered option `spacery_delete_data`, one checkbox under
*When you delete Spacery* whose help text states the cost of each answer, and an
`uninstall.php` that reads that option and nothing else — no autoloader, no
plugin classes, literal option names, because it runs against files about to
disappear. `OptionsTest` guards that seam the way `BreakpointPatternsTest`
guards D19's, and also asserts the file loads no plugin code and checks
`WP_UNINSTALL_PLUGIN`.

**Three things the build itself turned up, each fixed:**

- The checkbox rides the screen's existing save cycle rather than writing on
  click. Two save models on one screen is one where nobody knows what Discard
  undoes.
- `saveHint()` did not know about it, so ticking the box lit a **primary,
  enabled Save button beside "No changes to save."** Covered now in
  `validate.test.ts`.
- **The option stores `'1'`/`'0'`, not a boolean.** WordPress writes boolean
  `false` into a varchar column and it reads back as `''`, which
  `rest_is_boolean()` rejects — so `/wp/v2/settings` answered **`null` for
  exactly the site that had opted out**, contradicting its own schema. Measured
  on the live screen (`raw: ""`, `is_rest_bool: false`), fixed, re-measured
  (`raw: "0"`, `is_rest_bool: true`, endpoint returns `false`). `'0'` is falsy
  in PHP, so `uninstall.php` reads it correctly with a bare truthiness check.

`package.json#files` gained `uninstall.php`. **`bin/check-release.py` fails
until that file is committed** — it compares against `git ls-tree HEAD`, so a
new distributable file is "missing" while untracked. That is the check working,
not a problem to route around.

## 3sexies. The POT pipeline, rebuilt in a fresh container

Seven new strings, so the POT had to be regenerated — and the whole pipeline had
to be rebuilt first, because the container is new every session. It worked, and
more cheaply than §7 suggests:

- `wp-cli.phar` downloads fine from `raw.githubusercontent.com`, and
  **`wp i18n make-pot` needed no `block-i18n.json` workaround this time** — no
  seed-schema wrapper, no reflection. Whether the egress policy changed or the
  earlier failure was incidental is unknown; try it plainly first.
- `tsc` was installed globally and passed in with `TSC=`; sources were tarred
  from the device, staged, extracted, and the tarball deleted from the repo.
  **D38 removed the transpile step entirely**, so `tsc` is no longer part of
  this pipeline — see §3quinvicies.
- **`msgmerge` is available and is far better than a hand-rolled merge script.**
  `msgmerge --no-fuzzy-matching --update` carried all 126 existing translations
  across; only the 7 new strings and the 5 deliberate blanks (plugin name twice,
  author, two URLs) were left. `msgfmt --check --statistics` validates the
  result: 133 translated.
- Greek follows the catalogue's own terms, checked against it rather than
  chosen. **Superseded by D39**, which re-read the consistency tool and aligned
  the two terms that matter to core's: `Γέμισμα` for padding, `Περιθώριο` for
  margin.
- All three handle JSONs carry the full 114-string catalogue, and the `.mo`
  carries the PHP strings. The per-handle check §7 prescribes still matters;
  it just passed. **Superseded by D38**: the payloads are named after an md5 of
  the built path now, not after handles.

**Build freshness, confirmed the hard way again:** a blanket
`find src -newer build/extension.js` listed five `src/settings/*` files, which
feed the *settings* bundle and not that one. Check per bundle or the answer is
noise. **And even per-bundle it lies** — webpack's `compareBeforeEmit` leaves an
unchanged bundle unwritten, so it keeps an old mtime. §3quinvicies.

## 3septies. The text pass — the screen's voice, and the measure nobody had

Started from two screenshots of the *Breakpoints I define below* radio and its
help sentence. The obvious reading was "shorten that sentence"; the audit found
a rule, not a fix, so the whole screen was rewritten to one. **D25 in `PLAN.md`
is the decision; `design-system.md` §7 `### Words` and `### Measure` are the
rules.** What is worth carrying forward is how each half was arrived at, because
they were arrived at differently.

**Words: argued from the strings that already worked.** `validate.ts` was the
model — every message names the field, names the other row, and stops. Six rules
came out of it and one exception (the server-refusal notice has to recite,
because it fires exactly when no field is marked). 27 strings were rewritten,
**three of them drawn verbatim in `settings-screen.png`**. That is deliberate
and D25 records it: the drawings are the source of truth for the *layout*, not
for the sentences, whose captions were written to explain a proposal to a reader
rather than to be read mid-edit in a 250px column. A future session should not
"correct" them back from the PNG.

**Measure: measured, and it caught a second fault in the opposite direction.**

- Two `CardBody` sentences ran to **128 characters on one line** at a 1502px
  viewport, while the breakpoint table's guidance line beside them read well.
  The only difference was a `maxWidth: '420px'` at `BreakpointRows.tsx:301` that
  nobody had generalized. Applying it elsewhere put every line on the screen
  inside the 45–75 band — worst case now 76 cpl, on a one-line radio label.
- **The `UP TO` column is the sharper constraint and points the other way.** It
  is a fixed `130px` in `style.scss`'s `$columns`, so help under a width field
  wraps at **~20 characters a line**. `Same width as %s. Two breakpoints at one
  width would cover the same screens.` rendered as a **four-line ribbon under a
  one-line field**; `settings-screen.png` §C draws it at five and it looks wrong
  there too. It is now `Same width as %s.`, which is affordable because the
  `Covers` cell one column over already says `Nothing — no screens left` — the
  consequence is on screen, so the message need not repeat it. The caution pair
  became `Too wide for the ruler.` / `Too wide for the ruler. Did you mean %s?`,
  both two lines.

**The technique, because it is reusable and cost nothing:** clone the live help
node, set `textContent` to a candidate string, append it beside the real one,
read `Range.getClientRects().length` for the line count, remove it. That gives
the true wrap for that exact column at that exact font, for a dozen candidates
in one call, without touching component state. It is how every figure above was
obtained, and it is faster than reasoning about `px` per character.

Greek was carried across in the same pass (26 new strings; 132 translated, the
same 5 deliberate blanks) and is **why the width-column budget is two lines and
not one** — Greek runs longer, so the suggestion variant drops the ruler from
its wording to stay inside it. Verified by probing the live node in Greek with a
long name interpolated: still two lines.

**Two things about the POT pipeline that §3sexies did not have to face.**
`msgmerge` leaves the removed strings behind as **156 `#~` obsolete lines**,
which grew `spacery-el.po` by 7KB of translations for strings this release
cannot reach; `msgattrib --no-obsolete` is the cure and should be part of the
routine. And **the POT has to be regenerated after `eslint --fix`, not before**:
prettier rewrapped two `__()` calls, which moved every reference below them —
`CONTRIBUTING.md`'s "the POT goes stale when a line moves" applied to a
formatting pass, which is the least obvious way for it to apply.

**Two things cannot be run on the device VM**, and this was found here rather
than assumed: `node_modules` is installed for the host, so **`vitest` and
`eslint` both fail in `device_bash` with missing native bindings** — rolldown's
for the first, the import resolver's for the second, 71 identical resolve
errors that are not lint findings. `tsc --noEmit`, `prettier` and
`wp-scripts build` are pure JS and do run there. `lint:js` has a workaround in
`CONTRIBUTING.md`; **the unit suite runs in the cloud container** — §3decies has
the recipe, and not having it cost eight tests in CI.

## 3octies. Where a line breaks — the other half of the measure

§3septies capped how wide a line may be. Nick read the result and found what
the cap had not fixed: **a sentence a few characters past one line wraps to a
widow.** `Your breakpoints are kept, so reinstalling leaves your spacing exactly
as it is.` broke **70 / 9**; a row's message in the 130px column broke
**13 / 8**. Both are inside the measure. D26 is the decision.

**The fix is CSS and the reason is translation.** A break point is a rendered
width, so a sentence fitted by hand to fall well in English falls somewhere else
in Greek — the copy fix cannot be right in two languages at once, and
`text-wrap: balance` is right in both. 70 / 9 → 42 / 37, 13 / 8 → 10 / 11.

**Two mechanics, both found by the rule silently not working.** Write them down,
because the first cost a build to discover:

- **`balance` is not inherited.** `#spacery-settings { text-wrap: balance }` was
  the first attempt and changed nothing: the root computed `balance` and every
  descendant computed `pretty`, with no stylesheet on the page setting `pretty`
  anywhere (Chrome 152, checked by walking every `cssRules`). The declaration
  has to be on the element that holds the text.
- **It needs a *block* container.** `Text` renders `display: inline` and cannot
  balance itself; a balanced block *around* it does work. So the three
  `maxWidth: 420px` wrappers carry `textWrap` now — the element that decides how
  wide a line may be is also the one that decides how it is divided — and in the
  inspector a plain `div` per line does the same.

**The audit that found this also found two faults the string pass had missed,
both for the same reason: it was reading one text node at a time.**

1. **The ruler's note ran to 101 characters on one line.** `emphasise()` splits
   its sentence across several text nodes, so a scanner reading whole leaf
   elements never saw the sentence. It has a 420px wrapper now.
2. **Three sibling `Text` elements in the inspector flowed as one paragraph with
   no space between the sentences** — the takeover notice literally rendered
   `narrower screens.In Spacery they also`. Worse than any widow, and invisible
   to every test here. `TakeoverNotice` is a `Flex` column of blocks now, with
   the button in its own wrapper so `align="stretch"` does not stretch it to the
   full 248px (it did, on the first attempt).

**The measuring technique that works, and the one that lies.** Reading one text
node gives you a string's own wrap and misses both faults above. Read the
*nearest block container* instead: walk its text nodes, bucket each character's
`getBoundingClientRect().top`, and reassemble the visual lines. That is what
turned up `screens.In` — the missing space is visible in the reassembled line
and in nothing else.

## 3nonies. The `Covers` column claimed an overlap that cannot happen

Nick read two rows off the screen — 1300px and 888px — and asked the right
question: `Covers` said `888px – 1300px` on one and `450px – 888px` on the
other, so where does 888px actually belong? **To the narrower one, alone.**
`BreakpointSet::media_queries()` emits `@media (888px < width <= 1300px)`, the
disjoint shape D13 chose to match core, so the lower edge is exclusive and the
dashed range had no way to say so. The column was describing a state the CSS
cannot produce. D27.

It reads `over 888px, up to 1300px` now — the words the ruler's description was
already using — 26 characters, one line in the 284px column.

**`range()` is deleted, not corrected, and that is the part worth carrying.**
It existed only to be tidier than `band()` in a narrow column. Two readings of
one fact, and they drifted the moment the second one existed: **`coverage()`'s
own docblock said it "goes through the same `band`" while the line below it
called `range()`.** That is the **seventh** false claim this repo has made about
itself, and the second found in a docblock describing the code directly beneath
it — the first was `cf761f2`'s commit message (§5). The pattern is specific
enough to act on: **when a function is split for presentation, the docblock of
whatever calls it is where the lie ends up.**

It is also the third defect in this UI/UX pass that no test here could reach,
and the first one a *reader* found rather than a measurement. The unit suite
asserted `range()` returned `480px – 782px` — correctly, of a function that
should not have existed.

**The obvious fix is wrong, and this is the part to read before re-proposing
it.** Writing the narrower edge as `previous + 1` — `889px – 1300px` — is the
convention everyone reaches for, and it puts back the gap a range query exists
to remove. Probed by sizing an iframe to each width and reading `matchMedia`:

| width | `(888px < width <= 1300px)` | `(max-width: 888px)` | `(min-width: 889px)` |
|---|---|---|---|
| 888px | — | **matches** | — |
| **888.25px** | **matches** | — | — |
| **888.5px** | **matches** | — | — |
| 889px | **matches** | — | matches |

At 888.25px the band is live and the `+1` labelling describes nothing — an
author would read the column and conclude they are uncovered while something is
already styling them. **Widths are not integers**: browser zoom produces
fractions on every screen (1512px at 110% is 1374.5px), and for an `em`
breakpoint `+1` has no unit at all. Bootstrap's `767.98px` is the same wound,
bandaged. Recorded in `design-system.md` §7 and in D27, so the next person to
have the idea finds the measurement rather than repeating it.

## 3decies. The unit suite CAN be run from here, and not running it cost eight tests

**CI failed on eight assertions that had been left pointing at the old
strings** — four in `sources.test.ts`, two in `validate.test.ts`, two in
`bands.test.ts`. Not one was a defect: every one asserted wording D25 or D27
deliberately replaced. They survived because the tests were updated by
*searching for the strings being changed*, which finds the ones in the file
being edited and misses the ones asserting the same string from a distance.

**`typecheck` and `lint:js` are both blind to this class of error.** A string
literal that no longer matches is not a type error and not a lint finding, and
§3septies had already recorded that the suite could not run on the device —
then treated a clean `tsc` as though it stood in for one. It does not.

**The suite runs here after all, and this is the recipe** (also in
`CONTRIBUTING.md`, and scripted at `/home/claude/vt/sync-and-run.sh` in that
session's container):

1. A scratch directory with its **own** two-line `package.json`, then
   `npm i --legacy-peer-deps vitest@4 jsdom@25`.
2. **Copy** `src/`, `tests/`, `vitest.config.ts` and `tsconfig.json` into it.
3. `npx vitest run`.

Two traps, both cost a run:

- Installing vitest *inside a copy of the repo* fails on this project's own peer
  ranges (`@wordpress/e2e-test-utils-playwright`). The scratch directory must
  not carry the repo's `package.json`.
- **Symlinking** `src` and `tests` instead of copying makes vite resolve every
  test through `/@fs/...` and report `Cannot find module` for all 17 files —
  which reads like a broken checkout rather than a symlink problem.

Checksum `src/` and `tests/unit/` against the device before believing a run, and
again after `eslint --fix`, which rewrote one of the three test files here.
238 tests, 17 files, green.

**That rule was wrong too, and the next CI run proved it.** "Grep the old
string" missed four more assertions in `tests/e2e/settings.spec.ts`, because
`getByText( '…', { exact: false } )` asserts a **prefix** — a grep for the whole
old sentence does not match a test holding its first clause. Searching for the
new wording finds nothing at all. Both directions leak.

**The check that works runs from the tests toward the code.** Pull every
`getByText` / `toHaveText` / `toContainText` literal out of `tests/`, blank the
values the test supplies itself (widths, breakpoint names), and assert each
remaining fragment appears in `build/*.js` or `includes/**/*.php`. The built
bundles are the only honest record of what the screen can render. Anything left
over is a string no code produces. It reports **zero** now, and it is in
`CONTRIBUTING.md`.

**It also found a locator that had matched nothing since `384de53`.**
`shownTier()` in `spacer.spec.ts` looked for the hint `Resize the canvas or
switch device view…`, which that commit deleted when it gave the spacer the tier
selector. The locator sits behind `.isVisible().catch(() => false)`, so it never
errored — it silently returned `missing` for a state that is not missing, in the
one helper whose whole purpose is telling those two apart, and whose docblock
had described the distinction for six commits after the code stopped being able
to draw it. **A locator that cannot fail is not a passing test**; it now reads
structure (no `· ≤` button but a `Height` panel is 'none') rather than copy,
because copy is what goes stale.

## 3undecies. The inspector: arrows, and the one size below the floor (D28)

Two asks, and **measuring killed half of the first one**. The panel's type was
reported as large beside Elementor's. It is not large beside *WordPress*:
`PADDING` / `MARGIN` and the side labels are **11px / 600 / uppercase, exactly
what core's own Padding and Margin labels are** in the Dimensions panel in the
same sidebar, and Spacery's fields are already tighter than core's — **13px in a
32px field against core's 40px**. Elementor is simply denser. §2's floor exists
to stop this plugin growing a type scale of its own, so the scale held and one
exception was made.

**The four side labels are 10px caps now.** The argument is the column, not
taste: four fields across a 248px panel are **59px each**, where core spends the
same width on one Vertical/Horizontal pair. At 11px `BOTTOM` renders **49px in a
49px box** — flush, nothing spare. At 10px, 45px.

**Greek is clipped either way and is recorded rather than papered over:**
`ΑΡΙΣΤΕΡΑ` is 55px at 11px and 50px at 10px in that 49px box. The change narrows
the overflow from 6px to 1px and no further. Fixing it means fewer or shorter
labels — layout, not type — and was not done.

**`spinControls="custom"` is unusable here, and it took a build to find out.**
Core renders it as a *suffix* holding two 24px buttons: measured at **60px
inside a 59px field, leaving the number 12px**. It only fits the two-sided
Margin box (122px), which is why the first build looked like it worked — the
Padding box happened to be in `custom` *unit* mode and was rendering
`InputControl`, which has no spinners at all. `spinControls="native"` puts the
arrows inside the input at no width cost, and the value round-trips: stepping
one linked side wrote `25px` to all four.

**The arrows made a floor necessary.** `Generator::is_value()` allows a leading
`-`, so a negative padding is emitted and then dropped by the browser — silent
before, but typing `-4` was deliberate where holding an arrow is not. `min={0}`
on padding; margin keeps none, because a negative margin is legitimate.

**The extension has a stylesheet now** (`src/extension/style.scss`, one rule,
enqueued under the script's own handle so they cannot load out of step). It
needs `!important`: the label's size comes from the thrice-emitted emotion class
`CONTRIBUTING.md` already documents for borders — measured, without it the label
stayed at 11px. §3octies had declined to add this stylesheet for `text-wrap`;
the difference is that there the text was Spacery's own markup and here the
label belongs to a borrowed component.

## 3duodecies. `custom` becomes a pencil, and the toggle finds a bad decision (D29)

Asked for as a formatting change — `custom` was the widest entry in the unit
list and Elementor uses a pencil for the same mode. It is a formatting change
plus a real defect.

**`custom` was never a unit.** Every other entry in that `<select>` says what
the *numbers* in the fields mean; `custom` said what the *fields are*, and a
list of units cannot show that difference. It also set the row's geometry: a
`<select>` takes its width from its widest option, so the rarest choice was
making the picker **72px**. With only real units left it is **56px**. It is a
24px icon toggle now, and the picker keeps showing the unit the box *would* be
in, so picking a unit there is the second way out.

**Then the toggle exposed a defect in a decision rather than in code.**
`switchUnit()` cleared the whole box leaving custom, deliberately and with its
reasoning written down: `calc(100% - 2rem)` has no number for a number field,
and keeping the parseable sides while dropping the rest makes the outcome depend
on what each side held. Sound — and written when leaving custom meant opening
the unit list and *naming a unit*, which reads as "re-express these". One press
of a toggle labelled `Use a number and a unit` does not read as "and discard
everything". Measured: pencil on, pencil off, and four good values were gone.

Each side is kept if it parses and cleared if it does not now. Which sides
emptied is visible in the four fields; four values vanishing at once is not.

**The lesson is about the class, not this box.** A documented decision can be
correct for the affordance it was written under and wrong the moment a cheaper
affordance is added — *nothing about the old reasoning was mistaken*, the cost
of being wrong changed. When adding a one-click path to something that used to
take deliberate steps, re-read what that path does before shipping it, and
drive it end to end rather than trusting the docblock.

**Then the pencil itself was wrong, and `28231f6` undoes it.** Splitting the
mode out of the picker left two controls that could not show one state between
them: the picker went on displaying a unit while the fields took whole CSS
values, so the row asserted `px` about fields that were not in px. The entry
belongs *in* the list, where choosing it is the same act as choosing a unit —
only its **label** ever needed to shrink. It is **`css`**, three characters like
`rem`, and the picker keeps the 56px the pencil bought (the word `custom` cost
72px). An icon inside the list is not reachable: a native `<select>` renders
text, and `CustomSelectControl` is a second experimental component in the
hand-written ambient types for a glyph that says less than the word.

**`switchUnit()`'s behaviour survived the revert; its reasoning did not.** The
docblock justified keeping-what-parses by the pencil, and a docblock that
explains behaviour by an affordance which no longer exists is exactly the false
claim this repo keeps finding in itself — the seventh was `coverage()`'s
(§3nonies), and this would have been the eighth, self-inflicted within a day.
Rewritten to stand alone: four re-labelable values destroyed to avoid an
inconsistent-looking outcome is the worse trade, and keeping what parses makes
leaving custom behave like every other unit change, which re-labels rather than
clears. **When a change is reverted, grep the docs it was used to justify.**

## 3terdecies. One piece of motion, and the trap that hid it (D30)

In `css` mode four fields share 236px — 59px each, about nine characters. Fine
for `24px`, useless for `calc(100% - 2rem)`, which is the value the mode exists
to hold. The focused field now grows to **112px** and its three siblings fall to
**41px**, giving the space back on blur. `flex-grow: 2.7` is Elementor's own
proportion for the same gesture, read off its panel: `g / (g + 3) = 0.47`. Only
in `css` mode; a number already fits. This is **the plugin's only motion**, and
`design-system.md` §3 now says so and sets the bar for a second.

**The trap is the part to carry forward, because it cost the most and looks like
something else entirely.** In the live panel the width would not move. The rule
provably matched the element (`matches()` true, `:focus-within` true), the
declaration was `!important`, the class was on the wrapper, and the stylesheet
was loaded — every symptom of a cascade fight, and there was no cascade fight.

**A backgrounded tab never advances a CSS transition.** The browser window being
measured was minimized (§7 already records that a minimized window reports
`innerWidth: 0`; this is the same window, biting differently). With
`transition: flex-grow 150ms` on the element, the property sat at its **start**
value indefinitely — indistinguishable, from `getComputedStyle`, from a rule
that never applied. Adding `transition: none !important` returned
`112 / 41 / 41 / 41` on the first try.

Two rules out of it:

- **When a property will not change and the rule provably matches, suspect the
  transition before the cascade** — and suspect the window before either.
- **An end state and a tween are separate measurements.** The end state belongs
  in the real product with the transition suppressed; the tween belongs
  somewhere that actually composites. The tween here was measured in headless
  Chromium (`/opt/pw-browsers/chromium-1194`, Playwright) on a 20-line fixture
  reproducing the flex row: 59 → 71 → 81 → 89 → … → 112 across ~150ms, landing
  on the same 112 the panel gives. That also disproved the wrong conclusion the
  minimized window had suggested — that `flex-grow` does not interpolate. It
  does.

## 3quaterdecies. The spacing audit: one real fault, one nobody saw, one false table (D31)

Asked for as a spacing and alignment pass over the whole settings screen, with
*Add breakpoint* sitting on the entry row's border as the example. It was worth
running: **the reported fault was real, it had a twin nobody had noticed, and
the document the screen is judged against was wrong about three of its own
numbers.**

**The fault.** Last row's bottom edge to the button: **0px**. It stood on the
closing rule.

**Its twin.** The button started at the card's content edge (**206px**) while
every column above starts at **214px** — `.spacery-table__row` carries
`padding: 12px 8px` and the footer carried none, so the button hung 8px left of
the column it belongs under and the guidance beside it overshot the remove
column's right edge by the same 8px. One cause, two symptoms, and only one of
them visible enough to report.

**The inset is matched, not removed.** Deleting the rows' 8px would have aligned
everything at 206 in one line of CSS and been wrong: a conflicted row is tinted
across the card's full width, and its fields have to sit *inside* that tint
rather than flush against its edge. So the table keeps its 8px and the footer
joins it — 16px above, 16px below to the card's edge, symmetric with the
header's 16px on the other side. Verified in the conflict state and at a 700px
wrap.

**The ninth false claim, and this one was in the ruler itself.** §3's spacing
table listed `Card padding 16px`, `Card header 12px / 16px`, `Table row
9px / 16px`. Measured: **16/24**, **16/24**, **12/8**. Written from the proposal
and never checked against the build — so the document a spacing audit is
supposed to measure *against* was itself unmeasured. It records measurements
now, says so in the section, and gained the two rows it never had (the table
head's 8px, the footer's 16/8).

**What the audit confirmed rather than corrected**, and this is why the sweep
was worth it even where it found nothing: all five card bodies symmetric 16px
top and bottom, every card's content on one left edge, 20px between cards, and
**no gap anywhere on the page off the 4px grid**. The table was the only thing
inside that left edge, and now its head, rows and footer are inside it together.

**Method worth reusing:** walk every card body to a depth of four, compute each
child's offset from the card's content box, and print only the ones that are
neither 0 nor the known inset. The noise (core's radio indent at +24, grid cells
at their column offsets) is obvious on sight, and the two real faults stood out
of a five-card page immediately.

## 3quindecies. The ruler was lying about where its own breakpoints are (D32)

Reported as "the coloured bar is clearly bigger than the value it's named by" —
and the ruler is the one component in this plugin whose entire job is to be
proportional. **Two independent errors, and together they put a band edge
14–17px to the right of the tick naming it.**

**The tick, which was the larger error.** Each tick was a column — mark, then
label — at `left: at%` with `translateX(-50%)`. That centres the **group**, and
the group is as wide as its label, so the 1px mark landed **half a label-width
early**: 16.8px at `480px`, 19.2px at `1280px`, *always exactly half that tick's
own text*. The tell was that the error scaled with the label, not with the
position. A **zero-width tick box** fixes it by construction: a box with no
width cannot be displaced by the length of its own text.

**The band, which was smaller and worse.** The strip separated bands with
`gap: 2px`, under a comment saying in as many words that a border "would add
width to every band and lie about the proportions". **The gap did exactly
that** — four of them made the row 100% + 8px, flex shrank every band to fit,
and each boundary fell 1–3px short of the width it names (`Mobile` ending at
260.1 where its own width says 262.8). A 2px white border drawn *inside* the
band (`border-box`, already set) separates them without taking width from
anyone.

| | before | after |
|---|---|---|
| tick vs boundary | −16.8 to −19.2px | **−0.5px** (half the mark's own width) |
| band edge vs boundary | −1.0 to −2.7px | **0.0px** |
| bands vs strip width | 100% + 8px, shrunk | **exact** |

**That comment is the tenth false claim this repo has made about itself, and the
first one that names the right hazard and then commits it.** It is worth
separating the two failure modes now on record: a claim that was true once and
went stale (`coverage()`'s docblock, §3nonies), and a claim that was never true
(this one, and §3's spacing table in §3quaterdecies). The second kind only
surfaces when something is measured — no amount of reading catches it, because
the prose is *reasoning correctly about the wrong implementation*.

## 3sexdecies. The name was the one padding-specific thing left (D33)

Asked for against a stated plan to add responsive controls beyond padding and
margin to other block types, the way Stackable does with Column Arrangement.
**The mechanism was never spacing-specific** — a namespaced attribute and
server-side CSS per tier — but every name on top of it was, and a name that has
to be rewritten to ship the second feature costs more the longer it stands.

**The inspector panel is the substantive rename.** `Responsive spacing`
described its one control; **`Spacery`** describes the container, and a
container is what a second control type needs. It also stops the panel
competing with core's own `Dimensions`, which is where spacing lives in that
sidebar. Verified on the live editor: a selected Group's panels read
`Spacery`, `Advanced`.

**The block took the freed name in the other direction.** Its `title` was
`Spacery`, which told an author nothing about what the block does, and is now
**`Responsive Spacer`** — the brand goes to the panel that holds everything,
the description to the block that does one thing. Its `name` is untouched:
`spacery/spacer` is block identity in saved content and renaming it would
invalidate every post holding one. Nothing is released, so no deprecation is
owed, and `spacer.spec.ts` keys off the *name* rather than the title, so no
test moved. `keywords` gained `spacery` so the brand still finds it in the
inserter.

**Copy about what is stored moved from "spacing" to "values"** — *Your
breakpoints are kept, so reinstalling leaves your values exactly as they are* —
because a sentence promising what survives an uninstall has to stay true when
what is stored stops being spacing. Same for the rename warning and the ruler's
uncovered-region note. **Feature bullets kept their specifics:** `Padding and
margin per breakpoint on any block that supports spacing` is what the plugin
does today, and generalising it would be the kind of claim §3 exists to catch.
Only the category noun above them moved, to **responsive block controls**.

Surfaces changed: the plugin header `Description`, `package.json`,
`README.md`, `readme.txt` (short description, one bullet, install step 4, two
FAQ paragraphs), `docs/readme-screenshots.txt`, `docs/asset-brief.md`
(including the tagline, now *Responsive controls for every block*),
`docs/asset-handoff.md`, four `MANUAL-TESTING.md` panel references, and
`tests/e2e/extension.spec.ts`'s `PANEL`. `docs/ui-review.md` was left alone: it
is a historical review, not a live description.

**The eleventh and twelfth false claims, both in `PLAN.md`, both found by
re-reading it rather than by measuring.**

1. Deliverable B claimed it "adds per-breakpoint padding, margin and **block
   gap**", while **D5 in the same file** records gap as spiked and deferred and
   `spacingFeatures()` declines it in code. Written when the spike was still
   expected to succeed.
2. The paragraph headed *Spacery is absent at the default tier* quoted a hint
   the panel shows above the widest band — "Resize the canvas or switch device
   view to set responsive spacing" — which **D17 deleted eighteen decisions
   ago**. `useSelectedTier()` falls back to the widest tier *specifically so
   that state cannot arise*; the paragraph described the behaviour the fix
   replaced. This is the third document-side sighting of the same locator, after
   `shownTier()` in §3decies: **when a hint is deleted, grep the docs for its
   text**, because it lives on in prose longer than in code.

Both are the "written from a proposal, never re-read against the build" kind,
the same cause as §3's spacing table in §3quaterdecies.

### The banners were the surface the rename nearly missed

Nick asked whether `assets/` had been updated. It had not: both WP.org banners
carried *Responsive spacing for every block* as **artwork**, which is the one
place a string grep cannot reach and the one place the release is judged from
before anyone reads a word of the readme. **A text pass has to end with a look
at the images.**

They were **amended in place, not redrawn** — redrawing the mark is exactly what
`bin/make-assets.py` got wrong and was deleted for, and no generator survives.
Only the tagline band changed; **zero pixels differ outside it**, in both files,
compared rather than asserted. The background needed no reconstruction: both
banners are a pure vertical gradient, every row one colour edge to edge, so
masking means refilling each row from its own `x = 2`.

**The type was measured, and the measurement is now in `asset-handoff.md`**:
Poppins Light, `21px`, `letter-spacing: 0.1px`, `rgb(168,163,200)`, ink left
`269` (flush with the wordmark's `S`), cap top `151`. The 1544 banner is **the
same CSS captured at `deviceScaleFactor: 2`**, not 42px at 1× — the 2× capture
fits measurably better (RMS 15.4 against 16.3).

**Fitting on RMS alone picks the wrong answer, and this is the part to
remember.** The best RMS was a **weight 400** render, because a heavier face
overlaps more of the original's ink; put side by side at 3× it is obviously
bolder than the original. The honest procedure is to **reproduce the previous
line first** and compare: 18.5 at 772 and 15.4 at 1544, against 44.4 and 45.3
for a blank band — then *look at it*, and only then swap the words.

### One tagline, and the rule the artwork had never stated

The screen and the banner had drifted into two lines for two jobs —
*Responsive block controls, at the breakpoints you choose.* on the masthead,
*Responsive controls for every block* on the artwork. Nick asked whether the
long one should be shorter, and **the answer came from the banner, measured**:
at the type the banner uses there are **503px of runway** from the tagline's
left edge, and the long line needs **602px**. It cannot go there without
dropping the type below its supporting size.

**`Responsive controls at your breakpoints` — 417px — is now the only
tagline**, on the masthead and on both banners. The plugin header and the
readme short description keep their own longer sentence; they describe rather
than slogan, and conflating the two is how a tagline ends up too long to use.

**The artwork centres its lockup, and nobody had written that down.** Mark,
wordmark and tagline sat at **137 / 136** from the edges at 772 and
**274 / 273** at 1544 — exact to a pixel, at two sizes, so a rule rather than a
coincidence. A 50px longer tagline therefore does not extend rightward, it
**re-centres everything**: left as-is the margins would have been 137 / 86, the
lockup visibly shoved left.

So the mark and wordmark were **translated** — 25px left at 772, 50px at 1544 —
and **not redrawn**: zero pixels differ inside the moved lockup, checked.
Translating is safe because the background varies across a row by at most
**2 / 255**, measured on every pixel of every row rather than sampled. The
constraint now lives in `asset-handoff.md`, with the ceiling a future tagline
has to stay under (about 500px of lockup at 772).

**The lesson is the one this repo keeps relearning from the other direction.**
A string swap inside an image is not a string swap: the image has a composition,
the composition has rules, and those rules are only in the pixels until someone
measures them out.

### The tagline is the one string that is not translatable

Nick's call, and it follows from the banner. The artwork carries the same line
where **no translator can reach it**, so a translated masthead would make the
screen disagree with the picture of itself in the directory. A tagline is part
of the mark, like the name, and a mark is one thing in every language.

**An empty `msgstr` does not mean it.** That is how the plugin *name* is
handled — `__('Spacery')` in the POT with a deliberate blank — and it works
only because nobody wants to translate a proper noun. A sentence in the POT
reaches translate.wordpress.org and **gets translated by someone acting in good
faith**, and there is no mechanism to ask for it back. So the enforcement is
structural: a **bare literal**, not an `__()` call, in a `Tagline` component in
`Brand.tsx` — where the reflex to wrap a string is weaker than in `App`, and
where the reason sits in the docblock next to it. POT down from 141 strings to
140; Greek from 111 to 110.

**And it would have made `readme.txt` lie in the same commit.** The FAQ
promised *"Every string in the plugin, including those in the editor, is
translatable"* — true that morning, false the moment this landed. Caught before
committing and the FAQ now states the exception, which makes it the
**thirteenth** untrue thing this repo has said about itself and the first found
in the change that created it rather than weeks later. The generalisable rule:
**a promise about a class of thing has to be re-read whenever an exception to
that class is introduced** — grep the docs for the claim, not just for the
string.

## 3septdecies. The panel was in the wrong tab, and its own fill was what split it (D34)

Asked as *should Spacery hide core's Dimensions panel when it is active*. **No**, and
the three reasons are worth keeping because they are the same reasons any "hide core's
control" idea fails here:

- **Dimensions is the default tier.** Spacery never edits it — the panel always edits one
  of the breakpoints — so the value that applies above the widest one, and that every
  tier inherits downward from, is settable nowhere else.
- **Spacery already reads it.** `inheritedValue()` in `SpacingPanel.tsx` ends on
  `readPath(attributes.style, path)`, so core's value *is* the greyed placeholder in the
  widest tier's fields. Hiding Dimensions hides the source of what Spacery shows.
- **Replacing it means writing `style.spacing`** — core's attribute, and the one thing
  `readme.txt` promises Spacery never touches. Today it writes only `attributes.spacery`,
  which is what makes deactivation clean.

There is no supported API for it either: the levers are stripping `supports.spacing` or
switching it off in `theme.json`, both of which remove what `spacingFeatures()` reads to
decide Spacery should appear at all, or CSS, which breaks on the next class rename.

**But the question was pointing at something real, and reading the live inspector found
it.** Core keeps padding and margin under **Styles**; a bare `InspectorControls` fills
**Settings**. So an author set the base value in one tab and its per-breakpoint overrides
in another, and D11's takeover notice was describing Dimensions fields they could not see.

**And it was worse than one tab away.** On a Group, the Settings tab held `Spacery` and
nothing else — **the tab bar existed because of Spacery**. Moving the fill to
`group="styles"` collapses the inspector to a single list on `core/group`,
`core/columns`, `core/cover` and `core/heading`, Spacery sitting after `Dimensions` and
`Border & Shadow`. `core/image` keeps its tabs, because core fills its settings group with
`Media`, and there Spacery now lands in `Styles`.

Not `group="dimensions"`: that slot is core's own `ToolsPanel` and expects
`ToolsPanelItem` children, where Spacery's is a `PanelBody` carrying a tier selector.
`src/types/wordpress.d.ts` gains the `group` prop typed as the three groups this plugin
uses rather than as `string`, because **an unrecognised group renders nowhere and reports
nothing** — the hand-written declaration should not help that along.

**The e2e helper is the part to copy.** `openInspector()` clicks `Styles` when the tab
exists. That conditional cannot hide a failure: miss a tab that is there and the panel
does not render and every assertion below fails. That is precisely the distinction
`shownTier()` got wrong (§3decies) — a conditional is safe when something downstream
depends on it and dangerous when nothing does.

**Two smaller things confirmed on the way.** The POT did *not* go stale despite an
18-line comment inserted above three `__()` calls: `make-pot.sh` scans the **transpiled**
JS and `tsc` strips comments, so comment-only edits above a string do not move its
reference. Regenerating produced a file identical apart from `POT-Creation-Date`, and it
was reverted rather than committed as churn. **D38 changed the mechanism and kept the
conclusion**: the scan now reads the minified bundles, where a comment never survives at
all. And the spacer block's own `Height` panel stays in Settings, matching where core's
Spacer puts height — it is the block's own attribute, not an override of a core style.

**Deferred, and named so it is not rediscovered as a surprise:** D33 made this panel a
container for controls beyond spacing, and a column arrangement is a *setting*, not a
style. One branded panel cannot sit correctly in both tabs, and the same name twice in two
tabs is worse than either. Decided on what the panel holds today; revisit when a non-style
control actually exists.

## 3octodecies. A conflict the screen could not see, and the guard that hid it (D35)

Reported from the screen with a screenshot: eight rows, **two of them slugged `br-12`**,
and no conflict drawn anywhere. Two faults, and the reported one is the smaller.

**One message per row.** `validate()` was an `else if` chain writing a single
`RowProblem` per row. The second `br-12` also had no width yet, so it got
`Needs a number and a unit` and never heard that its slug was taken — every message true,
and the author would have filled in the width only to be told about the slug next.
`Problems.rows` is a **list** now, at most one entry per field. That cost almost nothing:
`noteFor()` in `BreakpointRows.tsx` already resolved a message *per field*, so it only had
to search the list instead of matching one object.

**The defect: a row with any problem registered nothing.** `seenSlugs` and `seenWidths`
were filled inside `if (undefined === problems.rows[row.id])`, so an unfinished row never
claimed its slug — and the **next** row to use that slug looked like the first one there
and was reported as **fine**. Measured before touching anything: rows
`br-12 / (no width)` and `br-12 / 600px` produce exactly **one** problem, on the first row,
about its width. The duplicate is described nowhere, is missing from
`Fix N problems above to save.`, and only the **server** would have caught it — which is
precisely the failure `validate.ts`'s own opening docblock says the module exists to
prevent, and a save that reports success and stores nothing is what that costs.

A slug is a slug whether or not the width beside it parses. Each field claims its value
when **that field** is sound, and the two axes are independent.

**Two knock-ons the fix made visible**, neither of which existed while the guard was
swallowing everything:

- The first row to claim a slug can have a blank name, and `Already used by %s.` with an
  empty name renders `Already used by .` — a message naming nothing. `nameOf()` falls back
  to the slug, which is on screen in the very column the message points at, and then to
  `an unnamed breakpoint` (one new string, Greek carried across).
- A refusal now outranks a caution **on the same field** and nowhere else. It used to
  outrank across the whole row, so an over-wide width went unmentioned behind an
  unfinished *name* two columns away — two unrelated facts competing for one slot.

Confirmed on the live screen in both shapes. The reported one now shows **both** messages
with the row tinted and `Fix 2 problems above to save.`; the hidden one names the conflict
on the row that has it. Four regression tests, one per shape, 244 green.

**The shape to remember:** a validity guard that gates *bookkeeping* rather than just
*reporting* deletes information. `seen*` is not about whether a row is good, it is about
what a row has claimed — and a broken row still claims things.

**One session note, because it cost a confused detour:** `device_commit_files` returns
before the bytes are necessarily readable. A tarball committed and extracted in quick
succession gave the **previous** contents, and `git status` showed a POT differing only by
its date. Re-committing and re-extracting fixed it. **Verify an extracted file's content,
never its mtime** — the tool's own description says to wait and retry, and that is why.

## 3novodecies. The editor preview, built — and what measuring first bought (D36)

**The last unbuilt thing the plan specified.** §3c is the finding; this is the
build, and the order it was done in is the part worth carrying.

**Four API questions the spike had left open were measured before a line was
written**, because each one could have changed the shape of the work:

| Question | Answer, measured |
|---|---|
| How does CSS reach the canvas? | **`useStyleOverride( { id, css } )`, public in 7.1** — signature read off the shipped function |
| Does Spacery's rule beat core's? | **Yes.** Override at index 62, core's block-support style at 61, both in the iframe `<body>`; in-band computed value is Spacery's |
| Does an empty `css` cost anything? | **No element at all** (65 → 66 styles, exactly +1) |
| Does `wp-style-engine` need a manual dependency? | **No** — the import adds the handle to `extension.asset.php` |

**The ordering question was the gate, and it was run as a throwaway filter added
from the browser console** — `wp.hooks.addFilter('editor.BlockListBlock', …)` with
one hard-coded rule — so it needed no build at all. Had Spacery lost the tie, the
remedy was a doubled class in the selector, mirrored on the front end, which is a
`Generator.php` change. Measuring it first is the difference between a clean
afternoon and rewriting the generator halfway through one.

**What the build is:** `isValue.ts` (the one genuine duplicate), `preview.ts`
(pure, no React — bands, ordering, `!important`, the base never emitted),
`queries.ts` (the media-query shape, TS's single reading of it), and an
`editor.BlockListBlock` HOC gated by the same `extendsBlock()` the panel uses.

**Three things that would have been silent failures:**

- **`getCSSRules()` returns `{selector, key, value}` with `key` in camelCase.**
  `paddingTop`, not `padding-top` — and a camelCased property inside a stylesheet
  is *ignored rather than reported*. Written down in the ambient declaration,
  which is where a reader would look for it.
- **The spacer block must be excluded**, and is, by `extendsBlock()`. It previews
  its own height through `edit.tsx`; styling it here would give the one block
  that already had a preview a second one. Verified: no class, no override, height
  still previews.
- **Narrowing the canvas by setting the iframe's own width does nothing.** The
  iframe sits in `.block-editor-iframe__scale-container`, whose computed width
  wins, and the failure is silent — every measurement then reports the wide value
  as though it were the narrow one. It caught me once mid-session. Resize the
  container *and* the iframe, and assert `contentWindow.innerWidth` before
  believing a figure. In the E2E test that assertion is explicit.

**Verified on the live editor at four widths**, with the site's own eight-tier
set: `br-11: 10px` and `br-7: 40px` over a base of `5px` give **1700 → 10px**,
**900 → 40px**, **600 → 40px** (inherited downward) and **2200 → 5px** — the
base, because a value never reaches a wider band.

**The stub is the one place to be careful.** `vitest.config.ts`'s own comment
warns that an alias is an invitation to test against a fake, so
`tests/unit/stubs/style-engine.ts` implements only the two features the preview
uses and says in its docblock that **the E2E test is what pins it to the real
engine**. The unit tests prove structure, order and `!important`; they cannot
prove fidelity and do not claim to.

291 unit tests, 18 E2E. **M4's exit criterion is met for the first time since it
was written**, by a test that compares values rather than screenshots.

### The POT check that passed on stale input

**D36 failed CI on the POT, and the interesting part is that I had checked it.**
Two imports added to `register.tsx` pushed its three `__()` calls down two lines,
so every reference to them moved — `register.js:77/79/80` → `79/81/82`. That is
the failure `CONTRIBUTING.md` has led with since the string pass, and it still
got through.

**It got through because the check ran against a stale copy of the source.** The
POT is regenerated in the cloud container from a tarball staged off the device;
that stage had not landed when `make-pot.sh` ran, so it read the *previous*
`register.tsx`, produced an identical POT, and the diff came back clean. The
verification was not skipped and was not wrong — it answered the question it was
actually asked, about a file from two minutes earlier.

**A verification whose input is stale reports the answer it was given.** That is
a different failure from the twelve false claims in §3 and worth separating: a
false claim is a statement nobody re-read, this was a statement that *was*
checked, against the wrong thing. The output looked exactly as it looks when
everything is fine.

**The fix is a checksum on the input, not a longer wait.** `md5sum` the tarball
on the device, `md5sum` it again after staging, compare, and only then
regenerate; the same on the way back. There is no length of wait that tells you
the copy arrived, and today's earlier commit-lag detour (§3octodecies) was the
same mechanism from the other direction — that one at least announced itself as
a contradiction. Now in `CONTRIBUTING.md`.

**The rule this generalises to:** any check that runs somewhere other than beside
the thing it checks has two failure modes, not one — the check can be wrong, and
the copy can be old. Only one of them looks like a failure.

## 3vicies. Plugin Check, run at last: one warning, and it was the expected one

**The last never-run gate.** `bin/check-release.py` is this repo's own script and
is not the same thing; Plugin Check is what WordPress.org runs, and nobody had
pointed it at Spacery until 15 September.

**It was run twice, and the difference between the runs is the lesson.**

The first run was against the **development checkout** — Spacery is symlinked
into the playground from the repo, so Plugin Check walked the whole working
directory. It returned findings in 29 files, including a page of errors in
`tests/contract/core/class-wp-theme-json.php`, which is **WordPress core's own
source**, fetched by `bin/fetch-core.sh` for the contract suite. Plugin Check
was linting WordPress.

Cross-checked every flagged path against the built zip: **28 of 29 do not ship.**
The zip is 43 files, and `package.json#files` is an allow-list, so `.DS_Store`,
`.gitkeep`, `.npmrc`, `.editorconfig`, the `bin/*.sh` scripts, the `*.dist`
configs, `.github` and `Claude outputs/` are all absent from it.

**That run was still worth having, and the reason is worth stating.** It scanned
a **superset** of what ships, so nothing in shipping code could have hidden from
it. A noisy report over a superset is a stronger result than a clean report over
a subset.

The second run, in a clean environment against the plugin alone, returned
**exactly one finding** — the one the first run had already isolated:

> `includes/I18n.php:74` — WARNING —
> `load_plugin_textdomain()` has been discouraged since WordPress 4.6.

**D20 answered it by name, and the answer held until the pre-review.** The call
set a custom path in `WP_Textdomain_Registry`; without it nothing would look
inside the plugin for the bundled Greek `.mo`. It is a warning, not an error, and
it did not block review. **It is gone now** — the call and the bundled files went
together on 18 September, which is what D20's revision records and what
§3quinvicies explains.

**Nothing in the category that usually bounces a submission appeared at all:** no
readme finding, no plugin-header finding, no `Tested up to`, no license, no
direct-file-access in shipping code.

`Claude outputs/` is now in `.gitignore` (`49ae917`). It could never reach the
zip or SVN — untracked, and the packaging list is an allow-list — but the space
in its name is exactly what failed a distributable once before, and one
`git add .` was the whole distance between harmless and fatal.

## 3unvicies. The screenshots: the environment, the rig, and the brief's own contradiction

**Taken 15 September, on the MAMP playground**, after Nick deactivated
Elementor, Stackable, FileBird and WP BookBar. That was the blocker
`cb4964f` had recorded: BookBar printed *WP BookBar requires Elementor to be
installed and active.* directly under the Spacery heading, inside shot 3's
frame, and the other three put *Edit with Elementor*, *Design Library* and a
Stackable icon exactly where shot 1's frame wants to be. Plugin Check can stay
on — Tools submenu only, never in frame.

**The brief asked for two things that cannot both be true, and the screen said
so.** It wanted shot 3 with *Spacery's own* selected **and** a populated
breakpoint table showing a `COVERS` column. Selecting the preset **removes the
table from the screen entirely**; there is no read-only version of it. And the
caption already written — *Name your own breakpoints and set where each one
stops* — is a description of the table. So the four tiers were typed **into**
the table under *Breakpoints I define below*: same numbers, same tier names in
the other two shots, and a screen showing the feature being used rather than
declined. **A brief written from a screen's description rather than from the
screen is the same failure as a docblock written from a proposal** — this one
was a day old and mine.

**The sizes were the second thing the brief had no basis for.** 1000 × 580,
900 × 640 and 1120 × 485 were chosen for *drawings*, before anyone knew how much
interface each claim needs; two of the three cannot hold their own contents.
What replaced them is one rule that survives contact with the product: every
shot is **1280 logical pixels wide, captured at 2×, and as tall as its content
needs** — 2560 × 2456, 2560 × 1856 and 2560 × 2050. One width is what makes
them read as a set in a directory that scales them all to one column.

### The rig, because two of the three obvious routes cannot produce a file

| Route | Renders | File out |
|---|---|---|
| Chrome extension | 1× only; `resize_window` reports success and changes nothing | **JPEG at 1×** — artefacts around admin text, no headroom to crop |
| `chrome-devtools` MCP | exactly right — `emulate` sets a true `1280x900x2` viewport | **nowhere useful**: every `filePath` outside its own workspace roots is refused, and the connected folders are not among them |
| `playwright` MCP via `browser_run_code_unsafe` | same CDP override | **PNG at 2×, to any path** — raw Playwright is not subject to the MCP's path check |

**Neither of the last two works alone**, and that is the part to remember. The
Playwright browser launches **headless with a fresh profile**, so nobody can
sign into it and it can never reach the site; the DevTools browser is the one a
human signed into and can never write the file. What they share is
`/tmp/.playwright-mcp`. So: DevTools sets the viewport and writes the PNG there,
and Playwright ferries it out with a file input and a blob download —
`setInputFiles` → `URL.createObjectURL` → `a.click()` →
`download.saveAs(<any path>)`. Byte-identical, and it never loads the page.

Three traps inside that, each of which returns a plausible wrong answer:

- **`page.screenshot({ scale: 'device' })` is not a shortcut.** It reads the
  browser *context's* `deviceScaleFactor`, which a CDP override does not change,
  so it silently returns 1× while `devicePixelRatio` in the page reports 2.
- **`browser_resize` resets `deviceScaleFactor` to 1.** Re-apply the override
  after any resize, and assert `innerWidth === 1280 && devicePixelRatio === 2`
  before believing a capture — §7's minimized-window rule, third sighting.
- **The inspector's scroller is `.interface-complementary-area`**, not the
  sidebar element, and the `Page`/`Block` tab bar is sticky over the top of it.
  Scrolling a panel header to `top: 118` put it *behind* the tab bar, which
  reads exactly like a scroll that did not happen. Also: `scrollTop` was already
  at its maximum, so the first panel that can be shown is whatever the content
  height allows — the frame is sized to the sidebar, not the other way round.

**The editor states were built from the console, not by clicking** — the working
note in §7 paid off. `createBlock` + `insertBlocks` + `updateBlockAttributes`
produce exactly what typing would, which is why the canvas previews them; the
check that matters is reading `getComputedStyle` inside the canvas iframe
afterwards (`paddingTop: 64px`, `paddingLeft: 24px` — D36 visible in the same
frame as the panel that caused it). **One wrong path cost a capture:** the
spacer's per-tier height lives at `dimensions.height` inside each tier
(`src/blocks/spacer/height.ts`), not at `height`, and setting the wrong one
produces a panel calmly reporting *Inherited from Default* — correct behaviour,
wrong input, no error anywhere.

`fixedToolbar` was turned on so the block toolbar docks in the header instead of
covering the page title, and **turned back off**: it is the user's preference,
not the screenshot's. The playground was restored the same way it was measured —
settings read from `/wp/v2/settings` before anything changed and written back
verbatim (eight rows, source `custom`), the three draft pages trashed through
`DELETE /wp/v2/pages/<id>`.

## 3duovicies. The submission texts, and the guideline the zip was quietly failing

**Written 16 September, checked against the live handbook rather than from
memory**, which is the only reason the finding below turned up.

The submission itself is two things: a zip, and "a brief overview describing
what the plugin does" typed into the upload form. Review is **within 14 business
days**; the **slug is fixed at submission** and comes from the `Plugin Name:`
header; SVN credentials arrive only on approval. `docs/submission.md`
(`c0c3b72`) holds the overview verbatim, the pre-form checks, three ready
replies, and the post-approval texts.

**The finding: the zip was failing guideline 4 and nothing said so.**
`package.json#files` is an allow-list of seven entries and **`src/` is not among
them**, while `build/extension.js` is nine lines of mangled webpack output. The
guideline requires either the uncompiled source in the deployed plugin or *"a
link in the readme to the development location"* plus the build tools. There was
no such link. `readme.txt` now has a `== Source Code ==` section naming the
public repository, Node 22, and the two pnpm commands.

**Neither gate this repo owns could see it.** `bin/check-release.py` compares
the two packaging lists against `git ls-tree` — both lists agreed, because they
agreed on shipping `build/` and not `src/`. Plugin Check ran clean over a
*superset* of the zip (§3vicies) and does not implement guideline 4. The only
thing that finds it is reading the guideline with the packaging list open. Note
also that `PLAN.md`'s risk table has listed *"ship unminified sources"* as the
mitigation for review friction since planning — **the mitigation was written
down and never implemented**, which is the §3quaterdecies shape again: a
document reasoning correctly about an implementation that does not exist.

**The pre-emptive half of the overview is the part worth copying.** Three things
in this code base look worth asking about on a scan, and each is answered in the
form text before a reviewer has to write: the single `base64_encode()` (which
`add_menu_page()` requires for an SVG icon, with the plain markup in a constant
above it), `load_plugin_textdomain()` (Plugin Check's one warning, D20), and the
compiled `build/`. Each ready reply states the fact and *offers the change*
rather than defending — a reviewer who has to argue takes longer than one who
has to say "fine". **Two of the three were raised by the automated pre-review
two days later, and having the answers written was worth the hour.**

**And the duplicate finally went.** `docs/readme-screenshots.txt` was a whole
second copy of `readme.txt`; §1 has recorded since 15 September that it had to
be edited in lockstep twice in one day with nothing to report a miss. Adding
`== Source Code ==` was about to be the third time. It is now the captions
alone, sliced out of `readme.txt` at write time so they are verbatim rather than
retyped — which matters more than the duplication did, because captions are
matched to files **by position** and a caption that drifts from its file is
invisible until the listing renders.

## 3tervicies. D22's rule was right about the wrong values (D37)

**Reported from the screen, and the second report in two days to start with a
screenshot and end in a decision.** Nick set padding through core's Dimensions
control and found the Spacery box in `css` with `var:preset|spacing|50` in every
field. **Core's padding control stores a preset by default**, so this was not an
edge case: it was every tier of every block whose padding had been set the
ordinary way.

**The rule was right and its reach was wrong.** D22 established that a value no
number field can hold puts the whole box in custom mode, and extended it in as
many words to *"whoever supplied it"*. That extension is the defect. The rule is
about what a box **holds** — those values are the author's, they are on the
page, and a box that cannot show one of them is in the wrong mode. An inherited
value is none of those things: it belongs to a wider tier or to core's own
panel, and it is already legible where it was set, in the words core uses.

**The harm was not cosmetic, which is what moved this ahead of the submission.**
In `css` a field takes a whole CSS value. So typing `24` — the obvious thing,
into a mode nobody chose — stored `24`, which `is_value()` accepts (its `NUMBER`
makes the unit optional, for `0`) and the browser then drops. Silent at every
step: the allowlist passes it, the generator emits it, the page ignores it. In
`px` the same keystroke stores `24px`. **A mode the author did not choose turned
the most natural keystroke into a no-op**, and that is a different class of
problem from an ugly placeholder.

`resolveUnit()` now asks `inheritedUnit()` about placeholders — `unitFor()`
minus that one rule, structurally unable to return custom.

**The placeholder took two goes, and the second one is Nick's.** The first
showed the preset's *name* always, reasoning that some presets are `clamp()`
and have no number. His reply was the obvious question and it is right: core's
own panel displays `20px`, so why can Spacery not? It can —
`getCustomValueFromPreset()` is a public export that resolves a reference
against the site's scale, and `var:preset|spacing|30` is `20px` on Twenty
Twenty-Five. **The first shape let the minority case choose the presentation
for every case**, which is the same error as the bug it was fixing, one level
up. A resolved preset now reads like any other inherited length — `20` under a
`px` picker — and the name is the fallback for the four of seven that resolve
to a `clamp()`. Resolving also feeds `inheritedUnit()`, so a preset that is
`1.5rem` opens the box in `rem`. Measured live: `X-Small` → `20`, `Regular` →
`Regular`. Only where a number is expected; in `css` the fields take the raw
reference, which is what the block stores and the only one of the three a
person could type back in.

**Two API shapes measured rather than assumed, and they are the reason to keep
measuring.** `useSettings` returns one value per requested path, so a single
path arrives **wrapped in an array**. A `.find()` over an array of arrays
matches nothing and falls back to the raw reference — which is indistinguishable
from a fix that changed nothing. Read off a live 7.1 editor with a throwaway
`editor.BlockListBlock` filter, the same trick D36's ordering spike used. Note
that `editor.BlockEdit` does **not** work for this: a filter added from the
console after registration never ran. And `getCustomValueFromPreset()` has
three answers worth knowing: a slug the site does not define returns
`undefined`, a non-preset is returned **unchanged** (so a truthy check on the
result is not a test of whether anything resolved), and an undefined `sizes`
**throws**.

Verified in the editor in both directions: inheriting a preset gives `px`,
`Regular`, and `24` → `24px`; holding `var:preset|spacing|60` at the tier still
gives custom and its help line.

**The documentation cost is the interesting part.** `MANUAL-TESTING.md`'s preset
box has now carried **four** different expectations: written expecting custom,
disproved on its first run, corrected to custom-everywhere by D22, split
into the two halves that answer differently, and corrected again when the
placeholder changed from a name to a resolved size. It says so, and ends by telling the
next reader to check it against `length.ts` before believing a failure — because
a box that no longer matches the code manufactures findings, which §3 has
already recorded twice. D22's row keeps its reasoning and gains the note that
half of it was taken back; it is not rewritten.

**And what the POT did this time, for contrast with D36's failure.** The change
moved `SpacingBox.js` line references and changed no string, so the POT was
regenerated and the `.po` merged to match — but the `.mo` and the three JSON
payloads were **left alone**. Their compiled contents are identical apart from a
header timestamp and a field reordering, checked with `msgunfmt` rather than
assumed from `cmp`, and a binary diff carrying only a timestamp is the churn
D34 already refused once. The tarball checksums matched on both sides of both
copies, which is the D36 lesson applied rather than recited.

**Named and not fixed:** the allowlist accepts a unitless non-zero number, which
can never render as spacing. `0` legitimately has none, so the rule is not
simply wrong — tightening it means moving the TS table and `GeneratorTest`'s 38
PHP cases together, and that is a change to make deliberately rather than inside
a UI fix.

### The visualiser, asked in the same breath and declined

Nick also asked whether Spacery should draw the padding overlay core draws when
you hover its Dimensions control. **No, and the reason is the tier.**

- **Core does not export it.** 171 exports on `wp.blockEditor` in 7.1 and the
  visualiser is not among them — only `BlockPopover`, the primitive it is built
  from. This would be a reimplementation.
- **It would be wrong more often than right.** Core's overlay draws the padding
  the block has *on the canvas now*. Spacery edits one tier, and the tier being
  edited is frequently not the tier the canvas previews — the panel says so in
  words. The overlay would then outline a box whose size comes from a different
  tier than the number under the cursor.
- **Core needs it more than Spacery does.** Its control is two sliders labelled
  *Vertical* and *Horizontal*; the overlay is how you learn which edge moves.
  Spacery's box is four fields labelled TOP / RIGHT / BOTTOM / LEFT, and since
  D36 the canvas already shows the applied result for the previewed tier.

If it is ever revisited the gate is "edited tier **is** the canvas tier" — which
is exactly the case where it adds least.

## 3quatervicies. The pre-review, and the half of it that was not what it looked like

**18 September.** WordPress.org's automated pre-review pended the submission
with four findings. The instruction this repo gave itself — read each one
against the code before agreeing with it — earned its keep twice.

**Guideline 11, admin dashboard hijacking: a false positive, answered rather
than changed.** Spacery registers exactly two `admin_notices` callbacks,
`Requirements::register_notice()` and `Spacer::missing_build_notice()`. Both are
`notice-error`, both gated on `current_user_can( 'activate_plugins' )`, both
conditional on the plugin being unable to run at all. Nothing dismissible, no
dashboard widget, no `plugin_action_links` or `plugin_row_meta`, no activation
redirect, and zero hits for upsell wording across `includes/`, `build/` and
`readme.txt`. The only other thing the pattern could have caught is the
top-level `add_menu_page()`, which is D16 and is allowed.

**Bundled `.po`/`.mo`: correct, and it is one finding with the fourth.** See
§3quinvicies; `languages` is out of `package.json#files` now.

**`register_setting()` sanitization: half right, and the half it mentions in
passing was the real one.** All three options already carried a
`sanitize_callback` — the note was about the callback's quality, specifically
that breakpoint labels were `trim()`-only.

- **There was no injection path, and that was checked rather than assumed.** A
  label reaches two places: the editor payload, encoded with `wp_json_encode()`,
  whose slash escaping means a label carrying `</script>` cannot close the
  inline script it travels in; and both bundles, which render it as React text,
  with no `dangerouslySetInnerHTML` anywhere in either. Generated CSS uses
  slugs, which a pattern already confines. Verified by running the real classes
  against `</script><img src=x onerror=alert(1)>`.
- **It is sanitized anyway, in `Breakpoint::create()` rather than at the option
  boundary the reviewer pointed at.** Four callers reach that value — the
  settings screen, a theme's `settings.custom.spacery.breakpoints`, the
  `spacery_breakpoints` filter and a plain `update_option()` — and a rule
  enforced at one door is a rule three callers skip. `sanitize_text_field()`
  also trims, so it replaced the `trim()` rather than sitting beside it, and a
  label that sanitizes to nothing is refused by the empty-label check that was
  already there.
- **The finding worth having was "validate string types".**
  `BreakpointSet::from_array()` cast with `(string)`, which warns and yields the
  literal `Array` for an array and **throws for an object** — an uncaught
  `Error` inside a `register_setting()` sanitize callback, which is a fatal on
  whatever page asked to save. Unreachable through REST, because the
  `show_in_rest` schema refuses a non-string first; reachable from
  `update_option()` in WP-CLI or another plugin, which is the caller this class
  promises never to fatal for. The parts are type-checked now.

**`load_plugin_textdomain()`: correct, and the same finding as the bundled
files.** D20's revision is the record.

**The shape worth keeping:** two of four findings were not what the message said
they were. One was a false positive that cost nothing to answer and would have
cost a round trip to concede. One named the real defect in its final clause and
led with the cosmetic half. **An automated finding is a place to look, not a
conclusion** — and the cheapest way to tell the difference is to run the code.

## 3quinvicies. A language pack would never have loaded, in any locale (D38)

**The largest finding of the release, and the reviewer did not raise it.** It
came out of complying with the one they did. **Half of the premise below was
itself wrong, and D38's row in `PLAN.md` carries the correction** — read that
before acting on this section. What follows is the reasoning as it stood.

Dropping `load_plugin_textdomain()` means JavaScript translations arrive from a
translate.wordpress.org language pack. Core finds those at
`WP_LANG_DIR/plugins/<domain>-<locale>-<md5>.json`, where the md5 is of the
**registered script's path relative to the plugin root** — `build/settings.js` —
and the handle-named file (`<domain>-<locale>-<handle>.json`) is only ever
looked for inside a directory passed to `wp_set_script_translations()`.
Confirmed by reading `_load_script_textdomain_from_src()` on
developer.wordpress.org rather than from memory.

**Spacery's POT referenced `src/settings/App.js`**, because `bin/make-pot.sh`
transpiled the TypeScript and scanned that. **What was wrong:** GlotPress does
not read this repository's POT at all — `/languages` reaches neither the zip nor
SVN, and translate.wordpress.org extracts its own originals from `trunk/`, which
has only ever held `build/`. What *was* genuinely broken is the repository's own
compiled Greek and the CI test that installs it as a pack.

**The fix turned out smaller than the diagnosis.** `wp i18n make-pot` reads the
minified bundles — measured before committing to it, not hoped: scanning
`build/` extracts the identical 136 entries, nothing lost and nothing added. The
costs are exactly two: one translator comment (`css`), where minification moved
the comment off the front of the call, and line references of
`build/extension.js:1`, which tell a translator nothing about where a string
lives. `make-pot.sh` now copies the distributable — `build/`, `includes/`,
`spacery.php`, laid out as the zip lays them — and scans that. `tsc` is out of
the pipeline entirely.

`make-translations.sh` keeps `make-json`'s md5-named output instead of merging
it into one payload per handle, and **asserts the three filenames against
`md5()` of the three bundle paths** — because a payload named after a path core
does not hash is a file nothing opens and looks exactly like a working one. The
three names it produced match the three md5s core computes.

**There is deliberately no stale-build guard, and the reason is worth keeping.**
The obvious one — refuse if any source is newer than the oldest bundle — refuses
on a *fresh* build, because webpack's `output.compareBeforeEmit` leaves an
unchanged bundle unwritten and it keeps its old mtime. Measured on a build one
minute old whose spacer bundle was two days older than the sources feeding it.
So `pnpm run i18n:pot` builds first, and freshness is a property of the command
rather than a heuristic. **§3sexies's "check it per bundle" advice is not enough
either**, for the same reason.

**What this generalises to:** the plugin was carrying a defect that only
appeared when a masking feature was removed, and the mask was a feature nobody
thought of as one. Bundled translations were "nice to have"; they were also the
only reason the naming bug was invisible.

## 3sexvicies. "Unlimited" was false, and the listing page read like documentation

**Two findings in one pass over `readme.txt`, on 19 September, and the first is
the more serious.**

**`BreakpointSet::MAX_BREAKPOINTS` is 12 and a larger set is refused outright**,
while the short description, the plugin header, `package.json`, `composer.json`
and `README.md` all promised **unlimited** breakpoints. That is the
**fourteenth** untrue thing this repository has said about itself, and the first
to reach the directory listing — where it would have been read by every person
deciding whether to install. All six now say twelve.

It is also a new shape. The thirteen before it were claims about *mechanism*,
found by reading code against prose. This one is a claim about a *number*, and
the number was in the code the whole time. **A marketing word is a factual claim
and ages like one.**

**The Description opened with a history lesson** about WordPress 7.1 and reached
what the plugin does for the reader in paragraph three. On a directory page the
first two lines are most of the decision. It now opens on the reader's problem,
leads with why you would use it, and then says plainly who it is *not* for: one
or two breakpoints with a theme that declares them, responsive typography or
hide-on-mobile, block gap, the classic editor, hosts below 7.1/8.2, and the
site-wide-not-per-page constraint. **A listing that names its own limits costs a
few installs it would have lost to a one-star review anyway**, and the support
questions it prevents are the tedious ones.

Three claims in the new copy are measured rather than asserted: the Style Engine
sharing rules between blocks (§3quater's 200-blocks-three-rules figure, which is
M2's exit criterion), the takeover, and the editor preview.

**And the deactivation FAQ gained the one way values can actually be lost.**
§3ter has recorded since 14 September that with the plugin off the attribute is
not registered, so *saving* a post in that state rewrites the block without it —
reading is safe, re-saving is not. That was known internally and recorded
nowhere a user would see it.

**The header `Description` is a msgid**, so the POT was regenerated and the
Greek merged and translated. The three script payloads came back byte-identical,
which is what a PHP-side-only change should do and which was checked rather than
assumed.

## 3septvicies. The release: a rehearsal, a deploy, and what "seems ok" hides

**19 September.** `docs/submission.md` §4 is the phased plan and the record;
this is what the phases cost.

**The plan was ordered around what cannot be undone**, and one of those facts
was found by reading 10up's `deploy.sh` rather than its README: **it bails out
of a re-run with "already published", generates the zip and exits 0** once
`tags/<version>` exists. A second run after a bad deploy therefore reports
success and does nothing. That, plus SVN having no force-push and no delete, is
why everything checkable happened before the tag.

**`BUILD_DIR: ./` is load-bearing and was nearly misread.** In `deploy.sh` it
maps to `false`, which selects the branch that copies the workspace with
`rsync --exclude-from=.distignore`. The other branch copies the build directory
wholesale — and `node_modules` is in the workspace by then, because
`pnpm install` runs two steps earlier. Traced in the source before the tag.

**A rehearsal was built because the deploy step had never run.** `deploy.sh`
supports `dry-run`; `release.yml` had no way to reach it. A `workflow_dispatch`
trigger with the flag derived from the event — a tag push is always a deploy, a
manual run always a rehearsal — made the one unobserved thing observable.
**Building it found two bugs that would have failed the rehearsal itself**: the
version guard reads `GITHUB_REF_NAME`, which on a manual run is the branch, so
it is tag-only now; and `deploy.sh` derives `VERSION` the same way and would
have tried `svn cp trunk tags/refs/heads/main`, so a step reads `readme.txt`'s
`Stable tag` and passes it in. **And the secrets must exist for a rehearsal even
though it never uses them** — `deploy.sh` tests them for emptiness and exits 1
several steps before it consults the dry-run flag.

The rehearsal was clean: `Using .distignore`, `VERSION is 1.0.0`, `trunk/` the
six entries and nothing else.

**Then the deploy, and then the part worth recording.** Told "everything seems
ok", the four `svn` checks and the listing were run anyway. They agreed —
`r3703665`, `trunk/` correct, `tags/1.0.0/`, eight assets, both version strings
`1.0.0` — but **the first read of the listing page reported two screenshots
where there are three**. All three asset URLs return 200 with byte counts
identical to the local files, and a second targeted read confirmed three with
captions in order. **A summary is not a measurement**, which is this file's
oldest lesson arriving on the last day.

**One incidental settlement.** The approval email said the SVN username was
`nikosmoustakas`; the access mail said `nikos.moustakas` twice, the upload
confirmation logged it, the profile page renders it, and WordPress.org's own
commit creating the repository reads *"Adding Spacery by nikos.moustakas."*
The `Contributors` line stays `nikosmoustakas`, the profile slug — a different
thing, which grants the listing rather than authenticating.

**And the listing settled a decision.** It displays *Tested up to: 7.1.1* where
`readme.txt` says `7.1`: the directory resolves the branch to its latest
release, which is what §1 of the runbook reasoned when it declined to bump that
line. Reasoned first, observed second.

## 3duodetricies. The security audit, and the fatal it found (D40)

**21 September**, asked for as a full pass against the WordPress Security API
(`developer.wordpress.org/apis/security/`). `docs/security-audit.md` is the
audit — findings, the checklist section by section, and what was executed rather
than reasoned about. This is what it cost and what it changed.

**One defect, F1, and the shape is the point.** The `spacery` attribute lives in
the block comment delimiter, so it is whatever the last person to edit that post
wrote — not what the inspector wrote. Nest a value one level too deep,
`{"spacery":{"tablet":{"spacing":{"padding":{"top":{"x":"1px"}}}}}}`, and
`wp_style_engine_get_styles()` hands the side's value back as an **array** where
a length belongs. `Generator::force()` then marked every declaration through a
closure typed `string`, and under `declare( strict_types=1 )` that is an
uncaught `TypeError` raised inside a `render_block` filter: a 500 on every page
holding the block, caused by anyone who can edit it and fixable only by someone
who can edit it back.

**Core refuses the identical input one step further on**, in
`WP_Style_Engine_CSS_Declarations::add_declaration()`, with the comment *"Bail
early if value is not a string. Prevents fatal errors from malformed block
markup."* So the input was survivable and this plugin is what made it fatal.
**Spacery got there first, so Spacery has to refuse it first** — the rule D40
records, and it generalises: wherever this plugin handles something before core
does, it inherits core's obligation to be total about it, and a type declaration
is not a guard, it is a way of turning bad input into a fatal.

**Three things made it hard to see**, and all three are the reason the audit was
worth running rather than reasoned about:

- **The editor shows nothing wrong.** `preview.ts` walks string leaves only, so
  it skips the bad one and previews the rest. The author sees a working block
  above a dead page.
- **Deactivating Spacery fixes it**, so the first diagnosis a site owner reaches
  is "Spacery breaks my site", with nothing pointing at the hand-written
  attribute.
- **No gate here could reach it.** The attribute is `mixed`, so it is not a type
  error; it is data, so it is not a lint finding; and the E2E suite drives the
  **inspector**, which cannot produce the shape. That is now its own section in
  `CONTRIBUTING.md`, because it is a permanent property of this code base rather
  than a fact about one bug.

**Two smaller bypasses of the same allowlist went with it.** `prune()` tested
`is_string( $value ) && ! is_value( $value )`, so a number or a boolean fell
through both arms and `flatten()` cast it back on the other side — `5` shipped
as `padding-top:5`, past the one check on generated CSS. And a value was stored
as written while `is_value()` judged it **trimmed**, so whitespace and (since
`trim()` strips it) a NUL rode into the stylesheet on a verdict that had not
seen them. A leaf is now a string that passed the allowlist, stored as the
allowlist read it — which also makes the content hash address the trimmed value,
so `10px` and `" 10px "` share one rule instead of two.

**Nothing else failed, and the checks are worth knowing rather than repeating.**
35 injection payloads — semicolons, braces, CSS comments, `url()`,
`expression()`, `@import`, backslash and unicode escapes, `</style><script>`,
NUL bytes, case games — were run through the real generator and the **real 7.1
Style Engine**, and every one emitted nothing. Hostile style-object *keys* are
neutralised by core: `{"top:red;x": "10px"}` becomes the property
`padding-topredx`, because `_wp_to_kebab_case()` keeps word characters and
`sanitize_key()` strips the rest. Every hostile breakpoint set — an object where
a string belongs, a media-query escape, 13 tiers — is refused whole and falls
back to the preset, none of them throwing. No SQL anywhere, no superglobals at
all, four output sites all escaped, and `manage_options` on both the screen and
the endpoint. Nonces are core's, because Spacery has no form and no AJAX action
of its own.

**The sixteenth untrue thing, and it is D21's.** That row says
`safecss_filter_attr()` "is not in the path" — true of
`wp_style_engine_get_styles()` and **false of the stylesheet a visitor gets**,
which is built through `WP_Style_Engine_CSS_Declarations::get_declarations_string()`
and does run `wp_strip_all_tags()` and `safecss_filter_attr()` over every
declaration. It changes nothing about D21's decision — `safecss_filter_attr()`'s
own allowlist contains `color`, so it would have passed `10px;color:red` in full
— but it is load-bearing in the wrong direction, because it invites the reader
to conclude nothing downstream filters anything, and F3 is what that conclusion
cost. **Corrected in D21 rather than rewritten.**

**Two things about where work runs came out of it**, both in §7 now: the whole
PHP suite can be run in the cloud container through a PHPUnit shim, and the real
Style Engine *is* available there — `tests/contract/core/style-engine` is in the
working tree on the device and stages like anything else. §7 had said the
opposite for weeks, which is why `Generator::generate()` had never been
exercised anywhere but the live site.

**Shipped as 1.0.2** (`8454823`), with ten regression tests asserting each
malformed shape is refused **without throwing** — the assertion that matters,
because the thrower is `render_block` and the symptom is the published page.

## 3c. The spacing extension had no editor preview — the biggest finding of the pass (built, §3novodecies)

**Found 14 September 2026**, while trying to check the "editor preview" half of
§2's two cascade boxes. It is not a defect in built code: **the code was never
written**, and `PLAN.md` has been claiming otherwise since §3.3 was drafted.

`src/extension/register.tsx` registers exactly two filters —
`blocks.registerBlockType` for the attribute and `editor.BlockEdit` for the
panel. There is no `editor.BlockListBlock` filter, no portal, no
`useStyleOverride`, and PHP enqueues only the editor scripts. Confirmed in the
live editor: no `spy-` class and no Spacery `<style>` anywhere in the canvas
iframe, and Group B's `30rem` appears nowhere in that document, with three
blocks carrying values in valid tiers at the time.

**So setting responsive spacing changes nothing the author can see** until they
preview or publish. Core's own responsive editing *does* preview, so an author
working at a narrower viewport watches core's values apply and Spacery's not.

**Why it survived this long.** The spacer block previews correctly — its
`edit.tsx` calls `useCanvasBreakpoint()`, resolves `heightAt()` for the canvas
tier and applies it through `useBlockProps` — and `spacer.spec.ts` tests it. The
half of the plugin that has a preview is the half that is tested; the half
without one is the half nothing looks at. M4's exit criterion claims "the
preview matches the frontend at every tier, verified by an E2E test that
screenshots both"; `extension.spec.ts` contains no such test.

**Spiked the same day — `preview-spike.md`, verdict: build it.** The reason it
was never built (CSS generation in JS means two sources of truth) holds for one
49-line function rather than for the pipeline. Measured in the live editor:
`@wordpress/style-engine` is present as the registered handle `wp-style-engine`
and is the *same* engine, resolving `var:preset|spacing|50` identically;
`effectiveAt()` in `tiers.ts` already does D13's materialization and is tested;
the band list is already published to JS. The one real duplicate is
`Generator::is_value()`, because the JS engine passes `10px;color:red` straight
through exactly as PHP did — and D19 already settled that shape of problem.
Core previews its own responsive spacing by injecting
`@media (480px < width <= 782px)` into the canvas, so §3.3's mechanism is what
the platform does and the media query evaluates against the canvas width for
free. Nothing else depends on the answer — the data model, the generator and the
front-end cascade are all unaffected and all verified working.

## 3d. What the cascade boxes did prove

The front-end half of both §2 cascade boxes passes exactly as D13 describes.
With `widescreen 1400`/`desktop 1250`/`laptop 1000`/`handheld 500`:

- A block with `widescreen: 10px` and `laptop: 40px` emits
  `(1250 < w <= 1400) => 10px`, `(1000 < w <= 1250) => 10px`,
  `(500 < w <= 1000) => 40px`, `(w <= 500) => 40px`. The narrower value wins in
  its own band and inherits downward; it never reaches a wider one.
- A block with only `laptop: 20px` emits nothing at all in the two wider bands.

The segmented/dropdown threshold was proved three ways: five one-character
labels give a dropdown (the count), four long labels give a dropdown (the
budget), and the *same four widths* with short labels give segments (isolating
the budget from the widths). The icon branch never enters any of these, because
the icon key comes from width floors (1200/992/600) and `1400px`/`1250px` both
read as "desktop".

## 4. `effectiveSource`, `resolvedSource`, `defaultSource`

Three questions, three fields, and the naming still invites conflating them.
`Registry::source()` answers what is being **followed**; it returns `custom`
whether or not any breakpoints are stored, while `resolve()` falls through to
the preset when the followed source yields nothing. That is how the screen came
to print `From: the breakpoints you defined` above Spacery's own tiers (E4).

| Field | Answers |
|---|---|
| `effectiveSource` | which source is being followed |
| `resolvedSource` | which source produced the set on the page — now including `filter` (D23) |
| `defaultSource` | which source would be followed if nobody chose |

`resolved_source()` is recorded in two places: before the preset fallback, and
again after `apply_filters` when the filter actually changed the set, compared
by value.

## 5. A commit that described work it did not contain

`cf761f2`'s message claimed the row tint and the field borders. Only the
`Covers` and remove cells carried a class: the python edit script that added the
rest hit an `AssertionError` partway through and **aborted before writing**.
Typecheck, unit suite and E2E all passed — they are about text, and the text was
right. What caught it was loading the screen, making two rows the same width,
and asking the page for `getComputedStyle`, which reported **no
`.spacery-field` elements at all**. `8582891` re-applied all nine edits.

**An edit script must be checked by re-reading the file, not by its exit
status** — a partial write and a clean abort look identical from outside. And
**a class only CSS consumes is invisible to every test here**; the browser is
the only place it is checked.

## 6. What the green run cost — read before pushing anything

Failures that reached CI, each now guarded or documented in
`docs/CONTRIBUTING.md`.

| Job | Failure | Lesson |
|---|---|---|
| `lint:js` | `@param root0` on `SpaceryPanel(props)` | `root0` is the name the rule wants **only** for a destructured parameter. |
| `lint:js` | `_n` imported, unused | `tsc` does not mind; eslint errors. |
| `lint:js` | `settings/types` imported twice | I had it in reach and filtered it away — see §7. |
| `phpcs` | `1 === preg_match( … )` as an argument to `assertSame()` | Read as `NotYoda`: the statement the sniff scans starts at `$this`. Never put a comparison in an argument list. |
| `phpcs` | 11 double-arrow alignment warnings | Align to the array's own longest key. |
| `phpunit` | `Cannot override final method Assert::matches()` | PHPUnit's constraint factories are final; a helper sharing a name is a **fatal at load time** — exit 255, no test runs. |
| `e2e` | 60s timeout clicking a disabled Save | E0/E1 made the server-refusal path unreachable. |
| `e2e` | `Cannot type text into input[type=number]` | `UnitControl` is a number input plus a unit select. |
| `e2e` | `getByLabel('Up to')` resolved to two elements | The ruler is a `role="img"` whose name contains "up to". Playwright matches accessible names as **substrings**. Use a role. |
| `e2e` | `/^Version \d/` matched nothing | The redesign made the masthead tag the number alone. |
| `phpcs` | A stub class added to `tests/php/bootstrap.php` | `Universal.Files.SeparateFunctionsFromOO` refuses a file holding both function and OO declarations, and that bootstrap declares twelve functions. **A stub that is a class goes in its own file**, required from the bootstrap — which is what `style-engine.php` next door was already doing. |
| `phpcs` | `file_get_contents()` in a test | A *warning*, and the run still fails, so warnings are not free here. The repo already had the wording for it twice over (`bootstrap.php:26`, `I18nTest.php:54`) — grep for an existing `phpcs:ignore` before inventing one. |
| `lint:js` | `isDirty()` gained a parameter without its `@param` | `jsdoc/require-param`, and `jsdoc/check-param-names` for the order. `tsc` does not mind, which is the same trap as the unused `_n` import: **typecheck passing says nothing about eslint**. |
| `phpcs` | `strip_tags()` in the two test bootstraps | The warning rule again, on 18 September, in a stub that exists to reproduce `wp_strip_all_tags()` — which is what the sniff recommends and which does not exist in a bootstrap loading no WordPress. Annotated, not rewritten. **Third time warnings have failed a run; they are never free.** |
| `i18n` | The POT was stale after a version-only bump | `wp i18n make-pot` writes the plugin version into `Project-Id-Version`, so bumping the version and nothing else fails the job. It tagged `v1.0.1` before it could work. Regenerate in the bump commit. |

**The deeper one, now four times over: a test that fails after a behaviour
change may be asserting a path that no longer exists.** Twice on
`settings.spec.ts`, once on the duplicate-width blame order, once on
`unitFor`'s ordering. Read the screen before assuming the screen is wrong — and
when reversing a test, say in place why the old assertion was wrong.

Three of my own new unit tests were also wrong rather than the code: the
duplicate-width blame order, a "thin uncovered region" that 1.15 headroom makes
impossible, and the twelve-tier label rule.

## 7. Working notes

**`docs/CONTRIBUTING.md` is the repo-side version of this**, and is the
pre-push checklist. It carries: the POT goes stale when a *line moves* and when
the *version* changes; `__next*` props are deprecated no-ops on 7.1;
`src/types/wordpress.d.ts` is hand-written and `@wordpress/components` is **not**
in `node_modules`; a failing E2E test may be defending a bug; never put a
comparison inside an argument list; never name a test helper after a PHPUnit
assertion; pure logic belongs in a `.ts` module; the ESLint-from-the-store
recipe; the PHPUnit shim; **no gate here can reach a hand-written block
attribute**; how to run E2E against another site; `lint:css` is not a gate and
never was; overriding a components border needs `!important`; `getByLabel` is
ambiguous wherever the label text appears in the ruler's description; and **a
JavaScript translation is found by the *built* path**, which is D38 and the
reason `pnpm run i18n:pot` builds first.

**Stage explicit paths, never `git add <dir>`.** A `git add languages` once
swept in a stray `…-editor-script 2.json` and Plugin Check failed the whole
distributable on the space in its name. `bin/check-release.py` now refuses any
tracked file whose name falls outside `[A-Za-z0-9._-]`. There is an untracked
`Claude outputs/` folder in the repo root whose name has a space: harmless while
untracked, fatal if added, and now in `.gitignore`.

What follows is specific to running this work from a Claude session.

- The repo is on the user's machine at `~/Documents/GitHub/spacery`. Edit in
  place. The MAMP site is at `~/Dev/playground`, served from
  `https://playground:8890`, with `wp-content/plugins/spacery` a symlink to the
  repo. **Both the repo and `~/Dev/playground` are connected** as of the
  14 September session, so mu-plugins and themes are reachable without asking.
- **Pushing must be done by the user.** The session VM's `$HOME` is not the Mac
  account: no SSH keys, no `~/.gitconfig`, no `gh`. Git identity is repo-local.
- **The front end can only be read through the browser, not `device_bash`.**
  `curl https://playground:8890/...` from the device shell fails with exit 7:
  that shell's network goes through a proxy that allow-lists by host name, and
  `playground` is a MAMP host alias on the Mac itself. So any front-end CSS
  check runs in the browser tab. Two consequences: a **draft** page cannot be
  fetched at all (publish it, read it, put it back to draft — that is what was
  done for §4), and `javascript_tool` refuses to return anything it reads as
  cookie or query-string data, so return **computed summaries** (counts, booleans,
  matched rules) rather than raw CSS text or preview URLs. **A hex hash is read
  as opaque data too** — it was refused on 19 September, so pass the expected
  value *into* the page and return the boolean comparison.
- **`git diff --stat` and `git show --stat` throw a `Bus error` here** on
  anything but a small diff, and the failure is silent in the worst way: a
  13-file commit rendered as an *empty* stat, which reads exactly like an empty
  commit. `--name-only` works. Use it, or `git show --name-only --format= <sha>
  | grep -c .`, before believing a commit did nothing. The same command also
  killed a `git log -S` earlier in the session.
- **The browser tools can go down mid-session.** On 14 September the permission
  classifier timed out and refused `navigate`, `javascript_tool` and
  `browser_batch` for a stretch while `device_bash` kept working. It recovers;
  the useful response is to switch to source-reading work rather than retrying
  in a loop. `computer` screenshots sometimes pass while `javascript_tool` is
  refused, so a read-only look at a screen may still be available.
- **A minimized Chrome window reports `innerWidth: 0` and every measurement is
  wrong without saying so.** The first run of the measuring script returned
  help text 117–214px wide and `document.visibilityState: 'hidden'`;
  `resize_window` reported success and changed nothing, and `computer`
  screenshots failed with "Cannot take screenshot with 0 width". The fix that
  worked was `tabs_create_mcp` — a *new* tab in the group laid out at the real
  1502px even though the window stayed minimized. **Assert `innerWidth` before
  trusting any layout figure**, and do not spend calls resizing a window that
  is not on screen.
- **A form on wordpress.org may not submit on a scripted click.** The readme
  validator's Validate button reported as clicked, the page did not reload, and
  the textarea kept its contents — indistinguishable from a clean validation.
  `form.requestSubmit()` worked. **And hash what you pasted against the file**
  before believing the result: a paste is a copy, and a copy can be stale.
- **`vitest` and `eslint` cannot run in `device_bash`.** `node_modules` is
  installed for the Mac, so rolldown's native binding and the eslint import
  resolver's are both missing on the Linux VM; eslint's failure is loud and
  misleading — 71 "Resolve error: Cannot find native binding" entries formatted
  as lint errors. `tsc --noEmit`, `prettier` and `wp-scripts build` are pure JS
  and do run. Unit tests and `lint:js` belong to the host or CI.
- **Ask for delete permission before the first commit of a session**, and again
  for `wp-content` when a section needs cleaning up. The grant is lost whenever
  the bridge reconnects, and without it a commit lands but git cannot unlink its
  temp objects or `.git/index.lock`, which blocks the next git command.
  `device_request_delete_permission`, then `rm -f .git/index.lock
  .git/HEAD.lock` and `find .git/objects -name 'tmp_obj_*' -delete`. **This
  happened again on 19 September**, exactly as described, one commit in.
- **`build/` can be rebuilt on the device**, which removes the need to ask for a
  fresh build and the risk of judging a stale one. `pnpm` is absent and
  `node_modules/.bin/wp-scripts` is a shell script, so run the entry directly:
  `node node_modules/@wordpress/scripts/bin/wp-scripts.js build`. It fails first
  with `MODULE_NOT_FOUND` from `browserslist`, which resolves
  `@wordpress/browserslist-config` from the project root rather than where pnpm
  put it. One symlink fixes it for good:
  `ln -sfn ../.pnpm/@wordpress+browserslist-config@6.54.0/node_modules/@wordpress/browserslist-config node_modules/@wordpress/browserslist-config`.
  **Do not judge freshness by mtime** — `compareBeforeEmit` leaves an unchanged
  bundle unwritten (§3quinvicies). Rebuild instead; it takes two seconds.
- **What runs where.** On the device: the webpack build (above);
  `node node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/bin/tsc --noEmit`;
  prettier via `node node_modules/.pnpm/prettier@3.9.6/…/prettier.cjs`; and
  **ESLint, which does run** — not through `wp-scripts lint-js`, but directly at
  `node_modules/.pnpm/eslint@9.39.5*/node_modules/eslint/bin/eslint.js`. Its
  import resolver cannot load its macOS native binding and reports one error per
  file: filter by **message**, never by rule name (the resolve error is reported
  *as* `import/no-duplicates`, and filtering by rule once threw away a real
  violation that failed CI). The resolver's noise is a **multi-line stack**, so
  use `-f json` and drop whole messages — a line-based `grep -v` leaves most of
  it behind and the trailing count still includes it. Not on the device: Vitest
  (native rolldown bindings), `npm` (arborist crashes), anything needing PHP.
- **In the cloud container:** everything else, and **PHP 8.4 is present**.
  Two checkouts are worth reusing — `/home/claude/spacery-test` (Vitest) and
  `/home/claude/spacery-pot` (POT, translations, `php -l`). **The container is
  new every session**, so these have to be rebuilt: tar what you need from the
  device into the repo root, `device_stage_files` it, and extract over the
  checkout. Delete the tarball afterwards; it must never be committed.
- **The whole PHP suite runs in the container, through a PHPUnit shim.** PHPUnit
  itself cannot install — packagist is refused — but a ~60-line shim declaring
  `PHPUnit\Framework\TestCase` with this suite's assertions, the `DataProvider`
  attribute, and a reflection runner executes all ten test classes: **196
  assertions, green**, on 21 September. Three things to get right, each of which
  reads as a test failure when it is a shim failure: make the assertions
  **static** (parts of the suite call `self::assertSame()`), support
  `@dataProvider` **as well as** the attribute (this suite uses both), and add
  missing assertions rather than guessing at them. Recipe in `CONTRIBUTING.md`.
  It cannot see PHPCS, PHPStan or a class-level collision, which is where every
  PHP CI failure here has actually come from.
- **The real Style Engine is available in the container**, and this file said
  the opposite for weeks. `tests/contract/core/style-engine` is fetched by
  `bin/fetch-core.sh` and is **in the working tree on the device**, so it stages
  like anything else and `tests/php/style-engine.php` loads it with six helper
  stubs. That is what made the security audit's 35 injection payloads a
  measurement rather than an argument. Note that the suite's
  `safecss_filter_attr()` stub passes everything through — deliberately, so a
  result is a property of Spacery's allowlist and not of core's.
- **`svn` installs in the container and reaches WordPress.org.**
  `apt-get install -y subversion`, then `svn info` / `svn ls` / `svn log` /
  `svn cat` against `https://plugins.svn.wordpress.org/spacery` all work
  anonymously. That is how Phase 4 was verified on 19 September and how 1.0.2's
  deploy was verified on the 21st, and it is the fastest way to see what the
  directory actually holds.
- **Keep the repo docs and their Project twins in step.** `docs/PLAN.md` ↔
  `claude/spacery-2.0-plan.md` and `docs/STATUS.md` ↔ `claude/spacery-status.md`
  are the same documents. Stage the repo file off the device, copy it into the
  container's working directory (`project_write` refuses a `local_path` under
  `/mnt/user-data/uploads`), and pass that to `project_write` as `local_path`,
  which uploads it without reading it into context. **This file gained its repo
  twin on 22 September 2026**, which is what stopped it being edited by retyping
  45KB through `project_write` — and which is why its §1 box spent two releases
  claiming 1.0.0 was live.
- **There is a render-and-look loop, and it is worth the setup.** A throwaway
  Vitest test in the container renders the *real* modules to HTML; headless
  Chromium (`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`) screenshots
  it; then look at the image. That caught the axis-label collision, the blank
  twelve-tier band and the illegible `no tier` label, and compared the two slug
  models.
- **Verify CSS claims in the real admin, not by reasoning.** Specificity against
  `@wordpress/components` cannot be worked out from here — the package is not in
  `node_modules`. Load the screen, provoke the state, read
  `getComputedStyle(el)`.
- **The editor is faster to drive from the console than by clicking.**
  `wp.data.dispatch('core/block-editor').selectBlock(id)`,
  `updateBlockAttributes`, and a native-setter helper for React inputs
  (`Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,v)`
  then dispatch an `input` event). Read back with
  `wp.data.select('core/block-editor').getBlock(id).attributes.spacery` — the
  only way to know what was stored. **Client ids are regenerated on every editor
  load.** Also: `computer type` does not always register with these controls
  while `computer key` does, and a segmented control's box under the cursor is
  the *hover* affordance, not the selection — move the mouse away before judging
  a screenshot.
- **PHPCS and PHPStan cannot run anywhere in this environment**: packagist is
  refused by the egress policy (`CONNECT tunnel failed, 403`). CI is the first
  place they run, and style plus class-level collisions is where every PHP CI
  failure has come from. A python sweep for the two sniffs that bit (array `=>`
  alignment, a comparison used as a call argument) is worth re-running on
  touched PHP.
- **A workflow that cannot run can still be tested.** `release.yml`'s guard step
  was pulled out of the YAML with `yaml.safe_load`, written to a file and run
  under bash against the real files, with `GITHUB_REF_NAME` set by hand. **And a
  GitHub Action's behaviour can be read rather than guessed**: `deploy.sh` is
  fetched from `raw.githubusercontent.com/10up/action-wordpress-plugin-deploy/stable/`,
  and reading it is what settled `BUILD_DIR: ./` and found the silent
  "already published" early exit (§3septvicies).
- **The POT pipeline needs no workaround as of D38.** `wp i18n make-pot` runs
  against a copy of the distributable and needs neither `tsc` nor the
  `block-i18n.json` seed wrapper earlier sessions built. Run
  `WP_CLI=/path/to/wp-cli.phar bash bin/make-pot.sh`, then `msgmerge
  --no-fuzzy-matching --update` and `msgattrib --no-obsolete` on the `.po`, then
  `WP_CLI=… bash bin/make-translations.sh` — which asserts its own output names
  against `md5()` of the three bundle paths. Check the result by confirming
  those three JSON files exist; a payload named anything else is one nothing
  will ever open. **`wp-cli.phar` refuses to run as root**, so wrap it:
  `printf '#!/bin/sh\nexec php /tmp/wp-cli.phar --allow-root "$@"\n' > /tmp/wp`,
  and `make-pot.sh` needs `node` on `PATH` (`/opt/node22/bin`) to read
  `package.json#files`.
- **Greek terminology**, for consistency when adding strings: D39 is the rule —
  core's word wherever core has settled one (`Γέμισμα` padding, `Περιθώριο`
  margin, `Διαστήματα` spacing, `Κενός Διαχωριστής` spacer), and English only
  where the corpus is empty, which is exactly `breakpoint` and `viewport`.
  `σημεία διακοπής` breakpoints, `σύνολο` a set, `χρησιμοποιείται` "is in use",
  `ιστότοπος` the site, `καμβάς` the canvas. Source names are lowercase noun
  phrases because they are interpolated into `Από: %s`. **Check
  translate.wordpress.org's consistency tool before inventing a Greek term.**
- **Regenerate the POT as the last step before every push** that touched
  `includes/`, `spacery.php` or `src/` — **or the version**. Not `docs/`,
  `tests/`, `CHANGELOG.md` or `README.md`, which are not scanned. Since D38 a
  comment-only edit in `src/` moves nothing, because the scan reads minified
  bundles; a *string* change still moves everything, and a version bump moves
  exactly one header line.
- **A non-ASCII sweep is worth running on generated source.** A stray Cyrillic
  word once turned up in a `Ruler.tsx` comment.
- **WordPress core source can be read from `developer.wordpress.org`** with
  WebFetch — the reference pages carry the full function source. That settled
  D20 and, on 18 September, D38, by way of
  `_load_script_textdomain_from_src()`. Neither a core checkout nor `core.trac`
  is reachable from here.
- **CI status cannot be read from here** — `api.github.com` is refused — so the
  user reports results. Ask for the job output rather than guessing.
