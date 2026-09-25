# Spacery for theme authors

WordPress 7.1 lets a theme set two responsive breakpoints, `mobile` and `tablet`,
through `settings.viewport`. If your design has more tiers than that, you have
had to handle the rest in your own CSS. Spacery reads a breakpoint set from your
`theme.json` — up to twelve tiers — and gives every block that supports spacing
padding and margin per tier in the inspector, plus a spacer block whose height
can change at each one.

This page covers what to put in `theme.json`, how Spacery reads it, and what
your theme should still do when Spacery is not installed. Filters, options and
the REST route are in [`FILTERS.md`](FILTERS.md).

Every behaviour described here was checked by running Spacery's own
`Registry` against the example settings, not taken from the docstrings.

## The snippet

```json
{
  "version": 3,
  "settings": {
    "custom": {
      "spacery": {
        "breakpoints": {
          "desktop": "1280px",
          "laptop": "1024px",
          "tablet": "782px",
          "mobile": "480px"
        }
      }
    }
  }
}
```

That's all a theme needs to do. When Spacery is active and the site owner hasn't
picked a set on the Spacery screen, it follows this one, and those four tiers
appear in the inspector of every block that supports spacing.

Each width is an **upper bound**, the same as core's `settings.viewport`:
`tablet: 782px` means "screens up to 782px wide". Spacery emits disjoint bands
with the same shape as core's:

```css
@media (1024px < width <= 1280px)  /* desktop */
@media (782px < width <= 1024px)   /* laptop  */
@media (480px < width <= 782px)    /* tablet  */
@media (width <= 480px)            /* mobile  */
```

**Above the widest tier, the block's own value applies.** That's the value set
in core's Dimensions panel. In the set above, a 1440px screen gets it, so
make each base value at least as large as your widest tier's, or spacing
will grow as the screen narrows past it. A value set at one tier also applies to every narrower tier until
one of them sets its own.

## The rules a set has to follow

| | |
|---|---|
| Slugs | Lowercase letters, digits and hyphens: `[a-z0-9-]+` |
| Widths | A positive `px`, `em` or `rem` length. `em` and `rem` count as 16px when tiers are compared |
| Order | Any. Spacery sorts widest first |
| Size | At most 12 tiers |
| Uniqueness | No two slugs alike, and no two tiers at the same width, even across units (`800px` and `50rem` clash) |

**One bad tier rejects the whole set.** Spacery doesn't drop the one it can't
read and keep the rest, because a partly applied set is harder to diagnose than
none. The site falls back to Spacery's own preset, and the Spacery screen says
so: *"Your theme declares breakpoints Spacery could not read, so … is in use."*
If you ship a set and see that sentence, check it against the table above.

## Labels

The shorthand above labels each tier by title-casing its slug: `tablet-portrait`
becomes *Tablet Portrait*. To choose the wording, use the list form instead.
It can be mixed with any widths and written in any order:

```json
"breakpoints": [
  { "slug": "wide",   "label": "Wide screens", "max": "1440px" },
  { "slug": "tablet", "label": "Tablet",       "max": "782px" },
  { "slug": "phone",  "label": "Phone",        "max": "30rem" }
]
```

**Neither form is translated.** `settings.custom` isn't a translatable part of
`theme.json`, so whatever you write is what every locale sees. Spacery
translates tier names only when it supplies them itself: in its preset, and
when it reads your `settings.viewport`. Short labels that read well untranslated
are the safer choice.

## Which set wins

1. **The `spacery_breakpoints` filter**, if any code on the site uses it. It
   always has the last word.
2. **The site owner's choice** on the Spacery screen, once they have made one.
   Your set is offered there as *This theme*, next to Spacery's preset and a set
   they define themselves.
3. **Your theme**, by default, whenever it declares either
   `settings.custom.spacery.breakpoints` or `settings.viewport`. If it declares
   both, **`custom.spacery` wins**: it's the more specific statement.
4. **Spacery's preset** otherwise: Desktop 1280px, Laptop 1024px, Tablet 782px,
   Mobile 480px.

Sets are never blended. A site uses one of them whole.

If your theme declares only `settings.viewport`, Spacery follows those two
tiers and gives them its own translated labels. That's a fine starting point,
but it gives Spacery nothing that core doesn't already have. The point of the
`custom.spacery` key is the tiers core can't express.

## Keep core and Spacery at the same boundaries

