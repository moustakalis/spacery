=== Spacery - Responsive Spacing and Spacer Block ===
Contributors: nikosmoustakas
Tags: spacer, responsive, gutenberg, spacing, breakpoints
Requires at least: 7.1
Tested up to: 7.1
Requires PHP: 8.2
Stable tag: 1.0.1
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Responsive padding, margin and spacer height on any block, at the breakpoints your design uses.

== Description ==

Your design has four breakpoints. WordPress gives you two.

Spacery closes that gap. Padding and margin per breakpoint on any block that supports
spacing, a spacer block whose height changes at each one, and up to twelve tiers instead
of two — read from your theme where it declares them, so the editor offers the same
breakpoints your CSS already uses.

= Why you would use it =

* **Stop hand-writing media queries for spacing.** Set the value for each breakpoint in
  the inspector, and watch the editor canvas apply it as you work.
* **Breakpoints that match your design system.** Up to twelve tiers, named the way your
  team names them, instead of the two core offers.
* **A spacer that finally responds.** 120px of air on desktop and 32px on a phone, from
  one block. The core Spacer block still has a single height.
* **It adopts what you have already set.** Where your breakpoints line up with the ones
  WordPress uses, Spacery offers to move values core set responsively into the matching
  tier — one click, nothing retyped.
* **It works with blocks you did not write.** There is no list of supported blocks: the
  controls appear wherever WordPress says spacing applies, including blocks from other
  plugins.
* **Light CSS.** Rules come from WordPress's own Style Engine and are shared between
  blocks that use the same values — two hundred blocks with three spacing recipes between
  them emit three rules, not two hundred.

= Is Spacery for you? =

**Yes**, if you build with the block editor, your design system has more than two
breakpoints, and you would rather set spacing in the inspector than in a stylesheet.

**Probably not**, if any of these is true:

* **Your design has one or two breakpoints and your theme declares them.** WordPress
  7.1's own responsive styles already cover you, and Spacery would be a dependency you
  do not need.
* **You want responsive typography, colours, or hide-on-mobile.** Spacery does spacing.
  It does not pretend otherwise.
* **You need responsive block gap.** WordPress does that itself, with its own controls.
  Spacery deliberately does not ship a second implementation that would drift from the
  first.
* **You are on the classic editor**, or a page builder that replaces the block editor.
* **You cannot run WordPress 7.1 and PHP 8.2.** Spacery says so on activation rather
  than half-working.

One more thing worth knowing before you install: breakpoints are one set for the whole
site, not a per-page choice. That is deliberate — a design system is one set of tiers —
but if you wanted different breakpoints on different pages, this is not that plugin.

= You choose where breakpoints come from =

Spacery uses one set at a time, and you pick which:

* **Your theme.** Its `settings.custom.spacery.breakpoints`, or the `settings.viewport`
  values WordPress 7.1 understands. This is the default whenever your theme declares
  either, so Spacery follows the breakpoints your theme already uses.
* **Spacery's own.** Four tiers — Desktop, Laptop, Tablet and Mobile — over the default
  that applies everywhere. Tablet and Mobile use WordPress's own values, so choosing this
  adds tiers without moving the ones you already had. This is what you get on a site whose
  theme declares no breakpoints, which is most of them.
* **Your own.** Any set you like, up to twelve tiers, defined on the Spacery screen in the
  admin menu.

The sets are never blended: values from two different intentions sitting side by side
produce a set nobody designed. Developers can override the result entirely with the
`spacery_breakpoints` filter.

= How it fits with WordPress =

WordPress 7.1 added responsive block styles with two theme-set breakpoints, mobile and
tablet. Spacery extends that rather than competing with it: the same desktop-first model,
the same disjoint media-query shapes, and the same values where your breakpoints and
core's agree — so the two never disagree at a boundary, and turning Spacery off leaves
core's own responsive styles working exactly as before.

= No strings =

* **Nothing leaves your site.** No external requests, no account, no key, no telemetry,
  no analytics.
* **No upsell and no pro version.** There is no paid tier to be steered towards, and the
  admin screens carry no promotion of any kind.
* **Your content stays yours.** Values are stored as block attributes, never written into
  your posts' markup. Deactivate the plugin and every post stays valid; reactivate and
  your values are still there.
