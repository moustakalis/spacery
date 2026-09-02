/**
 * Editor UI for the spacer block.
 *
 * Spacery has no viewport switcher of its own. Core 7.1 makes responsive
 * editing a mode: the author turns on "Responsive styles", picks a device or
 * drags the canvas edge, and every inspector control then edits that viewport.
 * A second switcher here would compete with it — the editor announcing "Tablet"
 * while Spacery announced "Laptop". Following the canvas instead means core's
 * own resize handle becomes Spacery's tier selector, including for the tiers
 * core has no device preset for.
 */

import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import {
	Button,
	Flex,
	FlexItem,
	PanelBody,
	SelectControl,
	__experimentalText as Text,
	__experimentalUnitControl as UnitControl,
} from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';
import { useState } from 'react';

import type { Breakpoint } from '../../breakpoints/types';
import { useBreakpoints } from '../../breakpoints/useBreakpoints';
import { useCanvasBreakpoint } from '../../breakpoints/useCanvasBreakpoint';
import { useResponsiveEditing } from '../../breakpoints/useResponsiveEditing';
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

	/*
	 * With core's responsive editing switched off there is no canvas to follow,
	 * so the author picks a tier here instead.
	 */
	const [picked, setPicked] = useState<string>('');
	const activeSlug = responsiveEditing ? canvas.slug : picked || undefined;

	const active = breakpoints.find((b) => b.slug === activeSlug);

	// The canvas shows the height that would actually apply at its width.
	const previewHeight = active
		? heightAt(attributes, breakpoints, active.slug)
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

					{!responsiveEditing && breakpoints.length > 0 && (
						<SelectControl
							label={__('Breakpoint', 'spacery')}
							help={__(
								'Responsive editing is switched off for this site, so choose a breakpoint here.',
								'spacery'
							)}
							value={picked}
							options={[
								{ value: '', label: __('Default', 'spacery') },
								...breakpoints.map((b) => ({
									value: b.slug,
									label: b.label,
								})),
							]}
							onChange={setPicked}
						/>
					)}
				</PanelBody>

				{active ? (
					<ActiveTier
						breakpoint={active}
						breakpoints={breakpoints}
						attributes={attributes}
						setAttributes={setAttributes}
					/>
				) : (
					<PanelBody title={__('Breakpoints', 'spacery')}>
						<Text variant="muted">
							{responsiveEditing
								? __(
										'Resize the canvas or switch device view to set a height for narrower screens.',
										'spacery'
									)
								: __(
										'Choose a breakpoint above to set a height for narrower screens.',
										'spacery'
									)}
						</Text>
					</PanelBody>
				)}

				{breakpoints.length > 0 && (
					<PanelBody
						title={__('Set at', 'spacery')}
						initialOpen={false}
					>
						<Summary
							breakpoints={breakpoints}
							attributes={attributes}
							activeSlug={activeSlug}
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
}

/**
 * The control for whichever tier the canvas is showing.
 *
 * The header names the tier and its boundary because core's badge and Spacery's
 * tier legitimately disagree: at a 900px canvas core reads "Desktop" (>782px)
 * while Spacery is on "Laptop" (≤1024px). Both are right within their own set,
 * and hiding the difference would be worse than naming it.
 * @param root0               Component props.
 * @param root0.breakpoint    The tier being edited.
 * @param root0.breakpoints   The active set, widest first.
 * @param root0.attributes    The block's attributes.
 * @param root0.setAttributes Attribute setter.
 * @return The control for the active tier.
 */
function ActiveTier({
	breakpoint,
	breakpoints,
	attributes,
	setAttributes,
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
 * Read-only on purpose. Making these clickable would rebuild the viewport
 * switcher this design deliberately does not have, but the author still needs
 * to see what they have set without dragging the canvas to every width.
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
