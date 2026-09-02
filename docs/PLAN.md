# Spacery — Architecture & Rewrite Plan

**Status:** Draft · 1 September 2026
**Target first release:** `1.0.0` (see D9)
**Repo:** `github.com/moustakalis/spacery`
**Legacy reference:** `~/Documents/Bitbucket/spacery` — keep, do not modify. Its plugin
header claims `1.0.0`, but it was never buildable and never released, so that number is
free to reuse.

---

## 1. Why now

WordPress 7.1 shipped on **12 August 2026** with native responsive block styles. Any block
using core block supports (typography, color, background, border, dimensions, spacing,
layout) now accepts `@mobile` and `@tablet` keys inside its `style` attribute, and themes
configure the breakpoints through `settings.viewport` in `theme.json`.

That is most of Spacery v1's original pitch, absorbed into core. Rebuilding v1 as-was
would ship a plugin that core made redundant three weeks before release.

Three gaps remain open, and they define what Spacery is:

**Gap 1 — Core gives you exactly two breakpoints, and they are not extensible.**
`settings.viewport` accepts only `mobile` and `tablet`. It is top-level only (no
per-block-type configuration), and the cascade is desktop-first: base styles are the
desktop values and cascade down. A design system with four or five tiers — laptop and
wide-desktop as well as tablet and mobile — cannot be expressed at all.

