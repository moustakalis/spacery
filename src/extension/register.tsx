/**
 * Attaches Spacery to every block that supports spacing.
 *
 * Two filters, both registered at module scope on purpose.
 * `blocks.registerBlockType` only reaches blocks registered *after* it is
 * added, and core registers its own during `initializeEditor()`, which runs on
 * `domReady`. A script enqueued through `enqueue_block_editor_assets` executes
 * before that, so registering here — not inside a callback — is what makes the
 * attribute reach core's blocks at all.
 */

import { InspectorControls, useStyleOverride } from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
import { createHigherOrderComponent } from '@wordpress/compose';
import { addFilter } from '@wordpress/hooks';
import { __ } from '@wordpress/i18n';

import { extendsBlock, isExtendable } from './extendable';
import { getSpacerySettings } from '../breakpoints/settings';
import { previewCss } from './preview';
import {
	type ExtendedAttributes,
	SpacingPanel,
	useMarkedTiers,
} from './SpacingPanel';

/** Namespace for Spacery's editor filters. */
const NAMESPACE = 'spacery/spacing';

interface BlockSettings extends Record<string, unknown> {
	attributes?: Record<string, unknown>;
	supports?: { spacing?: unknown };
}

/**
 * Adds the `spacery` attribute to a block's type.
 *
 * The attribute lives only in the block comment delimiter — nothing is written
 * into saved markup — so deactivating Spacery leaves every post valid. The
 * attribute simply stops being interpreted. That is the structural fix for v1,
 * which serialized a `<style>` element into `save()` and could therefore never
 * change its output without invalidating every existing block.
 *
 * @param settings Block type settings.
 * @param name     Block name.
 * @return The settings, extended when the block qualifies.
 */
export function addSpacingAttribute(
	settings: BlockSettings,
	name: string
): BlockSettings {
	if (!isExtendable(name, settings.supports?.spacing)) {
		return settings;
	}

	// Spacery's own blocks declare it themselves, with their own controls.
	if (undefined !== settings.attributes?.spacery) {
		return settings;
	}

	return {
		...settings,
		attributes: {
			...settings.attributes,
			spacery: { type: 'object' },
		},
	};
}

interface BlockEditProps {
	clientId: string;
	name: string;
	attributes: ExtendedAttributes;
	setAttributes: (next: Record<string, unknown>) => void;
}

/**
 * Adds the inspector panel to blocks carrying the attribute.
 */
/**
 * Marks a collapsed panel that has something inside it.
 *
 * `PanelBody` types `icon` as a JSX element and renders it in the header beside
 * the title, which is the whole requirement. Migrating to `ToolsPanel` for this
 * was considered and rejected: its header carries a menu of resettable items,
 * not a dot, so the indicator is custom work either way -- and a `ToolsPanel`
 * models a set of opt-in properties, where this panel is one property set
 * viewed through a tier switch.
 */
const DOT = (
	<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
		<circle cx="12" cy="12" r="4" fill="currentColor" />
	</svg>
);

/**
 * The panel, and the header that says whether it is worth opening.
 *
 * A component of its own so its hooks run only for blocks Spacery extends --
 * the wrapper below returns early for everything else, and a hook after an
 * early return is a hook that sometimes does not run.
 *
 * @param props The block's edit props.
 * @return The inspector fill.
 */
function SpaceryPanel(props: BlockEditProps): React.ReactElement {
	const marked = useMarkedTiers(props.name, props.attributes);
	const hasValues = 0 < marked.length;

	return (
		/*
		 * `styles`, not the default `settings` group.
		 *
		 * A bare `InspectorControls` fills the Settings tab, which put Spacery
		 * one tab away from `Dimensions` -- the panel that holds the very
		 * values these fields override, and whose value is the placeholder
		 * shown in the widest tier's inputs (`inheritedValue()` ends on
		 * `attributes.style`). Core also edits its own responsive values
		 * through those same Dimensions fields, so the takeover notice was
		 * describing a control the author could not see without switching
		 * tabs. Padding and margin are styles; this is where WordPress keeps
		 * them.
		 *
		 * Not `group="dimensions"`, which would fill core's own `ToolsPanel`:
		 * that slot expects `ToolsPanelItem` children, and Spacery's panel is
		 * a `PanelBody` with a tier selector of its own.
		 */
		<InspectorControls group="styles">
			<PanelBody
				title={__('Spacery', 'spacery')}
				initialOpen={false}
				{...(hasValues ? { icon: DOT } : {})}
				buttonProps={{
					'aria-label': hasValues
						? __(
								'Spacery — this block has responsive values',
								'spacery'
							)
						: __('Spacery', 'spacery'),
				}}
			>
				<SpacingPanel
					clientId={props.clientId}
					name={props.name}
					attributes={props.attributes}
					setAttributes={props.setAttributes}
				/>
			</PanelBody>
		</InspectorControls>
	);
}

