#!/usr/bin/env python3
"""Checks `assets/blueprints/blueprint.json` before it reaches WordPress.org.

The directory validates the blueprint silently. A file it rejects produces one
line on the plugin's admin page -- "Missing or invalid blueprint.json file" --
with the Live Preview toggle disabled and no indication of which part is wrong,
and the only way to try again is another Subversion commit. So the checks that
can be made locally are made here.

Run without arguments it needs neither the network nor a dependency. With
`--schema` it additionally validates the file against Playground's published
JSON Schema, which needs both -- that is the form CI runs.

The checks that a schema cannot make are the Spacery-specific ones: that the
landing page points at the post the blueprint creates, and that no step
installs Spacery itself (the directory appends that step, pointing at the
version being previewed, and a second copy would install the published one over
it).

Exits non-zero with an explanation on the first problem found.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

BLUEPRINT = Path(__file__).resolve().parent.parent / 'assets' / 'blueprints' / 'blueprint.json'

# WordPress.org's own limit on the file, documented when the Preview button
# shipped. Well clear of it today; here so that a future demo page that grows
# fails on this line rather than on the directory's silent rejection.
MAX_BYTES = 100 * 1024

SCHEMA_URL = 'https://playground.wordpress.net/blueprint-schema.json'


def fail(message: str) -> None:
    print(f'error: {message}', file=sys.stderr)
    sys.exit(1)


def check_schema(blueprint: dict) -> None:
    """Validates against Playground's own schema. Needs the network."""
    import urllib.request

    import jsonschema

    with urllib.request.urlopen(SCHEMA_URL, timeout=30) as response:
        schema = json.load(response)

    errors = sorted(
        jsonschema.Draft7Validator(schema).iter_errors(blueprint),
        key=lambda error: list(error.path),
    )

    for error in errors:
        path = '.'.join(str(part) for part in error.path) or '(root)'
        print(f'error: {path}: {error.message}', file=sys.stderr)

    if errors:
        sys.exit(1)

    print(f'blueprint.json validates against {SCHEMA_URL}')


def main() -> None:
    if not BLUEPRINT.is_file():
        fail(f'{BLUEPRINT} does not exist. The Live Preview toggle stays disabled without it.')

    raw = BLUEPRINT.read_bytes()

    if len(raw) > MAX_BYTES:
        fail(f'blueprint.json is {len(raw)} bytes; WordPress.org allows {MAX_BYTES}.')

    try:
        blueprint = json.loads(raw)
    except json.JSONDecodeError as error:
        fail(f'blueprint.json is not valid JSON: {error}')

    if not isinstance(blueprint, dict):
        fail('blueprint.json must be a JSON object.')

    landing = blueprint.get('landingPage')

    if not isinstance(landing, str) or not landing.startswith('/'):
        fail('landingPage must be a site-relative path beginning with "/".')

    # A Blueprint v1 site option must be a *string*. An array here validates
    # nowhere except against the schema, which needs the network, and the
    # directory's only reply is the one line about an invalid file.
    options = blueprint.get('siteOptions', {})

    if not isinstance(options, dict):
        fail('siteOptions must be a JSON object.')

    for name, value in options.items():
        if not isinstance(value, str):
            fail(
                f'siteOptions["{name}"] is {type(value).__name__}; Blueprint v1 allows only '
                f'strings there. Write it from a runPHP step with update_option() instead.'
            )

    steps = blueprint.get('steps', [])

    if not isinstance(steps, list):
        fail('steps must be an array.')

    for step in steps:
        if isinstance(step, dict) and step.get('step') == 'installPlugin':
            slug = (step.get('pluginData') or {}).get('slug')
            if slug == 'spacery':
                fail(
                    'a step installs spacery from the directory. WordPress.org adds that '
                    'step itself, pointing at the version being previewed; this one would '
                    'install the published copy over it.'
                )

    # The landing page names a post id; the runPHP step has to create it. These
    # two were written minutes apart and will be edited months apart.
    match = re.search(r'[?&]post=(\d+)', landing)

    if match:
        wanted = match.group(1)
        code = ''.join(
            step.get('code', '')
            for step in steps
            if isinstance(step, dict) and step.get('step') == 'runPHP' and isinstance(step.get('code'), str)
        )

        if f'{wanted}' not in code:
            fail(
                f'landingPage opens post {wanted} for editing, but no runPHP step creates a '
                f"post with that id. Playground would land on \"Invalid post ID\"."
            )

    if '--schema' in sys.argv[1:]:
        check_schema(blueprint)

    print(f'blueprint.json OK ({len(raw)} bytes, lands on {landing})')


if __name__ == '__main__':
    main()
