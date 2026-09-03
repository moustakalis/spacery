# WordPress.org assets

Not shipped in the plugin zip — `.distignore` and `package.json#files` both keep
this directory out of it. These live in the `assets/` directory of the
WordPress.org SVN repository, which the release workflow uploads separately.

## Generated

| File | Size |
|---|---|
| `icon-128x128.png` | 128×128 |
| `icon-256x256.png` | 256×256 |
| `banner-772x250.png` | 772×250 |
| `banner-1544x500.png` | 1544×500 |

Run `python3 bin/make-assets.py` to regenerate them. Edit that file rather than
these, so the 1x and 2x variants cannot drift apart.

## Still outstanding

Screenshots. They need a running WordPress with the plugin active, so they
cannot be generated the way the icon and banner can. The order of the files has
to match a `== Screenshots ==` list in `readme.txt`, which is deliberately not
there yet: a section pointing at files that do not exist renders as broken
images on the plugin page.

Worth capturing, in this order:

1. The block inspector's Responsive spacing panel on a Group block, with a
   breakpoint being edited.
2. The settings screen, showing the three breakpoint sources and the resolved
   set beneath them.
3. The spacer block with a different height at two breakpoints.

Add `== Screenshots ==` to `readme.txt` in the same order when the files exist.

See https://developer.wordpress.org/plugins/wordpress-org/plugin-assets/
