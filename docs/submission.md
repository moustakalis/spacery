# Submitting Spacery to WordPress.org — the runbook

> **Released 19 September 2026. `v1.0.2` is the live version**, deployed
> 21 September at `r3705502`. **`docs/STATUS.md` is the long history** — what
> this plugin has got wrong and how each was found — and the Project's
> `claude/spacery-status.md` is a copy of it. This line is still the status;
> that file is not. Spacery is at
> `https://wordpress.org/plugins/spacery/`. Submitted 16 September, pended by
> the automated pre-review on 18 September, corrected zip uploaded the same day,
> approved 19 September, deployed the same night at `r3703665`. This line is the
> one place that says where the plugin stands, so update it here and nowhere
> else.
>
> **1.0.3 is live** — deployed 25 September at `r3713022` from `v1.0.3`
> (`09ed304`). It lowers the PHP minimum from 8.2 to 8.1 and changes no code —
> D41. Checked out of Subversion: `trunk/` and `tags/1.0.3` carry identical
> file lists, the same shape as 1.0.2's, and the bundles are byte-identical to
> 1.0.2's. The theme-author guide landed on `main` after the tag, so its link in
> `readme.txt` reaches the directory only through the Assets workflow or the
> next release.
>
> **1.0.2 was a security release, and it shipped on the first run.** A full
> audit against the WordPress Security API, on 21 September, found that a
> hand-written `spacery` block attribute could raise an uncaught `TypeError`
> inside `render_block` — a fatal on every page holding that block, caused by
> anyone who can edit it. `docs/security-audit.md` is the audit and F1 is the
> defect; the fix, two smaller allowlist bypasses, ten regression tests and the
> whole version bump are in `8454823`. **It is the first release to carry an
> `== Upgrade Notice ==`**, which is what that section is for: 1.0.1
> deliberately spent nothing on a metadata release so this one would still be
> read.
>
> **It is also the first deploy into a populated `trunk/`**, so
> `rsync --delete` ran for the first time — §1's list of unexercised release
> machinery is one shorter. Verified out of Subversion rather than from the
> workflow's own summary: `tags/1.0.2` and `trunk/` carry identical file lists,
> both identical in shape to `tags/1.0.1`, so nothing was deleted; the three
> bundles are byte-identical to 1.0.1's, which is what an unchanged `src/`
> should produce; `trunk/spacery.php` reads `1.0.2` in both places and
> `readme.txt`'s `Stable tag` agrees; and `trunk/includes/Styles/Generator.php`
> hashes the same as the committed file, so the fix is what actually shipped.
> **`deploy.sh`'s "already published" early exit is still unexercised**, and is
> the last thing in the release path that has never run.
>
> **Nothing in §1–§4 is live any more.** They are the record of how it got here,
> kept because the next release walks the same ground. What is live is **§4's
> Phase 6**, the first-days list. Of it, the search index has happened and
> **translations are the live item**. 1.0.1 deliberately shipped with no
> `== Upgrade Notice ==`: that section drives the update nag, and spending it
> on a metadata release devalues the one mechanism that matters when
> something breaks.
>
> **1.0.1 released 20 September**, `r3704615`, tagged `v1.0.1`. It carries no
> code. `readme.txt`'s title became `Spacery - Responsive Spacing and Spacer
> Block` and its tags traded `block editor` for `gutenberg`, because the
> directory's own search put Spacery outside the top twelve for `spacer`,
> `responsive spacer`, `responsive spacing` and `breakpoints` while ranking it
> first for `spacery`. The baseline is in `claude/promotion-plan.md` §3c;
> re-measure before concluding anything about the change.
>
> **The plugin header keeps the name `Spacery`.** `activatePlugin` keys off its
> kebab-cased value, which `tests/e2e/extension.spec.ts` hard-codes as
> `PLUGIN = 'spacery'`. The readme title and the header therefore differ on
> purpose. Changing one means changing that constant too.
>
> **1.0.1 was tagged once before it could work, and the run failed.** Two
> guards caught it, and both are worth knowing before the next release:
>
> - `wp i18n make-pot` writes the plugin version into the POT header, so **any**
>   version bump makes `languages/spacery.pot` stale and fails the
>   `i18n: POT is current` job. Regenerate it in the same commit.
> - `release.yml` refuses a tag whose `CHANGELOG.md` entry is missing or
>   undated. `readme.txt`'s own changelog does not satisfy it — they are two
>   separate files and both need the entry.
>
> Both are stated in §0's *Shipping an update* prompt, which was not read. The
> failure happened before the Deploy step, so nothing was half-published and
> the re-run hazard below never came into play — recovery was deleting the tag,
> pushing the fix, and tagging again.
>
> Review ID `APPROVED spacery/nikosmoustakas/18Sep26/T2 19Sep26/4.2`.
>
> **The pre-review raised four things** (ID `AUTOPREREVIEW spacery/nikosmoustakas/18Sep26/T1`):
> guideline 11 and admin notices, bundled `.po`/`.mo` files, the
> `register_setting()` sanitizer for breakpoints, and `load_plugin_textdomain()`.
> Three were fixed; guideline 11 is a false positive and is answered rather than
> changed. §3's *What the pre-review asked* has the detail and the reply.
>
> **What the uploaded zip contains:** the shipping files as of **`22ff7c9`**.
> The fixes are in the repository and are **not** in the zip the reviewer holds;
> a corrected zip has to be uploaded before the reply is worth sending.
>
> **When to expect a reply:** a pended submission goes into the assigned
> reviewer's queue once you reply, and response times depend on a volunteer's
> availability — days to weeks. Do not ask for a status update inside a month.
>
> **Live Preview is the open item on the listing as of 21 September.** The
> plugin's admin page on WordPress.org carries two notices. *Transfer This
> Plugin* is not one: it is the standing ownership panel every plugin's owner
> sees, it asks for nothing, and there is nothing to close. *Toggle Live
> Preview* is real — it says *"Missing or invalid blueprint.json file"* because
> SVN `assets/` has no `blueprints/blueprint.json`. The file now exists in this
> repository; `docs/assets.md` covers what it does, how to try it before
> committing, and why `.github/workflows/assets.yml` rather than `release.yml`
> is what publishes it. **Committing it is only half:** a committer then has to
> set the preview to public in the plugin's **Advanced** view, which is the
> step the toggle button performs and which stays disabled until the file is
> there.
>
> **If you are picking this up cold, go to the row that matches:**
>
> | If | Go to |
> |---|---|
> | A banner, screenshot or the Playground blueprint needs changing | `docs/assets.md`. **Not §4** — `action-wordpress-plugin-deploy` refuses to run once the version's tag exists, so `release.yml` cannot correct `assets/` after a release. `.github/workflows/assets.yml` can, on any push to `main` that touches it |
> | Shipping a 1.0.x or 1.1 | **§4**, which is the release plan and has been walked once end to end. Read *What is irreversible* first. Note that **every path in it so far has run against an empty SVN repository** — an update exercises two things that never have, listed in that section |
> | Something about the plugin itself needs changing | `docs/PLAN.md`'s decision table (D1–D38) first. Then §4, because a fix now reaches users through a release rather than through a zip |
> | A user reports a bug, or WordPress.org writes again | `claude/spacery-status.md` for whether it is already known — §3 onward is a catalogue of what this plugin has got wrong and how each was found. Then the decision table |
> | Just resuming, nothing specific | §0's first prompt. The short answer is that 1.0.0 is out and Phase 6 is the only live list |
>
> **Two answers settled on 16 September**, so nobody re-asks: the WordPress.org
> account is **`nikosmoustakas`**, which is what `readme.txt`'s `Contributors`
> line grants the listing to; and `github.com/moustakalis/spacery` is
> **public** — which is what makes `readme.txt`'s `== Source Code ==` section
> satisfy guideline 4, so **confirm it still is before uploading**: a 404 there
> is a review round-trip.

## 0. Opening a new Claude session on this

Paste one of these as the first message. They exist because the useful thing on
a cold start is not a summary — it is getting the session to read the right
three places before it says anything.

**Just resuming:**

```text
Spacery, my WordPress plugin. 1.0.0 is released and in the WordPress.org
directory.

