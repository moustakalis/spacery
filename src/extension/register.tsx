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
import { type ExtendedAttributes, SpacingPanel } from './SpacingPanel';

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
	name: string;
	attributes: ExtendedAttributes;
	setAttributes: (next: Record<string, unknown>) => void;
}

/**
 * Adds the inspector panel to blocks carrying the attribute.
 */
const withSpacingPanel = createHigherOrderComponent(
	(BlockEdit: React.ComponentType<BlockEditProps>) =>
		function SpaceryBlockEdit(props: BlockEditProps) {
			if (!extendsBlock(props.name)) {
				return <BlockEdit {...props} />;
			}

			return (
				<>
					<BlockEdit {...props} />
					<InspectorControls>
						<PanelBody
							title={__('Responsive spacing', 'spacery')}
							initialOpen={false}
						>
							<SpacingPanel
								name={props.name}
								attributes={props.attributes}
								setAttributes={props.setAttributes}
							/>
						</PanelBody>
					</InspectorControls>
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
