#!/usr/bin/env python3
"""
Checks the things that only break at release time.

Two classes of mistake, both invisible until someone is looking at
WordPress.org wondering why an update never arrived.

**Versions that disagree.** WordPress decides whether an update exists by
comparing the plugin header against the directory's version, not the git tag.
A release built from a tree whose header was never bumped installs correctly,
reports the old version, and is offered to nobody.

**Packaging lists that disagree.** `package.json#files` is an allow-list used
by `wp-scripts plugin-zip`; `.distignore` is a deny-list used by the deploy
action. They describe the same thing in opposite directions, so nothing forces
them to agree, and a file that reaches WordPress.org but not the zip is the
kind of difference found by a reviewer rather than by us.

Run with `python3 bin/check-release.py`. Exits non-zero and says what differs.
"""

import fnmatch
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Generated at build time, so absent from a clean checkout, but shipped.
GENERATED = {"build"}


def read(path):
    with open(os.path.join(ROOT, path), encoding="utf-8") as handle:
        return handle.read()


def versions():
    """Every place a version number is written, and what it says."""
    plugin = read("spacery.php")

    found = {
        "plugin header": re.search(
            r"^\s*\*\s*Version:\s*(.+?)\s*$", plugin, re.M
        ),
        "VERSION constant": re.search(
            r"^const VERSION = '(.+?)';", plugin, re.M
        ),
        "readme.txt Stable tag": re.search(
            r"^Stable tag:\s*(.+?)\s*$", read("readme.txt"), re.M
        ),
    }

    reported = {
        name: match.group(1) if match else None for name, match in found.items()
    }
    reported["package.json"] = json.loads(read("package.json")).get("version")

    return reported


def packaging():
    """Top-level paths, and how each of the two lists treats them."""
    shipped = set(json.loads(read("package.json")).get("files", []))

    """
    `.distignore` holds anchored paths (`/docs`) and globs (`*.dist`), and the
    globs are not decoration -- they are what keeps the four `*.dist` config
    files out of the zip, which Plugin Check rejects as application files.
    Reading only the anchored lines made this check report those four as
    unhandled on its first run.
    """
    anchored, patterns = set(), []

    for line in read(".distignore").splitlines():
        line = line.strip()

        if not line or line.startswith("#"):
            continue

        if line.startswith("/"):
            anchored.add(line[1:])
        else:
            patterns.append(line)

    def ignored(path):
        return path in anchored or any(
            fnmatch.fnmatch(path, pattern) for pattern in patterns
        )

    tracked = subprocess.run(
        ["git", "ls-tree", "--name-only", "HEAD"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=True,
    ).stdout.split()

    return shipped, ignored, set(tracked) | GENERATED


def main():
    problems = []

    reported = versions()
    distinct = set(reported.values())

    if None in distinct:
        problems.append(
            "could not read a version from: "
            + ", ".join(name for name, value in reported.items() if value is None)
        )
    elif len(distinct) > 1:
        problems.append(
            "versions disagree: "
            + ", ".join(f"{name}={value}" for name, value in reported.items())
        )

    shipped, ignored, present = packaging()

    for path in sorted(present):
        if path in shipped and ignored(path):
            problems.append(
                f"{path} is in package.json#files and in .distignore; "
                "it would ship in the zip but not to WordPress.org"
            )
        elif path not in shipped and not ignored(path):
            problems.append(
                f"{path} is in neither package.json#files nor .distignore; "
                "it would ship to WordPress.org but not in the zip"
            )

    for stale in sorted(shipped - present):
        problems.append(f"package.json#files lists {stale}, which does not exist")

    if problems:
        for problem in problems:
            print(f"error: {problem}", file=sys.stderr)
        return 1

    print(f"version {next(iter(distinct))}, and both packaging lists agree")
    return 0


if __name__ == "__main__":
    sys.exit(main())