Before answering anything, read, in this order:
1. docs/submission.md — the header says where it stands, and its routing table
   says where to go next. §4 is the release plan, already walked once.
2. The project doc claude/spacery-status.md, §1 only — the boxed summary. §1a
   onward is history; do not infer the current state from it.
3. docs/PLAN.md's decision table (D1–D38) before reopening any design question.
   Several rows record a rule that was corrected once already.

The repo is the connected folder ~/Documents/GitHub/spacery. You prepare
commits, I push and I tag.

Then tell me where things stand and what, if anything, is worth doing today.
```

**Shipping an update:**

```text
Spacery — I want to ship <version>.

Read docs/submission.md §4 first. It is the release plan and it has been run
once, but only ever into an empty SVN repository, so two things in it have
never happened: rsync --delete against a populated trunk/, and deploy.sh's
early exit, which prints "already published" and exits 0 once tags/<version>
exists — so a re-run after a bad deploy reports success and does nothing.

Also read claude/spacery-status.md §1 and docs/PLAN.md's decision table.

Bump the version in all three places the guard checks (plugin header,
readme.txt Stable tag, CHANGELOG heading with a date), add == Upgrade Notice ==
if this one matters to existing users, and regenerate the POT if includes/,
spacery.php or src/ changed. Rehearse with Actions → Release → Run workflow
before tagging.

Repo: ~/Documents/GitHub/spacery. I push, I tag.
```

**Translating:**

```text
Spacery — I want to work on translations.

Read first:
1. docs/submission.md — the header says where the plugin stands, including
   whether a release is mid-flight.
2. claude/spacery-status.md §1, and D38 in docs/PLAN.md's decision table. D38
   is the one that matters here: JS translations would never have loaded from a
   language pack, because the POT referenced src/ paths while core looks up
   md5('build/settings.js'). Bundled handle-named payloads were hiding it.

What is already true, so nothing is rebuilt that exists:

- Nothing is bundled. Translations come from translate.wordpress.org; the Greek
  translation lives in languages/ to seed it, and /languages is in .distignore
  and out of package.json#files.
- `pnpm run i18n:pot` builds first, then scans a scratch copy of build/,
  includes/ and spacery.php — not src/.
- `bin/make-translations.sh` keeps `make-json`'s md5-named output and asserts
  the filenames against php -r 'echo md5($argv[1]);' of the three bundle paths.
- `bin/install-language-pack.php` installs compiled Greek into WP_LANG_DIR for
  testing a real language-pack load, and `bin/locale-check.php` exists too.
- The tagline "Responsive controls at your breakpoints" is brand, not copy. It
  is deliberately not translatable and stays out of the POT.
- CI's `i18n: POT is current` job regenerates the POT and fails on any diff, so
  a version bump alone breaks it.

Repo: ~/Documents/GitHub/spacery. You prepare commits, I push and I tag, and
tell me the exact commands to run.
```

**A bug report, or WordPress.org writing again:**

```text
Spacery — <the report, or their email, below>.

Before agreeing with any of it, check it against the code. claude/spacery-status.md
§3 onward is a catalogue of what this plugin has already got wrong and how each
one was found; read whether this is known before treating it as new. §1 is the
current state.

docs/submission.md §3 has the evidence table for every WordPress.org Common
Issues category, and §3quatervicies records that two of the four findings in
the last pre-review were not what the message said they were.

Repo: ~/Documents/GitHub/spacery. I push, you don't.

