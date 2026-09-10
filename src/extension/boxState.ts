/**
 * Editing preferences a spacing box must keep across a remount.
 *
 * Whether a box is linked, and which unit its author picked, are decisions
 * about *editing* rather than about the page. They must not enter the block's
 * attributes — that would dirty the post and serialize a preference into
 * content — and they cannot live in component state alone, because the
 * inspector unmounts the panel every time the selection changes.
 *
 * `SpacingBox`'s own docblock argues that "a unit the author picked outlives
 * the values". It did outlive the values and not the selection, which is the
 * more common event: choose `rem`, click another block, click back, and the
 * unit had reverted to whatever `unitFor()` could read from the values — which,
 * for an emptied box, is nothing.
 *
 * A module-level map is the smallest thing that fixes it. It is per page load
 * and never persisted, which is right for a preference nobody asked to keep
 * forever, and it grows by one entry per box the author actually touches.
 */

/** What a box remembers. */
export interface BoxState {
	/** Whether typing in one side writes all four. */
	linked: boolean;

	/** The unit the author chose, if they chose one. */
	chosen?: string;
}

/**
 * Linked by default: equal sides are what most spacing is, and a box that
 * starts apart makes the common case four edits instead of one. Scenario C in
 * the UI review's annex is the known cost of that, accepted deliberately.
 */
const DEFAULT: BoxState = { linked: true };

const store = new Map<string, BoxState>();

/**
 * Identifies one box: this block's, for this feature.
 *
 * Keyed by block *and* feature because padding and margin are separate boxes on
 * the same block, and linking one says nothing about the other.
 *
 * @param clientId The block's client id.
 * @param feature  The spacing feature, e.g. `padding`.
 * @return A key for this box.
 */
export function boxKey(clientId: string, feature: string): string {
	return `${clientId}:${feature}`;
}

/**
 * What this box remembers, or the defaults.
 *
 * @param key From boxKey().
 * @return The remembered state.
 */
export function readBoxState(key: string): BoxState {
	return store.get(key) ?? DEFAULT;
}

/**
 * Remembers whether this box is linked.
 *
 * @param key    From boxKey().
 * @param linked The new state.
 */
export function rememberLinked(key: string, linked: boolean): void {
	store.set(key, { ...readBoxState(key), linked });
}

/**
 * Remembers the unit the author picked for this box.
 *
 * @param key    From boxKey().
 * @param chosen The chosen unit.
 */
export function rememberUnit(key: string, chosen: string): void {
	store.set(key, { ...readBoxState(key), chosen });
}

/**
 * Forgets everything. Tests only — nothing in the editor clears these.
 */
export function resetBoxState(): void {
	store.clear();
}
