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
}

declare module '@wordpress/element' {
	export function createElement(
		type: string,
		props?: Record<string, unknown> | null,
		...children: unknown[]
	): React.ReactElement;
}

declare module '@wordpress/i18n' {
	export function __(text: string, domain?: string): string;
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
	}

	interface UseBlockProps {
		(props?: BlockProps): BlockProps;
		save: (props?: BlockProps) => BlockProps;
	}

	export const useBlockProps: UseBlockProps;
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
		children?: React.ReactNode;
	}>;

	export const Flex: React.ComponentType<{
		justify?: string;
		align?: string;
		children?: React.ReactNode;
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

	export const __experimentalText: React.ComponentType<{
		variant?: string;
		size?: number | string;
		children?: React.ReactNode;
	}>;
}
