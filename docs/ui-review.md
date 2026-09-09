# UI review — inspector panels

A design review of the editor UI, read from source: `src/extension/SpacingPanel.tsx`,
`src/extension/SpacingBox.tsx`, `src/breakpoints/TierSelector.tsx`,
`src/blocks/spacer/edit.tsx`.

This is a review of the **code**, not of the directory screenshots — those were
drawn from these files, so the code is the source of truth and nothing here asks
you to match a picture.

Findings are ordered by how much they cost a user. Each names the symptom, the
reason it matters, and a concrete change. Where a fix has a real trade-off it is
stated rather than hidden — several of these are judgement calls that only you
can settle.

---

## Decisions taken

- **Call 1 — the box stays linked by default.** No change to `SpacingBox`. The
  scenario-C risk in the annex is accepted knowingly; do not "fix" it.
- **Call 2 — approved.** The three additions below.
- **The settings screen — approved for redesign**, including live validation.

Both approved designs are exported alongside this document, so an implementer
needs nothing from the design project:

| Drawing | Covers |
| --- | --- |
| [`proposals/design-system.png`](proposals/design-system.png) | **The system.** Colour roles, type scale, spacing and edges, how each borrowed `@wordpress/components` part is used, then the six components Spacery adds — with their rules |
| [`proposals/admin-screen.png`](proposals/admin-screen.png) | **The screen.** The complete settings page built from that system: the three cards, the ruler in place, and the sticky save bar |
| [`proposals/panel-additions.png`](proposals/panel-additions.png) | The block inspector — the panel as it stands, beside the same panel with the three additions |
| [`proposals/settings-screen.png`](proposals/settings-screen.png) | The settings pieces in isolation, with the before/after argument for each |

Read them in that order. The system says what the parts are; the screen shows
them assembled at real proportions; the last two carry the reasoning for
individual decisions and are reference rather than target.

**The menu column shows Spacery's item only**, in its current state, with the
new mark as its icon. Neighbouring items and the admin bar are not drawn: every
real menu item carries a dashicon, and drawing those from memory would put an
approximation of WordPress's furniture beside a specification of Spacery's own.
The gradient above and below the item is there to read as "the menu continues",
not as a design element.

**The menu icon replaces `dashicons-image-flip-vertical`** in `Screen.php`. Two
things about it are in section 5.5 of the system and matter for implementation:
the 20px mark drops its thinnest bar, because at that size it is about 1px and
greys out; and `add_menu_page()` renders `$icon_url` as a background image, so
unlike a dashicon it cannot inherit the menu's state colour without CSS of your
own.

The layout is fluid: `max-width: 1000px`, with `minmax(0,1fr)` table tracks that
reflow. The exports are 1000px because that is what the capture holds, not
because anything is pinned there.

