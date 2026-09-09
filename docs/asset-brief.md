# Asset brief — Spacery

A handoff for producing Spacery's WordPress.org directory assets. Written to be
read cold: everything needed to execute it is here, including the design that
already exists, so it can be matched, refined or deliberately replaced.

Two of the five asset types are already generated and acceptable. The
screenshots are not, and are the reason this brief exists — they need a running
WordPress, which no generator can supply.

---

## 1. What Spacery is

A WordPress plugin that adds **responsive spacing** — padding and margin that
change at breakpoints — to any block in the editor.

WordPress 7.1 added responsive block styles with exactly two breakpoints, mobile
and tablet. Spacery gives a site as many as its design system has, from its
theme, from Spacery's own preset, or defined by hand — and applies them to any
block that declares spacing support, including blocks from other plugins.

The feeling to convey: **precise, calm, native to the editor.** Not playful, not
enterprise. It looks like something WordPress could have shipped. It is a tool
for people who care that 24px is not 32px.

Avoid: rulers, tape measures, arrows-between-brackets, "responsive" device
triptychs (phone/tablet/laptop). All four are the obvious answer and all four
are already crowded in the directory.

---

## 2. The existing design

Exported from the design file, not generated in this repository. What follows
is the specification those exports have to hit: if you change the palette, the
mark or the type, **change it here first**, then re-export all four raster
files together so 1× and 2× cannot drift apart.

### Palette

| Role | Hex | Notes |
|---|---|---|
| Background | `#141327` | Near-black indigo |
| Background lift | `#201E3E` | Top of a vertical gradient to `#141327` |
| Bar / text | `#FFFFFF` | |
| Accent | `#8B7CFF` | Violet. The top side and its two repeats |
| Muted text | `#A8A3C8` | Tagline |

### Type

Poppins — Bold for the wordmark, Light for the tagline. Geometric, close to the
editor's own feel without imitating it. Any humanist geometric sans is an
acceptable substitute; the wordmark is set in title case as **Spacery**.

Tagline: *Responsive spacing for every block*

### The mark

The block editor's own padding control: four bars centred on the sides of a
square with the corners left open. That shape is already what a WordPress user
associates with spacing, which is the point of borrowing it — the mark starts
from the vocabulary the plugin's own inspector uses.

One side is drawn in the accent and then repeated twice below it, thinner each
time. As fractions of the mark's bounding box:

```
frame sides       thickness 0.104   ← white; bottom, left, right
accent side       thickness 0.104   ← accent #8B7CFF, on the top edge
  repeat          thickness 0.078
  repeat          thickness 0.052
side length       0.532             ← so the open corner is 0.234 at each end
gap between       0.143             ← equal above both repeats
```

Corner radius is half each bar's own thickness, so every bar is a capsule.

**The repeats lose weight, not length.** A side does not get shorter at a
narrower breakpoint — its value gets smaller — so all three accent bars keep the
side's full length and step down in thickness instead: 0.104, 0.078, 0.052, an
even interval for desktop, tablet, mobile. An earlier draft shortened them
instead, which said the wrong thing.

**The accent side matches the plain ones exactly** — same thickness, same
length, same radius, sitting on the frame's edge — so the square stays closed
and even, and the accent reads as one of the box's sides rather than an added
element. Only its colour differs.

**No optical correction.** The frame is a symmetrical square, so centring its
bounding box centres the mark.

**Known weakness.** The thinnest repeat is `0.052 × box`, which is 4px in the
128 icon and about 1.5px in the 48px rendering the plugins screen uses. It
greys out there. The mark still reads, because the frame and the heaviest accent
side carry it, but if the 48px case ever has to be perfect, raise the three
weights to 0.104 / 0.088 / 0.070 and accept a smaller difference between them.

This replaces the two-slab mark and, before it, the three-bar stack shipped
prior to 1.0.0. The palette, the type and the tagline are unchanged.

---

## 3. Deliverables

All files go in `assets/` in this repository. They are **not** shipped in the
plugin zip — `.distignore` and `package.json#files` both exclude them, and
`bin/check-release.py` fails the build if that stops being true. The release
workflow uploads them to the `assets/` directory of the WordPress.org SVN
repository.

### 3.1 Icon — done, replace only if improving on it

| File | Size |
|---|---|
| `icon-128x128.png` | 128 × 128 |
| `icon-256x256.png` | 256 × 256 |

Rounded square, corner radius `0.22 × size`, mark at `0.60 × size` centred
geometrically. Transparent outside the rounded square.

The 128px version is what appears in search results and the plugins screen, so
it is the one that decides whether the icon works. Judge it at that size, not
zoomed in.

