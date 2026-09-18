# Spacery

Responsive block controls for the WordPress block editor — unlimited, theme-defined
breakpoints for any block.

> **Status: 1.0.0, submitted to WordPress.org on 16 September 2026 and awaiting
> review.** The zip carries the shipping files as of `22ff7c9`; every commit
> since touches `docs/` or this file, neither of which is in
> `package.json#files`.
>
> Review is *"within 14 business days"* — on or about **6 October 2026**. Until
> it returns the uploaded zip is frozen: a fix lands here and ships in the
> deploy, not in the review.
>
> **Picking this up cold?** Read in this order:
>
> 1. [`docs/submission.md`](docs/submission.md) — the runbook for right now:
>    what to check before the form, the overview to paste into it, ready replies
>    if the reviewer writes back, and the steps that follow approval (date the
>    changelog, add the SVN secrets, tag).
> 2. [`docs/PLAN.md`](docs/PLAN.md) — the architecture, and a numbered decision
>    table (D1–D37) giving the reasoning behind each choice. Read the decision
>    before reopening the question; several rows record a rule that was
>    corrected once already and say why.
> 3. [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) — the pre-push checklist,
>    which exists because the same mistakes recurred.
> 4. [`docs/FILTERS.md`](docs/FILTERS.md) — the developer API.
>
> Screenshots, banners and icons live in `assets/` and are published to SVN
> **separately from the zip**, so they can change during the queue without
> touching what is under review.

## Why

WordPress 7.1 shipped responsive block styles: a `@mobile` and `@tablet` key on any block
using core block supports, with breakpoints set through `settings.viewport` in
`theme.json`. It is a real improvement, and it stops at two breakpoints.

Spacery covers what it leaves open:

- **N breakpoints, not two.** Core's `settings.viewport` accepts exactly `mobile` and
  `tablet`, global-only. A design system with five tiers cannot be expressed.
- **Breakpoints from your theme.** Spacery reads `settings.viewport` or a theme's own
  `settings.custom.spacery.breakpoints`, so the editor offers the breakpoints your CSS
  already uses.
- **Same direction as core.** Desktop-first `max-width` tiers, matching WordPress exactly,
  so the two systems never disagree about what a breakpoint means.
- **A responsive spacer.** `core/spacer` stores `height` as a plain attribute rather than
  `style.dimensions.height`, so responsive styles do not reach it. It has been an open
  request since [2018](https://github.com/WordPress/gutenberg/issues/10081).

## Requirements

| | |
|---|---|
| WordPress | 7.1+ |
| PHP | 8.2+ |
| Node | 22+ |

## Development

```bash
pnpm install
composer install

pnpm run env:start      # WordPress 7.1 on PHP 8.2 via wp-env
pnpm run start          # watch and rebuild
```

### Checks

```bash
pnpm run typecheck      # tsc --noEmit
pnpm run lint:js
pnpm run test:unit      # Vitest
composer run lint       # PHPCS, WordPress-Extra
composer run analyse    # PHPStan level 6
composer run test       # PHPUnit
```

### Translations

```bash
pnpm run i18n:pot       # languages/spacery.pot
pnpm run i18n:build     # .mo and per-handle .json from every .po
```

Both need [WP-CLI](https://wp-cli.org/); set `WP_CLI` to a `wp-cli.phar` if it
is not on your `PATH`. `i18n:pot` transpiles the TypeScript before extracting,
because `wp i18n make-pot` cannot read it and skips every string in the editor
and the settings screen without saying so.

CI runs all of the above plus
[Plugin Check](https://github.com/WordPress/plugin-check-action) on every push and pull
request.

### Notes on the toolchain

- **No bundled `vendor/`.** Spacery has no runtime PHP dependencies. Composer is a
  development tool here; classes load through a small PSR-4 autoloader in
  `includes/Autoloader.php`.
- **A minimal webpack config.** `wp-scripts build` scans `src/` for `block.json` files and
  uses the scripts they declare as entry points — but that scan returns early once it
  finds one, so the `src/index.*` fallback never runs here. `webpack.config.js` exists
  only to name the two bundles that are not blocks: the editor extension and the settings
  screen. Adding a block still needs no change to it.
- **`node-linker=hoisted`** in `.npmrc`, because `@wordpress/scripts` assumes a hoisted
  `node_modules` when resolving its peer dependencies.
- **PSR-4 over WordPress file naming.** `WordPress.Files.FileName` is the one
  WordPress-Extra rule this project disables; see `phpcs.xml.dist`.
- **TypeScript is pinned to 6.x deliberately.** TypeScript 7 is released, but
  `typescript-eslint` declares a peer range of `>=4.8.4 <6.1.0`, so linting breaks on 7.x.
  Revisit when that range widens.

## Layout

```
spacery.php              Plugin header and boot
assets/                  WordPress.org icon and banner (see docs/assets.md)
includes/                PHP, PSR-4 under the Spacery\ namespace
src/                     TypeScript: the block, the editor extension, the settings screen
languages/               POT, and translations
bin/                     Toolchain scripts (core fetch, POT, translation build)
tests/{php,unit,e2e,contract}
docs/PLAN.md             Architecture and roadmap
docs/CONTRIBUTING.md     What to run before pushing, and the traps behind each check
docs/FILTERS.md          Developer API
docs/blockgap-spike.md   Why responsive blockGap is core's job, not Spacery's
docs/asset-brief.md      Handoff for the WordPress.org icon, banner and screenshots
```

## License

GPL-2.0-or-later. See [LICENSE](LICENSE).