const withSpacingPanel = createHigherOrderComponent(
	(BlockEdit: React.ComponentType<BlockEditProps>) =>
		function SpaceryBlockEdit(props: BlockEditProps) {
			if (!extendsBlock(props.name)) {
				return <BlockEdit {...props} />;
			}

			return (
				<>
					<BlockEdit {...props} />
					<SpaceryPanel {...props} />
				</>
			);
		},
	'withSpacerySpacingPanel'
);

/** What `editor.BlockListBlock` hands a block in the canvas. */
interface BlockListProps {
	clientId: string;
	name: string;
	attributes: ExtendedAttributes;
	className?: string;
}

/**
 * The class the preview's rules are written against.
 *
 * Derived from the `clientId`, not from the content, and that is the one place
 * this deliberately differs from the front end. `Generator` hashes the values
 * so that many blocks sharing a recipe share one rule; here there is exactly
 * one style override per block by construction, so there is nothing to dedupe
 * and no reason to port `md5` into the editor. Client ids are regenerated on
 * every editor load, which costs nothing for CSS that never leaves it.
 *
 * Twelve characters to match `Generator::HASH_LENGTH`, so the two read alike in
 * devtools.
 *
 * @param clientId The block's client id.
 * @return A class name.
 */
function previewClass(clientId: string): string {
	return `spy-${clientId.replace(/-/g, '').slice(0, 12)}`;
}

/**
 * Shows a block's responsive values in the canvas.
 *
 * **Without this the plugin appears not to work.** Core previews its own
 * responsive spacing in the same canvas, so an author who sets a core `@tablet`
 * value watches it take effect and then watches a Spacery value do nothing, on
 * the same block in the same session. `PLAN.md` §3.3 specified this and M4
 * recorded it as verified; neither was true until now.
 *
 * `useStyleOverride` is core's own mechanism and is public in 7.1. Measured on
 * the live editor: the element lands in the canvas iframe's `<body>`
 * immediately after core's own block-support style, so Spacery's rules win the
 * source-order tie between two `!important` declarations at equal specificity
 * -- the same way they win on the front end. Nothing here raises specificity,
 * because nothing has to.
 *
 * The hook is called for **every** block, including the ones Spacery does not
 * extend. That is the rules of hooks, and it is free: an empty `css` renders no
 * element at all, measured.
 */
const withSpacingPreview = createHigherOrderComponent(
	(BlockListBlock: React.ComponentType<BlockListProps>) =>
		function SpaceryBlockListBlock(props: BlockListProps) {
			const className = previewClass(props.clientId);

			/*
			 * `extendsBlock()` rather than a check for the attribute alone, so
			 * the gate is the same one the panel uses. `spacery/spacer` carries
			 * a `spacery` attribute of its own and previews its height through
			 * its own `edit.tsx`; styling it here would give the one block that
			 * already has a preview a second one.
			 */
			const css = extendsBlock(props.name)
				? previewCss(
						props.attributes?.spacery,
						getSpacerySettings().breakpoints,
						className
					)
				: '';

			useStyleOverride({ id: `spacery-${props.clientId}`, css });

			if ('' === css) {
				return <BlockListBlock {...props} />;
			}

			return (
				<BlockListBlock
					{...props}
					className={[props.className, className]
						.filter(Boolean)
						.join(' ')}
				/>
			);
		},
	'withSpacerySpacingPreview'
);

/**
 * Registers the filters. Called once, from the bundle's entry point.
 */
export function register(): void {
	addFilter(
		'blocks.registerBlockType',
		`${NAMESPACE}/attribute`,
		addSpacingAttribute
	);

	addFilter('editor.BlockEdit', `${NAMESPACE}/panel`, withSpacingPanel);

	addFilter(
		'editor.BlockListBlock',
		`${NAMESPACE}/preview`,
		withSpacingPreview
	);
}
