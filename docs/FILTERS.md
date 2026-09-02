# Developer reference

Everything Spacery exposes on purpose. Anything not listed here is internal and
may change between releases without a note.

## Filters

### `spacery_breakpoints`

Replaces the active breakpoint set, whichever source produced it. This runs
last, so it always has the final word.

```php
add_filter(
    'spacery_breakpoints',
    function ( Spacery\Breakpoints\BreakpointSet $set, string $source ) {
        if ( 'theme' !== $source ) {
            return $set;
        }

        return Spacery\Breakpoints\BreakpointSet::from_array(
            array(
                'wide'   => '1600px',
                'laptop' => '1024px',
                'mobile' => '480px',
            )
        ) ?? $set;
    },
    10,
    2
);
```

`from_array()` returns `null` for a set it cannot use, and returning anything
that is not a `BreakpointSet` leaves the resolved set untouched — so the `?? $set`
above is the whole error handling this needs. It accepts either a `slug => max`
map, as here, or a list of `array( 'slug' => …, 'label' => …, 'max' => … )`.

Breakpoints are **upper bounds**, matching WordPress. `mobile => 480px` means
"screens up to 480px wide". Widths may be `px`, `em` or `rem`; two breakpoints
may not share a width, and a set may hold at most 12.

### `spacery_denied_blocks`

Blocks Spacery leaves alone. Denying a block removes the attribute, the
inspector panel *and* the generated CSS, so it is genuinely uninvolved rather
than merely hidden.

```php
add_filter(
    'spacery_denied_blocks',
    fn ( array $denied ) => array( ...$denied, 'acme/hero' )
);
```

Values already stored on a denied block are left in the content untouched, so
re-allowing the block restores its spacing exactly as it was.

## Actions

### `spacery_booted`

Fires once Spacery has wired itself up, with the plugin instance.

```php
add_action( 'spacery_booted', function ( Spacery\Plugin $plugin ) {
    $set = $plugin->breakpoints()->resolve();
} );
```

## theme.json

A theme can hand Spacery a set directly:

```json
{
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

Without that, Spacery reads WordPress's own `settings.viewport` (`mobile` and
`tablet`). Either one makes the theme the default source, so a site agrees with
core out of the box and adopting Spacery's wider tiers stays a deliberate act.

## Options

| Option | Value |
|---|---|
| `spacery_breakpoint_source` | `''`, `theme`, `spacery` or `custom`. Empty means "not chosen": the theme is followed when it has an opinion, and Spacery's preset otherwise. |
| `spacery_custom_breakpoints` | A list of `{slug, label, max}`, stored widest-first. |

Both are registered with `register_setting()`, so they are readable and
writable through `/wp/v2/settings` and `wp option`, with the same validation the
settings screen gets. An invalid set is refused whole rather than partly
applied.

## REST

`GET /spacery/v1/breakpoints` — what each source contains and which is in
effect. Read-only, and requires `manage_options`. It exists because the settings
screen has to show what a source *would* give you; writes go through
`/wp/v2/settings`.

## The `spacery` block attribute

Spacery stores an object keyed by breakpoint slug, each value shaped exactly
like core's own `style` attribute:

```json
{
  "spacery": {
    "tablet": { "spacing": { "padding": { "top": "2rem" } } },
    "mobile": { "dimensions": { "height": "32px" } }
  }
}
```

Two things follow from that shape. Each tier can be handed straight to the Style
Engine, so supporting a new property needs no new structure. And nothing is
written into saved markup — the attribute lives in the block comment delimiter,
so deactivating Spacery leaves every post valid.

Values are **desktop-first**: a value set at `tablet` also applies to everything
narrower, unless a narrower tier sets its own. The generated CSS expresses that
as disjoint bands identical in shape to core's, so a Spacery rule and a core
rule are directly comparable rather than partly overlapping.

## What Spacery does not do

**Responsive `blockGap`.** WordPress 7.1 does this itself, at its own two
breakpoints, through core's own controls. Spacery does not duplicate it: gap is
not a declaration on the wrapper but a set of rules on the layout container
whose shape differs per layout type, and on a grid the gap value feeds the
column-track calculation. See [`blockgap-spike.md`](blockgap-spike.md).
