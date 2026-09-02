/**
 * Immutable reads and writes of leaf values inside a style object.
 *
 * Block attributes are compared by reference by the editor's undo stack and by
 * React's render bailouts, so every write here returns new objects along the
 * path it touched and reuses everything it does not. Mutating in place would
 * work until it did not, in ways that only show up as a stale inspector.
 */

import type { StyleNode, StylePath } from './types';

/**
 * Reads the string at a path, or undefined when any segment is missing.
 *
 * Non-string leaves return undefined rather than being coerced: a number where
 * a CSS length belongs is corrupt data, and pretending otherwise would put an
 * unusable value into a stylesheet.
 *
 * @param node A style object, or anything at all.
 * @param path Path to the leaf.
 * @return The value, or undefined.
 */
export function readPath(node: unknown, path: StylePath): string | undefined {
	let current: unknown = node;

	for (const segment of path) {
		if (!isNode(current)) {
			return undefined;
		}

		current = current[segment];
	}

	return 'string' === typeof current ? current : undefined;
}

/**
 * Returns a copy of `node` with `value` written at `path`.
 *
 * @param node  A style object.
 * @param path  Path to the leaf. Must not be empty.
 * @param value The value to write.
 * @return A new style object.
 */
export function writePath(
	node: StyleNode,
	path: StylePath,
	value: string
): StyleNode {
	const [head, ...rest] = path;

	if (undefined === head) {
		return node;
	}

	if (0 === rest.length) {
		return { ...node, [head]: value };
	}

	const child = node[head];

	return {
		...node,
		[head]: writePath(isNode(child) ? child : {}, rest, value),
	};
}

/**
 * Returns a copy of `node` with the leaf at `path` removed.
 *
 * Ancestors that empty out are removed too, so clearing the last value a block
 * had leaves the attribute exactly as it was before the author touched it —
 * `undefined`, not a husk of empty objects that would serialize differently
 * from an untouched block.
 *
 * @param node A style object.
 * @param path Path to the leaf.
 * @return A new style object, or undefined when nothing is left.
 */
export function clearPath(
	node: StyleNode,
	path: StylePath
): StyleNode | undefined {
	const [head, ...rest] = path;

	if (undefined === head || !(head in node)) {
		return isEmpty(node) ? undefined : node;
	}

	const next = { ...node };

	if (0 === rest.length) {
		delete next[head];
	} else {
		const child = next[head];
		const pruned = isNode(child) ? clearPath(child, rest) : undefined;

		if (undefined === pruned) {
			delete next[head];
		} else {
			next[head] = pruned;
		}
	}

	return isEmpty(next) ? undefined : next;
}

/**
 * Whether a value is a plain style subtree rather than a leaf.
 *
 * @param value Anything.
 * @return True when the value can hold further keys.
 */
function isNode(value: unknown): value is StyleNode {
	return 'object' === typeof value && null !== value && !Array.isArray(value);
}

/**
 * Whether a style object has no keys left.
 *
 * @param node A style object.
 * @return True when it is empty.
 */
function isEmpty(node: StyleNode): boolean {
	return 0 === Object.keys(node).length;
}
