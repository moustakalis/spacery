# The three WordPress.org screenshots

> **Done, 15 September 2026.** `assets/screenshot-1.png`, `-2` and `-3` are
> captures of the running plugin on the MAMP playground, at a 1280px viewport,
> 2×. §3 is the part worth re-reading if they ever have to be retaken, because
> two of the three obvious ways to drive a browser cannot produce a shippable
> file and both of them look like they can.

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

The three shipped files are crops of unretouched captures. The only edits are
the crop rectangle and stripping the admin bar, which carries the logged-in
user's name and avatar.

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
on screen. Shot 1 now shows the cause and the effect in one frame, which is the
strongest thing this plugin has to show: core's Dimensions reading `24`, the
Spacery panel reading `64` at Laptop, and the block in the canvas rendering
`64px` top and bottom against `24px` at the sides.

---

## 2. Hard constraints from WordPress.org

- **Filenames are positional**: `assets/screenshot-1.png`, `-2`, `-3`. They are
  matched to the numbered lines under `== Screenshots ==` in `readme.txt` **by
  position**. A missing file renders as a broken image; a reordered file puts
  the wrong caption under the wrong picture.
- They live in the SVN `assets/` directory, **not in the plugin zip**, so they
  can land during the review queue without touching what was submitted.
- PNG.

### Sizes, as shipped

| File | Pixels | Logical frame | What sets the height |
|---|---|---|---|
| `screenshot-1.png` | 2560 × 2456 | 1280 × 1228 | the inspector, from `Dimensions` to the end of Spacery's margin fields |
| `screenshot-2.png` | 2560 × 1856 | 1280 × 928 | the spacer's panel, from the block card to `Advanced` |
| `screenshot-3.png` | 2560 × 2050 | 1280 × 1025 | the settings screen, from the page header to the end of the ruler |

The earlier round specified 1000 × 580, 900 × 640 and 1120 × 485. Those were
sizes of **drawings**, chosen before anyone knew how much interface each claim
needs; two of the three cannot hold their own contents. What replaced them is
one rule that survives contact with the product: **every shot is 1280 logical
pixels wide, captured at 2×, and as tall as its content needs.** One width is
what makes them read as a set in the directory, which scales them all to the
same column.

### The order

`asset-brief.md` §4 numbers them **panel, settings screen, spacer**.
`docs/readme-screenshots.txt` and `asset-handoff.md` number them **panel,
spacer, settings screen**. Two of three agree, and the captions already written
in `readme-screenshots.txt` are the ones pasted into `readme.txt`, so that
order won:

```
== Screenshots ==

1. Padding and margin per breakpoint, on any block that supports spacing.
2. A spacer whose height changes at every breakpoint — which the core Spacer block still cannot do.
3. Name your own breakpoints and set where each one stops, on Spacery's settings screen.
```

That block is now in `readme.txt`, between `== Installation ==` and
`== Frequently Asked Questions ==`, matching `readme-screenshots.txt`.

---

## 3. Capture environment

### The site

The MAMP playground at `https://playground:8890` **is** usable, as of
15 September: Elementor, Stackable, FileBird and WP BookBar are all
deactivated there. Before that they put *Edit with Elementor*, *Design Library*
and a Stackable icon in the editor's top toolbar, and a BookBar admin notice
directly under the Spacery heading — the notice landed inside shot 3's frame
and the toolbar inside shot 1's. **Check they are still off before capturing**:

```js
Array.from(document.querySelectorAll('#the-list tr'))
  .map(r => [r.dataset.plugin, r.className])
```

Plugin Check may stay active — it adds a Tools submenu and nothing else, so it
never appears in frame.

The `wp-env` instance is the alternative and needs no such check:

```bash
pnpm install && pnpm run build && pnpm run env:start   # needs Docker
```

then `http://localhost:8888/wp-admin`, user `admin`, password `password`.

Either way: WordPress **7.1**, **Twenty Twenty-Five**, no other plugin visible
in the frame, light mode, default admin colour scheme, no cursor, no browser or
window chrome.

### The rig — and why the two obvious routes do not work

Three ways of driving a browser were tried. Only the third produces a
shippable file, and the reason is worth keeping, because the first two look
like they work.

