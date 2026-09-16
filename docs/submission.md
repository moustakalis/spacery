# Submitting Spacery to WordPress.org — the runbook

> **Where this stands: ready, not yet uploaded.** Record the date and the
> commit here the moment it is — this line is the one place that says whether
> the plugin is in the queue, and everything below reads differently depending
> on the answer.
>
> **Submitted on:** _not yet._
>
> **If you are picking this up cold, go to the row that matches:**
>
> | If | Go to |
> |---|---|
> | Not submitted yet | **§1**, then **§2**. The two live pre-flight items are the slug and the repository's visibility — see below. |
> | Uploaded; still in the queue | Nowhere. Review takes up to **14 business days** and the reviewer reads the uploaded zip. Don't change it, don't re-submit, don't tag. |
> | A reviewer has written back | **§3** — ready replies for the three things a code scan raises, and the rule about replying in the same thread rather than re-submitting |
> | Approved; SVN credentials have arrived | **§4** — date the changelog, add the secrets, tag, check the listing |
> | Something about the plugin itself needs changing | `docs/PLAN.md`'s decision table first. Then check the line above: before upload a fix simply goes in the next zip; after it, the zip is frozen and the fix ships in the deploy. |
>
> **Two answers settled on 16 September**, so nobody re-asks: the WordPress.org
> account is **`nikosmoustakas`**, which is what `readme.txt`'s `Contributors`
> line grants the listing to; and `github.com/moustakalis/spacery` is
> **public** — which is what makes `readme.txt`'s `== Source Code ==` section
> satisfy guideline 4, so **confirm it still is before uploading**: a 404 there
> is a review round-trip.

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
- Latest WordPress is **7.1** (19 August 2026), so `Tested up to: 7.1` is
  current. 7.1.1 is scheduled but not out. If it ships before you upload, bump
  that line and rebuild; after upload it is in the frozen zip and the change
  goes out with the deploy instead.

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

---

> Spacery adds responsive block controls to the WordPress block editor: a padding
> and margin value per breakpoint on any block that supports spacing, plus one new
> block, Responsive Spacer, whose height can differ at each breakpoint.
>
> WordPress 7.1's own responsive block styles offer two theme-defined breakpoints,
> mobile and tablet. Spacery extends that to as many tiers as a design system
> needs, using the same desktop-first model and the same disjoint media-query
> shapes as core, so the two never disagree at a boundary. Breakpoints come from
> one source at a time, chosen on the plugin's settings screen: the theme's
> `settings.custom.spacery.breakpoints` or `settings.viewport`, Spacery's own
> four-tier preset, or a set the site defines itself.
>
> Values are stored as block attributes. Nothing is written into saved post
> content: a `render_block` filter adds a class at output time, and the CSS itself
> is generated by WordPress's own Style Engine
> (`wp_style_engine_get_styles()` and `wp_style_engine_get_stylesheet_from_css_rules()`).
> Deactivating the plugin leaves every post valid.
>
> Notes for review, covering what a scan of the code will raise:
>
> 1. GPL-2.0-or-later throughout. No bundled third-party libraries and no runtime
>    dependencies — `composer.json` requires only PHP, and nothing from
>    `node_modules` ships.
>
> 2. No external requests of any kind. No remote servers, no telemetry, no
>    analytics, no fonts or assets from a CDN. The only network call anywhere in
>    the plugin is `apiFetch` to the site's own REST API from the settings screen.
>    There is no advertising, no upsell and no pro version.
>
> 3. The compiled JavaScript and CSS in `build/` are built from `src/` in the
>    public repository at https://github.com/moustakalis/spacery — with Node.js 22
>    or newer, `pnpm install && pnpm run build` rebuilds it. The build is
>    `@wordpress/scripts` (webpack, Babel, TypeScript, Sass) and nothing else.
>    `readme.txt` says the same under "Source Code".
>
> 4. `includes/Settings/Screen.php` calls `base64_encode()` once. It is not
>    obfuscation: `add_menu_page()` accepts an SVG menu icon only as a data URI,
>    so the icon's plain SVG markup is a readable constant a few lines above and
>    is encoded at call time rather than pasted in pre-encoded.
>
> 5. `includes/I18n.php` calls `load_plugin_textdomain()`, which Plugin Check
>    reports as discouraged since 4.6. It is there to register the plugin's own
>    `/languages` path so the bundled Greek translation is found. Once
>    translate.wordpress.org generates a language pack, the bundled files and this
>    call both go.
>
> Stored data: two registered options, `spacery_breakpoint_source` and
> `spacery_custom_breakpoints`. `uninstall.php` removes them only if the site
> ticked a checkbox on the settings screen that is off by default, because the
> breakpoints are what every stored block value is measured against and deleting
> them silently changes what those values mean. The settings screen and the REST
> route are both `manage_options`.

