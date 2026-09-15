# Brief — the three WordPress.org screenshots

**Written 15 September 2026, for whoever prepares the final screenshots.** It
replaces the screenshot half of `asset-brief.md` §4 and `asset-handoff.md`,
both of which predate changes made on 14–15 September that are visible in every
shot. Read §1 before anything else: the earlier brief describes a panel that no
longer looks, or lives, where it says.

The banners and icons in `assets/` are finished and are **not** in scope here.

---

## 0. The one rule that outranks the rest

**These are captures of the running plugin, not artwork.** The previous round
was built as HTML recreations of the editor, and `asset-handoff.md` says so and
asks for real captures. A drawn UI that differs from the product misleads the
person deciding whether to install it, and a reviewer who spots the difference
is right to.

So the design work here is **framing, not drawing**: choosing the state to
capture, cropping to the part that carries the claim, scaling to the target
size, and keeping the three consistent. Nothing in the interface may be
redrawn, recoloured, relabelled, or tidied. If something looks wrong in a
capture, that is a bug report, not a retouching job.

Acceptable: cropping, scaling, a flat background pad to reach the exact
dimensions, and a subtle drop shadow if all three get the same one.
Not acceptable: invented values, edited labels, removed controls,
straightened alignment, a fabricated breakpoint set, or a canvas showing a
result the settings would not produce.

---

## 1. What changed since the old brief

Anyone working from `asset-brief.md` §4 or `asset-handoff.md` will otherwise
reproduce a product that no longer exists.

| Then | Now |
|---|---|
| Panel titled **Responsive spacing** | Titled **Spacery** (D33) |
| Panel in the **Settings** tab | In the **Styles** tab (D34) — and on Group, Columns, Cover and Heading the tab bar is gone entirely, so it is one scrolling list with `Spacery` after `Dimensions` and `Border & Shadow` |
| Block titled **Spacery** | Titled **Responsive Spacer** (D33) |
| Tagline *Responsive spacing for every block* | *Responsive controls at your breakpoints* |
| **The canvas showed nothing** when a Spacery value was set | The canvas previews it (D36) — this is new, and it changes shot 1 |
| `custom` in the unit picker | `css` (D29) |

**D36 is the one that matters most.** Until yesterday the panel could be
photographed but its effect could not, because setting a value changed nothing
on screen. Shot 1 can now show the cause and the effect in one frame, which is
the strongest thing this plugin has to show.

---

## 2. Hard constraints from WordPress.org

- **Filenames are positional**: `assets/screenshot-1.png`, `-2`, `-3`. They are
  matched to the numbered lines under `== Screenshots ==` in `readme.txt` **by
  position**. A missing file renders as a broken image; a reordered file puts
  the wrong caption under the wrong picture.
- They live in the SVN `assets/` directory, **not in the plugin zip**, so they
  can land during the review queue without touching what was submitted.
- PNG. The directory renders them fairly small, so **crop to the region that
  carries the claim** rather than shipping a full desktop.

### Sizes

Inherited from the previous round so the set stays consistent:

| File | Size |
|---|---|
| `screenshot-1.png` | 1000 × 580 |
| `screenshot-2.png` | 900 × 640 |
| `screenshot-3.png` | 1120 × 485 |

### The order, and a discrepancy to resolve first

`asset-brief.md` §4 numbers them **panel, settings screen, spacer**.
`docs/readme-screenshots.txt` and `asset-handoff.md` number them **panel,
spacer, settings screen**. Two of three agree, and the captions already written
in `readme-screenshots.txt` are the ones that will be pasted into `readme.txt`,
so **that order wins**:

```
== Screenshots ==

1. Padding and margin per breakpoint, on any block that supports spacing.
2. A spacer whose height changes at every breakpoint — which the core Spacer block still cannot do.
3. Name your own breakpoints and set where each one stops, on Spacery's settings screen.
```

`readme.txt` currently has **no** `== Screenshots ==` section. It gets added
when the files exist, in this order, one line per file, no gaps.

---

## 3. Capture environment

**Not the MAMP playground.** Tried on 15 September and abandoned: that site has
**Elementor, Stackable, FileBird and wpbookbar** installed, which put *Edit with
Elementor*, *Design Library* and a Stackable icon in the editor's top toolbar and
two extra items in the admin menu. Some of it crops out; the toolbar sits exactly
where shot 1's frame wants to be, and third-party plugins may also inject block
styles that quietly change the canvas. A screenshot of Spacery should contain
nothing but WordPress and Spacery.

