# Spacery admin design system

The machine-readable companion to `design/design-system.png`. Same system; this
one can be read, searched and diffed. Where the two disagree, this file wins.

Not a new visual language. Spacery's admin is WordPress's admin — every value
here except the brand palette is one WordPress already uses.

---

## 0 · What is prescriptive

| | Status |
| --- | --- |
| Colour **roles** (which job each value does) | prescriptive |
| Colour **values** | reference only — sampled from one install |
| Type scale | prescriptive |
| Spacing, edges, depth | prescriptive |
| Borrowed component metrics (heights, focus rings, button padding) | descriptive only — `@wordpress/components` owns them |
| Section 5 (Spacery's own components) | prescriptive |
| Brand palette (§6) | prescriptive — Spacery's own, not the host's |

Do not hand-set a borrowed component's height to match this document. It will
break when WordPress changes it.

---

## 1 · Colour

Sampled from a capture of the live install, which runs the **modern** admin
scheme. A site on another scheme renders different values — **read them from the
admin's CSS variables, do not hard-code these.**

### Ink

| Value | Role |
| --- | --- |
| `#1e1e1e` | Headings, body copy, field values |
| `#545454` | 11px caps column labels — 7.0:1 on `#f6f6f6` |
| `#646464` | Help text, meta — 5.2:1 on `#f0f0f0` |
| `#757575` | **Icons and borders only.** 4.2:1 on white, 3.9:1 on the ground — fails 4.5:1 at every size. Never text. |
| `#8d8d8d` | Input borders, placeholders |

More contrast for smaller type, not less. The install uses `#757575` widely
because much of it carries icons; sentences step up the ramp.

### Surfaces

| Value | Role |
| --- | --- |
| `#ffffff` | Cards |
| `#f6f6f6` | Table head, inline notes |
| `#f0f0f0` | Page ground |
| `#d8d8d8` | Card border |
| `#e5e5e5` | Divider |
| `#f0f0f0` | Row rule (inside cards) |

### Accent and status

| Value | Role |
| --- | --- |
| `#3858e9` | Primary button, links, selected radio, focus, menu highlight |
| `#d63638` / `#b32d2e` / `#fcf0f1` | Error: border / text / row tint |
| `#dba617` / `#8a6616` / `#fcf9e8` | Caution: border / text / row tint |
| `#8ea0f4` | Note rule (the 4px left border on inline notes) |

**One scheme drives everything.** The menu highlight, the primary button, the
selected radio and the link colour are the same value in WordPress — never
different. Status colours come in threes; never set status text in the border
colour (`#d63638` at 12px fails contrast, `#b32d2e` passes).

---

## 2 · Type

One family: the system stack WordPress already loads. No webfont — a settings
screen that pulls a font is a settings screen that flashes.

| Size / line / weight | Role |
| --- | --- |
| 23px / 1.3 / 400 | Page title |
| 14px / 1.4 / 600 | Card heading |
| 13px / 1.5 / 400 | Body copy, field values |
| 12px / 1.6 / 400 | Help text, meta, band labels |
| 11px / 600 / .04em caps | Column labels — `#545454` |

11px is the floor and is reserved for caps column labels, where the letterforms
are wide. Nothing smaller; no 11px sentence copy.

**One exception, in the inspector only: the four side labels are 10px caps.**
Not a second scale — every other size on that panel is the one above. The
inspector is 280px and the panel 248px, so four fields across it are **59px
each**, where core's own Dimensions panel spends the same width on a single
Vertical/Horizontal pair at the identical 11px. `TOP` / `RIGHT` / `BOTTOM` /
`LEFT` are three to six letters under a 59px field: the place the floor buys
least and costs most. Measured, and the margin is the argument — at 11px
`BOTTOM` renders **49px in a 49px box**, flush to the edge with nothing spare;
at 10px it is 45px. The floor holds everywhere else, including the `PADDING`
and `MARGIN` headings directly above these labels.

**It does not fix Greek, and that is recorded rather than papered over.**
`ΑΡΙΣΤΕΡΑ` (Left) measures 55px at 11px and 50px at 10px in the same 49px box,
so it is clipped either way — the change narrows the overflow from 6px to 1px
and no further. Fixing it is a layout question (fewer labels, or abbreviated
ones), not a type one.

---

## 3 · Space, edges, depth

Measured on the built screen, not taken from the proposal. Three of these were
wrong in this document until the spacing audit checked them one at a time — the
numbers below are what renders.

| Spacing | Value | |
| --- | --- | --- |
| Card padding | **16px / 24px** | `CardBody`'s own; borrowed, so descriptive (§4) |
| Card header | **16px / 24px** | `CardHeader`'s own, and the same as the body |
| Table head | **8px** | Spacery's |
| Table row | **12px / 8px** | Spacery's. The 8px inset keeps a tinted row's fields off its edge |
| Table footer | **16px above, 8px inset** | Clears the closing rule and joins the columns |
| Column gap | 12px | |
| Between cards | 20px | |

A 4px grid, and these are the values in use. Reach for one before inventing
another.

**Every card is symmetric 16px top and bottom inside its body, and every card's
content starts on one left edge** — the audit checked all five and found no
exception. The table is the only thing that sits 8px inside that edge, and its
head, rows and footer all do so together.

| Edge / depth | Value |
| --- | --- |
| Radius | **2px, everywhere** |
| Card border | 1px `#d8d8d8` |
| Divider | 1px `#e5e5e5` |
| Row rule | 1px `#f0f0f0` |
| Card shadow | `0 1px 1px rgba(0,0,0,.04)` |
| Sticky bar | `0 -1px 3px rgba(0,0,0,.06)` |

Three weights of rule, meaning three different things: card boundary, section
division, row separation. Depth is almost absent — only the sticky bar lifts,
because it overlaps content.

**Motion is rarer still: there is exactly one.** In the inspector's `css` mode
the focused field grows, 150ms `ease-out`, because four 59px fields cannot show
`calc(100% - 2rem)` and widening all four for the one being typed in is worse.
Nothing else in this plugin moves, and the bar for a second is the same: motion
buys room or it does not ship. Anything animated gives its tween up under
`prefers-reduced-motion: reduce` while keeping its end state — the width is the
point, the animation is not.

---

## 4 · Borrowed components

From `@wordpress/components`, not restyled. The specification is which
component with which props.

| Component | How Spacery uses it |
| --- | --- |
| `Card` / `CardHeader` / `CardBody` | One card per concern. Header holds an `h2` and optionally one line of right-aligned meta. |
| `RadioControl` | Always `label` + `hideLabelFromVision` — the card heading is not the group's accessible name (finding S5). Option labels say what choosing them *gets you*. |
| `TextControl` / `UnitControl` | In tables, labels move to the column header and `help` is dropped. Set every bridge prop (`__next40pxDefaultSize`, `__nextHasNoMarginBottom`) and one `size` for the whole row (finding 7). |
| `Button` | `primary` for Save only, one per screen. `secondary` for Add breakpoint. `tertiary` for Discard. Row removal is an `icon` button with a `label` naming its target. |
| `Notice` | Save outcomes only, at the top. Per-field problems never use a Notice — they belong on the field (§5.2). |

---

## 5 · Spacery's own components

Prescriptive. No WordPress equivalent exists.

### 5.1 Band ruler

Shows the resolved breakpoint set as ranges on one axis.

Ramp runs narrow → wide, dark → light: `#142269`, `#1f3399`, `#2c46c9`,
`#3858e9`. With more tiers, interpolate within those bounds — **never lighter
than `#3858e9`**, which is 5.6:1 against white and the lightest step holding the
4.5:1 floor for 12px white labels.

- Segments separated by a 2px white **border drawn inside the band**
  (`border-box`), never a flex `gap`. A gap is added to the row on top of the
  bands' widths: four of them made the strip 100% + 8px, flex shrank every band
  to fit, and each boundary landed 1–3px left of the width it names. A ruler
  whose bands are not proportional is not a ruler.
- **The tick mark sits on the boundary; the label centres under the mark.** The
  tick's box is zero-width, so neither can be displaced by the length of its own
  text. Centring the whole group instead puts the mark half a label-width early
  — measured at 16.8px on a `480px` tick and 19.2px on `1280px`, which reads as
  the coloured bar being bigger than the number naming it.
- Uncovered region is hatched, never coloured, labelled `no tier`.
- Positions are pixel-derived (em/rem × 16); labels keep the author's units.
- Axis maximum is widest × 1.15, **clamped at 2560px**; beyond that draws as a
  broken edge labelled with its real value. (A real capture had `11920px` — a
  typo for 1920 that passes every server rule and would take 89% of a linear
  axis.)
- Height 40–46px. Below 40 the labels crowd; above 46 it reads as a chart.

### 5.2 Breakpoint row

Five columns: name, slug, bound, covers, remove.

- Column labels appear **once**, in the header. Per-row `help` is forbidden — N
  rows repeat it N times.
- A problem is stated on the field that caused it and **names the other row
  involved**. Never a generic rule recital.
- The row fill tints only for an error; a caution leaves the fill alone and
  marks the single field.
- `Covers` is derived, never editable, and turns `#b32d2e` when the row covers
  nothing.

### 5.3 Sticky save bar

Three states, and the message always says *why* the button is as it is:

| Button | Message |
| --- | --- |
| `#3858e9` primary | `Unsaved changes to 2 breakpoints.` |
| `#a7aaad` disabled | `Fix 3 problems above to save.` |
| outlined disabled | `No changes to save.` |

Invalid outranks dirty: if both, show the problem count. A disabled Save with
no explanation is the defect this replaces.

### 5.4 Empty state

Names the **consequence** of the emptiness, not just the emptiness:

> You haven't defined any breakpoints yet
> Until you add one, Spacery falls back to its own set, which is what **In use
> now** is showing below.

A lone *Add* button leaves the author guessing what is running meanwhile.

### 5.5 Brand placement

Twice per screen, both at interface scale.

- **Header lockup** — the mark at 20px in a 32px tile, `#201E3E`→`#141327`
  gradient, 7px radius (the directory icon's own 28/128 corner), beside the
  `h1`, version as a bordered tag. The tile is the page's only dark surface, so
  the accent sits on the ground it was drawn for.
- **Footer** — the mark at 18px, flat `#646464`, no tile, no opacity, above
  one rule, version repeated, links to documentation and support. One flat tone:
  at that size a second value reads as blur, not depth.

No banner, no coloured header strip, no mark behind the cards, nothing on
screens Spacery does not own. WordPress's admin belongs to the site owner — a
plugin signs its own page and stops. The menu icon is a third instance, but that
slot is WordPress's and every plugin fills it.

### 5.6 Editor marks (block inspector, not the admin screen)

| Mark | Spec |
| --- | --- |
| Panel dot | 6px, `#3858e9`, via `PanelBody`'s `icon` prop. Gate on tiers that still exist. Mirror in the accessible name. |
| Tier dots | 5px, top-right of the glyph. **Both** selector branches — icons and labels. |
| Provenance | One line per box, 12px muted. Omit when nothing is inherited rather than naming a source that does not exist. |
| Side labels | 10px caps — §2's one exception, and the only rule in `extension/style.scss`. Needs `!important` against the emotion class. |
| Number fields | `spinControls="native"`. Core's `custom` renders a 60px suffix, which leaves 12px of a 59px field. `min={0}` on padding only: margin may be negative, padding may not. |
| Focused field in `css` mode | Grows to `flex-grow: 2.7` — 112px against three of 41px — over 150ms. Elementor's own proportion for the same gesture. `BOTTOM` clips to its ellipsis at 41px while a sibling is focused, which is accepted and reverts on blur. |
| Custom mode | The `css` entry **inside** the unit picker — not the word `custom`, which sized the `<select>` to its own label (72px against 56px), and not a toggle beside it, which left the picker asserting a unit the fields were not in. Three characters, like `rem`. |

---

## 6 · The mark

| | Value |
| --- | --- |
| Tile ground | `#201E3E` → `#141327`, vertical |
| Accent bars | `#8B7CFF` |
| Frame | `#ffffff` |
| Tile radius | 7px at 32px |

**One mark, every size.** `brand/mark.svg` is the only geometry. Draw every
instance from it — directory icon, banner, page header, footer, admin menu.

Geometry on a 77-unit grid:

| Element | x | y | w | h | rx |
| --- | --- | --- | --- | --- | --- |
| Top bar 1 | 18 | 0 | 41 | 8 | 4 |
| Top bar 2 | 18 | 19 | 41 | 6 | 3 |
| Top bar 3 | 18 | 36 | 41 | 4 | 2 |
| Bottom side | 18 | 69 | 41 | 8 | 4 |
| Left side | 0 | 18 | 8 | 41 | 4 |
| Right side | 69 | 18 | 8 | 41 | 4 |

The top side repeats at **8 / 6 / 4** thickness — three bars, always. The
graduated step is the argument for the mark: the spacing value thins toward
mobile. Never reduce the count.

The thinnest bar is 4/77 of the box, so the box size decides whether it holds:
1.04px at 20px (a hairline), **1.25px at 24px**. The admin menu icon therefore
uses a **24px box**, not the 20px WordPress uses for dashicons — WordPress
scales the SVG to the slot, so the larger box costs nothing.

Never thicken the bar or drop it to compensate. A logo that changes its own
count stops being one logo; change the box, not the geometry.

Menu icons must be single-colour `fill="currentColor"`; WordPress masks them to
the active scheme. The mark survives that because its bars differ by
**thickness, not hue**.

---

## 7 · Rules

### Words

Derived from the strings that already worked here rather than imposed on them.
`validate.ts` was the model: every message names the field, names the other row
involved, and stops.

1. **Lead with the consequence to the site.** "Nothing — no screens left" is
   the consequence; "slugs must be unique" is a recital of the rule that
   produces it. Where the consequence is already on screen beside the message,
   the message does not repeat it: a duplicate width says only "Same width as
   Laptop", because the `Covers` cell one column over already reads "Nothing".
2. **One sentence, unless a second adds a *fact*.** A second sentence that
   explains why Spacery is built this way belongs in `PLAN.md`. This was the
   commonest fault when the screen was audited: "…produce a set nobody
   designed", "…asks more of an author than it gives back".
3. **Address the author as "you", actively.** "Only one source applies at a
   time" beats "One source is used at a time"; "this is what you pick in the
   editor" beats "what authors pick".
4. **Name an internal only where the author can act on it.** A slug they edit,
   yes — and there, only to explain why editing it is destructive. "Block
   attributes" as a bare noun, no.
5. **Say what happened, not what the code did.** "Reload the page to see what
   is in use" beats "what is in use could not be read back".
6. **Help text under ~90 characters**, and given a measure it can be read at.

There is one deliberate exception to (1). The notice shown when the *server*
refuses a set has to recite the rules, because it fires exactly when the screen
thought the set was valid — so no field is marked and there is nothing to point
at. A recital is the honest answer there; everywhere else it is laziness.

### Measure

Help text is capped at **420px**, which is ~65 characters at 12px — inside the
45–75 band prose is comfortable at.

Not a new value: the breakpoint table's guidance line already used it, which is
precisely why that line read well while two `CardBody` sentences beside it ran
to **128 characters on a single line** at a 1502px viewport. Measured on the
live screen, not estimated.

A sentence in a `CardBody` has the whole card and must be given one. A sentence
inside a table cell has its column, which is usually enough.

**The `UP TO` column is the exception, and it is the tighter constraint.** It is
a fixed **130px**, so its help wraps at **~20 characters a line** — measured, by
cloning the live help node and probing candidate strings in it. A message that
named the other row *and* its consequence became a four-line ribbon under a
one-line field; `settings-screen.png` §C draws it that way, at five lines. So
anything that can land under a width is written to **fit two lines at 130px**,
which is about 44 characters including the interpolated name. That is a lower
bound on measure, not an upper one, and it outranks rule (1) above wherever the
two disagree.

### Where a line breaks

Measure says how wide a line may be. This says how the words are divided inside
it, and it is a separate fault with a separate fix.

A sentence a few characters past one line wraps to a **widow**. Measured on the
live screen: `Your breakpoints are kept, so reinstalling leaves your spacing
exactly as it is.` broke **70 / 9**, and a row's own message, in the 130px
column, broke **13 / 8**. Both are inside the measure; both read as a mistake.

**This cannot be fixed by writing shorter strings**, and that is the whole
reason it is a CSS rule and not an editing rule. A break point is a *rendered
width*, so a sentence tuned to fall well in English falls somewhere else in
every translation — Greek runs longer and would re-rag every line fitted by hand
for English. `text-wrap: balance` turns 70 / 9 into 42 / 37 and 13 / 8 into
10 / 11, and fixes the Greek nobody measured.

Two things about applying it, both found by it not working:

- **It is not inherited.** `#spacery-settings { text-wrap: balance }` changed
  nothing: every descendant computed `pretty`, with no stylesheet on the page
  setting `pretty` at all (Chrome 152). The declaration has to be on the element
  that holds the text.
- **It needs a block container.** `Text` renders `display: inline` and cannot
  balance itself. On this screen the three `maxWidth: 420px` wrappers do it —
  the element that decides how wide a line may be also decides how it is
  divided, which is where the two rules belong together. In the inspector, a
  plain `div` inside each column item does the same job.

### A band's lower edge is exclusive, and saying so is not optional

Spacery's bands are disjoint — `@media (888px < width <= 1300px)` — so a screen
exactly 888px wide belongs to the *narrower* tier and to that one alone. Any
label that names 888px on two rows describes an overlap the CSS cannot produce,
which is how `Covers` came to read `888px – 1300px` above `450px – 888px`.

**Do not close the gap with arithmetic.** `previous + 1` is the reflex and it is
wrong: measured by sizing an iframe to each width and reading `matchMedia`, at
**888.25px** the real query matches while both `(max-width: 888px)` and
`(min-width: 889px)` miss. The label would then deny a width that is already
being styled. Widths are not integers — browser zoom produces fractions on every
screen, and for an `em` breakpoint "+1" has no unit at all.

Say it in words: **`over 888px, up to 1300px`**, and `up to 450px` for the
narrowest. Those are the ruler's own words, and one function (`band()`) writes
them for both.

### Two `Text` elements side by side are one paragraph

Not a wrapping question but found by the same audit, and worse than any widow.
`Text` is inline, so three of them as siblings in a fragment flowed together
**with no whitespace between the sentences** — the takeover notice rendered
`narrower screens.In Spacery they also`. Separate statements go in a column,
each in its own block. A fragment of `Text`s is a paragraph, whether or not it
was meant as one.

### Do

- Say a value's **consequence**, not just its name — every band, empty state and
  error names what it does to the site.
- State problems on the field that caused them, naming the other row involved.
- Let derived values be visibly derived: `Covers` and the ruler are outputs,
  never inputs.
- Label every control, hiding the label when a heading does the visual work.
- Explain a disabled control in the sentence beside it.

### Don't

- Repeat help text per row — once, under the table.
- Recite every validation rule in one notice and leave the author to find which
  row broke.
- Set status text in a border colour.
- Use `#757575` for text — it is an icon and border grey.
- Add a second accent. The blue ramp and the two status hues are the whole
  palette.
- Round a corner past 2px, or shadow anything that does not overlap content.
- Hand-set a borrowed component's height to match this document.