--- report ---
<paste>
```

**Written 16 September 2026 against the live handbook, and revised 20 September against the released plugin.**
The submission itself is small: WordPress.org asks for **a zip** and **a short
written overview of what the plugin does**. Everything else a reviewer reads is
already in `readme.txt` and in the code. So this document holds the texts, in
the order they are used, and nothing that is not a text.

Checked today rather than remembered:

- The upload form wants "a complete, ready to go, zip of the plugin" and a brief
  overview describing what it does.
- "Once a plugin is queued for review, we will review the code for any issues
  within **14 business days**."
- The slug comes from the `Plugin Name:` header and **cannot be changed after
  submission**. The display name can be.
- Approval brings an email with Subversion credentials. The SVN repository does
  not exist before then.
- `Tested up to: 7.1` is current, and **stays `7.1` now that 7.1.1 has
  shipped** (September 2026). An earlier version of this line said to bump it
  when 7.1.1 landed, which was wrong: the handbook takes a branch here and says
  the minor version can be left off, so `7.1` already covers 7.1.1. Bump it when
  7.2 ships, and it travels in a deploy like any other `readme.txt` change.

---

## 1. Before the form

Five things, four of which are text that has to be right before anything is
uploaded, because two of them cannot be changed afterwards.

| | Text | State |
|---|---|---|
| Slug | `spacery`, derived from `Plugin Name: Spacery` | **Permanent.** Re-check it is still free in the same sitting as the upload — it was free on 15 September, which is not the same as free today |
| Display name | `Spacery` | Changeable later |
| Contributors | `nikosmoustakas` | Must be an existing WordPress.org account, confirmed yours. This line is what grants you the listing |
| Short description | *Responsive padding, margin and spacer height on any block, at the breakpoints your design uses.* (95 chars, limit is 150) | Rewritten 19 September; the previous one said "unlimited", which the twelve-tier cap makes untrue |
| `Tested up to` | `7.1` | Correct today |

Also, before the form and not text: whitelist `plugins@wordpress.org` in your
mail client, because the entire review happens over email and it is a thread you
cannot afford to lose to a spam folder.

Then, in one sitting:

```bash
python3 bin/check-release.py
pnpm run build && pnpm run plugin-zip
```

---

## 2. The form

**Plugin Name:** `Spacery`

**The description box** — paste this verbatim. It is written for a reviewer, not
for a visitor: it says what the plugin does in three sentences and then answers,
before they ask, the four things in this code base that look worth asking about.

```text
Spacery adds responsive block controls to the WordPress block editor: a padding
and margin value per breakpoint on any block that supports spacing, plus one new
block, Responsive Spacer, whose height can differ at each breakpoint.

WordPress 7.1's own responsive block styles offer two theme-defined breakpoints,
mobile and tablet. Spacery extends that to as many tiers as a design system
needs, using the same desktop-first model and the same disjoint media-query
shapes as core, so the two never disagree at a boundary. Breakpoints come from
one source at a time, chosen on the plugin's settings screen: the theme's
`settings.custom.spacery.breakpoints` or `settings.viewport`, Spacery's own
four-tier preset, or a set the site defines itself.

Values are stored as block attributes. Nothing is written into saved post
content: a `render_block` filter adds a class at output time, and the CSS itself
is generated by WordPress's own Style Engine
(`wp_style_engine_get_styles()` and `wp_style_engine_get_stylesheet_from_css_rules()`).
Deactivating the plugin leaves every post valid.

Notes for review, covering what a scan of the code will raise:

1. GPL-2.0-or-later throughout. No bundled third-party libraries and no runtime
   dependencies — `composer.json` requires only PHP, and nothing from
   `node_modules` ships.

2. No external requests of any kind. No remote servers, no telemetry, no
   analytics, no fonts or assets from a CDN. The only network call anywhere in
   the plugin is `apiFetch` to the site's own REST API from the settings screen.
   There is no advertising, no upsell and no pro version.

3. The compiled JavaScript and CSS in `build/` are built from `src/` in the
   public repository at https://github.com/moustakalis/spacery — with Node.js 22
   or newer, `pnpm install && pnpm run build` rebuilds it. The build is
   `@wordpress/scripts` (webpack, Babel, TypeScript, Sass) and nothing else.
   `readme.txt` says the same under "Source Code".

4. `includes/Settings/Screen.php` calls `base64_encode()` once. It is not
   obfuscation: `add_menu_page()` accepts an SVG menu icon only as a data URI,
   so the icon's plain SVG markup is a readable constant a few lines above and
   is encoded at call time rather than pasted in pre-encoded.

5. No translations are bundled and there is no `load_plugin_textdomain()` call.
   `wp_set_script_translations()` is given a handle and a domain and no path, so
   both halves of the plugin's translations come from a language pack in
   WP_LANG_DIR. The POT is extracted from the built bundles rather than from
   `src/`, because a pack's script payloads are named after an md5 of the
   registered script's path and would otherwise never be found.

