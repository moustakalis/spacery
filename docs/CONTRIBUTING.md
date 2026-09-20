# Working on Spacery

Everything here was learned by breaking CI, not by reading documentation. Each
item names the failure it prevents, because a checklist whose reasons are
missing gets skipped the first time it is inconvenient.

## Before you push

Run these in order. The first four are what CI runs; the fifth is the one that
gets forgotten.

```bash
pnpm run typecheck
pnpm run lint:js                 # eslint + prettier
pnpm run test:unit
composer run lint && composer run analyse && composer run test

pnpm run i18n:pot                # see below -- more often than you think
pnpm run i18n:build              # only when a string changed
python3 bin/check-release.py     # whenever a file is added, renamed or removed
```

E2E (`pnpm run test:e2e`) needs `wp-env` up. It is slow, and CI runs it, but it
is worth running locally before touching anything the inspector renders.

**`lint:js` is the one that catches what `tsc` does not** — an unused import, a
`@param` name that does not match the parameter it documents. Two of those
reached `main` because the job had not been run since the commit that
introduced them. If `wp-scripts lint-js` will not start (a `node_modules`
installed for another platform cannot load the import resolver's native
binding), run ESLint directly against the repo's own flat config:

```bash
node node_modules/.pnpm/eslint@*/node_modules/eslint/bin/eslint.js \
  "src/**/*.ts" "src/**/*.tsx" "tests/**/*.ts"
```

Every rule then runs except the ones that need the resolver, which report one
error per file. **Filter that noise by its message, never by its rule name.**
The resolve error is reported _as_ `import/no-duplicates`, so dropping lines by
rule hides real violations of the same rule — which is exactly how a duplicate
import reached CI:

```bash
… | grep -v 'Resolve error'
```

That filter is not quite enough on its own: the resolver reports a **multi-line
stack**, so a line-based grep leaves most of it behind and the trailing count
(`✖ 61 problems`) still includes every one of them. Use the JSON formatter and
drop whole messages instead — then the count is the truth:

```bash
node node_modules/.pnpm/eslint@*/node_modules/eslint/bin/eslint.js -f json \
  "src/**/*.ts" "src/**/*.tsx" "tests/**/*.ts" > /tmp/eslint.json
python3 -c "
import json
for f in json.load(open('/tmp/eslint.json')):
    for m in f['messages']:
        if 'resolver' in m['message'] or 'Resolve error' in m['message']:
            continue
        print(f['filePath'], m['line'], m['ruleId'], m['message'])
"
```

## `test:unit` has the same platform problem, and no in-place workaround

A `node_modules` installed for another platform breaks `vitest` the same way it
breaks `lint:js`, but harder: rolldown's native binding is missing, so the
runner dies at startup with `Cannot find module
'@rolldown/binding-wasm32-wasi'` and **nothing runs at all**. There is no
equivalent of the ESLint recipe above, because the failure is in the bundler
rather than in one plugin.

**Do not take a clean `typecheck` and a passing grep as a run.** Eight stale
assertions reached CI in one push that way: strings had been rewritten, the
tests naming them were updated by search, and four more tests asserting the same
strings in other files were never found. `tsc` cannot see a string literal that
no longer matches, and neither can a grep for the new wording.

Run it on a machine whose `node_modules` matches, or copy `src/`, `tests/`,
`vitest.config.ts` and `tsconfig.json` into a scratch directory with its **own**
two-line `package.json` and `npm i vitest jsdom` there. Two traps in that
second route, both cost a run to find:

- Installing vitest inside a copy of the repo fails on this project's own peer
  ranges (`@wordpress/e2e-test-utils-playwright`). The scratch directory must
  not carry this `package.json`.
- Symlinking `src` and `tests` into it makes vite resolve every test through
  `/@fs/...` and report `Cannot find module` for all 17 files. Copy them.

## After a string changes, check the assertions from the tests' side

Searching `src/` for the new wording finds nothing, and searching for the old
wording misses every assertion that uses a **prefix** of it — which is what
`getByText( '…', { exact: false } )` is for. Both directions were tried on this
repo and both let stale assertions through: eight into one CI run, four into the
next.

