#!/usr/bin/env bash
#
# Downloads the one core source file the contract tests compare against.
#
# Pinned to Spacery's minimum supported WordPress. Raising it is a deliberate
# act: it means re-checking that core's media-query shape and boundary
# validation still match what Spacery generates.
#
set -euo pipefail

WP_REF="${1:-7.1.0}"
DEST="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/tests/contract/core"
URL="https://raw.githubusercontent.com/WordPress/wordpress-develop/${WP_REF}/src/wp-includes/class-wp-theme-json.php"

mkdir -p "$DEST"
curl -fsSL "$URL" -o "$DEST/class-wp-theme-json.php"

echo "Fetched WP_Theme_JSON from wordpress-develop@${WP_REF}"
