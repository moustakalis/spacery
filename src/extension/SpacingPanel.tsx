/**
 * The responsive spacing panel Spacery adds to every block that supports spacing.
 *
 * Collapsed by default. This panel appears on most blocks on the page, so an
 * open one would read as clutter on every single selection — the cost of
 * extending broadly is that the extension has to be quiet.
 *
 * The tier being edited is chosen here rather than by the canvas alone (D17).
 * Core's preview viewport still decides which tier is selected when the panel
 * opens and whenever the preview changes, so the common path is unchanged; the
 * difference is that an author can step through Spacery's tiers without
 * disturbing what the canvas is showing.
 */

import { useSettings } from '@wordpress/block-editor';
import { getBlockSupport } from '@wordpress/blocks';
import {
	Button,
	Flex,
	FlexItem,
	__experimentalText as Text,
} from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';
import { useMemo } from 'react';

import { readPath } from '../attribute/paths';
import { authoredAt, effectiveAt, withValue } from '../attribute/tiers';
import type {
	SpaceryAttribute,
	StyleNode,
	StylePath,
} from '../attribute/types';
import { TierSelector } from '../breakpoints/TierSelector';
import type { Breakpoint } from '../breakpoints/types';
import { useBreakpoints } from '../breakpoints/useBreakpoints';
import { useCanvasBreakpoint } from '../breakpoints/useCanvasBreakpoint';
import { useCanvasWindow } from '../breakpoints/useCanvasWindow';
import { useCoreViewports } from '../breakpoints/useCoreViewports';
import { useResponsiveEditing } from '../breakpoints/useResponsiveEditing';
import { useSelectedTier } from '../breakpoints/useSelectedTier';
import { SpacingBox } from './SpacingBox';
import {
	pathFor,
	type Side,
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

	const canvasSlug = responsiveEditing ? canvas.slug : undefined;
	const { tier: active, select } = useSelectedTier(breakpoints, canvasSlug);

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

	if (!active) {
		return <></>;
	}

	return (
		<Flex direction="column" gap={4}>
			<FlexItem>
				<TierSelector
					breakpoints={breakpoints}
					value={active.slug}
					canvasSlug={canvasSlug}
					responsiveEditing={responsiveEditing}
					onChange={select}
				/>
			</FlexItem>

			<FlexItem>
				<TierFields
					breakpoint={active}
					breakpoints={breakpoints}
					features={features}
					attributes={attributes}
					setAttributes={setAttributes}
				/>
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
 * The controls for the selected tier.
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

	/*
	 * The tier reset appears only when it would do more than one box's reset
	 * already does. On a block supporting margin alone, two buttons a line
	 * apart with identical effect is a puzzle, not a convenience.
	 */
	const authoredBoxes = features.filter((feature) =>
		feature.sides.some(
			(side) =>
				undefined !==
				authoredAt(
					attributes.spacery,
					breakpoint.slug,
					pathFor(feature.feature, side)
				)
		)
	).length;

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

					{authoredBoxes > 1 && (
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
								{__('Reset all', 'spacery')}
							</Button>
						</FlexItem>
					)}
				</Flex>
			</FlexItem>

			{features.map((feature) => (
				<FlexItem key={feature.feature}>
					<SpacingBox
						label={feature.label}
						sides={feature.sides}
						units={units}
						values={boxValues(attributes, breakpoint.slug, feature)}
						placeholders={boxPlaceholders(
							attributes,
							breakpoints,
							breakpoint.slug,
							feature
						)}
						onChange={(next) =>
							setAttributes({
								spacery: writeBox(
									attributes.spacery,
									breakpoint.slug,
									feature,
									next
								),
							})
						}
					/>
				</FlexItem>
			))}
		</Flex>
	);
}

/**
 * One tier's authored values for one feature, keyed by side.
 *
 * Only the sides the block supports; the box renders a field per key it is
 * given a side for.
 *
 * @param attributes The block's attributes.
 * @param slug       The tier being edited.
 * @param feature    The feature this box edits.
 * @return Values keyed by side.
 */
function boxValues(
	attributes: ExtendedAttributes,
	slug: string,
	feature: SpacingFeature
): Partial<Record<Side, string>> {
	const values: Partial<Record<Side, string>> = {};

	for (const side of feature.sides) {
		const value = authoredAt(
			attributes.spacery,
			slug,
			pathFor(feature.feature, side)
		);

		if (undefined !== value) {
			values[side] = value;
		}
	}

	return values;
}

/**
 * What each empty side of one box would fall back to.
 *
 * @param attributes  The block's attributes.
 * @param breakpoints The active set, widest first.
 * @param slug        The tier being edited.
 * @param feature     The feature this box edits.
 * @return Inherited values keyed by side, for the sides that have one.
 */
function boxPlaceholders(
	attributes: ExtendedAttributes,
	breakpoints: Breakpoint[],
	slug: string,
	feature: SpacingFeature
): Partial<Record<Side, string>> {
	const placeholders: Partial<Record<Side, string>> = {};

	for (const side of feature.sides) {
		const value = inheritedValue(
			attributes,
			breakpoints,
			slug,
			pathFor(feature.feature, side)
		);

		if ('' !== value) {
			placeholders[side] = value;
		}
	}

	return placeholders;
}

/**
 * Applies a spacing box's change to one tier.
 *
 * Every supported side is written on every change, including the ones that
 * came back empty: linking the box and clearing it emits blanks rather than
 * omissions, and treating a blank as "leave it alone" would make the box
 * impossible to empty.
 *
 * @param attribute The block's `spacery` attribute.
 * @param slug      The tier being edited.
 * @param feature   The feature this box edits.
 * @param next      The control's new values.
 * @return The next attribute, or undefined when nothing is left.
 */
function writeBox(
	attribute: SpaceryAttribute | undefined,
	slug: string,
	feature: SpacingFeature,
	next: Partial<Record<string, string | undefined>> | undefined
): SpaceryAttribute | undefined {
	let result = attribute;

	for (const side of feature.sides) {
		const value = next?.[side];

		result = withValue(
			result,
			slug,
			pathFor(feature.feature, side),
			'' === value ? undefined : value
		);
	}

	return result;
}

/**
 * The value a blank field would fall back to.
 *
 * Wider Spacery tiers first, then the block's own non-responsive `style`. That
 * order is the cascade the server generates, so the note is a promise about the
 * rendered page rather than a guess.
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
