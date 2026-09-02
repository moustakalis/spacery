# M5a — `blockGap` spike

**Verdict: defer to 1.1, and revisit the goal rather than the implementation.**

Timeboxed at two days in `PLAN.md`. It took one pass through core, because the
first thing checked settled it. Everything below is from WordPress 7.1.0
source, cited by file and line; nothing here is from documentation.

## 1. Core already does responsive `blockGap`

This is the finding that reframes the spike. `wp_render_layout_support_flag()`
loops over `WP_Theme_JSON::get_viewport_media_queries()` and, for each viewport
the block sets, calls the same `wp_get_layout_style()` that produced the base
rules with `rules_group` set to that media query:

```php
// block-supports/layout.php:1253-1288
foreach ( $responsive_media_queries as $breakpoint => $media_query ) {
    $viewport_style         = $style_attr[ $breakpoint ] ?? null;
    $has_viewport_block_gap = isset( $viewport_style['spacing']['blockGap'] );
    ...
    $viewport_styles = wp_get_layout_style(
        ".$container_class", $used_layout, $has_block_gap_support,
        $viewport_gap_value, ..., array(
            'rules_group'            => $media_query,
            'viewport_overrides'     => $viewport_container_layout,
            'has_block_gap_override' => $has_viewport_block_gap,
        )
    );
}
```

The viewport gap is part of the container class hash too (`layout.php:1219-1224`),
so two blocks with different responsive gaps get different classes.

So "gap that changes at a breakpoint" is **not** a gap in core any more. What is
still missing is the same thing missing everywhere else: core does two tiers.

## 2. The plan's hypothesis was backwards

`PLAN.md` guessed that gap would be *easier* than padding, because core applies
it through `--wp--style--block-gap` — so a per-breakpoint override would be one
custom property inside a media query, with no `!important` and no specificity
fight.

That is not how it works. `layout.php` never emits `var(--wp--style--block-gap)`
at all — grep finds zero occurrences in the file — and `WP_Theme_JSON`'s own
changelog records that the property was **removed** (`class-wp-theme-json.php:242`).
The variable survives as a root custom property and as a fallback inside the
button-width `calc()` (`:3490`), not as the mechanism layout rules read.

A per-block gap is instead baked as literal values into rules whose *shape*
changes per layout type:

| Layout | What core emits | Where |
|---|---|---|
| `default` (flow) | `margin-block-start` on `> *` and `> * + *` | `layout.php:531-545` |
| `constrained` | the same, plus `max-width` rules | `layout.php:555-660` |
| `flex` | `gap` | `layout.php:769` |
| `grid` | `gap`, **and** `grid-template-columns` recomputed *from the gap value* | `layout.php:881-886`, `:912` |

That last row is the one that ends it. On a grid, changing the gap changes the
column track calculation:

```php
// layout.php:880
$max_value = 'max(min(' . $minimum_column_width . ', 100%), (100% - ('
    . $responsive_gap_value . ' * (' . $columnCount . ' - 1))) /' . $columnCount . ')';
```

There is no variable to set. To override a gap correctly Spacery would have to
reimplement `wp_get_layout_style()` — roughly 400 lines with a branch per layout
type, the grid column arithmetic above, and the `alignfull` negative-margin
handling that reads the block's own padding.

## 3. Spacery's class is on the wrong element anyway

Core puts layout rules on the **inner block wrapper**, which it locates
heuristically by tracking unclosed tags in the first `innerContent` chunk
(`layout.php:1360-1389`) — carrying core's own `@todo: Find a better way to
match the first inner block`. Spacery's `render_block` filter adds `.spy-…` to
the first tag in the rendered output, which is the outer wrapper. For
`core/group` these are often the same element. For blocks with a distinct inner
container they are not, so Spacery's selectors would not even match what core's
gap rules target.

## 4. The cheap escape hatch is closed

The tempting alternative was to stop generating parallel CSS and instead give
core more viewports — then core's own machinery, including this gap code, would
emit N tiers for free. It cannot be done: `get_viewport_media_queries()` does
not iterate the settings it is given, it reads two fixed keys.

```php
// class-wp-theme-json.php:725-737
if ( isset( $breakpoints['mobile'] ) ) { $q['@mobile'] = "@media (width <= {$breakpoints['mobile']})"; }
if ( isset( $breakpoints['tablet'] ) ) { $q['@tablet'] = ... }
```

`VALID_SETTINGS['viewport']` declares only `mobile` and `tablet`
(`:516-519`), and `sanitize_viewport_settings()` strips anything else on parse
(`:1459-1461`). Core's two tiers are structural, not data-driven.

This is worth stating plainly because it cuts both ways: it is why Spacery
cannot delegate, and it is why Spacery has a reason to exist.

## 5. Decision

Defer to 1.1. The exit criterion said "ship in 1.0 if clean, defer to 1.1 if it
fights the layout stylesheet" — it does not merely fight it, matching it means
duplicating it, and a duplicate of 400 lines of core layout logic would drift
the first time core touched it.

The extension already declines gap deliberately: `spacingFeatures()` reads only
`padding` and `margin`, with a unit test asserting a block declaring solely
`blockGap` is not extendable. That behaviour needs no change — it now has a
reason recorded behind it.

For 1.0, the honest answer to a user who wants responsive gap is that WordPress
does it natively at its own two breakpoints, through core's own controls. M6's
docs should say so rather than leaving people looking for it in Spacery.

## 6. If 1.1 revisits this

Two routes, neither cheap, in preference order:

1. **Upstream.** Make `get_viewport_media_queries()` iterate its settings
   instead of reading two fixed keys. That single change would give N-tier
   responsive styles to gap, layout, and everything else core already routes
   through it — and would make most of Spacery's generator redundant, which is
   the right outcome for the web even if not for the plugin.
2. **Reimplement per layout type**, scoped to `default`, `constrained` and
   `flex` only, explicitly refusing `grid` because of the column arithmetic.
   Contract-tested against core's real `wp_get_layout_style()` the way the
   media-query suite is tested today, so drift fails CI rather than a layout.
