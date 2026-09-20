#!/usr/bin/env bash
#
# Compiles languages/*.po into the files WordPress loads from a language pack.
#
# Two kinds of output per locale:
#
#   spacery-<locale>.mo          PHP strings.
#   spacery-<locale>-<md5>.json  JavaScript strings, one per registered bundle.
#
# The md5 is of the script's path relative to the plugin root -- `build/settings.js`
# and its two siblings. That is the name `_load_script_textdomain_from_src()`
# looks for in `WP_LANG_DIR/plugins`, and `wp i18n make-json` derives it from
# the references in the POT, which is why `bin/make-pot.sh` scans `build/`.
#
# A pack from translate.wordpress.org arrives at those names too, but not
# because of anything in this repository: GlotPress extracts its own originals
# from `trunk/`, which contains `build/` and not `src/`. The two agree by
# construction rather than by transfer. `bin/make-pot.sh`'s header is the longer
# version of this paragraph, and records the measurement.
#
# **This used to merge make-json's output into one payload per script handle.**
# `<domain>-<locale>-<handle>.json` is tried first and does not depend on where
# the plugin is installed, which made it the better name -- but it is only ever
# tried inside the directory passed to `wp_set_script_translations()`, and
# Spacery no longer passes one. A handle-named file in `WP_LANG_DIR` is never
# looked at, so the fallback scheme is now the only scheme.
#
# **Nothing this writes ships.** `package.json#files` does not list `languages`.
# These files exist so the repository carries a Greek translation to seed
# translate.wordpress.org with, and so CI can install one as a pack and prove
# both halves of the pipeline load.
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LANGS="$ROOT/languages"
WP_CLI="${WP_CLI:-wp}"

if command -v "$WP_CLI" >/dev/null 2>&1; then
  WP_RUN=("$WP_CLI")
elif [ -f "$WP_CLI" ]; then
  WP_RUN=(php "$WP_CLI")
else
  echo "wp-cli not found. Install it, or set WP_CLI to a wp-cli.phar." >&2
  exit 1
fi

# Every script core will ask for translations of, by the path it will hash.
BUNDLES=(
  build/extension.js
  build/settings.js
  build/blocks/spacer/index.js
)

"${WP_RUN[@]}" --allow-root i18n make-mo "$LANGS" "$LANGS"

# Every .json in here is generated, so they all go before regenerating: a name
# nothing writes any more would otherwise sit there looking current. The
# previous glob tried to match only md5-shaped names and matched three of the
# four files it was aimed at, which is the sort of thing a hex-digit character
# class does quietly.
rm -f "$LANGS"/spacery-*.json
"${WP_RUN[@]}" --allow-root i18n make-json "$LANGS" --no-purge --pretty-print >/dev/null

# The names are the whole point, so they are asserted rather than assumed: a
# JSON named after a path core does not hash is a file nothing will ever open,
# and it looks exactly like a working one.
for po in "$LANGS"/spacery-*.po; do
  [ -e "$po" ] || continue
  locale="$(basename "$po" .po)"
  locale="${locale#spacery-}"

  for bundle in "${BUNDLES[@]}"; do
    hash="$(php -r 'echo md5( $argv[1] );' "$bundle")"
    expected="$LANGS/spacery-$locale-$hash.json"

    if [ ! -f "$expected" ]; then
      echo "No translations were written for $bundle in $locale." >&2
      echo "Expected $(basename "$expected"). The POT's references are probably not build/ paths; see bin/make-pot.sh." >&2
      exit 1
    fi
  done

  echo "$locale: .mo and ${#BUNDLES[@]} script payloads"
done
