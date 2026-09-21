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
| `screenshot-1.png` … `-3.png` | as captured |
| `blueprints/blueprint.json` | — |

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

`release.yml` and `assets.yml` both pass `ASSETS_DIR: assets`, so
**everything** in it is published to the SVN assets folder. Only files the
directory itself reads belong there: `icon-*`, `banner-*`, `icon.svg`,
`screenshot-N.png` and `blueprints/blueprint.json`. Notes and staging copies
live here in `docs/` — which is why
[`readme-screenshots.txt`](readme-screenshots.txt) sits here rather than beside
the images it describes.

## Publishing a change to `assets/` on its own

**Use the `Assets` workflow, not `release.yml`.** The SVN `assets/` directory
is a sibling of `trunk/` and carries no version, but
`action-wordpress-plugin-deploy` refuses to run at all once `tags/$VERSION`
exists — so once a version is published, `release.yml` can no longer correct a
banner, a screenshot or the blueprint. `.github/workflows/assets.yml` exists for
exactly that. It runs `action-wordpress-plugin-asset-update` against the same
`SVN_USERNAME`/`SVN_PASSWORD` secrets, touches `assets/` and nothing else, and
fires automatically on a push to `main` that changes that directory. Run it by
hand from the Actions tab when you want to force it:

```
gh workflow run assets.yml
```

**`IGNORE_OTHER_FILES: true` is load-bearing, and its name undersells it.**
Without it the action is not an assets action at all: seeing a `.distignore`,
its `deploy.sh` rsyncs the **whole workspace** into `trunk/` with
`--delete --delete-excluded`, and only then refuses to commit if anything but
`readme.txt` changed there. The first run failed exactly that way. `build/` is
gitignored and this workflow runs no build, so all thirteen bundles came back
`!` missing in `trunk/` — and the line after the guard is
`svn status | grep '^\!' | xargs svn rm`. **The guard was the only thing
between that run and a commit deleting the plugin's JavaScript and CSS from the
directory**, for every installed site, with no force-push and no undo. With the
flag set, the script copies `readme.txt` into `trunk/` and rsyncs `assets/` into
`assets/`, and touches nothing else.

Two consequences worth knowing. The action **does** update `readme.txt` in
`trunk/` and in `tags/<Stable tag>/`, by design — so listing copy can be fixed
without a release, and an unintended `readme.txt` edit reaches users through
this workflow rather than through `release.yml`. And the action's behaviour is
worth re-reading rather than remembering: it is one file, fetched from
`raw.githubusercontent.com/10up/action-wordpress-plugin-asset-update/stable/deploy.sh`,
and reading it is what found all of the above.

## The Live Preview blueprint

`assets/blueprints/blueprint.json` is what turns on the **Live Preview** link on
the directory page — the one that boots the plugin in WordPress Playground.
Until it exists in SVN, the plugin's admin page says *"Missing or invalid
blueprint.json file"* and the **Toggle Live Preview** button does nothing.
Committing it is half the job; a committer then has to set the preview to public
in the plugin's **Advanced** view.

Four things about it that are not obvious, and that
[`../bin/check-blueprint.py`](../bin/check-blueprint.py) now enforces:

- **It must not install Spacery.** The directory appends its own
  `installPlugin` step, pointing at the version being previewed. A second one in
  the file would install the *published* copy over it — which is precisely the
  version you are not testing.
- **The landing page names a post id, and the blueprint has to create it.**
  `wp_insert_post()` honours `import_id`, so the demo page is forced to `9000`
  on a fresh Playground and `landingPage` opens `9000` for editing. The two are
  checked against each other, because they will be edited months apart.
- **Breakpoints are seeded through `siteOptions`.** `spacery_breakpoint_source`
  is set to `spacery`, so the preview offers the four-tier preset rather than
  core's two widths — the plugin's headline claim, visible without touching the
  settings screen first.
- **WordPress.org validates it silently.** There is no error beyond that one
  line and no way to retry except another Subversion commit, so CI validates it
  against Playground's own published schema before it can be pushed.

To try the blueprint before committing it, Playground will run one straight from
the URL fragment:

```
open "$(python3 bin/preview-url.py)"
```

That script prepends the `installPlugin` step the directory would have added, so
what boots is this blueprint against the **published** release. Use it to check
the demo page and the landing URL; it cannot show you anything that exists only
in the working tree.

See https://developer.wordpress.org/plugins/wordpress-org/previews-and-blueprints/

## Still outstanding

Nothing. The screenshots were captured on 15 September and
`assets/screenshot-1.png` ... `-3.png` sit beside the icons and banners, with
the matching `== Screenshots ==` block in `readme.txt`.
[`screenshot-brief.md`](screenshot-brief.md) records how they were taken and
what to repeat if they are ever retaken; `readme-screenshots.txt` is now the
captions alone, which is the one thing that must not drift from the files,
because they are matched **by position**.

See https://developer.wordpress.org/plugins/wordpress-org/plugin-assets/