Stored data: two registered options, `spacery_breakpoint_source` and
`spacery_custom_breakpoints`. `uninstall.php` removes them only if the site
ticked a checkbox on the settings screen that is off by default, because the
breakpoints are what every stored block value is measured against and deleting
them silently changes what those values mean. The settings screen and the REST
route are both `manage_options`.
```

That is the whole of what you write. Do not paste the readme into that box; the
reviewer reads `readme.txt` from the zip.

---

## 3. When the review comes back

**The mechanics first**, because getting these wrong costs more than any answer
does.

- Reply **in the same email thread**, to `plugins@wordpress.org`.
- **Uploading a corrected zip is not re-submitting.** The two are easy to
  confuse and the cost of getting it wrong runs both ways. A *new* submission
  makes a second ticket and is what to avoid; a *pended* submission is corrected
  by uploading at the same "Add your plugin" page, which replaces the zip on the
  existing ticket, and the pre-review email asks for exactly that. Upload first,
  then reply in the thread — a reply saying something is fixed, sent against a
  zip that still has it, costs a round trip.
- Answer everything in **one** reply rather than a stream of them.
- If a change is genuinely needed: make it in the repository, push it, and send
  a new zip **when they ask for one**. They normally do ask; do not pre-empt it.
- **Do not tag.** `release.yml` refuses an undated changelog, and the SVN
  repository does not exist until approval anyway.
- Tone: state the fact, then **offer** the change. A reviewer who has to argue
  takes longer than one who can say "fine".

### What the pre-review asked, and what was done

18 September 2026. Every point was read against the code before it was agreed
with, and two of the four were not what they looked like.

| Raised | Verdict |
|---|---|
| **Guideline 11**, admin dashboard hijacking | **False positive.** Answered, not changed. Spacery registers exactly two `admin_notices` callbacks — `Requirements::register_notice()` and `Spacer::missing_build_notice()` — both `notice-error`, both gated on `current_user_can( 'activate_plugins' )`, both conditional on the plugin being unable to run. Nothing dismissible, no dashboard widget, no `plugin_action_links` or `plugin_row_meta`, no activation redirect, and no upsell wording anywhere in `includes/`, `build/` or `readme.txt`. The other thing the pattern could have caught is the top-level `add_menu_page()`, which is D16 and is allowed |
| **Bundled `.po` / `.mo`** | Correct. Fixed — `languages` is out of `package.json#files` |
| **`register_setting()` sanitization** | Half right, and the half it mentions in passing was the real one. All three options already carried a `sanitize_callback`; the note was about the callback's quality. Labels were trim-only, true — but there is no injection path, because the editor payload goes through `wp_json_encode()`, whose slash escaping stops a `</script>` label closing the inline script, and both bundles render labels as React text with no `dangerouslySetInnerHTML` anywhere. They are sanitized anyway. **The finding worth having was "validate string types":** `BreakpointSet::from_array()` cast with `(string)`, which *throws* for an object — an uncaught Error in a sanitize callback, fatal on whatever page asked to save. Unreachable through REST, reachable from `update_option()` |
| **`load_plugin_textdomain()`** | Correct, and the same finding as the bundled files: the call exists only to register the path those files sit at. Both gone. D20 records the reversal |

**Fixing the last one turned up a defect that predates the review**, and it is
the reason the change is larger than the reviewer asked for. A language pack's
script payloads are named after an md5 of the *registered* script's path —
`build/settings.js` — and `wp i18n make-json` names what it writes from this
repository's POT, which referenced `src/settings/App.js`. So every payload the
repository compiled was named after a path core never hashes, and the bundled
Greek was the only thing hiding it. D38. **Corrected 21 September:** this
paragraph and D38 both said translate.wordpress.org took those names from the
POT and that no pack would have loaded in any locale. It does not, and one
would have — see D38's own row, which now carries the measurement.

### The reply

Short, as they ask. One clarification, because guideline 11 is the one thing
not being changed, and one piece of context worth their time.

```text
Hi,

Thanks — a corrected zip is uploaded.

One clarification on guideline 11, since nothing there changed: Spacery
registers two admin notices and no others. Both are notice-error, both are
gated on current_user_can( 'activate_plugins' ), and both render only when the
plugin cannot run at all — WordPress or PHP below the required minimum, or a
source checkout with no build/ directory. Nothing is dismissible, and there are
no dashboard widgets, no action-link or row-meta additions, no promotional
content and no pro version.

The other three are fixed. The bundled translations are gone and
load_plugin_textdomain() with them — it was only registering the path those
files sat at. Translations will come from translate.wordpress.org; the POT is
now extracted from the built bundles, so that a pack's script payloads are found
at the names WordPress looks for, which they would not have been before.

Best,
Nickos
```

### Where Spacery stands against the handbook's Common Issues

Re-checked on **18 September 2026**, against the *shipping* files only — the
seven entries in `package.json#files` — so these are answers rather than hopes.
If a reviewer raises one of these, the evidence column is where to start.

| What the handbook checks | Spacery | How that was established |
|---|---|---|
| Sanitize, validate, escape | Clean | No `$_POST` / `$_GET` / `$_REQUEST` / `$_SERVER` / `$_COOKIE` **anywhere** in shipping PHP — the settings screen talks to the REST API, which does its own nonce and capability work. Every `echo` in `includes/` is escaped. All three registered options carry a `sanitize_callback` |
| SQL injection | Not applicable | No `$wpdb`, no raw SQL. The plugin stores two options and block attributes |
| Direct file access | Guarded | All 20 shipping PHP files carry `defined( 'ABSPATH' ) \|\| exit;`, or `WP_UNINSTALL_PLUGIN` in `uninstall.php`'s case. Re-verified file by file |
| Prefixes on everything | Clean | `Spacery\` namespace throughout, options `spacery_breakpoint_source` / `spacery_custom_breakpoints` / `spacery_delete_data`, block `spacery/spacer`, filters `spacery_breakpoints` / `spacery_denied_blocks` |
| Dev tools, vendor folders, tests in the zip | None | `package.json#files` is an **allow-list** of seven entries. No `tests/`, no `vendor/`, no `node_modules/`, no `bin/`, no `.github/`, no `docs/` |
| External services, update checkers, remote assets | None at all | Nothing in `includes/` makes an HTTP request; the only URL in shipping JS is the SVG XML namespace, and the only network call is `apiFetch` to the site's own REST route. No update checker, no telemetry, no CDN |
| Bundled or duplicated libraries | None | `composer.json` requires only PHP; nothing from `node_modules` ships; no jQuery, SimplePie or PHPMailer copy |
| Compiled code without source | Covered | `readme.txt`'s `== Source Code ==` names the public repository, Node 22 and the two `pnpm` commands — the alternative guideline 4 allows |
| Stable Tag matches Version | Yes | `bin/check-release.py` asserts it, and is run before every zip |
| Literal text domain | Yes | `'spacery'` as a literal in every gettext call; the POT pipeline would not extract them otherwise |
| GPL | Declared three times | Plugin header, `readme.txt`, `composer.json`, all `GPL-2.0-or-later` |
| Trademarks / naming | Clean | "Spacery" is invented; no third-party mark appears in the slug, the name or the tags |
| HEREDOC / NOWDOC, short tags | None | — |
| Plugin activation of other plugins | None | — |