**Gap 2 — The core Spacer block's height is still not responsive.**
`core/spacer` declares `height` and `width` as plain top-level string attributes, not
`style.dimensions.height`. Responsive styles only apply to the `style` object under block
supports. So in WordPress 7.1 the core Spacer gets responsive *margins* and a stubbornly
fixed *height*. The relevant issues are still open and unassigned:
[#67620](https://github.com/WordPress/gutenberg/issues/67620) (Dec 2024),
[#10081](https://github.com/WordPress/gutenberg/issues/10081) (open since 2018, "Needs
Design Feedback"), tracked under [#54273](https://github.com/WordPress/gutenberg/issues/54273).
Eight years, no fix.

**Gap 3 — Nothing exposes an arbitrary breakpoint set to other extenders.**
Themes ship design systems with named tiers. Core has no registry for them beyond two
slots.

### Positioning

> **Spacery is a responsive spacing toolkit for the block editor: unlimited,
> theme-defined breakpoints for spacing on any block.**

Two deliverables in one plugin:

- **A. `spacery/spacer`** — a spacer block with per-breakpoint height and width. Narrow,
  obviously useful, and directly fills the gap core has left open for eight years.
  Note that the originating complaint ([#67620](https://github.com/WordPress/gutenberg/issues/67620))
  is itself desktop-first: *"when we set more than 100px height then that space is too
  much for mobile devices."*
- **B. Responsive spacing extension** — adds per-breakpoint padding, margin and block gap
  to any block declaring `supports.spacing`, via a namespaced attribute and server-side
  CSS. This is the part core cannot easily obsolete, because it is N-breakpoint by design.

Deliverable A is the beachhead: shippable alone, and it validates the entire pipeline
(registry → attribute → CSS → editor preview) on a single block before that pipeline is
pointed at the whole core block library.


### Competitive landscape

The gap is real but not unoccupied. Checked on WP.org, September 2026:

| Plugin | Installs | Responsive model | Last updated |
|---|---|---|---|
| **Flexible Spacer Block** | 4,000+ | 3 device classes, **2 variable breakpoints** | 1 month ago, tested to 7.1 |
| CMP Fluid Spacer | <10 | Fluid / `clamp()`-style heights | — |
| Gosign Advanced Separator | 300+ | Separator styling, not responsive spacing | — |

Two conclusions.

**The demand is validated.** Flexible Spacer Block has 4,000+ active installs doing
precisely what core refuses to do, and it is actively maintained against 7.1. People want
this.

**A spacer block alone is a crowded, defended position.** Flexible Spacer Block is
established, maintained and free. Shipping only Deliverable A would mean competing on
identical ground against an incumbent with a four-year head start.

This is the strongest argument for the toolkit scope: *unlimited, theme-defined*
breakpoints applied to *any block's* spacing is a category nobody in the directory
occupies. Two fixed breakpoints is what every competitor offers, because it is what core
offers. N breakpoints sourced from the theme's own design system is the differentiator —
and it is not a feature an incumbent can bolt on, because it changes the data model.

**Name check:** no plugin named "Spacery" exists in the directory; the slug appears free.
Confirm at submission time — availability is not reserved.

---

## 2. What v1 got wrong (and what to keep)

The full audit is in the conversation; the short version, because each item maps to a
design decision below.

**Fatal:**
- `import { reactive } from 'vue'` in a React codebase, with `vue` absent from
  `package.json` (present only in `yarn.lock`). Build fails from a clean install.
- No `webpack.config.js`, but `block.json` points at `build/spacery`. Nothing produced it.
- Every breakpoint above mobile defaulted to `0px` and all six media queries were emitted
  unconditionally, so setting only the mobile height collapsed the spacer everywhere else.

**Architectural:**
- `<style>` tag written inside `save()` into post content — stripped by `wp_kses_post` for
  any user without `unfiltered_html`, unbounded style tags per page, and no `deprecated`
  array, so the save string was frozen forever.
- `save()` never called `useBlockProps.save()`, so `supports.anchor` and all block-support
  output were silently dropped on the frontend.
- Editor preview read `window.innerWidth` (wrong: sidebars, and the canvas is iframed) and
  nothing subscribed React to changes, so it never re-rendered on resize.
- Unsanitized attribute interpolated into a CSS rule.
- Tailwind wired up but inert — `purge` pointed at a filename that does not exist, using
  v2 config keys under v3. The only real CSS in the project was three lines.

**Worth keeping:** honestly, very little. v1's one structural instinct — the mobile-first
`min-width` cascade — has been **deliberately reversed** for v2; see D10. Its breakpoint
values were Tailwind's, which is a coupling v2 does not want either. What survives is the
problem statement, not the solution.

---

## 3. Architecture

### 3.1 Data model

One namespaced attribute, injected into every block we extend:

```jsonc
{
  "spacery": {
    "spacing": {
      "base": { "padding": { "top": "2rem" } },
      "md":   { "padding": { "top": "3rem" } },
      "xl":   { "margin":  { "bottom": "var:preset|spacing|50" } }
    }
  }
}
```

Three decisions are baked in here.

**Mirror core's `style` shape, keyed by breakpoint slug.** Each per-breakpoint object is
shaped exactly like a core `style` object, so it can be handed straight to
`wp_style_engine_get_styles()` — which gives us correct CSS, preset resolution
(`var:preset|spacing|50` → `var(--wp--preset--spacing--50)`) and classname generation for
free. If core ever widens `@mobile`/`@tablet` to N keys, migration is a key rename.

**Own the namespace; do not write into core's `style`.** Injecting `@sm` keys into the
native `style` attribute would piggyback core's plumbing, but core owns that object and
may strip or collide with unknown `@`-prefixed keys. A `spacery` attribute is inert to
core.

**No `source`, therefore no HTML.** Attributes without a `source` are serialized into the
block comment delimiter as JSON, not into markup. This is the single most important fix
over v1:

- We never touch `save()` output, and never use `blocks.getSaveContent.extraProps`.
- Therefore **zero block-validation risk** — the failure mode that made v1's design a
  one-way door.
- Deactivating Spacery leaves every post valid. The JSON sits inert in the delimiter and
  is picked back up on reactivation. No orphaned markup, no "unexpected content" errors.

For `spacery/spacer`, the same structure is native to the block rather than injected, with
`dimensions.height` / `dimensions.width` per breakpoint.

### 3.2 Breakpoint registry

A breakpoint is `{ slug, label, min }` where `min` is a CSS length. One PHP class owns
resolution; JavaScript never computes its own.

**One source at a time — the user chooses which.** An earlier draft of this plan had a
priority cascade that could blend a theme's two breakpoints with Spacery's wider tiers.
That was wrong: it produces a set nobody designed, mixing theme-chosen and plugin-chosen
values in a way no one can reason about. Each source instead yields one internally
coherent set, and a single stored option decides which is active.

| Source | Yields |
|---|---|
| `theme` | `settings.custom.spacery.breakpoints` if the theme declares it; otherwise core's own two boundaries from `settings.viewport`, used verbatim — `tablet` and `mobile`. Nothing added, nothing invented, nothing converted. |
| `spacery` | The built-in preset (below). |
| `custom` | A set the user defines on the settings screen. |

**The built-in preset.** Desktop-first: the base styles are the default and each tier is a
`max-width` override beneath it.

| Tier | Boundary | |
|---|---|---|
| *(default)* | — | Applies at every width. Unnamed, exactly as in core. |
| `desktop` | `≤ 1280px` | |
| `laptop` | `≤ 1024px` | |
| `tablet` | `≤ 782px` | **core's value and name** |
| `mobile` | `≤ 480px` | **core's value and name** |

Two properties make this the right default. It is **anchored on core** rather than on a
CSS framework — the two tiers that overlap `settings.viewport` match it in both name and
value, so switching a site from the `theme` source to `spacery` *adds* tiers without
moving the boundaries it already had. And the names **say what they are**, so nothing has
to be learned or translated.

Explicitly rejected: Tailwind's `sm`/`md`/`lg`/`xl`/`2xl`. Those are ascending
min-width names — `lg:` means *≥1024px* — so reusing them for descending max-width tiers
would invert their meaning for every reader who knows them. v1 took both its values and
its naming from Tailwind; v2 takes neither. Themes remain free to name their tiers
anything they like through `settings.custom.spacery.breakpoints`.

**Default when the option is unset:** `theme` if the theme declares either
`settings.custom.spacery.breakpoints` or `settings.viewport`; `spacery` otherwise. Out of
the box a site therefore agrees with core, which is the safe default given the cascade
collision in §3.3a — and switching to Spacery's richer set becomes a deliberate act with a
visible trade-off, rather than something that silently happens because a theme author set
a core setting for core's benefit.

**Reading the `theme` set from `settings.viewport`.** There is no derivation. Core's
values are already `max-width` boundaries in Spacery's own model, so they are read
verbatim: `mobile: 480px` is Spacery's `mobile` tier at `≤480px`. An earlier draft
converted them into stepped `min-width` minimums (`480.02px`) to fit a mobile-first
cascade; D10 removed that cascade and the whole conversion with it. Where the theme
declares `settings.custom.spacery.breakpoints` instead, that set is used as-is — the theme
has spoken to Spacery directly.

For the generated media queries themselves, call
`WP_Theme_JSON::get_viewport_media_queries()` where the tiers came from
`settings.viewport`; it is `public static`, and reusing it means core's output and
Spacery's cannot drift.

Then, unconditionally: `apply_filters( 'spacery_breakpoints', $breakpoints )`. The filter
runs **last** so developers always have the final word, whichever source was active.

**Validation** (reject the set and fall back to the built-in preset on failure): slugs
unique and `[a-z0-9-]`, boundaries strictly **descending**, every value a positive length
with a unit of `px`/`rem`/`em`. This mirrors core's own rule exactly — see Appendix A for
the verified regex and the ×16 conversion used for ordering comparisons. There is no
`0px` base entry: the default tier is the absence of a media query, not a boundary, so it
is never part of the set.

**Exposure to JS:** the resolved set is passed into the editor through **our own
namespaced editor setting**, never recomputed client-side. One source of truth means the
editor preview and the frontend CSS cannot disagree — a class of bug v1 had structurally.

Core's own `settings.viewport` *is* reachable from JavaScript — verified, see Appendix A —
via `useSettings( 'viewport' )`. We deliberately do not depend on that path:

- Spacery's set is N-tier and *derived* from core's 2-tier values, so it is not the same
  data. Reading core's raw values in JS would mean re-implementing the derivation
  client-side, which is exactly the two-sources-of-truth bug we are avoiding.
- It resolves through `__experimentalFeatures`, an explicitly experimental surface.
- The derivation already has to happen in PHP for the frontend CSS. Doing it twice is
  strictly worse than doing it once and shipping the answer.

So: PHP reads `settings.viewport`, derives, and hands the finished set to the editor.
`useSettings( 'viewport' )` stays available as a debugging cross-check, not a dependency.

### 3.3 CSS generation

**Frontend — `render_block` filter, server-side, no markup rewriting.**

1. Read the `spacery` attribute. Normalize (sort keys, drop empties, drop breakpoints with
   no declarations).
2. Hash the normalized object → stable class `spy-{hash8}`. **Content-addressed**: two
   hundred blocks sharing one spacing recipe emit one rule, not two hundred. This is the
   direct answer to v1's style-tag-per-block problem.
3. For each breakpoint, `wp_style_engine_get_styles()` → declarations.
4. Add the class to the block's wrapper via `WP_HTML_Tag_Processor` (append to `class`,
   never rebuild the tag).
5. Push the rules into a **named Style Engine store** (`context => 'spacery'`).
   Spacery does not decide where the CSS goes; core does. See D14.

**Ordering:** base rule first (no media query — it is the default, exactly as in core),
then `max-width` media queries in **descending** order so narrower tiers override wider
ones. Because it is one generated stylesheet we control cascade order absolutely — no
reliance on source order in post content. Queries use core's range syntax verbatim, e.g.
`@media (width <= 782px)`, so a Spacery rule and a core `@tablet` rule are byte-identical
in their conditions.

**Specificity — the one genuinely awkward problem.** Core writes block support styles as
*inline* `style=""` on the wrapper. An inline declaration beats any class selector, so a
media-query override from a class will lose. Core solves this for its own responsive
styles by marking non-layout per-instance declarations `!important`. We follow that
precedent: `!important` on media-query overrides only, never on the base rule. It is ugly,
it is what core does, and the alternative is worse.

*Spike for 1.1 (do not block 1.0):* rewrite the wrapper's inline `style` with
`WP_HTML_Tag_Processor` to `padding-top: var(--spy-pt, 3rem)` and set `--spy-pt` per
breakpoint from our class. That removes `!important` entirely and is a strictly better
cascade story — but it means mutating core's output, which needs its own risk assessment.

**Placement is core's job (D14).** `wp_enqueue_stored_styles()` ends by iterating every
Style Engine store — "any other stores registered by themes or otherwise" — registering,
inlining and enqueuing each one. Filling a store instead of printing means core places
Spacery's CSS correctly for both theme types, without Spacery re-deriving the rules:

| Theme | Why the CSS ends up in the head |
|---|---|
| Block | `template-canvas.php` renders the whole template into a variable *before* `wp_head()` — its own comment reads "This needs to run before `<head>` so that blocks can add scripts and styles in `wp_head()`." Every block has rendered by the time core reads the store on `wp_enqueue_scripts`. |
| Classic | Content renders during `the_content`, after the head is gone, so core reads the store on `wp_footer`. Since WordPress 6.9, `wp_hoist_late_printed_styles()` output-buffers the template and lifts footer-printed styles into the head. |

The classic half works only for styles left in the footer **queue**, because the hoist
captures `wp_styles()->do_footer_items()`. Printing directly with `wp_print_styles()`
marks the handle done before the capture runs and strands the CSS in the footer. M2's
first implementation did exactly that, and the investigation into "should this be in the
head?" is what found it.

**Editor — same rules, injected into the iframe.**
Since 7.1 the post editor is *always* iframed regardless of block API version, so styles
must land in the iframe document. Start simple: render a `<style>` element from the
`editor.BlockListBlock` HOC alongside the block. Because the block renders inside the
iframe, the style element lands there automatically, and content-addressed classes make
duplicates idempotent. Optimize to a single portal-injected stylesheet in the iframe head
only if profiling on a large post says it matters.

### 3.3a Coexisting with core's responsive styles

This was the sharpest technical problem in the project. **D10 dissolved most of it.**

The original design ran a mobile-first `min-width` cascade against core's desktop-first
`max-width` one. Two opposite cascades over the same properties meant overlapping rules
whose winner depended on source order, plus a two-mental-models problem for anyone using
both systems on one page. Aligning direction removes the conceptual clash entirely: a
Spacery rule and a core `@tablet` rule are now ordinary rules in one cascade, with
byte-identical media conditions.

What remains is the ordinary, well-understood part:

**Specificity.** Core writes block support styles as *inline* `style=""` on the wrapper,
and an inline declaration beats any class selector. Core solves this for its own
responsive styles by marking non-layout per-instance declarations `!important`. Spacery
follows that precedent: `!important` on media-query overrides only, never on the base
rule. Ugly, but it is what the platform does, and diverging would be worse.

**Double declaration.** A block can still carry both a core `@tablet` value and a Spacery
`tablet` value for the same property. This is no longer a cascade puzzle — later wins, and
Spacery's stylesheet is enqueued after global styles — but emitting both is confusing to
anyone reading the CSS. It is resolved in the inspector rather than the stylesheet: see the
takeover flow in §3.5.

*Spike for 1.1 (do not block 1.0):* rewrite the wrapper's inline `style` with
`WP_HTML_Tag_Processor` to `padding-top: var(--spy-pt, 3rem)` and set `--spy-pt` per tier
from our class. That removes `!important` entirely — but it mutates core's output, so it
needs its own risk assessment.

### 3.4 `responsive-state` integration

`responsive-state@0.1.0` is a near-perfect fit and replaces the entire
`src/js/responsive-states/` directory from v1.

- `get()` / `subscribe()` / `getServerSnapshot()` is exactly the triple
  `useSyncExternalStore` wants. One hook, correct tearing behaviour, no manual resize
  listener. This alone fixes v1's "preview never re-renders" bug.
- **`options.window` is the fix for v1's worst bug.** Pass the editor iframe's
  `contentWindow` and the store reports the breakpoint of the *canvas*, not the browser
  window. v1 measured `window.innerWidth` with sidebars open and iframing — structurally
  incapable of being right.
- `pick( values, fallback, { fallbackDirection: 'down' } )` resolves a value by falling
  back to the nearest **larger** defined tier — desktop-first, exactly what D10 needs.
  Shipped upstream in **0.2.0**; `'up'` remains the default, so the change was additive.
  Spacery pins `^0.2.0` and needs no local fallback logic.
- `createResponsiveState()` takes an arbitrary `BreakpointMap`, so the registry's resolved
  set feeds straight in. Spacery passes its own tiers and uses none of the bundled
  presets — `tailwind`, `bootstrap`, `material` and `devices` are all ascending
  min-width sets, and Spacery is deliberately not coupled to any framework's values.
- **Direction.** The store builds `min-width` queries internally. Spacery's tiers are
  `max-width` boundaries, but the two describe the same partition of the width axis, so
  Spacery derives ascending minimums once when constructing the store and keeps its CSS
  output on core's exact `max-width` values. The 0.02px step therefore survives in one
  place only — editor-preview bookkeeping — and never reaches generated CSS.
- Dependency-free, SSR-safe, 2 kB budget, typed. No footprint concerns in an editor bundle.

```ts
// src/breakpoints/useCanvasBreakpoint.ts
const store = createResponsiveState(breakpointsFromServer, {
  window: iframeWindow,      // the canvas, not the browser
  trackViewport: true,
  ssrBreakpoint: 'base',
});

const snapshot = useSyncExternalStore(
  store.subscribe, store.get, store.getServerSnapshot
);
```

**Action:** consume it as a published npm dependency, linked via a pnpm workspace during
development so the two repos can evolve together. If the editor integration surfaces
missing capability (e.g. a `container` mode driven by `ResizeObserver`), that belongs
upstream in `responsive-state`, not vendored here.

**Upstream request: delivered.** `pick()` gained a `fallbackDirection` option in
`responsive-state@0.2.0`. The original specification is kept at
`docs/responsive-state-request.md` for the record. Verified against the published tarball
with Spacery's real tier values before pinning: tier selection is correct at every
boundary, desktop-first inheritance flows to narrower tiers, exact matches beat inherited
values, and mobile-first behaviour is unchanged when the option is omitted.

### 3.5 Editor UX

**Spacery has no viewport switcher of its own.** An earlier draft proposed a segmented
`Default · Desktop · Laptop · Tablet · Mobile` control inside a Spacery panel. Reading how
core 7.1 actually works made that a mistake: responsive editing there is a *mode*, not a
per-control toggle.

The user enables "Responsive styles" from the View menu, then picks Desktop/Tablet/Mobile
**or drags the canvas edge**. From that point every inspector control edits the selected
viewport's values, with a badge at the top of the Settings panel naming it. Under the hood
([PR #75121](https://github.com/WordPress/gutenberg/pull/75121)) **canvas width in pixels
is the single source of truth**; device type is derived from it, not the reverse.

A second switcher inside a Spacery panel would compete with that — the editor announcing
"Tablet" while Spacery announced "Laptop". So Spacery follows core's editing viewport
instead of declaring its own.

**This is a gift rather than a constraint.** Because canvas width drives everything and
Spacery has more tiers than core has device presets, dragging the canvas to 900px selects
Spacery's `laptop` tier with no new UI at all. Core's resizable canvas *is* the N-tier
switcher, using a mechanism the user already knows.

**Mechanism.** A `ResizeObserver` on the canvas iframe feeds a `responsive-state` store
built from the registry's tiers; `useSyncExternalStore` subscribes React to it. Deliberately
not `getCanvasWidth()` — that selector is private — and not `getDeviceType()`, which has
only three values and cannot express five tiers.

**The one piece of new UI is a label, not a control.** Core's badge and Spacery's tier will
not always agree: at a 900px canvas core says "Desktop" (>782px) while Spacery says
"Laptop" (≤1024px). Both are correct within their own set, and hiding the discrepancy would
be worse than naming it. Spacery's panel header states the active Spacery tier and its
boundary — "Laptop · ≤1024px" — so the user always knows which rule they are writing.

**Spacery is absent at the default tier.** Core's ordinary spacing controls already *are*
the default tier, so a Spacery panel there would duplicate them for no gain. At the default
the panel collapses to a single hint — "Resize the canvas or switch device view to set
responsive spacing" — and only becomes editable once a narrower tier is active. This keeps
the inspector quiet for the majority of blocks that never need responsive spacing.

**Inheritance runs downward, in authoring only** (D10, D13). A value set at `tablet` reads
as applying at `mobile` until overridden, and when editing `mobile` the inherited value
shows greyed with its source named ("inherited from Tablet"). The emitted CSS is not a
cascade — see D13 — but the author never has to think in bands. Per-tier reset and
clear-all sit beside it.

**Takeover (D11).** Where core already holds a responsive value for a property — a
`style.@tablet.spacing.padding` — Spacery does not silently add a competing rule. The
panel says WordPress is managing that property at this size and offers a one-click
takeover: copy core's value into the matching Spacery tier, clear core's key, done. One
system owns one property on one block, and the user chose which. Because D10 aligned the
cascade directions, that migration is a key rename rather than a range conversion.

**When responsive editing is disabled** (`responsiveEditingEnabled => false`), core shows no
viewport UI at all. Spacery then owns responsive spacing outright and falls back to its own
compact tier selector in the panel — the only case where the rejected switcher is the right
answer, because there is nothing to compete with.

## 4. Tech stack

| Concern | Choice | Note |
|---|---|---|
| Min WordPress | **7.1** | `settings.viewport`, always-iframed editor, apiVersion 3, no compat shims |
| Min PHP | **8.2** | Typed properties, enums, readonly |
| Block API | **apiVersion 3** | Plugin Check will require it for WP 7.0+ |
| Language | **TypeScript** | Strict. Matches `responsive-state`. |
| Build | `@wordpress/scripts` (latest) | **No custom webpack config needed** — `wp-scripts build` scans `src/` for `block.json` files and treats their listed scripts as entry points. This is precisely what v1 was missing. |
| Package manager | **pnpm** | Matches `responsive-state`; enables a dev workspace link |
| Styling | Plain SCSS scoped to our components | **No Tailwind.** Use WP admin design tokens so the UI matches the editor. |
| Breakpoint engine | `responsive-state` | npm dependency |
| PHP quality | PHPCS (WordPress-Extra) + PHPStan level 6 | |
| PHP tests | PHPUnit via `wp-env` | Registry, validation, CSS generation, hashing |
| JS unit tests | Vitest | Pure logic — normalization, resolution, `pick` semantics |
| E2E | Playwright + `@wordpress/e2e-test-utils-playwright` | Editor flows, save/reload, deactivation safety |
| Local env | `wp-env` | |
| CI | GitHub Actions | lint, typecheck, unit, e2e, **Plugin Check** |
| Release | `10up/action-wordpress-plugin-deploy` | Tag → build zip → SVN |

**Explicitly rejected:** Tailwind (inert in v1, and a build-time dependency buys nothing
for a plugin whose entire UI is WordPress components); jQuery and Lodash (listed in v1,
never imported); Vue (the v1 accident).

---

## 5. Repository layout

```
spacery/
├── spacery.php                     # header + bootstrap only
├── readme.txt                      # WP.org
├── README.md                       # GitHub
├── CHANGELOG.md
├── LICENSE                         # GPL-2.0-or-later
├── composer.json                   # PSR-4, phpcs, phpstan
├── package.json
├── tsconfig.json
├── .wp-env.json
├── includes/
│   ├── Plugin.php                  # bootstrap, DI, hooks
│   ├── Breakpoints/Registry.php    # resolution chain + validation
│   ├── Breakpoints/Breakpoint.php  # value object
│   ├── Styles/Generator.php        # style engine → rules
│   ├── Styles/Collector.php        # dedupe + single flush
│   ├── Render/BlockFilter.php      # render_block
│   ├── Settings/Page.php
│   ├── Settings/RestController.php
│   └── Migration/V1Migrator.php
├── src/
│   ├── blocks/spacer/              # block.json, edit.tsx, save.ts, index.ts
│   ├── extensions/spacing/         # block filters for core blocks
│   ├── breakpoints/                # store, hooks
│   ├── components/                 # BreakpointSwitcher, ResponsiveSpacingControl
│   └── settings/                   # admin screen
├── tests/{php,unit,e2e}/
├── assets/                         # WP.org banner, icon, screenshots
└── .github/workflows/{ci.yml,release.yml}
```

---

## 6. Milestones

Each milestone has a hard exit criterion. Nothing moves on without it.

**M0 — Foundations**
Repo scaffold, `wp-env`, TS + PHP toolchains, CI running lint/typecheck/PHPCS/PHPStan and
Plugin Check on an empty-but-valid plugin.
*Exit:* green CI on a plugin that activates cleanly and does nothing. Plugin Check passes
from day one — retrofitting compliance is what makes WP.org submission painful.
*Note:* the v1 build blocker is already resolved — `wp-scripts build` scans `src/` for
`block.json` files and uses their listed scripts as entry points, so no webpack config is
required as long as each block lives at `src/blocks/<name>/block.json`.
*Amended in M5:* that scan **returns early** once it finds a `block.json`, so the
`src/index.*` fallback never runs on a project that has a block. The spacing extension is
not a block, so it needed a `webpack.config.js` naming one extra entry point. Block
entries still come from the default config; adding a block still needs no change.

**M1 — Breakpoint registry**
PHP registry with the full resolution chain, value object, validation, `spacery_breakpoints`
filter, exposure to block editor settings.
*Exit:* PHPUnit covers every source in the chain plus every validation rejection; a theme
declaring `settings.viewport` demonstrably changes the resolved set.

**M2 — Style generation**
Style engine integration, content-addressed hashing, collector with dedupe, `render_block`
filter, `WP_HTML_Tag_Processor` class injection, single stylesheet flush.
*Exit:* a page with 200 blocks sharing 3 spacing recipes emits 3 rule groups. Snapshot
tests on generated CSS. Specificity verified against core's inline styles in a real theme.

**M3 — `spacery/spacer` block**
The block itself, apiVersion 3, `useBlockProps.save()` used correctly, per-breakpoint
height and width.
*Exit:* block saves, reloads, and survives plugin deactivation → reactivation with no
validation error. This is shippable as a standalone release if the toolkit slips.

**M4 — Editor UX**
`responsive-state` store fed by a `ResizeObserver` on the canvas iframe and subscribed via
`useSyncExternalStore`; active-tier label; inherited-value display; the fallback tier
selector for when `responsiveEditingEnabled` is false.
*Exit:* dragging the canvas to 900px puts Spacery on the `laptop` tier while core's badge
still reads Desktop, and the panel says so unambiguously. The preview matches the frontend
at every tier, verified by an E2E test that screenshots both.

**M5 — Spacing extension**
Attribute injection filter and inspector integration for **any block declaring
`supports.spacing`** — core and third-party alike — gated by a `spacery_denied_blocks`
deny-list filter. Panel collapsed by default so it never reads as clutter.
Includes the D11 takeover flow: detect a core `@mobile`/`@tablet` value for a property,
surface it, and migrate it into the matching Spacery tier on request.
*Filter named `spacery_denied_blocks`, not `spacery_supported_blocks` as first written:
the value passed is a list of blocks to leave alone, and a filter whose name says
"supported" while its argument means the opposite is a trap.*
*Takeover is offered only when the boundaries agree.* A Spacery tier sharing core's slug
but not its bound would apply the value over a different range of widths, which is a
change of meaning dressed up as a move; where they differ Spacery says so and leaves the
value where it is.
*Adoption still widens where a value applies, and the panel says so.* Core's viewports are
disjoint with no inheritance — a `@tablet` padding applies between 480px and 782px and
nowhere else — while Spacery's tiers are the desktop-first cascade of D13, so the same
value at `tablet` also reaches Mobile. That is the model the author gets for every other
value they set in this panel, so the answer is to state it above the button, not to
special-case adopted values into behaving unlike everything around them. Both features are gated twice — by block supports and by
`settings.spacing.padding` / `.margin` — because core hides its own controls when either
says no, and a panel offering padding a theme disabled would generate CSS the site asked
not to have.
*Exit:* padding/margin per breakpoint working on Group, Columns and Cover, plus one
third-party block that was never explicitly supported; a block carrying core responsive
padding offers takeover and, once taken over, emits exactly one rule for that property;
deactivation leaves posts valid (E2E asserts this explicitly).

**M5a — `blockGap` spike (timeboxed, 2 days) — DONE, deferred to 1.1**
Full answer with source citations in [`blockgap-spike.md`](blockgap-spike.md). In short:

- The hypothesis above was **wrong**. `layout.php` never emits
  `var(--wp--style--block-gap)` — the property was removed from `WP_Theme_JSON` — so
  there is no variable to set inside a media query. Per-block gap is baked as literal
  values into rules whose shape differs per layout type, and on `grid` the gap value
  feeds the `grid-template-columns` calculation.
- Core 7.1 **already emits responsive `blockGap`** at its own two viewports, for every
  layout type. Responsive gap is no longer a gap in core; only N tiers is.
- Matching it would mean reimplementing `wp_get_layout_style()`, and Spacery's class
  lands on the outer wrapper while core's layout rules target the inner one.
- The escape hatch of giving core more viewports is closed:
  `get_viewport_media_queries()` reads two fixed keys rather than iterating.

*Outcome:* deferred. `spacingFeatures()` already declines gap; that now has a recorded
reason. 1.0 documents core's own control as the answer for responsive gap.

**M6 — Settings, i18n, docs — DONE**
Settings screen under Settings → Spacery, a React app over `register_setting( show_in_rest )`
so `/wp/v2/settings` owns the values and their validation and the screen is one client of
the rules rather than a second authority. Sanitizers reuse `BreakpointSet::from_array()`,
so a set the screen accepts is one the generator can use. A read-only
`spacery/v1/breakpoints` serves what each source contains, because nobody can choose
between sources they cannot see. Developer API in [`FILTERS.md`](FILTERS.md).
*Exit met:* POT generated from source in CI with a drift guard, and Greek renders — proven
in both halves, `wp eval` for PHP and a Playwright run against a Greek site for the editor.

Three things the plan did not anticipate, all of them silent failures:

- `load_plugin_textdomain()` on `plugins_loaded` is now how you *get* a
  `_doing_it_wrong` notice, not how you avoid one. Since 6.7 it only registers a path, and
  just-in-time loading objects to any domain first needed before `after_setup_theme`. It
  runs on `init`.
- **`wp i18n make-pot` cannot read TypeScript.** Pointed at this codebase it extracted 24
  strings where there are 84, with no warning. `bin/make-pot.sh` transpiles first and
  refuses to write a POT when that produced nothing.
- **`wp i18n make-json` ignores `.jsx` references**, so preserving JSX through the
  transpile yielded translations for one source file out of fourteen. The transpile emits
  `.js`, and output is named per script handle rather than per path hash, because
  `_load_script_textdomain_from_src()` tries the handle form first and it does not depend
  on where the plugin is installed.

**M7 — v1 migration — DROPPED (see D15)**
There is nothing to migrate from. v1 had no webpack entry point, so its `build/` directory
was never generated and the block could not register; it also never left Bitbucket. No post
anywhere contains a `spacery/spacery-block` comment, so a `deprecated` entry would be a
transform with no input, and `wp spacery migrate` a command with nothing to convert. The
work this milestone described was real, but only against a version that shipped — and this
one did not.

**M8 — Publish**
Banner and icon assets, readme.txt final pass, a WordPress.org account and slug, and a
release workflow deploying on tag.
*Exit:* live on WP.org, release workflow deploying on tag.

---

## 7. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Core extends `settings.viewport` to N breakpoints in 7.2/7.3 | Medium | The registry reads `settings.viewport` first, so we degrade to a thin compatibility layer rather than a competitor. The spacer block (Gap 2) stays valuable regardless — core has not fixed it in eight years. |
| `!important` arms race with core's inline styles | Medium | Follow core's own precedent for 1.0; spike the custom-property rewrite in 1.1. |
| CSS bloat on long pages | Low | Content-addressed classes make identical spacing collapse to one rule. Measure at M2 with a 200-block fixture. |
| Editor performance with N tiers × many blocks | Medium | Only the selected block subscribes to the store; memoize generated rules by hash. |
| WP.org review friction (trademark, slug, build sources) | Low | Plugin Check in CI from M0; ship unminified sources; confirm the slug early. |
| `responsive-state` needs changes to fit | Medium | It is our package. Changes go upstream and ship as a version bump, not a fork. |
| Double-declared properties alongside core's responsive styles | Low | Was **High** while the two systems ran opposite cascades; D10 aligned them. What remains is inspector UX — showing that core already manages a property and offering to take it over. See §3.3a. |

---

## 8. Decisions

Settled during planning, with the reasoning, so future-you knows what to revisit if the
premise changes.

| # | Decision | Reasoning |
|---|---|---|
| D1 | **Scope: responsive spacing toolkit**, not a spacer block alone | Flexible Spacer Block already owns the spacer-only position with 4,000+ installs. N-breakpoint spacing on *any* block is a category nobody occupies, and it is not boltable onto an incumbent because it changes the data model. |
| D2 | **Breakpoints: one source at a time, chosen by the user** (`theme` / `spacery` / `custom`), filter last word | Blending a theme's two breakpoints with Spacery's wider tiers produces a set nobody designed. Two coherent sets the user picks between beats one mixed set. Defaults to `theme` when the theme declares breakpoints, so a site agrees with core until someone deliberately opts out. Revised from an earlier priority-cascade draft. |
| D3 | **Publish to WP.org + GitHub** | Discovery matters for a free plugin, and Plugin Check in CI from M0 makes compliance a non-event rather than a submission scramble. |
| D4 | **Minimum WordPress 7.1, PHP 8.2** | `settings.viewport`, the always-iframed editor and apiVersion 3 with zero compat shims. The excluded install base shrinks every week. |
| D5 | **`blockGap`: deferred to 1.1** (spike done, [`blockgap-spike.md`](blockgap-spike.md)) | The spike was framed as "plausibly easier than padding/margin, because custom property rather than inline declaration". That premise was false: `layout.php` emits no `var(--wp--style--block-gap)` and the property was removed from `WP_Theme_JSON`. Gap is baked into per-layout-type rules, and on `grid` it feeds the column-track calculation, so matching core means duplicating `wp_get_layout_style()`. Core 7.1 also already does responsive gap at its own two viewports, so the remaining gap is N tiers alone. The two days bought a firm no instead of a guessed yes, which is what the timebox was for. |
| D6 | **Targeting: any block with `supports.spacing`, deny-list filter** | An allow-list is a maintenance treadmill that silently misses blocks users care about. Third-party blocks get support for free. |
| D7 | **Free-only; clean internal API, no pro scaffolding** | Registry / Generator / Collector are already separate classes, which is what a future pro add-on would hook into. A `pro/` split designed before the first user shapes the codebase around unforecastable revenue. |
| D8 | **Viewport breakpoints only for 1.0** | Container queries are technically superior and would dissolve the editor-preview problem by construction, but they need `container-type` on an ancestor you do not control in someone else's theme, and they double the UX surface. |
| D9 | **First public release is `1.0.0`, not `2.0.0`** | v1 was never buildable and never reached WP.org, so there is no released 1.x to succeed. Numbering the first public release `2.0.0` would show users a version history that begins at 2.0 with nothing behind it, and spend a major version on a story only the author knows. The 2023 code is a reference, not a predecessor. GitHub carries `0.x` through M0–M4; `1.0.0` is the WP.org submission. |
| D10 | **Desktop-first `max-width`, matching core** — not mobile-first `min-width` | Reverses v1's instinct and this plan's own earlier draft. The cascade-collision risk in §3.3a was self-inflicted: it existed only because the two systems ran opposite directions. Aligning also makes `settings.viewport` readable verbatim (no stepped conversion), keeps one mental model for users who will inevitably use both systems on one page, and makes migration cheap if core ever widens `settings.viewport` beyond two tiers. The cost is that "mobile-first" leaves the positioning — but breakpoint *values* are direction-agnostic, so that was a weaker differentiator than it read. The originating issue #67620 is itself desktop-first. |
| D11 | **Spacery owns every tier in its own namespace; core's values are imported by explicit takeover** | Considered letting core keep tablet/mobile and adding only wider tiers, and considered writing into core's own `style.@tablet`. Both give a tidier steady state and both break under configurations Spacery must support — a custom breakpoint set that does not align with core's values, or `responsiveEditingEnabled => false`. Owning the data unconditionally is the only option stable across all of them. The duplication that creates is resolved in the inspector, not the stylesheet: see the takeover flow in §3.5. |
| D12 | **No Spacery viewport switcher; follow core's editing viewport** | Core 7.1 makes responsive editing a mode driven by canvas width ([PR #75121](https://github.com/WordPress/gutenberg/pull/75121)), so a second switcher would compete with it. Following it means core's resizable canvas becomes Spacery's N-tier selector for free. The exception is `responsiveEditingEnabled => false`, where core shows no viewport UI and Spacery supplies its own. |
| D13 | **Tiers are disjoint bands in CSS, a cascade in authoring** | Discovered while implementing: core's tiers are *not* a cascade. `WP_Theme_JSON::get_viewport_media_queries()` emits `@media (480px < width <= 782px)` for `@tablet`, so a core tablet value never applies at mobile widths. Plain descending `max-width` rules would have been pleasant to author but would partially overlap core's bands — a Spacery `tablet` value (≤782px) would silently override a core `@mobile` value at 400px, which is exactly the mess D10 removed. Spacery therefore emits bands identical in shape to core's, and materializes an authored value into every narrower band at generation time. `responsive-state`'s `pick( …, { fallbackDirection: 'down' } )` is that materialization function. Cost: one authored value can emit up to N declarations; content-addressed hashing limits the damage, and M2's 200-block fixture measures it. |
| D14 | **Spacery never places its own CSS; it fills a Style Engine store and core places it** | Investigating M2's open delivery question found the seam: `wp_enqueue_stored_styles()` explicitly iterates third-party stores, and core already solves both theme types — block themes render the entire template before `wp_head()`, and WordPress 6.9 added `wp_hoist_late_printed_styles()` to lift classic themes' footer styles into the head. Choosing placement inside the plugin would mean re-deriving that logic and drifting from it as core evolves. This deleted the placement code rather than fixing it. |
| D15 | **No v1 migration path** | v1 never built and never shipped. Its `block.json` pointed at a `build/` directory nothing generated, so the block could not register even locally, and the code lived on Bitbucket rather than WP.org. A `deprecated` entry exists to keep *existing content* valid; there is no existing content. Writing one would mean maintaining a parser for a save format no post has ever contained, and testing it against fixtures invented for the purpose. D9 already reached the same conclusion from the other direction when it numbered the first public release `1.0.0`: the 2023 code is a reference, not a predecessor. |

### Deferred to 1.1+

- **Container-query mode** (D8). The strongest long-term differentiator. Spike after 1.0
  ships and there is usage to learn from.
- **Custom-property cascade rewrite** (§3.3). Replaces `!important` by rewriting core's
  inline `style` with `WP_HTML_Tag_Processor`. Strictly better cascade story; needs its own
  risk assessment because it mutates core output.
- **`blockGap`** — confirmed deferred by the M5a spike. Preferred route is upstream: make
  `get_viewport_media_queries()` iterate its settings rather than read two fixed keys, which
  would give N tiers to gap, layout and everything else core routes through it.

### Resolved by source review

- ~~Is `settings.viewport` exposed to JavaScript?~~ **Yes** — but we deliberately do not
  use that path. Full trace and reasoning in §3.2 and Appendix A.

### Newly opened by that review

- **Cascade collision with core's responsive styles** (§3.3a). Promoted straight to a
  high-likelihood risk. This is now the most important thing to validate in M2.
- **Section-scoped breakpoints** are achievable without inventing anything. Core resolves
  settings from block attributes on *ancestors* that declare the `__experimentalSettings`
  block support, before falling back to global settings. A Group could therefore carry a
  breakpoint set for its subtree. Genuinely differentiating — core explicitly forbids
  per-block `viewport` — but firmly 1.1+.

---

## 9. Immediate next steps

1. M0 scaffold.
2. M1 registry, because everything else depends on it.
3. Ship M3 as `0.1.0` on GitHub to get the pipeline exercised end to end before the
   extension work in M5 widens the blast radius.


---

## Appendix A — Core 7.1 internals, verified

Read directly from `WordPress/wordpress-develop` at tag **7.1.0** and Gutenberg `trunk`,
not from documentation. Line numbers are for 7.1.0 and will drift; the behaviour is what
matters.

### `settings.viewport` shape and limits

`class-wp-theme-json.php`

| What | Where | Finding |
|---|---|---|
| `VALID_SETTINGS['viewport']` | `:516` | Exactly two keys: `mobile`, `tablet`. Nothing else validates. |
| `DEFAULT_VIEWPORT_BREAKPOINTS` | `:697` | `mobile: 480px`, `tablet: 782px`. |
| `get_viewport_media_queries()` | `:720` | **`public static`** — callable from a plugin. Emits range-syntax, max-width queries. `include_desktop` option adds `@desktop`. |
| `is_valid_viewport_breakpoint_size()` | `:765` | Regex `/^(?:\d+\|\d*\.\d+)(?:px\|em\|rem)$/`. No negatives, no unitless values — **`0` is invalid, `0px` is valid**. |
| `get_viewport_breakpoint_value_in_pixels()` | `:790` | `em`/`rem` × **16** for ordering only; generated queries keep original units. Matches `responsive-state`'s own `toPx`, so the two agree for free. |
| `sanitize_viewport_settings()` | `:826` | Invalid or absent → full defaults. One valid breakpoint → single max-width query. `tablet <= mobile` → tablet dropped. |
| Per-block exclusion | `:1346-47` | `viewport` and `blockVisibility` are explicitly `unset()` from per-block schema: *"global-only settings and cannot be set per block for now."* |

**Consequence for Spacery's validator:** mirror this regex and the ×16 conversion exactly.
Where they differ, users will hit breakpoints that core accepts and Spacery rejects, or
worse, the reverse.

### Path to JavaScript

1. `block-editor.php:559` — `$editor_settings['__experimentalFeatures'] = wp_get_global_settings();`
   assigns the **entire** settings tree. Individual sub-keys (`color.palette`,
   `spacing.units`, …) are then lifted out into dedicated settings; **`viewport` is never
   unset**, so it survives intact.
2. `wp_get_global_settings()` with an empty path returns the whole merged tree
   (`global-styles-and-settings.php:26`).
3. Gutenberg `packages/block-editor/src/store/get-block-settings.js:9` —
   `blockedPaths = ['color','border','dimensions','typography','spacing']`. **`viewport` is
   not blocked**, so `useSettings( 'viewport' )` and `useSettings( 'viewport.mobile' )`
   both resolve.

**Answer: yes, it reaches JS.** See §3.2 for why we still resolve in PHP.

### Two extension points worth knowing

- **`blockEditor.useSetting.before`** (`get-block-settings.js:112`) — a JS filter that runs
  *before* any resolution and can override any setting per block, per client ID. Useful to
  us; also means another plugin can intercept ours.
- **`__experimentalSettings` block support** — a block declaring it can carry a `settings`
  attribute that its whole subtree resolves against, ahead of global settings. This is the
  existing mechanism for section-scoped settings, and the route to section-scoped
  breakpoints in 1.1+.

### Stability assessment

| Surface | Stability | Our exposure |
|---|---|---|
| `settings.viewport` in theme.json | Public, documented, 7.1+ | **Read it in PHP.** Core is unlikely to remove it; may extend it. |
| `WP_Theme_JSON::get_viewport_media_queries()` | `public static`, undocumented | Call it, but wrap in `method_exists()` and keep a local fallback. |
| `__experimentalFeatures` | Experimental by name | **Avoided.** |
| `useSettings()` | Public export | Debugging only, not a dependency. |
| `blockEditor.useSetting.before` | Stable filter name since 5.9 | Optional; not required by the design. |
