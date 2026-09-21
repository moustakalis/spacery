# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

A version is dated on the day it is tagged, not the day it was written, and
`release.yml` refuses a tag whose entry is still undated.

## [1.0.2] - 2026-09-21

### Fixed

- **Security.** A hand-written `spacery` block attribute could raise an uncaught
  `TypeError` inside `render_block`, which is a fatal on every page rendering
  that block. A style value nested one level too deep -- `padding.top.x` --
  reaches the Style Engine as an object where a length belongs, and
  `Generator::force()` marked declarations through a closure typed `string`
  under `declare( strict_types=1 )`. Malformed declarations are dropped now, the
  way core's own `WP_Style_Engine_CSS_Declarations::add_declaration()` drops
  them and for the reason its comment gives. The inspector cannot produce the
  shape, so no author was affected by accident; anyone who can edit a post could
  produce it on purpose. `docs/security-audit.md` F1.
- Leaf values that are not strings no longer go around `Generator::is_value()`,
  the allowlist that decides what may reach a stylesheet: `{"top": 5}` was
  emitted as `padding-top:5`, which no browser applies and which the editor
  preview never drew.
- A value is emitted as it was judged. `is_value()` reads the trimmed value, so
  the trimmed value is what is stored -- whitespace was riding into the
  stylesheet on the strength of a check that had not seen it. Identical spacing
  written with different whitespace now shares one generated class.

### Added

- `docs/security-audit.md`: a full audit against the WordPress Security API,
  with what was measured rather than reasoned about, and what it was measured
  with.

## [1.0.1] - 2026-09-20

### Changed

- Directory listing: the readme title names what the plugin does, and the tags
  trade `block editor` for `gutenberg`. No code changed.

## [1.0.0] - 2026-09-19

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

[1.0.1]: https://github.com/moustakalis/spacery/releases/tag/v1.0.1
[1.0.0]: https://github.com/moustakalis/spacery/releases/tag/v1.0.0