**One that is an answer rather than an all-clear**, and it has a reply below:
the single `base64_encode()` for the admin menu icon. `load_plugin_textdomain()`
was the other, and is gone — see below.

### Ready replies

### If they ask about `base64_encode()`

```text
It is not obfuscation, and nothing is hidden behind it. `add_menu_page()` takes
a menu icon either as a dashicon name or as a data URI; an SVG can only be
passed the second way. The icon's markup is a plain, readable `ICON_SVG`
constant in `includes/Settings/Screen.php` directly above the call, and it is
encoded at call time precisely so that the source stays reviewable rather than
carrying a pre-encoded blob. The docblock above it says so. I am happy to swap
it for a dashicon if you would prefer the call gone entirely.
```

### If they ask about the compiled JavaScript

```text
The uncompiled sources are `src/` in the public repository at
https://github.com/moustakalis/spacery, and `readme.txt` links to it under
"Source Code" with the build steps. With Node.js 22 or newer,
`pnpm install && pnpm run build` rebuilds `build/`; the toolchain is
`@wordpress/scripts` and nothing else, and no third-party library is bundled.
If you would rather review the sources in place, I can add `src/` to the zip
and resubmit.
```

### If they ask about translations

```text
Nothing is bundled. The plugin carries no `languages` directory and no
`load_plugin_textdomain()` call, and `wp_set_script_translations()` is given a
handle and a domain but no path, so both halves come from a language pack in
WP_LANG_DIR. The compiled Greek stays in the public repository to seed
translate.wordpress.org once the plugin is listed.
```

### If they ask anything about data or privacy

```text
Spacery contacts nothing outside the site — no remote servers, no telemetry, no
analytics, no external assets. It stores two options,
`spacery_breakpoint_source` and `spacery_custom_breakpoints`, and per-block
values as block attributes. It collects no personal data of any kind, so there
is nothing to disclose in a privacy policy.
```

---


### If they ask why `composer.json` is not in the zip

```text
`composer.json` is development-only here: it requires PHP itself and a
`require-dev` block of PHPCS, PHPStan, PHPUnit and the WordPress coding
standards. No Composer package is installed at runtime, nothing from `vendor/`
is shipped, and the directory does not exist in the distributable —
`package.json#files` is an allow-list of seven entries. I left it out on the
"remove development tools from distributions" guideline rather than the
"include composer.json to document dependencies" one, since there are no
runtime dependencies for it to document. It is in the public repository at
https://github.com/moustakalis/spacery, and I am happy to add it to the zip if
you would rather it travelled with the plugin.
```

### If they ask for a change you agree with

```text
Fixed in <version or commit> — <one sentence on what changed and why it is the
right fix rather than a workaround>. <If a second thing was found while fixing
it, say so here.> Let me know if you would like an updated zip.
```

Keep it to that. A reply that re-argues a point the reviewer has already made
costs a round trip; one that quietly fixes something adjacent and does not
mention it costs trust.

### What has *not* been checked

Honest gaps, so a later session does not mistake silence for a pass.

- ~~The official readme validator has never been run.~~ **Run on 19 September**,
  against the rewritten `readme.txt`: no errors, no warnings, and two notes —
  no `== Upgrade Notice ==` section and no donate link. Both are deliberate and
  neither is a defect; see Phase 2a.
- **`release.yml`'s deploy step has never run.** Its guard step was extracted
  and executed by hand against the real files; the deploy itself will run for
  the first time on the tag.
- **PHPCS, PHPStan and PHPUnit run only in CI** — they cannot run in the
  assistant's environment. CI is green at `9cf897f`, which is the evidence.

## 4. Releasing 1.0.0 — the phased plan

Written 19 September 2026, the day of approval, against the real workflow and
the real `deploy.sh` rather than from memory.

### What is irreversible, because it decides the order

Everything below is arranged around three things that cannot be taken back.

| Irreversible | Why it matters |
|---|---|
| **An SVN commit** | WordPress.org's repository has no force-push and no delete. A wrong `trunk/` is fixed by committing over it, and the mistake stays in the history for everyone to read |
| **`tags/1.0.0` existing** | `deploy.sh` bails out early if `tags/$VERSION` is already there — it prints *"Version 1.0.0 of plugin spacery was already published"*, generates the zip and **exits 0**. A re-run after a bad deploy therefore reports success and does nothing |
| **The slug** | `spacery` is granted and permanent |

So: everything that can be checked for free is checked before the tag, and the
tag is the last thing that happens.

---

### Phase 0 — Land the tree, and let CI prove it

**Precondition:** `HEAD` is the commit that dates the changelog, and it is the
only thing ahead of `origin/main`.

```bash
git -C ~/Documents/GitHub/spacery log --oneline -1   # expect: Date 1.0.0 for the tag
git -C ~/Documents/GitHub/spacery status --short --branch
```

Expect a clean tree and `## main...origin/main [ahead 1]`. Then:

```bash
git push origin main
```

**Wait for all five CI jobs on `main` to be green before going further.** This
is not routine caution. This push is the first CI run that contains:

- the POT extracted from `build/` instead of transpiled sources (D38), so the
  `i18n` job now builds before it extracts and diffs a POT whose every
  JavaScript reference changed;
