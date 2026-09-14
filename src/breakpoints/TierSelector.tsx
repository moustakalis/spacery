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
import { fitsAsSegments, markLabel } from './segments';
import type { Breakpoint } from './types';

interface TierSelectorProps {
	breakpoints: Breakpoint[];
	/** Tiers carrying authored values, from `tiersWithValues()`. */
	markedSlugs: string[];
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
 * @param root0.markedSlugs       Tiers carrying authored values.
 * @param root0.value             The tier being edited.
 * @param root0.canvasSlug        The tier the canvas is previewing, if any.
 * @param root0.responsiveEditing Whether core offers a viewport at all.
 * @param root0.onChange          Called with the chosen slug.
 * @return The selector.
 */
export function TierSelector({
	breakpoints,
	markedSlugs,
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

	/*
	 * Which tiers carry values, answered where the author is already choosing
	 * one. Auditing a page previously meant opening the panel on every block
	 * and clicking every segment; the mark costs no vertical space and answers
	 * it in place.
	 */
	const marked = new Set(markedSlugs);

	/**
	 * The name a segment announces, saying whether it carries values.
	 *
	 * Separate from the visible label because a text segment can only carry the
	 * marker in its own string, and "Laptop bullet" is not what a screen reader
	 * should say.
	 *
	 * @param breakpoint The tier.
	 * @return Its accessible name.
	 */
	const nameFor = (breakpoint: Breakpoint): string =>
		marked.has(breakpoint.slug)
			? sprintf(
					/* translators: %s: breakpoint name. Marks a tier that has values set. */
					__('%s (has values)', 'spacery'),
					breakpoint.label
				)
			: breakpoint.label;

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
									icon={iconFor(
										breakpoint,
										marked.has(breakpoint.slug)
									)}
									label={nameFor(breakpoint)}
								/>
							) : (
								<ToggleGroupControlOption
									key={breakpoint.slug}
									value={breakpoint.slug}
									label={
										marked.has(breakpoint.slug)
											? markLabel(breakpoint.label)
											: breakpoint.label
									}
									aria-label={nameFor(breakpoint)}
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
							// An <option> takes a string and nothing else, so
							// the marker and the name are the same text here.
							label: marked.has(breakpoint.slug)
								? markLabel(breakpoint.label)
								: breakpoint.label,
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
							'Responsive editing is off for this site, so the canvas does not follow.',
							'spacery'
						)}
					</Text>
				</FlexItem>
			)}
		</Flex>
	);
}
