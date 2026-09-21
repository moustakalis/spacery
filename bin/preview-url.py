#!/usr/bin/env python3
"""Prints a playground.wordpress.net URL that runs the blueprint as it stands.

WordPress.org gives no way to try a blueprint before committing it: the toggle
is either enabled or it says the file is invalid. Playground itself will run one
straight from the URL fragment, though, so this builds that URL from the working
copy.

One difference from the real thing, and it is deliberate: the directory installs
the plugin being previewed for you, so `blueprint.json` must not do it. Nothing
installs Spacery when the blueprint is run outside the directory, so this script
prepends an `installPlugin` step for the *published* version. What you are
testing is therefore the blueprint against the last release, which is right for
checking the demo page and the landing URL and wrong for checking anything that
is only in the working tree.

Usage:  python3 bin/preview-url.py          # print the URL
        open "$(python3 bin/preview-url.py)"
"""

from __future__ import annotations

import json
import urllib.parse
from pathlib import Path

BLUEPRINT = Path(__file__).resolve().parent.parent / 'assets' / 'blueprints' / 'blueprint.json'

blueprint = json.loads(BLUEPRINT.read_text())

blueprint.setdefault('steps', []).insert(
    0,
    {
        'step': 'installPlugin',
        'pluginData': {'resource': 'wordpress.org/plugins', 'slug': 'spacery'},
        'options': {'activate': True},
    },
)

compact = json.dumps(blueprint, separators=(',', ':'))

print('https://playground.wordpress.net/#' + urllib.parse.quote(compact))
