# WordPress.org assets

The files in [`../assets/`](../assets/) are the icon and banner shown on the
plugin's directory page. They are **not** shipped in the plugin zip —
`.distignore` and `package.json#files` both keep that directory out of it.
`release.yml` uploads it separately, into the `assets/` directory of the
WordPress.org SVN repository, which is a top-level directory alongside `trunk`.

## What is there

| File | Size |
|---|---|
| `icon-128x128.png` | 128 × 128 |
| `icon-256x256.png` | 256 × 256 |
| `icon.svg` | vector |
| `banner-772x250.png` | 772 × 250 |
| `banner-1544x500.png` | 1544 × 500 |

## Where they come from

They are exports from the design file, not generated in this repository.
`bin/make-assets.py` used to draw an approximation of them and has been
removed: it had drifted from the artwork it claimed to produce — the same mark,
but different geometry and no antialiasing — and a script that silently
replaces approved assets with something else is worse than no script at all.

[`asset-brief.md`](asset-brief.md) section 2 is the specification instead: the
palette, the type, and the mark's geometry as exact fractions of its box.
Change it there first, then re-export all four raster files together, so the 1×
and 2× variants cannot drift apart. That was the one property the generator was
protecting, and it is cheap to keep by hand for four files that change almost
never.

## Keep the directory to what WordPress.org expects

`release.yml` passes `ASSETS_DIR: assets`, so **everything** in it is published
to the SVN assets folder. Only files the directory itself reads belong there:
`icon-*`, `banner-*`, `icon.svg` and `screenshot-N.png`. Notes and staging
copies live here in `docs/` — which is why
[`readme-screenshots.txt`](readme-screenshots.txt) sits here rather than beside
the images it describes.

## Still outstanding

Nothing. The screenshots were captured on 15 September and
`assets/screenshot-1.png` ... `-3.png` sit beside the icons and banners, with
the matching `== Screenshots ==` block in `readme.txt`.
[`screenshot-brief.md`](screenshot-brief.md) records how they were taken and
what to repeat if they are ever retaken; `readme-screenshots.txt` is now the
captions alone, which is the one thing that must not drift from the files,
because they are matched **by position**.

See https://developer.wordpress.org/plugins/wordpress-org/plugin-assets/
