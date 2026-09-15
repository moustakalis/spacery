/**
 * Whether a leaf value is a single CSS value, safe to concatenate.
 *
 * **A port of `Generator::is_value()`, and it has to stay one.** The front end
 * drops a value this rejects; if the editor kept it, the preview would show the
 * author something the page will not render -- which is the exact divergence a
 * preview exists to remove. The two are asserted against the same table of
 * cases (`GeneratorTest::accepted_values()` and `::refused_values()`,
 * transcribed into `tests/unit/isValue.test.ts`), so a case added to one has to
 * be added to the other.
 *
 * It is a port rather than a shipped rule because it is a **shape** and not a
 * pattern. D19: patterns that are regexes travel from PHP with the rest of the
 * screen's data; rules that are shapes are reimplemented and pinned by the PHP
 * suite's own table. This one is a nesting check, so it takes the second path.
 *
 * The hazard is the same on both sides. `wp.styleEngine.getCSSRules()` passes a
 * string through exactly as `wp_style_engine_get_styles()` does -- measured:
 * `10px;color:red` still yields a `paddingTop` rule carrying the injection --
 * so nothing downstream will catch what this lets past.
 */

/** Keywords a spacing property may legitimately be set to. */
const KEYWORDS = [
	'auto',
	'inherit',
	'initial',
	'none',
	'revert',
	'revert-layer',
	'unset',
];

/** Functions whose result is a value, and which the box can author. */
const FUNCTIONS = ['calc', 'clamp', 'max', 'min', 'var'];

/** A core preset reference, as core's own controls store it. */
const PRESET = /^var:[a-z0-9_-]+\|[a-z0-9_-]+\|[a-z0-9_-]+$/i;

/** A number, with or without a unit. `%` is a unit here. */
const NUMBER = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[a-z]+|%)?$/i;

/**
 * A function call whose argument list holds nothing that could end the
 * declaration or start another.
 */
const CALL = /^[a-z]+\([a-z0-9_.,%+\-*/\s()#]*\)$/i;

/**
 * Whether a value may be emitted.
 *
 * @param value The authored value.
 * @return True when it is a single, safe CSS value.
 */
export function isValue(value: string): boolean {
	const trimmed = value.trim();

	if ('' === trimmed) {
		return false;
	}

	if (KEYWORDS.includes(trimmed.toLowerCase())) {
		return true;
	}

	if (PRESET.test(trimmed) || NUMBER.test(trimmed)) {
		return true;
	}

	if (!CALL.test(trimmed)) {
		return false;
	}

	/*
	 * Every function named anywhere in it has to be one of ours, nesting
	 * included. Checking only the outermost name let `calc(url(x))` through --
	 * caught by the PHP table, which is the argument for keeping the two in
	 * step. An empty name is a bare parenthesis doing arithmetic grouping, as
	 * in `calc((1px + 2px) * 2)`, and is fine.
	 *
	 * The expression is built here rather than held at module scope because a
	 * global regex carries `lastIndex`, and a shared one is a bug waiting for
	 * its second caller.
	 */
	for (const found of trimmed.matchAll(/([a-z-]*)\(/gi)) {
		const name = found[1] ?? '';

		if ('' !== name && !FUNCTIONS.includes(name.toLowerCase())) {
			return false;
		}
	}

	return true;
}
