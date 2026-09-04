/**
 * Ambient declarations for the `@wordpress/*` packages Spacery uses.
 *
 * These are not installed packages. `wp-scripts` maps them to webpack externals
 * backed by `window.wp.*`, so nothing lands in node_modules and there is no
 * bundled `.d.ts` to read.
 *
 * DefinitelyTyped does publish `@types/wordpress__*`, but they lag badly --
 * `@types/wordpress__components` sits at 23.x against a 30.x runtime -- and
 * omit the underscore-prefixed experimental exports entirely, which are exactly
 * what a block inspector needs. Depending on them would mean five stale
 * packages plus casts at every experimental call site.
 *
 * Declaring only what Spacery actually calls is smaller, deterministic, and
 * doubles as a written record of the editor surface this plugin depends on.
 * Anything added here should be something the code genuinely uses.
 */

declare module '@wordpress/blocks' {
	export function registerBlockType(
		name: string,
		settings: Record<string, unknown>
	): unknown;

	interface BlockType {
		name: string;
		attributes?: Record<string, unknown> | undefined;
		supports?: Record<string, unknown> | undefined;
	}

	export function getBlockType(name: string): BlockType | undefined;

	export function getBlockSupport(
		nameOrType: string,
		feature: string,
		defaultSupports?: unknown
	): unknown;
}

declare module '@wordpress/hooks' {
	export function addFilter(
		hookName: string,
		namespace: string,
		callback: (...args: never[]) => unknown,
		priority?: number
	): void;
}

declare module '@wordpress/compose' {
	export function createHigherOrderComponent<Inner, Outer>(
		mapper: (inner: Inner) => Outer,
		name: string
	): (inner: Inner) => Outer;
}

declare module '@wordpress/element' {
	export function createElement(
		type: string,
		props?: Record<string, unknown> | null,
		...children: unknown[]
	): React.ReactElement;

	interface Root {
		render: (children: React.ReactNode) => void;
		unmount: () => void;
	}

	/**
	 * WordPress's re-export of React 18's client root.
	 *
	 * Imported from here rather than `react-dom/client` because this is the
	 * path `wp-scripts` maps to an external; the React one would be bundled.
	 * @param container
	 */
	export function createRoot(container: Element): Root;
}

declare module '@wordpress/api-fetch' {
	interface FetchOptions {
		path: string;
		method?: string;
		data?: unknown;
		parse?: boolean;
	}

	/**
	 * Typed by the caller, because a REST response's shape is a property of the
	 * route rather than of this function.
	 * @param options
	 */
	export default function apiFetch<T>(options: FetchOptions): Promise<T>;
}

declare module '@wordpress/i18n' {
	export function __(text: string, domain?: string): string;

	/**
	 * Plural form. Greek, like English, has two; other locales have more, which
	 * is the reason a count belongs in `_n()` rather than in a "value(s)" fudge.
	 *
	 * @param single The singular source string.
	 * @param plural The plural source string.
	 * @param number The count deciding which form applies.
	 * @param domain Text domain.
	 * @return The translated string, still holding its placeholders.
	 */
	export function _n(
		single: string,
		plural: string,
		number: number,
		domain?: string
	): string;

	export function sprintf(format: string, ...args: unknown[]): string;
}

declare module '@wordpress/data' {
	export function useSelect<T>(
		mapSelect: (select: (store: unknown) => never) => T,
		deps?: unknown[]
	): T;
}

declare module '@wordpress/block-editor' {
	interface BlockProps extends Record<string, unknown> {
		className?: string | undefined;
		style?: Record<string, string | undefined> | undefined;
		ref?: ((node: HTMLElement | null) => void) | undefined;
	}

	interface UseBlockProps {
		(props?: BlockProps): BlockProps;
		save: (props?: BlockProps) => BlockProps;
	}

	export const useBlockProps: UseBlockProps;

	/**
	 * Reads theme.json settings for the current block context.
	 *
	 * Public since WordPress 6.5, and the only supported way to know whether a
	 * site has switched a spacing feature off. Values are deliberately
	 * `unknown`: each path has its own shape, and callers narrow.
	 *
	 * @param paths Settings paths, e.g. `spacing.padding`.
	 * @return One value per requested path, in order.
	 */
	export function useSettings(...paths: string[]): unknown[];
	export const InspectorControls: React.ComponentType<{
		children?: React.ReactNode;
	}>;

	/** The block editor data store. */
	export const store: unknown;
}

declare module '@wordpress/components' {
	export const PanelBody: React.ComponentType<{
		title?: string;
		initialOpen?: boolean | undefined;
		children?: React.ReactNode;
	}>;

