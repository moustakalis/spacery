#!/usr/bin/env bash
#
# Regenerates languages/spacery.pot, by scanning the distributable.
#
# **The references in a POT decide which file a JavaScript translation is
# written into.** `_load_script_textdomain_from_src()` looks for
# `<domain>-<locale>-<md5>.json` in `WP_LANG_DIR/plugins`, where the md5 is of
# the registered script's path relative to the plugin root -- `build/settings.js`.
# `wp i18n make-json` derives that filename from the references it finds in the
# `.po`, which come from this POT. So a POT that references sources produces
# payloads named after paths core never hashes: files nothing will ever open,
# which look exactly like working ones. That is what this file used to do, and a
# bundled Greek `.json` passed to `wp_set_script_translations()` was hiding it.
#
# **What this POT does not decide is the name of a real language pack's files,
# and an earlier version of this header said that it did.**
# translate.wordpress.org never sees this file -- `/languages` is in
# `.distignore` and out of `package.json#files`, so it reaches neither the zip
# nor SVN. GlotPress extracts its own originals from `trunk/`. Measured on
# 21 September 2026: `svn ls` gives `trunk/` six entries and no `languages/`,
# while translate.wordpress.org holds 136 originals whose references are
# `build/*.js`, `build/blocks/spacer/block.json`, `includes/**.php` and
# `spacery.php` -- the same ten files, with the same per-file counts, as this
# POT. **The packaging list is what names a pack**, and this POT is a local
# model of what WordPress.org's own extraction will produce from it.
#
# The model is what makes the mistake visible before a release rather than
# after one, and it is a model only while it scans the same files -- which is
# what the guard below checks.
#
# So the scan runs over a copy of exactly what ships: `build/`, `includes/` and
# `spacery.php`, laid out as they are in the zip. The block's metadata is read
# from `build/blocks/spacer/block.json` for the same reason -- that is the copy
# core registers.
#
# **WP-CLI reads the minified bundles.** That was measured rather than hoped:
# `wp i18n make-pot` over `build/` extracts all 119 JavaScript strings, the same
# set the old transpile-first pass produced and nothing extra. Two translator
# comments are lost, on "Spacery" and on "css", where minification moved the
# comment off the front of the call. The line references become
# `build/extension.js:1`, which tells a translator nothing about where a string
# lives; that is the price of the file WordPress actually hashes, and it is
# recorded here so nobody pays it twice by accident.
#
# The previous approach transpiled `src/**` with `tsc` because WP-CLI cannot
# parse TypeScript. None of that is needed now, and neither is `tsc`.
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCAN="$(mktemp -d)"
trap 'rm -rf "$SCAN"' EXIT

WP_CLI="${WP_CLI:-wp}"

# A .phar is not executable on its own, so run it through PHP.
if command -v "$WP_CLI" >/dev/null 2>&1; then
  WP_RUN=("$WP_CLI")
elif [ -f "$WP_CLI" ]; then
  WP_RUN=(php "$WP_CLI")
else
  echo "wp-cli not found. Install it, or set WP_CLI to a wp-cli.phar." >&2
  exit 1
fi

BUNDLES=(
  build/extension.js
  build/settings.js
  build/blocks/spacer/index.js
  build/blocks/spacer/block.json
)

for bundle in "${BUNDLES[@]}"; do
  if [ ! -f "$ROOT/$bundle" ]; then
    echo "$bundle is missing. Run 'pnpm run build' first." >&2
    exit 1
  fi
done

# There is deliberately no mtime check for a stale build here, and the reason
# is worth keeping: webpack's `output.compareBeforeEmit` is on by default, so a
# bundle whose contents did not change is *not rewritten* and keeps its old
# mtime. A blanket "is any source newer than the oldest bundle" rule therefore
# refuses on a perfectly fresh build -- measured, on a build one minute old
# whose spacer bundle was two days older than the sources feeding it, because
# nothing in it had changed. Freshness is guaranteed instead by building:
# `pnpm run i18n:pot` runs `pnpm run build` first.

# The list below is a *third* declaration of what ships, beside
# `package.json#files` and `.distignore` -- and `bin/check-release.py` checks
# those two against each other and knows nothing about this one. A distributable
# that grows a PHP or JS file this scan does not copy produces a POT that is
# valid, current and green in CI, and quietly missing that file's strings. Worse,
# it breaks the property the header above rests on: that this POT models what
# WordPress.org extracts from `trunk/`. So the packaging list is checked against
# the scan here rather than trusted to stay in step.
#
# `readme.txt` and `LICENSE` are excluded on purpose. WP-CLI would not read
# either, and `readme.txt` is translated as its own project on
# translate.wordpress.org (the "Stable Readme" sub-project), not as part of this
# POT.
SCANNED=(build includes spacery.php uninstall.php)
NOT_SCANNED=(readme.txt LICENSE)

while read -r shipped; do
  [ -n "$shipped" ] || continue
  known=no

  for entry in "${SCANNED[@]}" "${NOT_SCANNED[@]}"; do
    [ "$shipped" = "$entry" ] && known=yes
  done

  if [ "$known" = no ]; then
    echo "package.json#files ships '$shipped', which bin/make-pot.sh does not know about." >&2
    echo "Copy it into the scan and add it to SCANNED, or add it to NOT_SCANNED with a reason." >&2
    exit 1
  fi
done < <(node -p "require('$ROOT/package.json').files.join('\n')")

# The distributable, laid out as the zip lays it out.
cp -R "$ROOT/build" "$SCAN/build"
cp -R "$ROOT/includes" "$SCAN/includes"
cp "$ROOT/spacery.php" "$SCAN/spacery.php"
cp "$ROOT/uninstall.php" "$SCAN/uninstall.php"

mkdir -p "$ROOT/languages"

"${WP_RUN[@]}" --allow-root i18n make-pot "$SCAN" "$ROOT/languages/spacery.pot" \
  --domain=spacery \
  --headers='{"Report-Msgid-Bugs-To":"https://github.com/moustakalis/spacery/issues"}'

# The guard the transpiling version had, kept for the same reason: a scan that
# quietly reads nothing produces a POT that is valid, small and wrong.
strings="$(grep -c '^msgid "' "$ROOT/languages/spacery.pot")"

if [ "$strings" -lt 100 ]; then
  echo "Only $strings strings were extracted. Refusing to write a POT that is missing most of the plugin." >&2
  exit 1
fi

echo "Wrote languages/spacery.pot ($strings strings)"