- the `e2e` job's new *Install Spacery's Greek as a language pack* step, which
  runs `bin/install-language-pack.php` through `wp eval-file` in the
  `tests-cli` container and has never executed anywhere;
- `tests/php/I18nTest.php`, rewritten around a `wp_set_script_translations()`
  stub that only CI has ever run.

`php`, `js`, `plugin-check` are the settled ones; `i18n` and `e2e` are the two
to watch. **A red run here is a reason to stop, not to tag** — a tag pushed
against a broken tree deploys it.

**If `i18n` fails** it will be a POT diff. Run `pnpm run i18n:pot` locally
(it builds first now) and commit the result; the references are the likely
culprit and the failure prints the diff.

**If `e2e` fails on the locale steps**, read the *Install Spacery's Greek as a
language pack* step's own output first — it lists every file it wrote into
`WP_LANG_DIR/plugins`. If that list is right and the assertions still fail, the
pack is installed and the lookup is what is wrong; `bin/locale-check.php`'s
report distinguishes those two cases by design.

**Also confirm, at the keyboard rather than from this document:**
`github.com/moustakalis/spacery` is still **public**. `readme.txt`'s
`== Source Code ==` section links there, and that link is what satisfies
guideline 4 for a plugin that ships `build/` without `src/`. A 404 there after
approval is a compliance problem, not a cosmetic one.

---

### Phase 1 — Credentials, and the hour that has to pass

Commit access is granted **within one hour** of the approval email. Nothing
before that hour will authenticate, and the failure arrives at the very last
step of the deploy (see Phase 3), so starting early costs a full run.

**a. Generate the SVN password.** *Account & Security → SVN password* at
`profiles.wordpress.org/nikosmoustakas/profile/edit/group/3/?screen=svn-password`.
It is **not** the WordPress.org account password, and it is one password across
every repository the account owns.

**b. Add two repository secrets** at *Settings → Secrets and variables →
Actions* on the GitHub repository:

| Secret | Value |
|---|---|
| `SVN_USERNAME` | `nikos.moustakas` |
| `SVN_PASSWORD` | the password from (a) |

**The username has two plausible answers and only one is right.** The approval
email's summary block says `nikosmoustakas`; the SVN-access mail says
`nikos.moustakas` twice — as the account granted commit access, and as *"your
SVN username"* — and `nikos.moustakas` is what the upload confirmation logged.
Both are case-sensitive. `readme.txt`'s `Contributors` line stays
`nikosmoustakas`, the profile slug, and is a different thing entirely: it is
what grants the listing, not what authenticates.

**c. Confirm the repository exists.** This needs no credentials:

```bash
svn info https://plugins.svn.wordpress.org/spacery
svn ls   https://plugins.svn.wordpress.org/spacery/
```

**Checked on 19 September: it is there.** Created at r3703470, 19:35 local, with
`assets/`, `tags/` and `trunk/` all empty. The commit message WordPress.org
wrote is *"Adding Spacery by **nikos.moustakas**."* — which is the fourth and
most authoritative sighting of that username, after the access mail's two and
the upload confirmation. The approval email's `nikosmoustakas` stands alone.

`tags/` being empty also means the early-exit in Phase 3 is not in play: the
first deploy run will be a real one.

A revision number does **not** prove your commit access. Nothing short of a
commit does, and access takes up to an hour from the approval email.

---

### Phase 2 — The two preflights worth the minutes

**a. The readme validator — done, 19 September.** Run against the rewritten
`readme.txt` at `https://wordpress.org/plugins/developers/readme-validator/`,
which is the tool the handbook names and which Plugin Check's own readme rules
only approximate. The result:

> **Notes:** No `== Upgrade Notice ==` section was found. No donate link was
> found.

No errors and no warnings. Both notes are deliberate: 1.0.0 has nothing to say
in an upgrade nag and Phase 6 is where that section gets added, and there is no
donate link because there is nothing to donate to.

**Re-run it if `readme.txt` changes again before the tag**, and note that the
validator's paste form posts on a real submit rather than on a scripted click —
the button reports as clicked and the page does not reload. The way to be sure
it ran is that the result block appears above the form; the way to be sure it
validated *this* file is to hash the textarea's contents against `readme.txt`
before submitting, because a paste is a copy and a copy can be stale.

**b. Rehearse the deploy.** `release.yml` now has a `workflow_dispatch`
trigger, and on that path `deploy.sh` runs with `dry-run` set: it does the SVN
checkout, the `.distignore` rsync into `trunk/`, `svn add`, the `tags/1.0.0`
copy, the mime-type propsets and a closing `svn status`, and stops before the
commit. A tag push is always a deploy and a manual run is always a rehearsal —
the flag is derived from the event, so neither can be turned into the other by a
mis-click.

Run it from *Actions → Release → Run workflow* on `main`, once Phase 0 is
green.

**The secrets must exist first, even though the rehearsal never uses them.**
`deploy.sh` checks `SVN_USERNAME` and `SVN_PASSWORD` for emptiness and exits 1
before it reaches the dry-run branch, so a rehearsal with no secrets set fails
with *"Set the SVN_USERNAME secret"* and proves nothing. They do not have to be
*correct* — only non-empty — because the credentials are used by the commit and
the rehearsal never commits. So Phase 1b comes first; Phase 1's hour does not.

**What to read in the output:** the `svn status` near the end is the whole
point. It lists every path that would be added to `trunk/`, and that list should
be the six entries below and their contents — no `src/`, no `tests/`, no
`node_modules/`, no `languages/`.

**Run on 19 September, and it is clean.** The four lines that mattered:
`ℹ︎ Dry run: No files will be committed to Subversion.`, `ℹ︎ VERSION is 1.0.0`
(so the readme-derived version step works on the branch path),
`ℹ︎ Using .distignore` (so `deploy.sh` took the branch this workflow was written
for, with `node_modules` present in the workspace and excluded), and
`➤ Dry run: Files not committed.` `trunk/` came out as exactly the six entries,
`tags/1.0.0` was copied, and `assets/` took all eight files. So the thing that
had never been observed rather than reasoned about has now been observed.

