/**
 * The responsive spacing panel Spacery adds to every block that supports spacing.
 *
 * Collapsed by default. This panel appears on most blocks on the page, so an
 * open one would read as clutter on every single selection — the cost of
 * extending broadly is that the extension has to be quiet.
 *
 * Like the spacer block, it has no viewport switcher of its own: core's canvas
 * *is* the selector. See the note at the top of `src/blocks/spacer/edit.tsx`.
 */

import { useSettings } from '@wordpress/block-editor';
import { getBlockSupport } from '@wordpress/blocks';
import {
	Button,
	Flex,
	FlexItem,
	SelectControl,
	__experimentalText as Text,
	__experimentalUnitControl as UnitControl,
} from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';
import { useMemo, useState } from 'react';

import { readPath } from '../attribute/paths';
import { authoredAt, effectiveAt, withValue } from '../attribute/tiers';
import type {
	SpaceryAttribute,
	StyleNode,
	StylePath,
} from '../attribute/types';
import type { Breakpoint } from '../breakpoints/types';
import { useBreakpoints } from '../breakpoints/useBreakpoints';
import { useCanvasBreakpoint } from '../breakpoints/useCanvasBreakpoint';
import { useCanvasWindow } from '../breakpoints/useCanvasWindow';
import { useCoreViewports } from '../breakpoints/useCoreViewports';
import { useResponsiveEditing } from '../breakpoints/useResponsiveEditing';
import {
	pathFor,
	sideLabel,
	type SpacingFeature,
	spacingFeatures,
} from './supports';
import { TakeoverNotice } from './TakeoverNotice';
import { coreOverrides } from './takeover';

/**
 * Units offered for spacing, before the theme narrows them.
 */
const UNITS = [
	{ value: 'px', label: 'px' },
	{ value: 'rem', label: 'rem' },
	{ value: 'em', label: 'em' },
	{ value: '%', label: '%' },
	{ value: 'vw', label: 'vw' },
];

export interface ExtendedAttributes extends Record<string, unknown> {
	spacery?: SpaceryAttribute | undefined;
	style?: StyleNode | undefined;
}

interface SpacingPanelProps {
	name: string;
	attributes: ExtendedAttributes;
	setAttributes: (next: Record<string, unknown>) => void;
}

/**
 * The panel body's contents.
 *
 * @param root0               Component props.
 * @param root0.name          Block name, used to read its spacing supports.
 * @param root0.attributes    The block's attributes.
 * @param root0.setAttributes Attribute setter.
 * @return The panel contents.
 */
