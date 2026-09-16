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

	/**
	 * Whether a value is a spacing preset reference.
	 *
	 * Public, and used rather than a regex of our own so that what counts as a
	 * preset stays core's definition rather than a second one that can drift.
	 * There is no exported companion for taking the reference apart, which is
	 * why `presets.ts` reads the slug itself — but only after this has said
	 * yes.
	 *
	 * @param value Any stored value.
	 * @return True for `var:preset|spacing|<slug>`.
	 */
	export function isValueSpacingPreset(value: string): boolean;

	/**
	 * The length a spacing preset reference stands for.
	 *
	 * Public. `sizes` is `{ name?, size?, slug }[]` as
	 * `useSettings( 'spacing.spacingSizes' )` returns it. Measured on 7.1: a
	 * slug the site does not define returns `undefined`, a non-preset is
	 * returned unchanged, and **an undefined `sizes` throws** — so callers pass
	 * an array always.
	 *
	 * @param value Any stored value.
	 * @param sizes The site's spacing sizes.
	 * @return The size, or undefined when the slug is unknown.
	 */
	export function getCustomValueFromPreset(
		value: string,
		sizes: Array<{ name?: string; size?: string; slug: string }>
	): string | undefined;
	/**
	 * `group` picks which inspector tab the fill lands in.
	 *
	 * Typed as the groups this plugin uses rather than as `string`: core
	 * accepts more of them, and an unknown one renders nowhere at all with no
	 * error, which is the kind of silence a hand-written declaration should
	 * not be helping along. Omitted means `settings`.
	 */
	export const InspectorControls: React.ComponentType<{
		children?: React.ReactNode;
		group?: 'settings' | 'styles' | 'advanced';
	}>;

	/**
	 * Injects a stylesheet into the editor canvas, iframe and all.
	 *
	 * Public in 7.1, and the signature really is one destructured argument --
	 * read off the shipped function rather than assumed. An empty `css`
	 * renders no element, which is what lets it be called unconditionally.
	 * @param style
	 * @param style.id
	 * @param style.css
	 */
	export function useStyleOverride(style: { id: string; css: string }): void;

	/** The block editor data store. */
	export const store: unknown;
}

declare module '@wordpress/components' {
	export const PanelBody: React.ComponentType<{
		title?: string;
		initialOpen?: boolean | undefined;
		/*
		 * `PanelBodyProps` in packages/components: "An icon to be shown next to
		 * the title", typed `React.JSX.Element` and rendered in the header --
		 * which is the whole requirement for marking a collapsed panel that has
		 * something inside it.
		 */
		icon?: React.JSX.Element;
		/*
		 * "Props that are passed to the `Button` component in title within the
		 * `PanelBody`." The only way to give that button an accessible name: a
		 * bare dot says nothing to a screen reader, and `title` is a string, so
		 * `VisuallyHidden` cannot go inside it.
		 */
		buttonProps?: { 'aria-label'?: string };
		children?: React.ReactNode;
	}>;

