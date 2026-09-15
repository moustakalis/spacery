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

import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
import { createHigherOrderComponent } from '@wordpress/compose';
import { addFilter } from '@wordpress/hooks';
import { __ } from '@wordpress/i18n';

import { extendsBlock, isExtendable } from './extendable';
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
		<InspectorControls>
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

/**
 * Registers both filters. Called once, from the bundle's entry point.
 */
export function register(): void {
	addFilter(
		'blocks.registerBlockType',
		`${NAMESPACE}/attribute`,
		addSpacingAttribute
	);

	addFilter('editor.BlockEdit', `${NAMESPACE}/panel`, withSpacingPanel);
}
