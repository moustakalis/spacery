#!/usr/bin/env bash
#
# Downloads the core sources the test suites compare against and run on.
#
# Two things are fetched, both from the same pinned WordPress:
#
#   WP_Theme_JSON  - the contract suite compares Spacery's generated media
#                    queries and boundary validation against core's own.
#   Style Engine   - the unit suite runs Spacery's generator through the REAL
#                    style engine, because that is what decides property naming,
#                    preset variable resolution and at-rule nesting. Stubbing it
#                    would leave the most consequential step untested.
#
# Pinned to Spacery's minimum supported WordPress. Raising it is a deliberate
# act: it means re-checking that core still behaves the way Spacery expects.
#
set -euo pipefail

WP_REF="${1:-7.1.0}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="$ROOT/tests/contract/core"
BASE="https://raw.githubusercontent.com/WordPress/wordpress-develop/${WP_REF}/src/wp-includes"

mkdir -p "$DEST/style-engine"

curl -fsSL "$BASE/class-wp-theme-json.php" -o "$DEST/class-wp-theme-json.php"
curl -fsSL "$BASE/style-engine.php"        -o "$DEST/style-engine/style-engine.php"

for class in \
  class-wp-style-engine.php \
  class-wp-style-engine-css-rule.php \
  class-wp-style-engine-css-declarations.php \
  class-wp-style-engine-css-rules-store.php \
  class-wp-style-engine-processor.php
do
  curl -fsSL "$BASE/style-engine/$class" -o "$DEST/style-engine/$class"
done

echo "Fetched core sources from wordpress-develop@${WP_REF}"