Optional: WordPress.org also accepts `icon.svg`, used in preference to the PNGs
where supported. If you produce one, keep `icon-256x256.png` as the fallback.

### 3.2 Banner — done, replace only if improving on it

| File | Size |
|---|---|
| `banner-772x250.png` | 772 × 250 |
| `banner-1544x500.png` | 1544 × 500 (exactly 2×) |

Current composition: the mark and the text block set as one lockup, centred
horizontally and vertically. The mark is `0.46 × height` with a `0.184 × height`
gutter before the text; the wordmark is `0.224 × height`, the tagline
`0.084 × height`, and the space between them `0.072 × height`.

Two constraints produced those numbers rather than taste:

- **The mark is sized to the type, not to the banner.** `0.46 × height` makes
  the mark exactly as tall as the wordmark's cap-height-to-baseline span, so the
  thick slab's top lands on the cap-height and the thin slab's bottom on the
  tagline's baseline. A mark taller than that span can meet one end or the other
  but not both, and the accent slab then hangs below the tagline's descenders.
- **The wordmark-to-tagline gap is measured to the ink, not the bounding box.**
  Poppins Bold's descenders overhang its line box; a gap derived from the bbox
  puts the tagline's cap-height into the "p" of *Spacery*.

The lockup is centred rather than set against the left edge because the banner
is cropped horizontally at narrow viewports, and a lockup anchored to the left
loses the mark in the cropped case.

Constraints that matter more than they look:

- The banner is **cropped and scaled** at different viewport widths. Keep
  everything meaningful inside the middle 80% horizontally and away from the
  bottom edge.
- No screenshots, no feature lists, no version numbers inside the banner. It
  ages badly and the directory frowns on it.
- The 2× file must be the same design at exactly double, not a different crop.

### 3.3 Screenshots — outstanding, the real work

Named `screenshot-1.png`, `screenshot-2.png`, … in `assets/`. Their **order must
match** a `== Screenshots ==` list in `readme.txt`, which is deliberately absent
right now: a section pointing at files that do not exist renders as broken
images on the plugin page. Add the section in the same order when the files
exist.

Capture on a clean WordPress 7.1 site with Twenty Twenty-Five, the plugin
active, at a **1280px-wide viewport**, in light mode, with the admin colour
scheme left at default. Crop to the relevant region rather than shipping a full
desktop screenshot — the directory renders these fairly small.

**Screenshot 1 — the panel doing its job.** A Group block selected in the post
editor, inspector open, the **Responsive spacing** panel expanded. The canvas
should be narrow enough that the panel header names a tier and its boundary —
it reads `Laptop · ≤1024px` or similar. At least one padding field filled in, at
least one left blank so the inherited placeholder shows. This is the one
screenshot that has to be right; it is the product.

Caption: *Padding and margin per breakpoint, on any block that supports spacing.*

**Screenshot 2 — where breakpoints come from.** The Spacery admin screen, showing the
four source options and the **In use now** panel beneath, with its resolved
tiers and their bands (`over 782px, up to 1024px`, `up to 480px`). Choose
**Spacery's own** so four tiers are listed rather than the theme's two.

Caption: *Choose one source of breakpoints — your theme, Spacery's preset, or
your own. They are never mixed.*

**Screenshot 3 — the spacer.** The `spacery/spacer` block selected with the
Height panel open, showing a height set at one breakpoint and inherited at
another, so the *Inherited from Laptop* provenance line is visible.

Caption: *A spacer whose height changes at every breakpoint — which the core
Spacer block still cannot do.*

Optional fourth, only if it photographs well: the takeover notice, on a block
where WordPress already sets a tablet padding, reading *WordPress already sets 1
value here for narrower screens* with the **Manage these in Spacery** button.

---

## 4. How to run the site for screenshots

```bash
pnpm install
pnpm run build
pnpm run env:start     # WordPress 7.1 on PHP 8.2, needs Docker
```

Then `http://localhost:8888/wp-admin`, user `admin`, password `password`.
Activate Spacery under Plugins if it is not already.

For screenshot 2, the Spacery screen in the admin menu. For 1 and 3, create a post and insert a
Group or a Spacery block.

---

## 5. Done when

- [ ] `icon-128x128.png` and `icon-256x256.png` present, and the 128 reads at
      actual size
- [ ] `banner-772x250.png` and `banner-1544x500.png` present, the second exactly
      double the first
- [ ] `screenshot-1.png` … `screenshot-N.png` present
- [ ] `== Screenshots ==` added to `readme.txt`, captions in file order
- [ ] Section 2 of this brief updated if the palette, mark or type changed, and
      all four raster files re-exported together
- [ ] `python3 bin/check-release.py` still passes
