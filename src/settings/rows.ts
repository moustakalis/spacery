/**
 * Editing identity for the breakpoint repeater.
 *
 * The wire format is `{ slug, label, max }` and nothing more, so the server
 * cannot tell a renamed breakpoint from a deleted one and a new one: both look
 * like a slug that left and a slug that arrived. That is fine for storage and
 * fatal for editing, because two questions the screen must answer need to know
 * which row is which.
 *
 * **Which React node belongs to which breakpoint.** Keyed by array index, the
 * DOM node for a removed row is reused for whatever slides up into its place,
 * carrying the caret and `UnitControl`'s parsed unit into an unrelated
 * breakpoint.
 *
 * **Whether a slug could already be in content.** A slug the server has stored
 * may be the key under which real spacing is saved in real posts. Changing it
 * orphans every one of those values silently -- `Generator::normalize()` walks
 * the current set and skips what it does not recognise, so the spacing simply
 * stops appearing, with no error anywhere.
 *
 * Both are answered by remembering, per row, an id and the slug the server last
 * confirmed. Neither ever leaves the browser: `toBreakpoints()` strips them
 * before saving, so the stored shape is unchanged.
 */

import type { Breakpoint, StoredSettings, StoredSource } from './types';

/**
 * A breakpoint plus the editing state the screen needs and the server does not.
 */
export interface Row extends Breakpoint {
	/** Stable for this row's lifetime in the browser. Never sent. */
	id: string;

	/**
	 * The slug as the server last stored it, or undefined for a row that has
	 * never been saved. Never sent.
	 */
	storedSlug?: string;
}

/** Source of row ids. Uniqueness within one page load is all that is asked. */
let counter = 0;

/**
 * A new id.
 *
 * @return An id unique within this page load.
 */
function nextId(): string {
	counter += 1;

	return `row-${counter}`;
}

/**
 * Wraps what the server returned as editable rows.
 *
 * Every row here came from the server, so every slug is one that could already
 * be in content.
 *
 * @param breakpoints The stored set.
 * @return Rows to edit.
 */
export function toRows(breakpoints: Breakpoint[]): Row[] {
	return breakpoints.map((breakpoint) => ({
		...breakpoint,
		id: nextId(),
		storedSlug: breakpoint.slug,
	}));
}

/**
 * Strips the editing state back to what the server accepts.
 *
 * @param rows The rows being edited.
 * @return The wire shape.
 */
export function toBreakpoints(rows: Row[]): Breakpoint[] {
	return rows.map(({ slug, label, max }) => ({ slug, label, max }));
}

/**
 * An empty row the author has not saved yet.
 *
 * @return A blank row.
 */
export function blankRow(): Row {
	return { slug: '', label: '', max: '', id: nextId() };
}

/**
 * Whether this row's slug could already be a key in someone's content.
 *
 * @param row The row.
 * @return True once the server has stored it.
 */
export function isStored(row: Row): boolean {
	return undefined !== row.storedSlug;
}

/**
 * Whether the author has changed a slug the server had already stored.
 *
 * @param row The row.
 * @return True when the slug has moved away from the stored one.
 */
export function slugHasMoved(row: Row): boolean {
	return isStored(row) && row.slug !== row.storedSlug;
}

/**
 * Derives a slug from a name, but only for a row that has never been saved.
 *
 * Following the name is a convenience for the common path, where an author
 * types "Laptop" and wants `laptop` without thinking about it. It stops the
 * moment the row has been stored, because from then on the slug is a key that
 * content may be using, and a keystroke in the *name* field must never move it.
 *
 * The rule this replaces stopped following once the slug diverged from the name
 * it came from, which guarded the case that cannot happen and left the one that
 * can: an author who never touches the slug field keeps a slug that follows,
 * and renaming Laptop to Notebook takes `laptop` with it.
 *
 * @param label The new name.
 * @param row   The row before this edit.
 * @return The slug to store.
 */
export function slugFrom(label: string, row: Row): string {
	if (isStored(row)) {
		return row.slug;
	}

	return toSlug(label);
}

