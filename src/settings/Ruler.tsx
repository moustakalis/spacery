/**
 * The breakpoint set, drawn to scale.
 *
 * The `Covers` column beside it already says what each tier covers, and says it
 * accessibly. What a column of ranges cannot show is proportion: that four
 * tiers crowd the narrow end and leave everything above the widest one to the
 * default, or that one of them is an order of magnitude wider than the rest.
 *
 * So the bar is `aria-hidden` and the caption carries anything it says that the
 * column does not. A picture that has to be described in full to be usable is
 * not earning its space.
 */

import {
	Flex,
	FlexItem,
	__experimentalText as Text,
} from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';

import { ruler, type Segment } from './bands';
import type { Breakpoint } from './types';

/**
 * Shade for one band.
 *
 * A ramp from narrow to wide, so the bar reads as one scale rather than as a
 * set of unrelated blocks. The uncovered region sits below the ramp, because
 * nothing is there.
 *
 * @param segment The band.
 * @param index   Its position, narrowest first.
 * @param total   How many bands there are.
 * @return An opacity.
 */
function shade(segment: Segment, index: number, total: number): number {
	if ('default' === segment.key) {
		return 0.08;
	}

	return 0.25 + (0.55 * index) / Math.max(1, total - 1);
}

/**
 * The ruler.
 *
 * @param root0             Component props.
 * @param root0.tiers       The resolved set, widest first.
 * @param root0.pixelsPerEm From the server's own constant.
 * @return The drawing, or nothing when there is no set to draw.
 */
export function Ruler({
	tiers,
	pixelsPerEm,
}: {
	tiers: Breakpoint[];
	pixelsPerEm: number;
}): React.ReactElement | null {
	const { segments, clamped } = ruler(tiers, pixelsPerEm);

	if (0 === segments.length) {
		return null;
	}

	const widest = tiers[0]!;

	return (
		<Flex direction="column" gap={1}>
			<FlexItem>
				<div
					aria-hidden="true"
					style={{
						display: 'flex',
						height: '10px',
						borderRadius: '2px',
						overflow: 'hidden',
					}}
				>
					{segments.map((segment, index) => (
						<div
							key={segment.key}
							style={{
								width: `${segment.share}%`,
								...(segment.clipped
									? {
											/*
											 * Hatched rather than solid: this
											 * band does not end where it is
											 * drawn to end, and a flat edge
											 * would say it does.
											 */
											backgroundImage:
												'repeating-linear-gradient(45deg, currentColor 0 3px, transparent 3px 6px)',
											opacity: 0.5,
										}
									: {
											background: 'currentColor',
											opacity: shade(
												segment,
												index,
												segments.length
											),
										}),
							}}
						/>
					))}
				</div>
			</FlexItem>

			<FlexItem>
				<Text variant="muted" size={12}>
					{clamped
						? sprintf(
								/* translators: 1: breakpoint name. 2: a CSS length. */
								__(
									'%1$s runs to %2$s, past the edge of this ruler.',
									'spacery'
								),
								widest.label,
								widest.max
							)
						: sprintf(
								/* translators: %s: a CSS length, e.g. "1280px". */
								__(
									'Above %s no breakpoint applies, so the default does.',
									'spacery'
								),
								widest.max
							)}
				</Text>
			</FlexItem>
		</Flex>
	);
}
