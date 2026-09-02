#!/usr/bin/env bash
#
# Regenerates languages/spacery.pot.
#
# Not a plain `wp i18n make-pot .`, for one reason: **WP-CLI cannot read
# TypeScript.** Its JavaScript scanner parses .js and .jsx, so pointing it at
# Spacery's source extracts the PHP strings and silently skips every string in
# the editor and the settings screen. The first run of this pipeline produced 24
# strings where there are 84, with no warning that anything had been missed.
#
# So the sources are transpiled to plain JavaScript first and the scan runs over
# that. `tsc` leaves `__( 'x', 'spacery' )` exactly as written -- `@wordpress/i18n`
# is an import, not a transform -- so the extracted strings and their line
# numbers correspond to the real files.
#
# `--jsx react-jsx` rather than `preserve`, and the reason is not JSX at all:
# it makes every output file `.js`. `wp i18n make-json` skips `.jsx` references
# entirely, so preserving JSX produced translation files for exactly one source
# file out of fourteen -- again with no warning.
#
# Type errors are ignored here on purpose. This pass exists to parse syntax, not
# to check types; `pnpm run typecheck` does that, against the real config, with
# the ambient declarations this pass deliberately does without.
#
# `--ignoreConfig` is required, not cosmetic. TypeScript 6 made it error TS5112
# to name files on the command line while a tsconfig.json exists, where 5.x
# merely proceeded. Without the flag nothing is emitted at all -- which is how
# this script first failed in CI, silently, because it was discarding tsc's
# output at the time. It no longer does.
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCAN="$(mktemp -d)"
trap 'rm -rf "$SCAN"' EXIT

WP_CLI="${WP_CLI:-wp}"
TSC="${TSC:-$ROOT/node_modules/.bin/tsc}"

# A .phar is not executable on its own, so run it through PHP.
if command -v "$WP_CLI" >/dev/null 2>&1; then
  WP_RUN=("$WP_CLI")
elif [ -f "$WP_CLI" ]; then
  WP_RUN=(php "$WP_CLI")
else
  echo "wp-cli not found. Install it, or set WP_CLI to a wp-cli.phar." >&2
  exit 1
fi

if [ ! -x "$TSC" ]; then
  echo "tsc not found at $TSC. Run 'pnpm install' first." >&2
  exit 1
fi

# PHP and block metadata are scanned as they are.
cp -R "$ROOT/includes" "$SCAN/includes"
cp "$ROOT/spacery.php" "$SCAN/spacery.php"
mkdir -p "$SCAN/src/blocks/spacer"
cp "$ROOT/src/blocks/spacer/block.json" "$SCAN/src/blocks/spacer/block.json"

# Everything else is transpiled, keeping its path so references stay meaningful.
cd "$ROOT"
mapfile -t sources < <(find src -name '*.ts' -o -name '*.tsx' | grep -v '\.d\.ts$')

"$TSC" --ignoreConfig \
  --outDir "$SCAN/src" --rootDir src \
  --module esnext --target es2022 --jsx react-jsx --moduleResolution bundler \
  --declaration false --sourceMap false --skipLibCheck \
  "${sources[@]}" > "$SCAN/tsc.log" 2>&1 || true

emitted="$(find "$SCAN/src" -name '*.js' | wc -l)"

if [ "$emitted" -lt 20 ]; then
  echo "Transpilation emitted $emitted files. Refusing to write a POT that would silently be missing JavaScript strings." >&2
  echo "--- tsc output ---" >&2
  cat "$SCAN/tsc.log" >&2
  exit 1
fi

mkdir -p "$ROOT/languages"

"${WP_RUN[@]}" --allow-root i18n make-pot "$SCAN" "$ROOT/languages/spacery.pot" \
  --domain=spacery \
  --headers='{"Report-Msgid-Bugs-To":"https://github.com/moustakalis/spacery/issues"}'

echo "Wrote languages/spacery.pot"
