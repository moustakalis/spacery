# Upstream request: `pick()` fallback direction

**For:** `github.com/moustakalis/responsive-state`
**From:** Spacery (`docs/PLAN.md` §3.4, D10)
**Status: DELIVERED in `responsive-state@0.2.0`**, published 2026-09-01. Kept for the
record. The shipped option is named `fallbackDirection` rather than `direction`; values
`'up'` (default, unchanged) and `'down'` are as specified below.

---

## Honest scoping first

While specifying this I checked what Spacery actually needs, and it is much less than it
first appeared. Three things are **not** needed:

- **No `max-width` mode on the store.** A set of `max-width` boundaries and a set of
  `min-width` minimums describe the same partition of the width axis. Spacery derives
  ascending minimums once when constructing the store and keeps core's exact `max-width`
  values for its generated CSS. `createResponsiveState` stays untouched.
- **No new presets.** Spacery deliberately couples to no CSS framework; it passes its own
  tiers.
- **No change to `up()` / `down()` / `between()` / `current` / `index`.** "Which tier is
  the viewport in" is direction-agnostic and already correct.

That leaves exactly one thing: `pick()` encodes a *policy* — mobile-first fallback — and
that policy is the one piece Spacery cannot reuse.

## The request

`pick( values, fallback )` currently returns the value for the current breakpoint, or the
nearest **smaller** one that is defined. That is mobile-first: a value set at `sm` applies
at `md` and above until something overrides it.

Desktop-first inverts it: a value set at `tablet` (meaning ≤782px) applies at `mobile`
(≤480px) too, because the narrower viewport inherits from the wider tier. Resolution
must walk toward the nearest **larger** defined tier.

### Proposed signature

```ts
pick<V>(
  values: Partial<Record<K, V>>,
  fallback: V,
  options?: { direction?: 'up' | 'down' },
): V;
```

- `direction: 'up'` (default) — current behaviour, falls back to the nearest smaller
  defined tier. Mobile-first.
- `direction: 'down'` — falls back to the nearest larger defined tier. Desktop-first.

Default `'up'` keeps this fully backward compatible; a patch or minor release, not a
major.

The names mirror the existing `up()` / `down()` semantics on the store, where `up` already
means `>=` and `down` means `<=`, so no new vocabulary is introduced.

### Behaviour table

Breakpoints ascending `['xs', 'sm', 'md', 'lg']`, current tier `md`,
`values = { sm: 'A', lg: 'B' }`, `fallback = 'F'`:

| `direction` | Result | Why |
|---|---|---|
| `'up'` (current) | `'A'` | Nearest smaller defined tier is `sm` |
| `'down'` | `'B'` | Nearest larger defined tier is `lg` |

Edge cases:

| Case | `'up'` | `'down'` |
|---|---|---|
| Exact match at current tier | that value | that value |
| No defined tier in the fallback direction | `fallback` | `fallback` |
| `values` empty | `fallback` | `fallback` |
| Current tier is the first / last | `fallback` unless matched | `fallback` unless matched |

### Suggested tests

1. `'down'` resolves to the nearest larger tier, skipping undefined ones.
2. `'down'` returns `fallback` when only smaller tiers are defined.
3. `'up'` behaviour is byte-identical to the current implementation (regression guard).
4. Omitting `options` is identical to `{ direction: 'up' }`.
5. An exact match at the current tier wins in both directions.
6. A value explicitly set to `undefined` is treated as undefined, not as a hit.

### Why it belongs upstream

It is a five-line fallback walk that Spacery could implement itself over
`snapshot.current` and `store.breakpoints` — and will, if this is not taken. But
desktop-first is not a Spacery quirk: it is the direction WordPress core uses, and CSS
frameworks exist on both sides of this line. A library whose stated purpose is
"type-safe breakpoint state" arguably should not have a cascade direction baked into its
one resolution helper.

## Not requested, but worth noting for later

If `responsive-state` ever grows a container-query mode driven by `ResizeObserver` rather
than `matchMedia`, Spacery would use it immediately — a block that responds to its
container previews correctly in the block editor by construction, which is the single
hardest problem in that integration. That is speculative and belongs behind a real second
use case; recording it here only so the thought is not lost.