export function SpacingPanel({
	name,
	attributes,
	setAttributes,
}: SpacingPanelProps): React.ReactElement {
	const breakpoints = useBreakpoints();
	const responsiveEditing = useResponsiveEditing();
	const coreViewports = useCoreViewports();
	const canvas = useCanvasBreakpoint(breakpoints, useCanvasWindow());

	/*
	 * With core's responsive editing switched off there is no canvas to follow,
	 * so the author picks a tier here instead.
	 */
	const [picked, setPicked] = useState<string>('');
	const activeSlug = responsiveEditing ? canvas.slug : picked || undefined;
	const active = breakpoints.find((b) => b.slug === activeSlug);

	const features = useEditableFeatures(name);
	const paths = useMemo(
		() =>
			features.flatMap((feature) =>
				feature.sides.map((side) => pathFor(feature.feature, side))
			),
		[features]
	);

	const overrides = useMemo(
		() =>
			coreOverrides(attributes.style, paths, breakpoints, coreViewports),
		[attributes.style, paths, breakpoints, coreViewports]
	);

	if (0 === breakpoints.length) {
		return (
			<Text variant="muted">
				{__(
					'This site has no breakpoints, so there is nothing to set here yet.',
					'spacery'
				)}
			</Text>
		);
	}

	/*
	 * A theme can switch spacing off in theme.json. Core hides its own controls
	 * then, and a Spacery panel offering padding a site has disabled would
	 * generate CSS it asked not to have.
	 */
	if (0 === features.length) {
		return (
			<Text variant="muted">
				{__(
					'This theme has spacing controls switched off for this block.',
					'spacery'
				)}
			</Text>
		);
	}

	return (
		<Flex direction="column" gap={4}>
			{!responsiveEditing && (
				<FlexItem>
					<SelectControl
						label={__('Breakpoint', 'spacery')}
						help={__(
							'Responsive editing is switched off for this site, so choose a breakpoint here.',
							'spacery'
						)}
						value={picked}
						options={[
							{ value: '', label: __('None', 'spacery') },
							...breakpoints.map((b) => ({
								value: b.slug,
								label: b.label,
							})),
						]}
						onChange={setPicked}
					/>
				</FlexItem>
			)}

			<FlexItem>
				{active ? (
					<TierFields
						breakpoint={active}
						breakpoints={breakpoints}
						features={features}
						attributes={attributes}
						setAttributes={setAttributes}
					/>
				) : (
					<Text variant="muted">
						{responsiveEditing
							? __(
									'Resize the canvas or switch device view to set spacing for narrower screens.',
									'spacery'
								)
							: __(
									'Choose a breakpoint above to set spacing for narrower screens.',
									'spacery'
								)}
					</Text>
				)}
			</FlexItem>

			{overrides.length > 0 && (
				<FlexItem>
					<TakeoverNotice
						overrides={overrides}
						spacery={attributes.spacery}
						style={attributes.style}
						setAttributes={setAttributes}
					/>
				</FlexItem>
			)}
		</Flex>
	);
}

interface TierFieldsProps {
	breakpoint: Breakpoint;
	breakpoints: Breakpoint[];
	features: SpacingFeature[];
	attributes: ExtendedAttributes;
	setAttributes: (next: Record<string, unknown>) => void;
}

/**
 * The controls for whichever tier the canvas is showing.
 *
 * The heading names the tier *and* its boundary because core's badge and
 * Spacery's tier legitimately disagree: at a 900px canvas core reads "Desktop"
 * (>782px) while Spacery is on "Laptop" (≤1024px). Both are right within their
 * own set, and hiding the difference would be worse than naming it.
 *
 * @param root0               Component props.
 * @param root0.breakpoint    The tier being edited.
 * @param root0.breakpoints   The active set, widest first.
 * @param root0.features      Editable spacing features for this block.
 * @param root0.attributes    The block's attributes.
 * @param root0.setAttributes Attribute setter.
 * @return The controls.
 */
function TierFields({
	breakpoint,
	breakpoints,
	features,
	attributes,
	setAttributes,
}: TierFieldsProps): React.ReactElement {
	const units = useAllowedUnits();
	const authoredHere = features.some((feature) =>
		feature.sides.some(
			(side) =>
				undefined !==
				authoredAt(
					attributes.spacery,
					breakpoint.slug,
					pathFor(feature.feature, side)
				)
		)
	);

	return (
		<Flex direction="column" gap={3}>
			<FlexItem>
				<Flex justify="space-between" align="center">
					<FlexItem>
						<Text weight={600} size={12}>
							{sprintf(
								/* translators: 1: breakpoint name, 2: its upper bound, e.g. "Laptop · ≤1024px". */
								__('%1$s · ≤%2$s', 'spacery'),
								breakpoint.label,
								breakpoint.max
							)}
						</Text>
					</FlexItem>

					{authoredHere && (
						<FlexItem>
							<Button
								size="small"
								variant="tertiary"
								onClick={() =>
									setAttributes({
										spacery: clearTier(
											attributes.spacery,
											breakpoint.slug,
											features
										),
									})
								}
							>
								{__('Reset', 'spacery')}
							</Button>
						</FlexItem>
					)}
				</Flex>
			</FlexItem>

			{features.map((feature) => (
				<FlexItem key={feature.feature}>
					<Text variant="muted" size={12}>
						{feature.label}
					</Text>

					{feature.sides.map((side) => {
						const path = pathFor(feature.feature, side);

						return (
							<UnitControl
								key={side}
								label={sideLabel(side)}
								value={
									authoredAt(
										attributes.spacery,
										breakpoint.slug,
										path
									) ?? ''
								}
								placeholder={inheritedValue(
									attributes,
									breakpoints,
									breakpoint.slug,
									path
								)}
								units={units}
								onChange={(next?: string) =>
									setAttributes({
										spacery: withValue(
											attributes.spacery,
											breakpoint.slug,
											path,
											next
										),
									})
								}
							/>
						);
					})}
				</FlexItem>
			))}

			<FlexItem>
				<Text variant="muted" size={12}>
					{__(
						'Empty fields inherit from the nearest wider breakpoint.',
						'spacery'
					)}
				</Text>
			</FlexItem>
		</Flex>
	);
}