**One warning in that output is expected and is not a problem:**

> `svn: warning: 'image/svg+xml' is a binary mime-type but file
> '…/assets/icon.svg' looks like text; diff, merge, blame, and other operations
> will stop working on this file`

The action sets `svn:mime-type` on every asset so the directory serves them
rather than offering them as downloads, and `image/svg+xml` is the right type
for `icon.svg`. Subversion is only warning that it will stop treating that one
file as text for *its own* diff and blame, which nothing here depends on.

Two things the rehearsal cannot tell you: whether the credentials work, because
the commit is the only step that uses them; and whether WordPress.org accepts
the result, because nothing is sent.

**Two adjustments the dry-run path needed**, both of which would have failed a
rehearsal rather than a release:

- The *tag and the plugin must agree* guard reads `GITHUB_REF_NAME`, which on a
  manual run is the branch. It is now tag-only, so it still guards every real
  deploy and no longer refuses the rehearsal before it reaches the step it
  exists to protect.
- `deploy.sh` derives its version from the tag the same way, and would have
  tried to `svn cp trunk tags/refs/heads/main`. The version is now stated by a
  step that reads `readme.txt`'s `Stable tag` and passed in as `VERSION` — one
  authoritative source on both paths, and on a tag push the guard has already
  proved the tag agrees with it.

---

### Phase 3 — Tag, and what the deploy will do

```bash
git -C ~/Documents/GitHub/spacery tag v1.0.0
git -C ~/Documents/GitHub/spacery push origin v1.0.0
```

`release.yml` then runs six steps, in this order. Knowing which one failed is
most of the diagnosis:

1. **Checkout, pnpm, Node** — boring.
2. **The tag and the plugin must agree.** Compares the tag minus `v` against
   the plugin header's `Version` and `readme.txt`'s `Stable tag`, then requires
   a dated `## [1.0.0] - YYYY-MM-DD` heading in `CHANGELOG.md`. All three say
   `1.0.0` and the heading is dated `2026-09-19`; the step was extracted from
   the YAML and run by hand against the real files, and passes.
3. **Install dependencies** — `pnpm install --frozen-lockfile`. This is why
   `node_modules` exists in the workspace by the time the deploy copies files,
   and why the next point matters.
4. **Build** — `pnpm run build`, producing the `build/` that ships. `build/` is
   gitignored, so the deploy has no plugin to publish without this step.
5. **Deploy.** `BUILD_DIR: ./` is read by `deploy.sh` as *"no build directory"*
   (it maps `./` to `false`), which selects the branch that copies the
   workspace with `rsync -rc --exclude-from=.distignore --delete
   --delete-excluded`. That is the branch that honours `.distignore`; the other
   branch would copy the workspace wholesale, `node_modules` included.
   Then `svn cp trunk tags/1.0.0`, mime-type propsets on `assets/*.png` and
   `assets/*.svg` so screenshots render instead of downloading, and finally a
   single `svn commit` — **the only step that uses the credentials, and the
   last thing that happens.**
6. **Attach the zip to the GitHub release**, from `spacery.zip`, with generated
   release notes.

**Expected `trunk/` contents — six entries, and nothing else, as the rehearsal
confirmed:**

```
LICENSE  build/  includes/  readme.txt  spacery.php  uninstall.php
```

`assets/` gets the eight files it holds. `src/`, `tests/`, `docs/`, `bin/`,
`languages/`, `node_modules/`, `.github/` and every dotfile are excluded by
`.distignore`, and `bin/check-release.py` is what keeps that list and
`package.json#files` from drifting apart.

---

### Phase 4 — Verify what reached SVN, before looking at the page

The listing takes minutes to appear and is the pleasant check. This is the one
that catches a bad deploy while it is still one commit old.

```bash
svn ls https://plugins.svn.wordpress.org/spacery/trunk/
svn ls https://plugins.svn.wordpress.org/spacery/tags/
svn ls https://plugins.svn.wordpress.org/spacery/assets/
svn log -l 1 https://plugins.svn.wordpress.org/spacery
```

- `trunk/` is the six entries above. **Anything else there is the rsync having
  taken the wrong branch**, and the fix is a corrective commit, not a re-run.
- `tags/` holds `1.0.0/`.
- `assets/` holds the two banners, two icons, `icon.svg` and the three
  screenshots.
- The log's one entry reads *"Update to version 1.0.0 from GitHub"*.

**Verified on 19 September, and all four agree.** `trunk/` is the six entries
and nothing else; `tags/` holds `1.0.0/`; `assets/` holds all eight files; and
the log reads `r3703665 | nikos.moustakas | Update to version 1.0.0 from
GitHub`. The published `readme.txt` carries `Stable tag: 1.0.0` and the plugin
header carries `Version: 1.0.0`, so what the directory serves and what it
advertises are the same thing.

**If the deploy failed at the commit**, nothing above exists and the tag can
simply be deleted and re-pushed once the cause is fixed:

```bash
git push origin :refs/tags/v1.0.0
git tag -d v1.0.0
```

**If the deploy committed and the result is wrong**, deleting the tag does not
help: `tags/1.0.0` now exists, so a re-run bails out and *reports success*. The
route is a corrective change, a version bump to `1.0.1` in all three places,
and a new tag.

---

### Phase 5 — The public listing

`https://wordpress.org/plugins/spacery` appears once `trunk/` is populated.

- **The three screenshots render, with the right captions.** `readme.txt`'s
  `== Screenshots ==` block matches files **by position**, so a reordering shows
  as captions under the wrong images rather than as an error. The order is
  panel, spacer, settings — `docs/screenshot-brief.md` is the record.
