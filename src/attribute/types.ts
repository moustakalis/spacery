/**
 * The shape of the `spacery` block attribute.
 */

/**
 * A style object for one breakpoint.
 *
 * Shaped exactly like core's `style` attribute, because the server hands each
 * tier straight to the Style Engine. Deliberately loose: a tier can carry any
 * style key the Style Engine understands, and narrowing it here would mean
 * editing this file every time a new one is supported.
 */
export type StyleNode = Record<string, unknown>;

/**
 * Per-breakpoint overrides, keyed by breakpoint slug.
 *
 * Slugs are whatever the site's breakpoint set defines, so this is an open
 * record rather than a union of the built-in tier names.
 */
export type SpaceryAttribute = Record<string, StyleNode>;

/**
 * A path to a leaf value inside a style object, e.g. `['spacing','padding','top']`.
 */
export type StylePath = readonly string[];
