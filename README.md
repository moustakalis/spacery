# Spacery

Responsive spacing for the WordPress block editor — unlimited, theme-defined breakpoints
for any block.

> **Status: pre-release.** M0 (foundations) is in place. See
> [`docs/PLAN.md`](docs/PLAN.md) for the architecture and roadmap.

## Why

WordPress 7.1 shipped responsive block styles: a `@mobile` and `@tablet` key on any block
using core block supports, with breakpoints set through `settings.viewport` in
`theme.json`. It is a real improvement, and it stops at two breakpoints.

Spacery covers what it leaves open:

- **N breakpoints, not two.** Core's `settings.viewport` accepts exactly `mobile` and
  `tablet`, global-only. A design system with five tiers cannot be expressed.
- **Mobile-first.** Core cascades desktop-down with `max-width` queries. Spacery cascades
  mobile-up with `min-width`, matching how most design systems are written.
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
composer run lint       # PHPCS, WordPress-Extra
composer run analyse    # PHPStan level 6
```

CI runs all of the above plus
[Plugin Check](https://github.com/WordPress/plugin-check-action) on every push and pull
request.

### Notes on the toolchain

- **No bundled `vendor/`.** Spacery has no runtime PHP dependencies. Composer is a
  development tool here; classes load through a small PSR-4 autoloader in
  `includes/Autoloader.php`.
- **No webpack config.** `wp-scripts build` scans `src/` for `block.json` files and uses
  the scripts they declare as entry points.
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
includes/                PHP, PSR-4 under the Spacery\ namespace
src/                     TypeScript and blocks
tests/{php,unit,e2e}     PHPUnit, Vitest, Playwright
docs/PLAN.md             Architecture and roadmap
```

## License

GPL-2.0-or-later. See [LICENSE](LICENSE).
