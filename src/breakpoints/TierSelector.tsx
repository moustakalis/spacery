/**
 * Chooses which tier an inspector panel is editing.
 *
 * Shared by the spacing extension and the spacer block so the two agree: one
 * control, one behaviour, one set of strings. Both sit next to core's viewport
 * UI, and neither moves it — see `useSelectedTier` and D17.
 */

import {
	Flex,
	FlexItem,
	SelectControl,
	__experimentalText as Text,
	__experimentalToggleGroupControl as ToggleGroupControl,
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
	__experimentalToggleGroupControlOptionIcon as ToggleGroupControlOptionIcon,
} from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';

import { iconFor, iconsAreDistinct } from './icons';
import type { Breakpoint } from './types';

/**
 * How many tiers still fit as segments in an inspector sidebar.
 *
 * `ToggleGroupControl` does not wrap; it divides the width it is given. Four or
 * five short labels are readable at ~250px and twelve are not, so past this
 * count the same choice is offered as a dropdown rather than squeezed.
 */
const MAX_SEGMENTS = 5;

interface TierSelectorProps {
	breakpoints: Breakpoint[];
	value: string;
	canvasSlug: string | undefined;
	responsiveEditing: boolean;
	onChange: (slug: string) => void;
}

/**
 * The selector, with a line explaining any divergence from the canvas.
 *
 * @param root0                   Component props.
 * @param root0.breakpoints       The active set, widest first.
 * @param root0.value             The tier being edited.
 * @param root0.canvasSlug        The tier the canvas is previewing, if any.
 * @param root0.responsiveEditing Whether core offers a viewport at all.
 * @param root0.onChange          Called with the chosen slug.
 * @return The selector.
 */
export function TierSelector({
	breakpoints,
	value,
	canvasSlug,
	responsiveEditing,
	onChange,
}: TierSelectorProps): React.ReactElement {
	const canvasTier = breakpoints.find((b) => b.slug === canvasSlug);

	/*
	 * Icons only when they distinguish. A tier's name is arbitrary — themes and
	 * authors choose it — so the icon is picked from the tier's width, and a set
	 * whose widths collapse onto the same glyph keeps its labels instead. The
	 * name is still the accessible name and the tooltip either way.
	 */
	const withIcons = iconsAreDistinct(breakpoints);

	return (
		<Flex direction="column" gap={2}>
			<FlexItem>
				{breakpoints.length <= MAX_SEGMENTS ? (
					<ToggleGroupControl
						__next40pxDefaultSize
						isBlock
						hideLabelFromVision
						label={__('Breakpoint', 'spacery')}
						value={value}
						onChange={(next?: string | number) =>
							onChange(String(next))
						}
					>
						{breakpoints.map((breakpoint) =>
							withIcons ? (
								<ToggleGroupControlOptionIcon
									key={breakpoint.slug}
									value={breakpoint.slug}
									icon={iconFor(breakpoint)}
									label={breakpoint.label}
								/>
							) : (
								<ToggleGroupControlOption
									key={breakpoint.slug}
									value={breakpoint.slug}
									label={breakpoint.label}
								/>
							)
						)}
					</ToggleGroupControl>
				) : (
					<SelectControl
						label={__('Breakpoint', 'spacery')}
						value={value}
						options={breakpoints.map((breakpoint) => ({
							value: breakpoint.slug,
							label: breakpoint.label,
						}))}
						onChange={onChange}
					/>
				)}
			</FlexItem>

			{/*
			 * Only when the two disagree. Saying "this matches the canvas" on
			 * every selection would be noise on the path almost everyone takes.
			 */}
			{canvasTier && canvasTier.slug !== value && (
				<FlexItem>
					<Text variant="muted" size={12}>
						{sprintf(
							/* translators: %s: breakpoint name. */
							__('The canvas is still previewing %s.', 'spacery'),
							canvasTier.label
						)}
					</Text>
				</FlexItem>
			)}

			{!responsiveEditing && (
				<FlexItem>
					<Text variant="muted" size={12}>
						{__(
							'Responsive editing is switched off for this site, so the canvas does not follow along.',
							'spacery'
						)}
					</Text>
				</FlexItem>
			)}
		</Flex>
	);
}