**Use the `wp-env` instance**, which is a clean WordPress 7.1 with only Spacery
active, and which is why this recipe exists:

```bash
pnpm install
pnpm run build
pnpm run env:start     # WordPress 7.1 on PHP 8.2, needs Docker
```

Then `http://localhost:8888/wp-admin`, user `admin`, password `password`.
Activate Spacery under Plugins if it is not already, and set the breakpoint
source to **Spacery's own** on the Spacery screen before capturing anything.

Identical for all three, or they will not read as a set.

- WordPress **7.1**, **Twenty Twenty-Five**, Spacery active, no other plugins
  visible in the frame.
- **1280px viewport**, light mode, admin colour scheme left at default.
- **Breakpoint source: Spacery's own** — Desktop 1280, Laptop 1024, Tablet 782,
  Mobile 480. Four tiers is what makes the point; a theme's two does not, and a
  hand-made twelve-tier set makes the screen look like a configuration burden.
- Sample content in the canvas should be plain: a Group with a paragraph or a
  heading. Nothing that draws the eye away from the panel.
- No browser chrome, no macOS window frame, no cursor.

**On the viewport:** driving the browser from a tool, `resize_window` reported
success and changed nothing — `innerWidth` stayed at whatever the window already
was. Set the window by hand and **assert `window.innerWidth` before capturing**,
rather than trusting the resize.

---

## 4. The three shots

### screenshot-1 — the panel doing its job, **and the canvas agreeing**

1000 × 580. *This is the one that has to be right; it is the product.*

Set up:

- A **Group** block selected in the post editor, inspector open.
- The **Spacery** panel expanded, `Dimensions` collapsed above it.
- Narrow the canvas until the panel header names a tier and its boundary — it
  should read **`Laptop · ≤1024px`**.
- **Padding**: `px`, unlinked, top and bottom authored, left and right left
  blank so the inherited values show as placeholders. The difference between a
  typed value and an inherited one is a real feature and it is legible here.
- **Margin**: two sides only (that is `core/group`'s
  `supports.spacing.margin`), untouched.

What the frame must contain, in priority order:

1. The tier header naming the breakpoint and its boundary.
2. The authored fields *and* the inherited placeholders.
3. **Enough of the canvas to see the block's padding actually applied.** This
   is what D36 made possible and what nothing before could show. If the crop
   has to choose, keep the canvas edge.

### screenshot-2 — the responsive spacer

900 × 640.

- A **Responsive Spacer** block selected; the block card reads
  **`Responsive Spacer`**.
- **Height** open, `Default` at 100px with its help line.
- Tier selector on **Tablet**, header `Tablet · ≤782px`, the field **blank with
  its inherited value as the placeholder**, and the provenance line reading
  **`Inherited from Laptop`**.
- **Set at** open, showing the whole set at a glance: Desktop —, Laptop 80px,
  Tablet (editing) —, Mobile 32px.

The claim is "a height per breakpoint, which core's Spacer cannot do", so the
per-tier list and the inheritance line are the two things that must survive the
crop.

### screenshot-3 — the settings screen

1120 × 485.

- **Spacery** in the admin menu.
- The four source options visible, with **Spacery's own** selected.
- The **In use now** ruler beneath it, with its four bands and the axis, and the
  `Covers` wording legible — `over 782px, up to 1024px`, `up to 480px`. The
  ruler is the most distinctive thing on the screen and it explains the whole
  model without a word of documentation.
- The breakpoint table below, populated, no error states.

Do **not** capture a conflict or caution state. They are good design and a bad
first impression.

---

## 5. Done when

- [ ] Three PNGs at the exact sizes above, in `assets/`, named
      `screenshot-1.png` … `screenshot-3.png`
- [ ] Every pixel of interface is a capture, not a redraw
- [ ] All three from one environment, one viewport, one breakpoint set
- [ ] The `== Screenshots ==` block from `docs/readme-screenshots.txt` added to
      `readme.txt`, three lines, in file order, no gaps
- [ ] `python3 bin/check-release.py` still passes
- [ ] `docs/asset-handoff.md`'s "Still outstanding" list updated

Screenshots are SVN-side, so none of this blocks submission — but shot 1 is the
first thing a visitor to the plugin page looks at, and it is now the first time
it can show the plugin working rather than merely present.