The check that works goes the other way. Pull every `getByText` /
`toHaveText` / `toContainText` literal out of `tests/`, blank out the values a
test supplies itself (widths, breakpoint names), and assert each remaining
fragment appears in `build/*.js` or `includes/**/*.php` — the built bundles are
the only honest record of what the screen can render. Anything left over is a
string no code produces.

Run it after any wording change. On this repo it also found a locator that had
matched nothing for six commits: `shownTier()` looked for a hint deleted in
`384de53`, behind `.isVisible().catch(() => false)`, so it never failed — it
just quietly reported the wrong one of its two diagnostic states.

## The E2E suite can run somewhere other than `wp-env`

`WP_BASE_URL` chooses the site and `WP_USERNAME` / `WP_PASSWORD` choose the
account, so the whole suite can run against the MAMP playground in
`docs/MANUAL-TESTING.md` instead of Docker:

```bash
WP_BASE_URL=http://localhost:8888 WP_USERNAME=admin WP_PASSWORD=… \
  pnpm run test:e2e
```

Only worth doing deliberately. On a site nothing resets between runs, the suite
leaves draft posts behind, overwrites Spacery's two options, and
`extension.spec.ts` deactivates and reactivates the plugin — which a failure in
the wrong place leaves deactivated. It deletes no content, but do not point it
at a site you would mind explaining.

## The POT goes stale when code _moves_, not when strings change

This is the single most frequent CI failure in this repository, and the rule
most people assume is narrower than it is.

`languages/spacery.pot` records a **source reference per string** —
`#: includes/Settings/Screen.php:101`. CI regenerates the POT and diffs it
against the committed one byte for byte, ignoring only `POT-Creation-Date`. So
inserting a comment above a `__()` call, extracting a helper, or adding a
docblock in a file that contains _any_ translatable string is enough to fail the
build, with no string added, removed or altered.

**Regenerate whenever `includes/`, `spacery.php` or anything under `src/`
changed at all.** It costs seconds. Two separate CI failures came from treating
it as a strings-only step.

**The JavaScript half moves less than it used to, and that is not licence to
skip it.** The POT is extracted from `build/` rather than from transpiled
sources (D38), so every JavaScript reference is `build/extension.js:1` or one of
its two siblings — a minified bundle is one line. A comment added above a
`__()` call in `src/` therefore moves nothing. A string change still does, and
anything at all in `includes/` still does.

`pnpm run i18n:build` is different: it compiles `.po` into the `.mo` and the
per-bundle `.json`, so it only matters when a translation changed.

## A JavaScript translation is found by the *built* path

`_load_script_textdomain_from_src()` looks for
`<domain>-<locale>-<md5 of 'build/settings.js'>.json` in `WP_LANG_DIR/plugins`,
and `wp i18n make-json` names what it writes after the references in the `.po`,
which come from this repository's POT. So the POT has to reference the bundles,
which is why `bin/make-pot.sh` scans the distributable and why
`pnpm run i18n:pot` builds first.

**This is about the repository's own compiled Greek, not about a pack.**
translate.wordpress.org never reads this POT — `/languages` ships nowhere — and
extracts its own originals from `trunk/` instead. What names a real pack is the
packaging list, which is why `trunk/` containing `build/` and not `src/` is the
fact D38 actually rests on. Measured 21 September 2026, and the two agree file
for file.

Point it back at `src/` and every locale's JavaScript silently stops loading:
the plugin works, the editor is simply in English, and nothing anywhere says so.
`bin/make-translations.sh` asserts its three filenames against `md5()` of the
three bundle paths, which is the check that would catch it.

**Three separate CI failures now, and the third was worse than the first two.**
It was not a forgotten regeneration: the POT *was* regenerated, and the diff
came back clean. It came back clean because the regeneration read a **stale copy
of the source**. Two imports had been added to `register.tsx` minutes earlier,
the regeneration ran somewhere the copy had not landed yet, and an unchanged POT
was the honest answer to the question that was actually asked.

**A verification whose input is stale reports the answer it was given.** So when
the POT is regenerated anywhere other than beside the source it describes,
**checksum the input before trusting the output** — `md5sum` the source on one
side, `md5sum` it again on the other, compare, and only then run `make-pot.sh`.
The same going back. Waiting longer is not the fix, because there is no length
of wait that tells you the copy arrived.

