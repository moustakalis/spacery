# Spacery — security audit

**Audited:** 21 September 2026, `main` at `a2b57c6`, plugin version **1.0.1** —
the version in the directory. **The fixes below ship in 1.0.2.**
**Against:** the WordPress Security API —
[sanitizing](https://developer.wordpress.org/apis/security/sanitizing/),
[validating](https://developer.wordpress.org/apis/security/data-validation/),
[escaping](https://developer.wordpress.org/apis/security/escaping/),
[nonces](https://developer.wordpress.org/apis/security/nonces/),
[roles and capabilities](https://developer.wordpress.org/apis/security/user-roles-and-capabilities/),
[common vulnerabilities](https://developer.wordpress.org/apis/security/common-vulnerabilities/).
**Scope:** everything `package.json#files` ships — `spacery.php`,
`uninstall.php`, the 18 classes under `includes/`, and the TypeScript that
becomes `build/`. Not the toolchain, CI or `tests/`, none of which reaches a
site.

---

## 1. Verdict

**One defect, now fixed. Nothing that crosses a privilege boundary, and no
injection path anywhere.**

| | Finding | Severity | State |
|---|---|---|---|
| **F1** | A crafted `spacery` attribute fatals `render_block` | **Medium** — availability, triggerable by anyone who can edit a post | **Fixed** |
| **F2** | Non-string leaf values went around `is_value()` | Low — dead CSS, and an editor/front-end divergence | **Fixed** |
| **F3** | A value was emitted untrimmed after being judged trimmed | Informational | **Fixed** |
| **F4** | The attribute is an open door to the whole Style Engine | Informational — by construction, not a hole | Accepted, recorded below |
| **F5** | The spacer's base `height` is not run through `is_value()` | Informational — core's own Spacer behaves the same | Accepted |

Everything else in §3 passed, and most of it passed by having been thought
about already: the value allowlist, the wholesale rejection of a bad breakpoint
set, `manage_options` on both the screen and the endpoint, and one write path
through `register_setting()`.

---

## 2. Findings

### F1 — a crafted attribute is a fatal on the published page

**What it is.** Three seconds of typing in the code editor:

```html
<!-- wp:group {"spacery":{"tablet":{"spacing":{"padding":{"top":{"x":"1px"}}}}}} -->
<div class="wp-block-group">…</div>
<!-- /wp:group -->
```

The side holds an object where a length belongs. Every page that renders that
block then dies with

```
Uncaught TypeError: Generator::{closure}(): Argument #1 ($value)
must be of type string, array given … in includes/Styles/Generator.php:108
```

**Why it happened, in order.** `normalize()` and `prune()` keep it, correctly —
an array *is* how a style object nests, and nothing at that point knows that
`padding.top` is a leaf. `flatten()` turns it into the path
`spacing/padding/top/x` and `place()` rebuilds it, so
`wp_style_engine_get_styles()` receives `padding => [ top => [ x => '1px' ] ]`
and hands the side's value straight back — it does not refuse it. `force()` then
mapped every declaration through a closure typed `string`, and under
`declare( strict_types=1 )` that is a `TypeError`. Raised inside a `render_block`
filter, uncaught, it is a 500.

**Core guards the identical input one step further on**, and says why:

```php
// Bail early if value is not a string. Prevents fatal errors from malformed block markup.
if ( ! is_string( $value ) ) { return $this; }
```
— `WP_Style_Engine_CSS_Declarations::add_declaration()`, WordPress 7.1.

That guard is downstream of `force()`, so Spacery reached the input first and
turned what core designed to be survivable into a fatal. **Spacery got there
first, so Spacery has to refuse it first.**

**Who can do it.** Anyone who can edit a post. The inspector cannot produce this
shape — it has to be written by hand in the code editor or posted through the
REST API — so it is crafted content, not an author's slip. A Contributor gets a
500 on preview and on every review of the draft; an Author publishes it and the
page is 500 for the public. Put it in a synced pattern or a template part and it
takes the surrounding template with it.

**Three things make it worse than it first reads:**

- **The editor shows nothing wrong.** `preview.ts` walks string leaves only, so
  it silently skips the bad one and previews the rest. The author sees a working
  block and a dead page.
- **Deactivating Spacery fixes it**, which means the first diagnosis a site owner
  reaches is "Spacery breaks my site" — with no way to see that the attribute was
  hand-written.
- **It is invisible to every gate this repo owns.** Not a type error (the
  attribute is `mixed`), not a lint finding, not an E2E case — the E2E suite
  drives the inspector, and the inspector cannot produce it.

**The fix.** `force()` drops a declaration whose value is not a string, exactly
as core does, and the empty check moved after it so a band whose every
declaration was malformed emits nothing rather than an empty rule. A malformed
side is now dropped and its sound siblings are emitted:
`{"top":{"x":"1px"},"bottom":"20px"}` renders `padding-bottom` and nothing else.

**Regression tests:** `GeneratorTest::malformed_attributes()` — seven shapes,
each asserted to be refused *without throwing* — plus
`test_a_malformed_side_leaves_the_others_alone()`.

### F2 — non-string leaves went around `is_value()`

`prune()` tested `is_string( $value ) && ! self::is_value( $value )`, so a
number, a float or a boolean fell through both arms and survived; `flatten()`
then cast it back to a string on the other side. `{"top": 5}` shipped as
`padding-top:5 !important` — a declaration no browser applies, from a value the
one guard on generated CSS never examined.

Not exploitable — a PHP scalar cannot carry a semicolon — but it is the guard
being bypassed rather than satisfied, and it is a divergence: the editor preview
keeps string leaves only, so it never drew what the page emitted. **A leaf is a
string or it is nothing** now, which closes the bypass and makes the two agree.

### F3 — a value was emitted as it was written, not as it was judged

`is_value()` judges `trim( $value )`; `prune()` stored `$value`. So anything the
trim removed was never part of what was accepted, and rode into the stylesheet
anyway — `"10px\n"`, `"  10px  "`, and (because `trim()` strips it) `"10px\0"`.

Harmless: nothing in CSS is terminated by whitespace or a NUL, and core's
`wp_strip_all_tags( $value, true )` and `safecss_filter_attr()` normalise it
downstream. It is listed because **nothing downstream is what makes it safe** —
that was the reasoning that produced F1. Fixed by storing the trimmed value,
which also made the class hash content-addressed over the *trimmed* value, so
`10px` and `" 10px "` now dedupe into one rule instead of two.

### F4 — the attribute is an open door to the Style Engine (accepted)

Spacery passes each tier's style object to `wp_style_engine_get_styles()`
whole, so a hand-written attribute can emit **any** property the Style Engine
supports, not only the spacing the plugin documents. Measured:

| Crafted attribute | Emitted |
|---|---|
| `typography.fontSize: "99px"` | `font-size:99px !important` |
| `color.text: "var:preset|color|vivid-red"` | `color:var(--wp--preset--color--vivid-red) !important` |
| `border.radius: "10px"` | `border-radius:10px !important` |
| `shadow: "var:preset|shadow|natural"` | `box-shadow:… !important` |
| `color.text: "red"` | *nothing* — `red` is not a value `is_value()` accepts |
| `background.backgroundImage.url: "//evil/x.png"` | *nothing* — same reason |

**This is not a privilege escalation**: everything reachable here is CSS the same
user can already set on the same block through core's own controls, and
`is_value()` keeps it to lengths, keywords, presets and four arithmetic
functions, so no URL and no colour literal can be smuggled in. `var()` resolves
only against custom properties the site itself defines.

It is recorded because it is a *scope* claim the documentation does not make. If
a future release ever narrows what Spacery is allowed to emit, narrow it in
`prune()` against a path allowlist — and note that the editor preview would have
to narrow with it.

### F5 — the spacer's base height (accepted)

`spacery/spacer` writes its base `height` into the saved markup as an inline
`style` in `save.ts`, unvalidated by `is_value()`. Per-breakpoint heights do go
through the generator and are guarded.

Left alone deliberately: this is exactly what core's own Spacer does, and the
saved `style` attribute is filtered by KSES on save for every user without
`unfiltered_html`. A user who has that capability can write arbitrary CSS into a
post with or without this plugin.

---

## 3. The checklist

### Sanitizing — pass

- **Every option has a `sanitize_callback`.** All three, and each one *validates*
  rather than cleans, which is the order the guidelines ask for: an unrecognised
  source becomes `''`, an invalid breakpoint set is refused **whole** and the
  previously stored value returned, so a bad save is a no-op and never a
  data-loss event.
- **The one free-form string in the plugin is the breakpoint label**, and it is
  run through `sanitize_text_field()` in `Breakpoint::create()` rather than at
  the option boundary — which is the right door, because four callers reach that
  value (the screen, `theme.json`, the `spacery_breakpoints` filter and a plain
  `update_option()`) and a rule enforced at one of them is a rule three callers
  skip. A label that sanitises to nothing is then refused by the empty check.
- **Slugs and boundaries are pattern-matched, not cleaned** — `^[a-z0-9-]+$` and
  a length pattern mirroring `WP_Theme_JSON::is_valid_viewport_breakpoint_size()`.
  Verified against hostile input: `a}b{c`, `AAA`, `10px) or (width: 1px`,
  `10px}body{color:red`, `-10px`, `calc(10px)`, 13 breakpoints, an `stdClass`
  where a string belongs, an array where a string belongs — **every one refused,
  none of them throwing**, each falling back to the preset.

### Validating — pass

- **Allowlist, not blocklist, and strict comparison throughout.**
  `Generator::is_value()` is an allowlist of four shapes (preset reference,
  number with optional unit, one of seven keywords, a call to one of five
  functions with a restricted argument list) and it checks **every** function
  name in a nested expression, so `calc(url(x))` is refused. `in_array( …, true )`
  everywhere it matters.
- **35 injection payloads were run through the real generator and the real Style
  Engine** — semicolons, braces, CSS comments, `url()`, `expression()`,
  `image-set()`, `@import`, backslash and unicode escapes, `</style><script>`,
  NUL bytes, quotes, tab/vertical-tab/form-feed/NBSP variants, case games
  (`URL(`, `CaLc(`), a vendor prefix, `var(--x);color:red`. **Every payload
  emitted nothing.** The eight values that were emitted were the eight that
  should have been.
- **Hostile style-object *keys* are neutralised by core**, which is worth
  knowing rather than assuming: `{"top:red;x": "10px"}` becomes the property
  `padding-topredx` and `{"}body{color": "10px"}` becomes `padding-bodycolor`,
  because `_wp_to_kebab_case()` keeps word characters and `sanitize_key()` strips
  the rest. Nonsense, inert, and not an escape.
- **Validation is total.** Every external reading — theme.json, both options, both
  filters — returns `null` on anything unusable and falls back to a known-good
  set. The one deliberate exception is `Registry::preset()`, which throws, because
  that input is Spacery's own and a fallback there would serve the wrong
  breakpoints quietly.

### Escaping — pass

Four output sites in the whole plugin, and the guidelines' "escape as late as
possible" is followed at each:

| Where | Output | Escaped |
|---|---|---|
| `Screen::render()` | the mount point's id | `esc_attr()` |
| `Requirements::register_notice()` | version mismatch notice | `esc_html()`, at the `printf` |
| `Spacer::missing_build_notice()` | missing-build notice | `esc_html__()` |
| `Screen::enqueue()` / `Editor\Settings` | the two `window.*` payloads | `wp_json_encode()`, which escapes `/` so a string cannot close the inline `<script>` |

Everything else the user sees is React rendering text nodes. **No
`dangerouslySetInnerHTML`, no `innerHTML`, no `RawHTML`, no `document.write`,
no `eval`** anywhere in `src/` — grepped, zero hits. The two `<a href>` in
`Brand.tsx` take their URLs from PHP constants, not from data.

Generated CSS is not "escaped" and correctly so: it is built by the Style
Engine, whose `filter_declaration()` runs `wp_strip_all_tags()` and
`safecss_filter_attr()` over every declaration on the way to the stylesheet.
**That is defence in depth and not the barrier** — `safecss_filter_attr()`
allows `color`, so it would happily pass the `10px;color:red` injection that
`is_value()` exists to stop. Note that `docs/PLAN.md` D21 says
`safecss_filter_attr()` "was never in the path"; that is true of
`wp_style_engine_get_styles()` and **false of the stylesheet the page actually
gets**. The conclusion it was drawn for stands — the allowlist is still what
does the work — but the sentence is wrong and should be corrected where it is
repeated.

### Nonces — pass, by not needing any

Spacery registers **no** admin-post handler, no AJAX action, and no form of its
own. The settings screen is a React app writing through `/wp/v2/settings`, so
CSRF protection is core's `X-WP-Nonce`, supplied by `@wordpress/api-fetch`'s
nonce middleware (`wp-api-fetch` is a declared dependency of the settings
bundle). The one custom route is `GET` and read-only. Registering the options in
a settings group also means the classic `options.php` path, should anything use
it, gets core's own nonce check and capability filter.

No state-changing request exists that a nonce could be missing from.

### Roles and capabilities — pass

- `add_menu_page( …, 'manage_options', … )`, and `enqueue()` keys off the hook
  suffix that call returns — so a user without the capability has no hook, and
  the bundle is not enqueued. The gate cannot be bypassed by loading the screen
  directly, because the screen does not exist for them.
- `RestController::can_read()` requires `manage_options`, **the same capability
  the core settings endpoint requires**, so the screen can never end up
  half-authorised: able to preview a source it could not save.
- Both admin notices check `current_user_can( 'activate_plugins' )` before
  printing.
- `uninstall.php` runs only under `WP_UNINSTALL_PLUGIN`, inside core's own
  delete flow, which has already checked `delete_plugins`. It reads one option
  and deletes three; consent is read per site on multisite, so one site's choice
  cannot speak for another's.
- **No capability is checked in the render path, and none should be** — rendering
  a post is not a privileged action. F1 is what happens when unprivileged
  *content* is trusted, which is the distinction the guidelines draw.

### Common vulnerabilities — pass

- **SQL injection:** no `$wpdb`, no `mysqli`, no SQL of any kind. Every read and
  write goes through `get_option()` / `update_option()` / `register_setting()`.
- **XSS:** covered under Escaping. The one stored-XSS candidate — a breakpoint
  label, which is free-form and written by an administrator — was chased to both
  of its outputs: `wp_json_encode()` into an inline script (slash-escaped, so
  `</script>` cannot close it) and React text in two bundles. Tested with
  `</script><img src=x onerror=alert(1)>`: sanitised to nothing and then refused
  by the empty-label check.
- **CSRF:** covered under Nonces.
- **Direct file access:** all 20 shipping PHP files carry
  `defined( 'ABSPATH' ) || exit;` or the uninstall equivalent. The three
  generated `build/*.asset.php` do not, and do not need to — they are
  `<?php return array( … );` and produce no output when hit directly.
- **RCE / file / SSRF sinks:** none. No `eval`, `exec`, `system`, `unserialize`,
  `extract`, `create_function`, no file writes, no HTTP requests, no uploads, no
  redirects. The single `base64_encode()` is the menu icon, which
  `add_menu_page()` requires, with the readable SVG in a constant above it.
- **Superglobals:** zero references to `$_GET`, `$_POST`, `$_REQUEST`,
  `$_COOKIE`, `$_SERVER` or `$_FILES` anywhere in the plugin.
- **Denial of service:** the breakpoint set is capped at 12 and a larger one is
  refused outright; the collector is content-addressed, so 500 blocks sharing
  seven recipes cost seven rule groups and 17ms. Recursion in `prune()` and
  `flatten()` is bounded by `json_decode()`'s own depth limit. `uninstall.php`
  iterates every site on a network by design, which is slow on a large one and
  documented as the deliberate choice it is.

---

## 4. What was proved by running it

Reading tells you what a guard intends; only running it tells you what it does.
Everything above marked "verified" or "measured" was executed in the cloud
container on PHP 8.4, against **the real WordPress 7.1 Style Engine** already
vendored at `tests/contract/core/style-engine` — not a stub:

- `harness/inject.php` — 35 injection payloads through
  `Generator::generate()` → `Collector::to_css()`.
- `harness/probe2.php`, `probe3.php`, `probe4.php` — non-string leaves, hostile
  keys, hostile tier slugs, the option sanitisers under 17 malformed inputs,
  hostile `theme.json`, and what else the Style Engine will emit.
- `harness/fatal.php` — F1, reproduced through the real
  `BlockFilter::filter_block()`, before and after the fix.

Note that the suite's `safecss_filter_attr()` stub passes everything through.
That is the honest arrangement: it means every result above is a property of
**Spacery's** allowlist and not of core's, which is what an audit of Spacery
should measure.

The PHP suite was then run through a minimal PHPUnit shim (PHPUnit itself cannot
install here — packagist is refused by the egress policy): **196 assertions
across 10 test classes, all green**, including the 10 new ones. CI is still the
first place PHPUnit and PHPCS proper run.

## 5. What this audit did not cover

- **PHPCS and PHPStan on the changed files.** They cannot run in this
  environment; CI is the first place they do. The edits follow the repo's own
  conventions (Yoda conditions, `array()`, key alignment to the longest key) but
  that is care, not a result.
- **The editor preview's own hardening.** `preview.ts` builds its CSS string by
  hand for `useStyleOverride()`. It is the same allowlist and the same shape, and
  the values it writes cannot escape a declaration — but it writes untrimmed
  values, the mirror of F3, and that parity fix was left out of this change to
  keep it to PHP.
- **A live penetration test.** Everything here is source review plus execution
  against the real Style Engine; nothing was run against the playground site.
- **The supply chain** — `pnpm-lock.yaml`, the GitHub Actions, the release
  workflow's SVN credentials. A separate question from the plugin's own code.