	export const Button: React.ComponentType<{
		size?: 'small' | 'compact' | 'default';
		variant?: 'primary' | 'secondary' | 'tertiary' | 'link';
		onClick?: () => void;
		disabled?: boolean;
		isBusy?: boolean;
		isDestructive?: boolean;
		/** Accessible name, when the visible text is not enough on its own. */
		label?: string;
		children?: React.ReactNode;
	}>;

	export const Flex: React.ComponentType<{
		justify?: string;
		align?: string;
		direction?: string;
		gap?: number;
		children?: React.ReactNode;
	}>;

	export const FlexBlock: React.ComponentType<{
		children?: React.ReactNode;
	}>;

	export const Card: React.ComponentType<{ children?: React.ReactNode }>;
	export const CardBody: React.ComponentType<{ children?: React.ReactNode }>;
	export const CardHeader: React.ComponentType<{
		children?: React.ReactNode;
	}>;

	export const Spinner: React.ComponentType<Record<string, never>>;

	export const Notice: React.ComponentType<{
		status?: 'success' | 'error' | 'warning' | 'info';
		isDismissible?: boolean;
		onRemove?: () => void;
		children?: React.ReactNode;
	}>;

	export const RadioControl: React.ComponentType<{
		label?: string;
		help?: string;
		selected?: string;
		options?: Array<{ label: string; value: string }>;
		onChange?: (value: string) => void;
	}>;

	export const TextControl: React.ComponentType<{
		label?: string;
		help?: string;
		value?: string;
		onChange?: (value: string) => void;
	}>;

	/**
	 * Still underscore-prefixed in WordPress 7.1, like the other two Spacery
	 * uses. `Heading` gives the settings screen headings that match the admin's
	 * own typography scale rather than raw `<h2>` elements.
	 */
	export const __experimentalHeading: React.ComponentType<{
		level?: number;
		children?: React.ReactNode;
	}>;

	export const SelectControl: React.ComponentType<{
		label?: string;
		help?: string;
		value?: string;
		options?: Array<{ value: string; label: string }>;
		onChange?: (value: string) => void;
	}>;

	export const FlexItem: React.ComponentType<{
		children?: React.ReactNode;
	}>;

	/**
	 * Still underscore-prefixed in WordPress 7.1. Renamed rather than promoted
	 * so far, so this alias is the stable-looking name Spacery imports it under.
	 */
	export const __experimentalUnitControl: React.ComponentType<{
		label?: string;
		help?: string;
		value?: string | undefined;
		placeholder?: string;
		units?: Array<{ value: string; label: string }>;
		onChange?: (value?: string) => void;
	}>;

	/**
	 * Core's own four-sided spacing control, with the link toggle and the
	 * single unit selector that make four inputs fit an inspector column.
	 *
	 * Stable in WordPress 7.1: `wp-includes/js/dist/components.js` exports both
	 * `BoxControl` and the older `__experimentalBoxControl`, and they resolve to
	 * the same module. The stable name is used because the plugin requires 7.1
	 * and has no older runtime to support.
	 *
	 * `values` and the `onChange` payload are partial on purpose. A block
	 * declares which sides it supports, and the control is given only those.
	 */
	export const BoxControl: React.ComponentType<{
		label?: string;
		values?: Partial<Record<string, string | undefined>> | undefined;
		onChange?: (next: Partial<Record<string, string | undefined>>) => void;
		sides?: readonly string[];
		units?: Array<{ value: string; label: string }>;
		allowReset?: boolean;
		splitOnAxis?: boolean;
		inputProps?: Record<string, unknown>;
		__next40pxDefaultSize?: boolean;
	}>;

	/**
	 * Segmented radio group. Also stable in 7.1, alongside its experimental
	 * alias. `onChange` is typed loosely because the control reports whatever
	 * was put in `value`, which may be a number for other callers.
	 */
	export const ToggleGroupControl: React.ComponentType<{
		label?: string;
		hideLabelFromVision?: boolean;
		isBlock?: boolean;
		value?: string | number | undefined;
		onChange?: (next?: string | number) => void;
		__next40pxDefaultSize?: boolean;
		children?: React.ReactNode;
	}>;

	export const ToggleGroupControlOption: React.ComponentType<{
		value: string | number;
		label: string;
		showTooltip?: boolean;
	}>;

	export const __experimentalText: React.ComponentType<{
		variant?: string | undefined;
		size?: number | string;
		weight?: number | string;
		children?: React.ReactNode;
	}>;
}