/**
 * Whether the slug field should show a hint rather than a value.
 *
 * The design draws this column grey, as a slug the author has not chosen —
 * which is true of a row that has just been added, where nothing is stored and
 * the value really is derived from the name. It is not true of a row that came
 * back from the server: that slug is a key posts may already reference, and
 * presenting stored data as hint text invites exactly the edit S1 exists to
 * prevent. So the hint is for rows that have one, and a stored slug is shown as
 * what it is.
 *
 * @param row The row.
 * @return True when the field should render its slug as a placeholder.
 */
export function slugIsDerived(row: Row): boolean {
	return !isStored(row) && row.slug === toSlug(row.label);
}

/**
 * What an edit to the slug field means.
 *
 * Clearing it returns the row to deriving from the name, which is the only
 * reading of "empty" that the placeholder makes available: the field then shows
 * the hint again, so the author can see what undoing their choice got them. An
 * empty slug is not a thing the server would accept anyway.
 *
 * @param next The field's new contents.
 * @param row  The row before this edit.
 * @return The slug to hold.
 */
export function slugTyped(next: string, row: Row): string {
	return '' === next ? toSlug(row.label) : next;
}

/**
 * Lowercases and dashes a name, matching what the server accepts.
 *
 * @param label A human-readable name.
 * @return A candidate slug.
 */
export function toSlug(label: string): string {
	return label
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

/**
 * Whether two sets hold the same breakpoints.
 *
 * By content, never by order: the server stores a canonical widest-first
 * ordering, so a set that comes back reordered is the same set. Two callers
 * need this — "did the server accept what we sent" and "is there anything to
 * save" — and they must not be able to answer it differently.
 *
 * @param a One set.
 * @param b Another.
 * @return True when every breakpoint in `a` has a twin in `b`.
 */
export function sameBreakpoints(a: Breakpoint[], b: Breakpoint[]): boolean {
	if (a.length !== b.length) {
		return false;
	}

	return a.every((one) =>
		b.some(
			(other) =>
				other.slug === one.slug &&
				other.label === one.label &&
				other.max === one.max
		)
	);
}

/**
 * How many breakpoints differ from what the server holds.
 *
 * The save bar says so rather than saying only that something changed: "two
 * breakpoints" tells an author who has been typing for a minute how much is at
 * stake if they leave, and "something" does not.
 *
 * An edited row counts once, not twice. A removed one counts as its own change
 * — it is absent here and present there, and the author did something to make
 * that true.
 *
 * @param rows   The rows being edited.
 * @param stored What the server last returned.
 * @return How many breakpoints an author would lose by discarding.
 */
export function changedCount(rows: Row[], stored: Breakpoint[]): number {
	const edited = toBreakpoints(rows).filter(
		(one) =>
			!stored.some(
				(other) =>
					other.slug === one.slug &&
					other.label === one.label &&
					other.max === one.max
			)
	).length;

	const removed = stored.filter(
		(one) => !rows.some((row) => row.slug === one.slug)
	).length;

	return edited + removed;
}

/**
 * Whether the screen holds anything the server does not.
 *
 * The screen had no idea: `Save changes` looked identical whether or not
 * anything had changed, and navigating away discarded a half-built set in
 * silence. On a page whose main task is typing several rows, that is a real
 * loss, and the author gets no signal it is about to happen.
 *
 * @param rows       The rows being edited.
 * @param source     The source chosen on screen.
 * @param deleteData Whether the delete-on-uninstall box is ticked (D24).
 * @param stored     What the server last returned.
 * @return True when saving would change something.
 */
export function isDirty(
	rows: Row[],
	source: StoredSource,
	deleteData: boolean,
	stored: StoredSettings
): boolean {
	if (source !== stored.spacery_breakpoint_source) {
		return true;
	}

	if (deleteData !== stored.spacery_delete_data) {
		return true;
	}

	return !sameBreakpoints(
		toBreakpoints(rows),
		stored.spacery_custom_breakpoints
	);
}