## Stage explicit paths, never a directory

`git add languages` swept in a stray `spacery-el-spacery-spacer-editor-script
2.json` that had been sitting there untracked since an earlier session — the
shape macOS gives a duplicate file. Plugin Check then failed the entire
distributable with _"File and folder names must not contain spaces or special
characters"_, which names the rule and not the file, on a build whose diff
showed nothing wrong.

`git add <dir>` stages whatever happens to be in that directory, including
things you have never looked at. Name the files.

`python3 bin/check-release.py` now refuses any tracked file that would ship with
a name outside `[A-Za-z0-9._-]`, so this particular mistake fails locally in a
second rather than in CI in twelve. Run it before pushing anything that adds a
file.

## Never add `__next40pxDefaultSize` or `__nextHasNoMarginBottom`

Both are marked deprecated in `packages/components`:

> `__nextHasNoMarginBottom` — Default behavior since WordPress 7.0. Prop can be
> safely removed.
> `__next40pxDefaultSize` — Default behavior since WordPress 7.1. Prop can be
> safely removed.

WordPress 7.1 is Spacery's minimum (D4), so both behaviours are already the
default and passing the props opts into nothing while using API on its way out.
Advice to add them — including in `ui-review.md`, written before 7.1 shipped —
is out of date.

The corollary matters for layout: **a control's default height is 40px on 7.1.**
A `size="compact"` field beside a default-sized one is a 32px control next to a
40px one, which is what made the spacing row look wrong. Size the row, do not
reach for the deprecated props.

## `src/types/wordpress.d.ts` is hand-written — verify before you extend it

`@wordpress/components` is a script external, so this repo declares the props it
uses itself. Nothing checks those declarations against reality.

**Before adding a prop, find it in `packages/components`.** Inherited props are
the trap: `hideLabelFromVision` is not declared on `UnitControlProps` at all, it
arrives through `Omit<NumberControlProps, …>`, and `RadioControlProps` picks it
from `BaseControlProps`. Both are real; neither is where you would look.

The cost of guessing is in the file already: `ToggleGroupControl` was once
declared stable here when it is experimental in 7.1, which resolves to
`undefined` at runtime and takes the editor down with React error #130. The
docblock there gives the anchored grep for checking a name against
`wp-includes/js/dist/components.js`.

Being an external, `@wordpress/components` is not a dependency and is not in
`node_modules` — so "check it against the package" means reading a WordPress
install or the Gutenberg source, not `node_modules`. When neither is to hand,
the answer is to use plain markup rather than to guess a declaration: the
settings footer's two links are ordinary `<a>` elements for exactly that reason,
where `ExternalLink` would have meant declaring a component nobody could verify.

## `lint:css` is not a gate, and never was

The script exists (`pnpm run lint:css` → `wp-scripts lint-style`) but **no
workflow runs it**, and `src/settings/style.scss` fails it the moment it is run:
the wp-scripts default config wants a blank line before every nested rule,
including the first one inside a block, which is not how anything else in this
repo is written. Four of the five complaints predate the file's own error
states. Don't reformat the stylesheet to satisfy a linter nothing enforces —
but do keep comments wrapped at 80 and read the output for anything real.
`declaration-no-important` is not in that config, which is worth knowing given
the section below.

## Overriding a `@wordpress/components` control's border needs `!important`

Not as a shortcut -- as the only thing that reaches it. Two controls, two
different answers, and the difference is invisible from the source:

| Control                            | The element with the border           | Beaten by                     |
| ---------------------------------- | ------------------------------------- | ----------------------------- |
| `TextControl`                      | `.components-text-control__input`     | a descendant selector (0,2,0) |
| `UnitControl` / any `InputControl` | `.components-input-control__backdrop` | nothing below 0,3,0           |

`InputControl` is an emotion component, and emotion emits its class **three
times over** (`.css-HASH.css-HASH.css-HASH`) so that theme and plugin CSS cannot
move it. `src/settings/style.scss` needs `border-color: … !important` on the
backdrop for that reason, and says so.

