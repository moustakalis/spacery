# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

A version is dated on the day it is tagged, not the day it was written. Nothing here has
shipped yet: 1.0.0 is waiting on a WordPress.org review that begins when the zip is
submitted, and `release.yml` refuses a tag whose entry is still undated.

## [1.0.0] - Unreleased

### Added

- Repository scaffold: plugin bootstrap, PSR-4 autoloader, requirement guards.
- PHP toolchain: PHPCS (WordPress-Extra), PHPStan level 6.
- JS toolchain: `@wordpress/scripts`, TypeScript in strict mode.
- `wp-env` configuration targeting WordPress 7.1 on PHP 8.2.
- CI running lint, typecheck, build and Plugin Check.
- Breakpoint registry resolving theme.json, Spacery's preset or a custom set, with a
  `spacery_breakpoints` filter and a contract suite that checks the generated media
  queries against core's own `WP_Theme_JSON`.
- Style generation through the Style Engine: content-addressed class names, per-request
  dedupe, and a `render_block` filter that adds a class without touching saved markup.
- The `spacery/spacer` block, with a height per breakpoint.
- An editor that follows the canvas rather than the browser window, so the preview and the
  rendered page agree at every tier — with a tier selector in the panel for stepping
  through breakpoints without moving the preview.
- Padding and margin as four-sided boxes with a link toggle, matching the control core uses
  for its own spacing.
- Responsive padding and margin on **any** block declaring `supports.spacing`, core or
  third-party, with a `spacery_denied_blocks` filter for blocks a site wants left alone.
- A takeover flow for values WordPress 7.1 already sets responsively: Spacery surfaces
  them and moves them into the matching tier on request, but only when the two agree on
  the boundary.
- A settings screen on its own top-level admin menu for choosing where breakpoints come from, and
  for defining your own. Both options are registered with WordPress, so the REST API and
  WP-CLI get the same validation.
- The screen checks a set against the server's own rules as you type rather than after
  saving, says which set is in use and why when that is not the one you chose, draws it to
  scale, and warns before a navigation that would discard unsaved rows.
- Internationalisation: every string translatable, with a POT generated from the
  distributable so that a language pack from translate.wordpress.org loads in the editor
  as well as in PHP. Nothing is bundled. `bin/make-pot.sh` and `bin/make-translations.sh`
  regenerate the POT and the repository's Greek translation.
- Developer documentation for the filter API in `docs/FILTERS.md`.

[1.0.0]: https://github.com/moustakalis/spacery/releases/tag/v1.0.0