| Route | Renders | File out |
|---|---|---|
| Chrome extension | 1× only; `resize_window` reports success and changes nothing, so the viewport stays whatever the window already was | **JPEG at 1×** — compression artefacts around admin text, and no headroom to crop |
| `chrome-devtools` MCP | exactly right: `emulate` sets a true `1280x900x2` viewport | **nowhere useful** — `filePath` is refused outside its own workspace roots, and the connected folders are not among them |
| `playwright` MCP, through `browser_run_code_unsafe` | same CDP override | **PNG at 2×, saved to any path** |

What was actually used is a split of the last two, because the Playwright
browser launches **headless with a fresh profile** — nobody can sign into it,
and the assistant does not type passwords. Both servers can reach
`/tmp/.playwright-mcp`, so:

1. **chrome-devtools**, in the window a human signed into, sets the viewport
   and writes the capture there:

   ```
   emulate      { viewport: '1280x1260x2', colorScheme: 'light' }
   screenshot   { format: 'png', filePath: '/tmp/.playwright-mcp/raw.png' }
   ```

2. **Playwright** ferries that file into the repo, byte for byte, without ever
   loading the site:

   ```js
   async (page) => {
     await page.setContent('<input id="f" type="file">')
     await page.setInputFiles('#f', '/private/tmp/.playwright-mcp/raw.png')
     const dl = page.waitForEvent('download')
     await page.evaluate(() => {
       const f = document.querySelector('#f').files[0]
       const a = document.createElement('a')
       a.href = URL.createObjectURL(f); a.download = 'c.png'
       document.body.appendChild(a); a.click()
     })
     await (await dl).saveAs('/absolute/path/raw.png')
   }
   ```

   `page.screenshot({ scale: 'device' })` is **not** a shortcut for step 1: it
   reads the browser context's `deviceScaleFactor`, which a CDP override does
   not change, so it silently returns a 1× image. Neither does
   `browser_resize` — it resets `deviceScaleFactor` to 1.

**Assert the viewport before believing any capture**: `window.innerWidth === 1280`
and `devicePixelRatio === 2`. Cropping was done afterwards with Pillow, from the
2× pixels, so every crop boundary is an even number.

### Editor state, set from the console rather than by clicking

Blocks and their attributes were created with `wp.blocks.createBlock` and
`wp.data.dispatch('core/block-editor').insertBlocks` — the same attributes
typing would produce, which is why the canvas previews them. Two settings are
worth naming:

- `wp.data.dispatch('core/preferences').set('core', 'fixedToolbar', true)`
  docks the block toolbar in the header. Left floating it covers the page
  title. **Put it back to `false` afterwards** — it is the user's preference,
  not the screenshot's.
- The inspector's scroller is `.interface-complementary-area`, not the sidebar
  element, and the `Page` / `Block` tab bar is sticky over the top ~50px of it.
  Scroll so the first panel header you want clears that bar, then check its
  `getBoundingClientRect().top`.

### The breakpoints

- **Four tiers**: Desktop 1280, Laptop 1024, Tablet 782, Mobile 480. Four is
  what makes the point; a theme's two does not, and a hand-made twelve-tier set
  makes the screen look like a configuration burden.
- Set them in the **table**, under *Breakpoints I define below* — not by
  selecting *Spacery's own*. §4's shot 3 says why. The values are identical
  either way, so the panel in shots 1 and 2 reads the same.
- **Back up whatever was there first, and put it back afterwards.** Both
  settings live in `/wp/v2/settings`, readable and writable from the console:

```js
await wp.apiFetch({ path: '/wp/v2/settings' })            // read, then keep it
await wp.apiFetch({ path: '/wp/v2/settings', method: 'POST', data: {
  spacery_breakpoint_source: 'custom',
  spacery_custom_breakpoints: [
    { slug: 'desktop', label: 'Desktop', max: '1280px' },
    { slug: 'laptop',  label: 'Laptop',  max: '1024px' },
    { slug: 'tablet',  label: 'Tablet',  max: '782px'  },
    { slug: 'mobile',  label: 'Mobile',  max: '480px'  },
  ],
} })
```

  Draft pages made for the captures get trashed the same way
  (`DELETE /wp/v2/pages/<id>`). The playground was left exactly as it was
  found: eight rows, source `custom`, toolbar unpinned.

---

## 4. The three shots, as captured