**This class of bug cannot be found by any test in this repo.** A colour that
only CSS produces is not in the DOM, not in `tsc`, and not in an E2E assertion
about text -- the E2E suite was asserting the right words beside a field that
was still grey. Load `wp-admin`, provoke the state, and read
`getComputedStyle(el).borderColor`. The same check found an earlier commit whose
message described nine edits that an aborted script never wrote.

## `getByLabel` is ambiguous now that the ruler has a description

The ruler is one `role="img"` whose accessible name is a sentence per band --
"Desktop, over 1024px, up to 1280px. Laptop, over 782px, up to 1024px. …" --
built by `described()`. Playwright matches accessible names as **substrings**,
so any label text that also appears in that sentence now matches two elements:

```js
page.getByLabel('Up to')          // the field AND the drawing: strict mode fails
page.getByLabel('Up to').last()   // silently the drawing -- it is below the table
```

The second is the dangerous one. It does not fail as an ambiguity; it resolves
to a `div` and then `fill()` fails somewhere unrelated-looking. Use a role:

```js
page.getByRole('spinbutton', { name: 'Up to' })
page.getByRole('textbox', { name: 'Name' })
```

Verified against the live screen rather than reasoned about: every `Up to`
field's accessible name is exactly `Up to` and its role is `spinbutton`, the
ruler's name begins `desktop, over 1300px, up to 11920px`, and the ruler follows
the last row in document order.

## A failing E2E test may be defending a bug

`settings.spec.ts` asserted that a refused save reported "nothing changed" — in
a scenario where the source _had_ changed and been stored. That was S4, written
down as an expectation. Fixing the behaviour broke the test, and the right
response was to correct the assertion, not the code.

So when a behavioural fix breaks a test: read what the test claims before
assuming the code regressed. Then make the test assert the new claim, and cover
the branch that made the old one look right.

## Never put a comparison inside an argument list

```php
$this->assertSame( $expected, 1 === preg_match( $pattern, $value ), $message );
```

PHPCS reads that as `WordPress.PHP.YodaConditions.NotYoda`, even though the
literal is already on the left. The statement it scans back through starts at
`$this`, and a variable before the operator is the whole test. The same
comparison in a `return` passes — which is why `Breakpoint::is_valid_length()`
is fine and the test asserting the identical thing was not.

So give it a `return`: a small method that answers the question, called from the
assertion. `BreakpointPatternsTest::matches()` is the example.

## A test helper cannot be named after a PHPUnit assertion

`PHPUnit\Framework\Assert` declares its constraint factories -- `matches()`,
`equalTo()`, `isTrue()`, `callback()`, `stringContains()` and the rest -- as
**final**. A helper in a `TestCase` subclass that happens to share one of those
names is a fatal error at load time, so the whole suite exits 255 without
running a single test. Give helpers names that read as this repo's own:
`pattern_matches()`, `given_option()`, `decoded()`.

## `base64_encode` needs a reason, not a wider ruleset

WordPress-Extra warns on it under `DiscouragedPHPFunctions.obfuscation`, and
`phpcs` exits non-zero on warnings. Silence it per call with
`phpcs:ignore … -- reason`, never by excluding the sniff: it exists because
base64 in a plugin is usually hiding something, which is exactly what a
directory reviewer will want answered.

## The admin menu icon has two constraints, both invisible when broken

`wp-admin/js/svg-painter.js` recolours it by running
`xml.replace( /fill="(.+?)"/g, … )` over the decoded SVG, so **every shape needs
a `fill`** — any value will do — and **nothing may carry a `style` attribute**,
because the next line replaces the whole of any `style="…"` with `style="fill:…"`.
`#adminmenu div.wp-menu-image.svg` also sets `background-size: 20px auto`, so the
declared size is decorative. `tests/php/ScreenTest.php` guards all of it.

## Pure logic goes in a `.ts` module, not the `.tsx` beside it

`box.ts`, `length.ts`, `takeover.ts`, `segments.ts`, `rows.ts` exist so their
rules can be asserted. Vitest aliases only `@wordpress/i18n`, deliberately — a
module importing `@wordpress/components` cannot be unit tested, so anything a
test should cover must not import it.

When a claim the interface makes turns out to be wrong, moving the function that
makes it is usually part of the fix.