/**
 * The value a blank field would fall back to.
 *
 * Wider Spacery tiers first, then the block's own non-responsive `style`. That
 * order is the cascade the server generates, so the placeholder is a promise
 * about the rendered page rather than a guess.
 *
 * @param attributes  The block's attributes.
 * @param breakpoints The active set, widest first.
 * @param slug        The tier being edited.
 * @param path        The property path.
 * @return The inherited value, or an empty string when there is none.
 */
function inheritedValue(
	attributes: ExtendedAttributes,
	breakpoints: Breakpoint[],
	slug: string,
	path: StylePath
): string {
	const index = breakpoints.findIndex((b) => b.slug === slug);
	const wider = breakpoints[index - 1];

	const fromTiers = wider
		? effectiveAt(attributes.spacery, breakpoints, wider.slug, path)
		: undefined;

	return fromTiers ?? readPath(attributes.style, path) ?? '';
}

/**
 * Clears every spacing value one tier holds, leaving other style keys alone.
 *
 * @param attribute The block's `spacery` attribute.
 * @param slug      The tier to clear.
 * @param features  Editable spacing features for this block.
 * @return The next attribute, or undefined when nothing is left.
 */
function clearTier(
	attribute: SpaceryAttribute | undefined,
	slug: string,
	features: SpacingFeature[]
): SpaceryAttribute | undefined {
	let next = attribute;

	for (const feature of features) {
		for (const side of feature.sides) {
			next = withValue(
				next,
				slug,
				pathFor(feature.feature, side),
				undefined
			);
		}
	}

	return next;
}

/**
 * The spacing features this block declares *and* the theme allows.
 *
 * Both gates matter. Block supports say what the block is willing to have
 * spacing applied to; `settings.spacing.*` says what the site has turned on.
 * Core hides its own controls when either says no, and a Spacery panel offering
 * padding a theme has disabled would generate CSS the site asked not to have.
 *
 * @param name Block name.
 * @return The features to render.
 */
function useEditableFeatures(name: string): SpacingFeature[] {
	const [padding, margin] = useSettings('spacing.padding', 'spacing.margin');

	return useMemo(() => {
		const allowed: Record<string, boolean> = {
			padding: false !== padding,
			margin: false !== margin,
		};

		return spacingFeatures(getBlockSupport(name, 'spacing')).filter(
			(feature) => allowed[feature.feature]
		);
	}, [name, padding, margin]);
}

/**
 * Units the theme allows for spacing, or Spacery's own list when it says nothing.
 *
 * @return Unit options for UnitControl.
 */
function useAllowedUnits(): Array<{ value: string; label: string }> {
	const [allowed] = useSettings('spacing.units');

	return useMemo(() => {
		if (!Array.isArray(allowed)) {
			return UNITS;
		}

		const narrowed = UNITS.filter((unit) => allowed.includes(unit.value));

		// A theme allowing only units Spacery does not offer still needs one.
		return narrowed.length > 0 ? narrowed : UNITS;
	}, [allowed]);
}