* **GPL-2.0-or-later**, with the full, uncompiled source on GitHub.

== Installation ==

1. Upload the plugin to `/wp-content/plugins/spacery`, or install it through the Plugins
   screen.
2. Activate it through the Plugins screen.
3. Open Spacery in the admin menu and choose where your breakpoints come from.
4. Responsive controls appear in the block inspector under Spacery.

== Screenshots ==

1. Padding and margin per breakpoint, on any block that supports spacing.
2. A spacer whose height changes at every breakpoint — which the core Spacer block still cannot do.
3. Name your own breakpoints and set where each one stops, on Spacery's settings screen.

== Frequently Asked Questions ==

= Does this replace the WordPress 7.1 responsive styles? =

No. It extends them. If your theme defines `settings.viewport`, Spacery uses those same
breakpoints so the two systems agree.

= What happens if I deactivate the plugin? =

Your posts stay valid. Spacery's values are stored as block attributes rather than written
into your content's markup, so nothing is left behind to break, and reactivating brings
them back.

One caveat, which is inherent rather than a bug: with Spacery switched off its attribute
is not registered, so opening a post in that state and **saving** it rewrites the block
without Spacery's values. Reading is safe; re-saving is not. If you are deactivating to
test something, avoid saving posts until it is back on.

= Does it work with blocks from other plugins? =

Yes, as long as the block declares support for spacing. Spacery has no list of block
names: it offers its controls wherever WordPress says spacing applies.

= Can I make block spacing (gap) responsive? =

WordPress does that itself, at its own two breakpoints, using its own controls - you do
not need Spacery for it. Spacery deliberately does not duplicate it, because gap is
generated by WordPress's layout system rather than applied to the block wrapper, and a
second implementation would drift from the first.

= Is it translated? =

Every string in the plugin is translatable, in the editor as well as on the settings
screen, and translations arrive from translate.wordpress.org through WordPress's normal
translation updates — nothing is bundled, so any locale the community translates it into
is available without an update to the plugin. There is one exception:
the tagline under the plugin's name is part of the brand, like the name itself, and stays
as it is in every language — the same line the banner carries, where it is artwork.

= Where are my settings stored? =

In two options, `spacery_breakpoint_source` and `spacery_custom_breakpoints`, both
registered with WordPress so they are available through the REST API and WP-CLI with the
same validation the settings screen uses.

= What happens to my settings if I delete the plugin? =

They are kept, unless you ask for them to be removed. There is a checkbox at the bottom of
the Spacery screen, off by default.

Keeping them is the safe default, and not just tidiness. Your breakpoints are what the
values on your blocks are measured against: a value saved at "tablet" means whatever your
tablet breakpoint says it means. Remove the breakpoints and a later reinstall starts from
Spacery's own set, so that value would apply at a different width - or, if you had renamed
your breakpoints, stop applying at all. Nothing would warn you, because nothing is broken;
the values would just be different.

So the choice is yours and it is off until you make it. Either way Spacery never writes
anything into your posts, and never removes anything from them.

== Source Code ==

The JavaScript and CSS in `build/` are compiled. The human-readable sources they
are built from are in `src/`, in the plugin's public repository:

https://github.com/moustakalis/spacery

Building them needs Node.js 22 or newer and pnpm:

    pnpm install
    pnpm run build

That rebuilds the `build/` directory this plugin ships. The build uses
`@wordpress/scripts` - webpack, Babel, TypeScript and Sass - and nothing else.
Spacery bundles no third-party libraries and has no runtime dependencies: its
`composer.json` requires only PHP itself, and nothing from `node_modules` is
shipped.

== Changelog ==

= 1.0.1 =

* Directory listing only: the title names what the plugin does, and the tags
  trade "block editor" for "gutenberg". No code changed.

= 1.0.0 =

* Breakpoints from your theme, from Spacery's preset, or your own - one set at a time.
* Responsive padding and margin on any block that supports spacing.
* A spacer block with a height per breakpoint.
* An editor that follows the canvas, so the preview matches the rendered page.
* Adopts values WordPress already sets responsively, when the breakpoints agree.
* Settings screen, and every string ready for translation.
