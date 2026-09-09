# S1 — renaming a breakpoint

**Verdict: freezing the slug is the whole fix. Migration is a separate,
optional feature, and if it is ever built it must not rewrite content.**

Timeboxed at one day in the release plan. It took a morning, because the first
thing checked settled most of it. Everything below is read from this repository
at `5767b2b`, cited by file; nothing here is from memory of how it works.

## 1. What the bug actually was

`slugFrom()` kept the slug tracking the name until the author edited the slug
themselves. Its docblock argued that this was safe because it "stops following
once it diverges from the name it came from" — which guards the case that cannot
arise and leaves the one that does. An author who never touches the slug field
has a slug that never diverges, so it follows forever.

The damage is silent. `Generator::normalize()` iterates the *current* set and
skips anything it does not recognise:

```php
// includes/Styles/Generator.php
foreach ( $known as $slug ) {
    $styles = $attribute[ $slug ] ?? null;
    if ( ! is_array( $styles ) ) { continue; }
```

So values stored under `laptop` are not orphaned loudly, they are pruned. The
spacing leaves the page, and nothing anywhere says why.

## 2. Freezing closes it completely

This is the finding that shrinks the job, and it is a fact about the data model
rather than a judgement.

A `Breakpoint` is `{ slug, label, max }`. **The slug is a storage key; the label
is what the interface shows.** Checked across every place a tier is named:
`TierSelector` renders `breakpoint.label`, the panel header interpolates it, the
settings table prints it. The slug appears in exactly one place an author ever
sees — the Slug field on the settings screen, whose help text says "Stored in
block attributes."

So "rename Laptop to Notebook" is a label edit. Freeze the slug once the server
has stored it, and the rename does what the author meant, with every value still
resolving. There is nothing left to migrate.

The one exception is `BreakpointSet::machine_label()`, which derives a label
from the slug when a theme supplies none. That path belongs to the `theme`
source, and the settings screen only edits `custom`, so it cannot be reached by
a rename here.

## 3. The wire format cannot tell a rename from a replacement

Worth recording, because it constrains anything built later.

`Options::register()` gives `spacery_custom_breakpoints` a REST schema whose
items are `required => array( 'slug', 'label', 'max' )` and nothing else. The
server therefore receives an array of breakpoints with no identity: an author who
changes `laptop` to `notebook` and an author who deletes `laptop` and adds
`notebook` send byte-identical payloads.

**Any migration must therefore be driven by the client**, which is the only
party that knows a rename happened. That is now possible: rows carry a
client-only `id` and `storedSlug` (`src/settings/rows.ts`). It was not possible
before, which is why S1 and S2 turned out to be one problem — the missing row
identity was both the React-key bug and the reason a rename is undetectable.

## 4. If migration is ever built, it must not rewrite content

The obvious implementation is to walk posts and rewrite the attribute. It is the
wrong one.

Values live as JSON in block delimiters inside `post_content`, so a rewrite means
`parse_blocks()` → edit → `serialize_blocks()` across every post, page, reusable
block, template and template part, batched and resumable. `serialize_blocks()`
is not guaranteed byte-identical for content it did not produce, so a rename
could touch markup that has nothing to do with Spacery. That is a large,
irreversible risk to accept for a rare action, in a plugin whose central promise
(§3.1 of the plan) is that it never writes into your content.

**The cheap route is an alias map**, and the reason it is cheap is that
resolution has exactly two choke points:

| Where | What |
|---|---|
| `Generator::normalize()` | the only place the stored attribute meets the current set, server-side |
| `authoredAt()` in `src/attribute/tiers.ts` | the only place it meets it in the editor — `inheritedFrom()` and `effectiveAt()` both route through it |

An `old-slug → new-slug` option consulted at those two points keeps every value
resolving, rewrites nothing, and leaves deactivation as safe as it is today. It
would heal on its own: the next time a block is edited the value is written under
the current slug.

Its costs are real though, and they are permanent: a third resolution rule in two
languages, a channel to record the rename (a small `spacery/v1` route, rather
than widening the public `/wp/v2/settings` schema), a lifecycle for when an alias
retires, and a new failure mode of its own — a stale alias silently resolving a
slug the author believes is gone.

## 5. Decision

Freeze, and warn. Both shipped in `5767b2b`.

Editing the slug field directly is still allowed, still orphans values, and now
says so — naming the slug the values sit under, and pointing at the field the
author probably wanted instead. That is proportionate: the destructive path now
requires deliberately editing a field labelled "Stored in block attributes",
having read a warning that says what it will do.

**The alias is not built, and should not be built for 1.0.** It is a permanent
mechanism serving a rare deliberate act, and the release plan's own test — is
this a data-loss path an ordinary author can walk into? — is no longer met once
the freeze is in. If it is ever wanted, §4 is the design, and `storedSlug` is
already the datum it needs.