---

That is the whole of what you write. Do not paste the readme into that box; the
reviewer reads `readme.txt` from the zip.

---

## 3. If the review comes back

Reply in the same email thread, to `plugins@wordpress.org`, and **do not
re-submit through the form** — a second submission makes a second ticket. If a
change is needed, make it, reply with what changed, and attach or link the
updated zip when they ask for one.

Three replies worth having ready, because they are the three things most likely
to be raised. Each states the fact and offers the change rather than arguing.

### If they ask about `base64_encode()`

> It is not obfuscation, and nothing is hidden behind it. `add_menu_page()` takes
> a menu icon either as a dashicon name or as a data URI; an SVG can only be
> passed the second way. The icon's markup is a plain, readable `ICON_SVG`
> constant in `includes/Settings/Screen.php` directly above the call, and it is
> encoded at call time precisely so that the source stays reviewable rather than
> carrying a pre-encoded blob. The docblock above it says so. I am happy to swap
> it for a dashicon if you would prefer the call gone entirely.

### If they ask about the compiled JavaScript

> The uncompiled sources are `src/` in the public repository at
> https://github.com/moustakalis/spacery, and `readme.txt` links to it under
> "Source Code" with the build steps. With Node.js 22 or newer,
> `pnpm install && pnpm run build` rebuilds `build/`; the toolchain is
> `@wordpress/scripts` and nothing else, and no third-party library is bundled.
> If you would rather review the sources in place, I can add `src/` to the zip
> and resubmit.

### If they ask about `load_plugin_textdomain()`

> It registers the plugin's own `/languages` path in `WP_Textdomain_Registry`, so
> the bundled Greek `.mo` is found; without it the block titles, the admin menu
> and every PHP string stay untranslated until a language pack exists. The call
> exists only because the bundled files do. Once the plugin is in the directory
> and translate.wordpress.org generates a pack, I will remove both in a 1.0.x
> release. If you would prefer it gone before approval, I can drop the bundled
> translation now and ship the POT alone.

### If they ask anything about data or privacy

> Spacery contacts nothing outside the site — no remote servers, no telemetry, no
> analytics, no external assets. It stores two options,
> `spacery_breakpoint_source` and `spacery_custom_breakpoints`, and per-block
> values as block attributes. It collects no personal data of any kind, so there
> is nothing to disclose in a privacy policy.

---

## 4. After approval

The SVN repository arrives with the approval email. In order:

**a. Date the changelog.** `CHANGELOG.md`'s heading is
`## [1.0.0] - Unreleased` and `release.yml` refuses a tag while it says that.
Replace it with the day you tag:

```
## [1.0.0] - YYYY-MM-DD
```

**b. Add the repository secrets** `SVN_USERNAME` and `SVN_PASSWORD` from the
approval email.

**c. Tag.** `git tag v1.0.0 && git push --tags` — `release.yml` populates
`trunk/` and `assets/` through `10up/action-wordpress-plugin-deploy`. This is
the first time that workflow has ever run; its guard step has been tested
standalone, the deploy step has not.

**d. The assets go with it.** `assets/` already holds
`icon-128x128.png`, `icon-256x256.png`, `banner-772x250.png`,
`banner-1544x500.png` and `screenshot-1.png` … `screenshot-3.png`. The
`== Screenshots ==` block in `readme.txt` matches them **by position**; do not
reorder the files.

**e. Check the listing** once it is live: the three screenshots render with the
right captions under them, the banner is not cropped oddly at either size, and
the Description reads as intended.

### The one text 1.0.0 does not have, and the next release will want

`readme.txt` has no `== Upgrade Notice ==` section, and does not need one for a
first release. Add it at the first update that matters to an existing user — it
is what shows in the update nag, so it is one short sentence, under 300
characters, about why to update rather than what changed:

```
== Upgrade Notice ==

= 1.0.1 =
Fixes <the thing>. Existing breakpoints and block values are untouched.
```

---

## 5. What this document deliberately does not claim

- **That the build is byte-reproducible.** `pnpm run build` rebuilds `build/`;
  whether webpack emits identical bytes on another machine has not been tested,
  so no text here says "exactly".
- **That the slug is free.** It was on 15 September. It is permanent, so it gets
  re-checked at the keyboard, not quoted from a document.
- **That `release.yml` works.** Its guard step was extracted and run; the deploy
  step's first run will be its first run.