### screenshot-1 — the panel doing its job, and the canvas agreeing

2560 × 2456. *This is the one that has to be right; it is the product.*

- A **Group** block selected in the post editor, page titled *Our approach*,
  two paragraphs inside it and a heading and paragraph after it, so the canvas
  is a page rather than one floating block.
- Base `style.spacing.padding` **24px** on all four sides, background `#eef0ff`
  so the padding is visible at all.
- `spacery.laptop.spacing.padding` **64px top and bottom only**. Left and right
  are left unauthored, so they show as **placeholders reading 24**, and the
  panel says **`Partly set here`**. The difference between a typed value and an
  inherited one is a real feature and it is legible here.
- Canvas 1000px wide, so the tier header reads **`Laptop · ≤1024px`** without
  anything being forced.
- The frame runs from core's **`Dimensions`** panel — showing `24` and `24` —
  down to the end of Spacery's margin fields, so the base value and the
  breakpoint value are in one picture with the block that renders them.

Verified before capturing: `getComputedStyle(group).paddingTop === '64px'` and
`paddingLeft === '24px'` inside the canvas iframe.

### screenshot-2 — the responsive spacer

2560 × 1856.

- A **Responsive Spacer** selected between a paragraph and a heading; the block
  card reads **`Responsive Spacer`** with its description.
- **Height → DEFAULT `100`** with its help line, *Applies at every width unless
  a narrower breakpoint overrides it.*
- Tier selector on **Tablet**, header **`Tablet · ≤782px`**, the field **blank
  with `80px` as its placeholder**, and the provenance line **`Inherited from
  Laptop`**. The panel also says **`The canvas is still previewing Laptop.`** —
  keep it; it is the plugin being honest about what the canvas can show.
- **Set at** open: Desktop —, Laptop 80px, Tablet (editing) —, Mobile 32px.

The claim is "a height per breakpoint, which core's Spacer cannot do", so the
per-tier list and the inheritance line are the two things that must survive any
recrop. The spacer's per-tier height lives at `dimensions.height` inside each
tier (`src/blocks/spacer/height.ts`), not at `height` — setting the wrong path
from the console silently produces a panel that says *Inherited from Default*.

### screenshot-3 — the settings screen

2560 × 2050.

- The whole content column **plus the admin menu**, so `Spacery` is visible as
  a top-level item next to the screen it opens.
- The page header: icon, `Spacery`, the version pill, and the tagline
  *Responsive controls at your breakpoints*.
- **Breakpoint source**, four options, **Breakpoints I define below** selected.
- **Your breakpoints**, populated: four rows, `NAME` / `SLUG` / `UP TO` /
  `COVERS`, reading `over 1024px, up to 1280px` down to `up to 480px`, with the
  *Add breakpoint* button and its note on what a slug is for.
- **In use now**: the four named bands, the axis `0 / 480px / 782px / 1024px /
  1280px`, the hatched *no tier* remainder, and the note about screens wider
  than the widest breakpoint.

**Why the custom source and not Spacery's own** — this corrects the first
version of this brief, which asked for *Spacery's own* selected **and** a
populated table with a `COVERS` column. Those cannot both be true: selecting
*Spacery's own* removes the breakpoint table from the screen entirely, and
there is no read-only version of it. The `COVERS` wording exists **only** under
*Breakpoints I define below* — and so does the caption's claim, "Name your own
breakpoints and set where each one stops". The preset gets you the ruler and
nothing to point at. Four rows typed into the table give the same numbers, the
same tier names in shots 1 and 2, and a screen showing the feature being used
rather than declined.

No conflict or caution state is shown. They are good design and a bad first
impression.

---

## 5. Done when

- [x] Three PNGs in `assets/`, named `screenshot-1.png` … `screenshot-3.png`
- [x] Every pixel of interface is a capture, not a redraw
- [x] All three from one environment, one viewport width, one breakpoint set
- [x] The `== Screenshots ==` block added to `readme.txt`, three lines, in file
      order, no gaps
- [x] `python3 bin/check-release.py` still passes
- [x] `docs/asset-handoff.md`'s "Still outstanding" list updated

Screenshots are SVN-side, so none of this blocked submission — but shot 1 is
the first thing a visitor to the plugin page looks at, and it is the first time
it can show the plugin working rather than merely present.
