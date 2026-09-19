# Submitting Spacery to WordPress.org — the runbook

> **Approved 19 September 2026.** Submitted 16 September, pended by the
> automated pre-review on 18 September, corrected zip uploaded the same day,
> approved the next morning. This line is the one place that says where the
> plugin stands; everything below reads differently depending on it, so update
> it here and nowhere else.
>
> **What is left is §4**, which is the release plan in phases: push and prove
> CI, credentials and the hour's wait, two preflights, the tag, verify SVN,
> then the listing. Nothing else in this document is live. Review ID
> `APPROVED spacery/nikosmoustakas/18Sep26/T2 19Sep26/4.2`.
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
> **If you are picking this up cold, go to the row that matches:**
>
> | If | Go to |
> |---|---|
> | Still in the queue, nothing heard | Nowhere. The reviewer reads the uploaded zip. Don't change it, don't re-submit, don't tag. **§3**'s last part lists the two things worth doing while waiting. |
> | A reviewer has written back | **§3** — ready replies for the three things a code scan raises, and the rule about replying in the same thread rather than re-submitting |
> | Approved; SVN credentials have arrived | **§4** — the phased release plan. Read *What is irreversible* first; it is why the order is what it is |
> | Something about the plugin itself needs changing | `docs/PLAN.md`'s decision table first. Then check the line above: before upload a fix simply goes in the next zip; after it, the zip is frozen and the fix ships in the deploy. |
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

**Nothing has happened yet — just resume:**

```text
Spacery, my WordPress plugin. It is submitted to WordPress.org and I am waiting
on the review.

Before answering anything, read, in this order:
1. docs/submission.md — the header says where it stands, and §3 is the review
   procedure.
2. The project doc claude/spacery-status.md, §1 only — the boxed summary. The
   rest is history; do not infer the current state from it.
3. docs/PLAN.md's decision table (D1–D37) before reopening any design question.

The repo is the connected folder ~/Documents/GitHub/spacery; the MAMP test site
is ~/Dev/playground at https://playground:8890. You prepare commits, I push.
The submitted zip is frozen — a fix lands in the repo and ships in the deploy.

Then tell me where things stand and what, if anything, is worth doing today.
```

**The reviewer has written back:**

```text
Spacery — the WordPress.org reviewer replied. Their email is below.

Read docs/submission.md §3 first: the reply mechanics, the table of Spacery
against every Common Issues category with its evidence, and the ready replies.
Also read the project doc claude/spacery-status.md §1 for the current state.

Check each point they raise against the code before agreeing with it — §3's
table has the evidence for the ones already verified. Then draft one reply for
the same email thread. Do not re-submit through the form, and do not tag.

Repo: ~/Documents/GitHub/spacery. I push, you don't.

--- their email ---
<paste>
```

**Approved:**

```text
Spacery was approved by WordPress.org and the SVN credentials have arrived.

Read docs/submission.md §4 — it is the runbook for exactly this: date the
changelog, add the repository secrets, tag, watch release.yml, check the
listing. Note that release.yml has never run before, so its first run is the
deploy itself.

Repo: ~/Documents/GitHub/spacery. You prepare commits, I push and I tag.
```

**Written 16 September 2026, against the live handbook and the live plugin.**
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
| Short description | *Responsive block controls: unlimited, theme-defined breakpoints for any block.* (78 chars, limit is 150) | Final |
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
`build/settings.js` — and translate.wordpress.org names them from this
repository's POT, which referenced `src/settings/App.js`. So JavaScript
translations would never have loaded in any locale, and the bundled Greek was
the only thing hiding it. D38.

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

- **The official readme validator** at
  `https://wordpress.org/plugins/developers/readme-validator/` has never been
  run against `readme.txt`. Plugin Check's own readme rules pass, which is close
  but is not the tool the handbook names. It is a paste-and-click, and worth
  doing while waiting — a fix there is `readme.txt` only and would travel in the
  next zip.
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

**c. Confirm the repository exists** once the hour is up. This needs no
credentials:

```bash
svn info https://plugins.svn.wordpress.org/spacery
```

A revision number means the repository is there. It does **not** prove your
commit access; nothing short of a commit does.

---

### Phase 2 — The two preflights worth the minutes

**a. The readme validator, which has never been run.** §3's *What has not been
checked* has listed it since the submission was written. Plugin Check's readme
rules pass, which is close but is not the tool the handbook names. Paste
`readme.txt` into `https://wordpress.org/plugins/developers/readme-validator/`.

Do it **now**, because a finding there is a `readme.txt`-only fix that travels
in this deploy, and afterwards it is a second release.

**b. A dry run of the deploy — recommended, and not currently possible.**
`deploy.sh` supports a `dry-run` input that does everything except the
`svn commit`: checkout, the `.distignore` rsync, `svn add`, the `tags/1.0.0`
copy, the mime-type propsets, and a final `svn status`. `release.yml` only
triggers on a tag, so there is no way to reach it today.

Given that the deploy step has never run and an SVN commit cannot be taken back,
adding a manual dry-run path is cheap:

```yaml
on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:

# ...and on the Deploy step:
        with:
          generate-zip: true
          dry-run: ${{ github.event_name == 'workflow_dispatch' }}
```

That keeps a tag push a real deploy and makes a manual run always a rehearsal.
The rehearsal proves the one thing this repository has never observed: what the
`.distignore` rsync actually puts in `trunk/`. It does not prove
authentication, because the credentials are only used by the commit.

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

**Expected `trunk/` contents — six entries, and nothing else:**

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

---

### Phase 6 — The first days

- **Search results take up to 72 hours** to include the plugin, and the profile
  page the same. Nothing is wrong before then.
- **Translations.** translate.wordpress.org builds its own originals by
  extracting strings from `trunk/`, and `trunk/` contains `build/` and not
  `src/` — which is exactly the naming the plugin now depends on (D38). The
  repository's Greek is not uploaded automatically: importing it needs editor
  rights for `el`, requested from the Polyglots team. Until then the strings are
  there for anyone to translate and the plugin is simply untranslated.
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
- **That `release.yml` works.** Its guard step was extracted and run; the deploy
  step's first run will be its first run.