The system page is deliberately thin on things WordPress already decides.
Control heights, focus rings and button padding belong to
`@wordpress/components` and are shown there only so the drawings look right —
they are descriptive, not prescriptive. Section 5 (Spacery's own components) is
the part with no WordPress equivalent, and that part is prescriptive.

The drawings are the target; the sections below are what the drawings cannot
say — the rules, the data sources and the edge cases. Where the two disagree,
the text wins: it was written after the drawings and corrects two things in
them (noted in place).

The drawings were made in `Spacery UI Proposals.dc.html` in the design project.
That file is not part of this drop and is not needed to implement anything — it
is a mockup, not a component, and none of its markup should be copied into
`src/`. The panels there are inline-styled HTML approximating
`@wordpress/components`; the real implementation uses the components.

---

## Approved: the three panel additions

### A. Indicator on the collapsed panel header

**Decided: do not migrate to `ToolsPanel`. Use `PanelBody`'s `icon` prop.**

I recommended that migration on a false premise and checked it against
Gutenberg's source before committing. `ToolsPanelHeader` renders the label plus
a dropdown of `menuitemcheckbox` items, checked when an item holds a value.
**There is no dot on a `ToolsPanel` header.** Migrating buys nothing for this
design — the indicator is custom work either way.

With that gone the migration is cost without benefit, and the costs are real:

- `ToolsPanelItem` requires `hasValue`, `onDeselect`, `label` and `panelId` per
  item. This panel's contents are not independent properties: it is a tier
  selector — a mode switch, not a tool — followed by N boxes. The selector would
  land in the options menu as a hideable, resettable item, which is nonsense.
  You cannot reset which tier you are editing, and hiding it breaks everything
  below it.
- `hasValue` would have to mean "padding at the currently selected tier", so the
  menu's checkmarks would silently change meaning whenever the tier changed.
  `ToolsPanel` has no way to express that scoping.
- `resetAll` is required and panel-global. This panel already has a tier-scoped
  `Reset all`. Two reset-alls at different scopes is worse than what exists.
- Any property left without `isShownByDefault` must be revealed through the menu
  on every block, which fights the plugin's purpose.

**This also closes a finding below.** "Not the control core uses for the same
properties" is fair as an observation, but `ToolsPanel` is not the remedy: it
models a set of opt-in properties, and this panel is one property set viewed
through a tier switch. Treat that finding as noted and closed, not as work.

**Implementation.** `PanelBodyProps.icon` is typed `React.JSX.Element` and
documented as "An icon to be shown next to the title" — it renders in the
collapsed header, which is exactly the requirement. Pass a small dot SVG. No
cast, no custom header, no migration.

Two caveats:

1. `PanelBody` decides where the icon sits relative to the title. The drawing
   puts the dot after the label; the real slot may put it before. Accept
   whichever it gives, and write a custom header only if the right-hand
   position turns out to matter.
2. A bare dot is invisible to a screen reader, and `title` is a string so
   `VisuallyHidden` cannot go inside it. Set the accessible name through
   `buttonProps` instead — `{ 'aria-label': __( 'Responsive spacing — this
   block has responsive values', 'spacery' ) }` — and keep it in step with the
   dot's own condition.

Gate the dot on **tiers that currently exist**, not on the raw attribute. A
value stored under the slug of a since-deleted breakpoint renders nothing, and
lighting the dot for it would advertise spacing the page does not have.
`useBreakpoints()` in `register.tsx` gives the current set.

### A2. The menu item does not carry Spacery's mark today

A capture of the live install shows the Spacery menu entry rendering a **stock
dashicon** — the flip-vertical glyph — not the plugin's own mark. So the icon in
the drawing is a *proposal*, not a record of current behaviour, and adopting it
is a code change: pass the mark to `add_menu_page()`'s `$icon_url` as a
base64 data URI (`data:image/svg+xml;base64,…`), which is how WordPress takes a
custom menu icon and how it gets the automatic colour treatment.

The SVG must be **single-colour with `fill="currentColor"`** — WordPress masks
menu icons to the admin scheme, so anything multi-colour is flattened. The mark
survives that: its three top bars are distinguished by thickness, not hue.

`brand/menu-icon.php` carries this ready to use as `spacery_menu_icon()`.

Measured off the same capture, for whoever builds this:

| | Value |
| --- | --- |
| Menu background | `#1e1e1e` |
| Current-item highlight | `#3858e9` |
| Menu column width | 158px |
| Item row height | 34px |
| Icon box (dashicons) | 20 × 18px |
| Icon box (Spacery) | **24 × 24px** — see below |

**One admin scheme drives the whole screen.** The same `#3858e9` is the menu
highlight, the primary button, the selected radio and the link colour — in
WordPress those are never different values, because they all come from the
active colour scheme. I initially corrected only the menu and left the page's
controls on a recalled `#2271b1`, which put a vivid highlight next to a duller
button in the same image. Both halves are now sampled from the capture:

| Role | Sampled |
| --- | --- |
| Accent (button, link, radio, focus) | `#3858e9` |
| Page ground | `#f0f0f0` |
| Card border | `#d8d8d8` |
| Divider / row rule | `#e5e5e5` |
| Input border | `#8d8d8d` |
| Ink | `#1e1e1e` |
| Icon / border grey | `#757575` |
| Muted text | `#646464` |
| Small caps labels | `#545454` |

**Sampling a colour does not make it usable as text.** The install's muted grey
is `#757575`, which measures 4.2:1 on white and 3.9:1 on the `#f0f0f0` ground —
failing 4.5:1 at every size. My first pass swapped every muted value to it and
regressed the help text, meta lines and column labels in one move. WordPress
gets away with it because much of that grey carries icons and borders, not
sentences. Text now steps up a graduated ramp instead: `#646464` for help text
and meta (5.2:1 on the ground), `#545454` for the 11px caps column labels
(7.0:1 on the `#f6f6f6` table head) — more contrast for smaller type, not less.

This install runs the **modern** scheme, whose chrome is flatter and greyer than
classic WordPress. **Do not hard-code any of it** — a site on another scheme
renders different values, so read them from the admin's own CSS variables. The
table exists so the drawings can be checked against the install they were
measured from, not as a palette to ship.

**Use a 24px box, not 20px.** The mark's thinnest bar is 4/77 of the box: at the
20px dashicons use it renders 1.04px, a hairline against the frame's 2.08px. At
24px it reaches 1.25px and holds. `add_menu_page()` accepts any SVG size and
WordPress scales it to the slot, so this costs nothing and leaves the geometry
alone — which is the point. The alternative I first proposed, a reduced two-bar
menu variant, was rejected: the three bars are the identity.

---

### A3. Brand placement on the settings screen

The screen carried no Spacery identity beyond the menu icon. Two placements now
cover it, and the restraint is the specification:

- **Header lockup** — the mark in a 32px dark tile (7px radius, the directory
  icon's own 28/128 corner) beside the `h1`, with the version as a bordered tag.
  The tile is the page's only dark surface, and it exists so the accent bars sit
  on the ground they were drawn for — the page mark and the directory icon are
  then the same artwork, not two versions of it.
- **Footer** — the mark at 15px in `#646970`/`#8c8f94`, no tile, above one rule,
  with the version repeated and links to documentation and support. Monochrome
  deliberately: a second coloured mark on one screen turns identity into
  decoration.

Both are drawn in `proposals/design-system.png` §5.6 with the reasoning.

**One mark at every size.** I proposed a reduced two-bar variant for small
sizes, on the grounds that the thinnest bar falls under a pixel below about
40px. That was rejected and the rejection is right: the three bars are the
identity, and a mark that drops a bar to fit is a second mark. Every instance —
directory icon, banner, header, footer, menu icon — draws from
`brand/mark.svg` at the authored 8 / 6 / 4. The header sits at 20px on the
tile, the footer at 18px flat `#646464` (the earlier `opacity: .75` is gone; it
was undoing the contrast correction in A4). The thin bar renders near 1px at
those sizes, which is how the mark is meant to look at interface scale.

**The rule:** twice per screen, both times at interface scale. No banner, no
coloured header strip, no mark behind the cards, and nothing on screens Spacery
does not own. WordPress's admin belongs to the site owner; a plugin signs its
own page and stops there.

---

### B. Dots on the tier-selector segments

`SpacingPanel` already computes `paths` and holds `attributes.spacery`, so the
set of tiers carrying values is `breakpoints.filter(b => paths.some(p =>
undefined !== authoredAt(attributes.spacery, b.slug, p)))`. Pass it to
`TierSelector` as a new prop.

Both branches need the treatment — the icon branch and the label branch — or
sites with more than five tiers lose the feature. `icons.tsx` draws the glyphs
locally, so a marker can be composited into the SVG.

### C. Provenance line per box

`inheritedValue()` already walks the chain to build placeholders and discards
the source. Have it return the source alongside the value.

**The drawing shows the easy case.** A box has up to four sides and they can
inherit from different tiers, so the line needs a rule. Proposed:

| State | Line |
| --- | --- |
| Every side authored at this tier | `Set here` |
| No side authored, all inherit from one tier | `Inherited from Laptop` |
| No side authored, two sources | `Inherited from Desktop and Laptop` |
| No side authored, three or more sources | `Inherited from 3 breakpoints` |
| Some sides authored here, some not | `Partly set here` |
| Nothing authored anywhere, nothing inherited | omit the line |

The last row matters — it is the same mistake as finding 6. Do not print an
inheritance that does not exist.

One wording question for you: `inheritedValue()` falls back to the block's
own non-responsive `style`, which is not a tier. The spacer says
`Inherited from Default` for its equivalent. Suggested here:
`Inherited from this block's own spacing`.

---

## Approved: the settings screen

### Live validation must mirror the server exactly

The server refuses an invalid set **whole** and returns the previous one, so any
rule the client misses becomes a save that silently does nothing. Read the rules
off `BreakpointSet::from_array()` and `Breakpoint::create()` rather than this
summary, but they are:

Per row — slug trimmed and matching `/^[a-z0-9-]+$/`; label non-empty after
trimming; `max` matching `Breakpoint::VALID_LENGTH` (mirror that constant, do
not re-derive it) and resolving to more than `0` pixels.

Across the set — no duplicate slugs; widths **strictly descending** once sorted,
i.e. no two rows may share a width; at most `BreakpointSet::MAX_BREAKPOINTS`
(12).

**The trap:** widths are compared in *pixels*, not as strings.
`Breakpoint::PIXELS_PER_EM` is 16, so `888px` and `55.5rem` are the same width
and the server refuses the pair. A client that compares the typed strings will
show a valid form and then a save that changes nothing. Convert before
comparing.

An empty set is valid and meaningful — it clears the custom source. Do not
treat "no rows" as an error.

### Sorting

`BreakpointRows` deliberately does not re-sort while typing, and the reason
given is sound: re-sorting on each keystroke moves the field under the cursor.
The redesign's header says "Sorted widest first automatically", which is a
promise about the saved result, not about live reordering. Either keep the
existing behaviour and reword that line, or sort on blur rather than on change.
Do not sort on keystroke.

### The `Covers` column and the ruler share one function

`band()` currently lives in `App.tsx`. The table's `Covers` cell and the ruler
both need it; extract it so all three agree, and so the ruler cannot drift from
the text.

### Ruler geometry

Position segments by **pixel** value (same 16px-per-em conversion) while
labelling ticks in the author's own units. Set the axis maximum above the widest
tier so the uncovered region is visible — the drawing uses widest × 1.15. When
every tier is em or rem, positions are still pixel-derived; only the labels
differ.

**The ruler needs a guard against pathological widths, and this is not
hypothetical.** A real capture of the screen has `desktop` at `11920px`,
plainly a typo for `1920`. It passes every server rule: valid length, above
zero, strictly descending against `laptop` at `1300`. Drawn naively on a linear
axis, `desktop` would occupy 89% of the ruler and the other three tiers would
collapse into slivers a few pixels wide — one bad digit would make the whole
graphic useless, exactly when it is most needed.

Options, in the order I would try them:

1. **Clamp the axis** at some sane ceiling (2560px covers every real display)
   and draw anything beyond it as a broken/continued edge, labelled with the
   real value. The mistake stays visible without destroying the scale.
2. **Warn on the row instead.** A width far above any real screen is almost
   always a typo, so `11920px` earns an inline caution — not an error, since it
   is legal, but a "did you mean 1920px?" the author can dismiss.

Do both if you can: the clamp keeps the ruler readable, the warning explains
why it is clamped.

Worth noting separately: the server enforces no upper bound at all. That is
defensible — there is no principled maximum — but it means the only thing
standing between a typo and a live site is the author noticing. Neither the
current screen nor `In use now` gives them any help; `over 1300px, up to
11920px` reads as deliberate.

### The unexplained fallback

Source `custom` with no rows defined currently shows `From: Spacery's own set`
with no explanation. The notice and empty state in the drawing close it. The
condition is `'custom' === source && 0 === rows.length`, and the text should
name both the choice and what is actually in effect.

---

## Settings screen — code review

Read from `src/settings/App.tsx` and `src/settings/BreakpointRows.tsx`. These
are code findings, separate from the redesign approved above. The first two are
the ones I would fix regardless of whether the redesign happens.

### S1. Renaming a breakpoint silently orphans its stored values

`slugFrom()` keeps the slug in step with the name until the author edits the
slug themselves. Its docblock explains the danger precisely:

> Editing the name of a breakpoint whose slug is already in use in content
> would silently orphan every value stored under the old slug, so the slug
> stops following once it diverges from the name it came from.

But divergence is not the dangerous case — *any* slug change is. In the
common path the author never touches the slug, so it never diverges, so it
keeps following. Rename `Laptop` to `Notebook` on a site with content and the
slug goes `laptop` → `notebook`, and every value stored under `laptop` stops
resolving. `Generator::normalize()` prunes slugs that no longer exist, so the
spacing simply disappears from the page with no error anywhere.

The guard protects the case that cannot happen and leaves the case that can.

**Fix.** Auto-follow is only safe before the set has ever been saved. Once a
slug could exist in content, stop following and make slug edits deliberate:
either freeze the slug after the first successful save of that row, or keep
following but warn on rename that stored values will be orphaned. Freezing is
simpler and matches the docblock's own reasoning.

### S2. Rows are keyed by array index

```tsx
{rows.map((row, index) => (
    <FlexItem key={index}>
```

Remove the first of three rows and React reuses each DOM node for what is now a
different breakpoint. Caret position, focus and any state held inside
`UnitControl` — including the unit it parsed — carry across from the removed
row's neighbour to an unrelated one. It presents as fields that keep a stale
unit or jump the cursor after a removal.

**Fix.** Give each row a client-side id when it is created and key on that. The
id never leaves the browser; the server's shape is unchanged.

### S3. A failed refresh is reported as a failed save

```tsx
const stored = await saveSettings(settings);
setSettings(stored);
setInfo(await fetchInfo());
setStatus({ kind: ... });
```

If `fetchInfo()` throws, the `catch` sets `status: 'error'` — but the save
already succeeded. The author is told the operation failed while their settings
are on disk, and the obvious response is to try again.

**Fix.** Treat the two calls separately: the save's outcome decides the notice,
and a failed refresh gets its own softer message ("Saved. Could not refresh
what's in use — reload to see it.").

### S4. `rejected` can report "nothing changed" when something did

`wasAccepted()` compares the rows sent with the rows returned, which is a sound
test for the rows. But `saveSettings()` sends the whole settings object, and
`spacery_breakpoint_source` is sanitised independently of the breakpoints.

So: an author with a half-typed invalid row switches the source to `theme` and
saves. The server accepts the new source and refuses the rows, returning the
previous ones. `wasAccepted()` is false, and the screen says *"Those
breakpoints were not saved, and nothing changed."* The second clause is untrue —
the source changed, and the screen is now showing it as saved.

**Fix.** Compare both fields and word the notice from what actually differs.
Live validation (approved above) makes this rare, but not impossible — the
server stays the authority.

### S5. `RadioControl` has no accessible name

The `Breakpoint source` heading is an `<h2>` in the `CardHeader`, not a label
for the group. `RadioControl` renders its `label` as the fieldset's legend, and
none is passed, so the group has no accessible name — the same defect class as
the spacer's unlabelled field in finding 1.

**Fix.** `label={__('Breakpoint source', 'spacery')}` with
`hideLabelFromVision`, since the heading already does the visual work.

### S6. The loading state blanks the whole screen

```tsx
if (null === settings || null === info) {
    return <Spinner />;
}
```

A bare spinner on an otherwise empty page, with no heading and no accessible
status. Two REST round-trips means this is visible on every visit.

**Fix.** Render the `Spacery` heading and its intro immediately — they depend on
nothing — and put the spinner where the cards will be. Wrap it so assistive
technology is told the page is loading rather than empty.

### S7. Radio labels have unbounded length

`sourceOptions()` builds the theme and preset labels by joining every tier
through `describeTier`. `MAX_BREAKPOINTS` is 12, so a theme declaring a full set
produces a single radio label naming twelve breakpoints with their widths, on
one line. `describeTier` is right for four; it has no behaviour for twelve.

**Fix.** Name the first few and count the rest ("…and 8 more"), or move the
list under the label as secondary text where it can wrap.

### S8. Nothing protects unsaved edits

There is no dirty tracking: `Save changes` looks identical whether or not
anything has changed, and navigating away discards a half-built set with no
warning. On a screen whose main task is typing several rows, that is a real
loss. The redesign's sticky footer is the natural place to show it.

---

## 1. The spacer's per-tier height field has no label

`blocks/spacer/edit.tsx`, in `ActiveTier`:

```tsx
<UnitControl
    value={authored ?? ''}
    placeholder={effective}
    units={UNITS}
    onChange={...}
/>
```

No `label`, no `hideLabelFromVision`, no `aria-label`. The `Default` field in
the panel above it is labelled; this one is not, so a screen-reader user reaches
a bare spinbutton with no indication of what it sets. The visible context — a
panel titled `Laptop · ≤1024px` — is not programmatically associated with the
field.

Everything else in the plugin is careful here (`SelectControl` for the unit
picker carries `hideLabelFromVision` with a real label), which suggests this is
an oversight rather than a decision.

**Fix.** Give it a label naming what it sets, hidden from vision if the panel
title is doing the visual work:

```tsx
<UnitControl
    label={__( 'Height', 'spacery' )}
    hideLabelFromVision
    ...
/>
```

`Height` rather than the tier name: the tier is already the panel title, and a
label that repeats it tells a screen-reader user the breakpoint twice and the
property never.

---

## 2. The box is linked by default, which contradicts the panel's premise

`SpacingBox.tsx` opens with `useState( true )` for `linked`, and its own
docblock argues both sides of this:

> Spacery needs the opposite of both: four fields visible by default, because
> the point of the panel is per-side control

> and it is **on by default**: equal sides are what most spacing is

Both claims are reasonable in isolation. Together they produce a control that
*looks* like four independent fields and *behaves* like one, and the giveaway is
invisible until the author types. The per-side placeholders make it worse: four
fields showing four different inherited values (`32`, `24`, `32`, `24`) is a
strong signal that the fields are independent, and then the first keystroke
overwrites all four.

**This is the one finding I would not act on without your call**, because it is
a genuine product decision, not a defect. Three options:

1. **Default to unlinked.** Consistent with the panel's stated purpose and with
   the per-side placeholders. Costs four edits in the common equal-sides case.
2. **Keep linked, make it legible.** Show the linked state in the fields
   themselves, not only in the toggle's pressed state — e.g. render one field
   spanning the row while linked, the way core's `BoxControl` does. This gives
   up the "four fields always visible" property the file argues for.
3. **Keep as-is, and make the toggle louder.** Cheapest, least honest; the
   mismatch between appearance and behaviour survives.

My reading: option 1. The plugin's entire reason to exist is per-side, per-tier
control, and the author who wants four equal sides can click link once. But you
know your users' habits and I am inferring them.

---

## 3. Linked and unit state are lost when the block is reselected

Both `linked` and `chosen` in `SpacingBox.tsx` are `useState` inside a component
that unmounts when the inspector closes or the selection changes. So:

- Unlink the box, select another block, come back → relinked.
- Choose `rem`, empty the box, select away and back → `chosen` is `undefined`,
  and the unit falls back to whatever `unitFor()` reads from the (now empty)
  values.

The second one directly defeats the reasoning the file gives for `chosen`
existing at all:

> A unit the author picked outlives the values.

It outlives the values but not the selection, which is the more common event.

**Fix.** Both are per-block, per-author preferences rather than content, so they
belong somewhere that survives a remount without entering the post: the block
editor's own preferences store is the usual home
(`@wordpress/preferences`, or `core/block-editor` local state keyed by client
ID). Storing them in the block's attributes would be wrong — they are not
content and would dirty the post.

If that is more machinery than you want, scoping a module-level `Map` by client
ID is a smaller fix that covers the reselection case.

---

## 4. `MAX_SEGMENTS` ignores whether icons are in use

`TierSelector.tsx` computes two things independently:

```tsx
const withIcons = iconsAreDistinct( breakpoints );
...
breakpoints.length <= MAX_SEGMENTS ? <ToggleGroupControl> : <SelectControl>
```

`MAX_SEGMENTS` is 5, justified as:

> Four or five short labels are readable at ~250px and twelve are not

But whether the segments hold *labels* or *icons* is decided separately, and
tier labels are theme-authored and arbitrary. Five icons at 250px are
comfortable. Five labels reading `Widescreen`, `Desktop`, `Laptop`, `Tablet`,
`Handheld` are not — `ToggleGroupControl` does not wrap, it divides, so those
truncate.

**Fix.** Make the threshold depend on what the segments contain:

```tsx
const MAX_ICON_SEGMENTS = 6;
const MAX_LABEL_SEGMENTS = 4;
const max = withIcons ? MAX_ICON_SEGMENTS : MAX_LABEL_SEGMENTS;
```

A sharper version measures the labels' total length rather than counting them,
since `Sm`/`Md`/`Lg`/`Xl` and the list above are both "four labels". If you want
that, the rule that works is a budget on summed characters, not a per-label cap.

---

## 5. The `Breakpoint` label appears only in the dropdown fallback

Same file: the `ToggleGroupControl` branch passes `hideLabelFromVision`, the
`SelectControl` branch does not. A site with six tiers gets a visible
`Breakpoint` label that a site with four does not, so the panel's vertical
rhythm changes with a setting the author did not touch here.

**Fix.** Add `hideLabelFromVision` to the `SelectControl` for consistency. The
tier is already named by the header line below it (`Laptop · ≤1024px`), so the
visible label is redundant in both branches.

---

## 6. `Inherited from Default` is claimed even when there is no default

`describeProvenance()` in `blocks/spacer/edit.tsx` falls through to:

```tsx
return __( 'Inherited from Default', 'spacery' );
```

When `attributes.height` is also empty, this states an inheritance that does not
exist — the spacer has no height from anywhere. The field's placeholder is
simultaneously empty, so the two lines disagree.

**Fix.** Distinguish the empty case:

```tsx
if ( ! effective ) {
    return __( 'No height set', 'spacery' );
}
```

which needs `effective` passed in, or the check hoisted to the caller where it
is already in scope.

---

## 7. The unit picker and link button overwhelm the row

Measured off the live render (halving the 2× capture): the unit `SelectControl`
is about **85×36px** and the link button about **39px square**, while the four
number fields are about **59×31px**. So the two secondary controls are taller
than the fields they modify, and the unit picker — showing the two characters
`px` — is wider than any field that holds an actual value.

The link button compounds it. `isPressed` renders a solid near-black fill, and
because linked is the default (finding 2) that fill is present on every block
an author selects. In the capture it is the highest-contrast element in the
whole panel: a secondary toggle in its default state outweighs the property
label, the tier header and the fields.

Causes, in order of contribution:

1. The number fields are `size="compact"`; the `SelectControl` and the
   `Button`s are not, so they take the 40px default.
2. None of the controls carry `__next40pxDefaultSize` /
   `__nextHasNoMarginBottom`. On recent WordPress the omissions log deprecation
   notices, and the default `SelectControl` also reserves a bottom margin the
   compact fields do not — which is what tilts the row's baseline.
3. `SelectControl` sizes to its widest option, and the options list includes
   `custom`. That is what makes an 85px box for `px`.

**Fix.** Bring the whole row to one size and stop the select sizing itself:

```tsx
<SelectControl
    size="compact"
    __next40pxDefaultSize
    __nextHasNoMarginBottom
    ...
/>
```

and constrain its width (`style={ { width: '4.5rem' } }` or a wrapping
`FlexItem` with a fixed basis) so `custom` does not set the row's geometry.
Same `size="compact"` treatment on the link and reset `Button`s, and on the two
`UnitControl`s in the spacer block.

I have not run this against your 7.1 environment, so treat the deprecation
notices as "check the console" rather than settled. The size mismatch is
measurable in the capture regardless.

---

## 7b. The tablet and mobile icons are nearly identical

In the live render the third and fourth segments are both portrait rounded
rectangles differing only in width — at 24px, and side by side, they read as the
same glyph. `iconsAreDistinct()` returned true, so the icon path was taken, but
"distinct" is being decided on the tier's width rather than on whether the
resulting drawings are actually telling apart.

This matters more than it looks: the segments have no visible text, so the icon
is the only thing distinguishing two of the four choices. The accessible name
and tooltip carry the label, which covers screen-reader and hover users but not
someone scanning the row.

**Fix, cheapest first.** Widen the difference in the drawings — the tablet glyph
can gain the landscape proportion or a home-button detail the phone lacks, since
`icons.tsx` draws them locally and can diverge as much as you want. Failing
that, `ToggleGroupControlOptionIcon` in a four-segment row at ~285px has room
for short text, so the label branch is not unreasonable at this count — which
ties into finding 4.

---

## 8. Two muted notes can stack under the selector

`TierSelector.tsx` renders the canvas-divergence note and the
responsive-editing-off note as independent conditionals. Both can be true at
once, giving three stacked lines of muted 12px text above the fields.

Low priority — the combination needs a site with responsive editing off *and* a
canvas reading a different tier. Worth knowing it is reachable.

**Fix, if you want one.** Make them mutually exclusive: when responsive editing
is off, the canvas cannot follow, so the divergence note adds nothing.

---

## What the live render confirmed

Against a real capture of the panel on a selected block:

- The canvas-divergence note works exactly as intended — `The canvas is still
  previewing Desktop.` while the panel edits `Laptop · ≤1024px`. This is the
  case the `%1$s · ≤%2$s` header exists for, and it reads clearly.
- The reset buttons are correctly absent with nothing authored, and `Reset all`
  correctly absent too. Findings 2 and 7 are about the controls that *are*
  there, not about these.
- Empty fields with no placeholders is right when no wider tier and no `style`
  value exist. Nothing is claiming a fallback that isn't there.

---

## The panel as a whole — a harder look

The findings above are defects. This section is a criticism of the Responsive
spacing panel *as designed*, which is a different and less comfortable
conversation. Everything here is about the panel as the code currently stands.

### It has no idea what it contains

Collapsed, the panel reads `Responsive spacing` on every block that supports
spacing — which is most of them. Nothing distinguishes a block carrying padding
at three tiers from a block carrying nothing. An author auditing a page has to
open the panel on every block, and then click every segment inside it, to find
out where the responsive values are.

This is the panel's largest functional gap, and the spacer block already
contains the answer: its `Set at` summary lists every tier's value at once, with
a comment explaining exactly why that is worth a panel of its own. The spacing
extension — the more complicated of the two, with up to four sides × two
features × n tiers — has no equivalent. Two panels in one plugin disagree about
whether authors need to see their values without visiting them.

Core solves the collapsed case with a reset indicator on `ToolsPanel` headers,
which is also the pattern an author already knows from the panel directly above
this one.

### It is not the control core uses for the same properties

Core's spacing controls are a `ToolsPanel` — properties are opt-in through a
menu, and the panel header carries the reset affordance for all of them.
Spacery's panel renders every supported feature unconditionally in a plain
layout, with resets scattered across two levels. So an author sets padding in
core's panel one way and in Spacery's panel another way, on the same block, in
the same sidebar, one panel apart. `TakeoverNotice` acknowledges the two systems
collide but only appears once they already have.

### The box header row is over-subscribed

At 285px the padding header carries: the label, an 85px unit select, a 39px link
toggle and a 39px reset. Four controls and roughly 160px of chrome to modify
four fields that are themselves 59px each. Core puts the unit *inside* each
field and spends the row on nothing else.

### Controls that appear and disappear move their neighbours

The per-box reset renders only when the box is authored, and `Reset all` only
when more than one box is. Both conditions are individually well-argued in the
comments. The consequence is that typing the first number into `Top` makes a
button materialise in the header row and shoves the link toggle and unit select
left; authoring a second box then makes `Reset all` appear and reflows the tier
header above. The panel rearranges itself in response to typing.

There is a real trade-off here and the comments are right that a permanently
disabled button is its own problem. But `visibility: hidden` — reserving the
space, hiding the control — buys the same honesty without the reflow, and is
what core does in several equivalent rows.

### `Reset all` cannot be discovered before it is needed

Its presence encodes state: it exists only once two boxes are authored. So the
author who would most benefit from learning the control exists — someone about
to author their second box — is precisely the author who cannot see it yet.

### Three consecutive lines can all be about which tier is selected

Selector, then `The canvas is still previewing Desktop.`, then
`Laptop · ≤1024px`. The tier's *name* in the third line is already the selected
segment in the first; only the boundary is new. When the responsive-editing note
fires too (finding 8) it is four lines before the author reaches a field.

### Authored and inherited values are distinguished by grey alone

An inherited `24` renders as grey text in a box identical to the authored `32`.
Grey-on-white at 13px is a thin signal for a semantic difference this large, and
it is the same signal WordPress uses for *disabled* — so a placeholder can read
as a field that cannot be edited. The distinction is load-bearing: it is the
difference between a value this tier owns and one it is borrowing.

### The unit dropdown silently rewrites the page

`switchUnit()` re-labels every authored side, so `32px` becomes `32rem` — a
roughly 16× change to the rendered result, from a control that looks like a
display preference. No confirmation and no in-panel way back.

### `custom` is a control-type switch hidden in a unit menu

Picking it swaps all four `NumberControl`s for `InputControl`s. That is a
reasonable feature — the docblock's argument for it is sound — sitting in the
wrong place: a menu of units is where an author looks for `rem`, not for a
different editing mode. It is also what forces the select to 85px, since the
list sizes to its widest option (finding 7).

---

## Annex — the two product calls, with scenarios

### Call 1: should the box open linked?

**Decided: it stays as is.** The scenario below is the known cost of that
choice, recorded so it is not rediscovered later and treated as a bug.

Current behaviour: `linked` starts `true`, four fields are visible, and typing
into any one writes all four via `applyEdit`.

**Scenario A — uniform padding (linked wins).** A Group needs 32px all round at
mobile. Nothing is authored anywhere. Linked: type `32` into `Top`, done — one
edit. Unlinked: four edits. This is the case the current default is tuned for,
and it is genuinely common.

**Scenario B — horizontal-only padding.** Author wants `0` top and bottom, `16`
left and right at mobile. Linked: types `16`, gets `16` on all four, clicks
unlink, clears two fields. Four actions and a wrong intermediate state, versus
two edits unlinked.

**Scenario C — the destructive one.** Desktop is authored asymmetrically:
padding `64 / 24 / 64 / 24`. The author selects Laptop; all four fields are
blank showing placeholders `64`, `24`, `64`, `24`. They want a shorter top at
laptop, so they type `48` into `Top`.

Linked writes `48` to all four sides at laptop. Horizontal padding silently
goes from 24 to 48 — doubled, at a breakpoint, on a property the author never
touched. Worse, the placeholders that would have revealed this are gone,
replaced by authored `48`s, so the panel no longer shows what the values used
to be. The author has to know the desktop numbers from memory to undo it.

Scenario C is not an edge case. Editing one side at one tier is the reason a
per-tier, per-side panel exists; the default is tuned against the panel's own
purpose.

**A fourth option, better than the three above: make the default adaptive.**
Open linked when the box's effective values (`authored ?? inherited`) are all
equal or all absent; open unlinked when they differ.

- Scenario A: nothing set → linked → one edit. Unchanged.
- Scenario B: nothing set → linked → same as today. No worse.
- Scenario C: placeholders differ → unlinked → typing `48` into `Top` writes
  `Top` only. The damage disappears.

The rule is one comparison over values the box already receives, and it makes
the default agree with what the fields are showing. The objection is that the
default now varies between blocks — real, but it varies *with the content the
author is looking at*, which is the kind of variation people read as
intelligence rather than inconsistency.

### Call 2: does this panel need the spacer's `Set at` summary?

Three scenarios the panel currently cannot answer:

**Audit.** An author inherits a site and opens a 40-block page. Which blocks
carry responsive spacing? Today: open the panel on each block, then click each
of four segments, then read up to twelve fields. Forty times.

**Provenance.** Padding looks wrong at Tablet. The field shows a grey `48`, so
it is inherited — but from Laptop, from Desktop, or from the block's own
non-responsive `style`? The panel does not say. `inheritedValue()` already
walks exactly that chain to produce the placeholder, and throws the answer away.
The spacer block, for the same question, prints `Inherited from Laptop`.

**Cleanup.** Strip every mobile override before handing the site over. `Reset
all` does it per block, once you know which blocks have mobile overrides —
which is the audit problem again.

**Recommendation: do not clone `Set at`.** A four-side, two-feature, n-tier
matrix will not fit 285px, and the spacer's flat list does not generalise.
Three cheaper changes answer more of the question — **all three approved; see
"Approved: the three panel additions" above for implementation notes:**

1. **A dot on each tier-selector segment that carries authored values.** Answers
   the audit question at the point where the author picks a tier, and costs no
   vertical space. `icons.tsx` draws the glyphs locally, so a marker can be
   composited in; the label branch needs the same treatment.
2. **A provenance line per box**, in the spacer's wording. The data is already
   computed. This does add a line per box, which fights the density criticism
   above — the trade is one line against guesswork, and I would take it.
3. **A reset indicator on the panel header**, the way core marks a `ToolsPanel`
   holding values. Answers "does this block have anything" while collapsed,
   which is the audit question at the scale it actually gets asked.

Item 3 is the highest value for the least work. Item 1 is the one authors will
notice. Item 2 is the one that prevents the most wasted debugging.

---

## What I did not find

Worth saying explicitly, since a review that only lists problems misrepresents
the code:

- **The reset logic is right.** `Reset all` appearing only when more than one
  box is authored, and each box's own reset appearing only when that box is,
  avoids the two-identical-buttons puzzle the comment describes. Both conditions
  are correct as written.
- **The empty states are handled.** No breakpoints, and theme-disabled spacing,
  both return an explanatory line rather than an empty panel — and the second
  correctly gates on `useSettings` as well as block supports, so the panel never
  offers to generate CSS the theme switched off.
- **`placeholderFor()` is subtle and correct.** Showing the bare number when the
  inherited value shares the box's unit and the whole value when it does not is
  exactly right; a lone `2` under a `px` picker would lie about `2rem`.
- **The `%1$s · ≤%2$s` header is the right call.** Naming both the tier and its
  boundary because core's badge and Spacery's tier legitimately disagree is
  better than papering over it, and the translator comment explains it.
- **`writeBox()` writing every side on every change**, including empties, is
  necessary for the box to be clearable at all. The comment is worth keeping.

---

## Suggested order

1. Finding 7 — the most visible problem in the panel, and a contained CSS-prop
   change.
2. Finding 1 — accessibility, small, unambiguous.
3. Finding 6 — a wrong statement in the UI, small, unambiguous.
4. Findings 5, 8 — consistency, small.
5. Finding 7b — needs a drawing decision.
6. Finding 4 — needs a decision on the thresholds.
7. Finding 3 — needs a store choice.
8. Finding 2 — needs your product call first, and finding 7 changes how it
   looks, so settle 7 before judging 2.
