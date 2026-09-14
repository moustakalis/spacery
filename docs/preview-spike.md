# S2 — previewing responsive spacing in the editor

**Verdict: build it, using core's own style engine and core's own mechanism.
The "two sources of truth" objection is mostly unfounded — the only thing that
genuinely duplicates is `Generator::is_value()`, and D19 already settled how
this project handles exactly that.**

Written 14 September 2026, after `MANUAL-TESTING.md` §2 found there is no
preview at all. Everything below was read from this repository or measured in
the live editor on the MAMP playground; nothing is from memory of how the
editor works.

## 1. What is actually missing

`src/extension/register.tsx` registers two filters and no more:
`blocks.registerBlockType` (adds the `spacery` attribute) and
`editor.BlockEdit` (adds the inspector panel). There is no
`editor.BlockListBlock` filter, no portal, no `useStyleOverride`, and
`includes/Editor/Extension.php` enqueues only the editor script.

Measured in the canvas iframe with three blocks carrying values in valid tiers:
no `spy-` class, no Spacery `<style>`, and Group B's `30rem` absent from the
document entirely. **Setting responsive spacing changes nothing the author can
see until they preview or publish.**

`PLAN.md` §3.3 specifies the fix ("render a `<style>` element from the
`editor.BlockListBlock` HOC alongside the block") and M4's exit criterion
records it as verified by an E2E test that screenshots both. No such test
exists; `extension.spec.ts` covers the panel's presence, a block without
spacing support, deactivation safety and the takeover.

**Why it survived.** The spacer block previews correctly — `edit.tsx` calls
`useCanvasBreakpoint()`, resolves `heightAt()` for the canvas tier and applies
it through `useBlockProps` — and `spacer.spec.ts` tests it. The half with a
preview is the half that is tested.

## 2. The objection, and why it mostly dissolves

The fear was that generating CSS in JavaScript reintroduces the
two-sources-of-truth bug this project rejects everywhere else — the reason PHP
resolves breakpoints and JS is handed the answer (§3.2).

**`@wordpress/style-engine` is available in the editor, as a registered script
handle.** Measured: `window.wp.styleEngine` exists with `compileCSS`,
`getCSSRules` and `getCSSValueFromRawStyle`, loaded under the script id
`wp-style-engine-js` — so `wp-style-engine` can be declared as a dependency in
`Extension.php` rather than relied on by accident.

It is **the same engine**, not a reimplementation of it:

| Input | `wp.styleEngine.compileCSS` |
|---|---|
| `{spacing:{padding:{top:'var:preset|spacing|50',bottom:'2rem'}}}` | `padding-top: var(--wp--preset--spacing--50); padding-bottom: 2rem;` |
| `{spacing:{margin:{left:'var:preset|spacing|60'}}}` | `margin-left: var(--wp--preset--spacing--60);` |

Preset resolution, property mapping and declaration shape all match what
`wp_style_engine_get_styles()` produces on the front end, because it is the
JavaScript build of the same package. `getCSSRules(style, { selector })` returns
structured rules, which is the shape band generation wants.

**And the tier resolution already exists in TypeScript.** `effectiveAt()` in
`src/attribute/tiers.ts` walks from a tier toward wider ones and returns the
first authored value — D13's materialization, already unit-tested in
`tiers.test.ts`, already used by the panel. Nothing new is needed to know what
value applies at a tier.

## 3. What genuinely duplicates

One thing.

| Piece | Front end | Editor | New duplication? |
|---|---|---|---|
| Which value applies at a tier | `Generator::normalize()` + bands | `effectiveAt()` — **exists** | No |
| Property mapping, preset resolution | `wp_style_engine_get_styles()` | `wp.styleEngine.getCSSRules()` — **same engine** | No |
| The band list | `Registry` | already published to JS as `spacerySettings.breakpoints` | No |
| Hash, dedupe, collector | `Collector` | not needed — one `<style>` per block is idempotent | No |
| **Value allowlist** | **`Generator::is_value()`, 49 lines** | **must be written in TS** | **Yes** |

The allowlist matters because **the JS engine has the same passthrough hole the
PHP one does** — this is D21 seen from the other side:

| Input | `compileCSS` output |
|---|---|
| `10px;color:red` | `padding-top: 10px;color:red;` |
| `red` | `padding-top: red;` |

Editor-only, so no visitor is exposed and this is a fidelity problem rather than
a security one. But without the allowlist the preview *lies*: the author sees
`red` applied in the canvas, publishes, and the front end drops it — which is
precisely the divergence a preview exists to remove.

**D19 already decided how this project handles a rule that cannot be shipped.**
Patterns that are regexes are shipped from PHP (`Breakpoint::SLUG_PATTERN`,
`LENGTH_PATTERN`, served through `spacery/v1/breakpoints`); rules that are
*shapes* are reimplemented in TypeScript and asserted against the same table of
cases the PHP suite uses. `is_value()` is a shape — a nesting check over
`calc`/`min`/`max`/`clamp`/`var` — so it takes the second path, and
`GeneratorTest`'s existing 38-case table is the table to assert against.

## 4. Which shape, and why core settles it

Two candidates.

**A. Inject a `<style>` with the full band set into the canvas** — §3.3's own
proposal.

**B. Apply only the canvas tier's value as an inline style**, the way the spacer
block already does with height.

**Core settles it, by doing A itself.** Measured: giving a block a core
`@tablet` padding of `77px` put `77px` into the canvas document inside
`@media (480px < width <= 782px)` — the same range syntax Spacery emits on the
front end — with the canvas iframe 1222px wide at the time.

That has three consequences:

1. The media query evaluates against the **canvas** viewport, so the preview
   responds to dragging the canvas edge with no JavaScript recomputation. The
   resizable canvas becomes the preview control for free, which is the same
   gift D12 noted for tier selection.
2. Spacery's preview and core's preview then live in one document under one
   cascade, in bands of identical shape — so the editor reproduces the
   front-end interaction of §3.3a rather than approximating it.
3. It is the mechanism a reviewer or a future maintainer would expect, because
   it is what the platform does.

B is cheaper and would work — `useCanvasBreakpoint()` already re-renders on
resize — but it previews a *computed* answer rather than the rules themselves,
cannot express the `!important` interplay with core's inline styles, and would
have to merge into a wrapper `style` object core also writes to. It also leaves
the editor and the front end structurally different, which is the thing this
project keeps choosing not to do.

## 5. Cost

- A TS `isValue()` beside `length.ts`, plus a test table mirroring
  `GeneratorTest`'s 38 cases. **This is the whole of the new duplicated logic.**
- A `editor.BlockListBlock` HOC that, for extended blocks carrying a `spacery`
  attribute, builds bands from `spacerySettings.breakpoints` and `effectiveAt()`,
  runs each through `wp.styleEngine.getCSSRules()`, and renders one `<style>`
  next to the block.
- `wp-style-engine` added to the script dependencies in `Editor/Extension.php`.
- The E2E test M4 always claimed: assert the canvas and the front end agree at
  each tier.
- A class name for the preview. Reusing the front end's content hash is
  unnecessary — one style element per block is already idempotent — so a
  `clientId`-derived class avoids porting the hash.

Not needed: the collector, the hash, `!important` bookkeeping beyond copying the
front end's rule (media-query overrides only, never the base).

## 6. Recommendation

**Build A before submitting.** The argument that stopped it being built — CSS
generation in JS means two sources of truth — turns out to be true of one
49-line function rather than of the pipeline, and this project has already
decided how it handles that case.

The alternative, shipping 1.0 with the panel as a values editor, is defensible
and would need saying plainly in `readme.txt`; but core previews its own
responsive spacing in the same canvas, so an author setting a Spacery value
watches core's numbers take effect and Spacery's do nothing, on the same block,
in the same session. That is a bad first impression of the plugin's core
promise, and it is the kind of thing a directory reviewer notices.

**Not in scope here:** the spacer block needs no change, and nothing about the
data model, the registry, the generator or the front-end cascade moves.
