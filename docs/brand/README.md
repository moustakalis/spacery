# Brand reference

Not WordPress.org assets — these are for your own use (README headers, a site,
slides). The directory files live in `../../assets/`.

| File | What it is |
|---|---|
| `mark.svg` | The mark, at the authored 8 / 6 / 4 weights on a 77-unit grid. The one mark, used at every size. |
| `mark-three-bar.svg` | The superseded direction, kept so the change is legible. Not for use. |
| `logo-compact.png` | Mark + wordmark, no tagline, at 2×. Mark sized to the wordmark's cap-height. |
| `icon-48.png` | The 128 icon rendered down to 48 — the size the plugins screen and search results use. Reference for judging, not for upload. |

The admin menu icon is not here. It is the same six rects as `mark.svg`, and
keeping a second copy of them is how the two drift apart, so it lives as
readable markup in `includes/Settings/Screen.php` where it is used — with the
constraints WordPress's own `svg-painter.js` imposes recorded beside it.

Both are captures of `Spacery Banner.dc.html`, which is also where the
uploadable icon and banner in `../../assets/` come from. `../asset-brief.md`
section 2 carries the geometry those exports have to hit, and `../assets.md`
explains what that directory is for.
