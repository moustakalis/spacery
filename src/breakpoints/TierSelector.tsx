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
import { fitsAsSegments } from './segments';
import type { Breakpoint } from './types';

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
				{fitsAsSegments(breakpoints, withIcons) ? (
					<ToggleGroupControl
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
						hideLabelFromVision
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
			 *
			 * And never alongside the note below: with responsive editing off
			 * the canvas cannot follow at all, so naming a tier it is "still
			 * previewing" adds a second explanation of the same fact and a
			 * third line of muted text before the author reaches a field.
			 */}
			{responsiveEditing && canvasTier && canvasTier.slug !== value && (
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
