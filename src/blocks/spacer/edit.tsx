/**
 * Editor UI for the spacer block.
 *
 * The tier being edited follows core's preview viewport and can also be chosen
 * here (D17), using the same selector the spacing extension uses — one control
 * and one behaviour across both panels. Choosing a tier here moves neither the
 * canvas nor core's viewport, so nothing competes with core's own device UI;
 * what it buys is reaching the tiers core has no device preset for without
 * dragging the canvas edge to an unmarked width.
 */

import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import {
	Button,
	Flex,
	FlexItem,
	PanelBody,
	__experimentalText as Text,
	__experimentalUnitControl as UnitControl,
} from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';

import { TierSelector } from '../../breakpoints/TierSelector';
import type { Breakpoint } from '../../breakpoints/types';
import { useBreakpoints } from '../../breakpoints/useBreakpoints';
import { useCanvasBreakpoint } from '../../breakpoints/useCanvasBreakpoint';
import { useResponsiveEditing } from '../../breakpoints/useResponsiveEditing';
import { useSelectedTier } from '../../breakpoints/useSelectedTier';
import { authoredHeight, heightAt, inheritedFrom, withHeight } from './height';
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
	const responsiveEditing = useResponsiveEditing();
	const canvas = useCanvasBreakpoint(breakpoints);

	const canvasSlug = responsiveEditing ? canvas.slug : undefined;
	const { tier: active, select } = useSelectedTier(breakpoints, canvasSlug);

	/*
	 * The canvas shows the height that applies at its *own* width, not at the
	 * tier the inspector happens to be editing. Selecting a tier is a statement
	 * about which values you are writing, never about what the page looks like.
	 */
	const previewHeight = canvasSlug
		? heightAt(attributes, breakpoints, canvasSlug)
		: attributes.height;

	const blockProps = useBlockProps({
		ref: canvas.ref,
		style: { height: previewHeight },
	});

	return (
		<>
			<InspectorControls>
				<PanelBody title={__('Height', 'spacery')}>
					<UnitControl
						label={__('Default', 'spacery')}
						help={__(
							'Applies at every width unless a narrower breakpoint overrides it.',
							'spacery'
						)}
						value={attributes.height}
						units={UNITS}
						onChange={(next?: string) =>
							setAttributes({ height: next ?? '' })
						}
					/>
				</PanelBody>

				{active && (
					<ActiveTier
						breakpoint={active}
						breakpoints={breakpoints}
						attributes={attributes}
						setAttributes={setAttributes}
						canvasSlug={canvasSlug}
						responsiveEditing={responsiveEditing}
						onSelect={select}
					/>
				)}

				{breakpoints.length > 0 && (
					<PanelBody
						title={__('Set at', 'spacery')}
						initialOpen={false}
					>
						<Summary
							breakpoints={breakpoints}
							attributes={attributes}
							activeSlug={active?.slug}
						/>
					</PanelBody>
				)}
			</InspectorControls>

			<div {...blockProps} aria-hidden="true" />
		</>
	);
}

interface ActiveTierProps extends EditProps {
	breakpoint: Breakpoint;
	breakpoints: Breakpoint[];
	canvasSlug: string | undefined;
	responsiveEditing: boolean;
	onSelect: (slug: string) => void;
}

/**
 * The selector, and the control for whichever tier it names.
 *
 * The header names the tier and its boundary because core's badge and Spacery's
 * tier legitimately disagree: at a 900px canvas core reads "Desktop" (>782px)
 * while Spacery is on "Laptop" (≤1024px). Both are right within their own set,
 * and hiding the difference would be worse than naming it.
 *
 * @param root0                   Component props.
 * @param root0.breakpoint        The tier being edited.
 * @param root0.breakpoints       The active set, widest first.
 * @param root0.attributes        The block's attributes.
 * @param root0.setAttributes     Attribute setter.
 * @param root0.canvasSlug        The tier the canvas is previewing, if any.
 * @param root0.responsiveEditing Whether core offers a viewport at all.
 * @param root0.onSelect          Called with the tier the author chose.
 * @return The control for the active tier.
 */
function ActiveTier({
	breakpoint,
	breakpoints,
	attributes,
	setAttributes,
	canvasSlug,
	responsiveEditing,
	onSelect,
}: ActiveTierProps) {
	const authored = authoredHeight(attributes, breakpoint.slug);
	const source = inheritedFrom(attributes, breakpoints, breakpoint.slug);
	const effective = heightAt(attributes, breakpoints, breakpoint.slug);

	return (
		<PanelBody
			title={sprintf(
				/* translators: 1: breakpoint name, 2: its upper bound, e.g. "Laptop · ≤1024px". */
				__('%1$s · ≤%2$s', 'spacery'),
				breakpoint.label,
				breakpoint.max
			)}
		>
			<TierSelector
				breakpoints={breakpoints}
				value={breakpoint.slug}
				canvasSlug={canvasSlug}
				responsiveEditing={responsiveEditing}
				onChange={onSelect}
			/>

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
						{describeProvenance(authored, source)}
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

interface SummaryProps {
	breakpoints: Breakpoint[];
	attributes: SpacerAttributes;
	activeSlug: string | undefined;
}

/**
 * Which tiers carry a value.
 *
 * Read-only on purpose, even under D17. The selector above already changes
 * tiers; a second control doing the same thing would be redundant. What this
 * adds is the one thing neither the selector nor the field can show — every
 * tier's value at once, without visiting them.
 * @param root0             Component props.
 * @param root0.breakpoints The active set, widest first.
 * @param root0.attributes  The block's attributes.
 * @param root0.activeSlug  The tier currently being edited, if any.
 * @return A read-only list of which tiers carry a height.
 */
function Summary({ breakpoints, attributes, activeSlug }: SummaryProps) {
	return (
		<Flex direction="column" gap={1}>
			{breakpoints.map((breakpoint) => {
				const authored = authoredHeight(attributes, breakpoint.slug);

				return (
					<Flex key={breakpoint.slug} justify="space-between">
						<FlexItem>
							<Text
								variant={
									undefined === authored ? 'muted' : undefined
								}
								size={12}
							>
								{breakpoint.slug === activeSlug
									? sprintf(
											/* translators: %s: breakpoint name. */
											__('%s (editing)', 'spacery'),
											breakpoint.label
										)
									: breakpoint.label}
							</Text>
						</FlexItem>
						<FlexItem>
							<Text variant="muted" size={12}>
								{authored ?? '—'}
							</Text>
						</FlexItem>
					</Flex>
				);
			})}
		</Flex>
	);
}

/**
 * Says where a tier's height actually comes from.
 *
 * Authors need to distinguish a value they set from one that merely reaches
 * this tier — which is the reason the attribute stores only authored values and
 * lets the server expand them.
 *
 * @param authored The height set at this tier, if any.
 * @param source   The label of the tier inherited from, if any.
 * @return A short phrase naming where the value comes from.
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