- **The banner is not cropped oddly** at either 772×250 or 1544×500. The lockup
  is centred by a rule the artwork never stated until it was measured; if
  something looks off-centre, `docs/asset-handoff.md` has the numbers.
- **The icon** resolves at both sizes and in the search listing.
- **The Description** reads as intended, and the tagline on the banner matches
  the one on the settings screen — they are deliberately the same single line.
- **Run Plugin Check against the published zip**, not the checkout. §3vicies of
  the status notes explains why the difference matters: the last run was against
  a superset of what ships.

**Checked on 19 September, minutes after the deploy.** The page renders with the
short description and the rewritten Description, version 1.0.0, *Requires
WordPress 7.1 or higher*, *Requires PHP 8.2 or higher*. All three screenshots
appear, in order, with their captions matched correctly — the failure this
section exists to catch, since they are paired by position. Every one of the
eight assets is served from `ps.w.org`, and the three screenshots' byte counts
are identical to the files in `assets/`.

**One thing the listing settles:** it displays *Tested up to: **7.1.1***, where
`readme.txt` says `7.1`. The directory resolves the branch to its latest
release, which is the behaviour §1 reasoned about when it declined to bump that
line. The reasoning was right and is now observed rather than argued.

---

### Phase 6 — The first days

- **Search results take up to 72 hours** to include the plugin, and the profile
  page the same. Nothing is wrong before then.
- **Translations. Observed 21 September 2026, and this bullet was the only
  place in the repository that had the mechanism right.** translate.wordpress.org
  builds its own originals by extracting strings from `trunk/`, and `trunk/`
  contains `build/` and not `src/` — which is exactly the naming the plugin
  depends on (D38). Both halves are now measured rather than reasoned: `svn ls`
  gives `trunk/` six entries and no `languages/`, and
  `translate.wordpress.org/projects/wp-plugins/spacery` holds **136 originals**
  across Development and Stable, referencing the same ten files, with the same
  per-file counts, as `languages/spacery.pot` — 74 `build/settings.js`,
  32 `build/extension.js`, 16 `build/blocks/spacer/index.js`,
  8 `build/blocks/spacer/block.json`, and 21 across the PHP. Four other places
  said a pack is named from this repository's POT; they are corrected, and D38
  records why the decision survives the correction. **What is left is the
  import, and it needs no permission — an earlier version of this bullet said it
  did.** The Polyglots handbook's GlotPress page is explicit that *any*
  WordPress.org user can import a plugin translation file; what the import
  cannot do is set the status. Every string arrives as **Waiting**, and it is
  *approval* that needs a translation editor for `el`. So the order is: import
  `languages/spacery-el.po` into both `stable/el/default/` and `dev/el/default/`
  — 136 entries, 5 deliberate blanks (the plugin name, the author, the text
  domain and two URLs), no obsolete and no fuzzy entries — and only then request
  PTE from the Polyglots team, with the work already sitting there to be
  reviewed. That order matters because several locale teams grant PTE only after
  seeing a translator's contributions, so asking first is asking for the thing
  the contributions are supposed to earn. Every locale is at 0% until a `el`
  editor approves them, or grants Nick the right to approve his own.

  The two **Readme** sub-projects are a separate string set — `readme.txt`, not
  the plugin — and nothing in `languages/` covers them.
- **`== Upgrade Notice ==`** is the one text 1.0.0 does not have and does not
  need. Add it at the first update that matters to an existing user; it is what
  shows in the update nag, so one sentence under 300 characters about why to
  update rather than what changed:

  ```
  == Upgrade Notice ==

  = 1.0.1 =
  Fixes <the thing>. Existing breakpoints and block values are untouched.
  ```

- **`Tested up to`** stays `7.1` now that 7.1.1 has shipped — the handbook takes
  a branch there. Bump it when 7.2 ships, in a deploy like any other
  `readme.txt` change.

---

### The failure modes, in one place

| Symptom | Cause | Action |
|---|---|---|
| Guard step fails on the version | Tag, header and `Stable tag` disagree | Delete the tag, fix, re-tag. Nothing has been published |
| Guard step fails on the changelog | Heading is undated | Same. This is the guard doing its job |
| `Set the SVN_USERNAME secret` | Secret missing or empty | Add it. Nothing has been published |
| Commit fails to authenticate | Wrong username, wrong password, or the hour has not passed | Try `nikosmoustakas`; regenerate the SVN password; wait. Nothing has been published — the commit is the last step |
| Deploy says *"already published"* and exits green | `tags/1.0.0` exists | The deploy already ran. Do not re-run expecting a different outcome; verify Phase 4 and correct forward with 1.0.1 |
| `trunk/` has `src/` or `node_modules` | The rsync took the build-directory branch | Corrective commit. Check `BUILD_DIR` is exactly `./` |
| Screenshots download instead of rendering | mime-types not set | The action sets them; if not, `svn propset svn:mime-type image/png` on `assets/*.png` |
| Captions under the wrong screenshots | Files reordered relative to `readme.txt` | Fix the block or the filenames; it travels in the next deploy |

---

## 5. What this document deliberately does not claim

- **That the build is byte-reproducible.** `pnpm run build` rebuilds `build/`;
  whether webpack emits identical bytes on another machine has not been tested,
  so no text here says "exactly".
- **That the slug was free.** It was checked at the keyboard on 15 September and
  granted on 19 September; `spacery` is now permanent and the question is closed.
- ~~That `release.yml` works.~~ **It ran on 19 September and it worked**, once
  as a rehearsal and once for real. What is still unclaimed is that it works for
  an *update*: every run so far has published into an empty repository, and the
  paths that matter next time — `--delete` against an existing `trunk/`, and the
  early exit when `tags/<version>` is already there — have not been exercised.