WordPress 7.1's own responsive controls use `settings.viewport`, or core's
default 782px and 480px when the theme declares none. Spacery's `tablet` and
`mobile` should sit at **the same widths under the same slugs**. If you declare
both keys, make them agree:

```json
"settings": {
  "viewport": { "tablet": "782px", "mobile": "480px" },
  "custom": {
    "spacery": {
      "breakpoints": {
        "desktop": "1280px",
        "laptop": "1024px",
        "tablet": "782px",
        "mobile": "480px"
      }
    }
  }
}
```

Two things depend on it:

- **Adopting core's values.** When a block already has padding set through
  core's `@tablet` or `@mobile` controls, Spacery offers to move those values
  into its own matching tier. It makes that offer only when a Spacery tier has
  core's slug **and** core's width. Moving a value between tiers with different
  bounds would quietly change which screens it applies to.
- **Clean boundaries.** If your `settings.viewport` says `tablet: 800px` and
  your Spacery set says `tablet: 782px`, core's band is `500px < width <= 800px`
  and Spacery's is `480px < width <= 782px`. Both apply between 782px and 800px,
  and nobody designed that overlap.

## Child themes and style variations merge, and cannot remove

WordPress merges a child theme's `theme.json` over its parent's, and a style
variation over its theme, with `array_replace_recursive()`. Spacery reads the
merged result, so:

- **In the shorthand, a child can change a width or add a tier, but it can't
  remove one.** A parent with the four tiers above and a child declaring
  `{ "laptop": "1100px", "wide": "1600px" }` produce five tiers: the parent's
  four with laptop moved, plus `wide`.
- **In the list form, entries merge by position, not by slug.** A child's first
  entry overwrites the parent's first field by field, and any parent entries
  past the end of the child's list survive. A parent listing
  desktop/laptop/tablet/mobile and a child listing `wide` and `phone 480px`
  merge into `wide, phone, tablet, mobile`. Then `phone` and `mobile` are both
  480px, so the whole set is rejected and the site falls back to the preset.

If a parent theme declares a set, a child that wants a different one should
use the shorthand and keep the parent's slugs, or declare nothing and let the
parent's set stand.

## Slugs are forever; widths are not

A block stores its values **by slug**, in its own attribute:
`{"tablet": {"spacing": {"padding": {"top": "2rem"}}}}`. So:

- **Changing a width in a theme update is safe.** Every stored value moves with
  its tier to the new boundary.
- **Renaming a slug orphans every value stored under it.** The values stay in
  the post, but Spacery ignores slugs that aren't in the active set, so they
  stop applying. They come back if the slug ever does. Treat a slug like a
  database column name.
- **Prefer `desktop`, `laptop`, `tablet` and `mobile`** where they fit your
  design. Those are the preset's slugs, so a site that switches from your theme
  to the preset, or from another theme that uses them, keeps its values in
  tiers with the same names.

## Without Spacery

Spacery writes nothing into post markup. Its values live in the block comment
delimiter, so a site without the plugin renders your theme with each block's
base value and no Spacery tiers. That's the case to design for:

- **Make base values fluid.** A base value is all a visitor sees without the
  plugin, at every width. A fixed `9rem` that looks right on a desktop is
  144px of padding on a phone. A fluid preset such as Twenty Twenty-Five's
  `var:preset|spacing|80`, `clamp(70px, 10vw, 140px)`, scales without the
  plugin and still serves as the widest tier's value with it.
  [Spacery Starter](https://github.com/moustakalis/spacery-starter) is built
  this way, and its README lists every value and what was measured.
- **Recommend it; don't require it.** The `custom.spacery` key is inert when
  Spacery isn't active. A theme that declares it loses nothing without the
  plugin and gains four tiers with it.

## A side effect worth knowing

WordPress turns everything under `settings.custom` into CSS custom properties,
so the snippet above also gives you
`--wp--custom--spacery--breakpoints--tablet: 782px` and its siblings. They're
readable from your own CSS, but CSS doesn't allow custom properties inside a
`@media` condition, so they can't stand in for the breakpoints themselves.

## Checking what Spacery sees

- **The Spacery screen** (its own admin menu entry) names your tiers in its
  source list, *This theme — Desktop (1280px), Laptop (1024px), Tablet (782px)
  and 1 more*, and draws the
  set in use as a ruler. If your set couldn't be read, the entry says the theme
  declares none, and a notice above the ruler says which set is in use instead.
- **`GET /spacery/v1/breakpoints`** returns every source's set and the one in
  use. It needs `manage_options`.
