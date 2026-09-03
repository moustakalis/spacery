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
cannot be generated the way the icon and banner can.

[`docs/asset-brief.md`](../docs/asset-brief.md) is the handoff: what each shot
must show, how to run the site to capture it, the palette and mark if anything
is being redrawn, and why `readme.txt` has no `== Screenshots ==` section until
the files exist.

See https://developer.wordpress.org/plugins/wordpress-org/plugin-assets/
