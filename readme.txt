=== Spacery ===
Contributors: moustakalis
Tags: spacer, responsive, spacing, breakpoints, block editor
Requires at least: 7.1
Tested up to: 7.1
Requires PHP: 8.2
Stable tag: 0.1.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Responsive spacing for the block editor: unlimited, theme-defined breakpoints for any block.

== Description ==

WordPress 7.1 added responsive block styles with two breakpoints, mobile and tablet, set by
the theme. That covers a lot of designs. It does not cover a design system with four, five
or six tiers, and it does not make the core Spacer block's height responsive at all.

Spacery fills both gaps.

* **Unlimited breakpoints.** Define as many tiers as your design system has. Spacery reads
  them from your theme where possible, so the editor offers the same breakpoints your CSS
  already uses.
* **Consistent with WordPress.** Spacery uses the same desktop-first model and the same
  breakpoint values as core's own responsive styles, so the two never disagree.
* **A responsive spacer block.** Height and width per breakpoint, which the core Spacer
  block still does not offer.
* **Responsive spacing on any block.** Padding and margin per breakpoint on any block that
  supports spacing, including blocks from other plugins.

= You choose where breakpoints come from =

Spacery uses one set of breakpoints at a time, and you pick which:

* **Your theme.** Its `settings.custom.spacery.breakpoints`, or the `settings.viewport`
  values WordPress 7.1 already uses. This is the default whenever your theme defines
  either, so Spacery and WordPress agree out of the box.
* **Spacery's own.** Five tiers: Desktop, Laptop, Tablet, Mobile, plus the default that
  applies everywhere. Tablet and Mobile use WordPress's own values, so choosing this adds
  tiers without moving the ones you already had.
* **Your own.** Define any set you like on the settings screen.

The sets are never blended. Developers can override the result entirely with the
`spacery_breakpoints` filter.

= Your content stays yours =

Spacery stores its values as block attributes, not as markup. Deactivate the plugin and
your posts stay valid: nothing breaks, nothing needs repairing, and reactivating restores
your spacing.

== Installation ==

1. Upload the plugin to `/wp-content/plugins/spacery`, or install it through the Plugins
   screen.
2. Activate it through the Plugins screen.
3. Spacing controls appear in the block inspector under Spacery.

== Frequently Asked Questions ==

= Does this replace the WordPress 7.1 responsive styles? =

No. It extends them. If your theme defines `settings.viewport`, Spacery uses those same
breakpoints so the two systems agree.

= What happens if I deactivate the plugin? =

Your posts stay valid. Spacery's values are stored as block attributes rather than written
into your content's markup, so nothing is left behind to break.

= Does it work with blocks from other plugins? =

Yes, as long as the block declares support for spacing.

== Changelog ==

= 0.1.0 =

* Initial development release.
