/**
 * Surfaces values core already sets responsively, and offers to adopt them.
 *
 * Adoption is not a no-op, and the notice says so. Core's viewports are
 * disjoint bands with no inheritance between them: a `@tablet` padding applies
 * between 480px and 782px and nowhere else. Spacery's tiers are a desktop-first
 * cascade, so the same value in its `tablet` tier also reaches everything
 * narrower. That is the model the author gets for every other value they set
 * here — but a takeover changes the widths a value already applies at, which is
 * exactly the kind of silent change D11's boundary rule exists to prevent. So
 * it is stated before the button rather than discovered afterwards.
 */

import {
	Button,
	Flex,
	__experimentalText as Text,
} from '@wordpress/components';
import { __, _n, sprintf } from '@wordpress/i18n';

import type { SpaceryAttribute, StyleNode } from '../attribute/types';
import { canTakeOver, type CoreOverride, takeOver } from './takeover';

interface TakeoverNoticeProps {
	overrides: CoreOverride[];
	spacery: SpaceryAttribute | undefined;
	style: StyleNode | undefined;
	setAttributes: (next: Record<string, unknown>) => void;
}

/**
 * A short report on core's own responsive values for this block.
 *
 * Renders nothing when core sets none, which is the common case — the panel
 * must not grow a permanent empty section for a situation most blocks are never
 * in.
 *
 * @param root0               Component props.
 * @param root0.overrides     Core values found among the edited properties.
 * @param root0.spacery       The block's `spacery` attribute.
 * @param root0.style         The block's `style` attribute.
 * @param root0.setAttributes Attribute setter.
 * @return The notice, or null.
 */
export function TakeoverNotice({
	overrides,
	spacery,
	style,
	setAttributes,
}: TakeoverNoticeProps): React.ReactElement | null {
	if (0 === overrides.length) {
		return null;
	}

	const movable = overrides.filter(canTakeOver);
	const stuck = overrides.filter((override) => !canTakeOver(override));

	/*
	 * A column, not a fragment, and the reason is a rendering defect rather
	 * than taste. `Text` is `display: inline`, so three of them as siblings
	 * were one flowing paragraph with **no whitespace between the sentences**:
	 * measured in the panel, line two read `narrower screens.In Spacery they
	 * also `. Stacking them restores the space by making each its own block,
	 * which is what three separate statements were always meant to be.
	 *
	 * The plain `div` inside each item is what carries `textWrap`. Balancing is
	 * done by the nearest *block* container and an inline `Text` has none of
	 * its own, so there has to be one; `Flex` and `Text` are both declared in
	 * the hand-written `src/types/wordpress.d.ts` and neither takes `style`,
	 * which is not something to assert about a component whose source is not in
	 * `node_modules` to read. `align="stretch"` because `Flex` centres its
	 * cross axis by default, and a centred column of muted lines is not this.
	 */
	return (
		<Flex direction="column" gap={2} align="stretch">
			<div style={{ textWrap: 'balance' }}>
				<Text variant="muted" size={12}>
					{sprintf(
						/* translators: %d: number of values WordPress sets for narrower screens. */
						_n(
							'WordPress already sets %d value here for narrower screens.',
							'WordPress already sets %d values here for narrower screens.',
							overrides.length,
							'spacery'
						),
						overrides.length
					)}
				</Text>
			</div>

			{movable.length > 0 && (
				<div style={{ textWrap: 'balance' }}>
					<Text variant="muted" size={12}>
						{__(
							'In Spacery they also reach narrower screens, unless a narrower breakpoint sets its own value.',
							'spacery'
						)}
					</Text>
				</div>
			)}

			{movable.length > 0 && (
				/*
				 * A wrapper so the button keeps its own width. The column
				 * stretches its children, which is right for a line of text and
				 * wrong for a button: stretched, this one ran the full 248px of
				 * the inspector.
				 */
				<div>
					<Button
						size="small"
						variant="secondary"
						onClick={() => {
							/*
							 * One setAttributes for both attributes. Two calls would
							 * put a half-migrated state on the undo stack, where the
							 * value exists in neither place.
							 */
							const next = takeOver(spacery, style, movable);

							setAttributes({
								spacery: next.spacery,
								style: next.style,
							});
						}}
					>
						{__('Manage these in Spacery', 'spacery')}
					</Button>
				</div>
			)}

			{stuck.length > 0 && (
				<div style={{ textWrap: 'balance' }}>
					<Text variant="muted" size={12}>
						{describeStuck(stuck)}
					</Text>
				</div>
			)}
		</Flex>
	);
}

/**
 * Explains why some of core's values cannot be adopted.
 *
 * Naming the boundary matters: "Spacery has no breakpoint at that width" is
 * actionable — the author can add one — where "cannot move" is not.
 *
 * @param stuck Overrides with no matching Spacery tier.
 * @return A sentence for the author.
 */
function describeStuck(stuck: CoreOverride[]): string {
	const viewports = [...new Set(stuck.map((override) => override.label))];

	return sprintf(
		/* translators: %s: comma-separated list of WordPress viewport names. */
		__(
			'Leaving %s to WordPress: no Spacery breakpoint covers the same widths.',
			'spacery'
		),
		viewports.join(', ')
	);
}