	export const Button: React.ComponentType<{
		size?: 'small' | 'compact' | 'default';
		variant?: 'primary' | 'secondary' | 'tertiary' | 'link';
		onClick?: () => void;
		disabled?: boolean;
		isBusy?: boolean;
		isDestructive?: boolean;
		/** Pressed state for a toggle button, announced as aria-pressed. */
		isPressed?: boolean;
		/** An SVG element; Button wraps it in `Icon` itself. */
		icon?: React.ReactNode;
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

	export const CheckboxControl: React.ComponentType<{
		label?: string;
		/*
		 * Picked from `BaseControlProps` like every other control here, and
		 * explicitly `| undefined` because this project has
		 * `exactOptionalPropertyTypes` on and the help text below the box
		 * changes with the box's own state rather than being constant.
		 */
		help?: string | undefined;
		checked?: boolean;
		/*
		 * `CheckboxControl` hands its `onChange` a boolean, not an event --
		 * which is what lets a `useState` setter be passed straight in.
		 */
		onChange?: (checked: boolean) => void;
	}>;

	export const RadioControl: React.ComponentType<{
		label?: string;
		/*
		 * `RadioControlProps` is `Pick<BaseControlProps, 'label' | 'help' |
		 * 'hideLabelFromVision'>`, so this is inherited rather than declared.
		 * It renders the label as the fieldset's legend, which is the group's
		 * only possible accessible name -- a neighbouring heading is not one.
		 */
		hideLabelFromVision?: boolean;
		help?: string;
		selected?: string;
		options?: Array<{ label: string; value: string }>;
		onChange?: (value: string) => void;
	}>;

	export const TextControl: React.ComponentType<{
		label?: string;
		/*
		 * `TextControlProps` picks this from `BaseControlProps`, the same way
		 * `RadioControl` and `UnitControl` do -- and §4 of the design system
		 * prescribes exactly this pattern for a table: "labels move to the
		 * column header and `help` is dropped". The label still has to exist,
		 * or four unlabelled inputs per row announce nothing.
		 */
		hideLabelFromVision?: boolean;
		/*
		 * Explicitly `| undefined`: this project has
		 * `exactOptionalPropertyTypes` on, and a message that is only
		 * sometimes there is passed as `help={maybe}` rather than by building
		 * the props object key by key at every call site.
		 */
		help?: string | undefined;
		/*
		 * Passed straight through to the input, like every other unrecognised
		 * prop: `TextControl` spreads `...additionalProps` onto it. Declared
		 * because the slug column shows a derived slug as a hint until the
		 * author chooses one.
		 */
		placeholder?: string | undefined;
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
		hideLabelFromVision?: boolean;
		/*
		 * Picked from `InputBaseProps`. Note that `__next40pxDefaultSize` and
		 * `__nextHasNoMarginBottom` are NOT declared here on purpose: both are
		 * marked deprecated in packages/components -- "default behavior since
		 * WordPress 7.1" and "since WordPress 7.0" respectively -- and 7.1 is
		 * Spacery's minimum (D4). Passing them would opt into behaviour that is
		 * already the default, using API that is on its way out.
		 */
		size?: 'default' | 'compact' | 'small';
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
		/*
		 * Reached through `Omit<NumberControlProps, 'spinControls' | 'suffix' |
		 * 'type'>`, which keeps `InputControlProps['hideLabelFromVision']`.
		 * Checked in packages/components rather than assumed: the prop is not
		 * declared on `UnitControlProps` itself, only inherited.
		 */
		hideLabelFromVision?: boolean;
		help?: string | undefined;
		value?: string | undefined;
		placeholder?: string;
		units?: Array<{ value: string; label: string }>;
		onChange?: (value?: string) => void;
	}>;

	/**
	 * A number field with no unit of its own.
	 *
	 * The spacing box pairs four of these with one unit picker, which is the
	 * only way four sides fit an inspector column — `UnitControl` carries a unit
	 * select per field and needs the width for it.
	 *
	 * Experimental in WordPress 7.1. Whether a name is stable has to be checked
	 * against `wp-includes/js/dist/components.js`, and the check has to be
	 * anchored: searching it for `NumberControl:` also matches the tail of
	 * `__experimentalNumberControl:`, which is how `ToggleGroupControl` was once
	 * declared stable here when it is not — a component that resolves to
	 * `undefined` at runtime and takes the editor down with React error #130.
	 * The anchored form:
	 *
	 * ```
	 * grep -oE '(^|[,{])NumberControl:\(\)=>' wp-includes/js/dist/components.js
	 * ```
	 */
	/**
	 * The text sibling of `NumberControl`, sharing its label placement and
	 * sizing so a box's fields keep the same shape in custom mode.
	 */
	export const __experimentalInputControl: React.ComponentType<{
		label?: string;
		labelPosition?: 'top' | 'side' | 'bottom' | 'edge';
		size?: 'default' | 'compact' | 'small';
		value?: string | undefined;
		placeholder?: string | undefined;
		onChange?: (value?: string) => void;
	}>;

	export const __experimentalNumberControl: React.ComponentType<{
		label?: string;
		labelPosition?: 'top' | 'side' | 'bottom' | 'edge';
		size?: 'default' | 'compact' | 'small';
		spinControls?: 'none' | 'native' | 'custom';
		value?: string | number | undefined;
		placeholder?: string | undefined;
		min?: number;
		max?: number;
		step?: number;
		onChange?: (value?: string) => void;
	}>;

	/**
	 * Segmented radio group. **Experimental only** in WordPress 7.1 — unlike
	 * `BoxControl`, no stable alias is exported, so this is the name that
	 * exists at runtime.
	 *
	 * `onChange` is typed loosely because the control reports whatever was put
	 * in `value`, which may be a number for other callers.
	 */
	export const __experimentalToggleGroupControl: React.ComponentType<{
		label?: string;
		hideLabelFromVision?: boolean;
		isBlock?: boolean;
		value?: string | number | undefined;
		onChange?: (next?: string | number) => void;
		__next40pxDefaultSize?: boolean;
		children?: React.ReactNode;
	}>;

	export const __experimentalToggleGroupControlOption: React.ComponentType<{
		value: string | number;
		label: string;
		/*
		 * Documented on `ToggleGroupControlOptionProps` in packages/components:
		 * "Label for the option. If needed, the `aria-label` prop can be used
		 * in addition to specify a different label for assistive technologies."
		 * Which is the only way a text segment carries a visible marker without
		 * a screen reader reading the marker out.
		 */
		'aria-label'?: string;
		showTooltip?: boolean;
	}>;

	/**
	 * The same option drawn as an icon. `label` becomes both the tooltip and
	 * the accessible name, so an icon-only selector still announces its tiers.
	 */
	export const __experimentalToggleGroupControlOptionIcon: React.ComponentType<{
		value: string | number;
		icon: React.ReactNode;
		label: string;
	}>;

	export const __experimentalText: React.ComponentType<{
		variant?: string | undefined;
		size?: number | string;
		weight?: number | string;
		upperCase?: boolean;
		children?: React.ReactNode;
	}>;
}

/**
 * `@wordpress/style-engine`, the JavaScript build of the engine
 * `wp_style_engine_get_styles()` runs on the server.
 *
 * Declared here for the same reason everything else in this file is: the
 * package is not in `node_modules`, it is a global the editor publishes
 * (`wp.styleEngine`, script handle `wp-style-engine`). The extraction plugin
 * maps the import to that global and adds the handle to
 * `build/extension.asset.php`, so importing it is also how the dependency is
 * declared.
 *
 * **`key` is camelCase.** `getCSSRules()` returns one entry per declaration
 * with `paddingTop`, not `padding-top` -- written down because a camelCase
 * property inside a stylesheet is silently ignored rather than reported, and
 * this declaration is the only place a reader would find out. Measured against
 * the shipped 7.1 build.
 * @param style
 * @param options
 * @param options.selector
 */
declare module '@wordpress/style-engine' {
	interface StyleRule {
		selector: string;
		/** The CSS property, camelCased. */
		key: string;
		value: string;
	}

	export function getCSSRules(
		style: Record<string, unknown>,
		options?: { selector?: string }
	): StyleRule[];

	export function compileCSS(
		style: Record<string, unknown>,
		options?: { selector?: string }
	): string;
}
