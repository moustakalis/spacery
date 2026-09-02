/**
 * Editor UI for the spacer block.
 *
 * M3 gives the block a working, honest editor: a base height plus one height
 * control per breakpoint, each showing whether its value is set here or
 * inherited from a wider tier. It deliberately does NOT yet follow the editor's
 * viewport (D12) or preview the active tier on the canvas — that is M4, and it
 * needs the ResizeObserver wiring to the canvas iframe.
 */

import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import {
	__experimentalUnitControl as UnitControl,
	Button,
	Flex,
	FlexItem,
	PanelBody,
	__experimentalText as Text,
} from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';

import type { Breakpoint } from '../../breakpoints/types';
import { useBreakpoints } from '../../breakpoints/useBreakpoints';
import { heightAt, inheritedFrom, withHeight } from './height';
import type { SpacerAttributes } from './types';

const UNITS = [
	{ value: 'px', label: 'px' },
	{ value: 'rem', label: 'rem' },
	{ value: 'em', label: 'em' },
	{ value: 'vh', label: 'vh' },
];

interface EditProps {
	attributes: SpacerAttributes;
	setAttributes: (next: Partial<SpacerAttributes>) => void;
}

export default function Edit({ attributes, setAttributes }: EditProps) {
	const breakpoints = useBreakpoints();
	const { height } = attributes;

	const blockProps = useBlockProps({
		style: { height },
	});

	return (
		<>
			<InspectorControls>
				<PanelBody title={__('Height', 'spacery')}>
					<UnitControl
						label={__('Default', 'spacery')}
						help={__(
							'Applies at every width unless a breakpoint below overrides it.',
							'spacery'
						)}
						value={height}
						units={UNITS}
						onChange={(next?: string) =>
							setAttributes({ height: next ?? '' })
						}
					/>
				</PanelBody>

				{breakpoints.map((breakpoint: Breakpoint) => (
					<TierControl
						key={breakpoint.slug}
						breakpoint={breakpoint}
						breakpoints={breakpoints}
						attributes={attributes}
						setAttributes={setAttributes}
					/>
				))}
			</InspectorControls>

			<div {...blockProps} aria-hidden="true" />
		</>
	);
}

interface TierControlProps extends EditProps {
	breakpoint: Breakpoint;
	breakpoints: Breakpoint[];
}

/**
 * One breakpoint's height control.
 *
 * Shows an inherited value as the placeholder rather than as the value, so the
 * author can tell at a glance which tiers they have actually set. That
 * distinction is the whole reason the attribute stores only authored values and
 * lets the server expand them.
 * @param root0
 * @param root0.breakpoint
 * @param root0.breakpoints
 * @param root0.attributes
 * @param root0.setAttributes
 */
function TierControl({
	breakpoint,
	breakpoints,
	attributes,
	setAttributes,
}: TierControlProps) {
	const authored = attributes.spacery?.[breakpoint.slug]?.dimensions?.height;
	const source = inheritedFrom(attributes, breakpoints, breakpoint.slug);
	const effective = heightAt(attributes, breakpoints, breakpoint.slug);
	const provenance = describeProvenance(authored, source);

	return (
		<PanelBody
			title={sprintf(
				/* translators: 1: breakpoint name, 2: its upper bound, e.g. "Tablet · ≤782px". */
				__('%1$s · ≤%2$s', 'spacery'),
				breakpoint.label,
				breakpoint.max
			)}
			initialOpen={undefined !== authored}
		>
			<UnitControl
				value={authored ?? ''}
				placeholder={effective}
				units={UNITS}
				onChange={(next?: string) =>
					setAttributes(withHeight(attributes, breakpoint.slug, next))
				}
			/>

			<Flex justify="space-between" align="center">
				<FlexItem>
					<Text variant="muted" size={12}>
						{provenance}
					</Text>
				</FlexItem>

				{undefined !== authored && (
					<FlexItem>
						<Button
							size="small"
							variant="tertiary"
							onClick={() =>
								setAttributes(
									withHeight(
										attributes,
										breakpoint.slug,
										undefined
									)
								)
							}
						>
							{__('Reset', 'spacery')}
						</Button>
					</FlexItem>
				)}
			</Flex>
		</PanelBody>
	);
}

/**
 * Says where a tier's height actually comes from.
 *
 * Kept separate so the control can show provenance plainly: authors need to
 * distinguish a value they set from one that merely reaches this tier, which is
 * the reason the attribute stores only authored values.
 * @param authored
 * @param source
 */
function describeProvenance(
	authored: string | undefined,
	source: string | undefined
): string {
	if (undefined !== authored) {
		return __('Set here', 'spacery');
	}

	if (undefined !== source) {
		return sprintf(
			/* translators: %s: the breakpoint a value is inherited from. */
			__('Inherited from %s', 'spacery'),
			source
		);
	}

	return __('Inherited from Default', 'spacery');
}
