# Spacery assets — handoff

Mark direction **7a** (the broken square, accent side repeated at falling
weights) selected. Everything below is generated from that geometry.

## Copy into `assets/`

The icon and the banner. **The screenshots are not here**: the ones this
document used to list were never produced, and
[`screenshot-brief.md`](screenshot-brief.md) is where they are specified now.

| From | To | Size |
|---|---|---|
| `out/icon-128x128.png` | `assets/icon-128x128.png` | 128 × 128 |
| `out/icon-256x256.png` | `assets/icon-256x256.png` | 256 × 256 |
| `out/icon.svg` | `assets/icon.svg` | vector |
| `out/banner-772x250.png` | `assets/banner-772x250.png` | 772 × 250 |
| `out/banner-1544x500.png` | `assets/banner-1544x500.png` | 1544 × 500 |

## No generator

The repository no longer keeps one. `bin/make-assets.py` drew an approximation
of this mark and had drifted from the exports above — same design, different
geometry and antialiasing — so it was removed rather than repaired. The files
in the table are the artwork; `asset-brief.md` section 2 is the specification
they answer to. Run `python3 bin/check-release.py` after copying them in.

## The banner tagline, and how to change it again

D33 changed the tagline to *Responsive controls at your breakpoints*, and the
banners were the last surface still carrying the old one. **They were amended
rather than redrawn**, because redrawing the mark is exactly what
`make-assets.py` got wrong. Nothing was re-drawn: the tagline was re-set, and
the lockup was then translated — every pixel of the mark and the wordmark is
bit-identical to before, checked, and only its `x` changed.

The type was recovered by measurement rather than guessed, and it is written
down here so the next change is cheap:

| | |
|---|---|
| Face | Poppins, weight 300 (Light) |
| Size / tracking | `21px` / `letter-spacing: 0.1px` |
| Colour | `rgb(168, 163, 200)` |
| Ink left edge | `x = 269` — flush with the `S` of the wordmark |
| Ink top | `y = 151`; descenders reach 173 |
| 1544 × 500 | **the same CSS**, captured at `deviceScaleFactor: 2` — not 42px at 1× |

**The background needs no reconstruction.** Both banners are a pure vertical
gradient: every row is one colour from edge to edge (checked at every 64th
pixel across several rows), so masking the band means filling each row with the
colour already at `x = 2` on that row.

**Verify by reproducing the old line first.** Render the *previous* tagline with
the settings above, composite it over the masked band, and compare with the
untouched original — RMS **18.5** at 772 and **15.4** at 1544, against **44.4**
and **45.3** for a band left blank. That is what pins the size and tracking;
searching on RMS alone does not, and picked a 400 weight that is visibly heavier
when the two are put side by side. **Look at the two lines at 3× before
believing a number.**

### The lockup is centred, and a longer tagline moves it

Not stated anywhere before, and it is a constraint, not a preference: the
artwork as delivered put the whole lockup — mark, wordmark and tagline — at
**137px from the left and 136px from the right** at 772, and **274 / 273** at
1544. Exact to a pixel in both, at two sizes. That is a rule.

So the tagline's length is the lockup's width, and a longer line does not simply
extend to the right: it re-centres everything. *Responsive controls at your
breakpoints* is 417px against the previous line's 367, which alone would have
left margins of **137 / 86** — the lockup visibly shoved left. The mark and
wordmark were therefore **translated 25px left at 772 and 50px at 1544**, giving
**112 / 111** and **224 / 224**.

**Translating is safe here, and the reason is the gradient.** Away from the
lockup the background varies across a row by at most **2 / 255** (measured on
every pixel of every row, not sampled), so a rectangle of artwork carries a
background that matches wherever it lands. Cut the lockup's bounding box with a
3px pad, refill the vacated span per row, paste at the new `x`. Verified after:
**zero pixels differ inside the moved lockup.**

A tagline much longer than this one would run out of room rather than re-centre:
at 772 the lockup cannot exceed about 500px without the margins dropping below
the mark's own width. Measure a candidate before adopting it.

## readme.txt, and what is in each screenshot

**Both moved to [`screenshot-brief.md`](screenshot-brief.md).**

What stood here was a caption block with **two** entries under a sentence saying
there were **three**, beside a description of three screenshots that were HTML
recreations of the editor rather than captures of it, and which were never
shipped. `readme.txt` still has no `== Screenshots ==` section, correctly — a
section pointing at files that do not exist renders as broken images.

The sizes those files were specified at are kept, because the new set inherits
them: **1000 × 580**, **900 × 640**, **1120 × 485**.

---

## The mark

WordPress draws padding and margin as four bars centred on the sides of a
square with the corners open. 7a takes that shape, puts one side in the accent,
and repeats it twice below at falling weights.

```
frame sides   0.104 × box   white — bottom, left, right
accent side   0.104 × box   on the top edge
  repeat      0.078 × box
  repeat      0.052 × box
side length   0.532 × box   open corner 0.234 at each end
gap           0.143 × box   equal above both repeats
```

**The repeats lose weight, not length.** A side does not get shorter at a
narrower breakpoint, its value gets smaller — so the three accent bars keep the
side's full length and step down in thickness: an even interval for desktop,
tablet, mobile. An earlier round of these explorations shortened them instead,
which said the wrong thing.

**The accent side is identical to the three plain ones** but for colour — same
thickness, length and radius, on the frame's edge — so the square stays closed
and even and the accent reads as one of its sides.

**No optical correction.** The frame is a symmetrical square; centring its box
centres the mark. The nudge the old marks needed does not apply.

**Banner geometry.** The mark is a square, so its ink is exactly `box` tall.
Setting `box = 0.34 × height` makes that the wordmark's cap-height-to-baseline
span, which puts the accent side's top edge on the cap-height and the frame's
bottom edge on the tagline's baseline. Verified on the export: mark ink 83–166
against a type span of 82–167, horizontal ink centre 385.5 against a 386
midpoint. Wordmark-to-tagline stays `0.072 × height` — Poppins Bold's
descenders overhang the line box, so a gap taken from the bbox runs the tagline
into the "p".

**Known weakness, worth your judgement.** The thinnest repeat is 4px at 128 and
about 1.5px at 48, where it greys out — the frame and the heaviest accent side
carry the mark at that size. Separately: with three accent bars stacked in the
upper half, the 256 icon can read as a list or text-alignment glyph rather than
a box. Both are inherent to 7a rather than bugs. If either bothers you, the fix
is to raise the weights to 0.104 / 0.088 / 0.070, or to drop to two accent bars.

## Source files

- `Spacery Screenshots.dc.html` — the two editor states, live. **Superseded:**
  it is the source of the HTML recreations, which are not what ships; see
  [`screenshot-brief.md`](screenshot-brief.md)
- `Spacery Banner.dc.html` — the banner at 772 × 250, captured at 1× and 2×
- `Spacery Mark.dc.html` — the three directions, with 1b as chosen

## Still outstanding

Nothing. The three screenshots were captured on 15 September and are in
`assets/` as `screenshot-1.png`, `-2` and `-3`, with the `== Screenshots ==`
block in `readme.txt`. How they were made, and the two things this handoff got
wrong about them, are in [`screenshot-brief.md`](screenshot-brief.md).
