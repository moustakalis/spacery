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

import { Button, __experimentalText as Text } from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';

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

	return (
		<>
			<Text variant="muted" size={12}>
				{sprintf(
					/* translators: %d: number of values WordPress sets for narrower screens. */
					__(
						'WordPress already sets %d value(s) here for narrower screens.',
						'spacery'
					),
					overrides.length
				)}
			</Text>

			{movable.length > 0 && (
				<Text variant="muted" size={12}>
					{__(
						'Moved into Spacery they follow its breakpoints, so narrower screens inherit them too unless a narrower breakpoint sets its own value.',
						'spacery'
					)}
				</Text>
			)}

			{movable.length > 0 && (
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
			)}

			{stuck.length > 0 && (
				<Text variant="muted" size={12}>
					{describeStuck(stuck)}
				</Text>
			)}
		</>
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
